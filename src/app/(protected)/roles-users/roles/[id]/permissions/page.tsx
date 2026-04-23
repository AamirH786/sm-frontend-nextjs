'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search, X } from 'lucide-react';
import { rolesService, permissionsService, modulesService, Permission, Module, Role } from '@/services/rbacService';
import Button from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import usePermission from '@/hooks/usePermission';
import AccessDenied from '@/components/permissions/AccessDenied';

interface ModulePermissionGroup {
  module: Module;
  permissions: Permission[];
}

interface ModuleSection {
  label: string;
  items: ModulePermissionGroup[];
}

const humanizePermissionSlug = (slug?: string) => {
  if (!slug) return 'Unnamed Permission';
  const leaf = slug.split('.').pop() || slug;
  return leaf
    .replace(/[-_.]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getPermissionLabel = (permission: Permission, includeModule = false) => {
  const actionLabel = permission.action?.title?.trim();
  const moduleLabel = permission.module?.title?.trim();

  if (includeModule && moduleLabel && actionLabel) {
    return `${moduleLabel} -> ${actionLabel}`;
  }

  return permission.title?.trim() || actionLabel || humanizePermissionSlug(permission.slug);
};

const sortPermissions = (items: Permission[]) =>
  [...items].sort((left, right) => {
    const leftAction = left.action?.title || getPermissionLabel(left);
    const rightAction = right.action?.title || getPermissionLabel(right);
    return leftAction.localeCompare(rightAction);
  });

export default function RolePermissionsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { can } = usePermission();
  const roleId = Number(params.id);

  const [role, setRole] = useState<Role | null>(null);
  const [moduleGroups, setModuleGroups] = useState<ModulePermissionGroup[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const canViewPage =
    can('roles', 'view') &&
    can('modules', 'view') &&
    can('permissions', 'view') &&
    can('role-permissions', 'view');
  const canSavePermissions = canViewPage && can('role-permissions', 'update');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [roleData, modulesRes, permissionsRes, rolePermIds] = await Promise.all([
        rolesService.get(roleId),
        modulesService.listAll(),
        permissionsService.listAll(),
        rolesService.getPermissions(roleId),
      ]);

      const groups: ModulePermissionGroup[] = modulesRes
        .map((module) => ({
          module,
          permissions: sortPermissions(
            permissionsRes.filter((permission) => permission.module_id === module.id)
          ),
        }))
        .sort((left, right) => left.module.title.localeCompare(right.module.title));

      const initialPermissionIds = roleData.is_super_admin
        ? new Set(permissionsRes.map((permission) => permission.id))
        : new Set(rolePermIds);

      const firstModuleId =
        groups.find((group) => group.permissions.length > 0)?.module.id ??
        groups[0]?.module.id ??
        null;

      setRole(roleData);
      setModuleGroups(groups);
      setSelectedPermissions(initialPermissionIds);
      setSelectedModuleId((current) =>
        current && groups.some((group) => group.module.id === current) ? current : firstModuleId
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [roleId, showToast]);

  useEffect(() => {
    if (canViewPage) {
      fetchData();
    }
  }, [canViewPage, fetchData]);

  const permissionIndex = useMemo(() => {
    const index = new Map<number, Permission>();
    moduleGroups.forEach((group) => {
      group.permissions.forEach((permission) => {
        index.set(permission.id, permission);
      });
    });
    return index;
  }, [moduleGroups]);

  const groupedModules = useMemo<ModuleSection[]>(() => {
    const sections = new Map<string, ModulePermissionGroup[]>();

    moduleGroups.forEach((group) => {
      const label = group.module.group?.trim() || 'Other';
      const bucket = sections.get(label) ?? [];
      bucket.push(group);
      sections.set(label, bucket);
    });

    return Array.from(sections.entries())
      .map(([label, items]) => ({
        label,
        items: [...items].sort((left, right) =>
          left.module.title.localeCompare(right.module.title)
        ),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [moduleGroups]);

  const selectedModule = useMemo(
    () =>
      moduleGroups.find((group) => group.module.id === selectedModuleId) ??
      moduleGroups[0] ??
      null,
    [moduleGroups, selectedModuleId]
  );

  const activeModulePermissions = useMemo(() => {
    const permissions = selectedModule?.permissions ?? [];
    if (!searchTerm.trim()) return permissions;

    const term = searchTerm.trim().toLowerCase();
    return permissions.filter((permission) => {
      const actionLabel = getPermissionLabel(permission).toLowerCase();
      const fullLabel = getPermissionLabel(permission, true).toLowerCase();
      return (
        actionLabel.includes(term) ||
        fullLabel.includes(term) ||
        (permission.slug || '').toLowerCase().includes(term)
      );
    });
  }, [searchTerm, selectedModule]);

  const selectedPermissionItems = useMemo(
    () =>
      Array.from(selectedPermissions)
        .map((permissionId) => permissionIndex.get(permissionId))
        .filter((permission): permission is Permission => Boolean(permission))
        .sort((left, right) => {
          const leftLabel = getPermissionLabel(left, true);
          const rightLabel = getPermissionLabel(right, true);
          return leftLabel.localeCompare(rightLabel);
        }),
    [permissionIndex, selectedPermissions]
  );

  const allPermissionIds = useMemo(
    () => moduleGroups.flatMap((group) => group.permissions.map((permission) => permission.id)),
    [moduleGroups]
  );

  const areAllPermissionsSelected =
    allPermissionIds.length > 0 &&
    allPermissionIds.every((permissionId) => selectedPermissions.has(permissionId));

  const currentModulePermissionIds = selectedModule?.permissions.map((permission) => permission.id) ?? [];
  const isCurrentModuleFullySelected =
    currentModulePermissionIds.length > 0 &&
    currentModulePermissionIds.every((permissionId) => selectedPermissions.has(permissionId));

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions((current) => {
      const next = new Set(current);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  };

  const toggleAllPermissions = () => {
    setSelectedPermissions((current) => {
      const next = new Set(current);

      if (allPermissionIds.length > 0 && allPermissionIds.every((permissionId) => next.has(permissionId))) {
        return new Set();
      }

      return new Set(allPermissionIds);
    });
  };

  const toggleCurrentModulePermissions = () => {
    if (!currentModulePermissionIds.length) return;

    setSelectedPermissions((current) => {
      const next = new Set(current);
      const fullySelected = currentModulePermissionIds.every((permissionId) => next.has(permissionId));

      currentModulePermissionIds.forEach((permissionId) => {
        if (fullySelected) {
          next.delete(permissionId);
        } else {
          next.add(permissionId);
        }
      });

      return next;
    });
  };

  const handleSave = async () => {
    if (role?.is_super_admin) {
      showToast('Super Admin role already has full access', 'success');
      return;
    }

    try {
      setSaving(true);
      await rolesService.assignPermissions(roleId, Array.from(selectedPermissions));
      showToast('Permissions saved successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!canViewPage) {
    return (
      <AccessDenied
        title="Role permissions unavailable"
        description="Your role does not have permission to manage role permissions."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <button
            onClick={() => router.push('/roles-users/roles')}
            className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-800"
          >
            <ArrowLeft size={16} />
            Back to Roles
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Assign Permissions</h1>
            <p className="text-sm text-gray-500">
              Configure access for <span className="font-medium text-primary-600">{role?.title}</span>
            </p>
          </div>
        </div>

        <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
          {selectedPermissionItems.length} selected permissions
        </div>
      </div>

      {role?.is_super_admin && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          This role is marked as Super Admin and automatically has all permissions.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.7fr_1.4fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Modules</h2>
            <span className="text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
              {moduleGroups.length} total
            </span>
          </div>

          <button
            type="button"
            onClick={toggleAllPermissions}
            disabled={Boolean(role?.is_super_admin) || !allPermissionIds.length}
            className="mb-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {areAllPermissionsSelected ? 'Unselect All Modules' : 'Select All Modules'}
          </button>

          <div className="max-h-[620px] space-y-6 overflow-y-auto pr-1">
            {groupedModules.map((section) => (
              <div key={section.label} className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-400">
                  {section.label}
                </h3>

                <div className="space-y-2">
                  {section.items.map((group) => {
                    const selectedCount = group.permissions.filter((permission) =>
                      selectedPermissions.has(permission.id)
                    ).length;
                    const isActive = selectedModule?.module.id === group.module.id;

                    return (
                      <button
                        key={group.module.id}
                        type="button"
                        onClick={() => setSelectedModuleId(group.module.id)}
                        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span className="pr-3 text-lg font-medium">{group.module.title}</span>
                        <span
                          className={`min-w-[52px] rounded-full px-3 py-1 text-sm font-semibold ${
                            isActive
                              ? 'bg-white text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {selectedCount}/{group.permissions.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Assign Permissions - <span className="text-primary-600">{role?.title}</span>
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {selectedModule ? selectedModule.module.title : 'Select a module'} permissions
              </p>
            </div>

            <button
              type="button"
              onClick={toggleCurrentModulePermissions}
              disabled={Boolean(role?.is_super_admin) || !currentModulePermissionIds.length}
              className="text-sm font-medium text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:text-blue-300"
            >
              {isCurrentModuleFullySelected ? 'Unselect All' : 'Select / Unselect All'}
            </button>
          </div>

          <div className="relative mb-5">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-12 py-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
            {!selectedModule && (
              <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-500">
                No module available.
              </div>
            )}

            {selectedModule && activeModulePermissions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-500">
                {searchTerm.trim()
                  ? 'No permissions matched your search.'
                  : 'No permissions available for this module.'}
              </div>
            )}

            {activeModulePermissions.map((permission) => (
              <label
                key={permission.id}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-4 text-base text-gray-800 transition hover:border-blue-200 hover:bg-blue-50/40"
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.has(permission.id)}
                  onChange={() => togglePermission(permission.id)}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={Boolean(role?.is_super_admin)}
                />
                <span>{getPermissionLabel(permission)}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Selected Permissions</h2>
            <span className="text-sm text-gray-400">{selectedPermissionItems.length}</span>
          </div>

          <div className="max-h-[620px] overflow-y-auto pr-1">
            {selectedPermissionItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-500">
                No permissions selected
              </div>
            ) : (
              <div className="space-y-1">
                {selectedPermissionItems.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-center justify-between border-b border-gray-100 py-4 text-lg text-gray-800"
                  >
                    <span className="pr-4">{getPermissionLabel(permission, true)}</span>
                    <button
                      type="button"
                      onClick={() => togglePermission(permission.id)}
                      className="rounded-full p-1 text-red-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:text-red-200"
                      disabled={Boolean(role?.is_super_admin)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => router.push('/roles-users/roles')}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          isLoading={saving}
          disabled={!canSavePermissions || Boolean(role?.is_super_admin)}
        >
          Save Permissions
        </Button>
      </div>
    </div>
  );
}
