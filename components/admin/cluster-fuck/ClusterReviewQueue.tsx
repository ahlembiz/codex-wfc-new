import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import type { ToolClusterData } from '../../../types';
import { getClusters, updateCluster, bulkUpdateClusters } from '../../../services/researchAdminService';
import BulkActionsBar from './BulkActionsBar';
import DetailModal from './DetailModal';

ModuleRegistry.registerModules([AllCommunityModule]);

const confidenceColor = (v: number) => v >= 70 ? '#22C55E' : v >= 50 ? '#F59E0B' : '#EF4444';
const statusColor = (s: string) =>
  s === 'approved' ? '#22C55E' : s === 'rejected' ? '#EF4444' : s === 'needs_research' ? '#A855F7' : '#F59E0B';

const ClusterReviewQueue: React.FC = () => {
  const [clusters, setClusters] = useState<ToolClusterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selected, setSelected] = useState<ToolClusterData[]>([]);
  const [detailCluster, setDetailCluster] = useState<ToolClusterData | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const gridRef = useRef<AgGridReact<ToolClusterData>>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getClusters({ status: statusFilter || undefined, limit: 100 });
      setClusters(result.clusters);
      setTotal(result.total);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBulkAction = async (action: string) => {
    if (selected.length === 0) return;
    setBulkLoading(true);
    await bulkUpdateClusters(selected.map(c => c.id), action);
    setSelected([]);
    gridRef.current?.api?.deselectAll();
    await fetchData();
    setBulkLoading(false);
  };

  const handleUpdate = async (id: string, data: Record<string, unknown>) => {
    await updateCluster(id, data);
    await fetchData();
  };

  const columnDefs: ColDef<ToolClusterData>[] = [
    { headerCheckboxSelection: true, checkboxSelection: true, width: 40, sortable: false, filter: false },
    {
      headerName: 'Name', field: 'name', flex: 1, minWidth: 160,
      cellRenderer: (p: ICellRendererParams<ToolClusterData>) => (
        <span style={{ color: '#2979FF', cursor: 'pointer', fontWeight: 600 }} onClick={() => setDetailCluster(p.data!)}>{p.value}</span>
      ),
    },
    {
      headerName: 'Tools', field: 'tools', flex: 1, minWidth: 180, sortable: false,
      valueGetter: p => p.data?.tools?.map(t => t.toolDisplayName).join(', ') ?? '',
      cellRenderer: (p: ICellRendererParams<ToolClusterData>) => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {p.data?.tools?.map(t => (
            <span key={t.id} style={{ padding: '1px 6px', background: '#1F2937', fontSize: 11, color: '#9CA3AF' }}>
              {t.toolDisplayName}
            </span>
          ))}
        </div>
      ),
    },
    {
      headerName: 'Synergy', field: 'synergyType', width: 120,
      cellRenderer: (p: ICellRendererParams) => (
        <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}>{p.value}</span>
      ),
    },
    {
      headerName: 'Conf.', field: 'confidence', width: 80, sort: 'desc',
      cellRenderer: (p: ICellRendererParams) => (
        <span style={{ color: confidenceColor(p.value), fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{p.value}</span>
      ),
    },
    { headerName: 'Sources', field: 'sourceCount', width: 80 },
    {
      headerName: 'Bias', field: 'biasFlags', width: 80, sortable: false,
      valueGetter: p => p.data?.biasFlags?.length ?? 0,
      cellRenderer: (p: ICellRendererParams) => (
        <span style={{ color: p.value > 0 ? '#F59E0B' : '#374151', fontWeight: p.value > 0 ? 700 : 400 }}>
          {p.value > 0 ? `${p.value} flags` : '-'}
        </span>
      ),
    },
    {
      headerName: 'Status', field: 'status', width: 110,
      cellRenderer: (p: ICellRendererParams) => (
        <span style={{
          padding: '2px 8px', fontSize: 11, fontWeight: 700,
          background: statusColor(p.value) + '20', color: statusColor(p.value),
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {p.value}
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '6px 10px', background: '#111827', border: '1px solid #374151', color: '#E5E7EB', fontSize: 12 }}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="needs_research">Needs Research</option>
        </select>
        <span style={{ fontSize: 11, color: '#6B7280', fontFamily: "'JetBrains Mono', monospace" }}>
          {total} clusters
        </span>
      </div>

      <BulkActionsBar
        selectedCount={selected.length}
        onApprove={() => handleBulkAction('approve')}
        onReject={() => handleBulkAction('reject')}
        onFlag={() => handleBulkAction('flag')}
        onClearSelection={() => { setSelected([]); gridRef.current?.api?.deselectAll(); }}
        loading={bulkLoading}
      />

      <div className="ag-theme-quartz-dark" style={{ height: 500, width: '100%' }}>
        <AgGridReact<ToolClusterData>
          ref={gridRef}
          rowData={clusters}
          columnDefs={columnDefs}
          loading={loading}
          rowSelection="multiple"
          suppressRowClickSelection
          onSelectionChanged={() => setSelected(gridRef.current?.api?.getSelectedRows() ?? [])}
          pagination
          paginationPageSize={50}
          getRowId={p => p.data.id}
          defaultColDef={{ sortable: true, resizable: true }}
        />
      </div>

      {detailCluster && (
        <DetailModal
          cluster={detailCluster}
          onClose={() => { setDetailCluster(null); fetchData(); }}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
};

export default ClusterReviewQueue;
