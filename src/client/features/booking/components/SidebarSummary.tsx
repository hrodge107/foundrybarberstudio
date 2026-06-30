import React from 'react';
import '../../../styles/SidebarSummary.css';

interface SidebarSummaryProps {
  serviceName: string;
  serviceDuration: string | number;
  servicePrice: number;
  barberName?: string;
  selectedDate?: Date;
  selectedTime?: string;
}

export const SidebarSummary: React.FC<SidebarSummaryProps> = ({
  serviceName,
  serviceDuration,
  servicePrice,
  barberName,
  selectedDate,
  selectedTime,
}) => {
  const formattedPrice = `₱${servicePrice.toFixed(2)}`;

  const formatDate = (date?: Date) => {
    if (!date) return '';
    // Format to match: dddd, dd MMM yyyy (e.g. Saturday, 27 Jun 2026)
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="sidebar-card summary-card animate-fade-in">
      <h3 className="summary-title">Booking Summary</h3>
      <hr className="sidebar-divider" />
      
      <div className="summary-service-details">
        <div className="service-name-row">
          <span className="summary-item-name">{serviceName}</span>
        </div>
        <div className="service-meta-row">
          <span className="summary-item-meta">
            <i className="bi bi-clock"></i> {serviceDuration} min
          </span>
          <span className="summary-item-price">{formattedPrice}</span>
        </div>
        
        {barberName && (
          <div className="summary-item-sub">
            <i className="bi bi-person"></i>
            <span>with {barberName}</span>
          </div>
        )}
        
        {selectedTime && selectedDate && (
          <div className="summary-item-sub">
            <i className="bi bi-calendar3"></i>
            <span>{formatDate(selectedDate)} at {selectedTime}</span>
          </div>
        )}
      </div>
      
      <hr className="sidebar-divider" />
      
      <div className="summary-total-row">
        <span>Total to pay</span>
        <span className="summary-total-price">{formattedPrice}</span>
      </div>
    </div>
  );
};
