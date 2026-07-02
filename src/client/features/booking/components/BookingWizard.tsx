import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../shared/services/supabaseClient';
import type { ExistingAppointment } from '../../../../shared/types/appointment';
import { Calendar } from './Calendar';
import { SidebarSummary } from './SidebarSummary';
import { SidebarPlaceholder } from './SidebarPlaceholder';
import { ConfirmationModal } from './ConfirmationModal';
import { BookingCompletionModal } from './BookingCompletionModal';
import { generateAvailableSlots } from '../../../../utils/bookingRules';
import type { Service } from '../../../../shared/types/service';
import type { Barber } from '../../../../shared/types/barber';
import type { StoreHour } from '../../../../shared/types/store';
import type { CustomerUser } from '../../../../shared/types/user';
import '../../../styles/BookingWizard.css';

interface BookingWizardProps {
  services: Service[];
  barbers: Barber[];
  storeHours: StoreHour[];
  customerUser?: CustomerUser | null;
  onNavigate?: (hash: string) => void;
  onSaveAppointment: (data: {
    service: Service;
    barber: Barber;
    date: Date;
    time: string;
    fullName: string;
    phone: string;
    email: string;
    emailReminder: boolean;
  }) => Promise<string | null>;
}

const BarberProfileSVG: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const HaircutSVG: React.FC = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <line x1="20" y1="4" x2="8.12" y2="15.88" />
    <line x1="14.47" y1="14.48" x2="20" y2="20" />
    <line x1="8.12" y1="8.12" x2="12" y2="12" />
  </svg>
);

export const BookingWizard: React.FC<BookingWizardProps> = ({
  services,
  barbers,
  storeHours,
  customerUser,
  onNavigate,
  onSaveAppointment,
}) => {
  const [step, setStep] = useState<'services' | 'staff' | 'time' | 'details'>('services');

  // Selections
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Client details
  const [clientName, setClientName] = useState<string>(customerUser?.name || '');
  const [clientPhone, setClientPhone] = useState<string>(customerUser?.phone || '');
  const [clientEmail, setClientEmail] = useState<string>(customerUser?.email || '');

  React.useEffect(() => {
    if (customerUser) {
      setClientName(customerUser.name || '');
      setClientPhone(customerUser.phone || '');
      setClientEmail(customerUser.email || '');
    }
  }, [customerUser]);

  // UI States
  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [completedBooking, setCompletedBooking] = useState<{
    bookingId: string;
    serviceName: string;
    barberName: string;
    date: Date;
    time: string;
    price: number;
  } | null>(null);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; email?: string }>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Existing appointments for selected barber to compute slot collisions
  const [existingAppointments, setExistingAppointments] = useState<ExistingAppointment[]>([]);

  const fetchBarberAppointments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, barber_id, appointment_date, status, service:services(duration_minutes)')
        .in('status', ['Pending', 'Confirmed']);

      if (error) {
        console.error('Error fetching barber appointments:', error);
      } else if (data) {
        const formatted: ExistingAppointment[] = data.map((a: any) => ({
          id: a.id,
          barber_id: a.barber_id,
          appointment_date: a.appointment_date,
          status: a.status as 'Pending' | 'Confirmed',
          duration_minutes: (a.service as any)?.duration_minutes || 0,
        }));
        setExistingAppointments(formatted);
      }
    } catch (err) {
      console.error('Failed fetching appointments for slots:', err);
    }
  }, []);

  useEffect(() => {
    if (step === 'time' && selectedStaff) {
      fetchBarberAppointments();
    }
  }, [step, selectedStaff, fetchBarberAppointments]);

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const cat = service.category_name;
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const toggleServiceCard = (id: number) => {
    setExpandedServiceId(prev => prev === id ? null : id);
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setStep('staff');
  };

  const handleSelectStaff = (barber: Barber) => {
    setSelectedStaff(barber);
    setStep('time');
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(''); // Reset time when date changes
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'staff') {
      setSelectedService(null);
      setStep('services');
    } else if (step === 'time') {
      setSelectedStaff(null);
      setStep('staff');
    } else if (step === 'details') {
      setSelectedTime('');
      setStep('time');
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!clientName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    const cleanPhone = clientPhone.trim();
    const cleanEmail = clientEmail.trim();

    if (!customerUser) {
      if (!cleanPhone && !cleanEmail) {
        newErrors.phone = "Please provide either a phone number or an email address";
      } else {
        if (cleanPhone && !/^09\d{9}$/.test(cleanPhone)) {
          newErrors.phone = "Please enter a valid 11-digit number starting with 09";
        }
        if (cleanEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
          newErrors.email = "Invalid email address format";
        }
      }
    } else {
      if (cleanEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
        newErrors.email = "Invalid email address format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  const handleFinalConfirm = async () => {
    if (!selectedService || !selectedStaff || !selectedTime) return;

    setShowConfirmation(false);
    setIsSaving(true);
    try {
      const bookingId = await onSaveAppointment({
        service: selectedService,
        barber: selectedStaff,
        date: selectedDate,
        time: selectedTime,
        fullName: clientName,
        phone: clientPhone,
        email: clientEmail,
        emailReminder: false,
      });

      if (bookingId) {
        setCompletedBooking({
          bookingId,
          serviceName: selectedService.name,
          barberName: selectedStaff.name,
          date: selectedDate,
          time: selectedTime,
          price: Number(selectedService.price),
        });
      } else {
        alert("Failed to save appointment. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred while saving booking.");
    } finally {
      setIsSaving(false);
    }
  };

  // Get filtered time slots dynamically based on barber schedule & appointments
  const getAvailableSlots = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(selectedDate);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate < today) {
      return []; // past dates have no slots
    }

    if (!selectedStaff || !selectedService) {
      return [];
    }

    return generateAvailableSlots(
      selectedStaff,
      selectedService,
      selectedDate,
      existingAppointments,
      storeHours
    );
  };

  const timeSlots = getAvailableSlots();

  const formatHeaderDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="booking-layout">
      {/* Left Column: Form / Steps */}
      <div className="booking-steps-column">

        {/* Step 1: Services */}
        {step === 'services' && (
          <div className="step-panel animate-fade-in">
            <div className="step-header">
              <h2 className="step-title">Select a service</h2>
            </div>

            <div className="categories-list">
              {Object.entries(servicesByCategory).map(([categoryName, catServices]) => (
                <div key={categoryName} className="category-card">
                  <div className="category-header">
                    <h3>{categoryName}</h3>
                  </div>
                  <div className="services-list">
                    {catServices.map((service) => (
                      <div
                        key={service.id}
                        className={`service-card-item${expandedServiceId === service.id ? ' expanded' : ''}`}
                        onClick={() => toggleServiceCard(service.id)}
                      >
                        {/* Collapsed View */}
                        <div className="service-card-collapsed-view">
                          <div className="service-card-img-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                            {service.image_url ? (
                              <img src={service.image_url} alt={service.name} className="service-card-img" />
                            ) : (
                              <HaircutSVG />
                            )}
                          </div>
                          <div className="service-card-info">
                            <h4 className="service-name">{service.name}</h4>
                            <div className="service-meta">
                              <span className="service-duration"><i className="bi bi-clock"></i> {service.duration_minutes} min</span>
                              <span className="service-price">₱{Number(service.price).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="service-card-toggle">
                            <i className="bi bi-chevron-down toggle-icon"></i>
                          </div>
                        </div>

                        {/* Expanded View */}
                        <div className="service-card-expanded-view">
                          <div className="service-card-expanded-left" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                            {service.image_url ? (
                              <img src={service.image_url} alt={service.name} className="service-card-expanded-img" />
                            ) : (
                              <HaircutSVG />
                            )}
                          </div>
                          <div className="service-card-expanded-right">
                            <h4 className="service-expanded-name">{service.name}</h4>
                            <div className="service-expanded-meta">
                              <span className="badge-duration"><i className="bi bi-clock"></i> {service.duration_minutes} min</span>
                              <span className="badge-price">₱{Number(service.price).toFixed(2)}</span>
                            </div>
                            <p className="service-expanded-desc">{service.description}</p>
                            <div className="service-expanded-action">
                              <button
                                type="button"
                                className="btn-book"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectService(service);
                                }}
                              >
                                Book Now
                              </button>
                            </div>
                          </div>
                          <div className="service-card-expanded-close">
                            <i className="bi bi-chevron-up toggle-icon"></i>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {services.length === 0 && (
                <div className="empty-state">
                  <i className="bi bi-slash-circle"></i>
                  <p>No service categories found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Staff */}
        {step === 'staff' && (
          <div className="step-panel animate-fade-in">
            <div className="step-header">
              <button type="button" className="btn-back" onClick={handleBack}>
                <i className="bi bi-arrow-left"></i> Back
              </button>
              <h2 className="step-title">Select a team member</h2>
            </div>

            <div className="wizard-staff-grid">
              {barbers.map((barber) => {
                return (
                  <div key={barber.id} className="wizard-staff-card">
                    <div className="wizard-staff-avatar-container">
                      {barber.image_url ? (
                        <img src={barber.image_url} alt={barber.name} className="wizard-staff-avatar" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                          <BarberProfileSVG />
                        </div>
                      )}
                    </div>
                    <div className="wizard-staff-info">
                      <h4 className="wizard-staff-name">{barber.name}</h4>
                    </div>
                    <button
                      type="button"
                      className="btn-select-wizard-staff"
                      onClick={() => handleSelectStaff(barber)}
                    >
                      Select
                    </button>
                  </div>
                );
              })}
              {barbers.length === 0 && (
                <div className="empty-state">
                  <i className="bi bi-people"></i>
                  <p>No team members available.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Date & Time */}
        {step === 'time' && (
          <div className="step-panel animate-fade-in">
            <div className="step-header">
              <button type="button" className="btn-back" onClick={handleBack}>
                <i className="bi bi-arrow-left"></i> Back
              </button>
              <h2 className="step-title">Select a date & time</h2>
            </div>

            <div className="datetime-picker-container">
              <div className="calendar-wrapper">
                <Calendar selectedDate={selectedDate} onSelectDate={handleSelectDate} storeHours={storeHours} />
                <div className="timezone-info">
                  <i className="bi bi-globe"></i> Manila (GMT+8)
                </div>
              </div>

              <div className="time-slots-wrapper">
                <h3 className="slots-header-date">
                  {formatHeaderDate(selectedDate)}
                </h3>
                <div className="time-slots-grid">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className="btn-time-slot"
                      onClick={() => handleSelectTime(slot)}
                    >
                      {slot}
                    </button>
                  ))}
                  {timeSlots.length === 0 && (
                    <div className="empty-state-slots">
                      <i className="bi bi-calendar-x"></i>
                      <p>No slots available for this day.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Details */}
        {step === 'details' && (
          <div className="step-panel animate-fade-in">
            <div className="step-header">
              <button type="button" className="btn-back" onClick={handleBack}>
                <i className="bi bi-arrow-left"></i> Back
              </button>
              <h2 className="step-title">Your details</h2>
            </div>

            {customerUser ? (
              <div className="logged-in-notice">
                <i className="bi bi-person-check-fill"></i>
                <span>Logged in as <strong>{customerUser.name || customerUser.email}</strong>. Your details are automatically filled.</span>
              </div>
            ) : (
              <div className="login-prompt-block">
                <span className="prompt-text">Have an account?</span>
                <button type="button" className="btn-login-alt" onClick={() => onNavigate && onNavigate('#/login')}>
                  Login
                </button>
              </div>
            )}

            <form onSubmit={handleSubmitDetails} className="details-form">
              <div className="form-group">
                <label htmlFor="txtFullName">Full name *</label>
                <input
                  type="text"
                  id="txtFullName"
                  className="form-input"
                  placeholder="Jose Rizal"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  disabled={!!customerUser}
                />
                {errors.fullName && <div className="validation-error">{errors.fullName}</div>}
              </div>

              <div className="form-group-row">
                <div className="form-group phone-group">
                  <label htmlFor="txtPhone">Phone number</label>
                  <div className="phone-input-wrapper">
                    <input
                      type="text"
                      id="txtPhone"
                      className="form-input"
                      placeholder="09123456789"
                      maxLength={11}
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      disabled={!!customerUser}
                    />
                  </div>
                  {errors.phone && <div className="validation-error">{errors.phone}</div>}
                </div>

                <div className="form-group email-group">
                  <label htmlFor="txtEmail">Email address</label>
                  <input
                    type="text"
                    id="txtEmail"
                    className="form-input"
                    placeholder="juan@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    disabled={!!customerUser}
                  />
                  {errors.email && <div className="validation-error">{errors.email}</div>}
                </div>
              </div>

              <div className="booking-policies">
                <h3>Booking Policy</h3>
                <p>Enter at least a phone number or email for verification. Please arrive in time for your scheduled slot. We hold reservations for 10 minutes, after which your slot may be given to another client. Thank you!</p>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-confirm-submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Right Column: Sidebar */}
      <div className="booking-sidebar-column">
        {step === 'services' ? (
          <SidebarPlaceholder />
        ) : (
          selectedService && (
            <SidebarSummary
              serviceName={selectedService.name}
              serviceDuration={selectedService.duration_minutes}
              servicePrice={Number(selectedService.price)}
              barberName={selectedStaff?.name}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
            />
          )
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedService && selectedStaff && (
        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleFinalConfirm}
          serviceName={selectedService.name}
          barberName={selectedStaff.name}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          servicePrice={Number(selectedService.price)}
          clientName={clientName}
          clientPhone={clientPhone}
          clientEmail={clientEmail}
        />
      )}

      {/* Completion Modal */}
      {completedBooking && (
        <BookingCompletionModal
          isOpen={!!completedBooking}
          onClose={() => {
            setCompletedBooking(null);
            setStep('services');
            setSelectedService(null);
            setSelectedStaff(null);
            setSelectedDate(new Date());
            setSelectedTime('');
            setClientName(customerUser?.name || '');
            setClientPhone(customerUser?.phone || '');
            setClientEmail(customerUser?.email || '');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          bookingId={completedBooking.bookingId}
          serviceName={completedBooking.serviceName}
          barberName={completedBooking.barberName}
          selectedDate={completedBooking.date}
          selectedTime={completedBooking.time}
          servicePrice={completedBooking.price}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};
