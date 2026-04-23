'use client';

import { useState } from 'react';
import { personMastersService, Person } from '@/services/personMastersService';
import Button from '@/components/ui/Button';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { useToast } from '@/context/ToastContext';
import { Plus, Edit, Trash2, Eye, User } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getApiAssetUrl } from '@/lib/api-base';

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

export default function PersonMastersListPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  const reloadTable = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this person? This will also remove their face data and knowledge documents.')) return;
    try {
      await personMastersService.delete(id);
      showToast('Person deleted', 'success');
      reloadTable();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const fetchTable = async ({ page, limit, search }: any) => {
    const params: any = { page, limit };
    if (search) params.search = search;
    const res = await personMastersService.list(params);
    return {
      data: res.data,
      pagination: {
        page: res.meta.page,
        limit: res.meta.limit,
        total: res.meta.total,
        totalPages: res.meta.totalPages ?? 0,
      },
    };
  };

  const columns = [
    {
      label: 'Photo',
      render: (row: Person) => (
        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
          {row.photo_url ? (
            <img
              src={row.photo_url.startsWith('http') ? row.photo_url : getApiAssetUrl(row.photo_url)}
              alt={row.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={18} className="text-gray-400" />
          )}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (row: Person) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          {row.designation && <p className="text-xs text-gray-500">{row.designation}</p>}
        </div>
      ),
    },
    {
      label: 'Company',
      render: (row: Person) => <span className="text-sm text-gray-700">{row.company || '-'}</span>,
    },
    {
      label: 'Face',
      render: (row: Person) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.face_descriptor ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {row.face_descriptor ? 'Registered' : 'None'}
        </span>
      ),
    },
    {
      label: 'Docs',
      render: (row: Person) => <span className="text-sm text-gray-700">{row.document_count ?? 0}</span>,
    },
    {
      label: 'Chunks',
      render: (row: Person) => <span className="text-sm text-gray-700">{row.chunk_count ?? 0}</span>,
    },
    {
      label: 'Created',
      render: (row: Person) => <span className="text-sm text-gray-500">{formatDateTime(row.created_at)}</span>,
    },
  ];

  return (
    <div className="px-6 md:px-10 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/masters" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              Masters
            </Link>
            <span className="text-gray-400 mx-1">/</span>
            <span className="text-xl font-bold text-gray-900">Person Master</span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Register people for face recognition and AI knowledge briefing</p>
        </div>
        <Button onClick={() => router.push('/masters/persons/create')} className="flex items-center gap-2">
          <Plus size={16} /> Add Person
        </Button>
      </div>

      <AdvancedDataTable
        columns={columns}
        fetchData={fetchTable}
        refreshTrigger={refreshKey}
        actions={(row: Person) => (
          <div className="flex items-center gap-2">
            <Tooltip text="View details">
              <button onClick={() => router.push(`/masters/persons/${row.id}`)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                <Eye size={16} />
              </button>
            </Tooltip>
            <Tooltip text="Edit">
              <button onClick={() => router.push(`/masters/persons/${row.id}/edit`)} className="p-1.5 text-gray-400 hover:text-yellow-600 rounded">
                <Edit size={16} />
              </button>
            </Tooltip>
            <Tooltip text="Delete">
              <button onClick={() => handleDelete(row.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                <Trash2 size={16} />
              </button>
            </Tooltip>
          </div>
        )}
      />
    </div>
  );
}
