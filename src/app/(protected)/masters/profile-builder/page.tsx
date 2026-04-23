'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/context/ToastContext';
import { categoriesService, ProfileCategory } from '@/services/profileBuilderService';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import OptionsDrawer from './OptionsDrawer';
import { Plus, Eye, Edit, Trash2, Settings2, List } from 'lucide-react';
import { isValidMasterKey, slugifyMasterKey } from '@/lib/utils';

interface FormValues {
  key: string;
  label: string;
  description: string;
  sort_order: number;
  is_multi_select: boolean;
  is_required: boolean;
}

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export default function ProfileBuilderPage() {
  const { showToast } = useToast();
  const [viewItem, setViewItem] = useState<ProfileCategory | null>(null);
  const [editItem, setEditItem] = useState<ProfileCategory | null>(null);
  const [deleteItem, setDeleteItem] = useState<ProfileCategory | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);
  const [manageOptionsCategory, setManageOptionsCategory] = useState<ProfileCategory | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: { key: '', label: '', description: '', sort_order: 0, is_multi_select: true, is_required: true },
  });

  const fetchData = useCallback(async (params: { page: number; limit: number; search: string }) => {
    try {
      const response = await categoriesService.list({
        page: params.page, limit: params.limit, search: params.search || undefined,
      });
      return {
        data: response.data,
        pagination: { page: response.page, limit: response.limit, total: response.total, totalPages: Math.ceil(response.total / response.limit) },
      };
    } catch (err: any) {
      showToast(err.message || 'Failed to load categories', 'error');
      return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } };
    }
  }, [showToast]);

  const handleToggleStatus = async (item: ProfileCategory) => {
    try {
      await categoriesService.toggleStatus(item.id);
      showToast('Status updated', 'success');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const onSubmitAdd = async (data: FormValues) => {
    try {
      setSaving(true);
      await categoriesService.create({
        ...data,
        key: slugifyMasterKey(data.key || data.label),
        label: data.label.trim(),
        description: data.description.trim(),
        sort_order: Number(data.sort_order),
      });
      showToast('Category created', 'success');
      setShowAddModal(false);
      reset();
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to create category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onSubmitEdit = async (data: FormValues) => {
    if (!editItem) return;
    try {
      setSaving(true);
      await categoriesService.update(editItem.id, {
        label: data.label.trim(),
        description: data.description.trim(),
        sort_order: Number(data.sort_order),
        is_multi_select: data.is_multi_select,
        is_required: data.is_required,
      });
      showToast('Category updated', 'success');
      setEditItem(null);
      reset();
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to update category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      setDeleting(true);
      await categoriesService.delete(deleteItem.id);
      showToast('Category deleted', 'success');
      setDeleteItem(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (item: ProfileCategory) => {
    setEditItem(item);
    setIsKeyManuallyEdited(true);
    reset({
      key: item.key,
      label: item.label,
      description: item.description || '',
      sort_order: item.sort_order,
      is_multi_select: item.is_multi_select,
      is_required: item.is_required,
    });
  };

  const columns = [
    { key: 'sort_order', label: 'Order' },
    { key: 'key', label: 'Key' },
    { key: 'label', label: 'Question Label' },
    {
      key: 'is_multi_select',
      label: 'Multi-Select',
      render: (row: ProfileCategory) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.is_multi_select ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
          {row.is_multi_select ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'is_required',
      label: 'Required',
      render: (row: ProfileCategory) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.is_required ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'}`}>
          {row.is_required ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'option_count',
      label: 'Options',
      render: (row: ProfileCategory) => (
        <span className="font-medium text-gray-700">{row.option_count ?? '-'}</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: ProfileCategory) => (
        <button
          onClick={() => handleToggleStatus(row)}
          className={`px-2 py-1 rounded-full text-xs font-medium ${row.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    { key: 'created_at', label: 'Created', render: (row: ProfileCategory) => formatDateTime(row.created_at) },
  ];

  const actions = (row: ProfileCategory) => (
    <div className="flex items-center gap-2 justify-end">
      <button onClick={() => setManageOptionsCategory(row)} className="p-1 text-gray-500 hover:text-indigo-600" title="Manage Options">
        <List className="w-4 h-4" />
      </button>
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile Setup</h1>
            <p className="text-sm text-gray-500">Manage dynamic question categories shown during user profile setup</p>
          </div>
        </div>
        <Button onClick={() => { setShowAddModal(true); setIsKeyManuallyEdited(false); reset({ key: '', label: '', description: '', sort_order: 0, is_multi_select: true, is_required: true }); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Category
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

      {/* Options side drawer */}
      <OptionsDrawer
        category={manageOptionsCategory}
        onClose={() => setManageOptionsCategory(null)}
      />

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setIsKeyManuallyEdited(false); }} title="Add Category">
        <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-4">
          <Input
            label="Key"
            {...register('key', {
              required: 'Key is required',
              validate: (value) => isValidMasterKey(slugifyMasterKey(value)) || 'Use lowercase letters, numbers, hyphen or underscore only',
            })}
            error={errors.key?.message}
            placeholder="e.g., interests"
            hint="Auto-generated from Label. Lowercase, numbers, hyphen, underscore."
            onChange={(event) => {
              setIsKeyManuallyEdited(true);
              setValue('key', slugifyMasterKey(event.target.value), { shouldValidate: true });
            }}
            required
          />
          <Input
            label="Question Label"
            {...register('label', {
              required: 'Label is required',
              onChange: (event) => {
                if (!isKeyManuallyEdited) {
                  setValue('key', slugifyMasterKey(event.target.value), { shouldValidate: true });
                }
              },
            })}
            error={errors.label?.message}
            placeholder="e.g., What interests you?"
            required
          />
          <Input
            label="Description / Subtitle"
            {...register('description')}
            placeholder="e.g., Select all areas you'd like to explore"
          />
          <Input
            label="Sort Order"
            type="number"
            {...register('sort_order')}
            placeholder="0"
          />
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('is_multi_select')} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-gray-700">Allow multiple selections</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('is_required')} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-gray-700">Required</span>
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setIsKeyManuallyEdited(false); }}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editItem} onClose={() => { setEditItem(null); setIsKeyManuallyEdited(false); }} title="Edit Category">
        <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
          <Input
            label="Key"
            {...register('key')}
            disabled
            hint="Key cannot be changed after creation"
          />
          <Input
            label="Question Label"
            {...register('label', { required: 'Label is required' })}
            error={errors.label?.message}
            required
          />
          <Input
            label="Description / Subtitle"
            {...register('description')}
          />
          <Input
            label="Sort Order"
            type="number"
            {...register('sort_order')}
          />
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('is_multi_select')} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-gray-700">Allow multiple selections</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('is_required')} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-gray-700">Required</span>
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setEditItem(null); setIsKeyManuallyEdited(false); }}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Update'}</Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title="Category Details">
        {viewItem && (
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-gray-500">ID</label><p className="text-gray-900">{viewItem.id}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Key</label><p className="text-gray-900">{viewItem.key}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Question Label</label><p className="text-gray-900">{viewItem.label}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Description</label><p className="text-gray-900">{viewItem.description || '-'}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Sort Order</label><p className="text-gray-900">{viewItem.sort_order}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Multi-Select</label><p className="text-gray-900">{viewItem.is_multi_select ? 'Yes' : 'No'}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Required</label><p className="text-gray-900">{viewItem.is_required ? 'Yes' : 'No'}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Status</label><p><span className={`px-2 py-1 rounded-full text-xs font-medium ${viewItem.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{viewItem.is_active ? 'Active' : 'Inactive'}</span></p></div>
            <div><label className="text-sm font-medium text-gray-500">Options Count</label><p className="text-gray-900">{viewItem.option_count ?? '-'}</p></div>
            <div className="pt-2">
              <Button variant="outline" onClick={() => { setViewItem(null); setManageOptionsCategory(viewItem); }}>
                <List className="w-4 h-4 mr-2" /> Manage Options
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Delete Category">
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{deleteItem?.label}</strong>?
            This will also delete all its options and user answers. This cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
