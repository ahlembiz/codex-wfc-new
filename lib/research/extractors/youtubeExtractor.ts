import { generateResearchCompletion, RESEARCH_MODELS } from '../openaiClient';
import type { TranscriptExtraction, CommentExtraction } from '../types';

const TRANSCRIPT_PROMPT = `You are a SaaS tool analyst. Extract structured data from this YouTube video transcript.

Identify:
1. All SaaS/dev tools mentioned (name, context, sentiment, if recommended, if primary focus)
2. Tool combinations used together
3. Automation patterns (trigger tool → action tool, connector type)
4. Workflow descriptions
5. Abandonment signals (tools abandoned, reasons, replacements)
6. Segment hints (team size, stage, tech savviness, role of speaker)
7. Sponsorship signals (disclosed sponsors, affiliate links mentioned)

Return JSON matching this schema:
{
  "tools": [{ "name": string, "context": string, "sentiment": "positive"|"negative"|"neutral", "isRecommended": boolean, "isPrimary": boolean }],
  "toolCombinations": [["tool1", "tool2"]],
  "automations": [{ "triggerTool": string, "triggerEvent": string, "actionTool": string, "actionResult": string, "connectorType": string, "frequency": number }],
  "workflowDescription": string | null,
  "abandonmentSignals": [{ "tool": string, "reason": string, "replacedWith": string | null }],
  "segmentHints": { "teamSize": string | null, "stage": string | null, "techSavviness": string | null, "role": string | null },
  "sponsorshipDetected": boolean,
  "sponsoredTools": [string]
}

TRANSCRIPT:
`;

const COMMENTS_PROMPT = `You are a SaaS tool analyst. Extract structured data from these YouTube video comments.

Identify:
1. All tools mentioned with sentiment
2. Tool combinations people use together
3. Sentiment scores per tool (-1 to 1)
4. Alternative tools proposed by commenters

Return JSON matching this schema:
{
  "tools": [{ "name": string, "context": string, "sentiment": "positive"|"negative"|"neutral", "isRecommended": boolean, "isPrimary": boolean }],
  "toolCombinations": [["tool1", "tool2"]],
  "sentiment": { "toolName": number },
  "alternativesProposed": [{ "original": string, "alternative": string, "reason": string }]
}

COMMENTS:
`;

export async function extractFromTranscript(transcript: string): Promise<TranscriptExtraction> {
  const raw = await generateResearchCompletion(
    TRANSCRIPT_PROMPT + transcript,
    RESEARCH_MODELS.EXTRACTION,
    0.1,
  );
  return JSON.parse(raw) as TranscriptExtraction;
}

export async function extractFromComments(comments: string): Promise<CommentExtraction> {
  const raw = await generateResearchCompletion(
    COMMENTS_PROMPT + comments,
    RESEARCH_MODELS.EXTRACTION,
    0.1,
  );
  return JSON.parse(raw) as CommentExtraction;
}
