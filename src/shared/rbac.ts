import type { SystemUser } from './types/user';

export type AdminTab = 
  | 'calendar'
  | 'appointments'
  | 'services'
  | 'barbers'
  | 'customers'
  | 'activity'
  | 'reports'
  | 'profile'
  | 'settings';

export const ROLE_PERMISSIONS: Record<SystemUser['role'], AdminTab[]> = {
  admin: [
    'calendar',
    'appointments',
    'services',
    'barbers',
    'customers',
    'activity',
    'reports',
    'profile',
    'settings'
  ],
  barber: [
    'calendar',
    'appointments',
    'services',
    'barbers',
    'profile'
  ]
};

export function hasPermission(role: SystemUser['role'] | undefined | null, tab: AdminTab): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(tab) ?? false;
}
