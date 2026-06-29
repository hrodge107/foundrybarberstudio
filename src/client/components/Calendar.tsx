import React, { useState } from 'react';

interface CalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({ selectedDate, onSelectDate }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  // Get first day of the month
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Get total days in current month
  const totalDays = new Date(year, month + 1, 0).getDate();

  // Get total days in previous month
  const prevTotalDays = new Date(year, month, 0).getDate();

  // Days array to render
  const days: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

  // Previous month days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevTotalDays - i),
      isCurrentMonth: false,
      key: `prev-${prevTotalDays - i}`
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
      key: `curr-${i}`
    });
  }

  // Next month days to pad to full weeks (usually 6 rows = 42 days)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
      key: `next-${i}`
    });
  }

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date: Date) => {
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Chunk days into rows of 7
  const rows: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    rows.push(days.slice(i, i + 7));
  }

  return (
    <table className="custom-calendar" style={{ borderCollapse: 'collapse', borderWidth: 0 }}>
      <thead>
        <tr className="calendar-title">
          <td colSpan={1} style={{ textAlign: 'left' }}>
            <a href="#" className="calendar-nav" onClick={handlePrevMonth}>&lt;</a>
          </td>
          <td colSpan={5} style={{ textAlign: 'center', fontWeight: 'bold' }}>
            {monthNames[month]} {year}
          </td>
          <td colSpan={1} style={{ textAlign: 'right' }}>
            <a href="#" className="calendar-nav" onClick={handleNextMonth}>&gt;</a>
          </td>
        </tr>
        <tr className="calendar-day-header">
          <th>Su</th>
          <th>Mo</th>
          <th>Tu</th>
          <th>We</th>
          <th>Th</th>
          <th>Fr</th>
          <th>Sa</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rIdx) => (
          <tr key={`row-${rIdx}`}>
            {row.map((day) => {
              const todayClass = isToday(day.date) ? ' calendar-today' : '';
              const selectedClass = isSelected(day.date) ? ' calendar-selected-day' : '';
              const otherMonthClass = !day.isCurrentMonth ? ' calendar-other-month' : '';
              
              return (
                <td 
                  key={day.key} 
                  className={`calendar-day${todayClass}${selectedClass}${otherMonthClass}`}
                >
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectDate(day.date);
                    }}
                  >
                    {day.date.getDate()}
                  </a>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
