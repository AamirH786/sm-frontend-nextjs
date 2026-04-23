'use client';

import Link from 'next/link';
import { OrganizationPanelState, useOrganizationCurrentData } from '@/components/organization/OrganizationCurrentData';

type AvatarItem = {
  avatar_id: number;
  avatar_name: string;
  description?: string | null;
  preview_image?: string | null;
  price: number;
  minutes_per_month: number;
  validity_days: number;
  is_assigned: boolean;
};

export default function OrganizationBrowsePage() {
  const { data, loading, error } = useOrganizationCurrentData<{ items: AvatarItem[] }>('/organizations/current/avatars');
  const available = (data?.items ?? []).filter((item) => !item.is_assigned);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Browse Avatars</h1>
        <p className="mt-2 text-sm text-slate-500">Dynamic pricing comes from organization avatar pricing, not hardcoded values.</p>
      </div>

      <OrganizationPanelState
        loading={loading}
        error={error}
        emptyMessage="No purchasable avatars are configured for this organization yet."
        hasData={available.length > 0}
      >
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {available.map((item) => (
            <article key={item.avatar_id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100">
                {item.preview_image ? (
                  <img src={item.preview_image} alt={item.avatar_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No preview</div>
                )}
              </div>
              <h2 className="text-lg font-semibold text-slate-900">{item.avatar_name}</h2>
              <p className="mt-2 text-sm text-slate-500">{item.description || 'Purchase-ready avatar for this organization.'}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                <span>Rs. {item.price}</span>
                <span>{item.minutes_per_month} min/month</span>
                <span>{item.validity_days} days validity</span>
                <span>Razorpay enabled</span>
              </div>
              <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Purchase checkout should call your existing Razorpay order API and, after success, create the entitlement.
              </div>
            </article>
          ))}
        </div>
      </OrganizationPanelState>

      <p className="text-sm text-slate-500">
        After payment success, the avatar should appear in{' '}
        <Link href="/organization/avatars" className="font-medium text-blue-600">
          My Avatars
        </Link>
        .
      </p>
    </div>
  );
}
