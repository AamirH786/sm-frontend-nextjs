'use client';

export default function OrganizationBatchesAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Organization Batches</h1>
        <p className="mt-2 text-sm text-slate-500">Batch management remains tenant-scoped and should be operated per organization.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Use organization-scoped batch APIs to create, update, and review scheduled learning batches without leaking data across tenants.
      </div>
    </div>
  );
}
