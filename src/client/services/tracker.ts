import { supabase } from '../../shared/services/supabaseClient';
import type { FullAppointment } from '../../shared/types/appointment';

export async function getAppointmentByBookingId(searchId: string): Promise<FullAppointment | null> {
  const idSequence = parseInt(searchId.toUpperCase().replace('FBS-', '')) - 100000;
  if (isNaN(idSequence)) return null;

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      status,
      customer:customers ( id, name, phone, email ),
      barber:barbers ( id, name ),
      service:services ( id, name, price, duration_minutes )
    `)
    .eq('id', idSequence)
    .single();

  if (error) throw error;
  if (!data) return null;

  const rawCustomer: any = Array.isArray(data.customer) ? data.customer[0] : data.customer;
  const rawBarber: any = Array.isArray(data.barber) ? data.barber[0] : data.barber;
  const rawService: any = Array.isArray(data.service) ? data.service[0] : data.service;

  return {
    id: data.id,
    appointment_date: data.appointment_date,
    status: data.status,
    customer: rawCustomer
      ? {
          id: rawCustomer.id,
          name: rawCustomer.name,
          phone: rawCustomer.phone,
          email: rawCustomer.email,
        }
      : null,
    barber: rawBarber ? { id: rawBarber.id, name: rawBarber.name } : null,
    service: rawService
      ? {
          id: rawService.id,
          name: rawService.name,
          price: Number(rawService.price),
          duration_minutes: Number(rawService.duration_minutes),
        }
      : null,
  } as any;
}
