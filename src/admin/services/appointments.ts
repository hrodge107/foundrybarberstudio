import { supabase } from '../../shared/services/supabaseClient';
import { validateSlotAvailability } from '../../utils/bookingRules';
import type { AppointmentRecord, FullAppointment } from '../../shared/types/appointment';

export async function getAppointments(): Promise<AppointmentRecord[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      status,
      processed_by_user_id,
      customer:customers ( id, name, phone, email ),
      barber:barbers ( id, name ),
      service:services ( id, name, duration_minutes, price, category_name )
    `)
    .order('appointment_date', { ascending: false });

  if (error) throw error;
  return (data as unknown as AppointmentRecord[]) || [];
}

export async function updateAppointmentStatus(
  id: number,
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled',
  processedByUserId: number | null
): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({
      status,
      processed_by_user_id: processedByUserId,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function getActiveAppointmentsForConflictCheck(excludeId: number): Promise<AppointmentRecord[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      status,
      processed_by_user_id,
      customer:customers ( id, name, phone, email ),
      barber:barbers ( id, name ),
      service:services ( id, name, duration_minutes, price, category_name )
    `)
    .in('status', ['Pending', 'Confirmed'])
    .neq('id', excludeId);

  if (error) throw error;
  return (data as unknown as AppointmentRecord[]) || [];
}

export async function deleteAppointment(id: number): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function createAppointmentAdmin(appointmentData: {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  serviceId: number;
  barberId: number;
  appointmentDate: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
}): Promise<void> {
  // Fetch service duration
  const { data: service, error: sErr } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', appointmentData.serviceId)
    .single();

  if (sErr) throw sErr;
  if (!service) throw new Error('Service not found.');

  // Validate availability
  const isAvailable = await validateSlotAvailability(
    supabase,
    appointmentData.barberId,
    service.duration_minutes,
    appointmentData.appointmentDate
  );

  if (!isAvailable) {
    throw new Error('This slot is already occupied for the selected barber.');
  }

  // Check or create customer
  let { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', appointmentData.customerPhone.trim())
    .maybeSingle();

  if (custErr) throw custErr;
  let customerId = customer?.id;

  if (!customerId) {
    const { data: newCustomer, error: newCustErr } = await supabase
      .from('customers')
      .insert({
        name: appointmentData.customerName.trim(),
        phone: appointmentData.customerPhone.trim(),
        email: appointmentData.customerEmail ? appointmentData.customerEmail.trim() : null
      })
      .select('id')
      .single();

    if (newCustErr) throw newCustErr;
    customerId = newCustomer.id;
  }

  // Insert appointment
  const { error: apptErr } = await supabase
    .from('appointments')
    .insert({
      customer_id: customerId,
      barber_id: appointmentData.barberId,
      service_id: appointmentData.serviceId,
      appointment_date: appointmentData.appointmentDate,
      status: appointmentData.status
    });

  if (apptErr) throw apptErr;
}

export async function getDashboardAppointments(
  startDate: string,
  endDate: string,
  barberId: number | null
): Promise<FullAppointment[]> {
  let query = supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      status,
      customer:customers ( id, name, phone, email ),
      barber:barbers ( id, name ),
      service:services ( id, name, duration_minutes, price )
    `)
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate);

  if (barberId !== null) {
    query = query.eq('status', 'Confirmed').eq('barber_id', barberId);
  } else {
    query = query.in('status', ['Pending', 'Confirmed']);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    appointment_date: item.appointment_date,
    status: item.status as any,
    customer: Array.isArray(item.customer) ? item.customer[0] : item.customer,
    barber: Array.isArray(item.barber) ? item.barber[0] : item.barber,
    service: Array.isArray(item.service) ? item.service[0] : item.service,
  }));
}
