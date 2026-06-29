import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { logActivity } from '../../utils/activityLogger';

import type { SystemUser } from '../../App';

export interface FullAppointment {
  id: number;
  appointment_date: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  customer: {
    id: number;
    name: string;
    phone: string;
    email?: string | null;
  };
  service: {
    id: number;
    name: string;
    duration_minutes: number;
    price: number;
  };
  barber: {
    id: number;
    name: string;
  };
}

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
  appointment: FullAppointment | null;
  systemUser?: SystemUser | null;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  appointment,
  systemUser,
}) => {
  const isBarber = systemUser?.role === 'barber';
  const [currentStatus, setCurrentStatus] = useState<'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'>('Pending');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleStatusUpdate = async (newStatus: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled') => {
    if (isBarber) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointment.id);

      if (error) throw error;
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
      onUpdated();
    } catch (err: any) {
      console.error('Update status error:', err);
      setErrorMsg(err.message || 'Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isBarber) return;
    if (!window.confirm('Are you sure you want to delete this appointment?')) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointment.id);

      if (error) throw error;
      await logActivity(
        'cancel',
        'appointment',
        `Deleted appointment FBS-${100000 + appointment.id}`,
        systemUser?.username || 'Admin'
      );
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error('Delete appointment error:', err);
      setErrorMsg(err.message || 'Failed to delete appointment');
    } finally {
      setIsSaving(false);
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
            <h4>Booking Schedule</h4>
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
                    onClick={() => handleStatusUpdate('Confirmed')}
                    disabled={isSaving}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className={`status-opt-btn ${currentStatus === 'Completed' ? 'active' : ''}`}
                    onClick={() => handleStatusUpdate('Completed')}
                    disabled={isSaving}
                  >
                    Complete
                  </button>
                  <button
                    type="button"
                    className={`status-opt-btn danger ${currentStatus === 'Cancelled' ? 'active' : ''}`}
                    onClick={() => handleStatusUpdate('Cancelled')}
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
            <button type="button" className="btn-danger-link" onClick={handleDelete} disabled={isSaving}>
              Delete Appointment
            </button>
          ) : <div />}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
