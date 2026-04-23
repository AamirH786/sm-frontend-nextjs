'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { actionsService, Action } from '@/services/rbacService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/context/ToastContext';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';
import usePermission from '@/hooks/usePermission';
import AccessDenied from '@/components/permissions/AccessDenied';

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ActionsPage() {
  const { showToast } = useToast();
  const { can } = usePermission();
  const [showFilters, setShowFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Action | null>(null);

  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const canView = can('actions', 'view');
  const canCreate = can('actions', 'create');
  const canUpdate = can('actions', 'update');
  const canDelete = can('actions', 'delete');

  const reloadTable = () => setRefreshKey((k) => k + 1);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm();

  useEffect(() => {
    reloadTable();
  }, [filters.status]);

  const handleOpenCreate = () => {
    setEditing(null);
    reset({ title: '', status: 1 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (row: Action) => {
    setEditing(row);
    reset({ title: row.title, status: row.status });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this action?')) return;
    try {
      await actionsService.delete(id);
      showToast('Action deleted', 'success');
      reloadTable();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = { ...data, status: Number(data.status) };
      if (editing) {
        await actionsService.update(editing.id, payload);
        showToast('Action updated successfully', 'success');
      } else {
        await actionsService.create(payload);
        showToast('Action created successfully', 'success');
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
    if (filters.status !== '') params.status = Number(filters.status);
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;

    const res = await actionsService.list(params);
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

  if (!canView) {
    return (
      <AccessDenied
        title="Actions unavailable"
        description="Your role does not have permission to view actions."
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">Actions</h2>
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
          {canCreate && (
            <Button onClick={handleOpenCreate}>
              <Plus size={18} className="mr-2" /> Add Action
            </Button>
          )}
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
              { key: 'title', label: 'Action Name' },
              { key: 'slug', label: 'Slug' },
              {
                key: 'status',
                label: 'Status',
                render: (r: Action) =>
                  r.status === 1 ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-red-600 font-medium">Inactive</span>
                  ),
              },
              {
                key: 'created_at',
                label: 'Created',
                render: (r: Action) => formatDateTime(r.created_at),
              },
            ]}
            fetchData={fetchTable}
            showAnalytics
            actions={
              canUpdate || canDelete
                ? (row: Action) => (
                    <div className="flex justify-end gap-2">
                      {canUpdate && (
                        <Tooltip text="Edit">
                          <button onClick={() => handleOpenEdit(row)} className="p-1.5 hover:bg-gray-100 rounded">
                            <Edit size={16} />
                          </button>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip text="Delete">
                          <button onClick={() => handleDelete(row.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={16} />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  )
                : undefined
            }
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditing(null); reset(); }}
        title={editing ? 'Edit Action' : 'Add Action'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Title"
            {...register('title', { required: 'Title is required' })}
            error={errors.title?.message}
            required
          />
          <Controller
            name="status"
            control={control}
            defaultValue={1}
            render={({ field }) => (
              <Select
                label="Status"
                value={field.value}
                options={[
                  { value: 1, label: 'Active' },
                  { value: 0, label: 'Inactive' },
                ]}
                onChange={field.onChange}
              />
            )}
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
