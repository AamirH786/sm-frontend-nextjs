'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/context/ToastContext';
import { supportTypesService, OnboardingMaster } from '@/services/onboardingService';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { Plus, Eye, Edit, Trash2, HandHelping } from 'lucide-react';

interface FormValues {
  key: string;
  label: string;
}

export default function SupportTypesPage() {
  const { showToast } = useToast();
  const [viewItem, setViewItem] = useState<OnboardingMaster | null>(null);
  const [editItem, setEditItem] = useState<OnboardingMaster | null>(null);
  const [deleteItem, setDeleteItem] = useState<OnboardingMaster | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  const fetchData = useCallback(async (params: { page: number; limit: number; search: string }) => {
    try {
      const response = await supportTypesService.list({
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
      showToast(err.message || 'Failed to load support types', 'error');
      return {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      };
    }
  }, [showToast]);

  const handleToggleStatus = async (item: OnboardingMaster) => {
    try {
      await supportTypesService.toggleStatus(item.id);
      showToast('Status updated successfully', 'success');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const onSubmitAdd = async (data: FormValues) => {
    try {
      setSaving(true);
      await supportTypesService.create(data);
      showToast('Support type created successfully', 'success');
      setShowAddModal(false);
      reset();
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to create support type', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onSubmitEdit = async (data: FormValues) => {
    if (!editItem) return;
    try {
      setSaving(true);
      await supportTypesService.update(editItem.id, data);
      showToast('Support type updated successfully', 'success');
      setEditItem(null);
      reset();
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to update support type', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      setDeleting(true);
      await supportTypesService.delete(deleteItem.id);
      showToast('Support type deleted successfully', 'success');
      setDeleteItem(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete support type', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (item: OnboardingMaster) => {
    setEditItem(item);
    reset({ key: item.key, label: item.label });
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'key', label: 'Key' },
    { key: 'label', label: 'Label' },
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
          <HandHelping className="w-8 h-8 text-green-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Types</h1>
            <p className="text-sm text-gray-500">Manage support types for onboarding</p>
          </div>
        </div>
        <Button onClick={() => { setShowAddModal(true); reset({ key: '', label: '' }); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Support Type
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

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Support Type">
        <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-4">
          <Input label="Key" {...register('key', { required: 'Key is required' })} error={errors.key?.message} placeholder="e.g., emotional_support" required />
          <Input label="Label" {...register('label', { required: 'Label is required' })} error={errors.label?.message} placeholder="e.g., Emotional Support" required />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Edit Support Type">
        <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-4">
          <Input label="Key" {...register('key', { required: 'Key is required' })} error={errors.key?.message} required />
          <Input label="Label" {...register('label', { required: 'Label is required' })} error={errors.label?.message} required />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Update'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!viewItem} onClose={() => setViewItem(null)} title="View Support Type">
        {viewItem && (
          <div className="space-y-4">
            <div><label className="text-sm font-medium text-gray-500">ID</label><p className="text-gray-900">{viewItem.id}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Key</label><p className="text-gray-900">{viewItem.key}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Label</label><p className="text-gray-900">{viewItem.label}</p></div>
            <div><label className="text-sm font-medium text-gray-500">Status</label><p><span className={`px-2 py-1 rounded-full text-xs font-medium ${viewItem.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{viewItem.is_active ? 'Active' : 'Inactive'}</span></p></div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Delete Support Type">
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
