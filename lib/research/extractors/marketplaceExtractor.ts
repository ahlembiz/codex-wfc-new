import { generateResearchCompletion, RESEARCH_MODELS } from '../openaiClient';
import type { MarketplaceExtraction } from '../types';

const MARKETPLACE_PROMPT = `You are a SaaS tool analyst. Extract structured data from this automation marketplace listing (Zapier, Make, or n8n template).

Identify:
1. Trigger tool and action tool
2. Connector type (ZAPIER, MAKE, API, WEBHOOK, etc.)
3. Use case description
4. Install/usage count if available
5. Rating if available

Return JSON matching this schema:
{
  "triggerTool": string,
  "actionTool": string,
  "connectorType": string,
  "useCase": string,
  "installCount": number | null,
  "rating": number | null
}

LISTING:
`;

export async function extractFromMarketplaceListing(listing: string): Promise<MarketplaceExtraction> {
  const raw = await generateResearchCompletion(
    MARKETPLACE_PROMPT + listing,
    RESEARCH_MODELS.LIGHTWEIGHT,
    0.1,
  );
  return JSON.parse(raw) as MarketplaceExtraction;
}
