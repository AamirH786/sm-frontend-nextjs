'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUserDisplayName } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import {
  Users, Shield, Key, Layers, Zap, FileText, ArrowRight,
  TrendingUp, CheckSquare, AlertCircle, Clock, Calendar,
  Cake, UserCheck, ClipboardList, LogIn, LogOut,
} from 'lucide-react';

const PRIORITY_STYLE: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
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
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border rounded-lg shadow-md px-3 py-2 text-sm">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-gray-600">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const isAdmin = user?.role?.is_super_admin || false;

  const [hrData, setHrData] = useState<any>(null);
  const [rbacStats, setRbacStats] = useState({ users: 0, roles: 0, permissions: 0, modules: 0 });
  const [loading, setLoading] = useState(true);

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
  }, [isAdmin]);

  const kpis = hrData?.kpis;
  const taskChart = hrData?.task_status_chart || [];
  const priorityChart = hrData?.priority_chart || [];
  const attendanceTrend = hrData?.attendance_trend || [];
  const tasksThisWeek = hrData?.tasks_this_week || [];
  const birthdays = hrData?.birthdays || [];
  const myAttendance = hrData?.my_today_attendance;
  const weekRange = hrData?.week_range;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="px-6 md:px-10 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome To {getUserDisplayName(user)?.charAt(0).toUpperCase() + getUserDisplayName(user)?.slice(1)} Portal
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {!isAdmin && myAttendance && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3.5 flex items-center gap-6">
          <div className="flex items-center gap-2 text-green-700">
            <LogIn size={16} />
            <span className="text-sm font-medium">Check-in: {fmtTime(myAttendance.check_in)}</span>
          </div>
          {myAttendance.check_out ? (
            <div className="flex items-center gap-2 text-red-700">
              <LogOut size={16} />
              <span className="text-sm font-medium">Check-out: {fmtTime(myAttendance.check_out)}</span>
            </div>
          ) : (
            <span className="text-sm text-green-600">Still working{fmtDur(myAttendance.duration_minutes) ? ` · ${fmtDur(myAttendance.duration_minutes)}` : ''}</span>
          )}
          {fmtDur(myAttendance.duration_minutes) && myAttendance.check_out && (
            <span className="text-sm text-gray-500 flex items-center gap-1"><Clock size={13} />{fmtDur(myAttendance.duration_minutes)}</span>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {isAdmin && (
          <>
            <KPICard icon={Users} color="blue" label="Total Employees" value={kpis?.total_employees ?? 0} href="/roles-users/users" />
            <KPICard icon={UserCheck} color="green" label="Present Today" value={kpis?.present_today ?? 0} href="/attendance" />
            <KPICard icon={Users} color="purple" label="Total Clients" value={kpis?.total_clients ?? 0} href="/clients" />
          </>
        )}
        <KPICard icon={ClipboardList} color="orange" label="Open Tasks" value={kpis?.open_tasks ?? 0} href="/tasks" />
        <KPICard icon={AlertCircle} color="red" label="Overdue" value={kpis?.overdue_tasks ?? 0} href="/tasks?status_slug=overdue" />
        <KPICard icon={CheckSquare} color="teal" label="Done Tasks" value={kpis?.done_tasks ?? 0} href="/tasks" />
        {isAdmin && (
          <>
            <KPICard icon={Users} color="blue" label="Employees" value={rbacStats.users} href="/roles-users/users" />
            <KPICard icon={Shield} color="green" label="Roles" value={rbacStats.roles} href="/roles-users/roles" />
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Task Status Pie */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Tasks by Status</h3>
          {taskChart.every((t: any) => t.count === 0) ? (
            <div className="flex items-center justify-center h-44 text-gray-300 text-sm">No task data</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={180}>
                <PieChart>
                  <Pie
                    data={taskChart.filter((t: any) => t.count > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {taskChart.filter((t: any) => t.count > 0).map((entry: any, idx: number) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {taskChart.map((s: any) => (
                  s.count > 0 && (
                    <div key={s.slug} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-gray-600">{s.name}</span>
                      </div>
                      <span className="font-semibold text-gray-800">{s.count}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Attendance Trend Bar */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            {isAdmin ? 'Attendance Trend — Last 7 Days' : 'My Attendance — Last 7 Days'}
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={attendanceTrend} barSize={28} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name={isAdmin ? 'Present' : 'Days'} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority Chart + Birthdays Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Priority Breakdown */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Open Tasks by Priority</h3>
          {priorityChart.every((p: any) => p.count === 0) ? (
            <div className="flex items-center justify-center h-36 text-gray-300 text-sm">No open tasks</div>
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={priorityChart} layout="vertical" barSize={18} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Tasks">
                  {priorityChart.map((entry: any, idx: number) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Upcoming Birthdays */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <Cake size={15} className="text-pink-500" />
            Upcoming Birthdays — {new Date().toLocaleString('default', { month: 'long' })}
          </h3>
          {birthdays.length === 0 ? (
            <div className="flex items-center justify-center h-36 text-gray-300 text-sm">No birthdays this month</div>
          ) : (
            <div className="space-y-2 max-h-44 overflow-y-auto">
              {birthdays.map((b: any) => (
                <div key={b.user_id} className={`flex items-center justify-between py-2 px-3 rounded-lg ${b.is_today ? 'bg-pink-50 border border-pink-200' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${b.is_today ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-600'}`}>
                      {b.name[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {b.name} {b.is_today && <span className="text-pink-500 text-xs">🎂 Today!</span>}
                      </p>
                      <p className="text-xs text-gray-400">@{b.username}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-700">{b.day} {b.month}</p>
                    {b.age && <p className="text-xs text-gray-400">Turning {b.age}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tasks Due This Week */}
      {tasksThisWeek.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Calendar size={15} className="text-blue-500" />
              Tasks Due This Week
              {weekRange && (
                <span className="text-xs font-normal text-gray-400 ml-1">
                  ({fmtDate(weekRange.start)} – {fmtDate(weekRange.end)})
                </span>
              )}
            </h3>
            <Link href="/tasks" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b">
                  <th className="pb-2 font-medium">Task</th>
                  {isAdmin && <th className="pb-2 font-medium">Assigned To</th>}
                  <th className="pb-2 font-medium">Due</th>
                  <th className="pb-2 font-medium">Priority</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tasksThisWeek.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => router.push(`/tasks/${t.id}`)}>
                    <td className="py-2.5 max-w-xs">
                      <p className="font-medium text-gray-800 truncate">{t.title}</p>
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 text-gray-500 text-xs">{t.assignee || <span className="text-gray-300">Unassigned</span>}</td>
                    )}
                    <td className="py-2.5">
                      <span className={`text-xs font-medium ${t.due_date === new Date().toISOString().slice(0, 10) ? 'text-orange-600' : 'text-gray-600'}`}>
                        {fmtDate(t.due_date)}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_STYLE[t.priority] || ''}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span
                        className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: t.status?.color }}
                      >
                        {t.status?.title}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions (Admin) */}
      {isAdmin && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Quick Actions</h3>
            <Link href="/roles-users" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              More <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {[
              { href: '/roles-users/users', icon: Users, label: 'Employees', bg: 'bg-blue-50', ic: 'text-blue-600' },
              { href: '/tasks', icon: ClipboardList, label: 'Tasks', bg: 'bg-indigo-50', ic: 'text-indigo-600' },
              { href: '/attendance', icon: UserCheck, label: 'Attendance', bg: 'bg-green-50', ic: 'text-green-600' },
              { href: '/clients', icon: Users, label: 'Clients', bg: 'bg-purple-50', ic: 'text-purple-600' },
              { href: '/roles-users/roles', icon: Shield, label: 'Roles', bg: 'bg-yellow-50', ic: 'text-yellow-600' },
              { href: '/roles-users/permissions', icon: Key, label: 'Permissions', bg: 'bg-orange-50', ic: 'text-orange-600' },
              { href: '/roles-users/logs', icon: FileText, label: 'Logs', bg: 'bg-gray-50', ic: 'text-gray-600' },
            ].map((q) => (
              <Link key={q.href} href={q.href} className={`flex flex-col items-center gap-1.5 p-3 ${q.bg} rounded-xl hover:opacity-80 transition-opacity`}>
                <q.icon size={22} className={q.ic} />
                <span className="text-xs font-medium text-gray-700">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ icon: Icon, color, label, value, href }: {
  icon: any; color: string; label: string; value: number; href: string;
}) {
  const colors: Record<string, { bg: string; ic: string; val: string }> = {
    blue:   { bg: 'bg-blue-50',   ic: 'text-blue-500',   val: 'text-blue-700' },
    green:  { bg: 'bg-green-50',  ic: 'text-green-500',  val: 'text-green-700' },
    purple: { bg: 'bg-purple-50', ic: 'text-purple-500', val: 'text-purple-700' },
    orange: { bg: 'bg-orange-50', ic: 'text-orange-500', val: 'text-orange-700' },
    red:    { bg: 'bg-red-50',    ic: 'text-red-500',    val: 'text-red-700' },
    teal:   { bg: 'bg-teal-50',   ic: 'text-teal-500',   val: 'text-teal-700' },
  };
  const c = colors[color] || colors.blue;
  return (
    <Link href={href} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
      <div className={`w-9 h-9 ${c.bg} rounded-lg flex items-center justify-center mb-2`}>
        <Icon size={18} className={c.ic} />
      </div>
      <p className={`text-2xl font-bold ${c.val}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </Link>
  );
}
