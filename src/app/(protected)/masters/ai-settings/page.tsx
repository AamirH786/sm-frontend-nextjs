'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { aiSettingsService, AISettings } from '@/services/aiSettingsService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/context/ToastContext';
import { Plus, Edit, Trash2, Check, Globe2 } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';
import Link from 'next/link';

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

export default function AISettingsPage() {
  const { showToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AISettings | null>(null);
  const [filters, setFilters] = useState({ search: '' });

  const reloadTable = () => setRefreshKey((k) => k + 1);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const handleOpenCreate = () => {
    setEditing(null);
    reset({
      title: '',
      description: '',
      provider: 'openai',
      api_key: '',
      model: 'gpt-4o',
      endpoint: 'https://api.openai.com/v1',
      status: true,
      is_current: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (row: AISettings) => {
    setEditing(row);
    reset({
      title: row.title,
      description: row.description || '',
      provider: row.api_keys?.provider || 'openai',
      api_key: row.api_keys?.api_key || '',
      model: row.api_keys?.model || 'gpt-4o',
      endpoint: row.api_keys?.endpoint || 'https://api.openai.com/v1',
      status: row.status,
      is_current: row.is_current,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this AI setting?')) return;
    try {
      await aiSettingsService.delete(id);
      showToast('AI Setting deleted', 'success');
      reloadTable();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        title: data.title,
        description: data.description,
        api_keys: {
          provider: data.provider,
          api_key: data.api_key,
          model: data.model,
          endpoint: data.endpoint,
        },
        status: data.status === 'true' || data.status === true,
        is_current: data.is_current === 'true' || data.is_current === true,
      };

      if (editing) {
        await aiSettingsService.update(editing.id, payload);
        showToast('AI Setting updated successfully', 'success');
      } else {
        await aiSettingsService.create(payload);
        showToast('AI Setting created successfully', 'success');
      }
      setIsModalOpen(false);
      reset();
      reloadTable();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const fetchTable = async ({ page, limit, search }: any) => {
    const params: any = { page, limit };
    if (search) params.search = search;

    const res = await aiSettingsService.list(params);
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

  return (
    <div className="px-6 md:px-10 py-6">
      <div className="mb-6 rounded-[24px] border border-white/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.94)_0%,rgba(29,78,216,0.92)_52%,rgba(14,165,233,0.9)_100%)] px-5 py-3 text-white shadow-[0_20px_48px_rgba(37,99,235,0.16)] backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="mt-1 text-[24px] font-semibold leading-none tracking-tight">AI Settings</h1>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-blue-100/85">
                Manage provider connections, active AI configuration, and response languages from one clean control surface.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Link href="/masters/ai-settings/languages/create">
                <Button className="h-10 rounded-full border border-blue-500/20 bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_52%,#0ea5e9_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(37,99,235,0.34)]"
                >
                  <Globe2 size={16} className="mr-2" />
                  Add Language
                </Button>
              </Link>
              <Button
                onClick={handleOpenCreate}
                className="h-10 rounded-full border border-blue-500/20 bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_52%,#0ea5e9_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(37,99,235,0.34)]"
              >
                <Plus size={16} className="mr-2" />
                Add AI Setting
              </Button>
            </div>
          </div>

        </div>
      </div>

      <Card>
        <CardContent>
          <AdvancedDataTable
            refreshTrigger={refreshKey}
            externalSearch={filters.search}
            onSearchChange={(val) => setFilters({ search: val })}
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'description', label: 'Description', render: (r: AISettings) => r.description || '-' },
              {
                key: 'provider',
                label: 'Provider',
                render: (r: AISettings) => r.api_keys?.provider?.toUpperCase() || '-'
              },
              { key: 'model', label: 'Model', render: (r: AISettings) => r.api_keys?.model || '-' },
              {
                key: 'is_current',
                label: 'Current',
                render: (r: AISettings) =>
                  r.is_current ? (
                    <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                      <Check size={16} /> Yes
                    </span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (r: AISettings) =>
                  r.status ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-red-600 font-medium">Inactive</span>
                  ),
              },
              {
                key: 'created_at',
                label: 'Created',
                render: (r: AISettings) => formatDateTime(r.created_at),
              },
            ]}
            fetchData={fetchTable}
            showAnalytics
            actions={(row: AISettings) => (
              <div className="flex justify-end gap-2">
                <Tooltip text="Edit">
                  <button onClick={() => handleOpenEdit(row)} className="p-1.5 hover:bg-gray-100 rounded">
                    <Edit size={16} />
                  </button>
                </Tooltip>
                <Tooltip text="Delete">
                  <button onClick={() => handleDelete(row.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
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
        title={editing ? 'Edit AI Setting' : 'Add AI Setting'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Title"
            {...register('title', { required: 'Title is required' })}
            error={errors.title?.message}
            placeholder="e.g., OpenAI GPT-4o"
            required
          />
          <Input
            label="Description"
            {...register('description')}
            placeholder="e.g., Primary production AI"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Provider"
              {...register('provider')}
              placeholder="e.g., openai, anthropic"
            />
            <Input
              label="Model"
              {...register('model')}
              placeholder="e.g., gpt-4o, claude-3"
            />
          </div>
          <Input
            label="API Key"
            {...register('api_key')}
            placeholder="sk-xxxx..."
            type="password"
          />
          <Input
            label="Endpoint"
            {...register('endpoint')}
            placeholder="https://api.openai.com/v1"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={(editing?.status ?? true).toString()}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
              {...register('status', {
                onChange: (e) => {
                  // Handle the change
                }
              })}
              onChange={(value) => {
                // Custom handler for Select component
              }}
            />
            <Select
              label="Set as Current"
              value={(editing?.is_current ?? false).toString()}
              options={[
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' },
              ]}
              {...register('is_current', {
                onChange: (e) => {
                  // Handle the change
                }
              })}
              onChange={(value) => {
                // Custom handler for Select component
              }}
            />
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
