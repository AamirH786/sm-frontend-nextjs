'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import usePermission from '@/hooks/usePermission';
import { useToast } from '@/context/ToastContext';
import employeeService, { AttendanceRecord } from '@/services/employeeService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import { Clock, LogIn, LogOut, Calendar, Filter, Edit2, Check, X } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'half_day', label: 'Half Day' },
  { value: 'leave', label: 'Leave' },
];

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  half_day: 'bg-yellow-100 text-yellow-700',
  leave: 'bg-blue-100 text-blue-700',
};

const fmt = (iso?: string) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};
const fmtDate = (d?: string) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtDuration = (mins?: number) => {
  if (!mins) return '-';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function AttendancePage() {
  const { user } = useAuth();
  const { can } = usePermission();
  const { showToast } = useToast();
  const canCreateAttendance = can('attendance', 'create');
  const canManageAttendance = can('attendance', 'update');

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const [filters, setFilters] = useState({
    search: '',
    date_from: '',
    date_to: '',
    status: '',
    page: 1,
  });

  const loadToday = useCallback(async () => {
    try {
      const data = await employeeService.todayStatus();
      setTodayRecord(data.record);
    } catch {}
  }, []);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page: filters.page, limit: 20 };
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.status) params.status = filters.status;

      if (canManageAttendance) {
        if (filters.search) params.search = filters.search;
        const data = await employeeService.adminAttendance(params);
        setRecords(data.data);
        setMeta(data.meta);
      } else {
        const data = await employeeService.myAttendance(params);
        setRecords(data.data);
        setMeta(data.meta);
      }
    } catch (e: any) {
      showToast('Failed to load attendance', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, canManageAttendance, showToast]);

  useEffect(() => { loadToday(); }, [loadToday]);
  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      await employeeService.checkIn();
      showToast('Checked in successfully!', 'success');
      loadToday();
      loadRecords();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Check-in failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      await employeeService.checkOut();
      showToast('Checked out successfully!', 'success');
      loadToday();
      loadRecords();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Check-out failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const startEdit = (rec: AttendanceRecord) => {
    setEditingId(rec.id!);
    setEditForm({ status: rec.status, notes: rec.notes || '' });
  };

  const saveEdit = async (id: number) => {
    try {
      await employeeService.updateAttendance(id, editForm);
      showToast('Updated', 'success');
      setEditingId(null);
      loadRecords();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Update failed', 'error');
    }
  };

  return (
    <div className="px-6 md:px-10 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-500">{fmtDate(new Date().toISOString())}</p>
        </div>
        <button
          onClick={() => setShowFilters((f) => !f)}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Filter size={15} />
          Filters
        </button>
      </div>

      <Card className="mb-6">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Today's Status {canManageAttendance && <span className="text-xs text-gray-400">(Your Attendance)</span>}</p>
                {todayRecord ? (
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <LogIn size={14} className="text-green-500" />
                      In: {fmt(todayRecord.check_in)}
                    </span>
                    {todayRecord.check_out && (
                      <span className="flex items-center gap-1">
                        <LogOut size={14} className="text-red-500" />
                        Out: {fmt(todayRecord.check_out)}
                      </span>
                    )}
                    {todayRecord.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {fmtDuration(todayRecord.duration_minutes)}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Not checked in yet</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCheckIn}
                  disabled={!canCreateAttendance || actionLoading || !!todayRecord?.check_in}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <LogIn size={15} />
                  Check In
                </Button>
                <Button
                  onClick={handleCheckOut}
                  disabled={!canCreateAttendance || actionLoading || !todayRecord?.check_in || !!todayRecord?.check_out}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
                >
                  <LogOut size={15} />
                  Check Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      {showFilters && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {canManageAttendance && (
                <Input
                  placeholder="Search employee…"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                />
              )}
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value, page: 1 }))}
                placeholder="From date"
              />
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value, page: 1 }))}
                placeholder="To date"
              />
              <Select
                value={filters.status}
                onChange={(val) => setFilters((f) => ({ ...f, status: val as string, page: 1 }))}
                options={STATUS_OPTIONS}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-4 p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Calendar size={40} className="mx-auto mb-2 opacity-30" />
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Date</th>
                    {canManageAttendance && <th className="px-4 py-3">Employee</th>}
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Check Out</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                    {canManageAttendance && <th className="px-4 py-3">IP</th>}
                    <th className="px-4 py-3">Notes</th>
                    {canManageAttendance && <th className="px-4 py-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium">{fmtDate(rec.date)}</td>
                      {canManageAttendance && (
                        <td className="px-4 py-3">
                          <p className="font-medium">{rec.name || rec.username}</p>
                          {rec.name && <p className="text-xs text-gray-400">@{rec.username}</p>}
                        </td>
                      )}
                      <td className="px-4 py-3 text-green-700">{fmt(rec.check_in)}</td>
                      <td className="px-4 py-3 text-red-700">{fmt(rec.check_out)}</td>
                      <td className="px-4 py-3">{fmtDuration(rec.duration_minutes)}</td>
                      <td className="px-4 py-3">
                        {editingId === rec.id ? (
                          <Select
                            value={editForm.status}
                            onChange={(val) => setEditForm((f: any) => ({ ...f, status: val }))}
                            options={STATUS_OPTIONS.filter((o) => o.value)}
                          />
                        ) : (
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status || ''] || 'bg-gray-100 text-gray-600'}`}
                          >
                            {rec.status || '-'}
                          </span>
                        )}
                      </td>
                      {canManageAttendance && (
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{rec.check_in_ip || '-'}</td>
                      )}
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-32 truncate">
                        {editingId === rec.id ? (
                          <Input
                            value={editForm.notes}
                            onChange={(e) => setEditForm((f: any) => ({ ...f, notes: e.target.value }))}
                            className="text-xs py-1"
                          />
                        ) : (
                          rec.notes || '-'
                        )}
                      </td>
                      {canManageAttendance && (
                        <td className="px-4 py-3 text-right">
                          {editingId === rec.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => saveEdit(rec.id!)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(rec)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
              <span>
                Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of{' '}
                {meta.total}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={meta.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={meta.page >= meta.pages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
