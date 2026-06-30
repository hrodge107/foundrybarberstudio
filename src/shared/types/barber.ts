export interface Barber {
  id: number;
  name: string;
  is_active: boolean;
  shift_start: string;
  shift_end: string;
  working_days: string[];
  image_url?: string | null;
  notes?: string | null;
}

export interface BarberSchedule {
  id: number;
  name: string;
  is_active: boolean;
  shift_start: string;
  shift_end: string;
  working_days: string[];
}

export interface BarberModalData {
  id?: number;
  user_id?: number | null;
  name: string;
  shift_start: string;
  shift_end: string;
  working_days: string[];
  username: string;
  password?: string;
  image_url?: string | null;
  notes?: string | null;
}

export interface AppointmentConflict {
  id: number;
  customerName: string;
  serviceName: string;
  appointmentDate: string;
  status: string;
}

export interface BarberItem {
  id: number;
  user_id: number | null;
  name: string;
  shift_start: string;
  shift_end: string;
  working_days: string[];
  username?: string;
  password?: string;
  image_url?: string | null;
  notes?: string | null;
}
