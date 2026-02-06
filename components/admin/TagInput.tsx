import React, { useState } from 'react';

export interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({ value, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div style={{ border: '1px solid #374151', background: '#111111', padding: 8, minHeight: 40 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: value.length > 0 ? 8 : 0 }}>
        {value.map((tag, i) => (
          <span
            key={i}
            style={{
              background: '#1F2937',
              border: '1px solid #374151',
              padding: '2px 8px',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {tag}
            <button
              onClick={() => removeTag(i)}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Type and press Enter'}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: 12,
          outline: 'none',
        }}
      />
    </div>
  );
};

export default TagInput;
