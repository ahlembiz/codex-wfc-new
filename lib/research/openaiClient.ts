import OpenAI from 'openai';

export const RESEARCH_MODELS = {
  EXTRACTION: 'gpt-4.1-mini',   // Bulk extraction — $0.40/1M input
  VALIDATION: 'gpt-4.1',        // Cross-reference validation — higher accuracy
  LIGHTWEIGHT: 'gpt-4.1-nano',  // Simple classification tasks
} as const;

let openaiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for research features');
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

export async function generateResearchCompletion(
  prompt: string,
  model: string = RESEARCH_MODELS.EXTRACTION,
  temperature: number = 0.1,
): Promise<string> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model,
    temperature,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  });
  return response.choices[0]?.message?.content ?? '';
}
