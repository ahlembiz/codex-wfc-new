import Anthropic from '@anthropic-ai/sdk';

/**
 * Centralized AI model configuration.
 * Update model IDs here when upgrading to newer Claude models.
 */
export const AI_MODELS = {
  /** Primary model for narrative generation and enrichment */
  DEFAULT: 'claude-sonnet-4-20250514',
} as const;

/**
 * Singleton Anthropic client.
 * Lazily initialized on first call with explicit API key validation.
 */
let anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Helper for simple text generation with Claude.
 * Handles response extraction and provides a clean string result.
 */
export async function generateText(options: {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}): Promise<string> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: options.model ?? AI_MODELS.DEFAULT,
    max_tokens: options.maxTokens ?? 500,
    temperature: options.temperature ?? 0.7,
    messages: [{ role: 'user', content: options.prompt }],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  if (textBlock && textBlock.type === 'text') {
    return textBlock.text.trim();
  }

  return '';
}
