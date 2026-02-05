import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, type ColDef, type ValueGetterParams, type ICellRendererParams, type CellValueChangedEvent } from 'ag-grid-community';
import type { AdminToolData } from '../types';
import { getAllToolsAdmin, updateToolPopularity } from '../services/recommendationService';

// Register all community modules (required for AG Grid v32+)
ModuleRegistry.registerModules([AllCommunityModule]);

interface AdminDashboardProps {
  onBack: () => void;
}

const COMPLEXITY_COLORS: Record<string, string> = {
  SIMPLE: '#22C55E',
  MODERATE: '#F59E0B',
  ADVANCED: '#EF4444',
  EXPERT: '#A855F7',
};

const formatCategory = (cat: string) =>
  cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const subScoreColor = (val: number) =>
  val >= 70 ? '#22C55E' : val >= 40 ? '#F59E0B' : '#EF4444';

const SubScoreRenderer: React.FC<ICellRendererParams<AdminToolData>> = (params) => {
  const val = (params.value as number) ?? 50;
  return (
    <span style={{ color: subScoreColor(val), fontWeight: 600, fontSize: 12 }}>{val}</span>
  );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
  const [tools, setTools] = useState<AdminToolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [toast, setToast] = useState<{ message: string; type: 'saving' | 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

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

  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent<AdminToolData>) => {
    const field = event.colDef.field;
    if (!field || !SUB_SCORE_FIELDS.includes(field) || !event.data) return;

    const toolId = event.data.id;
    const newValue = event.newValue;

    showToast('Saving...', 'saving');

    try {
      const updated = await updateToolPopularity(toolId, { [field]: newValue });
      // Update local state with server response
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
      // Revert cell value
      event.api.undoCellEditing();
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
    // Identity
    {
      headerName: 'Tool',
      field: 'displayName',
      pinned: 'left' as const,
      width: 180,
      filter: 'agTextColumnFilter',
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
    },
    {
      headerName: '$/User/Mo',
      field: 'estimatedCostPerUser',
      width: 140,
      filter: 'agNumberColumnFilter',
      valueFormatter: (params) =>
        params.value != null ? `$${Number(params.value).toFixed(2)}` : '\u2014',
    },
    {
      headerName: 'Free Forever',
      field: 'hasFreeForever',
      width: 110,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => {
        const val = params.value as boolean;
        return <span style={{ color: val ? '#22C55E' : '#4B5563', fontWeight: val ? 600 : 400 }}>{val ? '\u2713' : '\u2014'}</span>;
      },
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
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => {
        const val = params.value as boolean;
        return <span style={{ color: val ? '#22C55E' : '#4B5563' }}>{val ? '\u2713' : '\u2014'}</span>;
      },
    },
    {
      headerName: 'HIPAA',
      field: 'hipaa',
      width: 80,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => {
        const val = params.value as boolean;
        return <span style={{ color: val ? '#22C55E' : '#4B5563' }}>{val ? '\u2713' : '\u2014'}</span>;
      },
    },
    {
      headerName: 'GDPR',
      field: 'gdpr',
      width: 80,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => {
        const val = params.value as boolean;
        return <span style={{ color: val ? '#22C55E' : '#4B5563' }}>{val ? '\u2713' : '\u2014'}</span>;
      },
    },
    {
      headerName: 'EU Data',
      field: 'euDataResidency',
      width: 110,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => {
        const val = params.value as boolean;
        return <span style={{ color: val ? '#22C55E' : '#4B5563' }}>{val ? '\u2713' : '\u2014'}</span>;
      },
    },
    {
      headerName: 'Self-Hosted',
      field: 'selfHosted',
      width: 100,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => {
        const val = params.value as boolean;
        return <span style={{ color: val ? '#22C55E' : '#4B5563' }}>{val ? '\u2713' : '\u2014'}</span>;
      },
    },
    {
      headerName: 'Air-Gap',
      field: 'airGapped',
      width: 100,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => {
        const val = params.value as boolean;
        return <span style={{ color: val ? '#22C55E' : '#4B5563' }}>{val ? '\u2713' : '\u2014'}</span>;
      },
    },
    // AI
    {
      headerName: 'AI',
      field: 'hasAiFeatures',
      width: 100,
      cellRenderer: (params: ICellRendererParams<AdminToolData>) => {
        const val = params.value as boolean;
        return <span style={{ color: val ? '#2979FF' : '#4B5563', fontWeight: val ? 600 : 400 }}>{val ? '\u2713' : '\u2014'}</span>;
      },
    },
    {
      headerName: 'AI Description',
      field: 'aiFeatureDescription',
      width: 250,
      filter: 'agTextColumnFilter',
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
      valueFormatter: (params) => params.value != null ? String(params.value) : '\u2014',
    },
    {
      headerName: 'Funding',
      field: 'fundingStage',
      width: 130,
      filter: 'agTextColumnFilter',
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
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    floatingFilter: true,
    suppressHeaderMenuButton: false,
  }), []);

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
        <div style={{ height: 'calc(100vh - 260px)', width: '100%' }}>
          <AgGridReact<AdminToolData>
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
          />
        </div>
      </div>

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

// Stats Badge sub-component
const StatBadge: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
    <span style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</span>
    <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {label}
    </span>
  </div>
);

export default AdminDashboard;
