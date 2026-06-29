import React from 'react';

interface CustomerConsentModalProps {
  isOpen: boolean;
  actionType: 'edit' | 'delete';
  customerName: string;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const CustomerConsentModal: React.FC<CustomerConsentModalProps> = ({
  isOpen,
  actionType,
  customerName,
  isSubmitting = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const isDelete = actionType === 'delete';
  const title = isDelete ? 'Confirm Customer Deletion' : 'Confirm Customer Info Update';
  const confirmLabel = isDelete ? 'Yes, Delete Customer' : 'Confirm & Save Changes';

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-card"
        style={{
          maxWidth: '460px',
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
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: isDelete ? '#ef4444' : '#1e293b', margin: 0 }}>
            {title}
          </h3>
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

        <div className="admin-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.92rem', color: '#334155', lineHeight: '1.6', margin: 0 }}>
            You are about to {isDelete ? 'permanently remove' : 'update records for'}{' '}
            <strong style={{ color: '#0f172a' }}>{customerName}</strong>.
          </p>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ marginTop: '2px', flexShrink: 0 }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, lineHeight: '1.5', fontWeight: 500 }}>
              <strong>Admin Consent Requirement:</strong> By proceeding, you confirm that you have informed or obtained explicit consent from the customer regarding these account changes.
            </p>
          </div>
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
            disabled={isSubmitting}
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
              background: isDelete ? '#ef4444' : '#0f172a',
              borderColor: isDelete ? '#ef4444' : '#0f172a',
              padding: '8px 18px',
              borderRadius: '6px',
              color: '#ffffff',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.7 : 1,
            }}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
