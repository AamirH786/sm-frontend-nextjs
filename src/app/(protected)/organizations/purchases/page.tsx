'use client';

export default function OrganizationPurchasesAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Organization Purchases</h1>
        <p className="mt-2 text-sm text-slate-500">Payment records remain organization-specific and should map back to avatar entitlements after success.</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        Razorpay order and payment tracking should persist in the purchases table and drive entitlement creation after successful verification.
      </div>
    </div>
  );
}
