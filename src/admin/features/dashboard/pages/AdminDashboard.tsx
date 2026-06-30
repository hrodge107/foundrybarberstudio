import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../layout/components/AdminLayout';
import { CreateAppointmentModal } from '../../appointments/components/CreateAppointmentModal';
import { AppointmentDetailModal } from '../../appointments/components/AppointmentDetailModal';
import { getBarbers, getServices, getStoreHours } from '../../../../client/services/booking';
import { getDashboardAppointments } from '../../../services/appointments';
import type { SystemUser } from '../../../../shared/types/user';
import type { StoreHour } from '../../../../shared/types/store';
import type { Service } from '../../../../shared/types/service';
import type { Barber } from '../../../../shared/types/barber';
import type { FullAppointment } from '../../../../shared/types/appointment';

interface AdminDashboardProps {
  onLogout: () => void;
  systemUser?: SystemUser | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, systemUser }) => {
  const isBarber = systemUser?.role === 'barber';

  const timeToMins = (t: string | null) => {
    if (!t) return 0;
    const parts = t.slice(0, 5).split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  };

  const hourToMins = (hStr: string) => {
    const [numStr, ampm] = hStr.split(' ');
    let h = parseInt(numStr, 10);
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60;
  };
  // Current 7-day span start date (Block 1 marks the current date by default)
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [appointments, setAppointments] = useState<FullAppointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [storeHours, setStoreHours] = useState<StoreHour[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createInitialDate, setCreateInitialDate] = useState<Date>(new Date());
  const [createInitialTime, setCreateInitialTime] = useState<string>('10:00 AM');

  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [selectedAppointment, setSelectedAppointment] = useState<FullAppointment | null>(null);

  // Compute 7 days from startDate
  const weekDays = React.useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      days.push(d);
    }
    return days;
  }, [startDate]);

  const hoursList = [
    '6 AM', '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM',
    '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM',
    '8 PM', '9 PM', '10 PM', '11 PM'
  ];

  // Fetch initial barbers and services
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const bData = await getBarbers();
        setBarbers(bData);

        const sData = await getServices();
        setServices(sData);

        const shData = await getStoreHours();
        setStoreHours(shData);
      } catch (err) {
        console.error('Error fetching static admin data:', err);
      }
    };
    fetchStaticData();
  }, []);

  // Fetch appointments for current 7-day range
  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const rangeStart = new Date(weekDays[0]);
      rangeStart.setHours(0, 0, 0, 0);

      const rangeEnd = new Date(weekDays[6]);
      rangeEnd.setHours(23, 59, 59, 999);

      const data = await getDashboardAppointments(
        rangeStart.toISOString(),
        rangeEnd.toISOString(),
        isBarber ? (systemUser?.barber_id || null) : null
      );

      setAppointments(data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [weekDays, isBarber, systemUser?.barber_id]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handlePrevWeek = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 7);
    setStartDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 7);
    setStartDate(d);
  };

  const handleToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  };

  const handleCellClick = (dayDate: Date, timeLabel: string) => {
    if (isBarber) return;
    setCreateInitialDate(dayDate);
    const formattedTime = timeLabel.includes(':') ? timeLabel : timeLabel.replace(' ', ':00 ');
    setCreateInitialTime(formattedTime);
    setIsCreateOpen(true);
  };

  const handleAppointmentClick = (e: React.MouseEvent, appt: FullAppointment) => {
    e.stopPropagation();
    setSelectedAppointment(appt);
    setIsDetailOpen(true);
  };

  const handleAppointmentDeleted = (deletedId: number) => {
    setAppointments((prev) => prev.filter((a) => a.id !== deletedId));
    fetchAppointments();
  };

  const handleAppointmentUpdated = (updatedAppt?: { id: number; status: string }) => {
    if (updatedAppt) {
      setAppointments((prev) =>
        prev.map((a) => (a.id === updatedAppt.id ? { ...a, status: updatedAppt.status as any } : a))
      );
    }
    fetchAppointments();
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  // Format month and year label for header (e.g., "June 2026")
  const monthYearLabel = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <AdminLayout onLogout={onLogout} systemUser={systemUser} activeTab="calendar">
      <div className="admin-calendar-content">
        {/* Top Header Bar */}
        <header className="calendar-top-bar">
          <div className="bar-left">
            <h2 className="calendar-title">Your calendar</h2>
          </div>

          <div className="bar-center">
            <span className="month-year-label">{monthYearLabel}</span>
            <div className="nav-arrows">
              <button type="button" className="icon-btn-arrow" onClick={handlePrevWeek} title="Previous 7 Days">&lt;</button>
              <button type="button" className="icon-btn-arrow" onClick={handleNextWeek} title="Next 7 Days">&gt;</button>
            </div>
            <button type="button" className="btn-today" onClick={handleToday}>Today</button>
          </div>

          <div className="bar-right">
            {!isBarber && (
              <button
                type="button"
                className="btn-add-appt"
                onClick={() => {
                  setCreateInitialDate(new Date());
                  setCreateInitialTime('10:00 AM');
                  setIsCreateOpen(true);
                }}
                title="Add Appointment"
              >
                + New Appointment
              </button>
            )}
          </div>
        </header>

        {/* Calendar Weekly Grid */}
        <div className="weekly-grid-container">
          {/* Header Row: 7 Days Span */}
          <div className="grid-header-row">
            <div className="time-zone-cell">PST</div>
            {weekDays.map((d) => {
              const dayNum = d.getDate();
              const dayName = d.toLocaleString('en-US', { weekday: 'short' });
              const active = isToday(d);

              return (
                <div key={d.toISOString()} className={`day-col-header ${active ? 'active-day' : ''}`}>
                  {active ? (
                    <span className="active-day-pill">{dayNum}</span>
                  ) : (
                    <span className="day-num">{dayNum}</span>
                  )}{' '}
                  <span className="day-name">{dayName}</span>
                </div>
              );
            })}
          </div>

          {/* Time Rows */}
          <div className="grid-body">
            {isLoading && (
              <div className="grid-loading-overlay">
                <span>Loading calendar bookings...</span>
              </div>
            )}

            {hoursList.map((hour) => (
              <div key={hour} className="grid-time-row">
                <div className="time-label-cell">{hour}</div>
                {weekDays.map((dayDate) => {
                  const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  const dayAbbr = daysMap[dayDate.getDay()];
                  const storeDay = storeHours.find((s) => s.day_of_week === dayAbbr);

                  // Find appointments on this day matching this hour slot
                  // ponytail: filter out completed and cancelled status (only show pending/confirmed)
                  const slotAppts = appointments.filter((appt) => {
                    if (isBarber) {
                      if (appt.status !== 'Confirmed') return false;
                    } else {
                      if (appt.status !== 'Pending' && appt.status !== 'Confirmed') return false;
                    }

                    const apptDate = new Date(appt.appointment_date);
                    const isSameDay =
                      apptDate.getDate() === dayDate.getDate() &&
                      apptDate.getMonth() === dayDate.getMonth() &&
                      apptDate.getFullYear() === dayDate.getFullYear();

                    if (!isSameDay) return false;

                    let apptHour = apptDate.getHours();
                    const apptAmPm = apptHour >= 12 ? 'PM' : 'AM';
                    let appt12Hour = apptHour % 12;
                    if (appt12Hour === 0) appt12Hour = 12;
                    const apptHourStr = `${appt12Hour} ${apptAmPm}`;

                    return apptHourStr === hour;
                  });

                  return (
                    <div
                      key={dayDate.toISOString() + hour}
                      className="grid-cell"
                    >
                      {['00', '15', '30', '45'].map((mins) => {
                        const [hNum, ampm] = hour.split(' ');
                        const slotTimeStr = `${hNum}:${mins} ${ampm}`;
                        const slotMins = hourToMins(hour) + parseInt(mins, 10);
                        const storeOpenMins = storeDay ? timeToMins(storeDay.open_time) : 0;
                        const storeCloseMins = storeDay ? timeToMins(storeDay.close_time) : 0;
                        const isOutsideHours = !storeDay || !storeDay.is_open || slotMins < storeOpenMins || slotMins >= storeCloseMins;

                        let h = parseInt(hNum, 10);
                        if (ampm === 'PM' && h < 12) h += 12;
                        if (ampm === 'AM' && h === 12) h = 0;
                        const slotDate = new Date(dayDate);
                        slotDate.setHours(h, parseInt(mins, 10), 0, 0);
                        const isPast = slotDate.getTime() < Date.now();

                        const isDisabled = isOutsideHours || isPast;
                        const tooltipText = isPast
                          ? 'Cannot book in the past'
                          : isOutsideHours
                            ? 'Closed / Outside store hours'
                            : isBarber
                              ? ''
                              : `Click to book on ${dayDate.toLocaleDateString()} at ${slotTimeStr}`;

                        return (
                          <div
                            key={mins}
                            className={`quarter-slot-cell ${isBarber || isDisabled ? '' : 'clickable-cell'}`}
                            onClick={() => { if (!isDisabled) handleCellClick(dayDate, slotTimeStr); }}
                            style={isDisabled ? { background: '#f1f5f9', cursor: 'not-allowed', opacity: 0.6 } : undefined}
                            title={tooltipText}
                          />
                        );
                      })}
                      {slotAppts.map((appt) => {
                        const apptDate = new Date(appt.appointment_date);
                        const startMins = apptDate.getMinutes();
                        const duration = appt.service?.duration_minutes || 30;
                        const topPercent = (startMins / 60) * 100;
                        const heightPercent = (duration / 60) * 100;

                        return (
                          <div
                            key={appt.id}
                            className={`appointment-card-block status-${appt.status.toLowerCase()}`}
                            style={{
                              top: `${topPercent}%`,
                              height: `${heightPercent}%`,
                            }}
                            onClick={(e) => handleAppointmentClick(e, appt)}
                            title={`Click for details - ${appt.customer?.name}`}
                          >
                            <div className="appt-card-header">
                              <span className="appt-time">
                                {apptDate.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </span>
                            </div>
                            <div className="appt-title">{appt.customer?.name || 'Client'}</div>
                            <div className="appt-sub">{appt.service?.name} • {appt.barber?.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Creation Modal */}
      <CreateAppointmentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={fetchAppointments}
        initialDate={createInitialDate}
        initialTime={createInitialTime}
        barbers={barbers}
        services={services}
      />

      {/* Detail Modal */}
      <AppointmentDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdated={handleAppointmentUpdated}
        onDeleted={handleAppointmentDeleted}
        appointment={selectedAppointment}
        systemUser={systemUser}
      />
    </AdminLayout>
  );
};
