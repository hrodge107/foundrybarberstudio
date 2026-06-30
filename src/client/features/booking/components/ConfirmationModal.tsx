import React from 'react';
import '../../../styles/ConfirmationModal.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  serviceName: string;
  barberName: string;
  selectedDate: Date;
  selectedTime: string;
  servicePrice: number;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  serviceName,
  barberName,
  selectedDate,
  selectedTime,
  servicePrice,
  clientName,
  clientPhone,
  clientEmail,
}) => {
  if (!isOpen) return null;

  const formattedPrice = `₱${servicePrice.toFixed(2)}`;
  
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="modal-overlay active">
      <div className="modal-content animate-scale-up">
        <div className="modal-header">
          <h3 className="modal-title">Confirm Appointment</h3>
          <button type="button" className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
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
              <span className="value highlight">{formattedPrice}</span>
            </div>
            <hr className="modal-divider" />
            <div className="modal-info-item">
              <span className="label">Client Name</span>
              <span className="value">{clientName}</span>
            </div>
            <div className="modal-info-item">
              <span className="label">Phone Number</span>
              <span className="value">{clientPhone ? `+63 ${clientPhone}` : 'N/A'}</span>
            </div>
            <div className="modal-info-item">
              <span className="label">Email Address</span>
              <span className="value">{clientEmail || 'N/A'}</span>
            </div>
          </div>
          <div className="modal-warning">
            <i className="bi bi-shield-fill-check"></i>
            <span>By confirming, you agree to our booking and cancellation policies.</span>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-modal-submit" onClick={onConfirm}>Finalize Booking</button>
        </div>
      </div>
    </div>
  );
};
