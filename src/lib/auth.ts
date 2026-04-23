import { User, UserRole } from '@/types/auth';

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return undefined;
}

function normalizeRoleLabel(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/[_-]+/g, ' ').trim();
}

function slugifyRole(value?: string): string | undefined {
  if (!value) return undefined;
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function normalizePermissionEntry(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  const record = toRecord(value);
  if (!record) return undefined;

  return (
    toString(record.slug) ??
    toString(record.permission) ??
    toString(record.name) ??
    toString(record.title)
  );
}

export function normalizePermissions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const permissions = value
    .map((entry) => normalizePermissionEntry(entry))
    .filter((entry): entry is string => Boolean(entry));

  return permissions.length ? Array.from(new Set(permissions)) : [];
}

export function normalizeUserRole(
  rawRole: unknown,
  fallbackRoleId?: unknown,
  fallbackIsSuperAdmin?: unknown
): UserRole | undefined {
  const roleRecord = toRecord(rawRole);
  const roleLabel =
    toString(roleRecord?.role_name) ??
    toString(roleRecord?.title) ??
    normalizeRoleLabel(toString(roleRecord?.slug)) ??
    normalizeRoleLabel(toString(rawRole));
  const roleSlug =
    toString(roleRecord?.slug) ??
    slugifyRole(toString(roleRecord?.title)) ??
    slugifyRole(toString(roleRecord?.role_name)) ??
    slugifyRole(toString(rawRole));
  const roleId =
    toNumber(roleRecord?.id) ??
    toNumber(roleRecord?.role_id) ??
    toNumber(fallbackRoleId);
  const isSuperAdmin =
    toBoolean(roleRecord?.is_super_admin) ??
    toBoolean(fallbackIsSuperAdmin) ??
    false;

  if (!roleLabel && !roleSlug && roleId === undefined && !isSuperAdmin) {
    return undefined;
  }

  return {
    id: roleId,
    role_id: roleId,
    role_name: roleLabel,
    title: roleLabel,
    slug: roleSlug,
    is_super_admin: isSuperAdmin,
    role_type: toString(roleRecord?.role_type),
  };
}

export function normalizeAuthUser(rawUser: unknown): User | null {
  const userRecord = toRecord(rawUser);
  if (!userRecord) return null;

  const firstName = toString(userRecord.first_name);
  const lastName = toString(userRecord.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const name = toString(userRecord.name) ?? (fullName || undefined);
  const role = normalizeUserRole(userRecord.role, userRecord.role_id, userRecord.is_super_admin);
  const permissions =
    normalizePermissions(userRecord.permissions) ??
    normalizePermissions(toRecord(userRecord.role)?.permissions);
  const id = toNumber(userRecord.id) ?? toNumber(userRecord.user_id);

  if (id === undefined && !toString(userRecord.username) && !toString(userRecord.email)) {
    return null;
  }

  return {
    id,
    user_id: toNumber(userRecord.user_id) ?? id,
    tenant_id: toNumber(userRecord.tenant_id),
    tenantId: toNumber(userRecord.tenantId) ?? toNumber(userRecord.tenant_id),
    username: toString(userRecord.username),
    name,
    first_name: firstName,
    last_name: lastName,
    email: toString(userRecord.email),
    phone: toString(userRecord.phone),
    tenant: (() => {
      const tenantRecord = toRecord(userRecord.tenant);
      if (!tenantRecord) return null;
      return {
        id: toNumber(tenantRecord.id),
        name: toString(tenantRecord.name),
      };
    })(),
    status: toNumber(userRecord.status),
    role_id: toNumber(userRecord.role_id) ?? role?.id,
    role,
    permissions,
    is_super_admin: toBoolean(userRecord.is_super_admin) ?? role?.is_super_admin,
  };
}

function normalizeComparableRole(value?: string): string {
  return (value ?? '').toLowerCase().replace(/[\s_-]+/g, '');
}

export function isSuperAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.is_super_admin || user.role?.is_super_admin) {
    return true;
  }

  const roleCandidates = [
    user.role?.slug,
    user.role?.title,
    user.role?.role_name,
  ];

  return roleCandidates.some((value) => normalizeComparableRole(value) === 'superadmin');
}

export function getUserDisplayName(user: User | null | undefined): string {
  if (!user) return 'User';
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return user.username || user.name || fullName || user.email || 'User';
}

export function getRoleDisplayName(user: User | null | undefined): string {
  const roleLabel = user?.role?.title ?? user?.role?.role_name ?? normalizeRoleLabel(user?.role?.slug);
  return roleLabel || (isSuperAdmin(user) ? 'Super Admin' : 'User');
}
