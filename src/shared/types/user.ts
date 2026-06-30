export interface SystemUser {
  id: number;
  username: string;
  role: 'admin' | 'barber';
  barber_id?: number | null;
}

export interface CustomerUser {
  id: number;
  name: string;
  phone: string;
  email: string | null;
}

export interface CustomerData {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  password_hash: string | null;
  notes: string | null;
}
