import React, { useState } from 'react';
import { getAppointmentByBookingId } from '../../../services/tracker';
import type { FullAppointment } from '../../../../shared/types/appointment';
import '../../../styles/BookingTracker.css';

export const BookingTracker: React.FC = () => {
  const [searchId, setSearchId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [booking, setBooking] = useState<FullAppointment | null>(null);
  const [searched, setSearched] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  React.useEffect(() => {
    const checkHashAndTrack = async () => {
      const hash = window.location.hash;
      let targetId = '';
      if (hash.includes('?id=')) {
        targetId = hash.split('?id=')[1]?.split('&')[0] || '';
      } else if (hash.startsWith('#/track/')) {
        targetId = hash.replace('#/track/', '').trim();
      }
      if (targetId) {
        const normalized = decodeURIComponent(targetId).trim().toUpperCase();
        setSearchId(normalized);
        if (/^FBS-\d{6}$/.test(normalized)) {
          setError('');
          setIsLoading(true);
          setSearched(true);
          try {
            const data = await getAppointmentByBookingId(normalized);
            setBooking(data);
          } catch (e) {
            console.error(e);
            setBooking(null);
          } finally {
            setIsLoading(false);
          }
        }
      }
    };
    checkHashAndTrack();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = searchId.trim().toUpperCase();
    
    if (!normalized) {
      setError("Booking ID is required");
      return;
    }
    if (!/^FBS-\d{6}$/.test(normalized)) {
      setError("Enter a valid ID, e.g. FBS-100245");
      return;
    }

    setError('');
    setIsLoading(true);
    setSearched(true);
    try {
      const data = await getAppointmentByBookingId(normalized);
      setBooking(data);
    } catch (e) {
      console.error(e);
      setBooking(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase();
    return `status-badge status-badge--${s}`;
  };

  const renderTimeline = (status: string) => {
    const s = status.trim();
    let timelineClass = "track-timeline";
    let stepPendingClass = "timeline-step";
    let stepConfirmedClass = "timeline-step";
    let stepCompletedClass = "timeline-step";
    let conn1Class = "timeline-connector";
    let conn2Class = "timeline-connector";

    if (s === "Pending") {
      stepPendingClass += " is-active";
    } else if (s === "Confirmed") {
      stepPendingClass += " is-done";
      conn1Class += " is-filled";
      stepConfirmedClass += " is-active";
    } else if (s === "Completed") {
      stepPendingClass += " is-done";
      conn1Class += " is-filled";
      stepConfirmedClass += " is-done";
      conn2Class += " is-filled";
      stepCompletedClass += " is-done";
    } else if (s === "Cancelled") {
      timelineClass += " is-cancelled";
      stepPendingClass += " is-cancelled";
    }

    return (
      <div className={timelineClass}>
        <div className={stepPendingClass}>
          <div className="step-marker"><i className="bi bi-clock-history"></i></div>
          <span className="step-label">Pending</span>
        </div>
        <div className={conn1Class}></div>
        <div className={stepConfirmedClass}>
          <div className="step-marker"><i className="bi bi-calendar-check"></i></div>
          <span className="step-label">Confirmed</span>
        </div>
        <div className={conn2Class}></div>
        <div className={stepCompletedClass}>
          <div className="step-marker"><i className="bi bi-check2-circle"></i></div>
          <span className="step-label">Completed</span>
        </div>
      </div>
    );
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    return `${date.toLocaleDateString('en-US', options)} at ${date.toLocaleTimeString('en-US', timeOptions)}`;
  };

  const getBookingIdString = (id: number) => {
    return `FBS-${100000 + id}`;
  };

  return (
    <div className="track-layout">
      <div className="track-header">
        <h1>Track Your Booking</h1>
        <p>Enter your booking reference to see its current status and details.</p>
      </div>

      <div className="track-input-card step-panel animate-fade-in">
        <form onSubmit={handleSearch} className="track-form">
          <div className="form-group track-field">
            <label htmlFor="txtBookingId">Booking ID *</label>
            <input 
              type="text" 
              id="txtBookingId"
              className="form-input" 
              placeholder="e.g. FBS-100245"
              maxLength={10}
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
            {error && <div className="validation-error">{error}</div>}
          </div>
          <div className="track-submit">
            <button type="submit" className="btn-confirm-submit" disabled={isLoading}>
              {isLoading ? "Searching..." : "Track Booking"}
            </button>
          </div>
        </form>
      </div>

      {searched && !isLoading && booking && (
        <div className="track-result-card step-panel animate-fade-in">
          <div className="result-header">
            <div className="result-id">
              <span className="result-id-label">Booking</span>
              <span className="result-id-value">{getBookingIdString(booking.id)}</span>
            </div>
            <span className={getStatusBadgeClass(booking.status)}>{booking.status}</span>
          </div>

          {renderTimeline(booking.status)}

          <div className="booking-details-card">
            <div className="detail-row">
              <span className="label">Service</span>
              <span className="value">{booking.service?.name}</span>
            </div>
            <div className="detail-row">
              <span className="label">Provider</span>
              <span className="value">{booking.barber?.name}</span>
            </div>
            <div className="detail-row">
              <span className="label">Date &amp; Time</span>
              <span className="value">{formatDate(booking.appointment_date)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Client Name</span>
              <span className="value">{booking.customer?.name}</span>
            </div>
            <div className="detail-row">
              <span className="label">Amount</span>
              <span className="value highlight">₱{Number(booking.service?.price).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {searched && !isLoading && !booking && (
        <div className="not-found-state animate-fade-in">
          <i className="bi bi-search"></i>
          <p>
            No booking found for ID <strong>{searchId.toUpperCase().trim()}</strong>.
            <br />Please check and try again.
          </p>
        </div>
      )}
    </div>
  );
};
