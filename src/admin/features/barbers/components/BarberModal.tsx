import React, { useState, useEffect } from 'react';
import {
  CustomTextInput,
  CustomTimeSelect,
  CustomDayPicker,
  CustomImageUploader,
  CustomTextArea,
} from '../../layout/components/CustomFormControls';
import type { BarberModalData } from '../../../../shared/types/barber';

interface BarberModalProps {
  isOpen: boolean;
  editingBarber: BarberModalData | null;
  isSubmitting: boolean;
  onSave: (data: BarberModalData) => void;
  onClose: () => void;
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const BarberModal: React.FC<BarberModalProps> = ({
  isOpen,
  editingBarber,
  isSubmitting,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState<string>('');
  const [shiftStart, setShiftStart] = useState<string>('09:00');
  const [shiftEnd, setShiftEnd] = useState<string>('17:00');
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isCredentialsLocked, setIsCredentialsLocked] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingBarber) {
      setName(editingBarber.name || '');
      setShiftStart(editingBarber.shift_start ? editingBarber.shift_start.slice(0, 5) : '09:00');
      setShiftEnd(editingBarber.shift_end ? editingBarber.shift_end.slice(0, 5) : '17:00');
      setWorkingDays(editingBarber.working_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      setUsername(editingBarber.username || '');
      setPassword(editingBarber.password || '');
      setImageUrl(editingBarber.image_url || '');
      setNotes(editingBarber.notes || '');
      setIsCredentialsLocked(true);
    } else {
      setName('');
      setShiftStart('09:00');
      setShiftEnd('17:00');
      setWorkingDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
      setUsername('');
      setPassword('');
      setImageUrl('');
      setNotes('');
      setIsCredentialsLocked(false);
    }
    setError(null);
  }, [editingBarber, isOpen]);

  if (!isOpen) return null;

  const toggleDay = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const timeToMins = (t: string) => {
    const parts = t.slice(0, 5).split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  const minsToTime = (m: number) => {
    const capped = Math.max(6 * 60, Math.min(23 * 60, m));
    const h = Math.floor(capped / 60).toString().padStart(2, '0');
    const min = (capped % 60).toString().padStart(2, '0');
    return `${h}:${min}`;
  };

  const handleShiftStartChange = (newStart: string) => {
    setShiftStart(newStart);
    const startMins = timeToMins(newStart);
    const endMins = timeToMins(shiftEnd);
    if (startMins >= endMins) {
      setShiftEnd(minsToTime(startMins + 15));
    }
  };

  const handleShiftEndChange = (newEnd: string) => {
    setShiftEnd(newEnd);
    const startMins = timeToMins(shiftStart);
    const endMins = timeToMins(newEnd);
    if (endMins <= startMins) {
      setShiftStart(minsToTime(endMins - 15));
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError('Staff name is required.');
      return;
    }
    if (!username.trim()) {
      setError('System username is required.');
      return;
    }
    if (!password.trim()) {
      setError('System password is required.');
      return;
    }
    if (workingDays.length === 0) {
      setError('Select at least one working day.');
      return;
    }
    if (timeToMins(shiftStart) >= timeToMins(shiftEnd)) {
      setError('Shift start time must be earlier than shift end time.');
      return;
    }

    onSave({
      id: editingBarber?.id,
      user_id: editingBarber?.user_id,
      name: name.trim(),
      shift_start: shiftStart.length === 5 ? `${shiftStart}:00` : shiftStart,
      shift_end: shiftEnd.length === 5 ? `${shiftEnd}:00` : shiftEnd,
      working_days: workingDays,
      username: username.trim(),
      password: password ? password.trim() : undefined,
      image_url: imageUrl || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal-card"
        style={{
          maxWidth: '540px',
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
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              {editingBarber ? 'Edit Barber Profile' : 'Add New Barber Staff'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Configure studio staff details, shift schedule, and portal login access.
            </p>
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

        <form onSubmit={handleSubmit}>
          <div className="admin-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Custom Image Uploader */}
            <CustomImageUploader
              label="Barber Staff Photo"
              imageUrl={imageUrl}
              onImageChange={(url) => {
                setImageUrl(url);
                setError(null);
              }}
              onError={(msg) => setError(msg)}
              barberName={name}
            />

            {/* Barber Full Name */}
            <CustomTextInput
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jose Rizal"
              required
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
            />

            {/* Description / Notes */}
            <CustomTextArea
              label="Description / Bio (Showcase Notes)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Master barber specializing in classic fades and beard grooming..."
              rows={3}
            />

            {/* Shift Timetable Custom Selects */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <CustomTimeSelect
                label="Shift Start"
                value={shiftStart}
                onChange={handleShiftStartChange}
                required
              />
              <CustomTimeSelect
                label="Shift End"
                value={shiftEnd}
                onChange={handleShiftEndChange}
                required
              />
            </div>

            {/* Custom Day Picker */}
            <CustomDayPicker
              label="Working Days Availability"
              allDays={ALL_DAYS}
              selectedDays={workingDays}
              onToggleDay={toggleDay}
              required
            />

            <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

            {/* Portal Credentials */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                System Access Credentials
              </span>
              {editingBarber && (
                <button
                  type="button"
                  onClick={() => setIsCredentialsLocked(!isCredentialsLocked)}
                  style={{
                    background: '#18181b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    {isCredentialsLocked ? (
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    ) : (
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    )}
                  </svg>
                  <span>{isCredentialsLocked ? 'Edit Credentials' : 'Lock Credentials'}</span>
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <CustomTextInput
                label="System Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. marcus"
                required
                disabled={editingBarber ? isCredentialsLocked : false}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                  </svg>
                }
              />
              <CustomTextInput
                label="System Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                required
                disabled={editingBarber ? isCredentialsLocked : false}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                }
              />
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
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                background: '#09090b',
                borderColor: '#09090b',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.12)',
              }}
            >
              {isSubmitting ? 'Saving Profile...' : editingBarber ? 'Update Barber' : 'Create Barber'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
