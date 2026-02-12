import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { getResearchRecipes, bulkUpdateRecipes } from '../../../services/researchAdminService';
import BulkActionsBar from './BulkActionsBar';

ModuleRegistry.registerModules([AllCommunityModule]);

const confidenceColor = (v: number | null) => !v ? '#374151' : v >= 70 ? '#22C55E' : v >= 50 ? '#F59E0B' : '#EF4444';
const statusColor = (s: string | null) =>
  s === 'approved' ? '#22C55E' : s === 'rejected' ? '#EF4444' : s === 'needs_research' ? '#A855F7' : '#F59E0B';

interface RecipeRow {
  id: string;
  triggerTool: { displayName: string };
  triggerEvent: string;
  actionTool: { displayName: string };
  actionType: string;
  connectorType: string;
  setupDifficulty: string;
  phases: string[];
  timeSavedPerWeek: number;
  confidence: number | null;
  researchStatus: string | null;
}

const RecipeReviewQueue: React.FC = () => {
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selected, setSelected] = useState<RecipeRow[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const gridRef = useRef<AgGridReact<RecipeRow>>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getResearchRecipes({ researchStatus: statusFilter || undefined, limit: 100 });
      setRecipes(result.recipes);
      setTotal(result.total);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBulkAction = async (action: string) => {
    if (selected.length === 0) return;
    setBulkLoading(true);
    await bulkUpdateRecipes(selected.map(r => r.id), action);
    setSelected([]);
    gridRef.current?.api?.deselectAll();
    await fetchData();
    setBulkLoading(false);
  };

  const columnDefs: ColDef<RecipeRow>[] = [
    { headerCheckboxSelection: true, checkboxSelection: true, width: 40, sortable: false, filter: false },
    {
      headerName: 'Trigger', flex: 1, minWidth: 180,
      valueGetter: p => p.data ? `${p.data.triggerTool.displayName}: ${p.data.triggerEvent}` : '',
    },
    {
      headerName: 'Action', flex: 1, minWidth: 180,
      valueGetter: p => p.data ? `${p.data.actionTool.displayName}: ${p.data.actionType}` : '',
    },
    { headerName: 'Connector', field: 'connectorType', width: 110 },
    { headerName: 'Setup', field: 'setupDifficulty', width: 110 },
    {
      headerName: 'Phases', field: 'phases', width: 120, sortable: false,
      valueGetter: p => p.data?.phases?.join(', ') ?? '',
    },
    {
      headerName: 'Time Saved', field: 'timeSavedPerWeek', width: 100,
      cellRenderer: (p: ICellRendererParams) => (
        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.value}h/wk</span>
      ),
    },
    {
      headerName: 'Conf.', field: 'confidence', width: 80,
      cellRenderer: (p: ICellRendererParams) => (
        <span style={{ color: confidenceColor(p.value), fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
          {p.value ?? '-'}
        </span>
      ),
    },
    {
      headerName: 'Status', field: 'researchStatus', width: 110,
      cellRenderer: (p: ICellRendererParams) => (
        p.value ? (
          <span style={{
            padding: '2px 8px', fontSize: 11, fontWeight: 700,
            background: statusColor(p.value) + '20', color: statusColor(p.value),
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {p.value}
          </span>
        ) : <span style={{ color: '#374151' }}>-</span>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
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
          {total} recipes
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
        <AgGridReact<RecipeRow>
          ref={gridRef}
          rowData={recipes}
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
    </div>
  );
};

export default RecipeReviewQueue;
