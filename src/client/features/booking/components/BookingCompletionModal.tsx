import React, { useState } from 'react';

interface BookingCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  serviceName: string;
  barberName: string;
  selectedDate: Date;
  selectedTime: string;
  servicePrice: number;
  onNavigate?: (hash: string) => void;
}

export const BookingCompletionModal: React.FC<BookingCompletionModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  serviceName,
  barberName,
  selectedDate,
  selectedTime,
  servicePrice,
  onNavigate,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTrackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClose();
    const targetHash = `#/track?id=${bookingId}`;
    if (onNavigate) {
      onNavigate(targetHash);
    } else {
      window.location.hash = targetHash;
    }
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-content animate-scale-up completion-modal-content">
        <div className="modal-header completion-modal-header">
          <div className="completion-icon-wrapper">
            <i className="bi bi-check-circle-fill"></i>
          </div>
          <h3 className="modal-title">Booking Confirmed!</h3>
          <button type="button" className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <p className="completion-subtitle">
            Your appointment has been successfully scheduled. Please keep your Booking ID to track your status.
          </p>

          <div className="booking-id-banner">
            <div className="id-details">
              <span className="id-label">BOOKING ID</span>
              <span className="id-value">{bookingId}</span>
            </div>
            <button type="button" className="btn-copy-id" onClick={handleCopy}>
              <i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'}`}></i>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="modal-details-card">
            <div className="modal-info-item">
              <span className="label">Service</span>
              <span className="value highlight">{serviceName}</span>
            </div>
            <div className="modal-info-item">
              <span className="label">Provider</span>
              <span className="value">{barberName}</span>
            </div>
            <div className="modal-info-item">
              <span className="label">Date & Time</span>
              <span className="value">{formatDate(selectedDate)} at {selectedTime}</span>
            </div>
            <div className="modal-info-item">
              <span className="label">Total Price</span>
              <span className="value highlight">₱{servicePrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer completion-modal-footer">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Done
          </button>
          <a href={`#/track?id=${bookingId}`} className="btn-modal-submit btn-track-link" onClick={handleTrackClick}>
            <i className="bi bi-search"></i> Track Booking
          </a>
        </div>
      </div>
    </div>
  );
};
