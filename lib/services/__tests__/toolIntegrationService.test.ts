import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../../db', () => ({
  prisma: {
    toolIntegration: { findMany: vi.fn() },
    automationRecipe: { findMany: vi.fn() },
  },
}));

import { prisma } from '../../db';
import { ToolIntegrationService } from '../toolIntegrationService';

describe('ToolIntegrationService.calculateStackSynergyBonus', () => {
  let service: ToolIntegrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ToolIntegrationService();
  });

  it('returns 0 when no automation recipes exist', async () => {
    vi.mocked(prisma.automationRecipe.findMany).mockResolvedValue([]);

    const bonus = await service.calculateStackSynergyBonus('candidate', ['tool-a', 'tool-b']);
    expect(bonus).toBe(0);
  });

  it('returns 0 when existing stack is empty', async () => {
    const bonus = await service.calculateStackSynergyBonus('candidate', []);
    expect(bonus).toBe(0);
  });

  it('returns 5 for a 3-tool chain (candidate + 2 stack tools)', async () => {
    vi.mocked(prisma.automationRecipe.findMany).mockResolvedValue([
      { triggerToolId: 'candidate', actionToolId: 'tool-a' },
      { triggerToolId: 'tool-b', actionToolId: 'candidate' },
    ] as any);

    const bonus = await service.calculateStackSynergyBonus('candidate', ['tool-a', 'tool-b']);
    // candidate connects to tool-a and tool-b → chain length = 3
    expect(bonus).toBe(5);
  });

  it('returns 10 for a 4-tool chain', async () => {
    vi.mocked(prisma.automationRecipe.findMany).mockResolvedValue([
      { triggerToolId: 'candidate', actionToolId: 'tool-a' },
      { triggerToolId: 'candidate', actionToolId: 'tool-b' },
      { triggerToolId: 'tool-c', actionToolId: 'candidate' },
    ] as any);

    const bonus = await service.calculateStackSynergyBonus('candidate', ['tool-a', 'tool-b', 'tool-c']);
    // candidate connects to tool-a, tool-b, tool-c → chain length = 4
    expect(bonus).toBe(10);
  });

  it('returns 15 (capped) for 5+ tool chain', async () => {
    vi.mocked(prisma.automationRecipe.findMany).mockResolvedValue([
      { triggerToolId: 'candidate', actionToolId: 'tool-a' },
      { triggerToolId: 'candidate', actionToolId: 'tool-b' },
      { triggerToolId: 'candidate', actionToolId: 'tool-c' },
      { triggerToolId: 'tool-d', actionToolId: 'candidate' },
    ] as any);

    const bonus = await service.calculateStackSynergyBonus(
      'candidate', ['tool-a', 'tool-b', 'tool-c', 'tool-d']
    );
    // chain length = 5 → capped at 15
    expect(bonus).toBe(15);
  });

  it('does not count non-stack tools in recipes', async () => {
    vi.mocked(prisma.automationRecipe.findMany).mockResolvedValue([
      { triggerToolId: 'candidate', actionToolId: 'external-tool' },
      { triggerToolId: 'candidate', actionToolId: 'tool-a' },
    ] as any);

    const bonus = await service.calculateStackSynergyBonus('candidate', ['tool-a']);
    // Only tool-a is in the stack → chain length = 2 → bonus = 0
    expect(bonus).toBe(0);
  });

  it('returns 0 when DB query fails', async () => {
    vi.mocked(prisma.automationRecipe.findMany).mockRejectedValue(new Error('DB error'));

    const bonus = await service.calculateStackSynergyBonus('candidate', ['tool-a']);
    expect(bonus).toBe(0);
  });
});
