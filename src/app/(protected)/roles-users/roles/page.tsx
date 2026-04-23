'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { rolesService, Role } from '@/services/rbacService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/context/ToastContext';
import { Plus, Edit, Trash2, Key, ShieldCheck } from 'lucide-react';
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

export default function RolesPage() {
  const { showToast } = useToast();
  const { can } = usePermission();
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);

  const [filters, setFilters] = useState({
    status: '',
    search: '',
  });
  const canView = can('roles', 'view');
  const canCreate = can('roles', 'create');
  const canUpdate = can('roles', 'update');
  const canDelete = can('roles', 'delete');
  const canManagePermissions = can('role-permissions', 'view') || can('role-permissions', 'update');

  const reloadTable = () => setRefreshKey((k) => k + 1);

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm();
  const isSuperAdminSelected = watch('is_super_admin');

  useEffect(() => {
    reloadTable();
  }, [filters.status]);

  const handleOpenCreate = () => {
    setEditing(null);
    reset({ title: '', status: 1, is_super_admin: false });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (row: Role) => {
    setEditing(row);
    reset({ title: row.title, status: row.status, is_super_admin: Boolean(row.is_super_admin) });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await rolesService.delete(id);
      showToast('Role deleted', 'success');
      reloadTable();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleManagePermissions = (role: Role) => {
    router.push(`/roles-users/roles/${role.id}/permissions`);
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = { ...data, status: Number(data.status) };
      if (editing) {
        await rolesService.update(editing.id, payload);
        showToast('Role updated successfully', 'success');
      } else {
        await rolesService.create(payload);
        showToast('Role created successfully', 'success');
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

    const res = await rolesService.list(params);
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
        title="Roles unavailable"
        description="Your role does not have permission to view roles."
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">Roles</h2>
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
              <Plus size={18} className="mr-2" /> Add Role
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
              { key: 'title', label: 'Role Name' },
              {
                key: 'is_super_admin',
                label: 'Access',
                render: (r: Role) =>
                  r.is_super_admin ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      <ShieldCheck size={12} />
                      Super Admin
                    </span>
                  ) : (
                    <span className="text-gray-500 text-sm">Custom</span>
                  ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (r: Role) =>
                  r.status === 1 ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-red-600 font-medium">Inactive</span>
                  ),
              },
              {
                key: 'created_at',
                label: 'Created',
                render: (r: Role) => formatDateTime(r.created_at),
              },
            ]}
            fetchData={fetchTable}
            showAnalytics
            actions={
              canUpdate || canDelete || canManagePermissions
                ? (row: Role) => (
                    <div className="flex justify-end gap-2">
                      {canUpdate && (
                        <Tooltip text="Edit">
                          <button onClick={() => handleOpenEdit(row)} className="p-1.5 hover:bg-gray-100 rounded">
                            <Edit size={16} />
                          </button>
                        </Tooltip>
                      )}
                      {canManagePermissions && (
                        <Tooltip text="Manage Permissions">
                          <button onClick={() => handleManagePermissions(row)} className="p-1.5 hover:bg-gray-100 rounded">
                            <Key size={16} />
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
        title={editing ? 'Edit Role' : 'Add Role'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Role Name"
            {...register('title', { required: 'Role name is required' })}
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
                disabled={Boolean(isSuperAdminSelected)}
              />
            )}
          />
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register('is_super_admin')}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setValue('is_super_admin', checked);
                  if (checked) {
                    setValue('status', 1);
                  }
                }}
                className="mt-1 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1">
                  <ShieldCheck size={14} />
                  Is Super Admin
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  Enable for full platform access. Role will stay Active and inherit all permissions automatically.
                </p>
              </div>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
