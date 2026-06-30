import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';

interface StoreHour {
  day_of_week: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
}

const DAYS_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS_MAP: { [key: string]: string } = {
  Sun: 'Sunday',
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
};

export const SidebarPlaceholder: React.FC = () => {
  const [isHoursOpen, setIsHoursOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [storeHours, setStoreHours] = useState<StoreHour[]>([]);

  useEffect(() => {
    const fetchHours = async () => {
      const { data } = await supabase.from('store_hours').select('*');
      if (data) {
        const order = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as any;
        const sorted = [...data].sort((a, b) => order[a.day_of_week] - order[b.day_of_week]);
        setStoreHours(sorted);
      }
    };
    fetchHours();
  }, []);

  const formatTimeString = (timeStr: string | null) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const hours = parseInt(hStr, 10);
    const minutes = parseInt(mStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : '';
    return `${displayHours}${displayMinutes} ${ampm}`;
  };

  const statusInfo = useMemo(() => {
    if (storeHours.length === 0) {
      return { isOpen: false, statusText: 'Loading hours...', currentDayIndex: new Date().getDay() };
    }

    const now = new Date();
    const dayIndex = now.getDay();
    const dayAbbr = DAYS_MAP[dayIndex];
    const currentDayHours = storeHours.find((h) => h.day_of_week === dayAbbr);

    const parseTimeToMinutes = (timeStr: string | null) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':');
      return parseInt(h, 10) * 60 + parseInt(m, 10);
    };

    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Default message helper
    const getNextOpenText = (startDayOffset = 1): string => {
      for (let i = 0; i < 7; i++) {
        const checkIndex = (dayIndex + startDayOffset + i) % 7;
        const checkDay = storeHours.find((h) => h.day_of_week === DAYS_MAP[checkIndex]);
        if (checkDay && checkDay.is_open && checkDay.open_time) {
          const formattedOpen = formatTimeString(checkDay.open_time);
          const dayName = checkIndex === (dayIndex + 1) % 7 ? 'tomorrow' : FULL_DAYS_MAP[DAYS_MAP[checkIndex]];
          return `Closed · Opens ${dayName} at ${formattedOpen}`;
        }
      }
      return 'Closed';
    };

    if (!currentDayHours || !currentDayHours.is_open || !currentDayHours.open_time || !currentDayHours.close_time) {
      return { isOpen: false, statusText: getNextOpenText(1), currentDayIndex: dayIndex };
    }

    const openMin = parseTimeToMinutes(currentDayHours.open_time);
    const closeMin = parseTimeToMinutes(currentDayHours.close_time);

    if (currentMinutes >= openMin && currentMinutes < closeMin) {
      return {
        isOpen: true,
        statusText: `Open · Closes at ${formatTimeString(currentDayHours.close_time)}`,
        currentDayIndex: dayIndex,
      };
    } else if (currentMinutes < openMin) {
      return {
        isOpen: false,
        statusText: `Closed · Opens at ${formatTimeString(currentDayHours.open_time)}`,
        currentDayIndex: dayIndex,
      };
    } else {
      return { isOpen: false, statusText: getNextOpenText(1), currentDayIndex: dayIndex };
    }
  }, [storeHours]);

  const schedule = useMemo(() => {
    return storeHours.map((h, idx) => {
      const hoursStr = h.is_open && h.open_time && h.close_time
        ? `${formatTimeString(h.open_time)} - ${formatTimeString(h.close_time)}`
        : 'Closed';
      return {
        day: FULL_DAYS_MAP[h.day_of_week] || h.day_of_week,
        hours: hoursStr,
        index: idx,
      };
    });
  }, [storeHours]);

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
          <span className={`status-text ${statusInfo.isOpen ? 'status-open' : 'status-closed'}`}>
            {statusInfo.statusText}
          </span>
          <i className={`bi ${isHoursOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
        </button>

        {isHoursOpen && (
          <div className="hours-dropdown-content animate-fade-in">
            <div className="schedule-list">
              {schedule.map((item) => (
                <div
                  key={item.day}
                  className={`schedule-row ${item.index === statusInfo.currentDayIndex ? 'active-day' : ''}`}
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


