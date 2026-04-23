'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { CreditCard, Users, Layers3, Wand2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useOrganizationCurrentData } from '@/components/organization/OrganizationCurrentData';

type DashboardPayload = {
  organization: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    logo_url?: string | null;
    theme_color?: string | null;
    description?: string | null;
    website?: string | null;
  };
  stats: { label: string; value: number | string }[];
  entitlements: {
    id: number;
    avatar_id: number;
    source_type: string;
    valid_until?: string | null;
  }[];
  recent_purchases: {
    id: number;
    item_type: string;
    item_id: number;
    price: number;
    status: string;
    created_at: string;
  }[];
};

const iconMap = {
  Members: Users,
  Batches: Layers3,
  'My Avatars': Wand2,
  'Trial Minutes': CreditCard,
} as const;

export default function OrganizationDashboardView() {
  const { data, loading, error, reload } = useOrganizationCurrentData<DashboardPayload>('/organizations/current/dashboard');

  const emptyAvatars = useMemo(() => !data?.entitlements?.length, [data]);
  const membersCount = useMemo(
    () => data?.stats?.find((stat) => stat.label.toLowerCase() === 'members')?.value ?? 0,
    [data]
  );
  const avatarsCount = useMemo(
    () => data?.stats?.find((stat) => stat.label.toLowerCase() === 'my avatars')?.value ?? 0,
    [data]
  );
  const recentActivityCount = data?.recent_purchases?.length ?? 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-3xl bg-slate-200/60" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="h-28 animate-pulse rounded-3xl bg-slate-200/60" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-200/60" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-200/60" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-200/60" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8">
        <h2 className="text-lg font-semibold text-red-700">Unable to load dashboard</h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <Button className="mt-4" variant="outline" onClick={reload}>Retry</Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 text-slate-500">
        Organization data unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl text-white"
              style={{ backgroundColor: data.organization.theme_color || '#2563eb' }}
            >
              {data.organization.logo_url ? (
                <img src={data.organization.logo_url} alt={data.organization.name} className="h-full w-full object-cover" />
              ) : (
                <Wand2 size={24} />
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">Organization Summary</p>
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">{data.organization.name}</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  {data.organization.description || 'Manage members, batches, avatars, and payments from one tenant-safe workspace.'}
                </p>
              </div>
              <div className="grid gap-2 pt-1 text-sm text-slate-700 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-100 px-3 py-2"><span className="font-semibold">{membersCount}</span> members</div>
                <div className="rounded-xl bg-slate-100 px-3 py-2"><span className="font-semibold">{avatarsCount}</span> avatars</div>
                <div className="rounded-xl bg-slate-100 px-3 py-2"><span className="font-semibold">{recentActivityCount}</span> recent activity</div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                <span>{data.organization.email}</span>
                {data.organization.phone ? <span>{data.organization.phone}</span> : null}
                {data.organization.website ? <span>{data.organization.website}</span> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/organization/members">
              <Button> Add Member </Button>
            </Link>
            <Link href="/organization/batches">
              <Button variant="outline"> Create Batch </Button>
            </Link>
            <Link href="/organization/browse">
              <Button variant="secondary"> Browse Avatars </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat) => {
          const Icon = iconMap[stat.label as keyof typeof iconMap] || CreditCard;
          return (
            <article key={stat.label} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{stat.value}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <Icon size={20} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">My Avatars</h2>
              <p className="text-sm text-slate-500">Assigned and purchased avatars available to your organization.</p>
            </div>
            <Link href="/organization/avatars" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View all
            </Link>
          </div>

          {emptyAvatars ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <p className="text-base font-medium text-slate-800">You don&apos;t have any avatars yet.</p>
              <p className="mt-2 text-sm text-slate-500">Browse the catalog and purchase one or more avatars for your organization.</p>
              <div className="mt-5">
                <Link href="/organization/browse">
                  <Button>Browse Avatars</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.entitlements.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-900">Avatar #{item.avatar_id}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">{item.source_type}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    {item.valid_until ? `Valid until ${new Date(item.valid_until).toLocaleDateString()}` : 'No expiry configured'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-5">
            <h2 className="text-xl font-semibold text-slate-900">Recent Purchases</h2>
            <p className="text-sm text-slate-500">Latest organization payment activity.</p>
          </div>

          {!data.recent_purchases.length ? (
            <p className="text-sm text-slate-500">No purchases yet.</p>
          ) : (
            <div className="space-y-3">
              {data.recent_purchases.slice(0, 5).map((purchase) => (
                <div key={purchase.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {purchase.item_type} #{purchase.item_id}
                      </p>
                      <p className="text-xs text-slate-500">{new Date(purchase.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">Rs. {purchase.price}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{purchase.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
