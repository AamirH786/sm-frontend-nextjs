'use client';

import { useState, useEffect } from 'react';
import useCrudAccess from '@/hooks/useCrudAccess';
import { useToast } from '@/context/ToastContext';
import taskService, { TaskStatusMaster } from '@/services/taskService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { Card, CardContent } from '@/components/ui/Card';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';

const COLOR_PRESETS = [
  '#6B7280', '#3B82F6', '#F59E0B', '#10B981',
  '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6',
  '#F97316', '#6366F1',
];

export default function TaskStatusesPage() {
  const { showToast } = useToast();
  const { canCreate, canUpdate, canDelete } = useCrudAccess('task_status');
  const [statuses, setStatuses] = useState<TaskStatusMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<TaskStatusMaster | null>(null);
  const [deleting, setDeleting] = useState<TaskStatusMaster | null>(null);
  const [form, setForm] = useState({ title: '', color: '#6B7280', sort_order: 0, is_active: true });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await taskService.listStatuses();
      setStatuses(data);
    } catch {
      showToast('Failed to load statuses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ title: '', color: '#6B7280', sort_order: statuses.length + 1, is_active: true });
    setIsModalOpen(true);
  };

  const openEdit = (s: TaskStatusMaster) => {
    setEditing(s);
    setForm({ title: s.title, color: s.color, sort_order: s.sort_order, is_active: s.is_active });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    try {
      setSaving(true);
      if (editing) {
        await taskService.updateStatus(editing.id, form);
        showToast('Status updated', 'success');
      } else {
        await taskService.createStatus(form);
        showToast('Status created', 'success');
      }
      setIsModalOpen(false);
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await taskService.deleteStatus(deleting.id);
      showToast('Status deleted', 'success');
      setDeleting(null);
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Delete failed', 'error');
    }
  };

  const toggleActive = async (s: TaskStatusMaster) => {
    try {
      await taskService.updateStatus(s.id, { title: s.title, color: s.color, sort_order: s.sort_order, is_active: !s.is_active });
      load();
    } catch {
      showToast('Failed to update', 'error');
    }
  };

  return (
    <div className="px-6 md:px-10 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Task Statuses</h2>
          <p className="text-sm text-gray-500">Manage task status labels, colors and order</p>
        </div>
        {canCreate && (
          <Button onClick={openAdd} className="flex items-center gap-2">
            <Plus size={15} />
            Add Status
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : statuses.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No statuses yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 w-8"></th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Color</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statuses.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-300">
                      <GripVertical size={14} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: s.color }}
                      >
                        {s.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">{s.slug}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-gray-500 font-mono">{s.color}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{s.sort_order}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(s)}
                        disabled={!canUpdate}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.is_active ? 'bg-green-500' : 'bg-gray-200'}`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${s.is_active ? 'translate-x-4.5' : 'translate-x-0.5'}`}
                          style={{ transform: s.is_active ? 'translateX(18px)' : 'translateX(2px)' }}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canUpdate && (
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleting(s)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={(editing ? canUpdate : canCreate) && isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Edit Status' : 'Add Status'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. In Testing"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex items-center gap-3">
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                />
                <span className="text-xs text-gray-500 font-mono">{form.color}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <Input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">Preview</p>
            <span
              className="inline-flex px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: form.color }}
            >
              {form.title || 'Status Name'}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Add Status'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={canDelete && !!deleting}
        onClose={() => setDeleting(null)}
        title="Delete Status"
      >
        <p className="text-sm text-gray-600 mb-4">
          Delete status <span className="font-semibold">"{deleting?.title}"</span>?
          This will fail if any tasks are using this status.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
