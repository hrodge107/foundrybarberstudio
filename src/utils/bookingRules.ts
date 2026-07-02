import type { SupabaseClient } from '@supabase/supabase-js';

export const SLOT_STEP_MINUTES = 15;

export interface BarberSchedule {
  id: number;
  name: string;
  is_active: boolean;
  shift_start: string;
  shift_end: string;
  working_days: string[];
}

export interface ServiceDetails {
  id: number;
  name: string;
  duration_minutes: number;
  price: number;
}

export interface ExistingAppointment {
  id: number;
  barber_id?: number;
  appointment_date: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  service?: { duration_minutes: number } | null;
  duration_minutes?: number;
}

export interface StoreHour {
  day_of_week: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
}

/**
 * Rule 1: Occupied time block definition.
 * Two appointments on the SAME barber CONFLICT if their half-open intervals overlap:
 * A.start < B.end AND B.start < A.end
 */
export function doIntervalsOverlap(
  startAInput: Date | string | number,
  durationAMinutes: number,
  startBInput: Date | string | number,
  durationBMinutes: number
): boolean {
  const startA = new Date(startAInput).getTime();
  const endA = startA + durationAMinutes * 60 * 1000;

  const startB = new Date(startBInput).getTime();
  const endB = startB + durationBMinutes * 60 * 1000;

  return startA < endB && startB < endA;
}

/**
 * Helper to parse time string "HH:mm:ss" or "HH:mm" into hours and minutes.
 */
function parseTimeString(timeStr: string | null): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 0, minutes: 0 };
  const parts = timeStr.split(':');
  return {
    hours: parseInt(parts[0], 10) || 0,
    minutes: parseInt(parts[1], 10) || 0,
  };
}

/**
 * Format Date object into display time string like "09:00 AM"
 */
export function formatSlotTimeString(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Rule 2 & Rule 6: Slot Visibility Generator
 * Now intersected with Store Hours
 */
export function generateAvailableSlots(
  barber: BarberSchedule,
  service: ServiceDetails,
  selectedDate: Date,
  existingAppointments: ExistingAppointment[],
  storeHours: StoreHour[]
): string[] {
  if (!service || service.duration_minutes == null || service.duration_minutes <= 0) {
    console.warn("Service duration_minutes is 0 or null. Treating service as unavailable.", service);
    return [];
  }

  if (!barber || !barber.is_active) {
    return [];
  }

  const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayAbbr = daysMap[selectedDate.getDay()];
  
  const normalizedWorkingDays = (barber.working_days || []).map((d) => d.trim().slice(0, 3));
  if (!normalizedWorkingDays.includes(dayAbbr)) {
    return [];
  }

  const storeDay = storeHours.find((s) => s.day_of_week === dayAbbr);
  if (!storeDay || !storeDay.is_open || !storeDay.open_time || !storeDay.close_time) {
    return []; // Store is closed this day
  }

  const { hours: startH, minutes: startM } = parseTimeString(barber.shift_start);
  const { hours: endH, minutes: endM } = parseTimeString(barber.shift_end);
  const { hours: storeOpenH, minutes: storeOpenM } = parseTimeString(storeDay.open_time);
  const { hours: storeCloseH, minutes: storeCloseM } = parseTimeString(storeDay.close_time);

  const activeAppts = existingAppointments.filter((app) => {
    return app.status === 'Pending' || app.status === 'Confirmed';
  });

  const availableSlots: string[] = [];

  const isOvernight = endH < startH || (endH === startH && endM < startM);
  const isStoreOvernight = storeCloseH < storeOpenH || (storeCloseH === storeOpenH && storeCloseM < storeOpenM);

  const baseYear = selectedDate.getFullYear();
  const baseMonth = selectedDate.getMonth();
  const baseDay = selectedDate.getDate();

  let windows: { start: Date; end: Date }[] = [];

  if (!isOvernight) {
    windows.push({
      start: new Date(baseYear, baseMonth, baseDay, startH, startM, 0, 0),
      end: new Date(baseYear, baseMonth, baseDay, endH, endM, 0, 0)
    });
  } else {
    windows.push({
      start: new Date(baseYear, baseMonth, baseDay, startH, startM, 0, 0),
      end: new Date(baseYear, baseMonth, baseDay, 24, 0, 0, 0)
    });
    windows.push({
      start: new Date(baseYear, baseMonth, baseDay + 1, 0, 0, 0, 0),
      end: new Date(baseYear, baseMonth, baseDay + 1, endH, endM, 0, 0)
    });
  }

  let storeWindows: { start: Date; end: Date }[] = [];
  if (!isStoreOvernight) {
    storeWindows.push({
      start: new Date(baseYear, baseMonth, baseDay, storeOpenH, storeOpenM, 0, 0),
      end: new Date(baseYear, baseMonth, baseDay, storeCloseH, storeCloseM, 0, 0)
    });
  } else {
    storeWindows.push({
      start: new Date(baseYear, baseMonth, baseDay, storeOpenH, storeOpenM, 0, 0),
      end: new Date(baseYear, baseMonth, baseDay, 24, 0, 0, 0)
    });
    storeWindows.push({
      start: new Date(baseYear, baseMonth, baseDay + 1, 0, 0, 0, 0),
      end: new Date(baseYear, baseMonth, baseDay + 1, storeCloseH, storeCloseM, 0, 0)
    });
  }

  // Intersect windows
  let validWindows: { start: Date; end: Date }[] = [];
  for (const bw of windows) {
    for (const sw of storeWindows) {
      const maxStart = bw.start > sw.start ? bw.start : sw.start;
      const minEnd = bw.end < sw.end ? bw.end : sw.end;
      if (maxStart < minEnd) {
        validWindows.push({ start: maxStart, end: minEnd });
      }
    }
  }

  for (const win of validWindows) {
    let curr = new Date(win.start);
    while (curr < win.end) {
      const slotStartMs = curr.getTime();
      const slotEndMs = slotStartMs + service.duration_minutes * 60 * 1000;

      if (slotStartMs < Date.now()) {
        curr = new Date(curr.getTime() + SLOT_STEP_MINUTES * 60 * 1000);
        continue;
      }

      if (slotEndMs <= win.end.getTime()) {
        const hasConflict = activeAppts.some((app) => {
          const apptDuration = app.duration_minutes || app.service?.duration_minutes || 0;
          if (apptDuration <= 0) return false;

          // Align database UTC/GMT+8 timestamp to local browser timezone:
          const apptDateObj = new Date(app.appointment_date);
          const manilaMs = apptDateObj.getTime() + 8 * 60 * 60 * 1000;
          const manilaDate = new Date(manilaMs);
          const localAlignedTime = new Date(
            manilaDate.getUTCFullYear(),
            manilaDate.getUTCMonth(),
            manilaDate.getUTCDate(),
            manilaDate.getUTCHours(),
            manilaDate.getUTCMinutes(),
            0, 0
          ).getTime();

          return doIntervalsOverlap(slotStartMs, service.duration_minutes, localAlignedTime, apptDuration);
        });

        if (!hasConflict) {
          availableSlots.push(formatSlotTimeString(curr));
        }
      }

      curr = new Date(curr.getTime() + SLOT_STEP_MINUTES * 60 * 1000);
    }
  }

  return availableSlots;
}

/**
 * Rule 3: On booking submission server-side validation
 */
export async function validateSlotAvailability(
  supabase: SupabaseClient,
  _barberId: number,
  serviceDurationMinutes: number,
  appointmentIsoString: string
): Promise<boolean> {
  if (!serviceDurationMinutes || serviceDurationMinutes <= 0) return false;

  const requestedStart = new Date(appointmentIsoString).getTime();
  if (requestedStart < Date.now()) return false;

  const requestedEnd = requestedStart + serviceDurationMinutes * 60 * 1000;
  const requestedDateObj = new Date(appointmentIsoString);

  // 1. Check Store Hours globally first
  const { data: storeHours, error: storeError } = await supabase.from('store_hours').select('*');
  if (!storeError && storeHours && storeHours.length > 0) {
    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayAbbr = daysMap[requestedDateObj.getDay()];
    const storeDay = storeHours.find((s) => s.day_of_week === dayAbbr);
    
    if (!storeDay || !storeDay.is_open || !storeDay.open_time || !storeDay.close_time) {
      return false; // Store closed
    }

    const { hours: storeOpenH, minutes: storeOpenM } = parseTimeString(storeDay.open_time);
    const { hours: storeCloseH, minutes: storeCloseM } = parseTimeString(storeDay.close_time);
    const isStoreOvernight = storeCloseH < storeOpenH || (storeCloseH === storeOpenH && storeCloseM < storeOpenM);
    
    const baseYear = requestedDateObj.getFullYear();
    const baseMonth = requestedDateObj.getMonth();
    const baseDay = requestedDateObj.getDate();

    let storeWindows: { start: Date; end: Date }[] = [];
    if (!isStoreOvernight) {
      storeWindows.push({
        start: new Date(baseYear, baseMonth, baseDay, storeOpenH, storeOpenM, 0, 0),
        end: new Date(baseYear, baseMonth, baseDay, storeCloseH, storeCloseM, 0, 0)
      });
    } else {
      storeWindows.push({
        start: new Date(baseYear, baseMonth, baseDay, storeOpenH, storeOpenM, 0, 0),
        end: new Date(baseYear, baseMonth, baseDay, 24, 0, 0, 0)
      });
      storeWindows.push({
        start: new Date(baseYear, baseMonth, baseDay + 1, 0, 0, 0, 0),
        end: new Date(baseYear, baseMonth, baseDay + 1, storeCloseH, storeCloseM, 0, 0)
      });
    }

    const fallsInStoreWindow = storeWindows.some(win => 
      requestedStart >= win.start.getTime() && requestedEnd <= win.end.getTime()
    );

    if (!fallsInStoreWindow) return false;
  }

  // Query appointments for barber in roughly a 24h window around requested date
  const minSearch = new Date(requestedStart - 24 * 60 * 60 * 1000).toISOString();
  const maxSearch = new Date(requestedEnd + 24 * 60 * 60 * 1000).toISOString();

  const { data: appts, error } = await supabase
    .from('appointments')
    .select('id, barber_id, appointment_date, status, service:services(duration_minutes)')
    .in('status', ['Pending', 'Confirmed'])
    .gte('appointment_date', minSearch)
    .lte('appointment_date', maxSearch);

  if (error) {
    console.error('Error re-validating slot availability:', error);
    return false;
  }

  if (!appts) return true;

  const conflict = appts.some((app: any) => {
    const serviceObj = Array.isArray(app.service) ? app.service[0] : app.service;
    const dur = serviceObj?.duration_minutes || 0;
    if (dur <= 0) return false;
    return doIntervalsOverlap(requestedStart, serviceDurationMinutes, app.appointment_date, dur);
  });

  return !conflict;
}

/**
 * Rule 5: Post-accept conflict scan
 */
export function scanPostAcceptConflicts(
  appointments: {
    id: number;
    barber_id?: number;
    appointment_date: string;
    status: string;
    service?: { duration_minutes: number } | null;
  }[]
): Set<number> {
  const conflictingIds = new Set<number>();

  const confirmed = appointments.filter((a) => a.status === 'Confirmed');
  const pending = appointments.filter((a) => a.status === 'Pending');

  for (const p of pending) {
    const pDur = p.service?.duration_minutes || 0;
    if (pDur <= 0) continue;

    const hasOverlap = confirmed.some((c) => {
      const cDur = c.service?.duration_minutes || 0;
      if (cDur <= 0) return false;
      return doIntervalsOverlap(p.appointment_date, pDur, c.appointment_date, cDur);
    });

    if (hasOverlap) {
      conflictingIds.add(p.id);
    }
  }

  return conflictingIds;
}
