'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, MonitorPlay, Plus, ReceiptText, Sparkles, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import OrganizationAdminHeader from '@/components/organization/admin/OrganizationAdminHeader';
import { useToast } from '@/context/ToastContext';
import { avatarsService, type Avatar } from '@/services/avatarsService';
import organizationAdminService, {
  type OrganizationEntitlementRecord,
  type OrganizationItem,
  type OrganizationPurchaseRecord,
} from '@/services/organizationAdminService';

type EntitlementFormState = {
  avatar_id: string;
  source_type: string;
  purchase_id: string;
  valid_until: string;
};

const DEFAULT_FORM: EntitlementFormState = {
  avatar_id: '',
  source_type: 'assignment',
  purchase_id: '',
  valid_until: '',
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'No expiry';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60000);
  return adjusted.toISOString().slice(0, 16);
};

export default function OrganizationEntitlementsAdminPage() {
  const { showToast } = useToast();
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [entitlements, setEntitlements] = useState<OrganizationEntitlementRecord[]>([]);
  const [purchases, setPurchases] = useState<OrganizationPurchaseRecord[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState<EntitlementFormState>(DEFAULT_FORM);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [entitlementToDelete, setEntitlementToDelete] = useState<OrganizationEntitlementRecord | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [orgs, avatarResponse] = await Promise.all([
          organizationAdminService.listOrganizations({ limit: 1000, skip: 0 }),
          avatarsService.list({ page: 1, limit: 200 }),
        ]);
        setOrganizations(orgs);
        setSelectedOrganizationId((current) => current ?? orgs[0]?.id ?? null);
        setAvatars(avatarResponse.data ?? []);
      } catch (error: any) {
        showToast(error?.message || 'Unable to load entitlement settings.', 'error');
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, [showToast]);

  useEffect(() => {
    if (!selectedOrganizationId) {
      setEntitlements([]);
      setPurchases([]);
      return;
    }

    const loadOrganizationData = async () => {
      try {
        setIsLoading(true);
        const [nextEntitlements, nextPurchases] = await Promise.all([
          organizationAdminService.listEntitlements(selectedOrganizationId),
          organizationAdminService.listPurchases(selectedOrganizationId),
        ]);
        setEntitlements(nextEntitlements);
        setPurchases(nextPurchases);
      } catch (error: any) {
        showToast(error?.message || 'Unable to load organization entitlements.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganizationData();
  }, [selectedOrganizationId, showToast]);

  const avatarMap = useMemo(() => new Map(avatars.map((avatar) => [avatar.id, avatar])), [avatars]);

  const avatarPurchases = useMemo(
    () => purchases.filter((purchase) => purchase.item_type === 'avatar'),
    [purchases]
  );

  useEffect(() => {
    if (formState.source_type !== 'purchase') return;
    const purchase = avatarPurchases.find((item) => item.id === Number(formState.purchase_id));
    if (!purchase) return;

    setFormState((current) => ({
      ...current,
      avatar_id: String(purchase.item_id),
      valid_until: current.valid_until || toDateTimeLocal(purchase.valid_until),
    }));
  }, [formState.purchase_id, formState.source_type, avatarPurchases]);

  const sortedEntitlements = useMemo(
    () =>
      [...entitlements].sort((a, b) => {
        const left = Date.parse(a.created_at || '') || 0;
        const right = Date.parse(b.created_at || '') || 0;
        return right - left;
      }),
    [entitlements]
  );

  const stats = [
    { label: 'Assigned avatars', value: entitlements.length },
    { label: 'Manual assignments', value: entitlements.filter((item) => item.source_type === 'assignment').length },
    { label: 'Purchase-linked', value: entitlements.filter((item) => item.source_type === 'purchase').length },
  ];

  const handleAssign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOrganizationId) return;

    if (!formState.avatar_id) {
      showToast('Select an avatar to assign.', 'error');
      return;
    }
    if (formState.source_type === 'purchase' && !formState.purchase_id) {
      showToast('Select the related purchase for purchase-based entitlement.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      await organizationAdminService.assignEntitlement(selectedOrganizationId, {
        avatar_id: Number(formState.avatar_id),
        source_type: formState.source_type,
        purchase_id: formState.purchase_id ? Number(formState.purchase_id) : null,
        valid_until: formState.valid_until ? new Date(formState.valid_until).toISOString() : null,
      });
      showToast('Avatar assigned successfully.', 'success');
      setEntitlements(await organizationAdminService.listEntitlements(selectedOrganizationId));
      setIsAssignOpen(false);
      setFormState(DEFAULT_FORM);
    } catch (error: any) {
      showToast(error?.message || 'Unable to assign avatar entitlement.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedOrganizationId || !entitlementToDelete) return;

    try {
      setIsSaving(true);
      await organizationAdminService.removeEntitlement(selectedOrganizationId, entitlementToDelete.id);
      showToast('Entitlement removed successfully.', 'success');
      setEntitlementToDelete(null);
      setEntitlements(await organizationAdminService.listEntitlements(selectedOrganizationId));
    } catch (error: any) {
      showToast(error?.message || 'Unable to remove entitlement.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <OrganizationAdminHeader
        title="Assigned Avatars"
        description="Grant organization-level avatar access, keep purchase-linked assignments visible, and remove unused entitlements without touching core avatar records."
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={(value) => setSelectedOrganizationId(value)}
        stats={stats}
        actions={
          <Button className="gap-2 rounded-2xl" onClick={() => setIsAssignOpen(true)} disabled={!selectedOrganizationId}>
            <Plus size={16} />
            Assign Avatar
          </Button>
        }
      />

      {isBootstrapping || isLoading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        </div>
      ) : !selectedOrganizationId ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          No organizations available for entitlement management.
        </div>
      ) : sortedEntitlements.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          No avatar entitlements assigned for this organization yet.
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {sortedEntitlements.map((entitlement) => {
            const avatar = avatarMap.get(entitlement.avatar_id);
            const purchase = entitlement.purchase_id
              ? purchases.find((item) => item.id === entitlement.purchase_id)
              : null;

            return (
              <article
                key={entitlement.id}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      {avatar?.heygen_preview_image ? (
                        <img src={avatar.heygen_preview_image} alt={avatar.avatar_name} className="h-full w-full object-cover" />
                      ) : (
                        <MonitorPlay size={22} className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                        {avatar?.avatar_name || `Avatar #${entitlement.avatar_id}`}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {avatar?.persona || 'Organization avatar entitlement'}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${entitlement.source_type === 'purchase' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                    {entitlement.source_type}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <ReceiptText size={14} />
                      Purchase Link
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {purchase ? `Purchase #${purchase.id}` : entitlement.purchase_id ? `Purchase #${entitlement.purchase_id}` : 'Manual assignment'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <CalendarClock size={14} />
                      Valid Until
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(entitlement.valid_until)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Sparkles size={14} />
                      Created
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{formatDateTime(entitlement.created_at)}</p>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <Button variant="danger" className="gap-2" onClick={() => setEntitlementToDelete(entitlement)}>
                    <Trash2 size={16} />
                    Remove
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isAssignOpen}
        onClose={() => {
          setIsAssignOpen(false);
          setFormState(DEFAULT_FORM);
        }}
        title="Assign Avatar Entitlement"
        size="lg"
      >
        <form onSubmit={handleAssign} className="space-y-5">
          <Select
            label="Source Type"
            options={[
              { value: 'assignment', label: 'Manual assignment' },
              { value: 'purchase', label: 'Link to existing purchase' },
            ]}
            value={formState.source_type}
            onChange={(value) =>
              setFormState((current) => ({
                ...current,
                source_type: String(value),
                purchase_id: String(value) === 'purchase' ? current.purchase_id : '',
              }))
            }
          />

          {formState.source_type === 'purchase' ? (
            <Select
              label="Purchase"
              options={avatarPurchases.map((purchase) => ({
                value: purchase.id,
                label: `Purchase #${purchase.id} • Avatar #${purchase.item_id} • ${purchase.status}`,
              }))}
              value={formState.purchase_id}
              onChange={(value) => setFormState((current) => ({ ...current, purchase_id: String(value) }))}
              placeholder={avatarPurchases.length ? 'Select purchase' : 'No avatar purchases available'}
              disabled={avatarPurchases.length === 0}
            />
          ) : null}

          <Select
            label="Avatar"
            options={avatars.map((avatar) => ({
              value: avatar.id,
              label: avatar.avatar_name || `Avatar ${avatar.id}`,
            }))}
            value={formState.avatar_id}
            onChange={(value) => setFormState((current) => ({ ...current, avatar_id: String(value) }))}
            placeholder="Select avatar"
            disabled={formState.source_type === 'purchase' && Boolean(formState.purchase_id)}
          />

          <Input
            label="Valid Until"
            type="datetime-local"
            value={formState.valid_until}
            onChange={(event) => setFormState((current) => ({ ...current, valid_until: event.target.value }))}
            placeholder="Leave empty for no expiry"
            hint="Optional. Leave empty if the entitlement should stay open-ended."
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAssignOpen(false);
                setFormState(DEFAULT_FORM);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>Assign Avatar</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(entitlementToDelete)}
        onClose={() => setEntitlementToDelete(null)}
        title="Remove Entitlement"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            {entitlementToDelete
              ? `Remove avatar entitlement for Avatar #${entitlementToDelete.avatar_id}? This only removes the organization assignment.`
              : 'Are you sure?'}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEntitlementToDelete(null)}>Cancel</Button>
            <Button variant="danger" isLoading={isSaving} onClick={handleRemove}>Remove</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
