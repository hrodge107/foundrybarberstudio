import { supabase } from '../../shared/services/supabaseClient';
import { logActivity } from '../../shared/services/activityLogger';
import { validateSlotAvailability } from '../../utils/bookingRules';
import type { Service } from '../../shared/types/service';
import type { Barber } from '../../shared/types/barber';
import type { StoreHour } from '../../shared/types/store';
import type { CustomerUser } from '../../shared/types/user';

export async function getServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price, description, image_url, category_name');
  if (error) throw error;
  return data || [];
}

export async function getBarbers(): Promise<Barber[]> {
  const { data, error } = await supabase
    .from('barbers')
    .select('id, name, is_active, shift_start, shift_end, working_days, image_url, notes')
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

export async function getStoreHours(): Promise<StoreHour[]> {
  const { data, error } = await supabase
    .from('store_hours')
    .select('*');
  if (error) throw error;
  return data || [];
}

export async function saveAppointment(
  bookingData: {
    service: Service;
    barber: Barber;
    date: Date;
    time: string;
    fullName: string;
    phone: string;
    email: string;
    emailReminder: boolean;
    paymentMethod?: 'Cash' | 'GCash';
    paymentStatus?: 'Unpaid' | 'Paid' | 'Pending';
  },
  currentCustomerUser: CustomerUser | null
): Promise<string | null> {
  const { service, barber, date, time, fullName, phone, email, paymentMethod, paymentStatus } = bookingData;

  const [timeStr, modifier] = time.split(' ');
  let [hoursStr, minutesStr] = timeStr.split(':');
  let hours = parseInt(hoursStr);
  const minutes = parseInt(minutesStr);

  if (modifier === 'PM' && hours < 12) {
    hours += 12;
  }
  if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  const appointmentDate = new Date(date);
  appointmentDate.setHours(hours, minutes, 0, 0);
  const combinedDateTimeIsoString = appointmentDate.toISOString();

  // Re-validate availability
  const isSlotFree = await validateSlotAvailability(
    supabase,
    barber.id,
    service.duration_minutes,
    combinedDateTimeIsoString
  );

  if (!isSlotFree) {
    alert("Sorry, that slot was just taken. Please choose another time.");
    return null;
  }

  let customerId = currentCustomerUser?.id;

  if (!customerId) {
    let customer = null;
    const cleanPhone = phone ? phone.trim() : '';
    const cleanEmail = email ? email.trim() : '';

    if (cleanPhone) {
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();
      if (error) throw error;
      customer = data;
    } else if (cleanEmail) {
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();
      if (error) throw error;
      customer = data;
    }

    customerId = customer?.id;

    if (!customerId) {
      const { data: newCustomer, error: insertErr } = await supabase
        .from('customers')
        .insert({
          name: fullName.trim(),
          phone: cleanPhone || null,
          email: cleanEmail || null,
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;
      customerId = newCustomer.id;
    }
  }

  const { data: appointment, error: apptErr } = await supabase
    .from('appointments')
    .insert({
      customer_id: customerId,
      barber_id: barber.id,
      service_id: service.id,
      appointment_date: combinedDateTimeIsoString,
      status: 'Pending',
      payment_method: paymentMethod || 'Cash',
      payment_status: paymentStatus || 'Unpaid',
    })
    .select('id')
    .single();

  if (apptErr) {
    if (apptErr.code === '23505') {
      alert("Sorry, that slot was just taken. Please choose another time.");
      return null;
    }
    throw apptErr;
  }

  const bookingId = `FBS-${100000 + Number(appointment.id)}`;
  await logActivity('booking', 'appointment', `New booking ${bookingId} for ${service.name} with ${barber.name}`, fullName);
  return bookingId;
}
