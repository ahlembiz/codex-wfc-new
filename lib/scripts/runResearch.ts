#!/usr/bin/env npx tsx
/**
 * Research CLI — orchestration script for research intelligence pipeline
 *
 * Usage:
 *   npx tsx lib/scripts/runResearch.ts <command> [options]
 *
 * Commands:
 *   extract-youtube    --file <path>                      Parse transcript → ResearchDataPoint
 *   extract-community  --file <path> --platform <name>    Parse thread → ResearchDataPoint
 *   extract-marketplace --file <path> --platform <name>   Parse listing → ResearchDataPoint
 *   mine-clusters      [--min-weight N]                   Detect clusters from co-occurrence
 *   score-confidence   [--cluster-id <id>]                Recalculate cluster confidence
 *   audit-bias                                            Run 12-check bias audit
 */

import { readFileSync } from 'fs';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  extractFromTranscript,
  extractFromThread,
  extractFromMarketplaceListing,
  buildCoOccurrenceGraph,
  detectClusters,
  calculateConfidence,
  runBiasAudit,
} from '../research';
import { getResearchService } from '../services/researchService';

const prisma = new PrismaClient();

// ============================================
// ARGUMENT PARSING
// ============================================

function parseArgs(argv: string[]): { command: string; flags: Record<string, string> } {
  const args = argv.slice(2); // skip node + script path
  const command = args[0] ?? '';
  const flags: Record<string, string> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      flags[key] = value;
    }
  }

  return { command, flags };
}

function requireFlag(flags: Record<string, string>, name: string): string {
  const value = flags[name];
  if (!value || value === 'true') {
    console.error(`Error: --${name} is required`);
    process.exit(1);
  }
  return value;
}

function requireOpenAIKey(): void {
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable is required for extraction commands');
    console.error('Set it with: export OPENAI_API_KEY=sk-...');
    process.exit(1);
  }
}

function readInputFile(path: string): string {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    console.error(`Error: Could not read file "${path}"`);
    process.exit(1);
  }
}

// ============================================
// COMMANDS
// ============================================

async function cmdExtractYouTube(flags: Record<string, string>) {
  requireOpenAIKey();
  const filePath = requireFlag(flags, 'file');
  const content = readInputFile(filePath);

  console.log(`Extracting from YouTube transcript: ${filePath}`);
  console.log(`Content length: ${content.length} characters\n`);

  const extraction = await extractFromTranscript(content);
  console.log('Extraction result:');
  console.log(`  Tools found: ${extraction.tools.map(t => t.name).join(', ')}`);
  console.log(`  Tool combinations: ${extraction.toolCombinations.length}`);
  console.log(`  Automations: ${extraction.automations.length}`);
  console.log(`  Sponsorship detected: ${extraction.sponsorshipDetected}`);
  console.log(`  Workflow: ${extraction.workflowDescription ?? 'none'}`);
  console.log(`  Segment hints: ${JSON.stringify(extraction.segmentHints)}`);

  // Save to database
  const service = getResearchService();
  const dp = await service.createDataPoint({
    sourceType: 'youtube_transcript',
    tools: extraction.tools.map(t => t.name),
    toolCombination: extraction.toolCombinations.length > 0,
    automations: extraction.automations.length > 0 ? extraction.automations as unknown as Prisma.InputJsonValue : undefined,
    workflow: extraction.workflowDescription ?? undefined,
    abandonment: extraction.abandonmentSignals.length > 0 ? extraction.abandonmentSignals as unknown as Prisma.InputJsonValue : undefined,
    segmentTeamSize: extraction.segmentHints.teamSize ?? undefined,
    segmentStage: extraction.segmentHints.stage ?? undefined,
    segmentSavviness: extraction.segmentHints.techSavviness ?? undefined,
    segmentRole: extraction.segmentHints.role ?? undefined,
    isSponsored: extraction.sponsorshipDetected,
    sponsoredTools: extraction.sponsoredTools,
  });

  console.log(`\nSaved as ResearchDataPoint: ${dp.id}`);
}

async function cmdExtractCommunity(flags: Record<string, string>) {
  requireOpenAIKey();
  const filePath = requireFlag(flags, 'file');
  const platform = requireFlag(flags, 'platform');

  const validPlatforms = ['reddit', 'hackernews', 'indie_hackers'];
  if (!validPlatforms.includes(platform)) {
    console.error(`Error: --platform must be one of: ${validPlatforms.join(', ')}`);
    process.exit(1);
  }

  const content = readInputFile(filePath);
  console.log(`Extracting from ${platform} thread: ${filePath}`);
  console.log(`Content length: ${content.length} characters\n`);

  const extraction = await extractFromThread(content);
  console.log('Extraction result:');
  console.log(`  Tools found: ${extraction.tools.map(t => t.name).join(', ')}`);
  console.log(`  Tool combinations: ${extraction.toolCombinations.length}`);
  console.log(`  Automations: ${extraction.automations.length}`);
  console.log(`  Sponsored: ${extraction.isSponsored}`);
  console.log(`  Affiliate: ${extraction.hasAffiliate}`);
  console.log(`  Segment hints: ${JSON.stringify(extraction.segmentHints)}`);

  const service = getResearchService();
  const dp = await service.createDataPoint({
    sourceType: platform,
    tools: extraction.tools.map(t => t.name),
    toolCombination: extraction.toolCombinations.length > 0,
    automations: extraction.automations.length > 0 ? extraction.automations as unknown as Prisma.InputJsonValue : undefined,
    segmentTeamSize: extraction.segmentHints.teamSize ?? undefined,
    segmentStage: extraction.segmentHints.stage ?? undefined,
    segmentSavviness: extraction.segmentHints.techSavviness ?? undefined,
    segmentRole: extraction.segmentHints.role ?? undefined,
    isSponsored: extraction.isSponsored,
    hasAffiliate: extraction.hasAffiliate,
    affiliateTools: extraction.affiliateTools,
  });

  console.log(`\nSaved as ResearchDataPoint: ${dp.id}`);
}

async function cmdExtractMarketplace(flags: Record<string, string>) {
  requireOpenAIKey();
  const filePath = requireFlag(flags, 'file');
  const platform = requireFlag(flags, 'platform');

  const validPlatforms = ['zapier', 'make', 'n8n'];
  if (!validPlatforms.includes(platform)) {
    console.error(`Error: --platform must be one of: ${validPlatforms.join(', ')}`);
    process.exit(1);
  }

  const content = readInputFile(filePath);
  console.log(`Extracting from ${platform} listing: ${filePath}`);
  console.log(`Content length: ${content.length} characters\n`);

  const extraction = await extractFromMarketplaceListing(content);
  console.log('Extraction result:');
  console.log(`  Trigger tool: ${extraction.triggerTool}`);
  console.log(`  Action tool: ${extraction.actionTool}`);
  console.log(`  Connector: ${extraction.connectorType}`);
  console.log(`  Use case: ${extraction.useCase}`);
  console.log(`  Install count: ${extraction.installCount ?? 'unknown'}`);
  console.log(`  Rating: ${extraction.rating ?? 'unknown'}`);

  const sourceType = `${platform}_templates`;
  const service = getResearchService();
  const dp = await service.createDataPoint({
    sourceType,
    tools: [extraction.triggerTool, extraction.actionTool],
    toolCombination: true,
    automations: [{
      triggerTool: extraction.triggerTool,
      triggerEvent: extraction.useCase,
      actionTool: extraction.actionTool,
      actionResult: extraction.useCase,
      connectorType: extraction.connectorType,
      frequency: 1,
    }],
  });

  console.log(`\nSaved as ResearchDataPoint: ${dp.id}`);
}

async function cmdMineClusters(flags: Record<string, string>) {
  const minWeight = parseInt(flags['min-weight'] ?? '2', 10);

  console.log('Mining clusters from co-occurrence data...');
  console.log(`Minimum weight threshold: ${minWeight}\n`);

  // Query all non-rejected data points
  const dataPoints = await prisma.researchDataPoint.findMany({
    where: { status: { not: 'rejected' } },
    select: { tools: true, sourceType: true },
  });

  console.log(`Found ${dataPoints.length} non-rejected data points\n`);

  if (dataPoints.length === 0) {
    console.log('No data points to mine. Run seed or extract commands first.');
    return;
  }

  // Build co-occurrence graph
  const edges = buildCoOccurrenceGraph(dataPoints);
  console.log(`Co-occurrence edges: ${edges.length}`);

  if (edges.length > 0) {
    console.log('\nTop 10 tool pairs by co-occurrence:');
    const topEdges = edges.slice(0, 10);
    for (const edge of topEdges) {
      console.log(`  ${edge.toolA} ↔ ${edge.toolB}: weight=${edge.weight}, sources=[${edge.sources.join(', ')}]`);
    }
  }

  // Detect clusters
  const clusters = detectClusters(edges, minWeight);
  console.log(`\nDetected ${clusters.length} cluster candidates:\n`);

  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    console.log(`  Cluster ${i + 1}:`);
    console.log(`    Tools: ${c.tools.join(', ')}`);
    console.log(`    Total weight: ${c.totalWeight}`);
    console.log(`    Avg weight: ${c.avgWeight.toFixed(1)}`);
    console.log(`    Source types: ${c.sourceTypes.join(', ')}`);
    console.log('');
  }
}

async function cmdScoreConfidence(flags: Record<string, string>) {
  const clusterId = flags['cluster-id'];

  const where = clusterId ? { id: clusterId } : {};
  const clusters = await prisma.toolCluster.findMany({
    where,
    include: {
      tools: { include: { tool: { select: { name: true, category: true } } } },
    },
  });

  if (clusters.length === 0) {
    console.log(clusterId ? `Cluster "${clusterId}" not found.` : 'No clusters found.');
    return;
  }

  console.log(`Scoring confidence for ${clusters.length} cluster(s)...\n`);

  for (const cluster of clusters) {
    const toolNames = cluster.tools.map(ct => ct.tool.name);

    // Find data points mentioning these tools
    const dataPoints = await prisma.researchDataPoint.findMany({
      where: {
        status: { not: 'rejected' },
        tools: { hasSome: toolNames },
      },
    });

    // Calculate metrics
    const sourceTypes = [...new Set(dataPoints.map(dp => dp.sourceType))];
    const crossRefCount = dataPoints.filter(dp => dp.crossReferences.length > 0).length;
    const sponsoredCount = dataPoints.filter(dp => dp.isSponsored).length;
    const affiliateCount = dataPoints.filter(dp => dp.hasAffiliate).length;

    // Count unique segments
    const segmentCombos = new Set(
      dataPoints
        .filter(dp => dp.segmentTeamSize || dp.segmentStage)
        .map(dp => `${dp.segmentTeamSize ?? 'any'}-${dp.segmentStage ?? 'any'}`)
    );

    // Source dominance
    const sourceTypeCounts: Record<string, number> = {};
    for (const dp of dataPoints) {
      sourceTypeCounts[dp.sourceType] = (sourceTypeCounts[dp.sourceType] ?? 0) + 1;
    }
    const maxSourceCount = Math.max(...Object.values(sourceTypeCounts), 0);
    const singleSourceDominance = dataPoints.length > 0 ? maxSourceCount / dataPoints.length : 0;

    // Newest data age
    const now = Date.now();
    const newestDate = dataPoints.length > 0
      ? Math.max(...dataPoints.map(dp => dp.extractionDate.getTime()))
      : now;
    const newestAgeInDays = Math.floor((now - newestDate) / (1000 * 60 * 60 * 24));

    const { score, factors } = calculateConfidence({
      sourceTypes,
      sampleSize: dataPoints.length,
      crossReferenceCount: crossRefCount,
      segmentsRepresented: segmentCombos.size,
      totalSegments: 15, // 5 team sizes × 3 savviness levels (simplified)
      newestDataAgeInDays: newestAgeInDays,
      sponsoredRatio: dataPoints.length > 0 ? sponsoredCount / dataPoints.length : 0,
      affiliateRatio: dataPoints.length > 0 ? affiliateCount / dataPoints.length : 0,
      singleSourceDominance,
    });

    // Update cluster in DB
    await prisma.toolCluster.update({
      where: { id: cluster.id },
      data: {
        confidence: score,
        sourceCount: dataPoints.length,
        sourceTypes,
      },
    });

    console.log(`  ${cluster.name}`);
    console.log(`    Tools: ${toolNames.join(', ')}`);
    console.log(`    Data points: ${dataPoints.length}`);
    console.log(`    Confidence: ${cluster.confidence} → ${score}`);
    console.log(`    Factors: diversity=${factors.sourceDiversity}, sample=${factors.sampleSize}, xref=${factors.crossReference}, segment=${factors.segmentCoverage}, recency=${factors.recency}, penalties=${factors.penalties}`);
    console.log('');
  }

  console.log('Done. Cluster confidence scores updated.');
}

async function cmdAuditBias() {
  console.log('Running bias audit (12 checks)...\n');

  const checks = await runBiasAudit();
  const passCount = checks.filter(c => c.passing).length;
  const failCount = checks.length - passCount;

  // Find max name length for alignment
  const maxNameLen = Math.max(...checks.map(c => c.name.length));

  for (const check of checks) {
    const icon = check.passing ? '✅ PASS' : '❌ FAIL';
    const paddedName = check.name.padEnd(maxNameLen);
    const valueStr = typeof check.currentValue === 'number'
      ? check.currentValue % 1 === 0
        ? check.currentValue.toString()
        : check.currentValue.toFixed(2)
      : String(check.currentValue);
    console.log(`  ${icon}  ${paddedName}  value=${valueStr}  threshold=${check.threshold}`);
  }

  console.log(`\nResult: ${passCount}/${checks.length} checks passed, ${failCount} failed`);

  if (failCount > 0) {
    console.log('\nFailing checks need attention:');
    for (const check of checks.filter(c => !c.passing)) {
      console.log(`  - ${check.name}: ${check.description}`);
    }
  }
}

// ============================================
// HELP
// ============================================

function printHelp() {
  console.log(`
Research CLI — AI Workflow Clinic research intelligence pipeline

Usage:
  npx tsx lib/scripts/runResearch.ts <command> [options]

Commands:
  extract-youtube      --file <path>                         Parse YouTube transcript → save data point
  extract-community    --file <path> --platform <platform>   Parse Reddit/HN/IndieHackers thread → save data point
  extract-marketplace  --file <path> --platform <platform>   Parse Zapier/Make/n8n listing → save data point
  mine-clusters        [--min-weight <N>]                    Detect tool clusters from co-occurrence
  score-confidence     [--cluster-id <id>]                   Recalculate cluster confidence scores
  audit-bias                                                 Run 12-check bias audit

Platforms:
  Community:    reddit, hackernews, indie_hackers
  Marketplace:  zapier, make, n8n

Environment:
  OPENAI_API_KEY    Required for extract-* commands (uses gpt-4.1-mini)
  DATABASE_URL      Required for all commands (Prisma)

Examples:
  npx tsx lib/scripts/runResearch.ts audit-bias
  npx tsx lib/scripts/runResearch.ts mine-clusters --min-weight 3
  npx tsx lib/scripts/runResearch.ts score-confidence
  npx tsx lib/scripts/runResearch.ts extract-youtube --file data/transcript.txt
  npx tsx lib/scripts/runResearch.ts extract-community --file data/thread.json --platform reddit
  npx tsx lib/scripts/runResearch.ts extract-marketplace --file data/listing.txt --platform zapier
`);
}

// ============================================
// MAIN
// ============================================

async function main() {
  const { command, flags } = parseArgs(process.argv);

  if (!command || command === 'help' || command === '--help') {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case 'extract-youtube':
        await cmdExtractYouTube(flags);
        break;
      case 'extract-community':
        await cmdExtractCommunity(flags);
        break;
      case 'extract-marketplace':
        await cmdExtractMarketplace(flags);
        break;
      case 'mine-clusters':
        await cmdMineClusters(flags);
        break;
      case 'score-confidence':
        await cmdScoreConfidence(flags);
        break;
      case 'audit-bias':
        await cmdAuditBias();
        break;
      default:
        console.error(`Unknown command: "${command}"`);
        printHelp();
        process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Error:', e.message ?? e);
  process.exit(1);
});
