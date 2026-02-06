import React from 'react';

export interface MultiSelectPillsProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}

const MultiSelectPills: React.FC<MultiSelectPillsProps> = ({ options, value, onChange }) => {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => {
        const isSelected = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            style={{
              padding: '4px 10px',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              border: '1px solid',
              borderColor: isSelected ? '#2979FF' : '#374151',
              background: isSelected ? 'rgba(41, 121, 255, 0.15)' : 'transparent',
              color: isSelected ? '#2979FF' : '#9CA3AF',
              cursor: 'pointer',
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
};

export default MultiSelectPills;
