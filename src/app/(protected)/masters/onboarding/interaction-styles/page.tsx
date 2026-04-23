'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/context/ToastContext';
import { interactionStylesService, OnboardingMaster } from '@/services/onboardingService';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { Plus, Eye, Edit, Trash2, MessageCircle } from 'lucide-react';
import { isValidMasterKey, slugifyMasterKey } from '@/lib/utils';

interface FormValues {
  key: string;
  label: string;
  description: string;
}

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function InteractionStylesPage() {
  const { showToast } = useToast();
  const [viewItem, setViewItem] = useState<OnboardingMaster | null>(null);
  const [editItem, setEditItem] = useState<OnboardingMaster | null>(null);
  const [deleteItem, setDeleteItem] = useState<OnboardingMaster | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isKeyManuallyEdited, setIsKeyManuallyEdited] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormValues>();

  const normalizePayload = (data: FormValues) => ({
    ...data,
    label: data.label.trim(),
    key: slugifyMasterKey(data.key || data.label),
    description: data.description.trim(),
  });

  const fetchData = useCallback(async (params: { page: number; limit: number; search: string }) => {
    try {
      const response = await interactionStylesService.list({
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
      });
      return {
        data: response.data,
        pagination: {
          page: response.page,
          limit: response.limit,
          total: response.total,
          totalPages: Math.ceil(response.total / response.limit),
        },
      };
    } catch (err: any) {
      showToast(err.message || 'Failed to load interaction styles', 'error');
      return {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      };
    }
  }, [showToast]);

  const handleToggleStatus = async (item: OnboardingMaster) => {
    try {
      await interactionStylesService.toggleStatus(item.id);
      showToast('Status updated successfully', 'success');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const onSubmitAdd = async (data: FormValues) => {
    try {
      setSaving(true);
      await interactionStylesService.create(normalizePayload(data));
      showToast('Interaction style created successfully', 'success');
      setShowAddModal(false);
      reset();
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to create interaction style', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onSubmitEdit = async (data: FormValues) => {
    if (!editItem) return;
    try {
      setSaving(true);
      await interactionStylesService.update(editItem.id, normalizePayload(data));
      showToast('Interaction style updated successfully', 'success');
      setEditItem(null);
      reset();
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to update interaction style', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      setDeleting(true);
      await interactionStylesService.delete(deleteItem.id);
      showToast('Interaction style deleted successfully', 'success');
      setDeleteItem(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete interaction style', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (item: OnboardingMaster) => {
    setEditItem(item);
    setIsKeyManuallyEdited(true);
    reset({ key: item.key, label: item.label, description: item.description || '' });
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'key', label: 'Key' },
    { key: 'label', label: 'Label' },
    { key: 'description', label: 'Description', render: (row: OnboardingMaster) => row.description || '-' },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: OnboardingMaster) => (
        <button
          onClick={() => handleToggleStatus(row)}
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    { key: 'created_at', label: 'Created', render: (row: OnboardingMaster) => formatDateTime(row.created_at) },
    { key: 'updated_at', label: 'Updated', render: (row: OnboardingMaster) => formatDateTime(row.updated_at) },
  ];

  const actions = (row: OnboardingMaster) => (
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Interaction Styles</h1>
            <p className="text-sm text-gray-500">Manage interaction styles for onboarding</p>
          </div>
        </div>
        <Button onClick={() => { setShowAddModal(true); setIsKeyManuallyEdited(false); reset({ key: '', label: '', description: '' }); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Interaction Style
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

      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setIsKeyManuallyEdited(false); }} title="Add Interaction Style">
        <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-4">
          <Input
            label="Key"
            {...register('key', {
              required: 'Key is required',
              validate: (value) => isValidMasterKey(slugifyMasterKey(value)) || 'Use lowercase letters, numbers, hyphen or underscore only',
            })}
            error={errors.key?.message}
            placeholder="e.g., direct-communication"
            hint="Auto-generated from Label. Allowed: lowercase letters, numbers, hyphen, underscore."
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
                  const nextSlug = slugifyMasterKey(event.target.value);
                  setValue('key', nextSlug, { shouldValidate: true });
                }
              },
            })}
            error={errors.label?.message}
            placeholder="e.g., Direct Communication"
            required
          />
          <Input label="Description" {...register('description')} error={errors.description?.message} placeholder="Optional description" />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); setIsKeyManuallyEdited(false); }}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editItem} onClose={() => { setEditItem(null); setIsKeyManuallyEdited(false); }} title="Edit Interaction Style">
        <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
          <Input
            label="Key"
            {...register('key', {
              required: 'Key is required',
              validate: (value) => isValidMasterKey(slugifyMasterKey(value)) || 'Use lowercase letters, numbers, hyphen or underscore only',
            })}
            error={errors.key?.message}
            hint="Auto-generated from Label. Allowed: lowercase letters, numbers, hyphen, underscore."
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
                  const nextSlug = slugifyMasterKey(event.target.value);
                  setValue('key', nextSlug, { shouldValidate: true });
                }
              },
            })}
            error={errors.label?.message}
            required
          />
          <Input label="Description" {...register('description')} error={errors.description?.message} placeholder="Optional description" />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setEditItem(null); setIsKeyManuallyEdited(false); }}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Update'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title="View Interaction Style">
        {viewItem && (
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-gray-500">ID</label><p className="text-gray-900">{viewItem.id}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Key</label><p className="text-gray-900">{viewItem.key}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Label</label><p className="text-gray-900">{viewItem.label}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Description</label><p className="text-gray-900">{viewItem.description || '-'}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Status</label><p><span className={`px-2 py-1 rounded-full text-xs font-medium ${viewItem.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{viewItem.is_active ? 'Active' : 'Inactive'}</span></p></div>
            <div><label className="text-sm font-medium text-gray-500">Created</label><p className="text-gray-900">{formatDateTime(viewItem.created_at)}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Updated</label><p className="text-gray-900">{formatDateTime(viewItem.updated_at)}</p></div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Delete Interaction Style">
        <div className="space-y-4">
          <p className="text-gray-600">Are you sure you want to delete <strong>{deleteItem?.label}</strong>? This action cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
