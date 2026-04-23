'use client';

import { useCallback, useMemo } from 'react';
import { isSuperAdmin } from '@/lib/auth';
import { useAuth } from './useAuth';

const normalizePermissionToken = (value: string) =>
  value.trim().toLowerCase().replace(/:/g, '.');

export default function usePermission() {
  const { user } = useAuth();
  const normalizedPermissions = useMemo(
    () => (user?.permissions ?? []).map(normalizePermissionToken),
    [user]
  );

  const can = useCallback((module: string, action?: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin(user)) return true;
    if (normalizedPermissions.includes('*')) return true;
    if (!normalizedPermissions.length) return false;

    const normalizedModule = normalizePermissionToken(module);
    
    if (action) {
      const fullPermission = `${normalizedModule}.${normalizePermissionToken(action)}`;
      return (
        normalizedPermissions.includes(fullPermission) ||
        normalizedPermissions.includes(normalizedModule)
      );
    }
    
    return (
      normalizedPermissions.includes(normalizedModule) ||
      normalizedPermissions.some((permission) => permission.startsWith(`${normalizedModule}.`))
    );
  }, [normalizedPermissions, user]);

  const hasRole = useCallback((roleName: string): boolean => {
    if (!user) return false;
    const normalizedRole = roleName.toLowerCase().replace(/[\s_-]+/g, '');
    if (normalizedRole === 'superadmin' && isSuperAdmin(user)) {
      return true;
    }
    const currentRoles = [user.role?.role_name, user.role?.title, user.role?.slug]
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase().replace(/[\s_-]+/g, ''));

    return currentRoles.includes(normalizedRole);
  }, [user]);

  return { can, hasRole };
}
