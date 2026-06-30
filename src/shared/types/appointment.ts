export interface Appointment {
  id: number;
  customer_id: number;
  barber_id: number;
  service_id: number;
  appointment_date: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  created_at?: string;
}

export interface ExistingAppointment {
  id: number;
  barber_id?: number;
  appointment_date: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  service?: { duration_minutes: number } | null;
  duration_minutes?: number;
}

export interface FullAppointment {
  id: number;
  appointment_date: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  customer: {
    id: number;
    name: string;
    phone: string;
    email?: string | null;
  };
  service: {
    id: number;
    name: string;
    duration_minutes: number;
    price: number;
  };
  barber: {
    id: number;
    name: string;
  };
}

export interface AppointmentRecord {
  id: number;
  appointment_date: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  customer: {
    id: number;
    name: string;
    phone: string;
    email: string | null;
  } | null;
  barber: {
    id: number;
    name: string;
  } | null;
  service: {
    id: number;
    name: string;
    duration_minutes: number;
    price: number;
    category_name?: string;
  } | null;
  processed_by_user_id?: number | null;
}

export interface CustomerAppointment {
  id: number;
  appointment_date: string;
  status: string;
  barber: { name: string } | null;
  service: { name: string; price: number; duration_minutes: number; description: string | null } | null;
}
