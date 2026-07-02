import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { logActivity } from '../../../../shared/services/activityLogger';
import { getStoreHoursAdmin } from '../../../services/storeHours';
import { createAppointmentAdmin } from '../../../services/appointments';
import { getCustomers } from '../../../services/customers';
import { CustomTimeSelect, CustomDatePicker } from '../../layout/components/CustomFormControls';
import type { StoreHour } from '../../../../shared/types/store';
import type { Service } from '../../../../shared/types/service';
import type { Barber } from '../../../../shared/types/barber';
import type { CustomerData } from '../../../../shared/types/user';
import '../../../styles/AdminCustomers.css';

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialDate: Date;
  initialTime: string;
  barbers: Barber[];
  services: Service[];
}

export const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  initialDate,
  initialTime,
  barbers,
  services,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<number | ''>('');
  const [selectedBarberId, setSelectedBarberId] = useState<number | ''>('');
  const [dateString, setDateString] = useState('');
  const [timeString, setTimeString] = useState('10:00');
  const [status, setStatus] = useState<'Pending' | 'Confirmed'>('Confirmed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [storeHours, setStoreHours] = useState<StoreHour[]>([]);

  // Registered Customer states
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isSelectCustomerOpen, setIsSelectCustomerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilterTab, setCustomerFilterTab] = useState<'all' | 'registered' | 'unregistered'>('all');
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const updatePillPosition = useCallback(() => {
    const activeBtn = tabRefs.current[customerFilterTab];
    if (activeBtn) {
      setPillStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [customerFilterTab]);

  useEffect(() => {
    if (isSelectCustomerOpen) {
      updatePillPosition();
      const timer = setTimeout(updatePillPosition, 50);
      window.addEventListener('resize', updatePillPosition);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updatePillPosition);
      };
    }
  }, [isSelectCustomerOpen, updatePillPosition]);

  useEffect(() => {
    if (isOpen) {
      const fetchCustomers = async () => {
        try {
          const data = await getCustomers();
          setCustomers(data);
        } catch (e) {
          console.error('Error fetching customers in create appointment modal:', e);
        }
      };
      fetchCustomers();
    }
  }, [isOpen]);

  const timeToMins = (t: string | null) => {
    if (!t) return 0;
    const parts = t.slice(0, 5).split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  };

  const formatTimeStr = (t: string | null) => {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${mStr.padStart(2, '0')} ${ampm}`;
  };

  const now = new Date();
  const todayY = now.getFullYear();
  const todayM = String(now.getMonth() + 1).padStart(2, '0');
  const todayD = String(now.getDate()).padStart(2, '0');
  const todayStr = `${todayY}-${todayM}-${todayD}`;

  const currentH = now.getHours().toString().padStart(2, '0');
  const currentMin = now.getMinutes().toString().padStart(2, '0');
  const currentTimeStr = `${currentH}:${currentMin}`;

  const convertTo24h = (timeStr: string): string => {
    if (!timeStr) return '10:00';
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    let clean = timeStr.trim();
    const isPM = clean.toUpperCase().includes('PM');
    const isAM = clean.toUpperCase().includes('AM');
    clean = clean.replace(/(AM|PM)/i, '').trim();
    const parts = clean.split(':');
    let h = parseInt(parts[0], 10) || 0;
    let m = parseInt(parts[1] || '0', 10) || 0;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isOpen) {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setSelectedCustomerId(null);
      setIsSelectCustomerOpen(false);
      setSearchQuery('');
      setCustomerFilterTab('all');
      setErrorMsg(null);

      const fetchStoreHours = async () => {
        try {
          const data = await getStoreHoursAdmin();
          setStoreHours(data);
        } catch (e) {
          console.error('Error fetching store hours in create appointment modal:', e);
        }
      };
      fetchStoreHours();

      if (services.length > 0) setSelectedServiceId(services[0].id);
      if (barbers.length > 0) setSelectedBarberId(barbers[0].id);

      // Format date YYYY-MM-DD for date input (prevent past date)
      const year = initialDate.getFullYear();
      const month = String(initialDate.getMonth() + 1).padStart(2, '0');
      const day = String(initialDate.getDate()).padStart(2, '0');
      const calcDate = `${year}-${month}-${day}`;
      const targetDate = calcDate < todayStr ? todayStr : calcDate;
      setDateString(targetDate);

      const parsedTime = convertTo24h(initialTime || '10:00 AM');
      if (targetDate === todayStr && parsedTime < currentTimeStr) {
        // Find next future 15m slot
        let h = now.getHours();
        let m = Math.ceil(now.getMinutes() / 15) * 15;
        if (m >= 60) { h += 1; m = 0; }
        const adjustedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        setTimeString(adjustedTime);
      } else {
        setTimeString(parsedTime);
      }
    }
  }, [isOpen, initialDate, initialTime, services, barbers, todayStr, currentTimeStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !selectedServiceId || !selectedBarberId) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    const cleanEmail = customerEmail.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (storeHourError) {
      setErrorMsg(storeHourError);
      return;
    }

    const selectedBarber = barbers.find((b) => b.id === Number(selectedBarberId));
    if (selectedBarber) {
      const shiftStart = selectedBarber.shift_start.slice(0, 5);
      const shiftEnd = selectedBarber.shift_end.slice(0, 5);
      if (timeString < shiftStart || timeString >= shiftEnd) {
        setErrorMsg(`Selected time is outside the barber's shift (${selectedBarber.name}: ${formatTimeStr(selectedBarber.shift_start)} - ${formatTimeStr(selectedBarber.shift_end)}).`);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const parts = timeString.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1] || '0', 10);

      const [y, m, d] = dateString.split('-').map(Number);
      const scheduledDate = new Date(y, m - 1, d, hours, minutes, 0);

      if (scheduledDate < new Date()) {
        setErrorMsg('Cannot schedule appointments in the past.');
        setIsSubmitting(false);
        return;
      }

      const isoDateTime = scheduledDate.toISOString();

      // Check or create customer
      // Create appointment
      await createAppointmentAdmin({
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        serviceId: Number(selectedServiceId),
        barberId: Number(selectedBarberId),
        appointmentDate: isoDateTime,
        status: status,
        customerId: selectedCustomerId || undefined
      });

      const service = services.find((s) => s.id === Number(selectedServiceId));
      const barber = barbers.find((b) => b.id === Number(selectedBarberId));
      const serviceName = service ? service.name : 'Service';
      const barberName = barber ? barber.name : 'Barber';

      await logActivity(
        'appointment_add',
        'appointment',
        `Admin created appointment for ${customerName.trim()} - ${serviceName} with ${barberName} at ${isoDateTime}.`
      );

      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Create appointment error:', err);
      setErrorMsg(err.message || 'Failed to create appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if the selected date and time fall outside store hours
  let storeHourError: string | null = null;
  if (dateString && timeString && storeHours.length > 0) {
    const [y, m, d] = dateString.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayAbbr = daysMap[dateObj.getDay()];

    const storeDay = storeHours.find((s) => s.day_of_week === dayAbbr);
    if (!storeDay || !storeDay.is_open) {
      const fullDayNames = {
        'Sun': 'Sunday', 'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday',
        'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday'
      } as any;
      storeHourError = `The store is closed on ${fullDayNames[dayAbbr] || dayAbbr}.`;
    } else {
      const selectedMins = timeToMins(timeString);
      const openMins = timeToMins(storeDay.open_time);
      const closeMins = timeToMins(storeDay.close_time);
      if (selectedMins < openMins || selectedMins >= closeMins) {
        storeHourError = `Selected time is outside store hours (${formatTimeStr(storeDay.open_time)} - ${formatTimeStr(storeDay.close_time)}).`;
      }
    }
  }

  const selectedBarber = barbers.find((b) => b.id === Number(selectedBarberId));
  const shiftStart = selectedBarber ? selectedBarber.shift_start.slice(0, 5) : undefined;
  const shiftEnd = selectedBarber ? selectedBarber.shift_end.slice(0, 5) : undefined;

  let minTimeForSelect = shiftStart;
  if (dateString === todayStr) {
    if (!minTimeForSelect || currentTimeStr > minTimeForSelect) {
      minTimeForSelect = currentTimeStr;
    }
  }

  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (customerFilterTab === 'registered') {
      list = list.filter((c) => !!c.password_hash);
    } else if (customerFilterTab === 'unregistered') {
      list = list.filter((c) => !c.password_hash);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, customerFilterTab, searchQuery]);

  const handleSelectCustomer = (c: CustomerData) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name || '');
    setCustomerPhone(c.phone || '');
    setCustomerEmail(c.email || '');
    setIsSelectCustomerOpen(false);
  };

  const handleClearSelectedCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-card create-appointment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <h3>New Appointment</h3>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="admin-modal-form">
          {errorMsg && <div className="admin-form-error">{errorMsg}</div>}
          {storeHourError && <div className="admin-form-error">{storeHourError}</div>}

          <div className="form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Customer Information</span>
            {selectedCustomerId ? (
              <button
                type="button"
                className="btn-link-action"
                onClick={handleClearSelectedCustomer}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Clear Selected
              </button>
            ) : (
              <button
                type="button"
                className="btn-link-action"
                onClick={() => setIsSelectCustomerOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#016bffff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Registered Customers
              </button>
            )}
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label>Customer Name *</label>
              <input
                type="text"
                required
                placeholder="Jose Rizal"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={!!selectedCustomerId}
              />
            </div>
            <div className="form-group">
              <label>Customer Phone</label>
              <input
                type="tel"
                placeholder="e.g. 09171234567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                disabled={!!selectedCustomerId}
              />
            </div>
          </div>

          <div className="form-group-row">
            <div className="form-group">
              <label>Customer Email (Optional)</label>
              <input
                type="email"
                placeholder="e.g. client@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                disabled={!!selectedCustomerId}
              />
            </div>
            <div className="form-group">
              <label>Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Pending' | 'Confirmed')}
              >
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="form-section-title">Booking Schedule</div>

          <div className="form-group-row">
            <div className="form-group">
              <label>Service *</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                required
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (₱{s.price})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Assigned Barber *</label>
              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(Number(e.target.value))}
                required
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group-row">
            <CustomDatePicker
              label="Date"
              value={dateString}
              onChange={(val: string) => {
                setDateString(val);
                if (val === todayStr && timeString < currentTimeStr) {
                  let h = now.getHours();
                  let m = Math.ceil(now.getMinutes() / 15) * 15;
                  if (m >= 60) { h += 1; m = 0; }
                  setTimeString(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                }
              }}
              required
              minDate={todayStr}
            />

            <CustomTimeSelect
              label="Time Slot"
              value={timeString}
              onChange={(val: string) => setTimeString(val)}
              required
              minTime={minTimeForSelect}
              maxTime={shiftEnd}
            />
          </div>

          <div className="admin-modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || !!storeHourError}>
              {isSubmitting ? 'Saving...' : 'Save Appointment'}
            </button>
          </div>
        </form>
      </div>

      {isSelectCustomerOpen && (
        <div
          className="admin-modal-overlay"
          style={{ zIndex: 1100 }}
          onClick={() => setIsSelectCustomerOpen(false)}
        >
          <div
            className="admin-modal-card customer-selector-modal"
            style={{
              maxWidth: '450px',
              width: '90%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #cbd5e1' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Select Customer</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsSelectCustomerOpen(false)}
                style={{ fontSize: '1.4rem' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '16px 20px 8px 20px' }}>
              <div className="customer-search-box" style={{ padding: 0, marginBottom: '12px' }}>
                <div className="toolbar-search-box" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search name, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              {/* Segmented Tab Control Slider */}
              <div
                className="segmented-control-wrapper"
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '3px',
                }}
              >
                {/* Highlighted Sliding Pill */}
                <div
                  className="segmented-pill"
                  style={{
                    position: 'absolute',
                    top: '3px',
                    bottom: '3px',
                    left: `${pillStyle.left}px`,
                    width: `${pillStyle.width}px`,
                    background: '#0f172a',
                    borderRadius: '6px',
                    transition: 'left 0.4s cubic-bezier(0.65, 0, 0.35, 1), width 0.4s cubic-bezier(0.65, 0, 0.35, 1)',
                    zIndex: 1,
                  }}
                />

                {(['all', 'registered', 'unregistered'] as const).map((tab) => {
                  const isActive = customerFilterTab === tab;
                  const labelMap = {
                    all: 'All',
                    registered: 'Registered',
                    unregistered: 'Unregistered',
                  };

                  return (
                    <button
                      key={tab}
                      ref={(el) => { if (el) tabRefs.current[tab] = el; }}
                      type="button"
                      onClick={() => setCustomerFilterTab(tab)}
                      style={{
                        position: 'relative',
                        zIndex: 2,
                        background: 'transparent',
                        border: 'none',
                        padding: '6px 2px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: isActive ? '#ffffff' : '#0f172a',
                        cursor: 'pointer',
                        transition: 'color 0.4s cubic-bezier(0.65, 0, 0.35, 1)',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {labelMap[tab]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="customer-list-scroll"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px 20px 20px 20px',
                maxHeight: '400px',
              }}
            >
              {filteredCustomers.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  No customers found.
                </div>
              ) : (
                filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="customer-row-item"
                    onClick={() => handleSelectCustomer(c)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '4px',
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                        {c.name}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#64748b' }}>
                        #{c.id}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{c.phone}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
