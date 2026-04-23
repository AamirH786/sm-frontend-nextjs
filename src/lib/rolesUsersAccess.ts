import { isSuperAdmin } from '@/lib/auth';
import { User } from '@/types/auth';

export type RolesUsersSectionKey =
  | 'actions'
  | 'modules'
  | 'permissions'
  | 'roles'
  | 'users'
  | 'ip-restrictions'
  | 'logs';

export type PermissionChecker = (module: string, action?: string) => boolean;

export type RolesUsersSection = {
  key: RolesUsersSectionKey;
  name: string;
  href: string;
  module?: string;
  action?: string;
  requiresSuperAdmin?: boolean;
  showInOverview?: boolean;
};

export const EMPLOYEES_LABEL = 'Employees';
export const EMPLOYEES_ACCESS_LABEL = 'Employees & Access';

export const rolesUsersSections: RolesUsersSection[] = [
  {
    key: 'actions',
    name: 'Actions',
    href: '/roles-users/actions',
    module: 'actions',
    action: 'view',
    showInOverview: true,
  },
  {
    key: 'modules',
    name: 'Modules',
    href: '/roles-users/modules',
    module: 'modules',
    action: 'view',
    showInOverview: true,
  },
  {
    key: 'permissions',
    name: 'Permissions',
    href: '/roles-users/permissions',
    module: 'permissions',
    action: 'view',
    showInOverview: true,
  },
  {
    key: 'roles',
    name: 'Roles',
    href: '/roles-users/roles',
    module: 'roles',
    action: 'view',
    showInOverview: true,
  },
  {
    key: 'users',
    name: EMPLOYEES_LABEL,
    href: '/roles-users/users',
    module: 'users',
    action: 'view',
    showInOverview: true,
  },
  {
    key: 'ip-restrictions',
    name: 'IP Restrictions',
    href: '/roles-users/ip-restrictions',
    requiresSuperAdmin: true,
    showInOverview: true,
  },
  {
    key: 'logs',
    name: 'Logs',
    href: '/roles-users/logs',
    module: 'activity-logs',
    action: 'view',
    showInOverview: true,
  },
];

export function canAccessRolesUsersSection(
  section: RolesUsersSection,
  user: User | null | undefined,
  can: PermissionChecker
): boolean {
  if (section.requiresSuperAdmin) {
    return isSuperAdmin(user);
  }

  if (!section.module) {
    return true;
  }

  return can(section.module, section.action);
}

export function canAccessAnyRolesUsersSection(
  user: User | null | undefined,
  can: PermissionChecker
): boolean {
  return rolesUsersSections.some((section) =>
    canAccessRolesUsersSection(section, user, can)
  );
}
