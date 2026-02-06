import React, { useState } from 'react';

export interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 16 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#1F2937',
          border: 'none',
          padding: '8px 12px',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          cursor: 'pointer',
        }}
      >
        {title}
        <span style={{ fontSize: 14 }}>{isOpen ? '\u25BC' : '\u25B6'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: 12, border: '1px solid #1F2937', borderTop: 'none' }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleSection;
