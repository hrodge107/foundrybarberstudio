import { supabase } from '../../shared/services/supabaseClient';
import type { CustomerUser } from '../../shared/types/user';
import type { CustomerAppointment } from '../../shared/types/appointment';

export async function getCustomerAppointments(customerId: number): Promise<CustomerAppointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      status,
      barber:barbers ( name ),
      service:services ( name, price, duration_minutes, description )
    `)
    .eq('customer_id', customerId)
    .order('appointment_date', { ascending: false });

  if (error) throw error;

  return (data || []).map((item: any) => ({
    id: item.id,
    appointment_date: item.appointment_date,
    status: item.status,
    barber: Array.isArray(item.barber) ? item.barber[0] : item.barber,
    service: Array.isArray(item.service) ? item.service[0] : item.service,
  }));
}

export async function cancelAppointment(appointmentId: number): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status: 'Cancelled' })
    .eq('id', appointmentId);

  if (error) throw error;
}

export async function updateCustomerProfile(
  customerId: number,
  name: string,
  phone: string,
  email: string | null
): Promise<CustomerUser> {
  const { data, error } = await supabase
    .from('customers')
    .update({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : null,
    })
    .eq('id', customerId)
    .select();

  if (error) {
    if (error.code === '23505') {
      if (error.message.includes('phone')) {
        throw new Error('This phone number is already registered to another account.');
      } else if (error.message.includes('email')) {
        throw new Error('This email address is already registered to another account.');
      }
    }
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to update profile.');
  }

  return {
    id: data[0].id,
    name: data[0].name,
    phone: data[0].phone,
    email: data[0].email,
  };
}
