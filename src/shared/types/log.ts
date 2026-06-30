export interface ActivityLogItem {
  id?: number;
  action_type: string;
  category: 'appointment' | 'barber' | 'service' | 'schedule';
  description: string;
  performed_by?: string;
  created_at?: string;
}
