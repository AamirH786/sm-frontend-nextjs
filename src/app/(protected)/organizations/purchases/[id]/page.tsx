'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, CalendarClock, CreditCard, ReceiptText, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import organizationAdminService, { type OrganizationEntitlementRecord, type OrganizationPurchaseRecord } from '@/services/organizationAdminService';

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0);

export default function OrganizationPurchaseDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [purchase, setPurchase] = useState<OrganizationPurchaseRecord | null>(null);
  const [entitlements, setEntitlements] = useState<OrganizationEntitlementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const purchaseId = Number(params?.id || 0);
  const orgId = Number(searchParams.get('orgId') || 0);

  useEffect(() => {
    if (!purchaseId || !orgId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const [purchaseResponse, entitlementResponse] = await Promise.all([
          organizationAdminService.listPurchases(orgId),
          organizationAdminService.listEntitlements(orgId),
        ]);
        setPurchase(purchaseResponse.find((item) => item.id === purchaseId) ?? null);
        setEntitlements(entitlementResponse);
      } catch (error: any) {
        showToast(error?.message || 'Unable to load purchase details.', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [purchaseId, orgId, showToast]);

  const linkedEntitlement = useMemo(() => entitlements.find((item) => item.purchase_id === purchase?.id), [entitlements, purchase]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" /></div>;
  }
  if (!purchase) {
    return <div className="p-6"><Link href="/organizations/purchases"><Button variant="outline" className="gap-2"><ArrowLeft size={16} />Back to purchases</Button></Link></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <Link href="/organizations/purchases"><Button variant="outline" className="gap-2"><ArrowLeft size={16} />Back to purchases</Button></Link>
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"><Sparkles size={14} />Purchase Profile</div>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">{purchase.item_type} #{purchase.item_id}</h1>
        <p className="mt-2 text-sm text-slate-500">Purchase #{purchase.id} tracked for organization billing.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"><CreditCard size={14} />Amount</div><p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(purchase.price)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"><ReceiptText size={14} />Transaction</div><p className="mt-2 break-words text-sm font-semibold text-slate-900">{purchase.transaction_id || 'Not available'}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"><CalendarClock size={14} />Window</div><p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(purchase.valid_from)} to {formatDateTime(purchase.valid_until)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"><Sparkles size={14} />Entitlement</div><p className="mt-2 text-sm font-semibold text-slate-900">{linkedEntitlement ? `Linked #${linkedEntitlement.id}` : 'Not linked yet'}</p></div>
      </section>
    </div>
  );
}
