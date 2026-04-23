'use client';

import { OrganizationPanelState, useOrganizationCurrentData } from '@/components/organization/OrganizationCurrentData';

type PurchaseItem = {
  id: number;
  item_type: string;
  item_id: number;
  quantity: number;
  price: number;
  transaction_id?: string | null;
  status: string;
  created_at: string;
};

export default function OrganizationTransactionsPage() {
  const { data, loading, error } = useOrganizationCurrentData<PurchaseItem[]>('/organizations/current/purchases');
  const purchases = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Transactions</h1>
        <p className="mt-2 text-sm text-slate-500">Razorpay-linked organization purchases and payment records.</p>
      </div>

      <OrganizationPanelState
        loading={loading}
        error={error}
        emptyMessage="No organization transactions yet."
        hasData={purchases.length > 0}
      >
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-5 gap-4 border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            <span>Item</span>
            <span>Order</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Date</span>
          </div>
          {purchases.map((purchase) => (
            <div key={purchase.id} className="grid grid-cols-5 gap-4 px-5 py-4 text-sm text-slate-700">
              <span>{purchase.item_type} #{purchase.item_id}</span>
              <span>{purchase.transaction_id || `Purchase #${purchase.id}`}</span>
              <span>Rs. {purchase.price}</span>
              <span>{purchase.status}</span>
              <span>{new Date(purchase.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </OrganizationPanelState>
    </div>
  );
}
