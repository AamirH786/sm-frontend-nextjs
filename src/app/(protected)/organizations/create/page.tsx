'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import OrganizationForm from '@/components/organization/OrganizationForm';
import { useOrganizations } from '@/context/OrganizationsContext';
import { useToast } from '@/context/ToastContext';
import type { OrganizationCreatePayload } from '@/types/organization';

export default function CreateOrganizationPage() {
  const router = useRouter();
  const { createOrganization } = useOrganizations();
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload: OrganizationCreatePayload) => {
    if (submitting) return;
    try {
      setSubmitting(true);
      const created = await createOrganization(payload);
      showToast(
        `Organization created. Credentials sent to ${created.contact_person_email}.`,
        'success'
      );
      router.replace('/organizations');
    } catch (err: any) {
      showToast(err?.message || 'Unable to create organization.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">Organizations</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Create Organization</h1>
          <p className="mt-2 text-sm text-slate-500">
            Add organization details and contact person who will log in to the platform.
          </p>
        </div>
        <Link
          href="/organizations"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back To List
        </Link>
      </div>
      <OrganizationForm onSubmit={handleSubmit} submitting={submitting} cancelHref="/organizations" />
    </div>
  );
}
