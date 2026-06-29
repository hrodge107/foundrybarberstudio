import React, { useState, useMemo } from 'react';

export const SidebarPlaceholder: React.FC = () => {
  const [isHoursOpen, setIsHoursOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const { isOpen, statusText, currentDayIndex } = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sun, 1 = Mon...
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = 10 * 60; // 10:00 AM

    if (day === 0) {
      return { isOpen: false, statusText: 'Closed · Opens Mon at 10 AM', currentDayIndex: 0 };
    }

    const closeMinutes = day === 6 ? 17 * 60 : 19 * 60; // 5 PM on Sat, 7 PM on Mon-Fri
    const closeTimeStr = day === 6 ? '5 PM' : '7 PM';

    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      return { isOpen: true, statusText: `Open · Closes at ${closeTimeStr}`, currentDayIndex: day };
    } else if (currentMinutes < openMinutes) {
      return { isOpen: false, statusText: 'Closed · Opens at 10 AM', currentDayIndex: day };
    } else {
      const nextText = day === 6 ? 'Closed · Opens Mon at 10 AM' : 'Closed · Opens tomorrow at 10 AM';
      return { isOpen: false, statusText: nextText, currentDayIndex: day };
    }
  }, []);

  const schedule = [
    { day: 'Sunday', hours: 'Closed', index: 0 },
    { day: 'Monday', hours: '10 AM - 7 PM', index: 1 },
    { day: 'Tuesday', hours: '10 AM - 7 PM', index: 2 },
    { day: 'Wednesday', hours: '10 AM - 7 PM', index: 3 },
    { day: 'Thursday', hours: '10 AM - 7 PM', index: 4 },
    { day: 'Friday', hours: '10 AM - 7 PM', index: 5 },
    { day: 'Saturday', hours: '10 AM - 5 PM', index: 6 },
  ];

  return (
    <div className="sidebar-card">
      <div className="studio-profile">
        <img src="/images/logo.jpg" alt="Foundry Barber Studio Logo" className="sidebar-logo" />
        <h2 className="sidebar-studio-name">Foundry Barber Studio</h2>
      </div>

      <div className="studio-hours-wrapper">
        <button
          type="button"
          className="hours-dropdown-trigger"
          onClick={() => setIsHoursOpen(!isHoursOpen)}
          aria-expanded={isHoursOpen}
        >
          <i className="bi bi-clock"></i>
          <span className={`status-text ${isOpen ? 'status-open' : 'status-closed'}`}>
            {statusText}
          </span>
          <i className={`bi ${isHoursOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
        </button>

        {isHoursOpen && (
          <div className="hours-dropdown-content animate-fade-in">
            <div className="schedule-list">
              {schedule.map((item) => (
                <div
                  key={item.day}
                  className={`schedule-row ${item.index === currentDayIndex ? 'active-day' : ''}`}
                >
                  <span className="day-label">{item.day}</span>
                  <span className="hours-label">{item.hours}</span>
                </div>
              ))}
            </div>
            <div className="timezone-note">Time zone (Philippine Standard Time)</div>
          </div>
        )}
      </div>

      <hr className="sidebar-divider" />

      <div className="studio-location-section">
        <div className="location-info">
          <i className="bi bi-geo-alt location-icon"></i>
          <div className="location-text">
            <div>Behind Pamantasan ng Cabuyao</div>
            <div>Cabuyao City, Calabarzon 4024</div>
          </div>
        </div>

        <div className="studio-contact-wrapper">
          <button
            type="button"
            className="contact-dropdown-trigger"
            onClick={() => setIsContactOpen(!isContactOpen)}
            aria-expanded={isContactOpen}
          >
            <span>Contact us</span>
            <i className={`bi ${isContactOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
          </button>

          {isContactOpen && (
            <div className="contact-dropdown-content animate-fade-in">
              <div className="contact-item">
                <i className="bi bi-telephone"></i>
                <span>09943543318</span>
              </div>
              <div className="contact-item">
                <i className="bi bi-envelope"></i>
                <span>kesselgerhardt@gmail.com</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

