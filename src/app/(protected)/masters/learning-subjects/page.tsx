'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Tooltip from '@/components/ui/Tooltip';
import { useToast } from '@/context/ToastContext';
import { adminLearningService, LearningCategory, Subject } from '@/services/adminLearningService';

type FormValues = { category_id: string; name: string; description: string };

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function LearningSubjectsPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<Subject[]>([]);
  const [categories, setCategories] = useState<LearningCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [search, setSearch] = useState('');
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>();

  const load = async () => {
    try {
      setLoading(true);
      const [subjectsData, catsData] = await Promise.all([
        adminLearningService.subjects.list(),
        adminLearningService.categories.list(),
      ]);
      setItems(Array.isArray(subjectsData) ? subjectsData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ category_id: categories[0]?.id ? String(categories[0].id) : '', name: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (row: Subject) => {
    setEditing(row);
    reset({ category_id: String(row.category_id), name: row.name, description: row.description || '' });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); reset(); };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        category_id: Number(values.category_id),
        name: values.name,
        description: values.description || undefined,
      };
      if (editing) {
        await adminLearningService.subjects.update(editing.id, payload);
        showToast('Subject updated', 'success');
      } else {
        await adminLearningService.subjects.create(payload);
        showToast('Subject created', 'success');
      }
      closeModal();
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Save failed', 'error');
    }
  };

  const handleDelete = async (row: Subject) => {
    if (!confirm(`Delete "${row.name}"?`)) return;
    try {
      await adminLearningService.subjects.delete(row.id);
      showToast('Subject deleted', 'success');
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Delete failed', 'error');
    }
  };

  const getCategoryName = (id: number) => categories.find(c => c.id === id)?.name || `#${id}`;
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const categoryOptions = categories.map(c => ({ value: String(c.id), label: c.name }));

  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold">Learning Subjects</h2>
        <Button onClick={openCreate}><Plus size={16} className="mr-2" />Add Subject</Button>
      </div>

      <Card>
        <CardContent>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search subjects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No subjects found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="pb-3 pr-4 pl-1">#</th>
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Category</th>
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
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          {getCategoryName(row.category_id)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-500 max-w-[220px] truncate">{row.description || '-'}</td>
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

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit Subject' : 'Add Subject'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Select
            label="Category"
            value={watch('category_id')}
            options={categoryOptions}
            onChange={v => setValue('category_id', String(v))}
            required
          />
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
