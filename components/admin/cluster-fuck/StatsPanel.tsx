import React, { useState, useEffect } from 'react';
import { getClusterFuckStats } from '../../../services/researchAdminService';
import type { ClusterFuckStats } from '../../../types';

const StatCard: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <div style={{
    padding: '16px 20px', background: '#111827', border: '1px solid #1F2937',
    flex: '1 1 180px', minWidth: 150,
  }}>
    <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
      {label}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: color || '#fff' }}>
      {value}
    </div>
  </div>
);

const StatsPanel: React.FC = () => {
  const [stats, setStats] = useState<ClusterFuckStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClusterFuckStats().then(s => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: '#6B7280', padding: 24 }}>Loading stats...</div>;
  if (!stats) return <div style={{ color: '#EF4444', padding: 24 }}>Failed to load stats</div>;

  const biasColor = stats.biasAuditTotalChecks > 0
    ? (stats.biasAuditPassCount / stats.biasAuditTotalChecks >= 0.8 ? '#22C55E' : stats.biasAuditPassCount / stats.biasAuditTotalChecks >= 0.5 ? '#F59E0B' : '#EF4444')
    : '#6B7280';

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Clusters" value={stats.totalClusters} />
        <StatCard label="Approved" value={stats.approvedClusters} color="#22C55E" />
        <StatCard label="Pending" value={stats.pendingClusters} color="#F59E0B" />
        <StatCard label="Data Points" value={stats.totalDataPoints} />
        <StatCard label="Researched Recipes" value={stats.totalRecipesWithResearch} />
        <StatCard label="Avg Cluster Confidence" value={stats.avgClusterConfidence} color={stats.avgClusterConfidence >= 60 ? '#22C55E' : '#F59E0B'} />
        <StatCard label="Bias Audit" value={`${stats.biasAuditPassCount}/${stats.biasAuditTotalChecks}`} color={biasColor} />
      </div>

      {Object.keys(stats.sourceTypeDistribution).length > 0 && (
        <div style={{ background: '#111827', border: '1px solid #1F2937', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Source Distribution
          </div>
          {(Object.entries(stats.sourceTypeDistribution) as [string, number][])
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => {
              const pct = stats.totalDataPoints > 0 ? (count / stats.totalDataPoints) * 100 : 0;
              return (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 160, fontSize: 12, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}>
                    {type}
                  </span>
                  <div style={{ flex: 1, height: 12, background: '#1F2937', position: 'relative' }}>
                    <div style={{
                      height: '100%', background: pct > 60 ? '#EF4444' : '#2979FF',
                      width: `${Math.min(100, pct)}%`, transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{ width: 60, fontSize: 11, color: '#6B7280', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                    {count} ({pct.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
