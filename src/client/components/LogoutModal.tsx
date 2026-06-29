import React from 'react';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" style={{ zIndex: 1100 }}>
      <div className="modal-content animate-scale-up" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <div className="modal-header" style={{ justifyContent: 'center', position: 'relative' }}>
          <h3 className="modal-title">Confirm Logout</h3>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            style={{ position: 'absolute', right: '15px' }}
          >
            &times;
          </button>
        </div>
        <div className="modal-body" style={{ padding: '24px 16px' }}>
          <i className="bi bi-box-arrow-right" style={{ fontSize: '2.5rem', color: '#d97706', marginBottom: '12px', display: 'block' }}></i>
          <p style={{ color: '#e0e0e0', fontSize: '0.95rem', margin: 0 }}>
            Are you sure you want to log out of your account?
          </p>
        </div>
        <div className="modal-footer" style={{ justifyContent: 'center', gap: '12px' }}>
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-modal-submit"
            onClick={onConfirm}
            style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
