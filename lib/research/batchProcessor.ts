import { getOpenAIClient, RESEARCH_MODELS } from './openaiClient';
import fs from 'fs';
import path from 'path';

interface BatchRequest {
  custom_id: string;
  method: 'POST';
  url: '/v1/chat/completions';
  body: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    response_format?: { type: string };
    temperature?: number;
  };
}

/**
 * Submit a batch of extraction requests to OpenAI Batch API.
 * 50% cost savings over synchronous calls.
 */
export async function submitBatch(
  requests: Array<{ id: string; prompt: string }>,
  model: string = RESEARCH_MODELS.EXTRACTION,
): Promise<string> {
  const client = getOpenAIClient();

  // Create JSONL batch input
  const batchLines: string[] = requests.map(req => {
    const batchReq: BatchRequest = {
      custom_id: req.id,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model,
        messages: [{ role: 'user', content: req.prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      },
    };
    return JSON.stringify(batchReq);
  });

  const tmpDir = path.join(process.cwd(), '.tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const inputPath = path.join(tmpDir, `batch-${Date.now()}.jsonl`);
  fs.writeFileSync(inputPath, batchLines.join('\n'));

  // Upload input file
  const file = await client.files.create({
    file: fs.createReadStream(inputPath),
    purpose: 'batch',
  });

  // Create batch
  const batch = await client.batches.create({
    input_file_id: file.id,
    endpoint: '/v1/chat/completions',
    completion_window: '24h',
  });

  // Clean up temp file
  fs.unlinkSync(inputPath);

  return batch.id;
}

/**
 * Poll a batch for results. Returns null if still processing.
 */
export async function pollBatchResults(
  batchId: string,
): Promise<Array<{ id: string; result: string }> | null> {
  const client = getOpenAIClient();
  const batch = await client.batches.retrieve(batchId);

  if (batch.status === 'completed' && batch.output_file_id) {
    const fileResponse = await client.files.content(batch.output_file_id);
    const text = await fileResponse.text();
    const lines = text.trim().split('\n');

    return lines.map(line => {
      const parsed = JSON.parse(line);
      return {
        id: parsed.custom_id,
        result: parsed.response?.body?.choices?.[0]?.message?.content ?? '',
      };
    });
  }

  if (batch.status === 'failed' || batch.status === 'expired' || batch.status === 'cancelled') {
    throw new Error(`Batch ${batchId} ${batch.status}: ${JSON.stringify(batch.errors)}`);
  }

  // Still processing
  return null;
}
