import { generateResearchCompletion, RESEARCH_MODELS } from '../openaiClient';
import type { ThreadExtraction } from '../types';

const THREAD_PROMPT = `You are a SaaS tool analyst. Extract structured data from this community forum thread (Reddit, Hacker News, or IndieHackers).

Identify:
1. All SaaS/dev tools mentioned with context and sentiment
2. Tool combinations people use together
3. Automation patterns described
4. Segment hints about the poster (team size, stage, tech savviness, role)
5. Sponsorship/affiliate signals

Return JSON matching this schema:
{
  "tools": [{ "name": string, "context": string, "sentiment": "positive"|"negative"|"neutral", "isRecommended": boolean, "isPrimary": boolean }],
  "toolCombinations": [["tool1", "tool2"]],
  "automations": [{ "triggerTool": string, "triggerEvent": string, "actionTool": string, "actionResult": string, "connectorType": string, "frequency": number }],
  "segmentHints": { "teamSize": string | null, "stage": string | null, "techSavviness": string | null, "role": string | null },
  "isSponsored": boolean,
  "hasAffiliate": boolean,
  "affiliateTools": [string]
}

THREAD CONTENT:
`;

export async function extractFromThread(threadContent: string): Promise<ThreadExtraction> {
  const raw = await generateResearchCompletion(
    THREAD_PROMPT + threadContent,
    RESEARCH_MODELS.EXTRACTION,
    0.1,
  );
  return JSON.parse(raw) as ThreadExtraction;
}
