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
function parseTimeString(timeStr: string): { hours: number; minutes: number } {
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
 */
export function generateAvailableSlots(
  barber: BarberSchedule,
  service: ServiceDetails,
  selectedDate: Date,
  existingAppointments: ExistingAppointment[]
): string[] {
  // Rule 6 Duration guard
  if (!service || service.duration_minutes == null || service.duration_minutes <= 0) {
    console.warn("Service duration_minutes is 0 or null. Treating service as unavailable.", service);
    return [];
  }

  // Rule 2.4: Active check
  if (!barber || !barber.is_active) {
    return [];
  }

  // Rule 2.2 & Rule 6 Day matching normalization
  const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayAbbr = daysMap[selectedDate.getDay()];
  
  const normalizedWorkingDays = (barber.working_days || []).map((d) => d.trim().slice(0, 3));
  if (!normalizedWorkingDays.includes(dayAbbr)) {
    return [];
  }

  const { hours: startH, minutes: startM } = parseTimeString(barber.shift_start);
  const { hours: endH, minutes: endM } = parseTimeString(barber.shift_end);

  // Filter existing active appointments for this barber (Rule 2.3: Pending & Confirmed block slots)
  const activeAppts = existingAppointments.filter((app) => {
    const isSameBarber = app.barber_id == null || app.barber_id === barber.id;
    return isSameBarber && (app.status === 'Pending' || app.status === 'Confirmed');
  });

  const availableSlots: string[] = [];

  // Determine shift windows (Rule 6 overnight shift handling)
  const isOvernight = endH < startH || (endH === startH && endM < startM);

  const baseYear = selectedDate.getFullYear();
  const baseMonth = selectedDate.getMonth();
  const baseDay = selectedDate.getDate();

  let windows: { start: Date; end: Date }[] = [];

  if (!isOvernight) {
    const shiftStart = new Date(baseYear, baseMonth, baseDay, startH, startM, 0, 0);
    const shiftEnd = new Date(baseYear, baseMonth, baseDay, endH, endM, 0, 0);
    windows.push({ start: shiftStart, end: shiftEnd });
  } else {
    // Overnight shift: [shift_start, 24:00) today and [00:00, shift_end) next calendar day
    const shiftStart = new Date(baseYear, baseMonth, baseDay, startH, startM, 0, 0);
    const shiftEndToday = new Date(baseYear, baseMonth, baseDay, 24, 0, 0, 0);
    
    const shiftStartNext = new Date(baseYear, baseMonth, baseDay + 1, 0, 0, 0, 0);
    const shiftEndNext = new Date(baseYear, baseMonth, baseDay + 1, endH, endM, 0, 0);

    windows.push({ start: shiftStart, end: shiftEndToday });
    windows.push({ start: shiftStartNext, end: shiftEndNext });
  }

  // Iterate over shift windows generating slots every SLOT_STEP_MINUTES
  for (const win of windows) {
    let curr = new Date(win.start);
    while (curr < win.end) {
      const slotStartMs = curr.getTime();
      const slotEndMs = slotStartMs + service.duration_minutes * 60 * 1000;

      // Rule 2.1 & Rule 7: Must fit entirely within shift_end
      if (slotEndMs <= win.end.getTime()) {
        // Rule 2.3: Check overlap with active appointments
        const hasConflict = activeAppts.some((app) => {
          const apptDuration = app.duration_minutes || app.service?.duration_minutes || 0;
          if (apptDuration <= 0) return false;
          return doIntervalsOverlap(slotStartMs, service.duration_minutes, app.appointment_date, apptDuration);
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
  barberId: number,
  serviceDurationMinutes: number,
  appointmentIsoString: string
): Promise<boolean> {
  if (!serviceDurationMinutes || serviceDurationMinutes <= 0) return false;

  const requestedStart = new Date(appointmentIsoString).getTime();
  const requestedEnd = requestedStart + serviceDurationMinutes * 60 * 1000;

  // Query appointments for barber in roughly a 24h window around requested date
  const minSearch = new Date(requestedStart - 24 * 60 * 60 * 1000).toISOString();
  const maxSearch = new Date(requestedEnd + 24 * 60 * 60 * 1000).toISOString();

  const { data: appts, error } = await supabase
    .from('appointments')
    .select('id, appointment_date, status, service:services(duration_minutes)')
    .eq('barber_id', barberId)
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
 * Returns array of pending appointment IDs that overlap any confirmed appointment on the same barber.
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
      if (c.barber_id !== p.barber_id) return false;
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
