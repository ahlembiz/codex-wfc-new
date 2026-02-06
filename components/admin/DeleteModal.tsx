import React from 'react';
import type { AdminToolData } from '../../types';

export interface DeleteModalProps {
  tools: AdminToolData[];
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ tools, onConfirm, onCancel, deleting }) => {
  const displayNames = tools.slice(0, 5).map(t => t.displayName);
  const remaining = tools.length - 5;

  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 100,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#0B0B0B',
          border: '2px solid #E53935',
          padding: 24,
          zIndex: 101,
          maxWidth: 400,
          width: '90%',
        }}
      >
        <div style={{ color: '#E53935', fontSize: 32, marginBottom: 16 }}>&times;</div>
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 12,
        }}>
          Confirm Delete
        </h3>
        <p style={{ color: '#9CA3AF', marginBottom: 8 }}>
          Are you sure you want to delete {tools.length === 1 ? 'this tool' : `these ${tools.length} tools`}?
        </p>
        <ul style={{ color: '#fff', marginBottom: 16, paddingLeft: 20 }}>
          {displayNames.map((name, i) => (
            <li key={i}>{name}</li>
          ))}
          {remaining > 0 && <li>...and {remaining} more</li>}
        </ul>
        <p style={{ color: '#F59E0B', fontSize: 12, marginBottom: 16 }}>
          This will also remove related integrations, redundancies, and bundle references.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={deleting}
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
            onClick={onConfirm}
            disabled={deleting}
            style={{
              padding: '10px 20px',
              background: '#E53935',
              border: 'none',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.6 : 1,
            }}
          >
            {deleting ? 'Deleting...' : 'Delete Forever'}
          </button>
        </div>
      </div>
    </>
  );
};

export default DeleteModal;
