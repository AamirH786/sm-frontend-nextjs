'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Globe, Mail, MapPin, Phone, Sparkles, UserRound } from 'lucide-react';
import Button from '@/components/ui/Button';
import organizationService from '@/services/organizationService';
import type { OrganizationDetailItem } from '@/types/organization';
import { useToast } from '@/context/ToastContext';

const formatContactName = (organization: OrganizationDetailItem) => {
  const first = organization.contact_person?.first_name?.trim() || '';
  const last = organization.contact_person?.last_name?.trim() || '';
  const fullName = `${first} ${last}`.trim();
  return fullName || organization.contact_person?.username || 'Contact person not linked yet';
};

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [organization, setOrganization] = useState<OrganizationDetailItem | null>(null);
  const [loading, setLoading] = useState(true);

  const organizationId = useMemo(() => Number(params?.id || 0), [params]);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    const loadOrganization = async () => {
      try {
        setLoading(true);
        const nextOrganization = await organizationService.getOrganization(organizationId);
        setOrganization(nextOrganization);
      } catch (error: any) {
        showToast(error?.message || 'Unable to load organization details.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadOrganization();
  }, [organizationId, showToast]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="space-y-6 p-6">
        <Button variant="outline" className="gap-2" onClick={() => router.push('/organizations')}>
          <ArrowLeft size={16} />
          Back to organizations
        </Button>
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">
          Organization details are not available.
        </div>
      </div>
    );
  }

  const isActive = organization.status === 1 || String(organization.status).toLowerCase() === 'active';

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" className="gap-2" onClick={() => router.push('/organizations')}>
          <ArrowLeft size={16} />
          Back to organizations
        </Button>
        <Link href="/organizations">
          <Button>Go to list</Button>
        </Link>
      </div>

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white shadow-xl">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-lg"
              style={{ backgroundColor: organization.theme_color || '#2563eb' }}
            >
              {organization.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={organization.logo_url} alt={organization.name} className="h-full w-full object-cover" />
              ) : (
                <Building2 size={30} />
              )}
            </div>
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
                <Sparkles size={14} />
                Organization Profile
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">{organization.name}</h1>
                <p className="mt-2 text-sm text-blue-100/85">{organization.industry || 'Industry not added yet'}</p>
              </div>
            </div>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${isActive ? 'bg-emerald-400/15 text-emerald-100' : 'bg-white/10 text-white/85'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            <Globe size={16} className="text-blue-600" />
            Organization Snapshot
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Website</p>
              <p className="mt-2 break-words text-sm font-medium text-slate-900">{organization.website || 'Not added yet'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Theme Color</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="h-5 w-5 rounded-full border border-slate-200" style={{ backgroundColor: organization.theme_color || '#2563eb' }} />
                <span className="text-sm font-medium text-slate-900">{organization.theme_color || '#2563eb'}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Address</p>
              <p className="mt-2 text-sm leading-6 text-slate-900">{organization.address || 'Not added yet'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            <MapPin size={16} className="text-blue-600" />
            Description
          </div>
          <div
            className="prose prose-sm max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: organization.description || '<p>No description added yet.</p>' }}
          />
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          <UserRound size={16} className="text-blue-600" />
          Contact Person
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Name</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{formatContactName(organization)}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <Mail size={14} />
              Email
            </div>
            <p className="mt-2 break-words text-base font-semibold text-slate-900">
              {organization.contact_person?.email || organization.email || 'Not added yet'}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              <Phone size={14} />
              Phone
            </div>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {organization.contact_person?.phone || organization.phone || 'Not added yet'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
