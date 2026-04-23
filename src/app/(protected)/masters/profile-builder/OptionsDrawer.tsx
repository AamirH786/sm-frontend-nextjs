'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { createPortal } from 'react-dom';
import { useToast } from '@/context/ToastContext';
import { optionsService, ProfileCategory, ProfileOption } from '@/services/profileBuilderService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { X, Plus, Eye, Edit, Trash2, ListTree } from 'lucide-react';
import { isValidMasterKey, slugifyMasterKey } from '@/lib/utils';

interface FormValues {
  key: string;
  label: string;
  description: string;
  sort_order: number;
}

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

interface OptionsDrawerProps {
  category: ProfileCategory | null;
  onClose: () => void;
}

export default function OptionsDrawer({ category, onClose }: OptionsDrawerProps) {
  const open = !!category;
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);
  const closeTimerRef = useRef<number | null>(null);

  const { showToast } = useToast();
  const [viewItem, setViewItem] = useState<ProfileOption | null>(null);
  const [editItem, setEditItem] = useState<ProfileOption | null>(null);
  const [deleteItem, setDeleteItem] = useState<ProfileOption | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: { key: '', label: '', description: '', sort_order: 0 },
  });

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      setRefreshTrigger(prev => prev + 1);
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setIsVisible(false);
    closeTimerRef.current = window.setTimeout(() => setIsMounted(false), 220);
    return () => { if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current); };
  }, [open]);

  useEffect(() => {
    if (!isMounted) return;
    const onEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [isMounted, onClose]);

  const categoryId = category?.id ?? 0;

  const fetchData = useCallback(async (params: { page: number; limit: number; search: string }) => {
    if (!categoryId) return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };
    try {
      const response = await optionsService.list(categoryId, {
        page: params.page, limit: params.limit, search: params.search || undefined,
      });
      return {
        data: response.data,
        pagination: { page: response.page, limit: response.limit, total: response.total, totalPages: Math.ceil(response.total / response.limit) },
      };
    } catch (err: any) {
      showToast(err.message || 'Failed to load options', 'error');
      return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };
    }
  }, [categoryId, showToast]);

  const handleToggleStatus = async (item: ProfileOption) => {
    try {
      await optionsService.toggleStatus(categoryId, item.id);
      showToast('Status updated', 'success');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const onSubmitAdd = async (data: FormValues) => {
    try {
      setSaving(true);
      await optionsService.create(categoryId, {
        key: slugifyMasterKey(data.key || data.label),
        label: data.label.trim(),
        description: data.description.trim(),
        sort_order: Number(data.sort_order),
      });
      showToast('Option created', 'success');
      setShowAddModal(false);
      reset();
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to create option', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onSubmitEdit = async (data: FormValues) => {
    if (!editItem) return;
    try {
      setSaving(true);
      await optionsService.update(categoryId, editItem.id, {
        label: data.label.trim(),
        description: data.description.trim(),
        sort_order: Number(data.sort_order),
      });
      showToast('Option updated', 'success');
      setEditItem(null);
      reset();
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to update option', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      setDeleting(true);
      await optionsService.delete(categoryId, deleteItem.id);
      showToast('Option deleted', 'success');
      setDeleteItem(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete option', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (item: ProfileOption) => {
    setEditItem(item);
    setIsKeyManuallyEdited(true);
    reset({ key: item.key, label: item.label, description: item.description || '', sort_order: item.sort_order });
  };

  const columns = [
    { key: 'sort_order', label: 'Order' },
    { key: 'key', label: 'Key' },
    { key: 'label', label: 'Label' },
    { key: 'description', label: 'Description', render: (row: ProfileOption) => row.description || '-' },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: ProfileOption) => (
        <button
          onClick={() => handleToggleStatus(row)}
          className={`px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    { key: 'created_at', label: 'Created', render: (row: ProfileOption) => formatDateTime(row.created_at) },
  ];

  const actions = (row: ProfileOption) => (
    <div className="flex items-center gap-2 justify-end">
      <button onClick={() => setViewItem(row)} className="p-1 text-gray-500 hover:text-blue-600" title="View">
        <Eye className="w-4 h-4" />
      </button>
      <button onClick={() => openEditModal(row)} className="p-1 text-gray-500 hover:text-blue-600" title="Edit">
        <Edit className="w-4 h-4" />
      </button>
      <button onClick={() => setDeleteItem(row)} className="p-1 text-gray-500 hover:text-red-600" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[130]">
      <button
        type="button"
        aria-label="Close drawer"
        className={`absolute inset-0 bg-slate-950/18 backdrop-blur-[2px] transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-[780px] flex flex-col border-l border-slate-200/80 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.18)] transition-transform duration-200 ease-out ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(255,255,255,0.96)_100%)] px-6 py-5 backdrop-blur">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <ListTree className="w-6 h-6 text-indigo-600" />
              <div>
                <div className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700 mb-1">
                  Manage Options
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">{category?.label}</h2>
                {category?.description && (
                  <p className="text-sm text-slate-500">{category.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => { setShowAddModal(true); setIsKeyManuallyEdited(false); reset({ key: '', label: '', description: '', sort_order: 0 }); }}
                className="h-9"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Option
              </Button>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 shadow-sm transition-all duration-200 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-2"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <AdvancedDataTable
            columns={columns}
            fetchData={fetchData}
            actions={actions}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </aside>

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setIsKeyManuallyEdited(false); }} title="Add Option">
        <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-4">
          <Input
            label="Key"
            {...register('key', {
              required: 'Key is required',
              validate: (value) => isValidMasterKey(slugifyMasterKey(value)) || 'Lowercase letters, numbers, hyphen or underscore only',
            })}
            error={errors.key?.message}
            placeholder="e.g., career"
            hint="Auto-generated from Label."
            onChange={(event) => {
              setIsKeyManuallyEdited(true);
              setValue('key', slugifyMasterKey(event.target.value), { shouldValidate: true });
            }}
            required
          />
          <Input
            label="Label"
            {...register('label', {
              required: 'Label is required',
              onChange: (event) => {
                if (!isKeyManuallyEdited) {
                  setValue('key', slugifyMasterKey(event.target.value), { shouldValidate: true });
                }
              },
            })}
            error={errors.label?.message}
            placeholder="e.g., Career Growth"
            required
          />
          <Input label="Description" {...register('description')} placeholder="Optional description" />
          <Input label="Sort Order" type="number" {...register('sort_order')} placeholder="0" />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setIsKeyManuallyEdited(false); }}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editItem} onClose={() => { setEditItem(null); setIsKeyManuallyEdited(false); }} title="Edit Option">
        <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
          <Input label="Key" {...register('key')} disabled hint="Key cannot be changed after creation" />
          <Input label="Label" {...register('label', { required: 'Label is required' })} error={errors.label?.message} required />
          <Input label="Description" {...register('description')} />
          <Input label="Sort Order" type="number" {...register('sort_order')} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setEditItem(null); setIsKeyManuallyEdited(false); }}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Update'}</Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title="Option Details">
        {viewItem && (
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-gray-500">ID</label><p className="text-gray-900">{viewItem.id}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Key</label><p className="text-gray-900">{viewItem.key}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Label</label><p className="text-gray-900">{viewItem.label}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Description</label><p className="text-gray-900">{viewItem.description || '-'}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Sort Order</label><p className="text-gray-900">{viewItem.sort_order}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Status</label><p><span className={`px-2 py-1 rounded-full text-xs font-medium ${viewItem.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{viewItem.is_active ? 'Active' : 'Inactive'}</span></p></div>
            <div><label className="text-sm font-medium text-gray-500">Created</label><p className="text-gray-900">{formatDateTime(viewItem.created_at)}</p></div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Delete Option">
        <div className="space-y-4">
          <p className="text-gray-600">Are you sure you want to delete <strong>{deleteItem?.label}</strong>? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
          </div>
        </div>
      </Modal>
    </div>,
    document.body
  );
}
