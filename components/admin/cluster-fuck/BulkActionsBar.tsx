import React from 'react';

interface BulkActionsBarProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onFlag: () => void;
  onClearSelection: () => void;
  loading: boolean;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount, onApprove, onReject, onFlag, onClearSelection, loading,
}) => {
  if (selectedCount === 0) return null;

  const btnBase: React.CSSProperties = {
    padding: '6px 14px', border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', monospace",
    transition: 'opacity 0.2s', opacity: loading ? 0.5 : 1,
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
      background: '#111827', border: '1px solid #1F2937', marginBottom: 8,
    }}>
      <span style={{ fontSize: 12, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}>
        {selectedCount} selected
      </span>
      <button
        onClick={onApprove} disabled={loading}
        style={{ ...btnBase, background: '#065F46', color: '#22C55E' }}
      >
        Approve
      </button>
      <button
        onClick={onReject} disabled={loading}
        style={{ ...btnBase, background: '#7F1D1D', color: '#EF4444' }}
      >
        Reject
      </button>
      <button
        onClick={onFlag} disabled={loading}
        style={{ ...btnBase, background: '#78350F', color: '#F59E0B' }}
      >
        Flag
      </button>
      <div style={{ flex: 1 }} />
      <button
        onClick={onClearSelection}
        style={{ ...btnBase, background: 'transparent', color: '#6B7280', border: '1px solid #374151' }}
      >
        Clear
      </button>
    </div>
  );
};

export default BulkActionsBar;
