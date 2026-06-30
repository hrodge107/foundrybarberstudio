import { supabase } from '../../shared/services/supabaseClient';
import type { ActivityLogItem } from '../../shared/types/log';

export async function getActivityLogs(): Promise<ActivityLogItem[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
