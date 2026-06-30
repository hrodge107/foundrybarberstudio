import { supabase } from '../../shared/services/supabaseClient';
import type { CustomerData } from '../../shared/types/user';
import type { CustomerAppointment } from '../../shared/types/appointment';

export async function getCustomers(): Promise<CustomerData[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, email, password_hash, notes')
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
}

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

export async function updateCustomerNotes(customerId: number, notes: string | null): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({ notes: notes ? notes.trim() : null })
    .eq('id', customerId);

  if (error) throw error;
}

export async function updateCustomerProfile(
  customerId: number,
  name: string,
  phone: string,
  email: string | null,
  passwordHash: string | null
): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : null,
      password_hash: passwordHash ? passwordHash.trim() : null,
    })
    .eq('id', customerId);

  if (error) throw error;
}

export async function deleteCustomer(customerId: number): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId);

  if (error) throw error;
}
