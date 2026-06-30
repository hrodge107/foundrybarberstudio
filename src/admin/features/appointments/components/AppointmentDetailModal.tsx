import React, { useState, useEffect } from 'react';
import { logActivity } from '../../../../shared/services/activityLogger';
import { updateAppointmentStatus, deleteAppointment } from '../../../services/appointments';
import { ConfirmDeleteModal } from '../../../../shared/components/ConfirmDeleteModal';
import type { SystemUser } from '../../../../shared/types/user';
import type { FullAppointment } from '../../../../shared/types/appointment';

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedAppt?: { id: number; status: string }) => void;
  onDeleted?: (appointmentId: number) => void;
  appointment: FullAppointment | null;
  systemUser?: SystemUser | null;
}

interface ConfirmState {
  type: 'status' | 'delete';
  targetStatus?: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: 'danger' | 'primary';
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
  appointment,
  systemUser,
}) => {
  const isBarber = systemUser?.role === 'barber';
  const [currentStatus, setCurrentStatus] = useState<'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'>('Pending');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  useEffect(() => {
    if (appointment) {
      setCurrentStatus(appointment.status);
      setErrorMsg(null);
    }
  }, [appointment]);

  if (!isOpen || !appointment) return null;

  const referenceCode = `FBS-${100000 + appointment.id}`;
  const formattedDate = new Date(appointment.appointment_date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const requestStatusChange = (newStatus: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled') => {
    if (isBarber || currentStatus === newStatus) return;
    const isDanger = newStatus === 'Cancelled';
    const actionLabel = newStatus === 'Confirmed' ? 'Confirm' : newStatus === 'Completed' ? 'Complete' : 'Cancel';
    setConfirmState({
      type: 'status',
      targetStatus: newStatus,
      title: `${actionLabel} Appointment`,
      message: `Are you sure you want to set this appointment status to ${newStatus}?`,
      confirmLabel: actionLabel,
      confirmVariant: isDanger ? 'danger' : 'primary',
    });
  };

  const requestDelete = () => {
    if (isBarber) return;
    setConfirmState({
      type: 'delete',
      title: 'Delete Appointment',
      message: 'Are you sure you want to permanently delete this appointment? This action cannot be undone.',
      confirmLabel: 'Delete',
      confirmVariant: 'danger',
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmState || !appointment) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      if (confirmState.type === 'status' && confirmState.targetStatus) {
        const newStatus = confirmState.targetStatus;
        await updateAppointmentStatus(appointment.id, newStatus, systemUser?.id || null);

        setCurrentStatus(newStatus);
        const actionMap: Record<string, string> = {
          'Confirmed': 'confirm',
          'Completed': 'finish',
          'Cancelled': 'cancel',
        };
        const actName = actionMap[newStatus] || newStatus.toLowerCase();
        await logActivity(
          actName,
          'appointment',
          `Updated appointment FBS-${100000 + appointment.id} status to ${newStatus}`,
          systemUser?.username || 'Admin'
        );
        onUpdated({ id: appointment.id, status: newStatus });
        // ponytail: close modal on complete or cancel since these are removed from calendar
        if (newStatus === 'Completed' || newStatus === 'Cancelled') {
          onClose();
        }
      } else if (confirmState.type === 'delete') {
        await deleteAppointment(appointment.id);
        await logActivity(
          'cancel',
          'appointment',
          `Deleted appointment FBS-${100000 + appointment.id}`,
          systemUser?.username || 'Admin'
        );
        if (onDeleted) {
          onDeleted(appointment.id);
        } else {
          onUpdated();
        }
        onClose();
      }
    } catch (err: any) {
      console.error('Action execution error:', err);
      setErrorMsg(err.message || 'Action failed');
    } finally {
      setIsSaving(false);
      setConfirmState(null);
    }
  };

  const getStatusBadgeClass = (st: string) => {
    switch (st) {
      case 'Confirmed': return 'status-badge confirmed';
      case 'Completed': return 'status-badge completed';
      case 'Cancelled': return 'status-badge cancelled';
      default: return 'status-badge pending';
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-card detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <span className="ref-tag">{referenceCode}</span>
            <h3>Appointment Details</h3>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="admin-modal-body">
          {errorMsg && <div className="admin-form-error">{errorMsg}</div>}

          <div className="detail-section">
            <h4>Customer Details</h4>
            <div className="detail-grid">
              <div>
                <span className="detail-label">Name</span>
                <p className="detail-val">{appointment.customer?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="detail-label">Phone</span>
                <p className="detail-val">{appointment.customer?.phone || 'N/A'}</p>
              </div>
              {appointment.customer?.email && (
                <div>
                  <span className="detail-label">Email</span>
                  <p className="detail-val">{appointment.customer.email}</p>
                </div>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h4>Booking Schedule & Payment</h4>
            <div className="detail-grid">
              <div>
                <span className="detail-label">Date & Time</span>
                <p className="detail-val highlight">{formattedDate}</p>
              </div>
              <div>
                <span className="detail-label">Assigned Barber</span>
                <p className="detail-val">{appointment.barber?.name || 'Unassigned'}</p>
              </div>
              <div>
                <span className="detail-label">Service</span>
                <p className="detail-val">{appointment.service?.name} (₱{appointment.service?.price})</p>
              </div>
              <div>
                <span className="detail-label">Duration</span>
                <p className="detail-val">{appointment.service?.duration_minutes} mins</p>
              </div>
              <div>
                <span className="detail-label">Payment Method</span>
                <p className="detail-val">
                  {appointment.payment_method === 'GCash' ? (
                    <span className="payment-badge-online">ONLINE PAYMENT (GCash)</span>
                  ) : (
                    <span>Cash</span>
                  )}
                </p>
              </div>
              <div>
                <span className="detail-label">Payment Status</span>
                <p className="detail-val">
                  <span className={`payment-status-badge ${appointment.payment_status?.toLowerCase() || 'unpaid'}`}>
                    {appointment.payment_status || 'Unpaid'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h4>Status Management</h4>
            <div className="status-control-row">
              <span className={getStatusBadgeClass(currentStatus)}>{currentStatus}</span>
              {!isBarber && (
                <div className="status-btn-group">
                  <button
                    type="button"
                    className={`status-opt-btn ${currentStatus === 'Confirmed' ? 'active' : ''}`}
                    onClick={() => requestStatusChange('Confirmed')}
                    disabled={isSaving}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className={`status-opt-btn ${currentStatus === 'Completed' ? 'active' : ''}`}
                    onClick={() => requestStatusChange('Completed')}
                    disabled={isSaving}
                  >
                    Complete
                  </button>
                  <button
                    type="button"
                    className={`status-opt-btn danger ${currentStatus === 'Cancelled' ? 'active' : ''}`}
                    onClick={() => requestStatusChange('Cancelled')}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="admin-modal-actions space-between">
          {!isBarber ? (
            <button type="button" className="btn-danger-link" onClick={requestDelete} disabled={isSaving}>
              Delete Appointment
            </button>
          ) : <div />}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={!!confirmState}
        title={confirmState?.title || ''}
        message={confirmState?.message || ''}
        confirmLabel={confirmState?.confirmLabel || 'Confirm'}
        confirmVariant={confirmState?.confirmVariant || 'danger'}
        isDeleting={isSaving}
        onConfirm={handleConfirmAction}
        onClose={() => setConfirmState(null)}
      />
    </div>
  );
};
