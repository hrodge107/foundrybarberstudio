import { supabase } from '../../shared/services/supabaseClient';
import type { SystemUser } from '../../shared/types/user';

export interface BarberDetails {
  id: number;
  name: string;
  is_active: boolean;
  shift_start: string;
  shift_end: string;
  working_days: string[] | string;
  notes?: string | null;
}

export async function getAdminProfileData(systemUser: SystemUser): Promise<{
  credentials: { username: string; password_hash: string };
  barberDetails: BarberDetails | null;
}> {
  let credentials = { username: '', password_hash: '' };

  // Fetch current credentials from system_users or admins table
  let { data: uData, error: uErr } = await supabase
    .from('system_users')
    .select('username, password_hash')
    .eq('id', systemUser.id)
    .maybeSingle();

  if (uErr || !uData) {
    const { data: aData } = await supabase
      .from('admins')
      .select('username, password_hash')
      .eq('id', systemUser.id)
      .maybeSingle();
    if (aData) uData = aData;
  }

  if (uData) {
    credentials = {
      username: uData.username,
      password_hash: uData.password_hash || '',
    };
  }

  let barberDetails: BarberDetails | null = null;

  let barberIdToFetch = systemUser.barber_id;
  if (!barberIdToFetch && systemUser.role === 'barber') {
    const { data: bData } = await supabase
      .from('barbers')
      .select('id')
      .eq('user_id', systemUser.id)
      .maybeSingle();
    if (bData) barberIdToFetch = bData.id;
  }

  if (barberIdToFetch) {
    const { data: bDetails, error: bErr } = await supabase
      .from('barbers')
      .select('id, name, is_active, shift_start, shift_end, working_days, notes')
      .eq('id', barberIdToFetch)
      .single();

    if (!bErr && bDetails) {
      barberDetails = bDetails as unknown as BarberDetails;
    }
  }

  return { credentials, barberDetails };
}

export async function updateAdminCredentials(
  systemUserId: number,
  username: string,
  password_hash: string
): Promise<void> {
  const trimmedUser = username.trim();
  const trimmedPass = password_hash.trim();

  // Update system_users table
  const { error: uErr } = await supabase
    .from('system_users')
    .update({
      username: trimmedUser,
      password_hash: trimmedPass,
    })
    .eq('id', systemUserId);

  if (uErr) {
    // Fallback to admins table
    const { error: aErr } = await supabase
      .from('admins')
      .update({
        username: trimmedUser,
        password_hash: trimmedPass,
      })
      .eq('id', systemUserId);

    if (aErr) throw aErr;
  }
}
