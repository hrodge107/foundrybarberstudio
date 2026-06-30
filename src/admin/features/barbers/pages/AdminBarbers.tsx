import React, { useState, useEffect, useCallback } from 'react';
import { logActivity } from '../../../../shared/services/activityLogger';
import { AdminLayout } from '../../layout/components/AdminLayout';
import { BarberModal } from '../components/BarberModal';
import { BarberConflictModal } from '../components/BarberConflictModal';
import { ConfirmDeleteModal } from '../../../../shared/components/ConfirmDeleteModal';
import { getBarbersAdmin, saveBarber, deleteBarber, getBarberActiveAppointments } from '../../../services/barbers';
import type { SystemUser } from '../../../../shared/types/user';
import type { BarberItem, BarberModalData } from '../../../../shared/types/barber';

interface AdminBarbersProps {
  onLogout: () => void;
  systemUser?: SystemUser | null;
}

export const AdminBarbers: React.FC<AdminBarbersProps> = ({ onLogout, systemUser }) => {
  const isBarber = systemUser?.role === 'barber';
  const [barbers, setBarbers] = useState<BarberItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isBarberModalOpen, setIsBarberModalOpen] = useState<boolean>(false);
  const [editingBarber, setEditingBarber] = useState<BarberModalData | null>(null);

  const [isConflictModalOpen, setIsConflictModalOpen] = useState<boolean>(false);
  const [conflictBarberName, setConflictBarberName] = useState<string>('');
  const [conflictAppointments, setConflictAppointments] = useState<any[]>([]);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [targetDeleteBarber, setTargetDeleteBarber] = useState<BarberItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch barbers and system users
  const fetchBarbers = useCallback(async () => {
    setIsLoading(true);
    try {
      const formatted = await getBarbersAdmin();
      setBarbers(formatted);
    } catch (err) {
      console.error('Error loading barbers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBarbers();
  }, [fetchBarbers]);

  const handleOpenAdd = () => {
    setEditingBarber(null);
    setIsBarberModalOpen(true);
  };

  const handleOpenEdit = (barber: BarberItem) => {
    setEditingBarber({
      id: barber.id,
      user_id: barber.user_id,
      name: barber.name,
      shift_start: barber.shift_start,
      shift_end: barber.shift_end,
      working_days: barber.working_days,
      username: barber.username || '',
      password: barber.password || '',
      image_url: barber.image_url ?? null,
      notes: barber.notes ?? null,
    });
    setIsBarberModalOpen(true);
  };

  const handleSaveBarber = async (data: BarberModalData) => {
    setIsSubmitting(true);
    try {
      await saveBarber(data);

      if (data.id) {
        await logActivity('barber_edit', 'barber', `Updated barber profile for ${data.name}`, systemUser?.username || 'Admin');
      } else {
        await logActivity('barber_add', 'barber', `Added new barber staff: ${data.name}`, systemUser?.username || 'Admin');
      }

      setIsBarberModalOpen(false);
      setEditingBarber(null);
      await fetchBarbers();
    } catch (err) {
      console.error('Error saving barber:', err);
      alert('Failed to save barber profile. Please check credentials or network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

const handleDeleteClick = async (barber: BarberItem) => {
  setIsSubmitting(true);
  try {
    const appts = await getBarberActiveAppointments(barber.id);

    if (appts && appts.length > 0) {
      // Conflict exists! Show conflict modal
      const formattedConflicts = appts.map((a: any) => ({
        id: a.id,
        appointment_date: a.appointment_date,
        status: a.status,
        customer_name: a.customers ? (a.customers as any).name : 'Client',
      }));
      setConflictBarberName(barber.name);
      setConflictAppointments(formattedConflicts);
      setIsConflictModalOpen(true);
    } else {
      // No conflicts, show delete confirm modal
      setTargetDeleteBarber(barber);
      setIsDeleteModalOpen(true);
    }
  } catch (err) {
    console.error('Error checking barber appointments:', err);
    alert('Could not verify barber appointment schedule.');
  } finally {
    setIsSubmitting(false);
  }
};

const handleConfirmDelete = async () => {
  if (!targetDeleteBarber) return;
  setIsSubmitting(true);
  try {
    await deleteBarber(targetDeleteBarber.id);
    await logActivity('barber_delete', 'barber', `Removed barber staff: ${targetDeleteBarber.name}`, systemUser?.username || 'Admin');

    setIsDeleteModalOpen(false);
    setTargetDeleteBarber(null);
    await fetchBarbers();
  } catch (err) {
    console.error('Error deleting barber:', err);
    alert('Failed to delete barber record.');
  } finally {
    setIsSubmitting(false);
  }
};

const formatShiftTime = (timeStr: string) => {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

return (
  <AdminLayout onLogout={onLogout} systemUser={systemUser} activeTab="barbers">
    <div className="admin-services-container" style={{ padding: '28px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
      {/* Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
            Barber Staff Roster
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {!isBarber && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleOpenAdd}
              style={{
                background: '#09090b',
                borderColor: '#09090b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add Barber</span>
            </button>
          )}
        </div>
      </div>

      {/* Barbers Grid View */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b', fontSize: '0.95rem' }}>
          Loading barber team roster...
        </div>
      ) : barbers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>No barbers found in team roster.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {barbers.map((b) => (
            <div
              key={b.id}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.04)';
              }}
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1.5px solid #18181b',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                position: 'relative',
              }}
            >
              <div>
                {/* Executive Business Card Top Profile Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '20px' }}>
                  {/* Barber Portrait / Avatar */}
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      background: '#18181b',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      border: '1px solid #27272a',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                    }}
                  >
                    {b.image_url ? (
                      <img src={b.image_url} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span>{b.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  <div style={{ overflow: 'hidden', flex: 1 }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#09090b', margin: 0, letterSpacing: '-0.01em', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {b.name}
                    </h3>

                  </div>
                </div>

                {/* Business Card Hairline Divider */}
                <div style={{ borderTop: '1px solid #f4f4f5', marginBottom: '16px' }} />

                {/* Shift & Availability Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: '#27272a', background: '#fafafa', padding: '14px 16px', borderRadius: '8px', border: '1px solid #f4f4f5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>
                      <strong style={{ color: '#09090b', fontWeight: 600 }}>Shift:</strong> {formatShiftTime(b.shift_start)} – {formatShiftTime(b.shift_end)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#18181b" strokeWidth="2" style={{ marginTop: '2px' }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                    </svg>
                    <div>
                      <strong style={{ display: 'block', marginBottom: '6px', color: '#09090b', fontWeight: 600 }}>Working Days:</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {b.working_days.map((day) => (
                          <span
                            key={day}
                            style={{
                              fontSize: '0.75rem',
                              padding: '3px 9px',
                              background: '#18181b',
                              color: '#ffffff',
                              borderRadius: '4px',
                              fontWeight: 600,
                              letterSpacing: '0.02em',
                            }}
                          >
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {!isBarber && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f4f4f5' }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(b)}
                    style={{
                      flex: 1,
                      padding: '9px 14px',
                      background: '#ffffff',
                      border: '1px solid #18181b',
                      borderRadius: '6px',
                      color: '#18181b',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(b)}
                    style={{
                      padding: '9px 16px',
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '6px',
                      color: '#52525b',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <BarberModal
        isOpen={isBarberModalOpen}
        editingBarber={editingBarber}
        isSubmitting={isSubmitting}
        onSave={handleSaveBarber}
        onClose={() => setIsBarberModalOpen(false)}
      />

      <BarberConflictModal
        isOpen={isConflictModalOpen}
        barberName={conflictBarberName}
        conflicts={conflictAppointments}
        onClose={() => setIsConflictModalOpen(false)}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        title="Delete Barber Staff"
        message={`Are you sure you want to delete ${targetDeleteBarber?.name}? This action will permanently remove their profile and access account.`}
        confirmLabel="Delete Barber"
        isDeleting={isSubmitting}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTargetDeleteBarber(null);
        }}
      />
    </div>
  </AdminLayout>
);
};
