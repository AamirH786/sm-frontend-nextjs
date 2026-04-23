'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { modulesService, actionsService, permissionsService, rolesService, usersService } from '@/services/rbacService';
import { getActivityLogs } from '@/services/activity.service';
import employeeService from '@/services/employeeService';
import { useToast } from '@/context/ToastContext';
import { Users, Shield, Key, Layers, Zap, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import usePermission from '@/hooks/usePermission';
import AccessDenied from '@/components/permissions/AccessDenied';
import { canAccessRolesUsersSection, EMPLOYEES_ACCESS_LABEL, rolesUsersSections } from '@/lib/rolesUsersAccess';
import { isSuperAdmin } from '@/lib/auth';

interface Stats {
  modules: number;
  actions: number;
  permissions: number;
  roles: number;
  users: number;
  logs: number;
  ipRestrictions: number;
}

export default function RolesUsersOverview() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { can } = usePermission();
  const canViewModules = can('modules', 'view');
  const canViewActions = can('actions', 'view');
  const canViewPermissions = can('permissions', 'view');
  const canViewRoles = can('roles', 'view');
  const canViewUsers = can('users', 'view');
  const canViewLogs = can('activity-logs', 'view');
  const canViewIPRestrictions = isSuperAdmin(user);
  const [stats, setStats] = useState<Stats>({
    modules: 0,
    actions: 0,
    permissions: 0,
    roles: 0,
    users: 0,
    logs: 0,
    ipRestrictions: 0,
  });
  const [loading, setLoading] = useState(true);
  const visibleSections = useMemo(
    () =>
      rolesUsersSections.filter(
        (section) => section.showInOverview && canAccessRolesUsersSection(section, user, can)
      ),
    [user, can]
  );

  useEffect(() => {
    const fetchStats = async () => {
      let hasPartialFailure = false;
      const safeCount = async (loader: () => Promise<number>) => {
        try {
          return await loader();
        } catch {
          hasPartialFailure = true;
          return 0;
        }
      };

      try {
        setLoading(true);
        const [modules, actions, permissions, roles, users, logs, ipRestrictions] = await Promise.all([
          canViewModules
            ? safeCount(async () => (await modulesService.list({ limit: 1 })).meta.total)
            : Promise.resolve(0),
          canViewActions
            ? safeCount(async () => (await actionsService.list({ limit: 1 })).meta.total)
            : Promise.resolve(0),
          canViewPermissions
            ? safeCount(async () => (await permissionsService.list({ limit: 1 })).meta.total)
            : Promise.resolve(0),
          canViewRoles
            ? safeCount(async () => (await rolesService.list({ limit: 1 })).meta.total)
            : Promise.resolve(0),
          canViewUsers
            ? safeCount(async () => (await usersService.list({ limit: 1, exclude_client: true })).meta.total)
            : Promise.resolve(0),
          canViewLogs
            ? safeCount(async () => (await getActivityLogs({ page: 1, size: 1 })).total || 0)
            : Promise.resolve(0),
          canViewIPRestrictions
            ? safeCount(async () => (await employeeService.listIPRestrictions()).data?.length || 0)
            : Promise.resolve(0),
        ]);
        
        setStats({
          modules,
          actions,
          permissions,
          roles,
          users,
          logs,
          ipRestrictions,
        });

        if (hasPartialFailure) {
          showToast('Some overview analytics could not be loaded. Showing available totals.', 'error');
        }
      } catch (err: any) {
        showToast(err.message || 'Failed to load stats', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [canViewActions, canViewIPRestrictions, canViewLogs, canViewModules, canViewPermissions, canViewRoles, canViewUsers, showToast]);

  const cardConfig = {
    users: {
      count: stats.users,
      icon: Users,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    roles: {
      count: stats.roles,
      icon: Shield,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    permissions: {
      count: stats.permissions,
      icon: Key,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    modules: {
      count: stats.modules,
      icon: Layers,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    actions: {
      count: stats.actions,
      icon: Zap,
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
    logs: {
      count: stats.logs,
      icon: FileText,
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
    },
    'ip-restrictions': {
      count: stats.ipRestrictions,
      icon: Shield,
      bgColor: 'bg-slate-50',
      textColor: 'text-slate-600',
    },
  } as const;

  const cards = visibleSections.map((section) => ({
    title: section.name,
    href: section.href,
    ...cardConfig[section.key],
  }));

  if (!visibleSections.length) {
    return (
      <AccessDenied
        title={`${EMPLOYEES_ACCESS_LABEL} unavailable`}
        description={`Your role does not have access to any ${EMPLOYEES_ACCESS_LABEL} section.`}
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">{EMPLOYEES_ACCESS_LABEL} Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Manage employees, roles, and access control</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{card.title}</p>
                  <p className="text-3xl font-bold mt-1">{card.count}</p>
                </div>
                <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                  <card.icon size={24} className={card.textColor} />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <span className="text-sm text-primary-600 hover:underline">View all {card.title.toLowerCase()} &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
