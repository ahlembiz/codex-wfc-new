import React, { useState, useEffect } from 'react';
import type { AdminToolData, CreateToolInput, UpdateToolInput } from '../../types';
import {
  VALID_TOOL_CATEGORIES as CATEGORIES,
  VALID_COMPLEXITIES as COMPLEXITIES,
  VALID_PRICING_TIERS as PRICING_TIERS,
  VALID_TOOL_TEAM_SIZES as TEAM_SIZES,
  VALID_TOOL_STAGES as STAGES,
  VALID_TOOL_TECH_SAVVINESS as TECH_SAVVINESS,
} from '../../lib/constants';
import TagInput from './TagInput';
import MultiSelectPills from './MultiSelectPills';
import CollapsibleSection from './CollapsibleSection';
import { formatCategory } from './renderers';

export interface ToolPanelProps {
  mode: 'add' | 'edit';
  data: Partial<AdminToolData> | null;
  onClose: () => void;
  onSave: (data: CreateToolInput | UpdateToolInput) => Promise<void>;
  saving: boolean;
}

const ToolPanel: React.FC<ToolPanelProps> = ({ mode, data, onClose, onSave, saving }) => {
  const [formData, setFormData] = useState<Partial<AdminToolData>>({
    name: '',
    displayName: '',
    category: 'OTHER',
    aliases: [],
    primaryUseCases: [],
    keyFeatures: [],
    complexity: 'MODERATE',
    typicalPricingTier: 'FREEMIUM',
    estimatedCostPerUser: null,
    hasFreeForever: false,
    bestForTeamSize: [],
    bestForStage: [],
    bestForTechSavviness: [],
    soc2: false,
    hipaa: false,
    gdpr: false,
    euDataResidency: false,
    selfHosted: false,
    airGapped: false,
    hasAiFeatures: false,
    aiFeatureDescription: null,
    websiteUrl: null,
    fundingStage: null,
    foundedYear: null,
  });

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: CreateToolInput | UpdateToolInput = {
      ...formData,
      name: formData.name || '',
      displayName: formData.displayName || '',
      category: formData.category || 'OTHER',
    };
    await onSave(submitData);
  };

  const updateField = <K extends keyof AdminToolData>(field: K, value: AdminToolData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 100,
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          background: '#0B0B0B',
          borderLeft: '1px solid #1F2937',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: 16,
          borderBottom: '1px solid #1F2937',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            {mode === 'add' ? 'Add New Tool' : `Edit: ${data?.displayName || ''}`}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              fontSize: 24,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <CollapsibleSection title="Identity">
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Slug (lowercase)
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => updateField('name', e.target.value.toLowerCase())}
                disabled={mode === 'edit'}
                required={mode === 'add'}
                style={{
                  width: '100%',
                  padding: 8,
                  background: mode === 'edit' ? '#1F2937' : '#111111',
                  border: '1px solid #374151',
                  color: mode === 'edit' ? '#6B7280' : '#fff',
                  fontSize: 13,
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Display Name
              </label>
              <input
                type="text"
                value={formData.displayName || ''}
                onChange={e => updateField('displayName', e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: 8,
                  background: '#111111',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: 13,
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Category
              </label>
              <select
                value={formData.category || 'OTHER'}
                onChange={e => updateField('category', e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  background: '#111111',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: 13,
                }}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{formatCategory(c)}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Aliases
              </label>
              <TagInput
                value={formData.aliases || []}
                onChange={v => updateField('aliases', v)}
                placeholder="Add alias..."
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Capabilities">
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Primary Use Cases
              </label>
              <TagInput
                value={formData.primaryUseCases || []}
                onChange={v => updateField('primaryUseCases', v)}
                placeholder="Add use case..."
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Key Features
              </label>
              <TagInput
                value={formData.keyFeatures || []}
                onChange={v => updateField('keyFeatures', v)}
                placeholder="Add feature..."
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Complexity
              </label>
              <select
                value={formData.complexity || 'MODERATE'}
                onChange={e => updateField('complexity', e.target.value as AdminToolData['complexity'])}
                style={{
                  width: '100%',
                  padding: 8,
                  background: '#111111',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: 13,
                }}
              >
                {COMPLEXITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Pricing">
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Pricing Tier
              </label>
              <select
                value={formData.typicalPricingTier || 'FREEMIUM'}
                onChange={e => updateField('typicalPricingTier', e.target.value as AdminToolData['typicalPricingTier'])}
                style={{
                  width: '100%',
                  padding: 8,
                  background: '#111111',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: 13,
                }}
              >
                {PRICING_TIERS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                $/User/Month
              </label>
              <input
                type="number"
                value={formData.estimatedCostPerUser ?? ''}
                onChange={e => updateField('estimatedCostPerUser', e.target.value ? Number(e.target.value) : null)}
                min={0}
                step={0.01}
                style={{
                  width: '100%',
                  padding: 8,
                  background: '#111111',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: 13,
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.hasFreeForever || false}
                  onChange={e => updateField('hasFreeForever', e.target.checked)}
                />
                <span style={{ fontSize: 12, color: '#fff' }}>Free Forever Plan</span>
              </label>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Fit Criteria">
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Best For Team Size
              </label>
              <MultiSelectPills
                options={TEAM_SIZES}
                value={formData.bestForTeamSize || []}
                onChange={v => updateField('bestForTeamSize', v)}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Best For Stage
              </label>
              <MultiSelectPills
                options={STAGES}
                value={formData.bestForStage || []}
                onChange={v => updateField('bestForStage', v)}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Best For Tech Savviness
              </label>
              <MultiSelectPills
                options={TECH_SAVVINESS}
                value={formData.bestForTechSavviness || []}
                onChange={v => updateField('bestForTechSavviness', v)}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Compliance">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { field: 'soc2' as const, label: 'SOC 2' },
                { field: 'hipaa' as const, label: 'HIPAA' },
                { field: 'gdpr' as const, label: 'GDPR' },
                { field: 'euDataResidency' as const, label: 'EU Data Residency' },
                { field: 'selfHosted' as const, label: 'Self-Hosted' },
                { field: 'airGapped' as const, label: 'Air-Gapped' },
              ].map(({ field, label }) => (
                <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData[field] || false}
                    onChange={e => updateField(field, e.target.checked)}
                  />
                  <span style={{ fontSize: 12, color: '#fff' }}>{label}</span>
                </label>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="AI Features">
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.hasAiFeatures || false}
                  onChange={e => updateField('hasAiFeatures', e.target.checked)}
                />
                <span style={{ fontSize: 12, color: '#fff' }}>Has AI Features</span>
              </label>
            </div>
            {formData.hasAiFeatures && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                  AI Feature Description
                </label>
                <textarea
                  value={formData.aiFeatureDescription || ''}
                  onChange={e => updateField('aiFeatureDescription', e.target.value || null)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: 8,
                    background: '#111111',
                    border: '1px solid #374151',
                    color: '#fff',
                    fontSize: 13,
                    resize: 'vertical',
                  }}
                />
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Meta / URLs">
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Website URL
              </label>
              <input
                type="url"
                value={formData.websiteUrl || ''}
                onChange={e => updateField('websiteUrl', e.target.value || null)}
                style={{
                  width: '100%',
                  padding: 8,
                  background: '#111111',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: 13,
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Funding Stage
              </label>
              <input
                type="text"
                value={formData.fundingStage || ''}
                onChange={e => updateField('fundingStage', e.target.value || null)}
                placeholder="e.g., Series A"
                style={{
                  width: '100%',
                  padding: 8,
                  background: '#111111',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: 13,
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase' }}>
                Founded Year
              </label>
              <input
                type="number"
                value={formData.foundedYear ?? ''}
                onChange={e => updateField('foundedYear', e.target.value ? Number(e.target.value) : null)}
                min={1900}
                max={new Date().getFullYear() + 1}
                style={{
                  width: '100%',
                  padding: 8,
                  background: '#111111',
                  border: '1px solid #374151',
                  color: '#fff',
                  fontSize: 13,
                }}
              />
            </div>
          </CollapsibleSection>
        </form>

        {/* Footer */}
        <div style={{
          padding: 16,
          borderTop: '1px solid #1F2937',
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid #374151',
              color: '#9CA3AF',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            onClick={handleSubmit}
            style={{
              padding: '10px 20px',
              background: '#2979FF',
              border: 'none',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : mode === 'add' ? 'Create Tool' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  );
};

export default ToolPanel;
