'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usersService } from '@/services/rbacService';
import { Card, CardContent } from '@/components/ui/Card';
import {
  User, Wallet, ShoppingBag, ArrowLeftRight, CreditCard, Tag, ChevronLeft,
  CheckCircle, XCircle, Clock, Download
} from 'lucide-react';

const fmt = (d?: string) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const fmtDate = (d?: string) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtNum = (n: number) => n?.toLocaleString('en-IN') ?? '0';

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-5">
      <CardContent>
        <div className="flex items-center gap-2 mb-4 pb-2 border-b">
          <span className="text-blue-600">{icon}</span>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1.5 border-b last:border-0">
      <span className="text-gray-500 text-sm w-44 shrink-0">{label}</span>
      <span className="text-gray-800 text-sm font-medium">{value ?? '-'}</span>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-800">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [userSummary, setUserSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<'csv' | ''>('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    Promise.all([
      usersService.getClientDetails(Number(id)),
      usersService.get(Number(id)).catch(() => null),
    ])
      .then(([detailRes, userRes]) => {
        setData(detailRes);
        setUserSummary(userRes);
      })
      .catch(() => setError('Failed to load client details'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExport = async () => {
    try {
      setExporting('csv');
      const blob = await usersService.exportUser(Number(id), 'csv');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `client-${id}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting('');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  if (error) return (
    <div className="text-center py-20 text-red-600">{error}</div>
  );

  const user = data?.user || userSummary;
  const wallet = data?.wallet ?? null;
  const avatarPurchases = Array.isArray(data?.avatar_purchases) ? data.avatar_purchases : [];
  const creditTransactions = Array.isArray(data?.credit_transactions) ? data.credit_transactions : [];
  const paymentTransactions = Array.isArray(data?.payment_transactions) ? data.payment_transactions : [];
  const onboarding = data?.onboarding ?? null;
  const resolvedUserType = userSummary?.user_type || user?.user_type || '';
  const isClientUser = resolvedUserType === 'client' || !resolvedUserType;

  if (!user) {
    return <div className="text-center py-20 text-red-600">Client not found</div>;
  }

  const txTypeColor: Record<string, string> = {
    recharge: 'text-green-600 bg-green-50',
    chat_usage: 'text-orange-600 bg-orange-50',
    purchase: 'text-blue-600 bg-blue-50',
    trial: 'text-purple-600 bg-purple-50',
    refund: 'text-teal-600 bg-teal-50',
    admin_adjustment: 'text-gray-600 bg-gray-100',
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/clients')} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-semibold">{user.username}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting === 'csv'}
            className="inline-flex items-center bg-indigo-100 hover:bg-indigo-200 gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={16} />
            {exporting === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
          </button>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {user.status === 1 ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Profile */}
      <Section icon={<User size={16} />} title="Profile">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
          <div>
            <InfoRow label="Username" value={user.username} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phone} />
            <InfoRow label="Role" value={user.role_title} />
            <InfoRow label="User Type" value={userSummary?.user_type || user.user_type || '-'} />
          </div>
          <div>
            <InfoRow label="Joined" value={fmtDate(user.created_at)} />
            <InfoRow label="Email Verified" value={user.is_email_verified ? <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14} /> Verified</span> : <span className="text-red-500 flex items-center gap-1"><XCircle size={14} /> Not Verified</span>} />
            <InfoRow label="Onboarding" value={user.onboarding_completed ? <span className="text-green-600 flex items-center gap-1"><CheckCircle size={14} /> Completed</span> : <span className="text-gray-400 flex items-center gap-1"><Clock size={14} /> Pending</span>} />
          </div>
        </div>
      </Section>

      {isClientUser && (
      <Section icon={<Wallet size={16} />} title="Wallet & Credits">
        {wallet ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard label="Credits Balance" value={fmtNum(wallet.credits_balance)} />
              <StatCard label="Minutes Balance" value={fmtNum(wallet.minutes_balance)} sub="mins" />
              <StatCard label="Total Spent" value={`₹${fmtNum(wallet.total_amount_spent)}`} />
              <StatCard label="Free Trial" value={wallet.free_trial_used ? 'Used' : 'Available'} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Minutes Purchased" value={fmtNum(wallet.total_minutes_purchased)} />
              <StatCard label="Minutes Used" value={fmtNum(wallet.total_minutes_used)} />
              <StatCard label="Credits Purchased" value={fmtNum(wallet.total_credits_purchased)} />
              <StatCard label="Credits Used" value={fmtNum(wallet.total_credits_used)} />
            </div>
          </>
        ) : (
          <p className="text-gray-400 text-sm py-4 text-center">No wallet data yet</p>
        )}
      </Section>
      )}

      {isClientUser && (
      <Section icon={<Tag size={16} />} title="Onboarding & Interests">
        {user.onboarding_completed ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
            <div>
              <InfoRow label="Age Range" value={onboarding?.age_range} />
              <InfoRow label="Language" value={onboarding?.language} />
              <InfoRow label="Interaction Style" value={onboarding?.interaction_style} />
            </div>
            <div>
              <div className="py-1.5 border-b">
                <span className="text-gray-500 text-sm">Interests</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {onboarding?.interests?.length ? onboarding.interests.map((i: string) => (
                    <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{i}</span>
                  )) : <span className="text-gray-400 text-xs">None</span>}
                </div>
              </div>
              <div className="py-1.5">
                <span className="text-gray-500 text-sm">Support Preferences</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {onboarding?.support_preferences?.length ? onboarding.support_preferences.map((s: string) => (
                    <span key={s} className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full">{s}</span>
                  )) : <span className="text-gray-400 text-xs">None</span>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-sm py-4 text-center">Onboarding not completed yet</p>
        )}
      </Section>
      )}

      {isClientUser && (
      <Section icon={<ShoppingBag size={16} />} title={`Avatar Purchases (${avatarPurchases.length})`}>
        {avatarPurchases.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase">
                  <th className="pb-2 pr-4">Avatar</th>
                  <th className="pb-2 pr-4">Minutes</th>
                  <th className="pb-2 pr-4">Credits</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Purchased</th>
                </tr>
              </thead>
              <tbody>
                {avatarPurchases.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium">{p.avatar_name}</td>
                    <td className="py-2 pr-4">
                      <span className="text-gray-700">{fmtNum(p.minutes_used)}</span>
                      <span className="text-gray-400"> / {fmtNum(p.minutes_allocated)}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-gray-700">{fmtNum(p.credits_used)}</span>
                      <span className="text-gray-400"> / {fmtNum(p.credits_allocated)}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{fmtDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm py-4 text-center">No avatar purchases yet</p>
        )}
      </Section>
      )}

      {isClientUser && (
      <Section icon={<CreditCard size={16} />} title={`Payment History (${paymentTransactions.length})`}>
        {paymentTransactions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase">
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Minutes</th>
                  <th className="pb-2 pr-4">Credits</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {paymentTransactions.map((t: any) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium capitalize">{t.purchase_type?.replace('_', ' ')}</td>
                    <td className="py-2 pr-4 font-semibold">₹{t.amount}</td>
                    <td className="py-2 pr-4 text-gray-600">{t.minutes_granted > 0 ? `+${fmtNum(t.minutes_granted)} min` : '-'}</td>
                    <td className="py-2 pr-4 text-gray-600">{t.credits_granted > 0 ? `+${fmtNum(t.credits_granted)}` : '-'}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.status === 'success' || t.status === 'verified' ? 'bg-green-50 text-green-700' : t.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-700'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2 text-gray-500">{fmtDate(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm py-4 text-center">No payment history yet</p>
        )}
      </Section>
      )}

      {isClientUser && (
      <Section icon={<ArrowLeftRight size={16} />} title={`Credit & Minute Log (${creditTransactions.length})`}>
        {creditTransactions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase">
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Credits</th>
                  <th className="pb-2 pr-4">Minutes</th>
                  <th className="pb-2 pr-4">Description</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {creditTransactions.map((t: any) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${txTypeColor[t.transaction_type] || 'bg-gray-100 text-gray-600'}`}>
                        {t.transaction_type}
                      </span>
                    </td>
                    <td className={`py-2 pr-4 font-medium ${t.amount > 0 ? 'text-green-600' : t.amount < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {t.amount > 0 ? `+${t.amount}` : t.amount < 0 ? t.amount : '-'}
                    </td>
                    <td className={`py-2 pr-4 font-medium ${t.minutes > 0 ? 'text-green-600' : t.minutes < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {t.minutes > 0 ? `+${t.minutes} min` : t.minutes < 0 ? `${t.minutes} min` : '-'}
                    </td>
                    <td className="py-2 pr-4 text-gray-500 max-w-xs truncate">{t.description || '-'}</td>
                    <td className="py-2 text-gray-500 whitespace-nowrap">{fmt(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm py-4 text-center">No transaction log yet</p>
        )}
      </Section>
      )}
    </div>
  );
}
