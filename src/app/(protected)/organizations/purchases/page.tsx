'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CreditCard, Eye, ReceiptText, Search, Sparkles } from 'lucide-react';
import OrganizationAdminHeader from '@/components/organization/admin/OrganizationAdminHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { useToast } from '@/context/ToastContext';
import organizationAdminService, {
  type OrganizationEntitlementRecord,
  type OrganizationItem,
  type OrganizationPurchaseRecord,
} from '@/services/organizationAdminService';

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function OrganizationPurchasesAdminPage() {
  const { showToast } = useToast();
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | null>(null);
  const [purchases, setPurchases] = useState<OrganizationPurchaseRecord[]>([]);
  const [entitlements, setEntitlements] = useState<OrganizationEntitlementRecord[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<OrganizationPurchaseRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const nextOrganizations = await organizationAdminService.listOrganizations({ limit: 1000, skip: 0 });
        setOrganizations(nextOrganizations);
        setSelectedOrganizationId((current) => current ?? nextOrganizations[0]?.id ?? null);
      } catch (error: any) {
        showToast(error?.message || 'Unable to load organizations.', 'error');
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, [showToast]);

  useEffect(() => {
    if (!selectedOrganizationId) {
      setPurchases([]);
      setEntitlements([]);
      return;
    }

    const loadOrganizationData = async () => {
      try {
        setIsLoading(true);
        const [nextPurchases, nextEntitlements] = await Promise.all([
          organizationAdminService.listPurchases(selectedOrganizationId),
          organizationAdminService.listEntitlements(selectedOrganizationId),
        ]);
        setPurchases(nextPurchases);
        setEntitlements(nextEntitlements);
      } catch (error: any) {
        showToast(error?.message || 'Unable to load purchase history.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganizationData();
  }, [selectedOrganizationId, showToast]);

  const entitlementByPurchaseId = useMemo(() => {
    const map = new Map<number, OrganizationEntitlementRecord>();
    entitlements.forEach((entitlement) => {
      if (entitlement.purchase_id) {
        map.set(entitlement.purchase_id, entitlement);
      }
    });
    return map;
  }, [entitlements]);

  const filteredPurchases = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return [...purchases]
      .filter((purchase) => (statusFilter === 'all' ? true : purchase.status === statusFilter))
      .filter((purchase) => (itemTypeFilter === 'all' ? true : purchase.item_type === itemTypeFilter))
      .filter((purchase) => {
        if (!normalizedQuery) return true;
        return [
          purchase.transaction_id,
          purchase.status,
          purchase.item_type,
          String(purchase.id),
          String(purchase.item_id),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .sort((left, right) => {
        const leftDate = Date.parse(left.created_at || '') || 0;
        const rightDate = Date.parse(right.created_at || '') || 0;
        return rightDate - leftDate;
      });
  }, [itemTypeFilter, purchases, searchTerm, statusFilter]);

  const successfulPurchases = purchases.filter((purchase) => purchase.status === 'success').length;
  const totalRevenue = purchases.reduce((total, purchase) => total + (purchase.price || 0), 0);
  const linkedEntitlements = purchases.filter((purchase) => entitlementByPurchaseId.has(purchase.id)).length;
  const uniqueStatuses = Array.from(new Set(purchases.map((purchase) => purchase.status).filter(Boolean)));
  const uniqueItemTypes = Array.from(new Set(purchases.map((purchase) => purchase.item_type).filter(Boolean)));

  return (
    <div className="space-y-6 p-6">
      <OrganizationAdminHeader
        title="Organization Purchases"
        description="Review organization-level purchase history, verify payment outcomes, and cross-check whether each purchase has already been converted into an entitlement."
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={(value) => setSelectedOrganizationId(value)}
        stats={[
          { label: 'Total purchases', value: purchases.length },
          { label: 'Successful', value: successfulPurchases },
          { label: 'Revenue tracked', value: formatCurrency(totalRevenue) },
          { label: 'Linked entitlements', value: linkedEntitlements },
        ]}
      />

      <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1.6fr_0.7fr_0.7fr]">
        <Input
          label="Search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by transaction ID, purchase ID, item type, or item ID"
        />
        <Select
          label="Status"
          options={[
            { value: 'all', label: 'All statuses' },
            ...uniqueStatuses.map((status) => ({ value: status, label: status })),
          ]}
          value={statusFilter}
          onChange={(value) => setStatusFilter(String(value))}
        />
        <Select
          label="Item Type"
          options={[
            { value: 'all', label: 'All item types' },
            ...uniqueItemTypes.map((itemType) => ({ value: itemType, label: itemType })),
          ]}
          value={itemTypeFilter}
          onChange={(value) => setItemTypeFilter(String(value))}
        />
      </section>

      {isBootstrapping || isLoading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        </div>
      ) : !selectedOrganizationId ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          No organizations are available for purchase tracking yet.
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          No purchases match the current filters for this organization.
        </div>
      ) : (
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr_0.5fr] gap-4 border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
            <span>Purchase</span>
            <span>Transaction</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Entitlement</span>
            <span className="text-right">View</span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredPurchases.map((purchase) => {
              const linkedEntitlement = entitlementByPurchaseId.get(purchase.id);

              return (
                <div
                  key={purchase.id}
                  className="grid gap-4 px-5 py-5 lg:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr_0.5fr] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {purchase.item_type} #{purchase.item_id}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      Purchase #{purchase.id} | Qty {purchase.quantity} | {purchase.total_minutes} mins
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {purchase.transaction_id || 'Not available'}
                    </p>
                    <p className="truncate text-xs text-slate-500">{formatDateTime(purchase.created_at)}</p>
                  </div>

                  <div className="text-sm font-semibold text-slate-900">{formatCurrency(purchase.price)}</div>

                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        purchase.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {purchase.status}
                    </span>
                  </div>

                  <div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        linkedEntitlement ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {linkedEntitlement ? `Linked #${linkedEntitlement.id}` : 'Not linked'}
                    </span>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="ghost" className="gap-2" onClick={() => setSelectedPurchase(purchase)}>
                      <Eye size={16} />
                      View
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Modal
        isOpen={Boolean(selectedPurchase)}
        onClose={() => setSelectedPurchase(null)}
        title="Purchase Details"
        size="lg"
      >
        {selectedPurchase ? (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
                    <Sparkles size={14} />
                    Purchase Summary
                  </div>
                  <h3 className="text-2xl font-semibold tracking-tight">
                    {selectedPurchase.item_type} #{selectedPurchase.item_id}
                  </h3>
                  <p className="text-sm text-blue-100/85">
                    Purchase #{selectedPurchase.id} | {selectedPurchase.quantity} quantity | {selectedPurchase.total_minutes} minutes
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                    selectedPurchase.status === 'success'
                      ? 'bg-emerald-400/15 text-emerald-100'
                      : 'bg-amber-400/15 text-amber-100'
                  }`}
                >
                  {selectedPurchase.status}
                </span>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ReceiptText size={16} className="text-blue-600" />
                  Item Details
                </div>
                <p className="text-sm text-slate-600">
                  {selectedPurchase.item_type} #{selectedPurchase.item_id}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CreditCard size={16} className="text-blue-600" />
                  Transaction ID
                </div>
                <p className="break-words text-sm text-slate-600">
                  {selectedPurchase.transaction_id || 'Not available'}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Search size={16} className="text-blue-600" />
                  Amount and Quantity
                </div>
                <p className="text-sm text-slate-600">
                  {formatCurrency(selectedPurchase.price)} | Qty {selectedPurchase.quantity}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CalendarClock size={16} className="text-blue-600" />
                  Usage Window
                </div>
                <p className="text-sm text-slate-600">
                  {formatDateTime(selectedPurchase.valid_from)} to {formatDateTime(selectedPurchase.valid_until)}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Entitlement Link
              </h4>
              <p className="mt-3 text-sm text-slate-600">
                {entitlementByPurchaseId.has(selectedPurchase.id)
                  ? `This purchase is already linked to entitlement #${entitlementByPurchaseId.get(selectedPurchase.id)?.id}.`
                  : 'No entitlement is linked to this purchase yet.'}
              </p>
            </section>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedPurchase(null)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
