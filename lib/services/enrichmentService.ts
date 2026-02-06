import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../db';
import { getCacheService } from './cacheService';
import { computePopularityScore, type PopularitySubScores } from '../utils/popularityCalculator';
import {
  VALID_TOOL_CATEGORIES,
  VALID_COMPLEXITIES,
  VALID_PRICING_TIERS,
  VALID_TOOL_TEAM_SIZES,
  VALID_TOOL_STAGES,
  VALID_TOOL_TECH_SAVVINESS,
} from '../middleware/validation';
import type { Tool, ToolCategory, Complexity, PricingTier, TeamSize, Stage, TechSavviness } from '@prisma/client';
import type { EnrichmentResult } from '../../types';

interface EnrichmentResponse {
  tool: Tool;
  enrichment: EnrichmentResult;
}

/**
 * AI-powered data enrichment service using Claude
 * Analyzes tool information and updates pricing, features, compliance, and popularity data
 */
export class EnrichmentService {
  private anthropic: Anthropic;
  private cache = getCacheService();

  constructor() {
    this.anthropic = new Anthropic();
  }

  /**
   * Enrich a tool's data using Claude AI
   * @param toolId - The ID of the tool to enrich
   * @returns The updated tool and enrichment metadata
   */
  async enrichTool(toolId: string): Promise<EnrichmentResponse> {
    // Fetch existing tool from DB
    const existing = await prisma.tool.findUnique({
      where: { id: toolId },
    });

    if (!existing) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    if (!existing.websiteUrl) {
      throw new Error(`Tool ${existing.displayName} has no website URL - cannot enrich`);
    }

    // Build the prompt with current data
    const prompt = this.buildEnrichmentPrompt(existing);

    // Call Claude API
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text response
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse and validate the JSON response
    const enrichedData = this.parseAndValidateResponse(textContent.text, existing);

    // Build update data
    const updateData: Record<string, unknown> = {};
    const fieldsUpdated: string[] = [];

    // Process each enriched field
    for (const [key, value] of Object.entries(enrichedData.updates)) {
      if (value !== undefined && value !== null) {
        updateData[key] = value;
        fieldsUpdated.push(key);
      }
    }

    // Always update lastVerified
    updateData.lastVerified = new Date();
    fieldsUpdated.push('lastVerified');

    // If any popularity sub-scores changed, recompute composite
    const popularityFields = ['popularityAdoption', 'popularitySentiment', 'popularityMomentum', 'popularityEcosystem', 'popularityReliability'];
    const hasPopularityChange = popularityFields.some(f => updateData[f] !== undefined);

    if (hasPopularityChange) {
      const mergedScores: PopularitySubScores = {
        popularityAdoption: (updateData.popularityAdoption as number) ?? existing.popularityAdoption,
        popularitySentiment: (updateData.popularitySentiment as number) ?? existing.popularitySentiment,
        popularityMomentum: (updateData.popularityMomentum as number) ?? existing.popularityMomentum,
        popularityEcosystem: (updateData.popularityEcosystem as number) ?? existing.popularityEcosystem,
        popularityReliability: (updateData.popularityReliability as number) ?? existing.popularityReliability,
      };
      updateData.popularityScore = computePopularityScore(mergedScores);
      fieldsUpdated.push('popularityScore');
    }

    // Update the tool in the database
    const tool = await prisma.tool.update({
      where: { id: toolId },
      data: updateData,
    });

    // Invalidate caches
    await Promise.all([
      this.cache.invalidateToolById(toolId),
      this.cache.invalidateToolCache(),
    ]);

    return {
      tool,
      enrichment: {
        fieldsUpdated,
        summary: enrichedData.summary,
        confidence: enrichedData.confidence,
      },
    };
  }

  /**
   * Build the prompt for Claude to analyze the tool
   */
  private buildEnrichmentPrompt(tool: Tool): string {
    return `You are a SaaS tool analyst. Analyze the tool "${tool.displayName}" (website: ${tool.websiteUrl}).

Based on your knowledge of this tool, identify any fields that need updating or are missing data. Only return fields that you're confident about and that differ from or add to the current values.

CURRENT DATABASE VALUES:
- Category: ${tool.category}
- Complexity: ${tool.complexity}
- Pricing Tier: ${tool.typicalPricingTier}
- Estimated Cost/User/Month: ${tool.estimatedCostPerUser ?? 'unknown'}
- Has Free Forever: ${tool.hasFreeForever}
- Best For Team Size: ${JSON.stringify(tool.bestForTeamSize)}
- Best For Stage: ${JSON.stringify(tool.bestForStage)}
- Best For Tech Savviness: ${JSON.stringify(tool.bestForTechSavviness)}
- Key Features: ${JSON.stringify(tool.keyFeatures)}
- Primary Use Cases: ${JSON.stringify(tool.primaryUseCases)}
- SOC2: ${tool.soc2}, HIPAA: ${tool.hipaa}, GDPR: ${tool.gdpr}
- EU Data Residency: ${tool.euDataResidency}, Self-Hosted: ${tool.selfHosted}, Air-Gapped: ${tool.airGapped}
- Has AI Features: ${tool.hasAiFeatures}
- AI Feature Description: ${tool.aiFeatureDescription ?? 'none'}
- Funding Stage: ${tool.fundingStage ?? 'unknown'}
- Founded Year: ${tool.foundedYear ?? 'unknown'}
- Popularity Scores: Adoption=${tool.popularityAdoption}, Sentiment=${tool.popularitySentiment}, Momentum=${tool.popularityMomentum}, Ecosystem=${tool.popularityEcosystem}, Reliability=${tool.popularityReliability}

VALID ENUM VALUES:
- category: ${VALID_TOOL_CATEGORIES.join(', ')}
- complexity: ${VALID_COMPLEXITIES.join(', ')}
- typicalPricingTier: ${VALID_PRICING_TIERS.join(', ')}
- bestForTeamSize: ${VALID_TOOL_TEAM_SIZES.join(', ')}
- bestForStage: ${VALID_TOOL_STAGES.join(', ')}
- bestForTechSavviness: ${VALID_TOOL_TECH_SAVVINESS.join(', ')}
- Popularity sub-scores: integers 0-100

INSTRUCTIONS:
1. Only include fields that you're confident need updating or were missing
2. Use ONLY the valid enum values listed above for enum fields
3. For array fields, provide complete arrays (not partial updates)
4. For popularity scores, base on current market data (adoption rates, user sentiment, growth trends, ecosystem size, reliability reputation)
5. Respond with ONLY a valid JSON object - no markdown, no explanation

RESPONSE FORMAT (JSON only):
{
  "updates": {
    // Only include fields that changed or were missing
    // Examples:
    // "estimatedCostPerUser": 15,
    // "keyFeatures": ["feature1", "feature2"],
    // "hasAiFeatures": true,
    // "aiFeatureDescription": "Uses AI for...",
    // "popularityMomentum": 75
  },
  "summary": "One-line description of changes made",
  "confidence": 0.85
}`;
  }

  /**
   * Parse and validate Claude's response
   */
  private parseAndValidateResponse(
    responseText: string,
    existing: Tool
  ): { updates: Record<string, unknown>; summary: string; confidence: number } {
    // Try to extract JSON from the response
    let jsonText = responseText.trim();

    // Handle markdown code blocks
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    let parsed: { updates?: Record<string, unknown>; summary?: string; confidence?: number };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error(`Failed to parse Claude response as JSON: ${responseText.substring(0, 200)}`);
    }

    const updates = parsed.updates || {};
    const validatedUpdates: Record<string, unknown> = {};

    // Validate and filter each field
    if (updates.category !== undefined) {
      if (VALID_TOOL_CATEGORIES.includes(updates.category as string)) {
        validatedUpdates.category = updates.category as ToolCategory;
      }
    }

    if (updates.complexity !== undefined) {
      if (VALID_COMPLEXITIES.includes(updates.complexity as string)) {
        validatedUpdates.complexity = updates.complexity as Complexity;
      }
    }

    if (updates.typicalPricingTier !== undefined) {
      if (VALID_PRICING_TIERS.includes(updates.typicalPricingTier as string)) {
        validatedUpdates.typicalPricingTier = updates.typicalPricingTier as PricingTier;
      }
    }

    if (updates.estimatedCostPerUser !== undefined) {
      const cost = Number(updates.estimatedCostPerUser);
      if (!isNaN(cost) && cost >= 0) {
        validatedUpdates.estimatedCostPerUser = cost;
      }
    }

    if (updates.hasFreeForever !== undefined && typeof updates.hasFreeForever === 'boolean') {
      validatedUpdates.hasFreeForever = updates.hasFreeForever;
    }

    // Validate array enum fields
    if (Array.isArray(updates.bestForTeamSize)) {
      const valid = (updates.bestForTeamSize as string[]).filter(v => VALID_TOOL_TEAM_SIZES.includes(v));
      if (valid.length > 0) {
        validatedUpdates.bestForTeamSize = valid as TeamSize[];
      }
    }

    if (Array.isArray(updates.bestForStage)) {
      const valid = (updates.bestForStage as string[]).filter(v => VALID_TOOL_STAGES.includes(v));
      if (valid.length > 0) {
        validatedUpdates.bestForStage = valid as Stage[];
      }
    }

    if (Array.isArray(updates.bestForTechSavviness)) {
      const valid = (updates.bestForTechSavviness as string[]).filter(v => VALID_TOOL_TECH_SAVVINESS.includes(v));
      if (valid.length > 0) {
        validatedUpdates.bestForTechSavviness = valid as TechSavviness[];
      }
    }

    // Validate string array fields
    if (Array.isArray(updates.keyFeatures)) {
      validatedUpdates.keyFeatures = (updates.keyFeatures as unknown[]).filter(v => typeof v === 'string') as string[];
    }

    if (Array.isArray(updates.primaryUseCases)) {
      validatedUpdates.primaryUseCases = (updates.primaryUseCases as unknown[]).filter(v => typeof v === 'string') as string[];
    }

    if (Array.isArray(updates.aliases)) {
      validatedUpdates.aliases = (updates.aliases as unknown[]).filter(v => typeof v === 'string') as string[];
    }

    // Validate boolean fields
    const booleanFields = ['soc2', 'hipaa', 'gdpr', 'euDataResidency', 'selfHosted', 'airGapped', 'hasAiFeatures'];
    for (const field of booleanFields) {
      if (updates[field] !== undefined && typeof updates[field] === 'boolean') {
        validatedUpdates[field] = updates[field];
      }
    }

    // Validate string fields
    if (updates.aiFeatureDescription !== undefined) {
      if (typeof updates.aiFeatureDescription === 'string' || updates.aiFeatureDescription === null) {
        validatedUpdates.aiFeatureDescription = updates.aiFeatureDescription;
      }
    }

    if (updates.fundingStage !== undefined) {
      if (typeof updates.fundingStage === 'string' || updates.fundingStage === null) {
        validatedUpdates.fundingStage = updates.fundingStage;
      }
    }

    // Validate number fields
    if (updates.foundedYear !== undefined) {
      const year = Number(updates.foundedYear);
      if (!isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1) {
        validatedUpdates.foundedYear = year;
      }
    }

    // Validate popularity sub-scores (clamp to 0-100)
    const popularityFields = ['popularityAdoption', 'popularitySentiment', 'popularityMomentum', 'popularityEcosystem', 'popularityReliability'];
    for (const field of popularityFields) {
      if (updates[field] !== undefined) {
        const score = Number(updates[field]);
        if (!isNaN(score)) {
          validatedUpdates[field] = Math.max(0, Math.min(100, Math.round(score)));
        }
      }
    }

    return {
      updates: validatedUpdates,
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'AI enrichment completed',
      confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.7,
    };
  }
}

// Singleton instance
let enrichmentServiceInstance: EnrichmentService | null = null;

export function getEnrichmentService(): EnrichmentService {
  if (!enrichmentServiceInstance) {
    enrichmentServiceInstance = new EnrichmentService();
  }
  return enrichmentServiceInstance;
}

export default getEnrichmentService;
