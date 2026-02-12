import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import type { ResearchDataPointData } from '../../../types';
import { getResearchData } from '../../../services/researchAdminService';
import { VALID_SOURCE_TYPES } from '../../../lib/constants';

ModuleRegistry.registerModules([AllCommunityModule]);

const DataPointBrowser: React.FC = () => {
  const [dataPoints, setDataPoints] = useState<ResearchDataPointData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const gridRef = useRef<AgGridReact<ResearchDataPointData>>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getResearchData({
        sourceType: sourceFilter || undefined,
        status: statusFilter || undefined,
        limit: 100,
      });
      setDataPoints(result.dataPoints);
      setTotal(result.total);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [sourceFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columnDefs: ColDef<ResearchDataPointData>[] = [
    {
      headerName: 'Source', field: 'sourceType', width: 140,
      cellRenderer: (p: ICellRendererParams) => (
        <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF' }}>{p.value}</span>
      ),
    },
    {
      headerName: 'URL', field: 'sourceUrl', flex: 1, minWidth: 200,
      cellRenderer: (p: ICellRendererParams) => (
        p.value ? (
          <a href={p.value} target="_blank" rel="noreferrer" style={{ color: '#2979FF', fontSize: 12, textDecoration: 'none' }}>
            {p.value.length > 60 ? p.value.substring(0, 60) + '...' : p.value}
          </a>
        ) : <span style={{ color: '#374151' }}>-</span>
      ),
    },
    {
      headerName: 'Tools', field: 'tools', flex: 1, minWidth: 160, sortable: false,
      valueGetter: p => p.data?.tools?.join(', ') ?? '',
      cellRenderer: (p: ICellRendererParams<ResearchDataPointData>) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {p.data?.tools?.slice(0, 5).map(t => (
            <span key={t} style={{ padding: '1px 6px', background: '#1F2937', fontSize: 11, color: '#9CA3AF' }}>{t}</span>
          ))}
          {(p.data?.tools?.length ?? 0) > 5 && (
            <span style={{ fontSize: 11, color: '#6B7280' }}>+{(p.data?.tools?.length ?? 0) - 5}</span>
          )}
        </div>
      ),
    },
    {
      headerName: 'Segment', width: 140, sortable: false,
      valueGetter: p => [p.data?.segmentTeamSize, p.data?.segmentRole].filter(Boolean).join(', ') || '-',
    },
    {
      headerName: 'Conf.', field: 'confidence', width: 70,
      cellRenderer: (p: ICellRendererParams) => (
        <span style={{
          color: p.value >= 70 ? '#22C55E' : p.value >= 50 ? '#F59E0B' : '#EF4444',
          fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
        }}>{p.value}</span>
      ),
    },
    {
      headerName: 'Spon.', field: 'isSponsored', width: 70,
      cellRenderer: (p: ICellRendererParams) => (
        <span style={{ color: p.value ? '#F59E0B' : '#374151', fontWeight: p.value ? 700 : 400 }}>
          {p.value ? 'YES' : '-'}
        </span>
      ),
    },
    {
      headerName: 'Status', field: 'status', width: 100,
      cellRenderer: (p: ICellRendererParams) => {
        const color = p.value === 'validated' ? '#22C55E' : p.value === 'rejected' ? '#EF4444' : p.value === 'processed' ? '#2979FF' : '#6B7280';
        return (
          <span style={{
            padding: '2px 8px', fontSize: 11, fontWeight: 700,
            background: color + '20', color,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{p.value}</span>
        );
      },
    },
    {
      headerName: 'Date', field: 'extractionDate', width: 100,
      valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : '',
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          style={{ padding: '6px 10px', background: '#111827', border: '1px solid #374151', color: '#E5E7EB', fontSize: 12 }}>
          <option value="">All sources</option>
          {VALID_SOURCE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '6px 10px', background: '#111827', border: '1px solid #374151', color: '#E5E7EB', fontSize: 12 }}>
          <option value="">All statuses</option>
          <option value="raw">Raw</option>
          <option value="processed">Processed</option>
          <option value="validated">Validated</option>
          <option value="rejected">Rejected</option>
        </select>
        <span style={{ fontSize: 11, color: '#6B7280', fontFamily: "'JetBrains Mono', monospace" }}>
          {total} data points
        </span>
      </div>

      <div className="ag-theme-quartz-dark" style={{ height: 500, width: '100%' }}>
        <AgGridReact<ResearchDataPointData>
          ref={gridRef}
          rowData={dataPoints}
          columnDefs={columnDefs}
          loading={loading}
          pagination
          paginationPageSize={50}
          getRowId={p => p.data.id}
          defaultColDef={{ sortable: true, resizable: true }}
        />
      </div>
    </div>
  );
};

export default DataPointBrowser;
