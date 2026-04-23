'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { contentPagesService, ContentPage } from '@/services/websiteService';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';

export default function ContentPagesPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [viewItem, setViewItem] = useState<ContentPage | null>(null);
  const [deleteItem, setDeleteItem] = useState<ContentPage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchData = useCallback(async (params: { page: number; limit: number; search: string }) => {
    try {
      const response = await contentPagesService.list({
        page: params.page,
        limit: Math.min(params.limit, 99),
        search: params.search || undefined,
      });
      
      const data = response.data || [];
      const total = response.total || 0;
      const totalPages = Math.ceil(total / params.limit);

      return {
        data,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages,
        },
      };
    } catch (err: any) {
      showToast(err.message || 'Failed to load content pages', 'error');
      return {
        data: [],
        pagination: { page: 1, limit: params.limit, total: 0, totalPages: 0 },
      };
    }
  }, [showToast]);

  const handleToggleStatus = async (item: ContentPage) => {
    try {
      await contentPagesService.toggleStatus(item.id);
      showToast(`Status updated successfully`, 'success');
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      setDeleting(true);
      await contentPagesService.delete(deleteItem.id);
      showToast('Content page deleted successfully', 'success');
      setDeleteItem(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (row: ContentPage) => row.id,
    },
    {
      key: 'title',
      label: 'Title',
      render: (row: ContentPage) => row.title,
    },
    {
      key: 'slug',
      label: 'Slug',
      render: (row: ContentPage) => row.slug,
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (row: ContentPage) => (
        <button
          onClick={() => handleToggleStatus(row)}
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.is_active
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-red-100 text-red-800 hover:bg-red-200'
          }`}
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </button>
      ),
    },
  ];

  const renderActions = (row: ContentPage) => (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setViewItem(row)}
        className="p-1 text-gray-500 hover:text-blue-600"
        title="View"
      >
        <Eye className="w-4 h-4" />
      </button>
      <button
        onClick={() => router.push(`/masters/content-pages/${row.id}/edit`)}
        className="p-1 text-gray-500 hover:text-blue-600"
        title="Edit"
      >
        <Edit className="w-4 h-4" />
      </button>
      <button
        onClick={() => setDeleteItem(row)}
        className="p-1 text-gray-500 hover:text-red-600"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="flex-1 px-6 py-6 md:px-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Pages</h1>
          <p className="text-sm text-gray-500">Manage website content pages</p>
        </div>
        <Button onClick={() => router.push('/masters/content-pages/create')}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Page
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <AdvancedDataTable
            columns={columns}
            fetchData={fetchData}
            actions={renderActions}
            refreshTrigger={refreshTrigger}
            showAnalytics={false}
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.title || 'View Content'}
        size="lg"
      >
        {viewItem && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Title</label>
              <p className="text-gray-900">{viewItem.title}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Slug</label>
              <p className="text-gray-900">{viewItem.slug || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  viewItem.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {viewItem.is_active ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Content</label>
              <div 
                className="mt-2 p-4 bg-gray-50 rounded-lg border prose max-w-none"
                dangerouslySetInnerHTML={{ __html: viewItem.content_html || '' }}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        title="Delete Content Page"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{deleteItem?.title}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteItem(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
