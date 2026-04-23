'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BadgePlus, Building2, Eye, Globe, Mail, MapPin, Palette, Pencil, Sparkles, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import RichTextEditor from '@/components/ui/RichTextEditor';
import Textarea from '@/components/ui/Textarea';
import { useOrganizations } from '@/context/OrganizationsContext';
import { useToast } from '@/context/ToastContext';
import organizationService from '@/services/organizationService';
import type { OrganizationItem } from '@/types/organization';

const PAGE_LIMIT = 20;

type EditState = {
  name: string;
  industry: string;
  website: string;
  logo_url: string;
  theme_color: string;
  address: string;
  description: string;
};

const buildEditState = (item: OrganizationItem): EditState => ({
  name: item.name || '',
  industry: item.industry || '',
  website: item.website || '',
  logo_url: item.logo_url || '',
  theme_color: item.theme_color || '#2563eb',
  address: item.address || '',
  description: item.description || '',
});

export default function OrganizationsListPage() {
  const { items, loading, saving, error, fetchOrganizations, updateOrganization, deleteOrganization } = useOrganizations();
  const { showToast } = useToast();

  const [skip, setSkip] = useState(0);
  const [selected, setSelected] = useState<OrganizationItem | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [availableOrganizationsCount, setAvailableOrganizationsCount] = useState<number | null>(null);

  const loadOrganizations = useCallback(async (nextSkip: number) => {
    await fetchOrganizations({ limit: PAGE_LIMIT, skip: nextSkip });
  }, [fetchOrganizations]);

  useEffect(() => {
    loadOrganizations(skip).catch((err: any) => {
      if (err?.cancelled) return;
      showToast(err?.message || 'Unable to load organizations.', 'error');
    });
  }, [loadOrganizations, skip, showToast]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error, showToast]);

  useEffect(() => {
    organizationService
      .listOrganizations({ limit: 1000, skip: 0 })
      .then((result) => setAvailableOrganizationsCount(result.length))
      .catch(() => setAvailableOrganizationsCount(null));
  }, []);

  const hasNextPage = items.length === PAGE_LIMIT;

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => {
      const aTime = a.created_at ? Date.parse(a.created_at) : 0;
      const bTime = b.created_at ? Date.parse(b.created_at) : 0;
      if (aTime !== bTime) return bTime - aTime;
      return b.id - a.id;
    }),
    [items]
  );

  const openEdit = (item: OrganizationItem) => {
    setSelected(item);
    setEditState(buildEditState(item));
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setSelected(null);
    setEditState(null);
  };

  const isValidHttpUrl = (value: string) => /^https?:\/\//i.test(value);

  const handleUpdate = async () => {
    if (!selected || !editState) return;
    if (!editState.name.trim()) {
      showToast('Organization name is required.', 'error');
      return;
    }
    if (editState.website.trim() && !isValidHttpUrl(editState.website.trim())) {
      showToast('Website URL must start with http:// or https://', 'error');
      return;
    }
    if (editState.logo_url.trim() && !isValidHttpUrl(editState.logo_url.trim())) {
      showToast('Logo URL must start with http:// or https://', 'error');
      return;
    }

    try {
      await updateOrganization(selected.id, {
        name: editState.name.trim(),
        industry: editState.industry.trim() || null,
        website: editState.website.trim() || null,
        logo_url: editState.logo_url.trim() || null,
        theme_color: editState.theme_color.trim() || null,
        address: editState.address.trim() || null,
        description: editState.description.trim() || null,
      });
      showToast('Organization updated successfully.', 'success');
      closeEdit();
      await loadOrganizations(skip);
    } catch (err: any) {
      showToast(err?.message || 'Unable to update organization.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteOrganization(selected.id);
      showToast('Organization deleted successfully.', 'success');
      setIsDeleteOpen(false);
      setSelected(null);
      await loadOrganizations(0);
      setSkip(0);
    } catch (err: any) {
      showToast(err?.message || 'Unable to delete organization.', 'error');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-600">Organizations</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-slate-900">Organizations List</h1>
            <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Organizations available: {availableOrganizationsCount ?? sortedItems.length}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">Live data from API with stable loading and pagination.</p>
        </div>
        <Link href="/organizations/create">
          <Button className="gap-2 rounded-2xl">
            <BadgePlus size={16} />
            Create Organization
          </Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {error && sortedItems.length > 0 ? (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs font-medium text-amber-800">
            Showing latest available organizations. Live refresh failed: {error}
          </div>
        ) : null}
        <div className="hidden grid-cols-[1.5fr_1fr_0.8fr_1fr] gap-4 border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 md:grid">
          <span>Organization</span>
          <span>Industry</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        {error && sortedItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button className="mt-4" variant="outline" onClick={() => loadOrganizations(skip)}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">Loading organizations...</div>
        ) : sortedItems.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">No organizations found.</div>
        ) : (
          sortedItems.map((item) => {
            const isActive = item.status === 1 || String(item.status).toLowerCase() === 'active';
            return (
              <div key={item.id} className="grid gap-4 border-b border-slate-100 px-5 py-4 text-sm text-slate-700 last:border-b-0 md:grid-cols-[1.5fr_1fr_0.8fr_1fr]">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl text-white"
                    style={{ backgroundColor: item.theme_color || '#2563eb' }}
                  >
                    {item.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.logo_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <Building2 size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{item.name}</p>
                    <p className="truncate text-xs text-slate-500">{item.website || 'No website'}</p>
                  </div>
                </div>
                <div className="text-slate-600 md:text-slate-700">{item.industry || 'Not specified'}</div>
                <div className="md:self-center">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] ${isActive ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-start gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(item);
                      setIsViewOpen(true);
                    }}
                    className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                    aria-label={`View ${item.name}`}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-xl border border-slate-200 p-2 text-blue-600 transition hover:bg-blue-50"
                    aria-label={`Edit ${item.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(item);
                      setIsDeleteOpen(true);
                    }}
                    className="rounded-xl border border-slate-200 p-2 text-red-600 transition hover:bg-red-50"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          disabled={loading || skip === 0}
          onClick={() => setSkip((current) => Math.max(0, current - PAGE_LIMIT))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={loading || !hasNextPage}
          onClick={() => setSkip((current) => current + PAGE_LIMIT)}
        >
          Next
        </Button>
      </div>

      <Modal
        isOpen={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelected(null);
        }}
        title="Organization Overview"
        size="xl"
      >
        {selected ? (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white shadow-xl">
              <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-lg"
                    style={{ backgroundColor: selected.theme_color || '#2563eb' }}
                  >
                    {selected.logo_url ? (
                      <img src={selected.logo_url} alt={selected.name} className="h-full w-full object-cover" />
                    ) : (
                      <Building2 size={26} />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100">
                      <Sparkles size={14} />
                      Organization Profile
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold tracking-tight">{selected.name}</h3>
                      <p className="mt-1 text-sm text-blue-100/85">{selected.industry || 'Industry not added yet'}</p>
                    </div>
                  </div>
                </div>
                <div className="inline-flex self-start rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90">
                  {selected.status === 1 || String(selected.status).toLowerCase() === 'active' ? 'Active' : 'Inactive'}
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Globe size={16} className="text-blue-600" />
                  Website
                </div>
                <p className="break-words text-sm text-slate-600">{selected.website || 'Not added yet'}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Mail size={16} className="text-blue-600" />
                  Contact Email
                </div>
                <p className="break-words text-sm text-slate-600">{selected.email || 'Not added yet'}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5 md:col-span-2">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <MapPin size={16} className="text-blue-600" />
                  Address
                </div>
                <p className="text-sm leading-6 text-slate-600">{selected.address || 'Not added yet'}</p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Description</h4>
              <div className="prose prose-sm mt-4 max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: selected.description || '<p>No description added yet.</p>' }} />
            </section>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={isEditOpen}
        onClose={closeEdit}
        title="Edit Organization"
        size="lg"
      >
        {editState ? (
          <div className="space-y-4">
            <Input label="Organization Name" required value={editState.name} placeholder="Enter the organization name" onChange={(e) => setEditState((s) => (s ? { ...s, name: e.target.value } : s))} />
            <Input label="Industry" value={editState.industry} placeholder="For example: Education, Healthcare, IT" onChange={(e) => setEditState((s) => (s ? { ...s, industry: e.target.value } : s))} />
            <Input
              label="Website URL"
              value={editState.website}
              placeholder="Paste the official website link"
              hint="Must start with http:// or https://"
              onChange={(e) => setEditState((s) => (s ? { ...s, website: e.target.value } : s))}
            />
            <Input
              label="Logo URL"
              value={editState.logo_url}
              placeholder="Paste the logo image link"
              hint="Must start with http:// or https://"
              onChange={(e) => setEditState((s) => (s ? { ...s, logo_url: e.target.value } : s))}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium tracking-tight text-slate-700">Theme Color</label>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm shadow-slate-200/60">
                <Palette className="h-4 w-4 text-slate-400" />
                <input
                  type="color"
                  value={editState.theme_color}
                  onChange={(e) => setEditState((s) => (s ? { ...s, theme_color: e.target.value } : s))}
                  className="h-9 w-14 rounded border-0 p-0"
                />
                <Input
                  value={editState.theme_color}
                  placeholder="Choose a brand color"
                  onChange={(e) => setEditState((s) => (s ? { ...s, theme_color: e.target.value } : s))}
                  className="border-0 bg-transparent p-0 shadow-none focus:ring-0"
                />
              </div>
            </div>
            <Textarea label="Address" value={editState.address} placeholder="Enter the office or billing address" onChange={(e) => setEditState((s) => (s ? { ...s, address: e.target.value } : s))} />
            <RichTextEditor
              label="Description"
              value={editState.description}
              placeholder="Write a short summary about what this organization does."
              onChange={(value) => setEditState((s) => (s ? { ...s, description: value } : s))}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={closeEdit}>Cancel</Button>
              <Button isLoading={saving} onClick={handleUpdate}>Save Changes</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelected(null);
        }}
        title="Delete Organization"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            {selected ? `Delete ${selected.name}? This is a soft delete action.` : 'Are you sure?'}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" isLoading={saving} onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
