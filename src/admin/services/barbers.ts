import { supabase } from '../../shared/services/supabaseClient';
import type { BarberItem, BarberModalData } from '../../shared/types/barber';

export async function getBarbersAdmin(): Promise<BarberItem[]> {
  const { data: barbersData, error: bErr } = await supabase
    .from('barbers')
    .select('id, user_id, name, shift_start, shift_end, working_days, image_url, notes')
    .order('id', { ascending: true });

  if (bErr) throw bErr;

  const { data: usersData, error: uErr } = await supabase
    .from('system_users')
    .select('id, username, password_hash');

  if (uErr) console.warn('Error fetching system users for barbers:', uErr);

  const userMap = new Map<number, { username: string; password_hash?: string }>();
  if (usersData) {
    usersData.forEach((u) => userMap.set(u.id, { username: u.username, password_hash: u.password_hash }));
  }

  return (barbersData || []).map((b) => {
    const userRec = b.user_id ? userMap.get(b.user_id) : undefined;
    return {
      id: b.id,
      user_id: b.user_id,
      name: b.name,
      shift_start: b.shift_start,
      shift_end: b.shift_end,
      working_days: Array.isArray(b.working_days)
        ? b.working_days
        : typeof b.working_days === 'string'
          ? (b.working_days as string).split(',')
          : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      username: userRec?.username || `barber_${b.id}`,
      password: userRec?.password_hash || '',
      image_url: b.image_url,
      notes: b.notes,
    };
  });
}

export async function saveBarber(data: BarberModalData): Promise<void> {
  if (data.id) {
    // Resolve target user_id
    let targetUserId = data.id ? await getBarberUserId(data.id) : null;

    // Update Barber Profile
    const { error: bErr } = await supabase
      .from('barbers')
      .update({
        name: data.name,
        shift_start: data.shift_start,
        shift_end: data.shift_end,
        working_days: data.working_days,
        image_url: data.image_url,
        notes: data.notes,
      })
      .eq('id', data.id);

    if (bErr) throw bErr;

    // Update System User Profile
    if (targetUserId) {
      const userUpdatePayload: any = { username: data.username };
      if (data.password) {
        userUpdatePayload.password_hash = data.password;
      }
      const { error: uErr } = await supabase
        .from('system_users')
        .update(userUpdatePayload)
        .eq('id', targetUserId);

      if (uErr) throw uErr;
    }
  } else {
    // Create Barber: First insert into system_users
    let createdUserId: number | null = null;
    if (data.username && data.password) {
      const { data: newUser, error: uErr } = await supabase
        .from('system_users')
        .insert({
          username: data.username,
          password_hash: data.password,
          role: 'barber',
        })
        .select('id')
        .single();

      if (uErr) throw uErr;
      createdUserId = newUser.id;
    }

    // Then insert into barbers table
    const { error: bErr } = await supabase
      .from('barbers')
      .insert({
        user_id: createdUserId,
        name: data.name,
        shift_start: data.shift_start,
        shift_end: data.shift_end,
        working_days: data.working_days,
        image_url: data.image_url,
        notes: data.notes,
      });

    if (bErr) throw bErr;
  }
}

export async function deleteBarber(barberId: number): Promise<void> {
  const targetUserId = await getBarberUserId(barberId);

  // Delete barber record
  const { error: bErr } = await supabase
    .from('barbers')
    .delete()
    .eq('id', barberId);

  if (bErr) throw bErr;

  // Delete associated system_users record
  if (targetUserId) {
    const { error: uErr } = await supabase
      .from('system_users')
      .delete()
      .eq('id', targetUserId);
    if (uErr) console.warn('Could not delete associated system_user:', uErr);
  }
}

export async function getBarberActiveAppointments(barberId: number): Promise<any[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, appointment_date, status, customers(name)')
    .eq('barber_id', barberId)
    .in('status', ['Pending', 'Confirmed']);

  if (error) throw error;
  return data || [];
}

async function getBarberUserId(barberId: number): Promise<number | null> {
  const { data } = await supabase
    .from('barbers')
    .select('user_id')
    .eq('id', barberId)
    .maybeSingle();
  return data?.user_id || null;
}
