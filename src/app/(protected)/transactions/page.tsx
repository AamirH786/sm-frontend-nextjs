'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import api from '@/lib/api';
import { Download, Filter, IndianRupee, Loader2, RefreshCw, Search } from 'lucide-react';

interface AdminTransaction {
  id: number;
  user_id: number;
  purchase_type: string;
  avatar_id?: number;
  course_id?: number;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  amount: number;
  currency: string;
  minutes_granted: number;
  credits_granted: number;
  status: string;
  initiated_at: string;
  completed_at?: string;
  user?: { id: number; email: string; first_name?: string; last_name?: string };
  avatar?: { avatar_name: string };
}

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const STATUS_COLORS: Record<string, string> = {
  captured: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-blue-100 text-blue-700',
  created: 'bg-gray-100 text-gray-600',
};

const TYPE_LABELS: Record<string, string> = {
  avatar: 'Avatar',
  course: 'Course',
  recharge: 'Wallet Recharge',
  minutes_pack: 'Minutes Pack',
};

export default function AdminTransactionsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const PAGE_SIZE = 50;

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('purchase_type', typeFilter);
      const res = await api.get(`/admin/analytics/transactions?${params}`);
      const data = res.data;
      setTransactions(data.data || []);
      setTotal(data.total || 0);
    } catch {
      showToast('Failed to load transactions', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter, typeFilter, showToast]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = transactions
    .filter(t => t.status === 'captured')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const filtered = search
    ? transactions.filter(t =>
        t.razorpay_payment_id?.toLowerCase().includes(search.toLowerCase()) ||
        t.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        `${t.user?.first_name} ${t.user?.last_name}`.toLowerCase().includes(search.toLowerCase())
      )
    : transactions;

  const exportCsv = () => {
    const rows = [
      ['ID', 'User', 'Email', 'Type', 'Amount', 'Currency', 'Status', 'Payment ID', 'Date'],
      ...transactions.map(t => [
        t.id,
        `${t.user?.first_name || ''} ${t.user?.last_name || ''}`.trim() || t.user_id,
        t.user?.email || '',
        TYPE_LABELS[t.purchase_type] || t.purchase_type,
        t.amount,
        t.currency,
        t.status,
        t.razorpay_payment_id || '',
        t.completed_at || t.initiated_at,
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">All payment transactions across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-700">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Transactions</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Revenue (this page)</p>
          <p className="text-xl font-bold text-green-600 flex items-center gap-0.5">
            <IndianRupee className="w-4 h-4" />{totalRevenue.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Successful</p>
          <p className="text-2xl font-bold text-gray-900">{transactions.filter(t => t.status === 'captured').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Failed</p>
          <p className="text-2xl font-bold text-red-500">{transactions.filter(t => t.status === 'failed').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email, payment ID…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
          <option value="">All Statuses</option>
          <option value="captured">Captured</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
          <option value="">All Types</option>
          <option value="avatar">Avatar</option>
          <option value="course">Course</option>
          <option value="recharge">Wallet Recharge</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">No transactions found</td></tr>
                ) : filtered.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">#{tx.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs">
                        {`${tx.user?.first_name || ''} ${tx.user?.last_name || ''}`.trim() || `User #${tx.user_id}`}
                      </p>
                      <p className="text-gray-400 text-xs">{tx.user?.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-gray-700">
                        {TYPE_LABELS[tx.purchase_type] || tx.purchase_type}
                      </span>
                      {tx.avatar && <p className="text-xs text-gray-400 mt-0.5">{tx.avatar.avatar_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {money.format(Number(tx.amount))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[tx.status] || 'bg-gray-100 text-gray-600'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-[140px] truncate">
                      {tx.razorpay_payment_id || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {tx.completed_at ? dt.format(new Date(tx.completed_at)) : dt.format(new Date(tx.initiated_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
              <span className="text-gray-500">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 text-gray-600 text-xs">
                  ← Prev
                </button>
                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 text-gray-600 text-xs">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
