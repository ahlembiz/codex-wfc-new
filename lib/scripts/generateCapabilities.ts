/**
 * AI-Assisted Seed Data Generator
 *
 * Reads existing tool data (keyFeatures, aiFeatureDescription) and generates
 * ToolPhaseCapability drafts via Claude. Results are written to stdout as JSON.
 *
 * Usage:
 *   npx tsx lib/scripts/generateCapabilities.ts [toolName1] [toolName2] ...
 *   npx tsx lib/scripts/generateCapabilities.ts --all
 *
 * Pipe output to a file for review before importing:
 *   npx tsx lib/scripts/generateCapabilities.ts notion linear > generated-capabilities.json
 */

import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();

const BUCKET_SLUGS = [
  'ideation-problem-discovery', 'ideation-market-research', 'ideation-bug-triage',
  'planning-prioritization', 'planning-spec-writing', 'planning-prototyping',
  'execution-delivery-planning', 'execution-implementation', 'execution-code-review',
  'review-feedback-collection', 'review-retrospective',
  'iterate-metrics-analysis', 'iterate-documentation', 'iterate-backlog-grooming',
];

async function generateCapabilitiesForTool(tool: {
  name: string;
  displayName: string;
  category: string;
  keyFeatures: string[];
  aiFeatureDescription: string | null;
  primaryUseCases: string[];
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are generating structured seed data for a workflow intelligence engine.

Given this tool:
- Name: ${tool.displayName}
- Category: ${tool.category}
- Key Features: ${tool.keyFeatures.join(', ')}
- AI Features: ${tool.aiFeatureDescription || 'None'}
- Primary Use Cases: ${tool.primaryUseCases.join(', ')}

For each workflow bucket where this tool is relevant, generate a capability record.
Only include buckets where the tool genuinely adds value (skip irrelevant ones).

Available buckets:
${BUCKET_SLUGS.map(s => `- ${s}`).join('\n')}

For each capability, provide:
- bucketSlug: which bucket
- featureName: specific feature name (e.g. "Linear Asks", "Cursor Composer")
- aiAction: what the AI does (1 sentence, active voice)
- humanAction: what the human does (1 sentence, active voice)
- artifact: what gets produced (short noun phrase)
- automationLevel: FULL | SUPERVISED | ASSISTED | MANUAL
- philosophyFit: array of ["Co-Pilot", "Hybrid", "Auto-Pilot"] (include all that apply)
- techSavviness: array of ["NEWBIE", "DECENT", "NINJA"] (include all that apply)

Respond with a JSON array of objects. No markdown, no explanation, just the array.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const capabilities = JSON.parse(text);
    return capabilities.map((cap: any, i: number) => ({
      toolName: tool.name,
      ...cap,
      displayOrder: i + 1,
    }));
  } catch {
    console.error(`Failed to parse response for ${tool.name}:`, text.slice(0, 200));
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');

  let tools;
  if (isAll) {
    tools = await prisma.tool.findMany({
      select: { name: true, displayName: true, category: true, keyFeatures: true, aiFeatureDescription: true, primaryUseCases: true },
    });
  } else if (args.length > 0) {
    tools = await prisma.tool.findMany({
      where: { name: { in: args } },
      select: { name: true, displayName: true, category: true, keyFeatures: true, aiFeatureDescription: true, primaryUseCases: true },
    });
  } else {
    console.error('Usage: npx tsx lib/scripts/generateCapabilities.ts [--all | toolName1 toolName2 ...]');
    process.exit(1);
  }

  console.error(`Generating capabilities for ${tools.length} tools...`);

  const allCapabilities = [];
  for (const tool of tools) {
    console.error(`  Processing ${tool.displayName}...`);
    const caps = await generateCapabilitiesForTool(tool);
    allCapabilities.push(...caps);
    console.error(`    Generated ${caps.length} capabilities`);
  }

  console.log(JSON.stringify(allCapabilities, null, 2));
  console.error(`\nTotal: ${allCapabilities.length} capabilities generated`);
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
