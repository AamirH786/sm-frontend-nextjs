'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { permissionsService, Permission, modulesService, actionsService, Module, Action } from '@/services/rbacService';
import Button from '@/components/ui/Button';
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

export default function PermissionsPage() {
  const { showToast } = useToast();
  const { can } = usePermission();
  const [modules, setModules] = useState<Module[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Permission | null>(null);

  const [filters, setFilters] = useState({
    module_id: '',
    action_id: '',
    status: '',
    search: '',
  });
  const canView = can('permissions', 'view');
  const canCreate = can('permissions', 'create');
  const canUpdate = can('permissions', 'update');
  const canDelete = can('permissions', 'delete');

  const reloadTable = () => setRefreshKey((k) => k + 1);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm();

  useEffect(() => {
    if (canView) {
      loadModules();
      loadActions();
    }
  }, [canView]);

  useEffect(() => {
    reloadTable();
  }, [filters.module_id, filters.action_id, filters.status]);

  const loadModules = async () => {
    try {
      const res = await modulesService.list({ limit: 99 });
      setModules(res.data || []);
    } catch (err: any) {
      console.error('Failed to load modules:', err);
      showToast('Failed to load modules', 'error');
    }
  };

  const loadActions = async () => {
    try {
      const res = await actionsService.list({ limit: 99 });
      setActions(res.data || []);
    } catch (err: any) {
      console.error('Failed to load actions:', err);
      showToast('Failed to load actions', 'error');
    }
  };

  const handleOpenCreate = () => {
    setEditing(null);
    reset({ module_id: '', action_id: '', status: 1 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (row: Permission) => {
    setEditing(row);
    reset({
      module_id: row.module_id || '',
      action_id: row.action_id || '',
      status: row.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this permission?')) return;
    try {
      await permissionsService.delete(id);
      showToast('Permission deleted', 'success');
      reloadTable();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        ...data,
        status: Number(data.status),
        module_id: data.module_id ? Number(data.module_id) : undefined,
        action_id: data.action_id ? Number(data.action_id) : undefined,
      };
      if (editing) {
        await permissionsService.update(editing.id, payload);
        showToast('Permission updated successfully', 'success');
      } else {
        await permissionsService.create(payload);
        showToast('Permission created successfully', 'success');
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
    if (filters.module_id) params.module_id = Number(filters.module_id);
    if (filters.action_id) params.action_id = Number(filters.action_id);
    if (filters.status !== '') params.status = Number(filters.status);
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;

    const res = await permissionsService.list(params);
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

  const isFilterApplied =
    filters.module_id !== '' ||
    filters.action_id !== '' ||
    filters.status !== '' ||
    filters.search.trim() !== '';

  if (!canView) {
    return (
      <AccessDenied
        title="Permissions unavailable"
        description="Your role does not have permission to view permissions."
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">Permissions</h2>
        <div className="flex gap-3">
          {isFilterApplied && (
            <Button
              variant="outline"
              onClick={() => setFilters({ module_id: '', action_id: '', status: '', search: '' })}
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
              <Plus size={18} className="mr-2" /> Add Permission
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Select
            label="Filter by Module"
            value={filters.module_id}
            options={[
              { value: '', label: 'All' },
              ...modules.map((m) => ({
                value: m.id,
                label: m.group ? `${m.group} → ${m.title}` : m.title,
              })),
            ]}
            onChange={(val) => setFilters((prev) => ({ ...prev, module_id: String(val) }))}
          />
          <Select
            label="Filter by Action"
            value={filters.action_id}
            options={[
              { value: '', label: 'All' },
              ...actions.map((a) => ({ value: a.id, label: a.title })),
            ]}
            onChange={(val) => setFilters((prev) => ({ ...prev, action_id: String(val) }))}
          />
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
              {
                key: 'module',
                label: 'Module',
                render: (r: Permission) => r.module?.title || '-',
              },
              {
                key: 'action',
                label: 'Action',
                render: (r: Permission) => r.action?.title || '-',
              },
              { key: 'slug', label: 'Slug' },
              {
                key: 'status',
                label: 'Status',
                render: (r: Permission) =>
                  r.status === 1 ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-red-600 font-medium">Inactive</span>
                  ),
              },
              {
                key: 'created_at',
                label: 'Created',
                render: (r: Permission) => formatDateTime(r.created_at),
              },
            ]}
            fetchData={fetchTable}
            showAnalytics
            actions={
              canUpdate || canDelete
                ? (row: Permission) => (
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
        title={editing ? 'Edit Permission' : 'Add Permission'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Controller
            name="module_id"
            control={control}
            rules={{ required: 'Module is required' }}
            render={({ field, fieldState }) => (
              <Select
                label="Module"
                value={field.value ?? ''}
                placeholder="Select a module"
                options={[
                  { value: '', label: 'Select a module' },
                  ...modules.map((m) => ({
                    value: m.id,
                    label: m.group ? `${m.group} → ${m.title}` : m.title,
                  })),
                ]}
                onChange={field.onChange}
                required
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="action_id"
            control={control}
            rules={{ required: 'Action is required' }}
            render={({ field, fieldState }) => (
              <Select
                label="Action"
                value={field.value ?? ''}
                placeholder="Select an action"
                options={[
                  { value: '', label: 'Select an action' },
                  ...actions.map((a) => ({ value: a.id, label: a.title })),
                ]}
                onChange={field.onChange}
                required
                error={fieldState.error?.message}
              />
            )}
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
