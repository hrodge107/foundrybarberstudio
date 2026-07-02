import React, { useState, useEffect } from 'react';
import { getCustomerAppointments, cancelAppointment, updateCustomerProfile } from '../../../services/profile';
import type { CustomerUser } from '../../../../shared/types/user';
import type { CustomerAppointment as AppointmentDetail } from '../../../../shared/types/appointment';

interface CustomerProfileProps {
  customerUser: CustomerUser;
  onNavigate: (hash: string) => void;
  onUpdateCustomerUser: (updatedUser: CustomerUser) => void;
}

type TabType = 'profile' | 'appointments' | 'history';

export const CustomerProfile: React.FC<CustomerProfileProps> = ({ customerUser, onNavigate, onUpdateCustomerUser }) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [expandedApptId, setExpandedApptId] = useState<number | null>(null);
  const [apptToCancel, setApptToCancel] = useState<AppointmentDetail | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<{ name: string; phone: string; email: string }>({
    name: customerUser.name,
    phone: customerUser.phone,
    email: customerUser.email || '',
  });
  const [showSaveConfirm, setShowSaveConfirm] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; email?: string }>({});

  useEffect(() => {
    setFormData({
      name: customerUser.name,
      phone: customerUser.phone,
      email: customerUser.email || '',
    });
    setFieldErrors({});
  }, [customerUser]);

  const validateForm = () => {
    const errors: { name?: string; phone?: string; email?: string } = {};
    const trimmedName = formData.name.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedEmail = formData.email.trim();

    if (!trimmedName) {
      errors.name = 'Full name is required.';
    } else if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters long.';
    }

    if (!trimmedPhone) {
      errors.phone = 'Phone number is required.';
    } else if (!/^09\d{9}$/.test(trimmedPhone)) {
      errors.phone = 'Must be a valid 11-digit Philippine phone number (e.g. 09171234567).';
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Must be a valid email address.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAttemptSave = () => {
    setSaveError(null);
    if (validateForm()) {
      setShowSaveConfirm(true);
    }
  };

  const fetchCustomerAppointments = async () => {
    setIsLoading(true);
    try {
      const data = await getCustomerAppointments(customerUser.id);
      setAppointments(data as AppointmentDetail[]);
    } catch (e) {
      console.error('Error fetching customer appointments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerAppointments();
  }, [customerUser.id]);

  const handleCancelAppointment = async () => {
    if (!apptToCancel) return;
    setIsCancelling(true);
    try {
      await cancelAppointment(apptToCancel.id);

      await fetchCustomerAppointments();
      setApptToCancel(null);
    } catch (e) {
      console.error('Error cancelling appointment:', e);
      alert('Failed to cancel appointment. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!validateForm()) {
      setShowSaveConfirm(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const updated = await updateCustomerProfile(
        customerUser.id,
        formData.name,
        formData.phone,
        formData.email
      );
      onUpdateCustomerUser(updated);
      setIsEditing(false);
      setShowSaveConfirm(false);
    } catch (e: any) {
      console.error('Error updating profile:', e);
      setSaveError(e.message || 'Failed to update profile. Please try again.');
      setShowSaveConfirm(false);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedApptId(expandedApptId === id ? null : id);
  };

  // Filter current vs history
  const currentAppointments = appointments.filter(
    (a) => a.status === 'Pending' || a.status === 'Confirmed'
  );
  const historyAppointments = appointments.filter(
    (a) => a.status === 'Completed' || a.status === 'Cancelled'
  );

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return { backgroundColor: 'rgba(255, 255, 255, 0.16)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.3)' };
      case 'Pending':
        return { backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#9a9ab0', border: '1px solid rgba(255, 255, 255, 0.15)' };
      case 'Completed':
        return { backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#f5f5f7', border: '1px solid rgba(255, 255, 255, 0.25)' };
      case 'Cancelled':
        return { backgroundColor: 'rgba(255, 255, 255, 0.04)', color: '#666666', border: '1px solid rgba(255, 255, 255, 0.08)' };
      default:
        return { backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)' };
    }
  };

  return (
    <div className="customer-profile-layout" style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f5f5f7', marginBottom: '6px' }}>
          Customer Dashboard
        </h1>
        <p style={{ color: '#9a9ab0', fontSize: '0.95rem' }}>
          Welcome back, {customerUser.name}
        </p>
      </div>

      <div
        className="profile-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Sidebar Navigation */}
        <aside
          style={{
            backgroundColor: 'rgba(18, 18, 20, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'profile' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeTab === 'profile' ? '#f5f5f7' : '#9a9ab0',
              fontWeight: activeTab === 'profile' ? 600 : 400,
              fontSize: '0.95rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
          >
            <i className="bi bi-person-badge" style={{ fontSize: '1.1rem' }}></i>
            Profile Information
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'appointments' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeTab === 'appointments' ? '#f5f5f7' : '#9a9ab0',
              fontWeight: activeTab === 'appointments' ? 600 : 400,
              fontSize: '0.95rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <i className="bi bi-calendar-event" style={{ fontSize: '1.1rem' }}></i>
              <span>Current Appointments</span>
            </div>
            {currentAppointments.length > 0 && (
              <span
                style={{
                  backgroundColor: '#ffffff',
                  color: '#0e0e10',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  padding: '2px 8px',
                }}
              >
                {currentAppointments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'history' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
              color: activeTab === 'history' ? '#f5f5f7' : '#9a9ab0',
              fontWeight: activeTab === 'history' ? 600 : 400,
              fontSize: '0.95rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
            }}
          >
            <i className="bi bi-clock-history" style={{ fontSize: '1.1rem' }}></i>
            Booking History
          </button>
        </aside>

        {/* Main Content Area */}
        <main
          style={{
            backgroundColor: 'rgba(18, 18, 20, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '28px',
            minHeight: '400px',
          }}
        >
          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>
                  Profile Details
                </h2>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        name: customerUser.name,
                        phone: customerUser.phone,
                        email: customerUser.email || '',
                      });
                      setSaveError(null);
                      setFieldErrors({});
                      setIsEditing(true);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      color: '#f5f5f7',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <i className="bi bi-pencil"></i> Edit Profile
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setSaveError(null);
                        setFieldErrors({});
                      }}
                      style={{
                        padding: '8px 14px',
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        color: '#f5f5f7',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAttemptSave}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#0e0e10',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>

              {saveError && (
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#f5f5f7',
                    fontSize: '0.9rem',
                    marginBottom: '16px',
                  }}
                >
                  <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '8px' }}></i>
                  {saveError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(30, 30, 36, 0.45)',
                    padding: '16px',
                    borderRadius: '8px',
                    border: fieldErrors.name ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <label style={{ fontSize: '0.8rem', color: '#9a9ab0', display: 'block', marginBottom: '4px' }}>
                    Full Name
                  </label>
                  {!isEditing ? (
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f5f5f7' }}>
                      {customerUser.name}
                    </span>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: 'rgba(14, 14, 16, 0.9)',
                          border: fieldErrors.name ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          color: '#f5f5f7',
                          fontSize: '1rem',
                          outline: 'none',
                          marginTop: '4px',
                        }}
                        placeholder="Jose Rizal"
                      />
                      {fieldErrors.name && (
                        <span style={{ fontSize: '0.8rem', color: '#9a9ab0', marginTop: '4px', display: 'block' }}>
                          <i className="bi bi-exclamation-circle" style={{ marginRight: '4px' }}></i>
                          {fieldErrors.name}
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(30, 30, 36, 0.45)',
                    padding: '16px',
                    borderRadius: '8px',
                    border: fieldErrors.phone ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <label style={{ fontSize: '0.8rem', color: '#9a9ab0', display: 'block', marginBottom: '4px' }}>
                    Phone Number
                  </label>
                  {!isEditing ? (
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f5f5f7' }}>
                      {customerUser.phone}
                    </span>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: undefined });
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: 'rgba(14, 14, 16, 0.9)',
                          border: fieldErrors.phone ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          color: '#f5f5f7',
                          fontSize: '1rem',
                          outline: 'none',
                          marginTop: '4px',
                        }}
                        placeholder="09171234567"
                      />
                      {fieldErrors.phone && (
                        <span style={{ fontSize: '0.8rem', color: '#9a9ab0', marginTop: '4px', display: 'block' }}>
                          <i className="bi bi-exclamation-circle" style={{ marginRight: '4px' }}></i>
                          {fieldErrors.phone}
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(30, 30, 36, 0.45)',
                    padding: '16px',
                    borderRadius: '8px',
                    border: fieldErrors.email ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <label style={{ fontSize: '0.8rem', color: '#9a9ab0', display: 'block', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  {!isEditing ? (
                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: customerUser.email ? '#f5f5f7' : '#666666' }}>
                      {customerUser.email || 'Not provided'}
                    </span>
                  ) : (
                    <>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          backgroundColor: 'rgba(14, 14, 16, 0.9)',
                          border: fieldErrors.email ? '1px solid rgba(255, 255, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '6px',
                          color: '#f5f5f7',
                          fontSize: '1rem',
                          outline: 'none',
                          marginTop: '4px',
                        }}
                        placeholder="Enter email address"
                      />
                      {fieldErrors.email && (
                        <span style={{ fontSize: '0.8rem', color: '#9a9ab0', marginTop: '4px', display: 'block' }}>
                          <i className="bi bi-exclamation-circle" style={{ marginRight: '4px' }}></i>
                          {fieldErrors.email}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPOINTMENTS */}
          {activeTab === 'appointments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f5f5f7', margin: 0 }}>
                  Current Appointments
                </h2>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => onNavigate('#services')}
                  style={{ padding: '8px 16px', fontSize: '0.85rem', color: '#f5f5f7', backgroundColor: '#232222ff', border: '0.5px solid #9a9ab0' }}
                >
                  <i className="bi bi-pencil" style={{ marginRight: '6px' }}></i> Book New
                </button>
              </div>

              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9a9ab0' }}>Loading appointments...</div>
              ) : currentAppointments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 0', color: '#9a9ab0' }}>
                  <i className="bi bi-calendar-x" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px', opacity: 0.5 }}></i>
                  <p style={{ margin: 0, fontSize: '1rem' }}>No active appointments found.</p>
                  <button
                    type="button"
                    onClick={() => onNavigate('#services')}
                    style={{
                      marginTop: '14px',
                      background: 'none',
                      border: 'none',
                      color: '#f5f5f7',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      textDecoration: 'underline',
                    }}
                  >
                    Schedule a haircut now
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {currentAppointments.map((appt) => {
                    const isExpanded = expandedApptId === appt.id;
                    const dateObj = new Date(appt.appointment_date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const formattedTime = dateObj.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const refCode = `FBS-${100000 + appt.id}`;

                    return (
                      <div
                        key={appt.id}
                        style={{
                          backgroundColor: 'rgba(30, 30, 36, 0.45)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {/* Header Row */}
                        <div
                          onClick={() => toggleExpand(appt.id)}
                          style={{
                            padding: '16px 20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f5f5f7' }}>
                                {appt.service?.name || 'Grooming Service'}
                              </span>
                              <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '4px', ...getStatusBadgeStyle(appt.status) }}>
                                {appt.status}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#9a9ab0', display: 'flex', gap: '14px' }}>
                              <span><i className="bi bi-calendar-check" style={{ marginRight: '4px' }}></i>{formattedDate} at {formattedTime}</span>
                              <span><i className="bi bi-person-badge" style={{ marginRight: '4px' }}></i>{appt.barber?.name}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#9a9ab0', fontFamily: 'monospace' }}>{refCode}</span>
                            <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`} style={{ color: '#9a9ab0' }}></i>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div
                            style={{
                              padding: '20px',
                              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                              backgroundColor: 'rgba(14, 14, 16, 0.5)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '16px',
                            }}
                          >
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div>
                                <span style={{ fontSize: '0.8rem', color: '#9a9ab0', display: 'block' }}>Reference Code</span>
                                <strong style={{ color: '#f5f5f7', fontSize: '1rem', fontFamily: 'monospace' }}>{refCode}</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.8rem', color: '#9a9ab0', display: 'block' }}>Estimated Price</span>
                                <strong style={{ color: '#f5f5f7', fontSize: '1rem' }}>₱{appt.service?.price.toFixed(2)}</strong>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.8rem', color: '#9a9ab0', display: 'block' }}>Duration</span>
                                <span style={{ color: '#f5f5f7' }}>{appt.service?.duration_minutes} mins</span>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.8rem', color: '#9a9ab0', display: 'block' }}>Assigned Barber</span>
                                <span style={{ color: '#f5f5f7' }}>{appt.barber?.name}</span>
                              </div>
                            </div>

                            {appt.service?.description && (
                              <div>
                                <span style={{ fontSize: '0.8rem', color: '#9a9ab0', display: 'block', marginBottom: '2px' }}>Service Details</span>
                                <p style={{ fontSize: '0.88rem', color: '#9a9ab0', margin: 0, lineHeight: 1.4 }}>{appt.service.description}</p>
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setApptToCancel(appt);
                                }}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  borderRadius: '6px',
                                  color: '#f5f5f7',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <i className="bi bi-x-circle"></i> Cancel Appointment
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'history' && (
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '20px', color: '#f5f5f7' }}>
                Booking History
              </h2>

              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9a9ab0' }}>Loading history...</div>
              ) : historyAppointments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 0', color: '#9a9ab0' }}>
                  <i className="bi bi-journal-check" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px', opacity: 0.5 }}></i>
                  <p style={{ margin: 0, fontSize: '1rem' }}>No past appointment history.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {historyAppointments.map((appt) => {
                    const dateObj = new Date(appt.appointment_date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const formattedTime = dateObj.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const refCode = `FBS-${100000 + appt.id}`;

                    return (
                      <div
                        key={appt.id}
                        style={{
                          backgroundColor: 'rgba(30, 30, 36, 0.45)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '16px 20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#f5f5f7' }}>
                              {appt.service?.name || 'Grooming Service'}
                            </span>
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', ...getStatusBadgeStyle(appt.status) }}>
                              {appt.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#9a9ab0', display: 'flex', gap: '14px' }}>
                            <span>{formattedDate} at {formattedTime}</span>
                            <span>Barber: {appt.barber?.name}</span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f5f5f7' }}>
                            ₱{appt.service?.price.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#9a9ab0', fontFamily: 'monospace' }}>
                            {refCode}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* CANCELLATION CONFIRMATION MODAL */}
      {apptToCancel && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div
            style={{
              backgroundColor: '#0e0e10',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '28px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
              color: '#f5f5f7',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 0, marginBottom: '12px', color: '#f5f5f7' }}>
              Confirm Cancellation
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#9a9ab0', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to cancel your appointment for{' '}
              <strong style={{ color: '#f5f5f7' }}>{apptToCancel.service?.name}</strong> on{' '}
              <strong style={{ color: '#f5f5f7' }}>
                {new Date(apptToCancel.appointment_date).toLocaleDateString()}
              </strong>
              ? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setApptToCancel(null)}
                disabled={isCancelling}
                style={{
                  padding: '10px 18px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#f5f5f7',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Keep Appointment
              </button>
              <button
                type="button"
                onClick={handleCancelAppointment}
                disabled={isCancelling}
                style={{
                  padding: '10px 18px',
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  opacity: isCancelling ? 0.7 : 1,
                }}
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE SAVE CONFIRMATION MODAL */}
      {showSaveConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div
            style={{
              backgroundColor: '#0e0e10',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '28px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
              color: '#f5f5f7',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 0, marginBottom: '12px', color: '#f5f5f7' }}>
              Confirm Profile Update
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#9a9ab0', lineHeight: 1.5, marginBottom: '16px' }}>
              Are you sure you want to update your profile information with the following details?
            </p>

            <div
              style={{
                backgroundColor: 'rgba(30, 30, 36, 0.45)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div><strong style={{ color: '#9a9ab0' }}>Name:</strong> <span style={{ color: '#f5f5f7' }}>{formData.name}</span></div>
              <div><strong style={{ color: '#9a9ab0' }}>Phone:</strong> <span style={{ color: '#f5f5f7' }}>{formData.phone}</span></div>
              <div><strong style={{ color: '#9a9ab0' }}>Email:</strong> <span style={{ color: '#f5f5f7' }}>{formData.email || 'None'}</span></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowSaveConfirm(false)}
                disabled={isSaving}
                style={{
                  padding: '10px 18px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#f5f5f7',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSaving}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#0e0e10',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
