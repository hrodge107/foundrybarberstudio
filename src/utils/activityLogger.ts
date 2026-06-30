import { supabase } from '../supabaseClient';

export interface ActivityLogItem {
  id?: number;
  action_type: string;
  category: 'appointment' | 'barber' | 'service' | 'schedule';
  description: string;
  performed_by?: string;
  created_at?: string;
}

export async function logActivity(
  actionType: string,
  category: 'appointment' | 'barber' | 'service' | 'schedule',
  description: string,
  performedBy?: string
): Promise<void> {
  try {
    const payload = {
      action_type: actionType,
      category: category,
      description: description,
      performed_by: performedBy || 'System',
    };

    const { error } = await supabase.from('activity_logs').insert([payload]);
    if (error) {
      console.warn('Could not record activity log to Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Error executing logActivity:', err);
  }
}
