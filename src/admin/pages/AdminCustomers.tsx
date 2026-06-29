import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { logActivity } from '../../utils/activityLogger';
import { AdminLayout } from '../components/AdminLayout';
import { CustomerConsentModal } from '../components/CustomerConsentModal';

import type { SystemUser } from '../../App';

export interface CustomerData {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  password_hash: string | null;
  notes: string | null;
}

export interface CustomerAppointment {
  id: number;
  appointment_date: string;
  status: string;
  barber: { name: string } | null;
  service: { name: string; price: number; duration_minutes: number; description: string | null } | null;
}

interface AdminCustomersProps {
  onLogout: () => void;
  systemUser?: SystemUser | null;
}

export const AdminCustomers: React.FC<AdminCustomersProps> = ({ onLogout, systemUser }) => {
  const isBarber = systemUser?.role === 'barber';
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tab filter state & sliding pill measurement
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
    updatePillPosition();
    window.addEventListener('resize', updatePillPosition);
    return () => window.removeEventListener('resize', updatePillPosition);
  }, [updatePillPosition]);

  // Editing state
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{ name: string; phone: string; email: string; password_hash: string }>({
    name: '',
    phone: '',
    email: '',
    password_hash: '',
  });

  // Notes state
  const [notesText, setNotesText] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);
  const [notesSavedFeedback, setNotesSavedFeedback] = useState<boolean>(false);

  // Appointments / Transaction History
  const [appointments, setAppointments] = useState<CustomerAppointment[]>([]);
  const [isLoadingAppts, setIsLoadingAppts] = useState<boolean>(false);
  const [expandedApptId, setExpandedApptId] = useState<number | null>(null);

  // Consent modal state
  const [consentModalState, setConsentModalState] = useState<{
    isOpen: boolean;
    actionType: 'edit' | 'delete';
  }>({
    isOpen: false,
    actionType: 'edit',
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email, password_hash, notes')
        .order('id', { ascending: true });

      if (error) throw error;
      const loadedCustomers = data || [];
      setCustomers(loadedCustomers);

      if (loadedCustomers.length > 0 && selectedCustomerId === null) {
        setSelectedCustomerId(loadedCustomers[0].id);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Sync edit form and notes state when selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      setEditForm({
        name: selectedCustomer.name || '',
        phone: selectedCustomer.phone || '',
        email: selectedCustomer.email || '',
        password_hash: selectedCustomer.password_hash || '',
      });
      setNotesText(selectedCustomer.notes || '');
      setIsEditing(false);
      setShowPassword(false);
      setErrorMessage(null);
    }
  }, [selectedCustomer]);

  // Fetch customer appointments for transaction history
  const fetchCustomerAppointments = useCallback(async (customerId: number) => {
    setIsLoadingAppts(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          barber:barbers ( name ),
          service:services ( name, price, duration_minutes, description )
        `)
        .eq('customer_id', customerId)
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      const formatted: CustomerAppointment[] = (data || []).map((item: any) => ({
        id: item.id,
        appointment_date: item.appointment_date,
        status: item.status,
        barber: Array.isArray(item.barber) ? item.barber[0] : item.barber,
        service: Array.isArray(item.service) ? item.service[0] : item.service,
      }));

      setAppointments(formatted);
    } catch (err) {
      console.error('Error fetching customer appointments:', err);
    } finally {
      setIsLoadingAppts(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerAppointments(selectedCustomerId);
    } else {
      setAppointments([]);
    }
  }, [selectedCustomerId, fetchCustomerAppointments]);

  // Filter customers by search and registration status
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
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, customerFilterTab, searchQuery]);

  // Save Notes Handler
  const handleSaveNotes = async () => {
    if (!selectedCustomer) return;
    setIsSavingNotes(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ notes: notesText.trim() || null })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      await logActivity(
        'customer_notes',
        'appointment',
        `Updated internal notes for customer ${selectedCustomer.name}`,
        systemUser?.username || 'Admin'
      );

      setCustomers((prev) =>
        prev.map((c) => (c.id === selectedCustomer.id ? { ...c, notes: notesText.trim() || null } : c))
      );
      setNotesSavedFeedback(true);
      setTimeout(() => setNotesSavedFeedback(false), 2500);
    } catch (err: any) {
      console.error('Error saving customer notes:', err);
      alert('Failed to save notes. Please try again.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Trigger Consent Modal for Edit
  const handleRequestSaveEdit = () => {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      setErrorMessage('Customer Name and Phone number are required.');
      return;
    }
    setErrorMessage(null);
    setConsentModalState({ isOpen: true, actionType: 'edit' });
  };

  // Trigger Consent Modal for Delete
  const handleRequestDelete = () => {
    setErrorMessage(null);
    setConsentModalState({ isOpen: true, actionType: 'delete' });
  };

  // Execute Confirmed Consent Action
  const handleExecuteConsentAction = async () => {
    if (!selectedCustomer) return;
    setIsSubmitting(true);
    try {
      if (consentModalState.actionType === 'edit') {
        const { error } = await supabase
          .from('customers')
          .update({
            name: editForm.name.trim(),
            phone: editForm.phone.trim(),
            email: editForm.email.trim() || null,
            password_hash: editForm.password_hash.trim() || null,
          })
          .eq('id', selectedCustomer.id);

        if (error) {
          if (error.code === '23505') {
            if (error.message.includes('phone')) {
              throw new Error('This phone number is already registered to another customer.');
            }
            if (error.message.includes('email')) {
              throw new Error('This email address is already registered to another customer.');
            }
          }
          throw error;
        }

        await logActivity(
          'customer_edit',
          'appointment',
          `Updated profile details & credentials for customer ${editForm.name.trim()}`,
          systemUser?.username || 'Admin'
        );

        await fetchCustomers();
        setIsEditing(false);
      } else if (consentModalState.actionType === 'delete') {
        const deletedName = selectedCustomer.name;
        const { error } = await supabase.from('customers').delete().eq('id', selectedCustomer.id);
        if (error) throw error;

        await logActivity(
          'customer_delete',
          'appointment',
          `Deleted customer account for ${deletedName}`,
          systemUser?.username || 'Admin'
        );

        const remaining = customers.filter((c) => c.id !== selectedCustomer.id);
        setCustomers(remaining);
        setSelectedCustomerId(remaining.length > 0 ? remaining[0].id : null);
      }
      setConsentModalState({ isOpen: false, actionType: 'edit' });
    } catch (err: any) {
      console.error('Consent action error:', err);
      setErrorMessage(err.message || 'Action failed. Please try again.');
      setConsentModalState({ isOpen: false, actionType: 'edit' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle expanded card for transaction history
  const toggleExpandAppt = (id: number) => {
    setExpandedApptId((prev) => (prev === id ? null : id));
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return { backgroundColor: 'rgba(74, 158, 255, 0.12)', color: '#4a9eff', border: '1px solid rgba(74, 158, 255, 0.3)' };
      case 'Pending':
        return { backgroundColor: 'rgba(245, 166, 35, 0.12)', color: '#f5a623', border: '1px solid rgba(245, 166, 35, 0.3)' };
      case 'Completed':
        return { backgroundColor: 'rgba(62, 207, 142, 0.12)', color: '#3ecf8e', border: '1px solid rgba(62, 207, 142, 0.3)' };
      case 'Cancelled':
        return { backgroundColor: 'rgba(255, 77, 79, 0.12)', color: '#ff4d4f', border: '1px solid rgba(255, 77, 79, 0.3)' };
      default:
        return { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.15)' };
    }
  };

  return (
    <AdminLayout onLogout={onLogout} systemUser={systemUser} activeTab="customers">
      <div className="services-page-container customer-page-container">
        {/* Left Customer Directory Sidebar */}
        <aside className="services-cat-sidebar customer-sidebar">
          <div className="cat-sidebar-header">
            <h2>Customers</h2>
            <span className="cat-count-badge">{customers.length}</span>
          </div>

          <div className="customer-search-box" style={{ padding: '0 16px 12px 16px' }}>
            <div className="toolbar-search-box" style={{ width: '100%' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%' }}
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
              margin: '0 16px 16px 16px',
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

          <div className="cat-group customer-list-scroll">
            {isLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                Loading directory...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No customers found.
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  className={`cat-item-row customer-row-item ${selectedCustomerId === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedCustomerId(c.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '12px 16px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span className="cat-name" style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                      {c.name}
                    </span>
                    <span className="cust-id-pill" style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#64748b' }}>
                      #{c.id}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{c.phone}</span>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Content Area: Customer Details */}
        <main className="services-main-panel customer-main-panel">
          {selectedCustomer ? (
            <div className="customer-detail-viewport">
              {/* Top Banner & Action Controls */}
              <div className="services-panel-header customer-header-toolbar">
                <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#0f172a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '1.2rem',
                    }}
                  >
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="services-panel-title" style={{ fontSize: '1.5rem', marginBottom: '2px' }}>
                      {selectedCustomer.name}
                    </h1>
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Registered Client &bull; ID #{selectedCustomer.id}
                    </span>
                  </div>
                </div>

                {!isBarber && (
                  <div className="header-right" style={{ display: 'flex', gap: '10px' }}>
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setIsEditing(false)}
                          style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleRequestSaveEdit}
                          style={{ padding: '8px 18px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, background: '#0f172a' }}
                        >
                          Save Changes
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setIsEditing(true)}
                          style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit Info
                        </button>
                        <button
                          type="button"
                          className="btn-danger-link"
                          onClick={handleRequestDelete}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            color: '#ef4444',
                            border: '1px solid #fca5a5',
                            background: '#fef2f2',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {errorMessage && (
                <div
                  style={{
                    margin: '16px 24px 0 24px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                    fontSize: '0.88rem',
                  }}
                >
                  {errorMessage}
                </div>
              )}

              {/* Grid sections for Info, Notes, and History */}
              <div className="customer-sections-wrapper" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* 1. Customer Information & Security Card */}
                <section className="admin-card-block" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>
                    Contact &amp; Account Info
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Full Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          className="form-input"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.98rem', fontWeight: 600, color: '#1e293b' }}>{selectedCustomer.name}</span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Phone Number</label>
                      {isEditing ? (
                        <input
                          type="text"
                          className="form-input"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.98rem', fontWeight: 600, color: '#1e293b' }}>{selectedCustomer.phone}</span>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Email Address</label>
                      {isEditing ? (
                        <input
                          type="email"
                          className="form-input"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="None provided"
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                        />
                      ) : (
                        <span style={{ fontSize: '0.98rem', fontWeight: 500, color: selectedCustomer.email ? '#1e293b' : '#94a3b8' }}>
                          {selectedCustomer.email || 'None provided'}
                        </span>
                      )}
                    </div>

                    {!isBarber && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>Account Password</label>
                        {isEditing ? (
                          <div style={{ position: 'relative', width: '100%' }}>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              className="form-input"
                              value={editForm.password_hash}
                              onChange={(e) => setEditForm({ ...editForm, password_hash: e.target.value })}
                              placeholder="Set new password"
                              style={{ width: '100%', padding: '8px 36px 8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}
                              title={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                  <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.98rem', fontFamily: 'monospace', color: '#475569' }}>
                              {showPassword ? (selectedCustomer.password_hash || '123456') : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px', display: 'flex', alignItems: 'center' }}
                              title={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                  <line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* 2. Customer Notes Card */}
                <section className="admin-card-block" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      Barber &amp; Admin Notes
                    </h3>
                    {notesSavedFeedback && (
                      <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>
                        &check; Notes saved successfully
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '12px' }}>
                    Add internal notes regarding customer haircut preferences, allergies, or special requests.
                  </p>
                  <textarea
                    rows={3}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Type notes here (e.g. prefers low skin fade, allergic to eucalyptus oil)..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      outline: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '6px',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: isSavingNotes ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isSavingNotes ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </section>

                {/* 3. Transaction & Appointment History Card Section */}
                <section className="admin-card-block" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      Transaction &amp; Booking History
                    </h3>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{appointments.length} record(s)</span>
                  </div>

                  {isLoadingAppts ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                      Loading appointment history...
                    </div>
                  ) : appointments.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0', borderRadius: '8px' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>No past or upcoming transactions found for this customer.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {appointments.map((appt) => {
                        const isExpanded = expandedApptId === appt.id;
                        const dateObj = new Date(appt.appointment_date);
                        const dateFormatted = dateObj.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        });
                        const timeFormatted = dateObj.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const refCode = `FBS-${100000 + appt.id}`;

                        return (
                          <div
                            key={appt.id}
                            className={`transaction-card-spring ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => toggleExpandAppt(appt.id)}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              background: isExpanded ? '#f8fafc' : '#ffffff',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                            }}
                          >
                            {/* Card Main Bar */}
                            <div
                              style={{
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                                    {appt.service?.name || 'Haircut Service'}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontWeight: 600,
                                      ...getStatusBadgeStyle(appt.status),
                                    }}
                                  >
                                    {appt.status}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '16px' }}>
                                  <span>{dateFormatted} at {timeFormatted}</span>
                                  <span>Barber: {appt.barber?.name || 'Staff'}</span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ textAlign: 'right' }}>
                                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                                    &#8369;{appt.service?.price ? appt.service.price.toFixed(2) : '0.00'}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94a3b8' }}>
                                    {refCode}
                                  </span>
                                </div>
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#64748b"
                                  strokeWidth="2"
                                  style={{
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.3s ease',
                                  }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </div>
                            </div>

                            {/* CSS Grid Animated Height Container (Spring effect via CSS) */}
                            <div className="transaction-expand-grid">
                              <div className="transaction-expand-inner">
                                <div
                                  style={{
                                    padding: '16px 20px 20px 20px',
                                    borderTop: '1px solid #e2e8f0',
                                    background: '#ffffff',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                    gap: '16px',
                                  }}
                                >
                                  <div>
                                    <span className="secondary-fade-text" style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>
                                      Reference Code
                                    </span>
                                    <strong className="secondary-fade-text" style={{ fontSize: '0.92rem', fontFamily: 'monospace', color: '#0f172a' }}>
                                      {refCode}
                                    </strong>
                                  </div>
                                  <div>
                                    <span className="secondary-fade-text" style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>
                                      Service Duration
                                    </span>
                                    <span className="secondary-fade-text" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155' }}>
                                      {appt.service?.duration_minutes || 30} mins
                                    </span>
                                  </div>
                                  <div>
                                    <span className="secondary-fade-text" style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>
                                      Assigned Stylist
                                    </span>
                                    <span className="secondary-fade-text" style={{ fontSize: '0.92rem', fontWeight: 600, color: '#334155' }}>
                                      {appt.barber?.name || 'Unassigned'}
                                    </span>
                                  </div>
                                  {appt.service?.description && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                      <span className="secondary-fade-text" style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: '2px' }}>
                                        Service Description
                                      </span>
                                      <p className="secondary-fade-text" style={{ fontSize: '0.88rem', color: '#475569', margin: 0, lineHeight: '1.4' }}>
                                        {appt.service.description}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              Select a customer from the left directory to view details.
            </div>
          )}
        </main>
      </div>

      <CustomerConsentModal
        isOpen={consentModalState.isOpen}
        actionType={consentModalState.actionType}
        customerName={selectedCustomer?.name || ''}
        isSubmitting={isSubmitting}
        onConfirm={handleExecuteConsentAction}
        onClose={() => setConsentModalState({ ...consentModalState, isOpen: false })}
      />
    </AdminLayout>
  );
};
