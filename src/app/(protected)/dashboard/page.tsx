'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getRoleDisplayName, getUserDisplayName } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import Tooltip from '@/components/ui/Tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  Calendar,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Clock,
  CircleHelp,
  FileText,
  Key,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  Shield,
  Sparkles,
  SlidersHorizontal,
  UserCheck,
  Users,
} from 'lucide-react';

type WorkspaceKey = 'overview' | 'work' | 'attendance' | 'people' | 'insights';

type SidebarItem = {
  key: WorkspaceKey;
  label: string;
  icon: any;
  href?: string;
  match: string[];
  showChevron?: boolean;
};

type DirectNavItem = {
  label: string;
  href: string;
  icon: any;
  match: string[];
};

const PRIORITY_STYLE: Record<string, string> = {
  urgent: 'bg-rose-50 text-rose-700 ring-rose-200/70',
  high: 'bg-amber-50 text-amber-700 ring-amber-200/70',
  medium: 'bg-sky-50 text-sky-700 ring-sky-200/70',
  low: 'bg-slate-100 text-slate-600 ring-slate-200/70',
};

const STATUS_STYLE: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  info: 'bg-sky-50 text-sky-700 ring-sky-200/70',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200/70',
};

const WORKSPACE_COPY: Record<WorkspaceKey, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: 'Executive cockpit',
    title: 'Overview',
    description: 'A calm operational summary with the few signals that matter most right now.',
  },
  work: {
    eyebrow: 'Execution center',
    title: 'Work',
    description: 'Track active tasks, due commitments, and the next actions your team should take.',
  },
  attendance: {
    eyebrow: 'Presence monitor',
    title: 'Attendance',
    description: 'Keep today status, team consistency, and personal check-in flow visible in one place.',
  },
  people: {
    eyebrow: 'People pulse',
    title: 'People',
    description: 'Monitor employees, clients, roles, and team moments without jumping across screens.',
  },
  insights: {
    eyebrow: 'Signals and controls',
    title: 'Insights',
    description: 'Spot workload distribution, priorities, and platform controls from a tighter analytics view.',
  },
};

const fmtDate = (d?: string) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const fmtTime = (iso?: string) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const fmtDur = (mins?: number) => {
  if (!mins) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

function LoadingShell() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-20 md:px-10">
      <div className="rounded-[28px] border border-white/70 bg-white/90 px-7 py-6 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-100 border-t-blue-900" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Loading dashboard</p>
            <p className="text-sm text-slate-500">Preparing your focused workspace view.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-[26px] border border-white/70 bg-white/78 p-5 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/65 backdrop-blur xl:p-6',
        className
      )}
    >
      {children}
    </section>
  );
}

function WorkspaceMetric({
  label,
  value,
  meta,
  tone = 'info',
}: {
  label: string;
  value: number | string;
  meta?: string;
  tone?: keyof typeof STATUS_STYLE;
}) {
  return (
    <div className="rounded-[22px] border border-white/70 bg-white/85 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/60 backdrop-blur">
      <div className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', STATUS_STYLE[tone])}>{label}</div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
          {meta ? <p className="mt-1 text-xs leading-5 text-slate-500">{meta}</p> : null}
        </div>
      </div>
    </div>
  );
}

function MiniBars({
  title,
  description,
  items,
  emptyLabel,
}: {
  title: string;
  description: string;
  items: Array<{ label: string; value: number; color?: string }>;
  emptyLabel: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 0);

  return (
    <Surface>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200/70">
          {items.length} signals
        </div>
      </div>
      {items.length === 0 || maxValue === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-slate-600">{item.label}</span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 12 : 0)}%`,
                    background: item.color || '#1e3a8a',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}

function SidebarGroup({
  item,
  active,
  collapsed,
  onSelect,
}: {
  item: SidebarItem;
  active: boolean;
  collapsed: boolean;
  onSelect: (key: WorkspaceKey) => void;
}) {
  const Icon = item.icon;
  const content = (
    <Link
      href={item.href || '/dashboard'}
      onClick={() => onSelect(item.key)}
      className={cn(
        'flex items-center rounded-xl text-left transition-all duration-200',
        collapsed ? 'justify-center px-1.5 py-2' : 'justify-between px-2 py-1.5',
        active
          ? 'bg-slate-100 text-slate-950'
          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
      )}
    >
      <span className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', active ? 'bg-white text-blue-900 shadow-sm ring-1 ring-slate-200/70' : 'bg-transparent text-slate-500')}>
          <Icon size={16} />
        </span>
        {!collapsed ? <span className="text-[13px] font-semibold">{item.label}</span> : null}
      </span>
      {!collapsed && item.showChevron !== false && item.key !== 'overview' ? (
        <ChevronRight size={14} className={active ? 'text-slate-400' : 'text-slate-300'} />
      ) : null}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip text={item.label} position="right">
        {content}
      </Tooltip>
    );
  }

  return content;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = user?.role?.is_super_admin || false;

  const [hrData, setHrData] = useState<any>(null);
  const [rbacStats, setRbacStats] = useState({ users: 0, roles: 0, permissions: 0, modules: 0 });
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceKey>('overview');
  // const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // dashboard sidebar removed — navigation is in AppSidebar
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        const [hrRes] = await Promise.all([
          api.get('/admin/hr/dashboard').then((r) => r.data).catch(() => null),
        ]);
        setHrData(hrRes);

        if (isAdmin) {
          const [users, roles, perms, mods] = await Promise.allSettled([
            api.get('/users?limit=1&exclude_client=true').then((r) => r.data?.meta?.total ?? 0),
            api.get('/roles?limit=1').then((r) => r.data?.meta?.total ?? 0),
            api.get('/permissions?limit=1').then((r) => r.data?.meta?.total ?? 0),
            api.get('/modules?limit=1').then((r) => r.data?.meta?.total ?? 0),
          ]);
          setRbacStats({
            users: users.status === 'fulfilled' ? users.value : 0,
            roles: roles.status === 'fulfilled' ? roles.value : 0,
            permissions: perms.status === 'fulfilled' ? perms.value : 0,
            modules: mods.status === 'fulfilled' ? mods.value : 0,
          });
        }
      } catch {
        showToast('Some analytics could not be loaded', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [isAdmin, showToast]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const kpis = hrData?.kpis;
  const taskChart = hrData?.task_status_chart || [];
  const priorityChart = hrData?.priority_chart || [];
  const attendanceTrend = hrData?.attendance_trend || [];
  const tasksThisWeek = hrData?.tasks_this_week || [];
  const birthdays = hrData?.birthdays || [];
  const myAttendance = hrData?.my_today_attendance;
  const weekRange = hrData?.week_range;
  const userName = getUserDisplayName(user);
  const copy = WORKSPACE_COPY[activeWorkspace];

  const todaySummary = useMemo(
    () =>
      now.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    [now]
  );

  const timeSummary = useMemo(
    () =>
      now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    [now]
  );

  const greetingLabel = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  }, [now]);

  const sidebarItems = useMemo<SidebarItem[]>(
    () => [
      {
        key: 'overview',
        label: 'Overview',
        icon: LayoutGrid,
        href: '/dashboard',
        match: ['/dashboard'],
        showChevron: false,
      },
      {
        key: 'work',
        label: 'Work',
        icon: ClipboardList,
        href: '/tasks',
        match: ['/tasks', '/trial-requests'],
      },
      {
        key: 'attendance',
        label: 'Attendance',
        icon: Calendar,
        href: '/attendance',
        match: ['/attendance'],
      },
      {
        key: 'people',
        label: 'People',
        icon: Users,
        href: isAdmin ? '/roles-users/users/all' : '/clients',
        match: isAdmin ? ['/roles-users/users', '/clients', '/roles-users/roles', '/roles-users/permissions'] : ['/clients'],
      },
      {
        key: 'insights',
        label: 'Insights',
        icon: Activity,
        href: isAdmin ? '/masters' : '/roles-users/logs',
        match: isAdmin ? ['/masters', '/roles-users/logs'] : ['/roles-users/logs'],
      },
    ],
    [isAdmin]
  );

  const directNavItems = useMemo<DirectNavItem[]>(
    () =>
      [
        { label: 'Masters', href: '/masters', icon: Sparkles, match: ['/masters'] },
        { label: 'Clients', href: '/clients', icon: Users, match: ['/clients'] },
        { label: 'Tasks', href: '/tasks', icon: ClipboardList, match: ['/tasks'] },
        { label: 'Trial Requests', href: '/trial-requests', icon: FileText, match: ['/trial-requests'] },
        ...(isAdmin
          ? [{ label: 'Employees & Access', href: '/roles-users/users/all', icon: Shield, match: ['/roles-users'] }]
          : []),
      ],
    [isAdmin]
  );

  useEffect(() => {
    const matchedItem = sidebarItems.find((item) =>
      item.match.some((prefix) => pathname.startsWith(prefix))
    );

    if (matchedItem) {
      setActiveWorkspace(matchedItem.key);
      return;
    }

    setActiveWorkspace('overview');
  }, [pathname, sidebarItems]);

  const headlineMetrics = useMemo(() => {
    if (activeWorkspace === 'work') {
      return [
        { label: 'Open tasks', value: kpis?.open_tasks ?? 0, meta: 'Current active queue', tone: 'info' as const },
        { label: 'Overdue', value: kpis?.overdue_tasks ?? 0, meta: 'Needs immediate attention', tone: 'warning' as const },
        { label: 'Completed', value: kpis?.done_tasks ?? 0, meta: 'Recently closed items', tone: 'success' as const },
        { label: 'This week', value: tasksThisWeek.length, meta: 'Scheduled deliveries', tone: 'info' as const },
      ];
    }

    if (activeWorkspace === 'attendance') {
      return [
        { label: 'Present today', value: kpis?.present_today ?? 0, meta: 'Live attendance count', tone: 'success' as const },
        { label: 'My check-in', value: fmtTime(myAttendance?.check_in), meta: 'Today first activity', tone: 'info' as const },
        { label: 'My check-out', value: fmtTime(myAttendance?.check_out), meta: 'Latest exit time', tone: 'warning' as const },
        { label: 'Duration', value: fmtDur(myAttendance?.duration_minutes) || '-', meta: 'Tracked time today', tone: 'info' as const },
      ];
    }

    if (activeWorkspace === 'people') {
      return [
        { label: 'Employees', value: isAdmin ? rbacStats.users : kpis?.total_employees ?? 0, meta: 'Directory snapshot', tone: 'info' as const },
        { label: 'Clients', value: kpis?.total_clients ?? 0, meta: 'Managed accounts', tone: 'success' as const },
        { label: 'Roles', value: rbacStats.roles, meta: 'Access roles', tone: 'warning' as const },
        { label: 'Birthdays', value: birthdays.length, meta: 'Upcoming celebrations', tone: 'info' as const },
      ];
    }

    if (activeWorkspace === 'insights') {
      return [
        { label: 'Permissions', value: rbacStats.permissions, meta: 'Policy controls', tone: 'info' as const },
        { label: 'Modules', value: rbacStats.modules, meta: 'Platform coverage', tone: 'success' as const },
        { label: 'Priorities', value: priorityChart.reduce((sum: number, item: any) => sum + (item.count || 0), 0), meta: 'Open priority signals', tone: 'warning' as const },
        { label: 'Statuses', value: taskChart.length, meta: 'Workflow buckets', tone: 'info' as const },
      ];
    }

    return [
      { label: 'Employees', value: kpis?.total_employees ?? 0, meta: 'Current workforce snapshot', tone: 'info' as const },
      { label: 'Present', value: kpis?.present_today ?? 0, meta: 'Live attendance now', tone: 'success' as const },
      { label: 'Open tasks', value: kpis?.open_tasks ?? 0, meta: 'Operational queue', tone: 'warning' as const },
      { label: 'Clients', value: kpis?.total_clients ?? 0, meta: 'Active client base', tone: 'info' as const },
    ];
  }, [activeWorkspace, birthdays.length, isAdmin, kpis?.done_tasks, kpis?.open_tasks, kpis?.present_today, kpis?.total_clients, kpis?.total_employees, myAttendance?.check_in, myAttendance?.check_out, myAttendance?.duration_minutes, priorityChart, rbacStats.modules, rbacStats.permissions, rbacStats.roles, rbacStats.users, taskChart.length, tasksThisWeek.length]);

  const activityFeed = useMemo(() => {
    const items = [
      ...(tasksThisWeek.slice(0, 3).map((task: any) => ({
        id: `task-${task.id}`,
        title: task.title,
        meta: `Due ${fmtDate(task.due_date)}${task.assignee ? `  -  ${task.assignee}` : ''}`,
        tone: task.priority === 'urgent' || task.priority === 'high' ? 'warning' : 'info',
      })) || []),
      ...(birthdays.slice(0, 2).map((birthday: any) => ({
        id: `birthday-${birthday.user_id}`,
        title: `${birthday.name}${birthday.is_today ? ' birthday today' : ' birthday upcoming'}`,
        meta: `${birthday.day} ${birthday.month}${birthday.age ? `  -  Turning ${birthday.age}` : ''}`,
        tone: 'success',
      })) || []),
    ];

    return items.slice(0, 5);
  }, [birthdays, tasksThisWeek]);

  const quickLinks = useMemo(
    () =>
      [
        { href: '/tasks', label: 'Open Tasks', meta: 'Track active work', icon: ClipboardList },
        { href: '/attendance', label: 'Attendance', meta: 'Review presence', icon: UserCheck },
        { href: '/clients', label: 'Clients', meta: 'Open client space', icon: Users },
        ...(isAdmin
          ? [
            { href: '/masters', label: 'Masters', meta: 'Manage master data', icon: Sparkles },
            { href: '/roles-users/roles', label: 'Roles', meta: 'Update access roles', icon: Shield },
            { href: '/roles-users/permissions', label: 'Permissions', meta: 'Inspect access', icon: Key },
            { href: '/roles-users/logs', label: 'Logs', meta: 'Audit activity', icon: FileText },
          ]
          : []),
      ].slice(0, 6),
    [isAdmin]
  );

  const taskSignals = useMemo(
    () =>
      taskChart
        .filter((item: any) => item.count > 0)
        .map((item: any) => ({ label: item.name, value: item.count, color: item.color })),
    [taskChart]
  );

  const prioritySignals = useMemo(
    () =>
      priorityChart
        .filter((item: any) => item.count > 0)
        .map((item: any) => ({ label: item.name, value: item.count, color: item.color })),
    [priorityChart]
  );

  const attendanceSignals = useMemo(
    () =>
      attendanceTrend
        .filter((item: any) => item.count > 0)
        .map((item: any) => ({ label: item.label, value: item.count, color: '#2563eb' })),
    [attendanceTrend]
  );

  const selectedMainSignals =
    activeWorkspace === 'attendance'
      ? attendanceSignals
      : activeWorkspace === 'insights'
        ? prioritySignals
        : taskSignals;

  if (loading) {
    return <LoadingShell />;
  }

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.38),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(224,231,255,0.32),_transparent_26%),linear-gradient(180deg,_#f8fbff_0%,_#f8fafc_45%,_#f6f8fc_100%)] px-3 py-4 md:px-4 md:py-5 xl:px-5">
      {/*
        DASHBOARD INTERNAL SIDEBAR — commented out.
        Now that AppSidebar handles all global navigation, this per-page sidebar
        (SM logo, workspace switcher, direct nav, user profile) is redundant and clutters the UI.
        All navigation is available in the left AppSidebar. Kept here in case it needs
        to be re-enabled independently. Previously used: isSidebarCollapsed, sidebarItems,
        directNavItems, SidebarGroup, WorkspaceKey/SidebarItem/DirectNavItem types.
      */}
      <div className="mx-auto max-w-[1640px]">
        <div className="space-y-4">
          <Surface className="overflow-visible p-4 md:px-5 md:py-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-900 ring-1 ring-blue-100">
                  {copy.eyebrow}
                </div>
                <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">
                  {greetingLabel}, {userName?.charAt(0).toUpperCase() + userName?.slice(1)}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{copy.description}</p>
              </div>
              <div className="flex flex-col items-start gap-2 xl:items-end">
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-2xl border border-slate-200/80 bg-white p-2.5 text-slate-500 transition hover:text-slate-900">
                    <Bell size={15} />
                  </button>
                  <button type="button" className="rounded-2xl border border-slate-200/80 bg-white p-2.5 text-slate-500 transition hover:text-slate-900">
                    <Moon size={15} />
                  </button>
                  <DropdownMenu open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="flex h-11 min-w-[96px] items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-2.5 text-slate-700 ring-1 ring-slate-100/80 transition hover:bg-slate-50">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                          {userName?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="text-left">
                          <span className="block text-sm font-semibold leading-none">{userName || 'Admin'}</span>
                          <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                            {getRoleDisplayName(user)}
                          </span>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-lg">
                      <DropdownMenuItem asChild>
                        <Link href="/account" className="flex items-center gap-2 cursor-pointer">
                          <Settings size={16} /> My Account
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/account" className="flex items-center gap-2 cursor-pointer">
                          <SlidersHorizontal size={16} /> Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/help" className="flex items-center gap-2 cursor-pointer">
                          <CircleHelp size={16} /> Help
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-red-600 cursor-pointer">
                        <LogOut size={16} /> Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{todaySummary}</span>
                      <span className="text-slate-300">/</span>
                      <Clock size={13} className="text-slate-400" />
                      <span>{timeSummary}</span>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </Surface>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <main className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {headlineMetrics.map((metric) => (
                  <WorkspaceMetric key={metric.label} {...metric} />
                ))}
              </div>

              <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
                <Surface>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{copy.title} workspace</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {activeWorkspace === 'attendance'
                          ? 'Attendance flow stays focused on live presence, consistency, and today context.'
                          : activeWorkspace === 'people'
                            ? 'People view keeps roster, clients, and team moments visible in one cleaner lane.'
                            : activeWorkspace === 'insights'
                              ? 'Insights compress platform signals into a smaller, faster-to-read monitoring strip.'
                              : 'One focused work area with minimal noise and clear operational context.'}
                      </p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200/80">
                      {todaySummary}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50/85 p-4 ring-1 ring-slate-200/70">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Focus</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">
                        {activeWorkspace === 'work'
                          ? 'Protect delivery deadlines'
                          : activeWorkspace === 'attendance'
                            ? 'Keep live check-in visibility'
                            : activeWorkspace === 'people'
                              ? 'Monitor workforce and client health'
                              : activeWorkspace === 'insights'
                                ? 'Watch priority and control drift'
                                : 'Stay on top of what needs attention'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50/85 p-4 ring-1 ring-slate-200/70">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Attention</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{kpis?.overdue_tasks ?? 0} items need follow-up</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50/85 p-4 ring-1 ring-slate-200/70">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Mode</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{isAdmin ? 'Admin control view' : 'Personal workspace view'}</p>
                    </div>
                  </div>
                </Surface>

                <MiniBars
                  title={activeWorkspace === 'attendance' ? 'Attendance pulse' : activeWorkspace === 'insights' ? 'Priority pulse' : 'Task pulse'}
                  description={
                    activeWorkspace === 'attendance'
                      ? 'Micro-trend view of recent attendance activity.'
                      : activeWorkspace === 'insights'
                        ? 'Compact priority distribution for current open work.'
                        : 'Compact distribution of current workflow status.'
                  }
                  items={selectedMainSignals}
                  emptyLabel="Signals will appear here once activity starts flowing into the workspace."
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.38fr)_minmax(320px,0.82fr)]">
                <Surface>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Main work area</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {weekRange
                          ? `Due items for ${fmtDate(weekRange.start)} to ${fmtDate(weekRange.end)}.`
                          : 'A single smart table for the current delivery window.'}
                      </p>
                    </div>
                    <Link href="/tasks" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-900 transition hover:text-blue-700">
                      View all
                      <ArrowRight size={15} />
                    </Link>
                  </div>

                  {tasksThisWeek.length === 0 ? (
                    <div className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.86))] px-6 py-10 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-900 shadow-sm ring-1 ring-slate-200/80">
                        <ClipboardList size={22} />
                      </div>
                      <p className="mt-4 text-base font-semibold text-slate-900">No scheduled work in this window</p>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                        Your weekly delivery lane is clear right now. New due tasks will appear here with priority, assignee, and status context.
                      </p>
                      <Link
                        href="/tasks"
                        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                      >
                        Open tasks
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 ring-1 ring-slate-100/70">
                      <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(110px,0.8fr)_110px_110px_120px] gap-3 border-b border-slate-200/80 bg-slate-50/85 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        <div>Task</div>
                        {isAdmin ? <div>Assigned</div> : <div>Owner</div>}
                        <div>Due</div>
                        <div>Priority</div>
                        <div>Status</div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {tasksThisWeek.map((task: any) => (
                          <button
                            key={task.id}
                            type="button"
                            className="grid w-full grid-cols-[minmax(0,1.7fr)_minmax(110px,0.8fr)_110px_110px_120px] gap-3 px-5 py-4 text-left transition hover:bg-blue-50/45"
                            onClick={() => router.push(`/tasks/${task.id}`)}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{task.title}</p>
                              <p className="mt-1 text-xs text-slate-500">Open from weekly work queue</p>
                            </div>
                            <div className="text-xs text-slate-500">
                              {task.assignee || <span className="text-slate-300">Unassigned</span>}
                            </div>
                            <div className="text-sm text-slate-600">{fmtDate(task.due_date)}</div>
                            <div>
                              <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.low)}>
                                {task.priority}
                              </span>
                            </div>
                            <div>
                              <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm" style={{ backgroundColor: task.status?.color }}>
                                {task.status?.title}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Surface>

                <Surface>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Activity strip</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">Live-feeling updates from the latest task and people activity.</p>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-200/80">
                      {activityFeed.length} updates
                    </div>
                  </div>

                  <div className="mt-5">
                    {activityFeed.length === 0 ? (
                      <div className="rounded-[24px] border border-dashed border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.86))] px-5 py-8">
                        <div className="flex items-start gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-900 shadow-sm ring-1 ring-slate-200/80">
                            <Activity size={18} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">No fresh activity yet</p>
                            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                              Fresh activity will appear here as work moves, attendance updates, and team events come in.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activityFeed.map((item, index) => (
                          <div key={item.id} className="relative rounded-[22px] bg-slate-50/90 p-4 ring-1 ring-slate-200/70">
                            {index < activityFeed.length - 1 ? <div className="absolute left-[22px] top-[52px] h-8 w-px bg-slate-200" /> : null}
                            <div className="flex gap-3">
                              <div className={cn('mt-1 flex h-8 w-8 items-center justify-center rounded-full', item.tone === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-900')}>
                                <span className="h-2.5 w-2.5 rounded-full bg-current" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">{item.meta}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Surface>
              </div>
            </main>

            <aside className="space-y-4">
              <Surface>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Priority rail</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">What needs attention first, without scanning the whole dashboard.</p>
                  </div>
                  <AlertCircle size={18} className="text-amber-500" />
                </div>
                <div className="mt-5 space-y-3">
                  {priorityChart.filter((item: any) => item.count > 0).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
                      No open priority alerts right now.
                    </div>
                  ) : (
                    priorityChart
                      .filter((item: any) => item.count > 0)
                      .map((item: any) => (
                        <div key={item.slug || item.name} className="flex items-center justify-between rounded-2xl bg-slate-50/85 px-4 py-3 ring-1 ring-slate-200/65">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                            <p className="mt-1 text-xs text-slate-500">Open workload by priority</p>
                          </div>
                          <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1', PRIORITY_STYLE[item.slug] || PRIORITY_STYLE.low)}>
                            {item.count}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </Surface>

              <Surface>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Today state</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Compact operational snapshot for the current day.</p>
                  </div>
                  <CheckSquare size={18} className="text-emerald-500" />
                </div>
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl bg-slate-50/85 p-4 ring-1 ring-slate-200/65">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Date</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{todaySummary}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50/85 p-4 ring-1 ring-slate-200/65">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Attendance</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {myAttendance?.check_in ? `Checked in at ${fmtTime(myAttendance.check_in)}` : 'Check-in pending'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50/85 p-4 ring-1 ring-slate-200/65">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Output</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{kpis?.done_tasks ?? 0} tasks closed</p>
                  </div>
                </div>
              </Surface>

              <Surface>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Quick links</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Jump into the most-used operational areas.</p>
                  </div>
                  <Sparkles size={18} className="text-blue-900" />
                </div>
                <div className="mt-5 space-y-3">
                  {quickLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center justify-between rounded-2xl bg-slate-50/85 px-4 py-3 ring-1 ring-slate-200/65 transition hover:bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-900 ring-1 ring-slate-200/70">
                            <Icon size={17} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{link.label}</p>
                            <p className="text-xs text-slate-500">{link.meta}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-300" />
                      </Link>
                    );
                  })}
                </div>
              </Surface>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
