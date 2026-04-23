'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { usersService, rolesService, Role, User } from '@/services/rbacService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/context/ToastContext';
import { Plus, Edit, Trash2, UserCircle } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';
import Link from 'next/link';
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

export default function UsersPage() {
  const { showToast } = useToast();
  const { can } = usePermission();
  const [roles, setRoles] = useState<Role[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const [filters, setFilters] = useState({
    role_id: '',
    status: '',
    search: '',
  });
  const canView = can('users', 'view');
  const canCreate = can('users', 'create');
  const canUpdate = can('users', 'update');
  const canDelete = can('users', 'delete');

  const reloadTable = () => setRefreshKey((k) => k + 1);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm();

  useEffect(() => {
    if (canView) {
      loadRoles();
    }
  }, [canView]);

  useEffect(() => {
    reloadTable();
  }, [filters.role_id, filters.status]);

  const loadRoles = async () => {
    try {
      const res = await rolesService.list({ limit: 100, exclude_client: true });
      setRoles(res.data.filter((role) => role.title.toUpperCase() !== 'CLIENT'));
    } catch { }
  };

  const handleOpenCreate = () => {
    setEditing(null);
    reset({ name: '', password: '', email: '', role_id: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (row: User) => {
    setEditing(row);
    reset({
      name: row.name || [row.first_name, row.last_name].filter(Boolean).join(' '),
      email: row.email || '',
      role_id: row.role_id || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    try {
      await usersService.delete(id);
      showToast('Employee deleted', 'success');
      reloadTable();
    } catch (err: any) {
      console.error(err?.response?.data);
      showToast(err?.response?.data?.detail || 'Delete failed', 'error');
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (editing) {
        const updatedUser = await usersService.update(editing.id, {
          name: data.name,
          email: data.email,
          role_id: data.role_id ? Number(data.role_id) : undefined,
        });
        showToast(`Employee updated successfully${updatedUser.username ? ` (@${updatedUser.username})` : ''}`, 'success');
      } else {
        const createdUser = await usersService.create({
          name: data.name,
          password: data.password,
          email: data.email,
          role_id: data.role_id ? Number(data.role_id) : undefined,
        });
        showToast(`Employee created successfully${createdUser.username ? ` (@${createdUser.username})` : ''}`, 'success');
      }
      setIsModalOpen(false);
      reset();
      reloadTable();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const fetchTable = async ({ page, limit, search, sortBy, sortOrder }: any) => {
    const params: any = { page, limit, exclude_client: true };
    if (search) params.search = search;
    if (filters.role_id) params.role_id = Number(filters.role_id);
    if (filters.status !== '') params.status = Number(filters.status);
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;

    const res = await usersService.list(params);
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

  const isFilterApplied = filters.role_id !== '' || filters.status !== '' || filters.search.trim() !== '';

  if (!canView) {
    return (
      <AccessDenied
        title="Employees unavailable"
        description="Your role does not have permission to view employees."
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">Employees</h2>
        <div className="flex gap-3">
          {isFilterApplied && (
            <Button
              variant="outline"
              onClick={() => setFilters({ role_id: '', status: '', search: '' })}
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
              <Plus size={18} className="mr-2" /> Add Employee
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Select
            label="Filter by Role"
            value={filters.role_id}
            options={[
              { value: '', label: 'All' },
              ...roles.map((r) => ({ value: r.id, label: r.title })),
            ]}
            onChange={(val) => setFilters((prev) => ({ ...prev, role_id: String(val) }))}
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
                key: 'name',
                label: 'Name',
                render: (r: User) => r.name || [r.first_name, r.last_name].filter(Boolean).join(' ') || '-',
              },
              { key: 'username', label: 'Username' },
              { key: 'email', label: 'Email', render: (r: User) => r.email || '-' },
              {
                key: 'role',
                label: 'Role',
                render: (r: any) => r.role_title || '-',
              },
              {
                key: 'status',
                label: 'Status',
                render: (r: any) =>
                  r.status === 1 ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-red-600 font-medium">Inactive</span>
                  ),
              },
              {
                key: 'created_at',
                label: 'Created',
                render: (r: User) => formatDateTime(r.created_at),
              },
            ]}
            fetchData={fetchTable}
            showAnalytics
            actions={
              canView || canUpdate || canDelete
                ? (row: User) => (
                    <div className="flex justify-end gap-2">
                      {canView && (
                        <Tooltip text="Employee Profile">
                          <Link href={`/roles-users/users/${row.id}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded inline-flex">
                            <UserCircle size={16} />
                          </Link>
                        </Tooltip>
                      )}
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
        onClose={() => {
          setIsModalOpen(false);
          setEditing(null);
          reset();
        }}
        title={editing ? "Edit Employee" : "Add Employee"}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
          autoComplete={editing ? "on" : "off"}
        >
          <Input
            label="Name"
            autoComplete="name"
            placeholder="Enter full name"
            hint={!editing ? 'Username will be auto-generated from name/email.' : 'Updating the name will update first and last name.'}
            {...register("name", { required: "Name is required" })}
            error={errors.name?.message}
            required
          />

          {!editing && (
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              {...register("password", { required: "Password is required" })}
              error={errors.password?.message}
              required
            />
          )}
          <Input
            label="Email"
            type="email"
            placeholder="Enter Email"
            autoComplete="email"
            hint={!editing ? 'Email will be auto-marked as verified for admin-created users.' : undefined}
            {...register("email", { required: "Email is required" })}
            error={errors.email?.message}
            required
          />

          <Controller
            name="role_id"
            control={control}
            rules={{ required: 'Role is required' }}
            render={({ field }) => (
              <Select
                label="Role"
                required
                error={errors.role_id?.message}
                value={field.value ?? ""}
                options={[
                  { value: "", label: "Select Role" },
                  ...roles.map((r) => ({
                    value: r.id,
                    label: r.title,
                  })),
                ]}
                onChange={field.onChange}
              />
            )}
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

            <Button type="submit">
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
