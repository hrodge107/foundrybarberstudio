import React from 'react';

interface AppointmentConflict {
  id: number;
  appointment_date: string;
  status: string;
  customer_name?: string;
}

interface BarberConflictModalProps {
  isOpen: boolean;
  barberName: string;
  conflicts: AppointmentConflict[];
  onClose: () => void;
}

export const BarberConflictModal: React.FC<BarberConflictModalProps> = ({
  isOpen,
  barberName,
  conflicts,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-card"
        style={{
          maxWidth: '480px',
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
            borderBottom: '1px solid #fee2e2',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#fef2f2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#991b1b', margin: 0 }}>Cannot Delete Barber</h3>
              <span style={{ fontSize: '0.8rem', color: '#7f1d1d' }}>Active schedule dependencies found</span>
            </div>
          </div>
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
          <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.5', margin: 0 }}>
            <strong>{barberName}</strong> has scheduled active appointments in the system. Barber profiles with pending or confirmed client bookings cannot be deleted until appointments are completed or cancelled.
          </p>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', maxHeight: '200px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Conflicting Bookings ({conflicts.length})
              </span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {conflicts.map((apt) => {
                const dateStr = new Date(apt.appointment_date).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <li
                    key={apt.id}
                    style={{
                      fontSize: '0.85rem',
                      color: '#1e293b',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>Appt #{100000 + apt.id}</span>
                      <span style={{ color: '#64748b', marginLeft: '6px' }}>• {apt.customer_name || 'Customer'}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: apt.status === 'Confirmed' ? '#2563eb' : '#d97706',
                        fontWeight: 600,
                        background: apt.status === 'Confirmed' ? '#eff6ff' : '#fffbe5',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: `1px solid ${apt.status === 'Confirmed' ? '#bfdbfe' : '#fef08a'}`,
                      }}
                    >
                      {dateStr} ({apt.status})
                    </span>
                  </li>
                );
              })}
            </ul>
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
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
          }}
        >
          <button
            type="button"
            className="btn-primary"
            style={{ background: '#475569', borderColor: '#475569', padding: '8px 20px', borderRadius: '6px', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
            onClick={onClose}
          >
            Understood & Close
          </button>
        </div>
      </div>
    </div>
  );
};
