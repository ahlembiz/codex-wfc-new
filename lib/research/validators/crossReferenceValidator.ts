import { generateResearchCompletion, RESEARCH_MODELS } from '../openaiClient';
import type { ValidationResult } from '../types';

const VALIDATION_PROMPT = `You are a research validator. Given this tool cluster claim, cross-reference against your knowledge to validate it.

Check:
1. Are these tools actually commonly used together?
2. Does the synergy description make sense?
3. Are there any contradictions with known tool capabilities?
4. Should confidence be adjusted up or down, and why?

Return JSON:
{
  "isValid": boolean,
  "confidence": number (0-100, your assessed confidence),
  "supportingEvidence": [string],
  "contradictions": [string],
  "adjustments": {
    "synergyStrength": number | null,
    "synergyType": string | null,
    "description": string | null
  }
}

CLUSTER CLAIM:
`;

export async function crossReferenceCluster(cluster: {
  name: string;
  description: string;
  tools: string[];
  synergyType: string;
  synergyStrength: number;
}): Promise<ValidationResult> {
  const claimText = `
Name: ${cluster.name}
Tools: ${cluster.tools.join(', ')}
Synergy Type: ${cluster.synergyType}
Synergy Strength: ${cluster.synergyStrength}/100
Description: ${cluster.description}
`;

  const raw = await generateResearchCompletion(
    VALIDATION_PROMPT + claimText,
    RESEARCH_MODELS.VALIDATION,
    0.2,
  );
  return JSON.parse(raw) as ValidationResult;
}
