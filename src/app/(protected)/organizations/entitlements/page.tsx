'use client';

export default function OrganizationEntitlementsAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Assigned Avatars</h1>
        <p className="mt-2 text-sm text-slate-500">Assigned entitlements are stored separately from purchases and should be managed per organization.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Admin assignment APIs are wired through organization entitlement endpoints so avatars can be granted without changing any existing avatar logic.
      </div>
    </div>
  );
}
