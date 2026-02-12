import React, { useState, useEffect } from 'react';
import { getBiasAudit } from '../../../services/researchAdminService';
import type { BiasAuditCheck } from '../../../types';

const BiasAuditPanel: React.FC = () => {
  const [checks, setChecks] = useState<BiasAuditCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBiasAudit()
      .then(data => { setChecks(data.checks); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: '#6B7280', padding: 24 }}>Running bias audit...</div>;

  const passCount = checks.filter(c => c.passing).length;
  const totalChecks = checks.length;
  const passRate = totalChecks > 0 ? passCount / totalChecks : 0;

  return (
    <div style={{ padding: 16 }}>
      {/* Summary header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
        padding: '16px 20px', background: '#111827', border: '1px solid #1F2937',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700,
          background: passRate >= 0.8 ? '#065F46' : passRate >= 0.5 ? '#78350F' : '#7F1D1D',
          color: passRate >= 0.8 ? '#22C55E' : passRate >= 0.5 ? '#F59E0B' : '#EF4444',
        }}>
          {passCount}/{totalChecks}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
            Bias Audit {passRate >= 0.8 ? 'Passing' : passRate >= 0.5 ? 'Needs Attention' : 'Failing'}
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', fontFamily: "'JetBrains Mono', monospace" }}>
            {passCount} of {totalChecks} checks passing
          </div>
        </div>
      </div>

      {/* Check list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {checks.map(check => (
          <div key={check.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', background: '#111827', border: '1px solid #1F2937',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
              background: check.passing ? '#065F46' : '#7F1D1D',
              color: check.passing ? '#22C55E' : '#EF4444',
            }}>
              {check.passing ? '\u2713' : '\u2717'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                {check.name}
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                {check.description}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                color: check.passing ? '#22C55E' : '#EF4444',
              }}>
                {typeof check.currentValue === 'number' && check.currentValue < 1
                  ? `${(check.currentValue * 100).toFixed(0)}%`
                  : check.currentValue}
              </div>
              <div style={{ fontSize: 10, color: '#4B5563', fontFamily: "'JetBrains Mono', monospace" }}>
                threshold: {typeof check.threshold === 'number' && check.threshold < 1
                  ? `${(check.threshold * 100).toFixed(0)}%`
                  : check.threshold}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BiasAuditPanel;
