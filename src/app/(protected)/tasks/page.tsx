'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import usePermission from '@/hooks/usePermission';
import { useToast } from '@/context/ToastContext';
import taskService, { Task, TaskStatusMaster, TaskUser } from '@/services/taskService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { Card, CardContent } from '@/components/ui/Card';
import FileAttachmentsField from '@/components/ui/FileAttachmentsField';
import {
  Plus, Filter, Search, ChevronLeft, ChevronRight,
  Calendar, User, Tag, Trash2, Eye, X
} from 'lucide-react';

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const fmtDate = (d?: string) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isOverdue = (d?: string) => {
  if (!d) return false;
  return new Date(d) < new Date(new Date().toDateString());
};

const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const BLOCKED_ATTACHMENT_EXTENSIONS = ['.exe', '.bat', '.cmd', '.msi', '.sh'];

const validateTaskAttachments = (files: File[]) => {
  for (const file of files) {
    const lowerName = file.name.toLowerCase();
    if (BLOCKED_ATTACHMENT_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
      return `File type not allowed: ${file.name}`;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      return `File is too large: ${file.name}. Max size is 25MB.`;
    }
  }
  return '';
};

export default function TasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { can } = usePermission();
  const { showToast } = useToast();
  const isAdmin = user?.role?.is_super_admin || false;
  const canCreateTask = can('tasks', 'create');
  const canDeleteTask = can('tasks', 'delete');
  const canManageAssignments = isAdmin || canCreateTask;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [statuses, setStatuses] = useState<TaskStatusMaster[]>([]);
  const [employees, setEmployees] = useState<TaskUser[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const [filters, setFilters] = useState({
    search: '',
    status_slug: '',
    priority: '',
    project: '',
    assigned_to: '',
    due_from: '',
    due_to: '',
    my_tasks: false,
    page: 1,
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    project: '',
    priority: 'medium',
    status_slug: '',
    assigned_to_ids: [] as number[],
    due_date: '',
    estimated_hours: '',
  });
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const loadMeta = useCallback(async () => {
    const [s, e, p] = await Promise.all([
      taskService.listStatuses().catch(() => []),
      canManageAssignments ? taskService.employees().catch(() => []) : Promise.resolve([]),
      taskService.projects().catch(() => []),
    ]);
    setStatuses(s);
    setEmployees(e);
    setProjects((p || []).slice().sort((a, b) => a.localeCompare(b)));
    if (s.length > 0 && !form.status_slug) {
      setForm((f) => ({ ...f, status_slug: s[0].slug }));
    }
  }, [canManageAssignments]);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page: filters.page, limit: 20 };
      if (filters.search) params.search = filters.search;
      if (filters.status_slug) params.status_slug = filters.status_slug;
      if (filters.priority) params.priority = filters.priority;
      if (filters.project) params.project = filters.project;
      if (filters.assigned_to) params.assigned_to = Number(filters.assigned_to);
      if (filters.due_from) params.due_from = filters.due_from;
      if (filters.due_to) params.due_to = filters.due_to;
      if (filters.my_tasks) params.my_tasks = true;

      const data = await taskService.list(params);
      setTasks(data.data);
      setMeta(data.meta);
    } catch {
      showToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleCreate = async () => {
    if (!form.title.trim()) { showToast('Title is required', 'error'); return; }
    const attachmentError = validateTaskAttachments(attachmentFiles);
    if (attachmentError) {
      showToast(attachmentError, 'error');
      return;
    }

    try {
      setSaving(true);
      const newProject = form.project.trim();
      const payload = {
        title: form.title,
        description: form.description || undefined,
        project: newProject || undefined,
        priority: form.priority as any,
        status_slug: form.status_slug || statuses[0]?.slug || 'todo',
        assigned_to_ids: form.assigned_to_ids.length ? form.assigned_to_ids : undefined,
        due_date: form.due_date || undefined,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : undefined,
      } as any;

      await taskService.createTask(payload, attachmentFiles, setUploadProgress);

      if (newProject) {
        setProjects((prev) =>
          prev.includes(newProject) ? prev : [...prev, newProject].sort((a, b) => a.localeCompare(b))
        );
      }
      showToast('Task created', 'success');
      setShowCreate(false);
      setForm({ title: '', description: '', project: '', priority: 'medium', status_slug: statuses[0]?.slug || '', assigned_to_ids: [], due_date: '', estimated_hours: '' });
      setAttachmentFiles([]);
      setUploadProgress(null);
      loadTasks();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Create failed', 'error');
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await taskService.delete(deleting.id);
      showToast('Task deleted', 'success');
      setDeleting(null);
      loadTasks();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Delete failed', 'error');
    }
  };

  const setFilter = (key: string, val: any) =>
    setFilters((f) => ({ ...f, [key]: val, page: 1 }));

  return (
    <div className="px-6 md:px-10 py-6">
      <datalist id="task-projects">
        {projects.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500">{meta.total} total tasks</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filters.my_tasks}
                onChange={(e) => setFilter('my_tasks', e.target.checked)}
                className="rounded border-gray-300"
              />
              My Tasks
            </label>
          )}
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'hover:bg-gray-50'}`}
          >
            <Filter size={14} />
            Filters
          </button>
          {canCreateTask && (
            <Button onClick={() => { setAttachmentFiles([]); setUploadProgress(null); setShowCreate(true); }} className="flex items-center gap-1.5">
              <Plus size={15} />
              New Task
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Search tasks…"
                  value={filters.search}
                  onChange={(e) => setFilter('search', e.target.value)}
                />
              </div>
              <Select
                value={filters.status_slug}
                onChange={(val) => setFilter('status_slug', val as string)}
                options={[{ value: '', label: 'All Status' }, ...statuses.map((s) => ({ value: s.slug, label: s.title }))]}
              />
              <Select
                value={filters.priority}
                onChange={(val) => setFilter('priority', val as string)}
                options={PRIORITY_OPTIONS}
              />
              {isAdmin && (
                <Select
                  value={filters.assigned_to}
                  onChange={(val) => setFilter('assigned_to', val as string)}
                  options={[{ value: '', label: 'All Employees' }, ...employees.map((e) => ({ value: String(e.id), label: e.name || e.username }))]}
                />
              )}
              <Input
                type="date"
                value={filters.due_from}
                onChange={(e) => setFilter('due_from', e.target.value)}
                placeholder="Due from"
              />
              <Input
                type="date"
                value={filters.due_to}
                onChange={(e) => setFilter('due_to', e.target.value)}
                placeholder="Due to"
              />
              <Input
                value={filters.project}
                onChange={(e) => setFilter('project', e.target.value)}
                placeholder="Filter by project…"
                list="task-projects"
              />
              <button
                onClick={() => setFilters({ search: '', status_slug: '', priority: '', project: '', assigned_to: '', due_from: '', due_to: '', my_tasks: false, page: 1 })}
                className="text-sm text-gray-500 hover:text-gray-700 text-left"
              >
                Clear filters
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Tag size={40} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium">No tasks found</p>
              <p className="text-xs mt-1">
                Try adjusting filters{canCreateTask ? ' or create a new task' : ''}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Task</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Priority</th>
                    {isAdmin && <th className="px-4 py-3">Assigned To</th>}
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Attachments</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/tasks/${task.id}`)}
                    >
                      <td className="px-4 py-3 max-w-xs">
                        <p className="font-medium text-gray-900 truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{task.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: task.status?.color || '#6B7280' }}
                        >
                          {task.status?.title || task.status_slug}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_STYLES[task.priority] || ''}`}>
                          {task.priority}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-gray-600">
                          {(() => {
                            const assignees = task.assignees?.length
                              ? task.assignees
                              : task.assignee
                                ? [task.assignee]
                                : [];
                            if (!assignees.length) return <span className="text-gray-300">Unassigned</span>;
                            const first = assignees[0];
                            const extra = assignees.length - 1;
                            return (
                              <span
                                className="flex items-center gap-1"
                                title={assignees.map((a) => a?.name || a?.username).filter(Boolean).join(', ')}
                              >
                                <User size={12} className="text-gray-400" />
                                {first?.name || first?.username}
                                {extra > 0 && <span className="text-xs text-gray-400">+{extra}</span>}
                              </span>
                            );
                          })()}
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-500 text-xs">{task.project || '-'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {taskService.normalizeAttachments(task.attachments).length ? (
                          <div className="flex flex-col gap-1">
                            {taskService.normalizeAttachments(task.attachments).slice(0, 2).map((attachment, index) => {
                              const fileName = attachment.original_name || attachment.file_name || attachment.stored_file_name || `Attachment ${index + 1}`;
                              return (
                                <a
                                  key={`${task.id}-${attachment.stored_file_name}-${index}`}
                                  href={taskService.getAttachmentDownloadUrl(attachment.stored_file_name)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="truncate text-blue-600 hover:underline"
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  {fileName}
                                </a>
                              );
                            })}
                            {taskService.normalizeAttachments(task.attachments).length > 2 ? (
                              <span className="text-[11px] text-gray-400">+{taskService.normalizeAttachments(task.attachments).length - 2} more</span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {task.due_date ? (
                          <span className={`flex items-center gap-1 text-xs ${isOverdue(task.due_date) && task.status_slug !== 'done' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            <Calendar size={12} />
                            {fmtDate(task.due_date)}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => router.push(`/tasks/${task.id}`)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Eye size={14} />
                          </button>
                          {canDeleteTask && (
                            <button
                              onClick={() => setDeleting(task)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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
            </div>
          )}

          {meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-500">
              <span>
                {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={meta.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                  className="p-1.5 border rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  disabled={meta.page >= meta.pages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                  className="p-1.5 border rounded hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={canCreateTask && showCreate} onClose={() => setShowCreate(false)} title="Create New Task">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Task title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the task…"
            />
          </div>
          <FileAttachmentsField
            files={attachmentFiles}
            disabled={saving}
            uploadProgress={uploadProgress}
            hint="Attach supporting files. Unsafe executables are blocked and each file must be under 25MB."
            onFilesSelected={(fileList) => {
              if (!fileList) return;
              const nextFiles = [...attachmentFiles, ...Array.from(fileList)];
              const validationError = validateTaskAttachments(nextFiles);
              if (validationError) {
                showToast(validationError, 'error');
                return;
              }
              setAttachmentFiles(nextFiles);
            }}
            onRemoveFile={(index) =>
              setAttachmentFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Select
                value={form.status_slug}
                onChange={(val) => setForm((f) => ({ ...f, status_slug: val as string }))}
                options={statuses.filter((s) => s.is_active).map((s) => ({ value: s.slug, label: s.title }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <Select
                value={form.priority}
                onChange={(val) => setForm((f) => ({ ...f, priority: val as string }))}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <Select
                value=""
                placeholder={form.assigned_to_ids.length ? 'Add another…' : 'Select assignees'}
                onChange={(val) => {
                  const id = Number(val);
                  if (!id) return;
                  setForm((f) =>
                    f.assigned_to_ids.includes(id)
                      ? f
                      : { ...f, assigned_to_ids: [...f.assigned_to_ids, id] }
                  );
                }}
                options={employees.map((e) => ({ value: String(e.id), label: e.name || e.username }))}
              />
              {form.assigned_to_ids.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.assigned_to_ids.map((id) => {
                    const emp = employees.find((e) => e.id === id);
                    const label = emp?.name || emp?.username || `#${id}`;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                      >
                        {label}
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              assigned_to_ids: f.assigned_to_ids.filter((x) => x !== id),
                            }))
                          }
                          className="p-0.5 text-gray-400 hover:text-gray-700"
                          aria-label={`Remove ${label}`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <Input value={form.project} onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))} placeholder="Project name" list="task-projects" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Est. Hours</label>
              <Input type="number" min="0" step="0.5" value={form.estimated_hours} onChange={(e) => setForm((f) => ({ ...f, estimated_hours: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowCreate(false); setAttachmentFiles([]); setUploadProgress(null); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create Task'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={canDeleteTask && !!deleting} onClose={() => setDeleting(null)} title="Delete Task">
        <p className="text-sm text-gray-600 mb-4">
          Delete task <span className="font-semibold">"{deleting?.title}"</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
