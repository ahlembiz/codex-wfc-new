import React, { useState } from 'react';
import type { ToolClusterData } from '../../../types';

interface DetailModalProps {
  cluster: ToolClusterData;
  onClose: () => void;
  onUpdate: (id: string, data: Record<string, unknown>) => Promise<void>;
}

const confidenceColor = (v: number) => v >= 70 ? '#22C55E' : v >= 50 ? '#F59E0B' : '#EF4444';

const DetailModal: React.FC<DetailModalProps> = ({ cluster, onClose, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [confidence, setConfidence] = useState(cluster.confidence);
  const [status, setStatus] = useState(cluster.status);
  const [notes, setNotes] = useState(cluster.reviewNotes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(cluster.id, { confidence, status, reviewNotes: notes, reviewedBy: 'admin' });
    setSaving(false);
    setEditing(false);
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em',
    fontFamily: "'JetBrains Mono', monospace", marginBottom: 4,
  };
  const valueStyle: React.CSSProperties = { fontSize: 14, color: '#E5E7EB', marginBottom: 12 };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '90%', maxWidth: 640, maxHeight: '85vh', overflow: 'auto',
        background: '#111827', border: '1px solid #1F2937', zIndex: 101, padding: 24,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>{cluster.name}</h2>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              {cluster.synergyType} &middot; Strength {cluster.synergyStrength}/100
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 20, cursor: 'pointer' }}>&times;</button>
        </div>

        <div style={labelStyle}>Description</div>
        <div style={valueStyle}>{cluster.description}</div>

        <div style={labelStyle}>Tools</div>
        <div style={{ ...valueStyle, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {cluster.tools.map(t => (
            <span key={t.id} style={{
              padding: '3px 8px', background: '#1F2937', fontSize: 12, color: '#2979FF',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {t.toolDisplayName}{t.role ? ` (${t.role})` : ''}
            </span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <div>
            <div style={labelStyle}>Confidence</div>
            {editing ? (
              <input type="number" min={0} max={100} value={confidence} onChange={e => setConfidence(Number(e.target.value))}
                style={{ width: '100%', padding: 6, background: '#0B0B0B', border: '1px solid #374151', color: '#fff', marginBottom: 12, fontSize: 14 }} />
            ) : (
              <div style={{ ...valueStyle, color: confidenceColor(cluster.confidence), fontWeight: 700 }}>
                {cluster.confidence}/100
              </div>
            )}
          </div>
          <div>
            <div style={labelStyle}>Status</div>
            {editing ? (
              <select value={status} onChange={e => setStatus(e.target.value)}
                style={{ width: '100%', padding: 6, background: '#0B0B0B', border: '1px solid #374151', color: '#fff', marginBottom: 12, fontSize: 14 }}>
                <option value="pending">pending</option>
                <option value="approved">approved</option>
                <option value="rejected">rejected</option>
                <option value="needs_research">needs_research</option>
              </select>
            ) : (
              <div style={valueStyle}>{cluster.status}</div>
            )}
          </div>
          <div>
            <div style={labelStyle}>Sources</div>
            <div style={valueStyle}>{cluster.sourceCount} ({cluster.sourceTypes.join(', ') || 'none'})</div>
          </div>
          <div>
            <div style={labelStyle}>Segments</div>
            <div style={valueStyle}>
              {[...cluster.bestForTeamSize, ...cluster.bestForStage, ...cluster.bestForTechSavviness].join(', ') || 'All'}
            </div>
          </div>
        </div>

        {cluster.biasFlags.length > 0 && (
          <>
            <div style={labelStyle}>Bias Flags</div>
            <div style={{ ...valueStyle, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {cluster.biasFlags.map(f => (
                <span key={f} style={{ padding: '2px 8px', background: '#78350F', color: '#F59E0B', fontSize: 11 }}>{f}</span>
              ))}
            </div>
          </>
        )}

        {editing && (
          <>
            <div style={labelStyle}>Review Notes</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              style={{ width: '100%', padding: 8, background: '#0B0B0B', border: '1px solid #374151', color: '#fff', marginBottom: 12, fontSize: 13, resize: 'vertical' }} />
          </>
        )}

        {cluster.reviewedBy && (
          <>
            <div style={labelStyle}>Last Reviewed</div>
            <div style={valueStyle}>
              {cluster.reviewedBy} on {cluster.reviewedAt ? new Date(cluster.reviewedAt).toLocaleDateString() : 'N/A'}
              {cluster.reviewNotes && <div style={{ color: '#9CA3AF', marginTop: 4, fontSize: 12 }}>{cluster.reviewNotes}</div>}
            </div>
          </>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #374151', color: '#9CA3AF', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '8px 16px', background: '#2979FF', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} style={{ padding: '8px 16px', background: '#1F2937', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                Edit
              </button>
              <button onClick={() => onUpdate(cluster.id, { status: 'approved', reviewedBy: 'admin' }).then(onClose)}
                style={{ padding: '8px 16px', background: '#065F46', border: 'none', color: '#22C55E', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                Approve
              </button>
              <button onClick={() => onUpdate(cluster.id, { status: 'rejected', reviewedBy: 'admin' }).then(onClose)}
                style={{ padding: '8px 16px', background: '#7F1D1D', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default DetailModal;
