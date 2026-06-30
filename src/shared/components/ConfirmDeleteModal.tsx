import React from 'react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
  isDeleting = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-card"
        style={{
          maxWidth: '440px',
          borderRadius: '12px',
          background: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="admin-modal-header"
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>

        <div className="admin-modal-body" style={{ padding: '24px' }}>
          <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>
            {message}
          </p>
        </div>

        <div
          className="admin-modal-actions"
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
          }}
        >
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{
              background: confirmVariant === 'primary' ? '#0f172a' : '#ef4444',
              borderColor: confirmVariant === 'primary' ? '#0f172a' : '#ef4444',
              padding: '8px 18px',
              borderRadius: '6px',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: confirmVariant === 'primary' ? '0 2px 4px rgba(15, 23, 42, 0.2)' : '0 2px 4px rgba(239, 68, 68, 0.2)',
            }}
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
