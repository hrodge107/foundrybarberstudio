import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import type { SystemUser } from '../../App';
import { AdminLayout } from '../components/AdminLayout';
import { CustomTimeSelect } from '../components/CustomFormControls';

interface AdminStoreHoursProps {
  onLogout: () => void;
  systemUser: SystemUser | null;
}

export interface StoreHour {
  day_of_week: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
}

export const AdminStoreHours: React.FC<AdminStoreHoursProps> = ({ onLogout, systemUser }) => {
  const [storeHours, setStoreHours] = useState<StoreHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);

  useEffect(() => {
    fetchStoreHours();
  }, []);

  const fetchStoreHours = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('store_hours').select('*');
    if (error) {
      console.error('Error fetching store hours:', error);
      showToast('Error fetching store hours');
    } else if (data) {
      // Sort days
      const dayOrder = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 } as any;
      const sorted = [...data].sort((a, b) => dayOrder[a.day_of_week] - dayOrder[b.day_of_week]);
      setStoreHours(sorted);
    }
    setIsLoading(false);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleChange = (day: string, field: keyof StoreHour, value: any) => {
    setStoreHours((prev) =>
      prev.map((h) => (h.day_of_week === day ? { ...h, [field]: value } : h))
    );
  };

  const parseTimeString = (timeStr: string | null) => {
    if (!timeStr) return { hours: 0, minutes: 0 };
    const parts = timeStr.split(':');
    return { hours: parseInt(parts[0], 10) || 0, minutes: parseInt(parts[1], 10) || 0 };
  };

  const timeToMins = (t: string | null) => {
    if (!t) return 0;
    const parts = t.slice(0, 5).split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  };


  const checkForConflicts = async () => {
    // 1. Fetch pending/confirmed appointments starting from today
    const todayStr = new Date().toISOString();
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, appointment_date, status, customer:customers(name), service:services(duration_minutes, name)')
      .in('status', ['Pending', 'Confirmed'])
      .gte('appointment_date', todayStr);

    if (error) {
      console.error('Error checking conflicts:', error);
      return [];
    }

    if (!appointments || appointments.length === 0) return [];

    const foundConflicts = [];
    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (const app of appointments) {
      const d = new Date(app.appointment_date);
      const dayAbbr = daysMap[d.getDay()];
      const storeDay = storeHours.find((s) => s.day_of_week === dayAbbr);

      if (!storeDay || !storeDay.is_open || !storeDay.open_time || !storeDay.close_time) {
        foundConflicts.push(app);
        continue;
      }

      const { hours: sh, minutes: sm } = parseTimeString(storeDay.open_time);
      const { hours: ch, minutes: cm } = parseTimeString(storeDay.close_time);

      const appStartMs = d.getTime();
      const serviceObj = Array.isArray(app.service) ? app.service[0] : app.service;
      const dur = (serviceObj as any)?.duration_minutes || 0;
      const appEndMs = appStartMs + dur * 60 * 1000;

      const baseYear = d.getFullYear();
      const baseMonth = d.getMonth();
      const baseDay = d.getDate();

      const isOvernight = ch < sh || (ch === sh && cm < sm);
      let storeWindows = [];
      if (!isOvernight) {
        storeWindows.push({
          start: new Date(baseYear, baseMonth, baseDay, sh, sm, 0, 0),
          end: new Date(baseYear, baseMonth, baseDay, ch, cm, 0, 0)
        });
      } else {
        storeWindows.push({
          start: new Date(baseYear, baseMonth, baseDay, sh, sm, 0, 0),
          end: new Date(baseYear, baseMonth, baseDay, 24, 0, 0, 0)
        });
        storeWindows.push({
          start: new Date(baseYear, baseMonth, baseDay + 1, 0, 0, 0, 0),
          end: new Date(baseYear, baseMonth, baseDay + 1, ch, cm, 0, 0)
        });
      }

      const fallsInStoreWindow = storeWindows.some(win =>
        appStartMs >= win.start.getTime() && appEndMs <= win.end.getTime()
      );

      if (!fallsInStoreWindow) {
        foundConflicts.push(app);
      }
    }

    return foundConflicts;
  };

  const handleSave = async () => {
    if (hasErrors) {
      showToast('Please resolve all validation errors before saving.');
      return;
    }
    setIsSaving(true);
    const potentialConflicts = await checkForConflicts();

    if (potentialConflicts.length > 0) {
      setConflicts(potentialConflicts);
      setShowConflictModal(true);
      setIsSaving(false);
      return;
    }

    await persistSave();
  };

  const persistSave = async () => {
    setIsSaving(true);
    try {
      for (const h of storeHours) {
        const { error } = await supabase
          .from('store_hours')
          .update({
            is_open: h.is_open,
            open_time: h.open_time,
            close_time: h.close_time
          })
          .eq('day_of_week', h.day_of_week);
        if (error) throw error;
      }
      showToast('Store hours saved successfully');
    } catch (e) {
      console.error(e);
      showToast('Error saving store hours');
    } finally {
      setIsSaving(false);
      setShowConflictModal(false);
    }
  };

  const hasErrors = storeHours.some((h) => {
    if (!h.is_open) return false;
    if (!h.open_time || !h.close_time) return true;
    return timeToMins(h.open_time) >= timeToMins(h.close_time);
  });

  return (
    <AdminLayout onLogout={onLogout} systemUser={systemUser} activeTab="settings">
      <style>{`
        .hours-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .hours-row {
          display: flex;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #f1f5f9;
          transition: all 0.2s ease;
          border-left: 4px solid transparent;
        }
        .hours-row:last-child {
          border-bottom: none;
        }
        .hours-row.is-open {
          border-left-color: #10b981;
        }
        .hours-row.is-closed {
          background: #f8fafc;
          opacity: 0.65;
        }
        .hours-day-info {
          width: 120px;
          flex-shrink: 0;
        }
        .hours-day-name {
          font-weight: 600;
          color: #1e293b;
          font-size: 1rem;
          margin-bottom: 2px;
        }
        .hours-day-status {
          font-size: 0.75rem;
          font-weight: 500;
        }
        .hours-day-status.open {
          color: #10b981;
        }
        .hours-day-status.closed {
          color: #64748b;
        }
        .hours-toggle-col {
          width: 80px;
          flex-shrink: 0;
        }
        .hours-time-col {
          display: flex;
          align-items: flex-end;
          gap: 16px;
          flex-grow: 1;
        }
        .hours-time-separator {
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 12px;
        }
        .hours-error-col {
          margin-left: 16px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          min-width: 250px;
        }
        .error-badge {
          background: #fef2f2;
          color: #ef4444;
          border: 1px solid #fee2e2;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 6px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          cursor: pointer;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        input:checked + .slider {
          background-color: #10b981;
        }
        input:focus + .slider {
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }
        input:checked + .slider:before {
          transform: translateX(20px);
        }
      `}</style>
      <div style={{ padding: '24px', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="admin-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="admin-header-title">
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Store Hours</h1>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '4px 0 0 0' }}>Define store hours and active days</p>
          </div>
          <div className="admin-header-actions">
            <button onClick={handleSave} disabled={isSaving || isLoading || hasErrors} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="bi bi-save"></i> {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="admin-content">
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: '#64748b' }}>
              <div className="spinner-border animate-spin" style={{ width: '2rem', height: '2rem', border: '0.25em solid currentColor', borderRightColor: 'transparent', borderRadius: '50%' }} role="status">
                <span className="visually-hidden" style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: '0' }}>Loading...</span>
              </div>
              <span style={{ marginLeft: '12px', fontWeight: 500 }}>Loading store hours...</span>
            </div>
          ) : (
            <div className="hours-card">
              <div className="hours-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Weekly Schedule</h2>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '4px 0 0 0' }}></p>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                  <span>{storeHours.filter(h => h.is_open).length} Days Open</span>
                </div>
              </div>

              <div className="hours-card-body">
                {storeHours.map((h) => {
                  let errorMessage = '';
                  if (h.is_open) {
                    if (!h.open_time) errorMessage = 'Open time is required.';
                    else if (!h.close_time) errorMessage = 'Close time is required.';
                    else if (timeToMins(h.open_time) >= timeToMins(h.close_time)) {
                      errorMessage = 'Open time must be earlier than Close time.';
                    }
                  }

                  return (
                    <div key={h.day_of_week} className={`hours-row ${h.is_open ? 'is-open' : 'is-closed'}`}>
                      <div className="hours-day-info">
                        <div className="hours-day-name">{h.day_of_week}</div>
                        <div className={`hours-day-status ${h.is_open ? 'open' : 'closed'}`}>
                          {h.is_open ? 'Open for business' : 'Closed'}
                        </div>
                      </div>

                      <div className="hours-toggle-col">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={h.is_open}
                            onChange={(e) => handleChange(h.day_of_week, 'is_open', e.target.checked)}
                          />
                          <span className="slider round"></span>
                        </label>
                      </div>

                      <div className="hours-time-col">
                        <div style={{ width: '140px' }}>
                          <CustomTimeSelect
                            label="Open"
                            value={h.open_time || '09:00'}
                            onChange={(val) => handleChange(h.day_of_week, 'open_time', val)}
                            disabled={!h.is_open}
                            error={!!errorMessage && h.is_open && (!h.open_time || timeToMins(h.open_time) >= timeToMins(h.close_time))}
                          />
                        </div>

                        <span className="hours-time-separator">—</span>

                        <div style={{ width: '140px' }}>
                          <CustomTimeSelect
                            label="Close"
                            value={h.close_time || '17:00'}
                            onChange={(val) => handleChange(h.day_of_week, 'close_time', val)}
                            disabled={!h.is_open}
                            error={!!errorMessage && h.is_open && (!h.close_time || timeToMins(h.open_time) >= timeToMins(h.close_time))}
                          />
                        </div>
                      </div>

                      <div className="hours-error-col">
                        {errorMessage && h.is_open && (
                          <div className="error-badge">
                            <i className="bi bi-exclamation-triangle-fill"></i>
                            <span>{errorMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conflict Modal */}
      {showConflictModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal-card" style={{ maxWidth: '600px' }}>
            <div className="admin-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                <i className="bi bi-exclamation-triangle-fill"></i> Schedule Conflict Warning
              </h3>
              <button className="modal-close-btn" onClick={() => setShowConflictModal(false)}>
                <i className="bi bi-x-lg" style={{ fontSize: '1rem' }}></i>
              </button>
            </div>
            <div className="admin-modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>
                The following existing appointments fall outside the new store hours you're trying to save.
              </p>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                Note: Saving will <strong>not</strong> auto-cancel these appointments. They will remain in the system, but you should contact the customers.
              </p>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {conflicts.map((c) => {
                  const serviceObj = Array.isArray(c.service) ? c.service[0] : c.service;
                  return (
                    <div key={c.id} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{(Array.isArray(c.customer) ? c.customer[0] : c.customer)?.name}</span>
                        <span className={`status-badge status-${c.status.toLowerCase()}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>{c.status}</span>
                      </div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        <i className="bi bi-calendar3" style={{ marginRight: '6px' }}></i>
                        {new Date(c.appointment_date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                      {serviceObj && (
                        <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>
                          <i className="bi bi-scissors" style={{ marginRight: '6px' }}></i>
                          {(serviceObj as any)?.name} ({(serviceObj as any)?.duration_minutes} mins)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="admin-modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc' }}>
              <button className="btn-secondary" onClick={() => setShowConflictModal(false)}>Cancel</button>
              <button className="btn-danger" style={{ background: '#ef4444', borderColor: '#ef4444', color: '#ffffff', padding: '9px 18px', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }} onClick={persistSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Proceed Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="toast-notification show">
          <i className="bi bi-info-circle"></i>
          <span>{toastMessage}</span>
        </div>
      )}
    </AdminLayout>
  );
};
