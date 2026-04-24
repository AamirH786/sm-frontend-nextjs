'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, CalendarClock, MonitorPlay, ReceiptText, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { avatarsService, type Avatar } from '@/services/avatarsService';
import organizationAdminService, { type OrganizationEntitlementRecord, type OrganizationPurchaseRecord } from '@/services/organizationAdminService';

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function OrganizationEntitlementDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [entitlement, setEntitlement] = useState<OrganizationEntitlementRecord | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [purchases, setPurchases] = useState<OrganizationPurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const entitlementId = Number(params?.id || 0);
  const orgId = Number(searchParams.get('orgId') || 0);

  useEffect(() => {
    if (!entitlementId || !orgId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const [entitlements, purchaseResponse, avatarResponse] = await Promise.all([
          organizationAdminService.listEntitlements(orgId),
          organizationAdminService.listPurchases(orgId),
          avatarsService.list({ page: 1, limit: 200 }),
        ]);
        setEntitlement(entitlements.find((item) => item.id === entitlementId) ?? null);
        setPurchases(purchaseResponse);
        setAvatars(avatarResponse.data ?? []);
      } catch (error: any) {
        showToast(error?.message || 'Unable to load entitlement details.', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [entitlementId, orgId, showToast]);

  const avatar = useMemo(() => avatars.find((item) => item.id === entitlement?.avatar_id), [avatars, entitlement]);
  const purchase = useMemo(() => purchases.find((item) => item.id === entitlement?.purchase_id), [purchases, entitlement]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" /></div>;
  }
  if (!entitlement) {
    return <div className="p-6"><Link href="/organizations/entitlements"><Button variant="outline" className="gap-2"><ArrowLeft size={16} />Back to assigned avatars</Button></Link></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <Link href="/organizations/entitlements"><Button variant="outline" className="gap-2"><ArrowLeft size={16} />Back to assigned avatars</Button></Link>
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {avatar?.heygen_preview_image ? <img src={avatar.heygen_preview_image} alt={avatar.avatar_name} className="h-full w-full object-cover" /> : <MonitorPlay size={24} className="text-slate-400" />}
          </div>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"><Sparkles size={14} />Entitlement Profile</div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">{avatar?.avatar_name || `Avatar #${entitlement.avatar_id}`}</h1>
            <p className="mt-2 text-sm text-slate-500">{avatar?.persona || 'Organization avatar entitlement'}</p>
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"><Sparkles size={14} />Source</div><p className="mt-2 text-sm font-semibold text-slate-900">{entitlement.source_type}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"><ReceiptText size={14} />Purchase</div><p className="mt-2 text-sm font-semibold text-slate-900">{purchase ? `Purchase #${purchase.id}` : 'Manual assignment'}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"><CalendarClock size={14} />Valid Until</div><p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(entitlement.valid_until)}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"><Sparkles size={14} />Created</div><p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(entitlement.created_at)}</p></div>
      </section>
    </div>
  );
}
