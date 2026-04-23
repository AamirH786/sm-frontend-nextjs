'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';
import { optionsService, categoriesService, ProfileOption, ProfileCategory } from '@/services/profileBuilderService';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { Plus, Eye, Edit, Trash2, ArrowLeft, ListTree } from 'lucide-react';
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

export default function CategoryOptionsPage() {
  const params = useParams();
  const categoryId = Number(params.id);
  const { showToast } = useToast();
  const [category, setCategory] = useState<ProfileCategory | null>(null);
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
    categoriesService.getById(categoryId)
      .then(setCategory)
      .catch(() => setCategory(null));
  }, [categoryId]);

  const fetchData = useCallback(async (params: { page: number; limit: number; search: string }) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/masters/profile-builder">
          <button className="p-1 text-gray-500 hover:text-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <span className="text-sm text-gray-500">Profile Setup</span>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-700">{category?.label ?? `Category #${categoryId}`}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListTree className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {category?.label ?? 'Options'}
            </h1>
            <p className="text-sm text-gray-500">
              {category?.description || 'Manage the selectable options for this question'}
            </p>
          </div>
        </div>
        <Button onClick={() => { setShowAddModal(true); setIsKeyManuallyEdited(false); reset({ key: '', label: '', description: '', sort_order: 0 }); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Option
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <AdvancedDataTable
            columns={columns}
            fetchData={fetchData}
            actions={actions}
            refreshTrigger={refreshTrigger}
          />
        </CardContent>
      </Card>

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
    </div>
  );
}
