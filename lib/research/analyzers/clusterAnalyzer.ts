import { generateResearchCompletion, RESEARCH_MODELS } from '../openaiClient';
import type { ClusterAnalysis, SegmentHints } from '../types';

const CLUSTER_ANALYSIS_PROMPT = `You are a creative SaaS analyst who names tool stacks. Given this set of tools commonly used together, create a memorable cluster identity.

Requirements:
1. Give it a catchy, memorable name (e.g., "The Indie Dev Stack", "Doc-Centric Hub", "AI-First Builder Kit")
2. Write a 1-2 sentence description of why these tools work well together
3. Identify the synergy type: "complementary" (fill different needs), "sequential" (output→input chain), "hub-spoke" (one tool connects others), "parallel" (interchangeable alternatives), "layered" (foundation + add-ons)
4. Rate synergy strength 0-100
5. Identify best-fit segment (team size, stage, tech savviness)
6. Explain your reasoning

Return JSON:
{
  "name": string,
  "description": string,
  "synergyType": string,
  "synergyStrength": number,
  "bestFor": { "teamSize": string | null, "stage": string | null, "techSavviness": string | null, "role": string | null },
  "reasoning": string
}

TOOLS IN CLUSTER:
`;

export async function analyzeCluster(
  tools: Array<{ name: string; category: string; keyFeatures: string[] }>,
): Promise<ClusterAnalysis> {
  const toolDescriptions = tools
    .map(t => `- ${t.name} (${t.category}): ${t.keyFeatures.slice(0, 3).join(', ')}`)
    .join('\n');

  const raw = await generateResearchCompletion(
    CLUSTER_ANALYSIS_PROMPT + toolDescriptions,
    RESEARCH_MODELS.VALIDATION, // Use gpt-4.1 for creative naming
    0.7, // Higher temperature for creativity
  );
  return JSON.parse(raw) as ClusterAnalysis;
}

export function parseSegmentHints(hints: SegmentHints): {
  bestForStage: string[];
  bestForTeamSize: string[];
  bestForTechSavviness: string[];
} {
  const mapStage: Record<string, string> = {
    bootstrapping: 'BOOTSTRAPPING', 'pre-seed': 'PRE_SEED', 'early-seed': 'EARLY_SEED',
    growth: 'GROWTH', established: 'ESTABLISHED',
  };
  const mapTeamSize: Record<string, string> = {
    solo: 'SOLO', small: 'SMALL', medium: 'MEDIUM', large: 'LARGE', enterprise: 'ENTERPRISE',
  };
  const mapSavviness: Record<string, string> = {
    newbie: 'NEWBIE', decent: 'DECENT', ninja: 'NINJA',
  };

  return {
    bestForStage: hints.stage ? [mapStage[hints.stage.toLowerCase()] ?? hints.stage.toUpperCase()].filter(Boolean) : [],
    bestForTeamSize: hints.teamSize ? [mapTeamSize[hints.teamSize.toLowerCase()] ?? hints.teamSize.toUpperCase()].filter(Boolean) : [],
    bestForTechSavviness: hints.techSavviness ? [mapSavviness[hints.techSavviness.toLowerCase()] ?? hints.techSavviness.toUpperCase()].filter(Boolean) : [],
  };
}
