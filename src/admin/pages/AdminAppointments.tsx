import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { AdminLayout } from '../components/AdminLayout';
import { logActivity } from '../../utils/activityLogger';
import { doIntervalsOverlap, scanPostAcceptConflicts } from '../../utils/bookingRules';
import type { SystemUser } from '../../App';

interface AdminAppointmentsProps {
  onLogout: () => void;
  systemUser?: SystemUser | null;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string | null;
}

interface Barber {
  id: number;
  name: string;
}

interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price: number;
}

export interface AppointmentRecord {
  id: number;
  appointment_date: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  customer: Customer | null;
  barber: Barber | null;
  service: Service | null;
  processed_by_user_id?: number | null;
}

type TabFilter = 'Pending' | 'Confirmed' | 'Cancelled' | 'All';

function GlidingTabs({ 
  tabs, 
  activeTab, 
  onTabChange 
}: { 
  tabs: TabFilter[]; 
  activeTab: TabFilter; 
  onTabChange: (tab: TabFilter) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({});

  const updateIndicator = useCallback(() => {
    const activeIndex = tabs.indexOf(activeTab);
    const el = refs.current[activeIndex];
    if (el) {
      setIndicatorStyle({
        left: `${el.offsetLeft}px`,
        width: `${el.offsetWidth}px`,
      });
    }
  }, [tabs, activeTab]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  return (
    <div className="gliding-tabs-container">
      <span className="gliding-tabs-indicator" style={indicatorStyle} />
      {tabs.map((tab, i) => (
        <button
          key={tab}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          className={`gliding-tab-btn ${activeTab === tab ? 'active' : ''}`}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export const AdminAppointments: React.FC<AdminAppointmentsProps> = ({ onLogout, systemUser }) => {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<TabFilter>('Pending');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Rule 4B Modal Conflict state
  const [conflictModal, setConflictModal] = useState<{
    targetBooking: AppointmentRecord;
    conflicts: AppointmentRecord[];
  } | null>(null);
  const [cardDecisions, setCardDecisions] = useState<Record<number, 'OK' | 'Delete'>>({});
  const [isSubmittingConflicts, setIsSubmittingConflicts] = useState<boolean>(false);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          processed_by_user_id,
          customer:customers ( id, name, phone, email ),
          barber:barbers ( id, name ),
          service:services ( id, name, duration_minutes, price )
        `)
        .order('appointment_date', { ascending: false });

      if (error) {
        console.error('Error fetching appointments:', error);
      } else if (data) {
        setAppointments(data as unknown as AppointmentRecord[]);
      }
    } catch (err) {
      console.error('Failed to query appointments:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Rule 5: Transient post-accept conflict scan
  const transientConflictWarnings = useMemo(() => {
    return scanPostAcceptConflicts(appointments);
  }, [appointments]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDeclineBooking = async (appointment: AppointmentRecord) => {
    setActionLoadingId(appointment.id);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'Cancelled',
          processed_by_user_id: systemUser?.id || null,
        })
        .eq('id', appointment.id);

      if (error) {
        alert(`Failed to update status: ${error.message}`);
        return;
      }

      const refCode = `FBS-${100000 + appointment.id}`;
      const custName = appointment.customer?.name || 'Customer';

      await logActivity(
        'appointment_declined',
        'appointment',
        `Declined/Cancelled appointment ${refCode} for ${custName}`,
        systemUser?.username || 'admin'
      );

      await fetchAppointments();
    } catch (err) {
      console.error('Error declining appointment:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Rule 4: On Admin Accept (Confirm a Pending Booking)
  const handleAcceptBooking = async (appointment: AppointmentRecord) => {
    setActionLoadingId(appointment.id);
    try {
      if (!appointment.barber || !appointment.service) {
        alert('Invalid appointment data.');
        return;
      }

      const targetDuration = appointment.service.duration_minutes || 0;
      const targetStart = new Date(appointment.appointment_date).getTime();

      // STEP 1-3: Query other active appointments on same barber
      const { data: otherAppts, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          processed_by_user_id,
          customer:customers ( id, name, phone, email ),
          barber:barbers ( id, name ),
          service:services ( id, name, duration_minutes, price )
        `)
        .eq('barber_id', appointment.barber.id)
        .in('status', ['Pending', 'Confirmed'])
        .neq('id', appointment.id);

      if (error) throw error;

      const conflicts: AppointmentRecord[] = [];

      if (otherAppts) {
        for (const other of otherAppts as unknown as AppointmentRecord[]) {
          const otherDur = other.service?.duration_minutes || 0;
          if (otherDur <= 0) continue;
          if (doIntervalsOverlap(targetStart, targetDuration, other.appointment_date, otherDur)) {
            conflicts.push(other);
          }
        }
      }

      // STEP 4A: No conflicts found
      if (conflicts.length === 0) {
        const { error: updateErr } = await supabase
          .from('appointments')
          .update({
            status: 'Confirmed',
            processed_by_user_id: systemUser?.id || null,
          })
          .eq('id', appointment.id);

        if (updateErr) throw updateErr;

        const refCode = `FBS-${100000 + appointment.id}`;
        const custName = appointment.customer?.name || 'Customer';
        const barberName = appointment.barber?.name || 'Barber';

        await logActivity(
          'appointment_confirmed',
          'appointment',
          `Confirmed appointment ${refCode} for ${custName} with ${barberName} at ${appointment.appointment_date}.`,
          systemUser?.username || 'admin'
        );

        await fetchAppointments();
      } else {
        // STEP 4B: Conflicts found — surface stacked conflict modal
        setConflictModal({
          targetBooking: appointment,
          conflicts,
        });
        setCardDecisions({});
      }
    } catch (err: any) {
      console.error('Error confirming appointment:', err);
      alert(`Error accepting booking: ${err.message || err}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Rule 4B Submit: Finalize conflict resolution batch
  const handleConfirmAllConflicts = async () => {
    if (!conflictModal) return;
    setIsSubmittingConflicts(true);

    try {
      const { targetBooking, conflicts } = conflictModal;
      const adminUsername = systemUser?.username || 'admin';
      const adminId = systemUser?.id || null;
      const targetRefCode = `FBS-${100000 + targetBooking.id}`;

      // 1. Process deletions
      for (const conf of conflicts) {
        const decision = cardDecisions[conf.id];
        if (decision === 'Delete') {
          const { error: delErr } = await supabase
            .from('appointments')
            .update({
              status: 'Cancelled',
              processed_by_user_id: adminId,
            })
            .eq('id', conf.id);

          if (delErr) throw delErr;

          const confRefCode = `FBS-${100000 + conf.id}`;
          const confCustName = conf.customer?.name || 'Customer';

          await logActivity(
            'conflict_cancelled',
            'appointment',
            `Auto-cancelled ${confRefCode} (${confCustName}) due to slot conflict with ${targetRefCode} which was confirmed.`,
            adminUsername
          );
        }
      }

      // 2. Accept Booking A
      const { error: acceptErr } = await supabase
        .from('appointments')
        .update({
          status: 'Confirmed',
          processed_by_user_id: adminId,
        })
        .eq('id', targetBooking.id);

      if (acceptErr) throw acceptErr;

      const targetCustName = targetBooking.customer?.name || 'Customer';
      const targetBarberName = targetBooking.barber?.name || 'Barber';

      await logActivity(
        'appointment_confirmed',
        'appointment',
        `Confirmed appointment ${targetRefCode} for ${targetCustName} with ${targetBarberName} at ${targetBooking.appointment_date}.`,
        adminUsername
      );

      // 3. Clear modal and re-fetch pending queue
      setConflictModal(null);
      setCardDecisions({});
      await fetchAppointments();
    } catch (err: any) {
      console.error('Failed executing conflict resolution:', err);
      alert(`Error submitting conflicts: ${err.message || err}`);
    } finally {
      setIsSubmittingConflicts(false);
    }
  };

  const filteredAppointments = appointments.filter((app) => {
    if (activeFilter === 'All') return true;
    return app.status === activeFilter;
  });

  const formatDate = (isoString: string) => {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const allConflictsDecided = conflictModal
    ? conflictModal.conflicts.every((c) => cardDecisions[c.id] != null)
    : false;

  return (
    <AdminLayout onLogout={onLogout} systemUser={systemUser} activeTab="appointments">
      <div className="admin-appointments-page">
        <header className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Appointments</h1>
            <p className="admin-page-subtitle">Manage customer bookings and pending appointment requests.</p>
          </div>
        </header>

        <div className="admin-appointments-controls">
          <GlidingTabs
            tabs={['Pending', 'Confirmed', 'Cancelled', 'All']}
            activeTab={activeFilter}
            onTabChange={setActiveFilter}
          />

          <div className="appointments-count-badge">
            Total: <strong>{filteredAppointments.length}</strong>
          </div>
        </div>

        {isLoading ? (
          <div className="admin-loading-state">
            <p>Loading appointments queue...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="admin-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <h3>No appointments found</h3>
            <p>There are no appointments matching the "{activeFilter}" filter status.</p>
          </div>
        ) : (
          <div className="appointments-cards-grid">
            {filteredAppointments.map((app) => {
              const isExpanded = expandedIds.has(app.id);
              const refCode = `FBS-${100000 + app.id}`;
              const isActioning = actionLoadingId === app.id;
              const hasConflictWarning = app.status === 'Pending' && transientConflictWarnings.has(app.id);

              return (
                <div key={app.id} className={`appointment-card ${isExpanded ? 'expanded' : ''} status-${app.status.toLowerCase()}`}>
                  {/* Collapsed Card Header */}
                  <div className="appointment-card-header" onClick={() => toggleExpand(app.id)}>
                    <div className="card-header-main">
                      <div className="card-ref-badge">{refCode}</div>
                      <div className="card-customer-info">
                        <h4 className="customer-name">{app.customer?.name || 'Unknown Customer'}</h4>
                        <span className="service-name">{app.service?.name || 'Service Unspecified'}</span>
                      </div>
                    </div>

                    <div className="card-header-meta">
                      <div className="barber-assigned">
                        <span className="meta-label">Barber:</span>
                        <span className="meta-val">{app.barber?.name || 'Unassigned'}</span>
                      </div>
                      <div className="appointment-datetime">
                        <span className="date-str">{formatDate(app.appointment_date)}</span>
                        <span className="time-str">{formatTime(app.appointment_date)}</span>
                      </div>
                      <div className={`status-pill status-${app.status.toLowerCase()}`}>
                        {app.status}
                      </div>
                      <button type="button" className="expand-chevron-btn" aria-label="Toggle details">
                        <svg className={`chevron-icon ${isExpanded ? 'open' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Rule 5 Warning Badge */}
                  {hasConflictWarning && (
                    <div style={{ padding: '8px 16px', backgroundColor: '#fffbeb', borderLeft: '4px solid #f59e0b', borderBottom: '1px solid #fef3c7', color: '#b45309', fontSize: '0.825rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>⚠ This time may now conflict — please review before accepting.</span>
                    </div>
                  )}

                  {/* Expanded Card Body Details */}
                  {isExpanded && (
                    <div className="appointment-card-body">
                      <div className="details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Customer Phone</span>
                          <span className="detail-val">
                            {app.customer?.phone ? (
                              <a href={`tel:${app.customer.phone}`} className="contact-link">{app.customer.phone}</a>
                            ) : 'N/A'}
                          </span>
                        </div>

                        <div className="detail-item">
                          <span className="detail-label">Customer Email</span>
                          <span className="detail-val">
                            {app.customer?.email ? (
                              <a href={`mailto:${app.customer.email}`} className="contact-link">{app.customer.email}</a>
                            ) : 'None provided'}
                          </span>
                        </div>

                        <div className="detail-item">
                          <span className="detail-label">Service Duration</span>
                          <span className="detail-val">{app.service?.duration_minutes || 0} minutes</span>
                        </div>

                        <div className="detail-item">
                          <span className="detail-label">Service Price</span>
                          <span className="detail-val price-val">₱{app.service?.price?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>

                      {/* Action buttons footer for Pending appointments */}
                      {app.status === 'Pending' && (
                        <div className="card-actions-row">
                          <button
                            type="button"
                            className="admin-btn btn-decline"
                            disabled={isActioning}
                            onClick={() => handleDeclineBooking(app)}
                          >
                            {isActioning ? 'Processing...' : 'Decline Booking'}
                          </button>
                          <button
                            type="button"
                            className="admin-btn btn-accept"
                            disabled={isActioning}
                            onClick={() => handleAcceptBooking(app)}
                          >
                            {isActioning ? 'Processing...' : 'Accept Booking'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Rule 4B Stacked Conflict Modal */}
        {conflictModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
            <div style={{ backgroundColor: '#ffffff', color: '#0f172a', borderRadius: '12px', maxWidth: '680px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
              
              {/* Modal Header */}
              <div style={{ backgroundColor: '#ef4444', color: '#ffffff', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🚨 Conflict Detected</span>
                    <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.875rem' }}>
                      FBS-{100000 + conflictModal.targetBooking.id}
                    </span>
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#fecdd3' }}>
                    Confirming this booking conflicts with {conflictModal.conflicts.length} pending request{conflictModal.conflicts.length > 1 ? 's' : ''}. Resolve all cards to continue.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setConflictModal(null); setCardDecisions({}); }}
                  style={{ background: 'none', border: 'none', color: '#ffffff', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>

              {/* Modal Body / Stacked Cards List */}
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {conflictModal.conflicts.map((conf) => {
                  const confRefCode = `FBS-${100000 + conf.id}`;
                  const decision = cardDecisions[conf.id];

                  return (
                    <div key={conf.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#f8fafc', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>{confRefCode}</span>
                          <h4 style={{ margin: '2px 0 0 0', fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                            Customer: {conf.customer?.name || 'Unknown'} {conf.customer?.phone ? `(${conf.customer.phone})` : ''}
                          </h4>
                        </div>
                        {decision && (
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: decision === 'OK' ? '#e0f2fe' : '#fee2e2',
                            color: decision === 'OK' ? '#0369a1' : '#b91c1c'
                          }}>
                            {decision === 'OK' ? '✓ Marked to stay pending' : '✗ Marked for cancellation'}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.875rem', color: '#334155', marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div><strong>Requested Barber:</strong> {conf.barber?.name || 'Unassigned'}</div>
                        <div><strong>Time:</strong> {formatDate(conf.appointment_date)} at {formatTime(conf.appointment_date)}</div>
                        <div><strong>Service:</strong> {conf.service?.name || 'N/A'} ({conf.service?.duration_minutes || 0} min)</div>
                      </div>

                      <div style={{ backgroundColor: '#f1f5f9', padding: '10px 12px', borderRadius: '6px', fontSize: '0.8rem', color: '#475569', marginBottom: '12px', fontStyle: 'italic' }}>
                        "This customer's requested time block was taken by the booking you are about to confirm. Cannot auto-confirm. Please inform the customer to rebook."
                      </div>

                      {/* Action buttons per conflict card */}
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setCardDecisions((prev) => ({ ...prev, [conf.id]: 'OK' }))}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: decision === 'OK' ? '#0284c7' : '#ffffff',
                            color: decision === 'OK' ? '#ffffff' : '#334155',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          OK (Keep Pending)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardDecisions((prev) => ({ ...prev, [conf.id]: 'Delete' }))}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: '1px solid #fca5a5',
                            backgroundColor: decision === 'Delete' ? '#dc2626' : '#ffffff',
                            color: decision === 'Delete' ? '#ffffff' : '#dc2626',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Delete Booking
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => { setConflictModal(null); setCardDecisions({}); }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel / Keep Pending
                </button>
                <button
                  type="button"
                  disabled={!allConflictsDecided || isSubmittingConflicts}
                  onClick={handleConfirmAllConflicts}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: allConflictsDecided ? '#16a34a' : '#94a3b8',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: allConflictsDecided && !isSubmittingConflicts ? 'pointer' : 'not-allowed',
                    boxShadow: allConflictsDecided ? '0 4px 6px -1px rgba(22, 163, 74, 0.4)' : 'none'
                  }}
                >
                  {isSubmittingConflicts ? 'Processing...' : 'Confirm All & Accept Booking'}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
