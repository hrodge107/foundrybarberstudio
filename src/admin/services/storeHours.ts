import { supabase } from '../../shared/services/supabaseClient';
import type { StoreHour } from '../../shared/types/store';

export async function getStoreHoursAdmin(): Promise<StoreHour[]> {
  const { data, error } = await supabase.from('store_hours').select('*');
  if (error) throw error;

  const dayOrder = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 } as any;
  return [...(data || [])].sort((a, b) => dayOrder[a.day_of_week] - dayOrder[b.day_of_week]);
}

export async function updateStoreHour(
  dayOfWeek: string,
  isOpen: boolean,
  openTime: string | null,
  closeTime: string | null
): Promise<void> {
  const { error } = await supabase
    .from('store_hours')
    .update({
      is_open: isOpen,
      open_time: openTime,
      close_time: closeTime,
    })
    .eq('day_of_week', dayOfWeek);

  if (error) throw error;
}

export async function checkStoreHoursConflicts(storeHours: StoreHour[]): Promise<any[]> {
  const todayStr = new Date().toISOString();
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('id, appointment_date, status, customer:customers(name), service:services(duration_minutes, name)')
    .in('status', ['Pending', 'Confirmed'])
    .gte('appointment_date', todayStr);

  if (error) throw error;
  if (!appointments || appointments.length === 0) return [];

  const foundConflicts: any[] = [];
  const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const parseTimeString = (timeStr: string | null) => {
    if (!timeStr) return { hours: 0, minutes: 0 };
    const parts = timeStr.split(':');
    return { hours: parseInt(parts[0], 10) || 0, minutes: parseInt(parts[1], 10) || 0 };
  };

  const timeToMins = (t: string | null) => {
    if (!t) return 0;
    const parts = t.slice(0, 5).split(':');
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  };

  for (const app of appointments) {
    const d = new Date(app.appointment_date);
    const dayAbbr = daysMap[d.getDay()];
    const storeDay = storeHours.find((s) => s.day_of_week === dayAbbr);

    if (!storeDay || !storeDay.is_open || !storeDay.open_time || !storeDay.close_time) {
      foundConflicts.push(app);
      continue;
    }

    const { hours: sh, minutes: sm } = parseTimeString(storeDay.open_time);
    const { hours: ch, minutes: cm } = parseTimeString(storeDay.close_time);

    const appStartMs = d.getTime();
    const serviceObj = Array.isArray(app.service) ? app.service[0] : app.service;
    const dur = (serviceObj as any)?.duration_minutes || 0;
    const appEndMs = appStartMs + dur * 60 * 1000;

    const baseYear = d.getFullYear();
    const baseMonth = d.getMonth();
    const baseDay = d.getDate();

    const openTimeVal = timeToMins(storeDay.open_time);
    const closeTimeVal = timeToMins(storeDay.close_time);
    const isOvernight = closeTimeVal < openTimeVal;

    let storeWindows = [];
    if (!isOvernight) {
      storeWindows.push({
        start: new Date(baseYear, baseMonth, baseDay, sh, sm, 0, 0),
        end: new Date(baseYear, baseMonth, baseDay, ch, cm, 0, 0)
      });
    } else {
      storeWindows.push({
        start: new Date(baseYear, baseMonth, baseDay, sh, sm, 0, 0),
        end: new Date(baseYear, baseMonth, baseDay, 24, 0, 0, 0)
      });
      storeWindows.push({
        start: new Date(baseYear, baseMonth, baseDay + 1, 0, 0, 0, 0),
        end: new Date(baseYear, baseMonth, baseDay + 1, ch, cm, 0, 0)
      });
    }

    const fallsInStoreWindow = storeWindows.some(win =>
      appStartMs >= win.start.getTime() && appEndMs <= win.end.getTime()
    );

    if (!fallsInStoreWindow) {
      foundConflicts.push(app);
    }
  }

  return foundConflicts;
}
