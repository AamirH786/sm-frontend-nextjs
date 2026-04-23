'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { emotionsService, getMasterAvatarAssignmentCount, isMasterAssignedToAvatar, Master } from '@/services/mastersService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/context/ToastContext';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function EmotionsPage() {
  const { showToast } = useToast();
  const [showFilters, setShowFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Master | null>(null);

  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });

  const reloadTable = () => setRefreshKey((k) => k + 1);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    reloadTable();
  }, [filters.status]);

  const handleOpenCreate = () => {
    setEditing(null);
    reset({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (row: Master) => {
    setEditing(row);
    reset({ name: row.name, description: row.description || '' });
    setIsModalOpen(true);
  };

  const handleToggle = async (row: Master) => {
    if (isMasterAssignedToAvatar(row as Master & Record<string, unknown>)) {
      showToast('Assigned emotions cannot be deactivated while linked to an avatar.', 'error');
      return;
    }

    try {
      await emotionsService.toggle(row.id);
      showToast(`Status ${row.is_active ? 'deactivated' : 'activated'}`, 'success');
      reloadTable();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (row: Master) => {
    if (isMasterAssignedToAvatar(row as Master & Record<string, unknown>)) {
      showToast('Assigned emotions cannot be deleted while linked to an avatar.', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this emotion?')) return;
    try {
      await emotionsService.delete(row.id);
      showToast('Emotion deleted', 'success');
      reloadTable();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (editing) {
        await emotionsService.update(editing.id, data);
        showToast('Emotion updated successfully', 'success');
      } else {
        await emotionsService.create(data);
        showToast('Emotion created successfully', 'success');
      }
      setIsModalOpen(false);
      reset();
      reloadTable();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const fetchTable = async ({ page, limit, search, sortBy, sortOrder }: any) => {
    const params: any = { page, limit };
    if (search) params.search = search;
    if (filters.status !== '') params.is_active = filters.status === '1';
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;

    const res = await emotionsService.list(params);
    return {
      data: res.data,
      pagination: {
        page: res.meta.page,
        limit: res.meta.limit,
        total: res.meta.total,
        totalPages: res.meta.totalPages,
      },
    };
  };

  const isFilterApplied = filters.status !== '' || filters.search.trim() !== '';

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">Emotions</h2>
        <div className="flex gap-3">
          {isFilterApplied && (
            <Button
              variant="outline"
              onClick={() => setFilters({ status: '', search: '' })}
              className="flex items-center gap-2 border border-red-300/60 text-red-600 hover:bg-red-50 rounded-lg px-3 py-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Reset Filters
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowFilters((p) => !p)}
            className="flex items-center gap-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg px-4 py-2 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12 10 19 14 21 14 12 22 3" />
            </svg>
            Filters
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus size={18} className="mr-2" /> Add Emotion
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Select
            label="Filter by Status"
            value={filters.status}
            options={[
              { value: '', label: 'All' },
              { value: '1', label: 'Active' },
              { value: '0', label: 'Inactive' },
            ]}
            onChange={(val) => setFilters((prev) => ({ ...prev, status: String(val) }))}
          />
        </div>
      )}

      <Card>
        <CardContent>
          <AdvancedDataTable
            refreshTrigger={refreshKey}
            externalSearch={filters.search}
            onSearchChange={(val) => setFilters((prev) => ({ ...prev, search: val }))}
            columns={[
              { key: 'name', label: 'Title' },
              { key: 'description', label: 'Description', render: (r: Master) => r.description || '-' },
              {
                key: 'is_active',
                label: 'Status',
                render: (r: Master) =>
                  r.is_active ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-red-600 font-medium">Inactive</span>
                  ),
              },
              {
                key: 'created_at',
                label: 'Created',
                render: (r: Master) => formatDateTime(r.created_at),
              },
            ]}
            fetchData={fetchTable}
            showAnalytics
            actions={(row: Master) => (
              <div className="flex justify-end gap-2">
                <Tooltip text="Edit">
                  <button onClick={() => handleOpenEdit(row)} className="p-1.5 hover:bg-gray-100 rounded">
                    <Edit size={16} />
                  </button>
                </Tooltip>
                <Tooltip text={isMasterAssignedToAvatar(row as Master & Record<string, unknown>) ? `Assigned to ${getMasterAvatarAssignmentCount(row as Master & Record<string, unknown>)} avatar(s)` : row.is_active ? 'Deactivate' : 'Activate'}>
                  <button onClick={() => handleToggle(row)} disabled={isMasterAssignedToAvatar(row as Master & Record<string, unknown>)} className="p-1.5 hover:bg-gray-100 rounded disabled:cursor-not-allowed disabled:opacity-50">
                    {row.is_active ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} className="text-gray-400" />}
                  </button>
                </Tooltip>
                <Tooltip text={isMasterAssignedToAvatar(row as Master & Record<string, unknown>) ? `Assigned to ${getMasterAvatarAssignmentCount(row as Master & Record<string, unknown>)} avatar(s)` : 'Delete'}>
                  <button onClick={() => handleDelete(row)} disabled={isMasterAssignedToAvatar(row as Master & Record<string, unknown>)} className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:cursor-not-allowed disabled:opacity-50">
                    <Trash2 size={16} />
                  </button>
                </Tooltip>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditing(null); reset(); }}
        title={editing ? 'Edit Emotion' : 'Add Emotion'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Title"
            {...register('name', { required: 'Title is required' })}
            error={errors.name?.message}
            required
          />
          <Input
            label="Description"
            {...register('description', { required: 'Description is required' })}
            error={errors.description?.message}
            placeholder="Enter description"
            required
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
