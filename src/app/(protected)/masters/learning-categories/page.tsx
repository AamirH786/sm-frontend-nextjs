'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { useToast } from '@/context/ToastContext';
import { adminLearningService, LearningCategory } from '@/services/adminLearningService';

type FormValues = { name: string; description: string };

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function LearningCategoriesPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<LearningCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LearningCategory | null>(null);
  const [search, setSearch] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminLearningService.categories.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); reset({ name: '', description: '' }); setModalOpen(true); };
  const openEdit = (row: LearningCategory) => { setEditing(row); reset({ name: row.name, description: row.description || '' }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); reset(); };

  const onSubmit = async (values: FormValues) => {
    try {
      if (editing) {
        await adminLearningService.categories.update(editing.id, { name: values.name, description: values.description });
        showToast('Category updated', 'success');
      } else {
        await adminLearningService.categories.create({ name: values.name, description: values.description });
        showToast('Category created', 'success');
      }
      closeModal();
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Save failed', 'error');
    }
  };

  const handleDelete = async (row: LearningCategory) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    try {
      await adminLearningService.categories.delete(row.id);
      showToast('Category deleted', 'success');
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Delete failed', 'error');
    }
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold">Learning Categories</h2>
        <Button onClick={openCreate}><Plus size={16} className="mr-2" />Add Category</Button>
      </div>

      <Card>
        <CardContent>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No categories found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="pb-3 pr-4 pl-1">#</th>
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Description</th>
                    <th className="pb-3 pr-4">Created</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((row, i) => (
                    <tr key={row.id} className="hover:bg-slate-50/60">
                      <td className="py-3 pr-4 pl-1 text-slate-400">{i + 1}</td>
                      <td className="py-3 pr-4 font-medium text-slate-800">{row.name}</td>
                      <td className="py-3 pr-4 text-slate-500 max-w-[280px] truncate">{row.description || '-'}</td>
                      <td className="py-3 pr-4 text-slate-400">{fmt(row.created_at)}</td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          <Tooltip text="Edit">
                            <button onClick={() => openEdit(row)} className="rounded p-1.5 hover:bg-slate-100">
                              <Edit size={15} className="text-slate-500" />
                            </button>
                          </Tooltip>
                          <Tooltip text="Delete">
                            <button onClick={() => handleDelete(row)} className="rounded p-1.5 hover:bg-red-50">
                              <Trash2 size={15} className="text-red-500" />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Name"
            {...register('name', { required: 'Name is required' })}
            error={errors.name?.message}
            required
          />
          <Input
            label="Description"
            {...register('description')}
            placeholder="Optional description"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
