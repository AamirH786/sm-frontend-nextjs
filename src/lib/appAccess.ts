import { isSuperAdmin, normalizeAuthUser } from '@/lib/auth';
import { User, UserContext } from '@/types/auth';
import {
  canAccessAnyRolesUsersSection,
  EMPLOYEES_ACCESS_LABEL,
  PermissionChecker,
} from '@/lib/rolesUsersAccess';

export type AccessRule = {
  module?: string;
  action?: string;
  anyOf?: AccessRule[];
  requiresSuperAdmin?: boolean;
  check?: (user: User | null | undefined, can: PermissionChecker) => boolean;
};

export type AccessSection = {
  name: string;
  href: string;
  access: AccessRule;
  showInTabs?: boolean;
  showInOverview?: boolean;
};

type RouteAccessEntry = {
  matches: (pathname: string) => boolean;
  access: AccessRule;
  title: string;
  description: string;
};

const normalizePermissionToken = (value: string) =>
  value.trim().toLowerCase().replace(/:/g, '.');

const startsWithRoute = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

const matchesDynamicEditRoute = (pathname: string, baseRoute: string) => {
  const pattern = new RegExp(`^${baseRoute}/[^/]+/edit(?:/.*)?$`);
  return pattern.test(pathname);
};

const matchesDynamicDetailRoute = (pathname: string, baseRoute: string) => {
  const pattern = new RegExp(`^${baseRoute}/[^/]+(?:/.*)?$`);
  return pattern.test(pathname);
};

export const characterSections: AccessSection[] = [
  { name: 'Emotions', href: '/masters/character/emotions', access: { module: 'emotion', action: 'view' }, showInTabs: true, showInOverview: true },
  { name: 'Tones', href: '/masters/character/tones', access: { module: 'tone', action: 'view' }, showInTabs: true, showInOverview: true },
  { name: 'Communication Styles', href: '/masters/character/communication-styles', access: { module: 'communication_style', action: 'view' }, showInTabs: true, showInOverview: true },
  { name: 'Modes', href: '/masters/character/modes', access: { module: 'mode', action: 'view' }, showInTabs: true, showInOverview: true },
  { name: 'Domains', href: '/masters/character/domains', access: { module: 'domain', action: 'view' }, showInTabs: true, showInOverview: true },
  { name: 'Delivery', href: '/masters/character/delivery', access: { module: 'delivery', action: 'view' }, showInTabs: true, showInOverview: true },
  // { name: 'Personas', href: '/masters/character/personas', access: { module: 'persona', action: 'view' }, showInTabs: true, showInOverview: true },
  { name: 'System Safety', href: '/masters/character/system-safety', access: { module: 'system_safety', action: 'view' }, showInTabs: true, showInOverview: true },
];

export const onboardingSections: AccessSection[] = [
  // { name: 'Profile Setup', href: '/masters/profile-builder', access: { module: 'onboarding_masters', action: 'view' }, showInTabs: true, showInOverview: true },
  // { name: 'Interests', href: '/masters/onboarding/interests', access: { module: 'onboarding_masters', action: 'view' }, showInTabs: true, showInOverview: true },
  // { name: 'Support Types', href: '/masters/onboarding/support-types', access: { module: 'onboarding_masters', action: 'view' }, showInTabs: true, showInOverview: true },
  // { name: 'Interaction Styles', href: '/masters/onboarding/interaction-styles', access: { module: 'onboarding_masters', action: 'view' }, showInTabs: true, showInOverview: true },
];

export const mastersSections: AccessSection[] = [
  {
    name: 'Character',
    href: '/masters/character',
    access: { anyOf: characterSections.map((section) => section.access) },
    showInTabs: true,
    showInOverview: true,
  },
  {
    name: 'Avatars',
    href: '/masters/avatars',
    access: { module: 'avatar', action: 'view' },
    showInTabs: true,
    showInOverview: true,
  },
  {
    name: 'AI-Settings',
    href: '/masters/ai-settings',
    access: { module: 'ai_settings', action: 'read' },
    showInTabs: true,
    showInOverview: true,
  },
  {
    name: 'Website Settings',
    href: '/masters/website-settings',
    access: { module: 'website_settings', action: 'update' },
    showInTabs: true,
    showInOverview: true,
  },
  {
    name: 'Content Pages',
    href: '/masters/content-pages',
    access: { module: 'content_page', action: 'view' },
    showInTabs: true,
    showInOverview: true,
  },
  {
    name: 'Profile Setup',
    href: '/masters/profile-builder',
    access: { module: 'onboarding_masters', action: 'view' },
    showInTabs: true,
    showInOverview: true,
  },
  // {
  //   name: 'Onboarding',
  //   href: '/masters/onboarding',
  //   access: { module: 'onboarding_masters', action: 'view' },
  //   showInTabs: true,
  //   showInOverview: true,
  // },
  {
    name: 'Learning Admin',
    href: '/masters/learning-admin',
    access: { module: 'learning_admin', action: 'view' },
    showInTabs: true,
    showInOverview: true,
  },
  {
    name: 'Departments',
    href: '/masters/departments',
    access: { module: 'department', action: 'view' },
    showInTabs: true,
    showInOverview: true,
  },
  {
    name: 'Designations',
    href: '/masters/designations',
    access: { module: 'designation', action: 'view' },
    showInTabs: true,
    showInOverview: true,
  },
  {
    name: 'Person Master',
    href: '/masters/persons',
    access: { module: 'person_master', action: 'view' },
    showInTabs: true,
    showInOverview: true,
  },
  {
    name: 'Task Statuses',
    href: '/masters/task-statuses',
    access: { module: 'task_status', action: 'view' },
    showInTabs: true,
    showInOverview: true,
  },
  {
    name: 'HeyGen Avatars',
    href: '/masters/heygen-avatars',
    access: { module: 'avatar', action: 'read' },
    showInTabs: false,
    showInOverview: true,
  },
];

export const topNavSections: AccessSection[] = [
  { name: 'Home', href: '/dashboard', access: { module: 'dashboard', action: 'view' } },
  { name: 'Organizations', href: '/organizations', access: { module: 'organizations', action: 'read' } },
  {
    name: 'Masters',
    href: '/masters',
    access: { anyOf: mastersSections.map((section) => section.access) },
  },
  { name: 'Clients', href: '/clients', access: { module: 'users', action: 'view' } },
  { name: 'Tasks', href: '/tasks', access: { module: 'tasks', action: 'view' } },
  {
    name: 'Attendance',
    href: '/attendance',
    access: {
      anyOf: [
        { module: 'attendance', action: 'view' },
        { module: 'attendance', action: 'create' },
        { module: 'attendance', action: 'update' },
      ],
    },
  },
  { name: 'Trial Requests', href: '/trial-requests', access: { module: 'trial', action: 'view' } },
  {
    name: EMPLOYEES_ACCESS_LABEL,
    href: '/roles-users',
    access: {
      check: (user, can) => canAccessAnyRolesUsersSection(user, can),
    },
  },
];

const protectedRouteAccess: RouteAccessEntry[] = [
  {
    matches: (pathname) => startsWithRoute(pathname, '/organizations/create'),
    access: { module: 'organizations', action: 'create' },
    title: 'Organization onboarding unavailable',
    description: 'Your role does not have permission to create organizations.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/organizations'),
    access: { module: 'organizations', action: 'read' },
    title: 'Organizations unavailable',
    description: 'Your role does not have permission to manage organizations.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/roles-users'),
    access: {
      check: (user, can) => canAccessAnyRolesUsersSection(user, can),
    },
    title: `${EMPLOYEES_ACCESS_LABEL} unavailable`,
    description: `Your role does not have permission to view any ${EMPLOYEES_ACCESS_LABEL} section.`,
  },
  {
    matches: (pathname) => matchesDynamicEditRoute(pathname, '/masters/avatars'),
    access: { module: 'avatar', action: 'update' },
    title: 'Avatar editing unavailable',
    description: 'Your role does not have permission to edit avatars.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/avatars/create'),
    access: { module: 'avatar', action: 'create' },
    title: 'Avatar creation unavailable',
    description: 'Your role does not have permission to create avatars.',
  },
  {
    matches: (pathname) =>
      matchesDynamicDetailRoute(pathname, '/masters/avatars') &&
      !matchesDynamicEditRoute(pathname, '/masters/avatars'),
    access: { module: 'avatar', action: 'view' },
    title: 'Avatar details unavailable',
    description: 'Your role does not have permission to view avatars.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/avatars'),
    access: { module: 'avatar', action: 'view' },
    title: 'Avatars unavailable',
    description: 'Your role does not have permission to view avatars.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/learning-admin'),
    access: { module: 'learning_admin', action: 'view' },
    title: 'Learning admin unavailable',
    description: 'Your role does not have permission to view the learning administration panel.',
  },
  {
    matches: (pathname) => matchesDynamicEditRoute(pathname, '/masters/content-pages'),
    access: { module: 'content_page', action: 'update' },
    title: 'Content page editing unavailable',
    description: 'Your role does not have permission to edit content pages.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/content-pages/create'),
    access: { module: 'content_page', action: 'create' },
    title: 'Content page creation unavailable',
    description: 'Your role does not have permission to create content pages.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/content-pages'),
    access: { module: 'content_page', action: 'view' },
    title: 'Content pages unavailable',
    description: 'Your role does not have permission to view content pages.',
  },
  {
    matches: (pathname) => matchesDynamicEditRoute(pathname, '/masters/persons'),
    access: { module: 'person_master', action: 'update' },
    title: 'Person editing unavailable',
    description: 'Your role does not have permission to edit person master records.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/persons/create'),
    access: { module: 'person_master', action: 'create' },
    title: 'Person creation unavailable',
    description: 'Your role does not have permission to create person master records.',
  },
  {
    matches: (pathname) =>
      matchesDynamicDetailRoute(pathname, '/masters/persons') &&
      !matchesDynamicEditRoute(pathname, '/masters/persons'),
    access: { module: 'person_master', action: 'view' },
    title: 'Person details unavailable',
    description: 'Your role does not have permission to view person master records.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/persons'),
    access: { module: 'person_master', action: 'view' },
    title: 'Person Master unavailable',
    description: 'Your role does not have permission to view person master records.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/character/emotions'),
    access: { module: 'emotion', action: 'view' },
    title: 'Emotions unavailable',
    description: 'Your role does not have permission to view emotions.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/character/tones'),
    access: { module: 'tone', action: 'view' },
    title: 'Tones unavailable',
    description: 'Your role does not have permission to view tones.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/character/communication-styles'),
    access: { module: 'communication_style', action: 'view' },
    title: 'Communication Styles unavailable',
    description: 'Your role does not have permission to view communication styles.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/character/modes'),
    access: { module: 'mode', action: 'view' },
    title: 'Modes unavailable',
    description: 'Your role does not have permission to view modes.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/character/domains'),
    access: { module: 'domain', action: 'view' },
    title: 'Domains unavailable',
    description: 'Your role does not have permission to view domains.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/character/delivery'),
    access: { module: 'delivery', action: 'view' },
    title: 'Delivery unavailable',
    description: 'Your role does not have permission to view delivery settings.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/character/personas'),
    access: { module: 'persona', action: 'view' },
    title: 'Personas unavailable',
    description: 'Your role does not have permission to view personas.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/character/system-safety'),
    access: { module: 'system_safety', action: 'view' },
    title: 'System Safety unavailable',
    description: 'Your role does not have permission to view system safety settings.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/character'),
    access: { anyOf: characterSections.map((section) => section.access) },
    title: 'Character masters unavailable',
    description: 'Your role does not have permission to view any character master section.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/profile-builder'),
    access: { module: 'onboarding_masters', action: 'view' },
    title: 'Profile Setup unavailable',
    description: 'Your role does not have permission to view profile setup.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/onboarding/interests'),
    access: { module: 'onboarding_masters', action: 'view' },
    title: 'Interests unavailable',
    description: 'Your role does not have permission to view onboarding interests.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/onboarding/support-types'),
    access: { module: 'onboarding_masters', action: 'view' },
    title: 'Support Types unavailable',
    description: 'Your role does not have permission to view onboarding support types.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/onboarding/interaction-styles'),
    access: { module: 'onboarding_masters', action: 'view' },
    title: 'Interaction Styles unavailable',
    description: 'Your role does not have permission to view onboarding interaction styles.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/onboarding'),
    access: { module: 'onboarding_masters', action: 'view' },
    title: 'Onboarding unavailable',
    description: 'Your role does not have permission to view onboarding master data.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/departments'),
    access: { module: 'department', action: 'view' },
    title: 'Departments unavailable',
    description: 'Your role does not have permission to view departments.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/designations'),
    access: { module: 'designation', action: 'view' },
    title: 'Designations unavailable',
    description: 'Your role does not have permission to view designations.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/ai-settings'),
    access: { module: 'ai_settings', action: 'read' },
    title: 'AI Settings unavailable',
    description: 'Your role does not have permission to view AI settings.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/website-settings'),
    access: { module: 'website_settings', action: 'update' },
    title: 'Website Settings unavailable',
    description: 'Your role does not have permission to manage website settings.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/task-statuses'),
    access: { module: 'task_status', action: 'view' },
    title: 'Task Statuses unavailable',
    description: 'Your role does not have permission to view task statuses.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters/heygen-avatars'),
    access: { module: 'avatar', action: 'read' },
    title: 'HeyGen Avatars unavailable',
    description: 'Your role does not have permission to view HeyGen avatars.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/masters'),
    access: { anyOf: mastersSections.map((section) => section.access) },
    title: 'Masters unavailable',
    description: 'Your role does not have permission to view any masters section.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/clients'),
    access: { module: 'users', action: 'view' },
    title: 'Clients unavailable',
    description: 'Your role does not have permission to view clients.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/tasks'),
    access: { module: 'tasks', action: 'view' },
    title: 'Tasks unavailable',
    description: 'Your role does not have permission to view tasks.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/attendance'),
    access: {
      anyOf: [
        { module: 'attendance', action: 'view' },
        { module: 'attendance', action: 'create' },
        { module: 'attendance', action: 'update' },
      ],
    },
    title: 'Attendance unavailable',
    description: 'Your role does not have permission to view attendance.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/trial-requests'),
    access: { module: 'trial', action: 'view' },
    title: 'Trial Requests unavailable',
    description: 'Your role does not have permission to view trial requests.',
  },
  {
    matches: (pathname) => startsWithRoute(pathname, '/dashboard'),
    access: { module: 'dashboard', action: 'view' },
    title: 'Dashboard unavailable',
    description: 'Your role does not have permission to view the dashboard.',
  },
];

export function canAccessRule(
  rule: AccessRule | undefined,
  user: User | null | undefined,
  can: PermissionChecker
): boolean {
  if (!rule) {
    return true;
  }

  if (rule.check) {
    return rule.check(user, can);
  }

  if (rule.requiresSuperAdmin) {
    return isSuperAdmin(user);
  }

  if (rule.anyOf?.length) {
    return rule.anyOf.some((childRule) => canAccessRule(childRule, user, can));
  }

  if (!rule.module) {
    return true;
  }

  return can(rule.module, rule.action);
}

export function userCanAccessPermission(
  rawUser: User | null | undefined,
  module: string,
  action?: string
): boolean {
  const user = normalizeAuthUser(rawUser);
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  const normalizedPermissions = (user.permissions ?? []).map(normalizePermissionToken);
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
    normalizedPermissions.some((permission) =>
      permission.startsWith(`${normalizedModule}.`)
    )
  );
}

export function canAccessRuleForUser(
  rule: AccessRule | undefined,
  rawUser: User | null | undefined
): boolean {
  const user = normalizeAuthUser(rawUser);
  return canAccessRule(rule, user, (module, action) =>
    userCanAccessPermission(user, module, action)
  );
}

export function getProtectedRouteAccess(pathname: string) {
  return protectedRouteAccess.find((entry) => entry.matches(pathname));
}

export function getDefaultProtectedRoute(rawUser: User | null | undefined): string {
  const user = normalizeAuthUser(rawUser);

  for (const section of topNavSections) {
    if (canAccessRuleForUser(section.access, user)) {
      return section.href;
    }
  }

  return '/account';
}

export function getContextAwareDefaultRoute(
  rawUser: User | null | undefined,
  userContext: UserContext | null | undefined
): string {
  if (userContext?.context_type === 'contact_person' || userContext?.context_type === 'organization_member') {
    return '/organization';
  }

  return getDefaultProtectedRoute(rawUser);
}
