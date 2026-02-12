import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, type ColDef, type ValueGetterParams, type ICellRendererParams, type CellValueChangedEvent } from 'ag-grid-community';
import type { AdminToolData, CreateToolInput, UpdateToolInput } from '../types';
import { getAllToolsAdmin, updateToolPopularity, createTool, updateTool, deleteTool, enrichTool } from '../services/recommendationService';
import {
  VALID_TOOL_CATEGORIES as CATEGORIES,
  VALID_COMPLEXITIES as COMPLEXITIES,
  VALID_PRICING_TIERS as PRICING_TIERS,
} from '../lib/constants';
import { SubScoreRenderer, BooleanCellRenderer, StatBadge, formatCategory, subScoreColor } from './admin/renderers';
import ToolPanel from './admin/ToolPanel';
import DeleteModal from './admin/DeleteModal';

// Register all community modules (required for AG Grid v32+)
ModuleRegistry.registerModules([AllCommunityModule]);

interface AdminDashboardProps {
  onBack: () => void;
  onClusterFuck?: () => void;
}

const COMPLEXITY_COLORS: Record<string, string> = {
  SIMPLE: '#22C55E',
  MODERATE: '#F59E0B',
  ADVANCED: '#EF4444',
  EXPERT: '#A855F7',
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onClusterFuck }) => {
  const [tools, setTools] = useState<AdminToolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [toast, setToast] = useState<{ message: string; type: 'saving' | 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  // Panel state
  const [panelMode, setPanelMode] = useState<'closed' | 'add' | 'edit'>('closed');
  const [panelData, setPanelData] = useState<Partial<AdminToolData> | null>(null);
  const [panelSaving, setPanelSaving] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<AdminToolData[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Selected rows
  const [selectedRows, setSelectedRows] = useState<AdminToolData[]>([]);

  // Enriching state
  const [enrichingToolId, setEnrichingToolId] = useState<string | null>(null);

  const gridRef = useRef<AgGridReact<AdminToolData>>(null);

  const showToast = useCallback((message: string, type: 'saving' | 'success' | 'error', duration = 2000) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    if (type !== 'saving') {
      toastTimer.current = setTimeout(() => setToast(null), duration);
    }
  }, []);

  const SUB_SCORE_FIELDS = [
    'popularityAdoption', 'popularitySentiment', 'popularityMomentum',
    'popularityEcosystem', 'popularityReliability',
  ];

  // Editable simple fields
  const EDITABLE_SIMPLE_FIELDS = [
    'displayName', 'category', 'complexity', 'typicalPricingTier',
    'estimatedCostPerUser', 'foundedYear', 'fundingStage', 'websiteUrl', 'aiFeatureDescription',
  ];

  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent<AdminToolData>) => {
    const field = event.colDef.field;
    if (!field || !event.data) return;

    const toolId = event.data.id;
    const newValue = event.newValue;

    // Handle popularity sub-scores
    if (SUB_SCORE_FIELDS.includes(field)) {
      showToast('Saving...', 'saving');

      try {
        const updated = await updateToolPopularity(toolId, { [field]: newValue });
        setTools(prev => prev.map(t => {
          if (t.id !== toolId) return t;
          return {
            ...t,
            popularityScore: updated.popularityScore,
            popularityAdoption: updated.popularityAdoption,
            popularitySentiment: updated.popularitySentiment,
            popularityMomentum: updated.popularityMomentum,
            popularityEcosystem: updated.popularityEcosystem,
            popularityReliability: updated.popularityReliability,
          };
        }));
        showToast('Saved', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Save failed', 'error', 3000);
        event.api.undoCellEditing();
      }
      return;
    }

    // Handle other editable fields
    if (EDITABLE_SIMPLE_FIELDS.includes(field)) {
      showToast('Saving...', 'saving');

      try {
        const updated = await updateTool(toolId, { [field]: newValue });
        setTools(prev => prev.map(t => t.id === toolId ? { ...t, ...updated } : t));
        showToast('Saved', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Save failed', 'error', 3000);
        event.api.undoCellEditing();
      }
    }
  }, [showToast]);

  // Handle boolean field toggle from cell renderer
  const handleBooleanToggle = useCallback(async (toolId: string, field: string, value: boolean) => {
    showToast('Saving...', 'saving');

    try {
      const updated = await updateTool(toolId, { [field]: value });
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, ...updated } : t));
      showToast('Saved', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error', 3000);
    }
  }, [showToast]);

  // Handle panel save
  const handlePanelSave = useCallback(async (data: CreateToolInput | UpdateToolInput) => {
    setPanelSaving(true);
    try {
      if (panelMode === 'add') {
        const created = await createTool(data as CreateToolInput);
        setTools(prev => [...prev, created]);
        showToast('Tool created', 'success');
      } else if (panelMode === 'edit' && panelData?.id) {
        const updated = await updateTool(panelData.id, data as UpdateToolInput);
        setTools(prev => prev.map(t => t.id === panelData.id ? { ...t, ...updated } : t));
        showToast('Tool updated', 'success');
      }
      setPanelMode('closed');
      setPanelData(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed', 'error', 3000);
    } finally {
      setPanelSaving(false);
    }
  }, [panelMode, panelData, showToast]);

  // Handle delete
  const handleDeleteConfirm = useCallback(async () => {
    setDeleting(true);
    try {
      for (const tool of deleteTargets) {
        await deleteTool(tool.id);
      }
      const deletedIds = new Set(deleteTargets.map(t => t.id));
      setTools(prev => prev.filter(t => !deletedIds.has(t.id)));
      setSelectedRows([]);
      showToast(`Deleted ${deleteTargets.length} tool(s)`, 'success');
      setDeleteModalOpen(false);
      setDeleteTargets([]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error', 3000);
    } finally {
      setDeleting(false);
    }
  }, [deleteTargets, showToast]);

  // Handle AI enrichment
  const handleEnrich = useCallback(async (toolId: string) => {
    setEnrichingToolId(toolId);
    showToast('Running AI enrichment...', 'saving');

    try {
      const { data, enrichment } = await enrichTool(toolId);
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, ...data } : t));
      showToast(`Updated ${enrichment.fieldsUpdated.length} fields: ${enrichment.summary}`, 'success', 5000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Enrichment failed', 'error', 3000);
    } finally {
      setEnrichingToolId(null);
    }
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAllToolsAdmin();
        if (!cancelled) setTools(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load tools');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Category counts
  const categoryMap = useMemo(() => {
    const map: Record<string, number> = {};
    tools.forEach(t => {
      const cat = formatCategory(t.category);
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [tools]);

  const categories = useMemo(() => ['All', ...Object.keys(categoryMap).sort()], [categoryMap]);

  // Filtered data for grid
  const rowData = useMemo(() => {
    if (categoryFilter === 'All') return tools;
    return tools.filter(t => formatCategory(t.category) === categoryFilter);
  }, [tools, categoryFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: tools.length,
    aiEnabled: tools.filter(t => t.hasAiFeatures).length,
    freeForever: tools.filter(t => t.hasFreeForever).length,
    avgPopularity: tools.length > 0
      ? Math.round(tools.reduce((sum, t) => sum + (t.popularityScore ?? 50), 0) / tools.length)
      : 0,
    avgMomentum: tools.length > 0
      ? Math.round(tools.reduce((sum, t) => sum + (t.popularityMomentum ?? 50), 0) / tools.length)
      : 0,
  }), [tools]);

  // Column definitions
  const columnDefs = useMemo<ColDef<AdminToolData>[]>(() => [
    // Checkbox selection column
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      width: 50,
      pinned: 'left' as const,
      lockPosition: true,
      suppressHeaderMenuButton: true,
    },
    // Identity
    {
      headerName: 'Tool',
      field: 'displayName',
      pinned: 'left' as const,
      width: 180,
      filter: 'agTextColumnFilter',
      editable: true,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => {
        const data = params.data;
        if (!data) return params.value;
        if (data.websiteUrl) {
          return <a href={data.websiteUrl} target="_blank" rel="noopener" style={{ color: '#2979FF', textDecoration: 'none', fontWeight: 600 }}>{data.displayName}</a>;
        }
        return <span style={{ fontWeight: 600 }}>{data.displayName}</span>;
      },
    },
    {
      headerName: 'Slug',
      field: 'name',
      width: 140,
      filter: 'agTextColumnFilter',
      hide: true,
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 170,
      filter: 'agTextColumnFilter',
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: CATEGORIES },
      valueFormatter: (params) => params.value ? formatCategory(params.value) : '',
    },
    {
      headerName: 'Aliases',
      field: 'aliases',
      width: 200,
      filter: 'agTextColumnFilter',
      valueGetter: (params: ValueGetterParams<AdminToolData>) =>
        params.data?.aliases?.join(', ') || '',
      tooltipValueGetter: (params) =>
        params.data?.aliases?.join(', ') || '',
    },
    // Capabilities
    {
      headerName: 'Primary Use Cases',
      field: 'primaryUseCases',
      width: 250,
      filter: 'agTextColumnFilter',
      valueGetter: (params: ValueGetterParams<AdminToolData>) =>
        params.data?.primaryUseCases?.join(', ') || '',
      tooltipValueGetter: (params) =>
        params.data?.primaryUseCases?.join(', ') || '',
    },
    {
      headerName: 'Key Features',
      field: 'keyFeatures',
      width: 250,
      filter: 'agTextColumnFilter',
      valueGetter: (params: ValueGetterParams<AdminToolData>) =>
        params.data?.keyFeatures?.join(', ') || '',
      tooltipValueGetter: (params) =>
        params.data?.keyFeatures?.join(', ') || '',
    },
    {
      headerName: 'Complexity',
      field: 'complexity',
      width: 120,
      filter: 'agTextColumnFilter',
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: COMPLEXITIES },
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => {
        const val = params.value as string;
        const color = COMPLEXITY_COLORS[val] || '#9CA3AF';
        return <span style={{ color, fontWeight: 600, fontSize: 11, letterSpacing: '0.05em' }}>{val}</span>;
      },
    },
    // Pricing
    {
      headerName: 'Pricing Tier',
      field: 'typicalPricingTier',
      width: 140,
      filter: 'agTextColumnFilter',
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: PRICING_TIERS },
    },
    {
      headerName: '$/User/Mo',
      field: 'estimatedCostPerUser',
      width: 140,
      filter: 'agNumberColumnFilter',
      editable: true,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (params) =>
        params.value != null ? `$${Number(params.value).toFixed(2)}` : '\u2014',
    },
    {
      headerName: 'Free Forever',
      field: 'hasFreeForever',
      width: 110,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => (
        <BooleanCellRenderer {...params} onToggle={handleBooleanToggle} context={{ onToggle: handleBooleanToggle }} />
      ),
    },
    // Fit Criteria
    {
      headerName: 'Team Size',
      field: 'bestForTeamSize',
      width: 180,
      filter: 'agTextColumnFilter',
      valueGetter: (params: ValueGetterParams<AdminToolData>) =>
        params.data?.bestForTeamSize?.join(', ') || '',
    },
    {
      headerName: 'Stage',
      field: 'bestForStage',
      width: 200,
      filter: 'agTextColumnFilter',
      valueGetter: (params: ValueGetterParams<AdminToolData>) =>
        params.data?.bestForStage?.join(', ') || '',
    },
    {
      headerName: 'Tech Level',
      field: 'bestForTechSavviness',
      width: 160,
      filter: 'agTextColumnFilter',
      valueGetter: (params: ValueGetterParams<AdminToolData>) =>
        params.data?.bestForTechSavviness?.join(', ') || '',
    },
    // Compliance
    {
      headerName: 'SOC2',
      field: 'soc2',
      width: 80,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => (
        <BooleanCellRenderer {...params} onToggle={handleBooleanToggle} context={{ onToggle: handleBooleanToggle }} />
      ),
    },
    {
      headerName: 'HIPAA',
      field: 'hipaa',
      width: 80,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => (
        <BooleanCellRenderer {...params} onToggle={handleBooleanToggle} context={{ onToggle: handleBooleanToggle }} />
      ),
    },
    {
      headerName: 'GDPR',
      field: 'gdpr',
      width: 80,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => (
        <BooleanCellRenderer {...params} onToggle={handleBooleanToggle} context={{ onToggle: handleBooleanToggle }} />
      ),
    },
    {
      headerName: 'EU Data',
      field: 'euDataResidency',
      width: 110,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => (
        <BooleanCellRenderer {...params} onToggle={handleBooleanToggle} context={{ onToggle: handleBooleanToggle }} />
      ),
    },
    {
      headerName: 'Self-Hosted',
      field: 'selfHosted',
      width: 100,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => (
        <BooleanCellRenderer {...params} onToggle={handleBooleanToggle} context={{ onToggle: handleBooleanToggle }} />
      ),
    },
    {
      headerName: 'Air-Gap',
      field: 'airGapped',
      width: 100,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => (
        <BooleanCellRenderer {...params} onToggle={handleBooleanToggle} context={{ onToggle: handleBooleanToggle }} />
      ),
    },
    // AI
    {
      headerName: 'AI',
      field: 'hasAiFeatures',
      width: 100,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => (
        <BooleanCellRenderer {...params} onToggle={handleBooleanToggle} context={{ onToggle: handleBooleanToggle }} />
      ),
    },
    {
      headerName: 'AI Description',
      field: 'aiFeatureDescription',
      width: 250,
      filter: 'agTextColumnFilter',
      editable: true,
      valueFormatter: (params) => params.value || '\u2014',
    },
    // Popularity (column group with composite + 5 editable sub-scores)
    {
      headerName: 'Popularity',
      children: [
        {
          headerName: 'Composite',
          field: 'popularityScore',
          width: 100,
          filter: 'agNumberColumnFilter',
          editable: false,
          cellRenderer: (params: ICellRendererParams<AdminToolData>) => {
            const val = (params.value as number) ?? 50;
            const pct = Math.min(100, Math.max(0, val));
            const barColor = pct >= 70 ? '#22C55E' : pct >= 40 ? '#F59E0B' : '#EF4444';
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: '100%' }}>
                <div style={{ flex: 1, height: 6, background: '#1F2937', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: barColor }} />
                </div>
                <span style={{ fontSize: 11, minWidth: 24, textAlign: 'right' }}>{val}</span>
              </div>
            );
          },
        },
        {
          headerName: 'Adopt.',
          field: 'popularityAdoption',
          width: 85,
          filter: 'agNumberColumnFilter',
          editable: true,
          cellEditor: 'agNumberCellEditor',
          cellEditorParams: { min: 0, max: 100, step: 1 },
          cellRenderer: SubScoreRenderer,
        },
        {
          headerName: 'Senti.',
          field: 'popularitySentiment',
          width: 85,
          filter: 'agNumberColumnFilter',
          editable: true,
          cellEditor: 'agNumberCellEditor',
          cellEditorParams: { min: 0, max: 100, step: 1 },
          cellRenderer: SubScoreRenderer,
        },
        {
          headerName: 'Momen.',
          field: 'popularityMomentum',
          width: 85,
          filter: 'agNumberColumnFilter',
          editable: true,
          cellEditor: 'agNumberCellEditor',
          cellEditorParams: { min: 0, max: 100, step: 1 },
          cellRenderer: SubScoreRenderer,
        },
        {
          headerName: 'Ecosy.',
          field: 'popularityEcosystem',
          width: 85,
          filter: 'agNumberColumnFilter',
          editable: true,
          cellEditor: 'agNumberCellEditor',
          cellEditorParams: { min: 0, max: 100, step: 1 },
          cellRenderer: SubScoreRenderer,
        },
        {
          headerName: 'Relia.',
          field: 'popularityReliability',
          width: 85,
          filter: 'agNumberColumnFilter',
          editable: true,
          cellEditor: 'agNumberCellEditor',
          cellEditorParams: { min: 0, max: 100, step: 1 },
          cellRenderer: SubScoreRenderer,
        },
      ],
    } as any,
    {
      headerName: 'Website',
      field: 'websiteUrl',
      width: 180,
      filter: 'agTextColumnFilter',
      editable: true,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => {
        const url = params.value as string | null;
        if (!url) return '\u2014';
        try {
          const domain = new URL(url).hostname.replace('www.', '');
          return <a href={url} target="_blank" rel="noopener" style={{ color: '#2979FF', textDecoration: 'none' }}>{domain}</a>;
        } catch {
          return url;
        }
      },
    },
    {
      headerName: 'Founded',
      field: 'foundedYear',
      width: 100,
      filter: 'agNumberColumnFilter',
      editable: true,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: (params) => params.value != null ? String(params.value) : '\u2014',
    },
    {
      headerName: 'Funding',
      field: 'fundingStage',
      width: 130,
      filter: 'agTextColumnFilter',
      editable: true,
      valueFormatter: (params) => params.value || '\u2014',
    },
    {
      headerName: 'Verified',
      field: 'lastVerified',
      width: 140,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return '\u2014';
        try {
          return new Date(params.value).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
          });
        } catch {
          return String(params.value);
        }
      },
    },
    // Actions column
    {
      headerName: 'Actions',
      field: 'id',
      width: 120,
      pinned: 'right' as const,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => {
        const data = params.data;
        if (!data) return null;
        const isEnriching = enrichingToolId === data.id;
        const canEnrich = data.websiteUrl && !isEnriching;

        return (
          <div style={{ display: 'flex', gap: 8, height: '100%', alignItems: 'center' }}>
            <button
              onClick={() => {
                setPanelData(data);
                setPanelMode('edit');
              }}
              style={{
                padding: '4px 8px',
                background: 'transparent',
                border: '1px solid #374151',
                color: '#9CA3AF',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
            <button
              onClick={() => canEnrich && handleEnrich(data.id)}
              disabled={!canEnrich}
              title={!data.websiteUrl ? 'No website URL' : isEnriching ? 'Enriching...' : 'AI Enrich'}
              style={{
                padding: '4px 8px',
                background: canEnrich ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                border: `1px solid ${canEnrich ? '#A855F7' : '#374151'}`,
                color: canEnrich ? '#A855F7' : '#4B5563',
                fontSize: 11,
                cursor: canEnrich ? 'pointer' : 'not-allowed',
              }}
            >
              {isEnriching ? '...' : 'AI'}
            </button>
          </div>
        );
      },
    },
  ], [handleBooleanToggle, enrichingToolId, handleEnrich]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    suppressHeaderMenuButton: false,
  }), []);

  const onSelectionChanged = useCallback(() => {
    const selected = gridRef.current?.api.getSelectedRows() || [];
    setSelectedRows(selected);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0B0B0B' }}>
        <div className="flex space-x-2 mb-8 animate-pulse">
          <div className="w-4 h-4 bg-[#E53935]"></div>
          <div className="w-4 h-4 bg-white"></div>
          <div className="w-4 h-4 bg-[#2979FF]"></div>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tighter">Loading Tool Database.</h2>
        <p className="mt-4 text-sm font-mono text-gray-500 uppercase tracking-widest">Querying 250 records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0B0B0B' }}>
        <div style={{ maxWidth: 400, width: '100%', border: '1px solid #E53935', padding: 32, background: '#1A0000' }}>
          <div style={{ color: '#E53935', fontSize: 32, fontWeight: 700, marginBottom: 16 }}>&times;</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Database Error
          </h3>
          <p style={{ color: '#9CA3AF', marginBottom: 24 }}>{error}</p>
          <button
            onClick={onBack}
            style={{
              width: '100%', padding: '12px 0', background: '#E53935', color: '#fff',
              fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
              border: 'none', cursor: 'pointer',
            }}
          >
            Return to Clinic
          </button>
        </div>
      </div>
    );
  }

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
                Tool Database.
              </h1>
              <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                Staff Access // Admin Console
              </p>
            </div>
            {onClusterFuck && (
              <button
                onClick={onClusterFuck}
                style={{
                  padding: '6px 14px', background: '#111827', border: '1px solid #374151',
                  color: '#A855F7', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                  letterSpacing: '0.05em', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#A855F7'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; }}
              >
                Cluster Fuck
              </button>
            )}
          </div>
          <div style={{ position: 'relative', maxWidth: 320, flex: 1 }}>
            <input
              type="text"
              placeholder="Search tools..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 32px', background: '#111111',
                border: '1px solid #1F2937', color: '#fff', fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace", outline: 'none',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#2979FF'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#1F2937'; }}
            />
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#4B5563', fontSize: 14 }}>
              &#x2315;
            </span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: 24, padding: '12px 24px', borderBottom: '1px solid #1F2937' }}>
        <StatBadge label="Total Tools" value={stats.total} color="#fff" />
        <StatBadge label="AI-Enabled" value={stats.aiEnabled} color="#2979FF" />
        <StatBadge label="Free Forever" value={stats.freeForever} color="#22C55E" />
        <StatBadge label="Avg Popularity" value={stats.avgPopularity} color="#F59E0B" />
        <StatBadge label="Avg Momentum" value={stats.avgMomentum} color="#A855F7" />
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, padding: '12px 24px', borderBottom: '1px solid #1F2937', alignItems: 'center' }}>
        <button
          onClick={() => {
            setPanelData(null);
            setPanelMode('add');
          }}
          style={{
            padding: '8px 16px',
            background: '#2979FF',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add Tool
        </button>

        {selectedRows.length > 0 && (
          <button
            onClick={() => {
              setDeleteTargets(selectedRows);
              setDeleteModalOpen(true);
            }}
            style={{
              padding: '8px 16px',
              background: 'rgba(229, 57, 53, 0.15)',
              border: '1px solid #E53935',
              color: '#E53935',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Delete ({selectedRows.length})
          </button>
        )}

        {selectedRows.length === 1 && selectedRows[0].websiteUrl && (
          <button
            onClick={() => handleEnrich(selectedRows[0].id)}
            disabled={enrichingToolId === selectedRows[0].id}
            style={{
              padding: '8px 16px',
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid #A855F7',
              color: '#A855F7',
              fontSize: 12,
              fontWeight: 600,
              cursor: enrichingToolId === selectedRows[0].id ? 'not-allowed' : 'pointer',
              opacity: enrichingToolId === selectedRows[0].id ? 0.6 : 1,
            }}
          >
            {enrichingToolId === selectedRows[0].id ? 'Enriching...' : 'AI Refresh'}
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#4B5563' }}>
          {selectedRows.length > 0 ? `${selectedRows.length} selected` : 'Select rows for bulk actions'}
        </span>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 24px', flexWrap: 'wrap', borderBottom: '1px solid #1F2937' }}>
        {categories.map(cat => {
          const isActive = categoryFilter === cat;
          const count = cat === 'All' ? tools.length : (categoryMap[cat] || 0);
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '4px 12px', fontSize: 11, fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase',
                letterSpacing: '0.05em', border: '1px solid',
                borderColor: isActive ? '#E53935' : '#1F2937',
                background: isActive ? 'rgba(229, 57, 53, 0.15)' : 'transparent',
                color: isActive ? '#E53935' : '#9CA3AF',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.color = '#fff'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.borderColor = '#1F2937'; e.currentTarget.style.color = '#9CA3AF'; } }}
            >
              {cat} <span style={{ opacity: 0.5 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {/* AG Grid */}
      <div className="ag-theme-quartz-dark" style={{ flex: 1, padding: '0 24px 24px 24px', minHeight: 500 }}>
        <div style={{ height: 'calc(100vh - 320px)', width: '100%' }}>
          <AgGridReact<AdminToolData>
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={searchText}
            pagination={true}
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100, 250]}
            animateRows={true}
            enableCellTextSelection={true}
            tooltipShowDelay={300}
            rowHeight={36}
            headerHeight={40}
            floatingFiltersHeight={34}
            undoRedoCellEditing={true}
            undoRedoCellEditingLimit={20}
            onCellValueChanged={onCellValueChanged}
            rowSelection="multiple"
            onSelectionChanged={onSelectionChanged}
            context={{ onToggle: handleBooleanToggle }}
          />
        </div>
      </div>

      {/* Slide-out panel */}
      {panelMode !== 'closed' && (
        <ToolPanel
          mode={panelMode}
          data={panelData}
          onClose={() => {
            setPanelMode('closed');
            setPanelData(null);
          }}
          onSave={handlePanelSave}
          saving={panelSaving}
        />
      )}

      {/* Delete modal */}
      {deleteModalOpen && (
        <DeleteModal
          tools={deleteTargets}
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setDeleteModalOpen(false);
            setDeleteTargets([]);
          }}
          deleting={deleting}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          padding: '10px 20px', borderRadius: 4,
          background: toast.type === 'success' ? '#065F46' : toast.type === 'error' ? '#7F1D1D' : '#1F2937',
          border: `1px solid ${toast.type === 'success' ? '#22C55E' : toast.type === 'error' ? '#EF4444' : '#4B5563'}`,
          color: '#fff', fontSize: 13, fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.05em',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
