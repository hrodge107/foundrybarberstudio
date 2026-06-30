import { supabase } from '../../shared/services/supabaseClient';
import type { SystemUser } from '../../shared/types/user';

export async function loginAdmin(username_input: string, password_input: string): Promise<SystemUser> {
  const trimmedUser = username_input.trim();

  // Query system_users table
  let { data, error } = await supabase
    .from('system_users')
    .select('id, username, password_hash, role')
    .eq('username', trimmedUser)
    .maybeSingle();

  // Fallback for database before migration / admins table compatibility
  if (error || !data) {
    const fallback = await supabase
      .from('admins')
      .select('id, username, password_hash')
      .eq('username', trimmedUser)
      .maybeSingle();
    if (fallback.data) {
      data = { ...fallback.data, role: 'admin' };
      error = null;
    }
  }

  if (error || !data) {
    throw new Error('Invalid username or password.');
  }

  if (data.password_hash !== password_input) {
    throw new Error('Invalid username or password.');
  }

  const userObj: SystemUser = {
    id: data.id,
    username: data.username,
    role: data.role || 'admin',
  };

  if (userObj.role === 'barber') {
    const { data: bData } = await supabase
      .from('barbers')
      .select('id')
      .eq('user_id', userObj.id)
      .maybeSingle();
    if (bData) {
      userObj.barber_id = bData.id;
    }
  }

  return userObj;
}
