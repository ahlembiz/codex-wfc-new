import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../../db', () => ({
  prisma: {
    toolCluster: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    clusterTool: {
      findMany: vi.fn(),
    },
    automationRecipe: {
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    researchDataPoint: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock bias auditor (it also uses prisma, so we need to mock the whole module)
vi.mock('../../research/validators/biasAuditor', () => ({
  runBiasAudit: vi.fn().mockResolvedValue([
    { id: 'check-1', name: 'Test Check', threshold: 0.5, currentValue: 0.3, passing: true, description: '' },
  ]),
}));

import { prisma } from '../../db';
import { ResearchService } from '../researchService';

describe('ResearchService', () => {
  let service: ResearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ResearchService();
  });

  describe('getClusters', () => {
    it('should return paginated clusters with defaults', async () => {
      vi.mocked(prisma.toolCluster.findMany).mockResolvedValue([]);
      vi.mocked(prisma.toolCluster.count).mockResolvedValue(0);

      const result = await service.getClusters();

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.clusters).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should apply status filter', async () => {
      vi.mocked(prisma.toolCluster.findMany).mockResolvedValue([]);
      vi.mocked(prisma.toolCluster.count).mockResolvedValue(0);

      await service.getClusters({ status: 'approved' });

      expect(vi.mocked(prisma.toolCluster.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'approved' }),
        }),
      );
    });

    it('should apply confidence minimum filter', async () => {
      vi.mocked(prisma.toolCluster.findMany).mockResolvedValue([]);
      vi.mocked(prisma.toolCluster.count).mockResolvedValue(0);

      await service.getClusters({ confidenceMin: 60 });

      expect(vi.mocked(prisma.toolCluster.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ confidence: { gte: 60 } }),
        }),
      );
    });
  });

  describe('createCluster', () => {
    it('should create a cluster with tool associations', async () => {
      const mockCluster = {
        id: 'cluster-1',
        name: 'Test Stack',
        description: 'A test cluster',
        synergyStrength: 75,
        synergyType: 'complementary',
        tools: [],
      };
      vi.mocked(prisma.toolCluster.create).mockResolvedValue(mockCluster as any);

      const result = await service.createCluster({
        name: 'Test Stack',
        description: 'A test cluster',
        synergyType: 'complementary',
        synergyStrength: 75,
        toolIds: [{ toolId: 'tool-1', role: 'primary' }],
      });

      expect(vi.mocked(prisma.toolCluster.create)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test Stack',
            tools: { create: [{ toolId: 'tool-1', role: 'primary' }] },
          }),
        }),
      );
      expect(result.name).toBe('Test Stack');
    });
  });

  describe('updateCluster', () => {
    it('should set reviewedAt when approving', async () => {
      vi.mocked(prisma.toolCluster.update).mockResolvedValue({ id: 'cluster-1' } as any);

      await service.updateCluster('cluster-1', { status: 'approved', reviewedBy: 'admin' });

      expect(vi.mocked(prisma.toolCluster.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'approved',
            reviewedBy: 'admin',
            reviewedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('bulkUpdateClusters', () => {
    it('should bulk approve clusters', async () => {
      vi.mocked(prisma.toolCluster.updateMany).mockResolvedValue({ count: 3 });

      const result = await service.bulkUpdateClusters(['c1', 'c2', 'c3'], 'approve');

      expect(result.updated).toBe(3);
      expect(vi.mocked(prisma.toolCluster.updateMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['c1', 'c2', 'c3'] } },
          data: expect.objectContaining({ status: 'approved' }),
        }),
      );
    });

    it('should handle flag action individually', async () => {
      vi.mocked(prisma.toolCluster.findUnique).mockResolvedValue({
        biasFlags: ['existing_flag'],
      } as any);
      vi.mocked(prisma.toolCluster.update).mockResolvedValue({} as any);

      const result = await service.bulkUpdateClusters(['c1'], 'flag', 'needs review');

      expect(result.updated).toBe(1);
      expect(vi.mocked(prisma.toolCluster.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            biasFlags: ['existing_flag', 'manual_review'],
          }),
        }),
      );
    });
  });

  describe('getDataPoints', () => {
    it('should return paginated data points', async () => {
      vi.mocked(prisma.researchDataPoint.findMany).mockResolvedValue([]);
      vi.mocked(prisma.researchDataPoint.count).mockResolvedValue(0);

      const result = await service.getDataPoints({ sourceType: 'reddit', page: 2, limit: 25 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
      expect(vi.mocked(prisma.researchDataPoint.findMany)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sourceType: 'reddit' }),
          skip: 25,
          take: 25,
        }),
      );
    });
  });

  describe('createDataPoint', () => {
    it('should create a data point with defaults for array fields', async () => {
      vi.mocked(prisma.researchDataPoint.create).mockResolvedValue({ id: 'dp-1' } as any);

      await service.createDataPoint({
        sourceType: 'reddit',
        tools: ['notion', 'linear'],
        toolCombination: true,
      });

      expect(vi.mocked(prisma.researchDataPoint.create)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sourceType: 'reddit',
            tools: ['notion', 'linear'],
            sponsoredTools: [],
            affiliateTools: [],
            crossReferences: [],
            contradictions: [],
          }),
        }),
      );
    });
  });

  describe('updateDataPointStatus', () => {
    it('should update status', async () => {
      vi.mocked(prisma.researchDataPoint.update).mockResolvedValue({ id: 'dp-1', status: 'validated' } as any);

      const result = await service.updateDataPointStatus('dp-1', 'validated');

      expect(vi.mocked(prisma.researchDataPoint.update)).toHaveBeenCalledWith({
        where: { id: 'dp-1' },
        data: { status: 'validated' },
      });
    });
  });

  describe('getClusterFuckStats', () => {
    it('should aggregate stats from all sources', async () => {
      vi.mocked(prisma.toolCluster.count)
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(6)   // approved
        .mockResolvedValueOnce(3);  // pending
      vi.mocked(prisma.toolCluster.aggregate).mockResolvedValue({
        _avg: { confidence: 65 },
      } as any);
      vi.mocked(prisma.researchDataPoint.count).mockResolvedValue(50);
      vi.mocked(prisma.automationRecipe.count).mockResolvedValue(15);
      vi.mocked(prisma.automationRecipe.aggregate).mockResolvedValue({
        _avg: { confidence: 70 },
      } as any);
      vi.mocked(prisma.researchDataPoint.groupBy).mockResolvedValue([
        { sourceType: 'reddit', _count: 30 },
        { sourceType: 'youtube', _count: 20 },
      ] as any);

      const stats = await service.getClusterFuckStats();

      expect(stats.totalClusters).toBe(10);
      expect(stats.approvedClusters).toBe(6);
      expect(stats.pendingClusters).toBe(3);
      expect(stats.totalDataPoints).toBe(50);
      expect(stats.avgClusterConfidence).toBe(65);
      expect(stats.biasAuditPassCount).toBe(1);
      expect(stats.sourceTypeDistribution).toHaveProperty('reddit');
    });
  });
});
