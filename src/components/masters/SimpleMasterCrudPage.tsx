'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Edit, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import AccessDenied from '@/components/permissions/AccessDenied';
import { Card, CardContent } from '@/components/ui/Card';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Tooltip from '@/components/ui/Tooltip';
import useCrudAccess from '@/hooks/useCrudAccess';
import { useToast } from '@/context/ToastContext';
import { Master } from '@/services/mastersService';

type MasterListResponse = {
  data: Master[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type MasterService = {
  list: (params?: Record<string, unknown>) => Promise<MasterListResponse>;
  create: (data: Partial<Master>) => Promise<Master>;
  update: (id: number, data: Partial<Master>) => Promise<Master>;
  toggle: (id: number) => Promise<Master>;
  delete: (id: number) => Promise<void>;
};

type FormValues = {
  name: string;
  description: string;
};

type Props = {
  title: string;
  singularLabel: string;
  moduleSlug: string;
  service: MasterService;
};

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

export default function SimpleMasterCrudPage({
  title,
  singularLabel,
  moduleSlug,
  service,
}: Props) {
  const { showToast } = useToast();
  const { canView, canCreate, canUpdate, canDelete, canToggle } = useCrudAccess(moduleSlug);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Master | null>(null);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  const reloadTable = () => setRefreshKey((key) => key + 1);

  useEffect(() => {
    reloadTable();
  }, [filters.status]);

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const openEdit = (row: Master) => {
    setEditing(row);
    reset({ name: row.name, description: row.description || '' });
    setIsModalOpen(true);
  };

  const handleToggle = async (row: Master) => {
    try {
      await service.toggle(row.id);
      showToast(`${singularLabel} ${row.is_active ? 'deactivated' : 'activated'}`, 'success');
      reloadTable();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err.message || 'Failed to update status', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Are you sure you want to delete this ${singularLabel.toLowerCase()}?`)) return;

    try {
      await service.delete(id);
      showToast(`${singularLabel} deleted`, 'success');
      reloadTable();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err.message || 'Delete failed', 'error');
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      if (editing) {
        await service.update(editing.id, data);
        showToast(`${singularLabel} updated successfully`, 'success');
      } else {
        await service.create(data);
        showToast(`${singularLabel} created successfully`, 'success');
      }
      setIsModalOpen(false);
      setEditing(null);
      reset();
      reloadTable();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || err.message || 'Save failed', 'error');
    }
  };

  const fetchTable = async ({ page, limit, search, sortBy, sortOrder }: any) => {
    const params: Record<string, unknown> = { page, limit };
    if (search) params.search = search;
    if (filters.status !== '') params.is_active = filters.status === '1';
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;

    const response = await service.list(params);
    return {
      data: response.data,
      pagination: {
        page: response.meta.page,
        limit: response.meta.limit,
        total: response.meta.total,
        totalPages: response.meta.totalPages,
      },
    };
  };

  const isFilterApplied = filters.status !== '' || filters.search.trim() !== '';

  if (!canView) {
    return (
      <AccessDenied
        title={`${title} unavailable`}
        description={`Your role does not have permission to view ${title.toLowerCase()}.`}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex gap-3">
          {isFilterApplied && (
            <Button
              variant="outline"
              onClick={() => setFilters({ status: '', search: '' })}
              className="flex items-center gap-2 border border-red-300/60 text-red-600 hover:bg-red-50 rounded-lg px-3 py-2"
            >
              Reset Filters
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowFilters((value) => !value)}
            className="flex items-center gap-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg px-4 py-2 shadow-sm"
          >
            Filters
          </Button>
          {canCreate && (
            <Button onClick={openCreate}>
              <Plus size={18} className="mr-2" /> Add {singularLabel}
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
            onChange={(value) => setFilters((prev) => ({ ...prev, status: String(value) }))}
          />
        </div>
      )}

      <Card>
        <CardContent>
          <AdvancedDataTable
            refreshTrigger={refreshKey}
            externalSearch={filters.search}
            onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
            columns={[
              { key: 'name', label: 'Title' },
              { key: 'description', label: 'Description', render: (row: Master) => row.description || '-' },
              {
                key: 'is_active',
                label: 'Status',
                render: (row: Master) =>
                  row.is_active ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-red-600 font-medium">Inactive</span>
                  ),
              },
              {
                key: 'created_at',
                label: 'Created',
                render: (row: Master) => formatDateTime(row.created_at),
              },
            ]}
            fetchData={fetchTable}
            showAnalytics
            actions={(row: Master) => (
              <div className="flex justify-end gap-2">
                {canUpdate && (
                  <Tooltip text="Edit">
                    <button onClick={() => openEdit(row)} className="p-1.5 hover:bg-gray-100 rounded">
                      <Edit size={16} />
                    </button>
                  </Tooltip>
                )}
                {canToggle && (
                  <Tooltip text={row.is_active ? 'Deactivate' : 'Activate'}>
                    <button onClick={() => handleToggle(row)} className="p-1.5 hover:bg-gray-100 rounded">
                      {row.is_active ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} className="text-gray-400" />}
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
            )}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen && (editing ? canUpdate : canCreate)}
        onClose={() => {
          setIsModalOpen(false);
          setEditing(null);
          reset();
        }}
        title={editing ? `Edit ${singularLabel}` : `Add ${singularLabel}`}
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
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditing(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
