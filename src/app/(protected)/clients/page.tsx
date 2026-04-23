'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersService, rolesService, Role, UserDependencyCheckResponse } from '@/services/rbacService';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { Download, Eye, Trash2 } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';
import Select from '@/components/ui/Select';
import { useToast } from '@/context/ToastContext';
import usePermission from '@/hooks/usePermission';

const formatDate = (d?: string) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ClientsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { can } = usePermission();
  const [refreshKey, setRefreshKey] = useState(0);
  const [clientRoleId, setClientRoleId] = useState<number | null>(null);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [actionKey, setActionKey] = useState('');
  const [listExporting, setListExporting] = useState<'csv' | ''>('');
  const canDelete = can('users', 'delete');

  const CLIENT_EXPORT_HEADERS = ['Username', 'Email', 'Phone', 'User Type', 'Onboarded', 'Status', 'Joined'] as const;

  const formatClientExportRow = (client: any) => [
    client.username || '-',
    client.email || '-',
    client.phone || '-',
    client.user_type || 'client',
    client.onboarding_completed ? 'Yes' : 'No',
    client.status === 1 ? 'Active' : 'Inactive',
    formatDate(client.created_at),
  ];

  const escapeCsvValue = (value: string) => `"${String(value).replace(/"/g, '""')}"`;

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const fetchAllClientsForExport = async () => {
    if (!clientRoleId) return [];

    const allClients: any[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await usersService.list({
        page,
        limit: 100,
        role_id: clientRoleId,
        search: filters.search || undefined,
        status: filters.status !== '' ? Number(filters.status) : undefined,
      });

      allClients.push(...response.data);
      totalPages = response.meta.totalPages || 1;
      page += 1;
    } while (page <= totalPages);

    return allClients;
  };

  const exportClients = async () => {
    try {
      setListExporting('csv');
      const clients = await fetchAllClientsForExport();

      if (clients.length === 0) {
        showToast('No clients available to export', 'error');
        return;
      }

      const rows = clients.map(formatClientExportRow);
      const stamp = new Date().toISOString().slice(0, 10);
      const csvContent = [
        CLIENT_EXPORT_HEADERS.map(escapeCsvValue).join(','),
        ...rows.map((row) => row.map(escapeCsvValue).join(',')),
      ].join('\n');

      downloadBlob(
        new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }),
        `clients-${stamp}.csv`
      );

      showToast('Clients CSV exported', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export CSV', 'error');
    } finally {
      setListExporting('');
    }
  };

  const summarizeDependencies = (result: UserDependencyCheckResponse) => {
    const dependencies = result.dependencies;
    if (typeof result.message === 'string' && /depend|cannot|linked|in use/i.test(result.message)) {
      return result.message;
    }
    if (typeof result.dependency_count === 'number' && result.dependency_count > 0) {
      return `${result.dependency_count} dependent record(s) are linked to this client.`;
    }
    if (Array.isArray(dependencies) && dependencies.length > 0) {
      return `${dependencies.length} dependent record(s) are linked to this client.`;
    }
    if (dependencies && typeof dependencies === 'object') {
      const counts = Object.values(dependencies).reduce<number>((total, value) => {
        if (typeof value === 'number') return total + value;
        if (Array.isArray(value)) return total + value.length;
        return total;
      }, 0);
      if (counts > 0) return `${counts} dependent record(s) are linked to this client.`;
    }
    return '';
  };

  const downloadExport = async (id: number) => {
    const key = `export-${id}-csv`;
    try {
      setActionKey(key);
      const blob = await usersService.exportUser(id, 'csv');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `client-${id}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast('Client CSV exported', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to export CSV', 'error');
    } finally {
      setActionKey('');
    }
  };

  useEffect(() => {
    rolesService.list({ limit: 100 }).then((res) => {
      const cr = res.data.find((r: Role) => r.title.toUpperCase() === 'CLIENT');
      if (cr) setClientRoleId(cr.id as number);
    }).catch(() => {});
  }, []);

  const fetchTable = async ({ page, limit, search, sortBy, sortOrder }: any) => {
    if (!clientRoleId) return { data: [], pagination: { page: 1, limit, total: 0, totalPages: 1 } };
    const params: any = { page, limit, role_id: clientRoleId };
    if (search) params.search = search;
    if (filters.status !== '') params.status = Number(filters.status);
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;
    const res = await usersService.list(params);
    return {
      data: res.data,
      pagination: { page: res.meta.page, limit: res.meta.limit, total: res.meta.total, totalPages: res.meta.totalPages },
    };
  };

  useEffect(() => {
    if (clientRoleId) setRefreshKey((k) => k + 1);
  }, [clientRoleId, filters.status]);

  const handleDelete = async (id: number) => {
    const key = `delete-${id}`;
    try {
      setActionKey(key);
      const dependencyCheck = await usersService.dependencyCheck(id);
      const dependencySummary = summarizeDependencies(dependencyCheck);
      const blocked =
        dependencyCheck.can_delete === false ||
        dependencyCheck.has_dependencies === true ||
        !!dependencySummary;

      if (blocked) {
        showToast(dependencySummary || 'This client cannot be deleted because dependent records exist.', 'error');
        return;
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to verify delete dependencies', 'error');
      return;
    } finally {
      setActionKey('');
    }

    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      setActionKey(key);
      await usersService.delete(id);
      showToast('Client deleted', 'success');
      setRefreshKey((key) => key + 1);
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Delete failed', 'error');
    } finally {
      setActionKey('');
    }
  };

  const isFilterApplied = filters.status !== '' || filters.search.trim() !== '';

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-semibold">Clients</h2>
          <p className="text-sm text-gray-500 mt-0.5">All registered client users</p>
        </div>
        <div className="flex gap-3">
          {isFilterApplied && (
            <button
              onClick={() => setFilters({ status: '', search: '' })}
              className="flex items-center gap-2 border border-red-300/60 text-red-600 hover:bg-red-50 rounded-lg px-3 py-2 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              Reset Filters
            </button>
          )}
          <button
            onClick={() => setShowFilters((p) => !p)}
            className="flex items-center bg-blue-100 hover:bg-blue-200 hover:font-semibold gap-2 border border-gray-300 text-gray-900 rounded-lg px-4 py-2 text-sm shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12 10 19 14 21 14 12 22 3" /></svg>
            Filters
          </button>
          <button
            onClick={exportClients}
            disabled={!clientRoleId || !!listExporting}
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={18} />
            {listExporting === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
              { key: 'username', label: 'Username' },
              { key: 'email', label: 'Email', render: (r: any) => r.email || '-' },
              { key: 'phone', label: 'Phone', render: (r: any) => r.phone || '-' },
              { key: 'user_type', label: 'User Type', render: (r: any) => r.user_type || 'client' },
              {
                key: 'onboarding_completed',
                label: 'Onboarded',
                render: (r: any) =>
                  r.onboarding_completed ? (
                    <span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-0.5 rounded-full">Yes</span>
                  ) : (
                    <span className="text-gray-400 text-xs font-medium bg-gray-100 px-2 py-0.5 rounded-full">No</span>
                  ),
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
              { key: 'created_at', label: 'Joined', render: (r: any) => formatDate(r.created_at) },
            ]}
            fetchData={fetchTable}
            showAnalytics
            actions={(row: any) => (
              <div className="flex justify-end gap-2">
                <Tooltip text="View Details">
                  <button
                    onClick={() => router.push(`/clients/${row.id}`)}
                    className="p-1.5 hover:bg-gray-100 rounded text-blue-600"
                  >
                    <Eye size={16} />
                  </button>
                </Tooltip>
                <Tooltip text="Export CSV">
                  <button
                    onClick={() => downloadExport(row.id)}
                    disabled={actionKey === `export-${row.id}-csv`}
                    className="p-1.5 hover:bg-gray-100 rounded text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download size={16} />
                  </button>
                </Tooltip>
                {canDelete && (
                  <Tooltip text="Delete Client">
                    <button
                      onClick={() => handleDelete(row.id)}
                      disabled={actionKey === `delete-${row.id}`}
                      className="p-1.5 hover:bg-red-50 rounded text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </Tooltip>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
