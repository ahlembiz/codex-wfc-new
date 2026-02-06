import React from 'react';
import type { ICellRendererParams } from 'ag-grid-community';
import type { AdminToolData } from '../../types';

export const formatCategory = (cat: string) =>
  cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const subScoreColor = (val: number) =>
  val >= 70 ? '#22C55E' : val >= 40 ? '#F59E0B' : '#EF4444';

export const SubScoreRenderer: React.FC<ICellRendererParams<AdminToolData>> = (params) => {
  const val = (params.value as number) ?? 50;
  return (
    <span style={{ color: subScoreColor(val), fontWeight: 600, fontSize: 12 }}>{val}</span>
  );
};

export const BooleanCellRenderer: React.FC<ICellRendererParams<AdminToolData> & { onToggle: (id: string, field: string, value: boolean) => void }> = (params) => {
  const val = params.value as boolean;
  const handleClick = () => {
    if (params.data && params.colDef?.field) {
      params.context?.onToggle(params.data.id, params.colDef.field, !val);
    }
  };
  return (
    <span
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        color: val ? '#22C55E' : '#4B5563',
        fontWeight: val ? 600 : 400,
        userSelect: 'none',
      }}
    >
      {val ? '\u2713' : '\u2014'}
    </span>
  );
};

export const StatBadge: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
    <span style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</span>
    <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {label}
    </span>
  </div>
);
