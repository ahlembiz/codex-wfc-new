import React, { useState } from 'react';
import ClusterReviewQueue from './ClusterReviewQueue';
import RecipeReviewQueue from './RecipeReviewQueue';
import DataPointBrowser from './DataPointBrowser';
import BiasAuditPanel from './BiasAuditPanel';
import StatsPanel from './StatsPanel';

type Tab = 'clusters' | 'recipes' | 'data' | 'bias' | 'stats';

interface ClusterFuckDashboardProps {
  onBack: () => void;
}

const TAB_CONFIG: Array<{ id: Tab; label: string }> = [
  { id: 'clusters', label: 'Clusters' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'data', label: 'Data Points' },
  { id: 'bias', label: 'Bias Audit' },
  { id: 'stats', label: 'Stats' },
];

const ClusterFuckDashboard: React.FC<ClusterFuckDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<Tab>('clusters');

  const renderTab = () => {
    switch (activeTab) {
      case 'clusters': return <ClusterReviewQueue />;
      case 'recipes': return <RecipeReviewQueue />;
      case 'data': return <DataPointBrowser />;
      case 'bias': return <BiasAuditPanel />;
      case 'stats': return <StatsPanel />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0B', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, background: '#0B0B0B',
        borderBottom: '1px solid #1F2937', padding: '16px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={onBack}
              style={{
                background: 'none', border: '1px solid #1F2937', color: '#9CA3AF',
                padding: '6px 12px', cursor: 'pointer', fontSize: 14,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#E53935'; e.currentTarget.style.color = '#E53935'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#1F2937'; e.currentTarget.style.color = '#9CA3AF'; }}
            >
              &larr;
            </button>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                Cluster Fuck.
              </h1>
              <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                Research Intelligence // Admin Console
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 16, borderBottom: '1px solid #1F2937' }}>
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 20px', background: 'none', border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #2979FF' : '2px solid transparent',
                color: activeTab === tab.id ? '#fff' : '#6B7280',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: 'uppercase', letterSpacing: '0.05em',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {renderTab()}
      </div>
    </div>
  );
};

export default ClusterFuckDashboard;
