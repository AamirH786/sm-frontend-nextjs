'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import usePermission from '@/hooks/usePermission';
import { useToast } from '@/context/ToastContext';
import taskService, { Task, TaskComment, TaskActivity, TaskAttachment, TaskUser } from '@/services/taskService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import FileAttachmentsField from '@/components/ui/FileAttachmentsField';
import {
  ArrowLeft, Edit2, Check, X, Send,
  Clock, User, Calendar, Flag, Tag, Activity, Download
} from 'lucide-react';

const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const ACTIVITY_ICONS: Record<string, string> = {
  created: '🚀',
  updated: '✏️',
  commented: '💬',
};

const fmtTime = (iso?: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const fmtField = (f?: string) => {
  if (!f) return '';
  return f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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

const appendAttachmentFiles = (formData: FormData, files: File[]) => {
  files.forEach((file) => formData.append('attachments', file));
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { can } = usePermission();
  const { showToast } = useToast();
  const taskId = Number(params.id);
  const isAdmin = user?.role?.is_super_admin || false;
  const currentUserId = user?.id ?? user?.user_id;
  const canCreateTask = can('tasks', 'create');
  const canUpdateTask = can('tasks', 'update');
  const canManageAssignments = isAdmin || canCreateTask;

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState<number | null>(null);
  const [allStatuses, setAllStatuses] = useState<{ slug: string; title: string; color: string }[]>([]);
  const [employees, setEmployees] = useState<TaskUser[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const [comment, setComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [detail, emps, projs] = await Promise.all([
        taskService.get(taskId),
        canManageAssignments ? taskService.employees().catch(() => []) : Promise.resolve([]),
        taskService.projects().catch(() => []),
      ]);
      const attachmentResponse = await taskService.getAttachments(taskId).catch(() => detail.task.attachments || []);
      const normalizedAttachments = taskService.normalizeAttachments(attachmentResponse);
      setTask(detail.task);
      setComments(detail.comments);
      setActivities(detail.activities);
      setAttachments(normalizedAttachments.length ? normalizedAttachments : taskService.normalizeAttachments(detail.task.attachments));
      setAllStatuses(detail.all_statuses || []);
      setEmployees(emps);
      setProjects((projs || []).slice().sort((a, b) => a.localeCompare(b)));
      setEditForm({
        title: detail.task.title,
        description: detail.task.description || '',
        project: detail.task.project || '',
        priority: detail.task.priority,
        status_slug: detail.task.status_slug,
        assigned_to_ids: (detail.task.assigned_to_ids?.length
          ? detail.task.assigned_to_ids
          : detail.task.assigned_to
            ? [detail.task.assigned_to]
            : []) as number[],
        due_date: detail.task.due_date || '',
        estimated_hours: detail.task.estimated_hours || '',
        actual_hours: detail.task.actual_hours || '',
      });
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to load task', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [taskId]);

  const handleSave = async () => {
    if (!editForm.title?.trim()) { showToast('Title is required', 'error'); return; }
    const attachmentError = validateTaskAttachments(newAttachmentFiles);
    if (attachmentError) {
      showToast(attachmentError, 'error');
      return;
    }
    try {
      setSaving(true);
      const newProject = String(editForm.project || '').trim();
      const payload: any = {
        title: editForm.title,
        description: editForm.description || null,
        project: newProject || null,
        priority: editForm.priority,
        status_slug: editForm.status_slug,
        ...(canManageAssignments
          ? {
              assigned_to_ids: Array.from(
                new Set(
                  (Array.isArray(editForm.assigned_to_ids) ? editForm.assigned_to_ids : [])
                    .map((x: any) => Number(x))
                    .filter((x: any) => Number.isFinite(x) && x > 0)
                )
              ),
            }
          : {}),
        due_date: editForm.due_date || null,
        estimated_hours: editForm.estimated_hours ? Number(editForm.estimated_hours) : null,
        actual_hours: editForm.actual_hours ? Number(editForm.actual_hours) : null,
      };
      const res = await taskService.update(taskId, payload);
      if (newAttachmentFiles.length > 0) {
        const formData = new FormData();
        appendAttachmentFiles(formData, newAttachmentFiles);
        await taskService.uploadAttachments(taskId, formData, setAttachmentUploadProgress);
      }
      setTask(res.task);
      if (newProject) {
        setProjects((prev) =>
          prev.includes(newProject) ? prev : [...prev, newProject].sort((a, b) => a.localeCompare(b))
        );
      }
      setActivities((prev) => {
        load();
        return prev;
      });
      showToast('Task updated', 'success');
      setEditMode(false);
      setNewAttachmentFiles([]);
      setAttachmentUploadProgress(null);
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Update failed', 'error');
    } finally {
      setSaving(false);
      setAttachmentUploadProgress(null);
    }
  };

  const handleQuickStatusChange = async (newSlug: string) => {
    if (!task) return;
    try {
      const res = await taskService.update(taskId, { status_slug: newSlug } as any);
      setTask(res.task);
      load();
      showToast('Status updated', 'success');
    } catch (e: any) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    try {
      setPostingComment(true);
      const res = await taskService.addComment(taskId, comment);
      setComments((c) => [...c, res.comment]);
      setActivities((a) => [
        { id: Date.now(), task_id: taskId, user: res.comment.user, action: 'commented', new_value: comment.slice(0, 80), created_at: new Date().toISOString() },
        ...a,
      ]);
      setComment('');
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to post comment', 'error');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await taskService.deleteComment(taskId, commentId);
      setComments((c) => c.filter((x) => x.id !== commentId));
      showToast('Comment deleted', 'success');
    } catch {
      showToast('Failed to delete comment', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return <div className="px-10 py-6 text-gray-500">Task not found.</div>;
  }

  const formatActivityValue = (field?: string, value?: string) => {
    if (!value) return '';
    if (field !== 'assigned_to') return value;

    const raw = String(value).trim();
    if (!/^\d+(?:\s*,\s*\d+)*$/.test(raw)) return raw;

    const ids = raw
      .split(',')
      .map((x) => Number(x.trim()))
      .filter((x) => Number.isFinite(x) && x > 0);

    const usersById = new Map<number, TaskUser>();
    const candidates = [
      ...(employees || []),
      ...((task.assignees as TaskUser[]) || []),
      ...(task.assignee ? [task.assignee] : []),
    ];
    for (const u of candidates) {
      if (u?.id) usersById.set(u.id, u);
    }

    return ids
      .map((id) => {
        const u = usersById.get(id);
        const label = u?.name || u?.username;
        return label ? `${label} (#${id})` : `#${id}`;
      })
      .join(', ');
  };

  const isAssignee =
    !!currentUserId &&
    (task.assigned_to === currentUserId || task.assigned_to_ids?.includes(currentUserId));
  const isCreator = !!currentUserId && task.created_by === currentUserId;
  const canEditTask = canUpdateTask && (isAdmin || isAssignee || isCreator);
  const canManageComments = canUpdateTask;

  return (
    <div className="px-6 md:px-10 py-6 max-w-6xl mx-auto">
      <datalist id="task-projects">
        {projects.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/tasks')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          {editMode ? (
            <Input
              value={editForm.title}
              onChange={(e) => setEditForm((f: any) => ({ ...f, title: e.target.value }))}
              className="text-lg font-bold"
            />
          ) : (
            <h1 className="text-lg font-bold text-gray-900 truncate">{task.title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editMode ? (
            <>
              <Button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5">
                <Check size={14} />
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => { setEditMode(false); setNewAttachmentFiles([]); setAttachmentUploadProgress(null); }} className="flex items-center gap-1.5">
                <X size={14} />
                Cancel
              </Button>
            </>
          ) : (
            canEditTask && (
              <Button variant="outline" onClick={() => setEditMode(true)} className="flex items-center gap-1.5">
                <Edit2 size={14} />
                Edit
              </Button>
            )
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              {editMode ? (
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  rows={5}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
                  placeholder="Add a description…"
                />
              ) : (
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {task.description || <span className="text-gray-300 italic">No description</span>}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Attachments</h3>
              {editMode ? (
                <FileAttachmentsField
                  files={newAttachmentFiles}
                  existingAttachments={attachments}
                  disabled={saving}
                  uploadProgress={attachmentUploadProgress}
                  hint="Add more files while editing. Existing attachments remain available for download."
                  onFilesSelected={(fileList) => {
                    if (!fileList) return;
                    const nextFiles = [...newAttachmentFiles, ...Array.from(fileList)];
                    const validationError = validateTaskAttachments(nextFiles);
                    if (validationError) {
                      showToast(validationError, 'error');
                      return;
                    }
                    setNewAttachmentFiles(nextFiles);
                  }}
                  onRemoveFile={(index) =>
                    setNewAttachmentFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))
                  }
                  getDownloadUrl={(storedFileName) => taskService.getAttachmentDownloadUrl(storedFileName)}
                />
              ) : attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((attachment, index) => {
                    const fileName = attachment.original_name || attachment.file_name || attachment.stored_file_name || `Attachment ${index + 1}`;
                    return (
                      <a
                        key={`${attachment.id ?? attachment.stored_file_name}-${index}`}
                        href={taskService.getAttachmentDownloadUrl(attachment.stored_file_name)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                      >
                        <span className="truncate">{fileName}</span>
                        <Download size={14} />
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No attachments added yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Send size={14} />
                Comments ({comments.length})
              </h3>

              <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No comments yet. Be the first!</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-600">
                        {(c.user?.name || c.user?.username || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs font-semibold text-gray-800">
                            {c.user?.name || c.user?.username || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-400">{fmtTime(c.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                        {canManageComments && (isAdmin || c.user_id === currentUserId) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-xs text-red-400 hover:text-red-600 mt-1"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {canManageComments ? (
                <div className="flex gap-2">
                  <textarea
                    ref={commentRef}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) handleComment();
                    }}
                  />
                  <button
                    onClick={handleComment}
                    disabled={postingComment || !comment.trim()}
                    className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors self-end"
                  >
                    <Send size={16} />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">You do not have permission to comment on this task.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                <Activity size={14} />
                Activity Log
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {activities.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No activity yet</p>
                ) : (
                  activities.map((a) => (
                    <div key={a.id} className="flex gap-2 text-xs">
                      <span className="mt-0.5 flex-shrink-0">{ACTIVITY_ICONS[a.action] || '📌'}</span>
                      <div>
                        <span className="font-medium text-gray-800">{a.user?.name || a.user?.username || 'System'}</span>{' '}
                        <span className="text-gray-500">
                          {a.action === 'created' && 'created this task'}
                          {a.action === 'commented' && <>commented: <em>"{a.new_value}"</em></>}
                          {a.action === 'updated' && a.field && (
                            <>
                              changed <strong>{fmtField(a.field)}</strong>
                              {a.old_value && a.old_value !== 'None' ? (
                                <> from <em>{formatActivityValue(a.field, a.old_value)}</em></>
                              ) : (
                                ''
                              )}
                              {a.new_value ? <> to <em>{formatActivityValue(a.field, a.new_value)}</em></> : ''}
                            </>
                          )}
                        </span>
                        <p className="text-gray-400 mt-0.5">{fmtTime(a.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Status</p>
                {editMode ? (
                  <Select
                    value={editForm.status_slug}
                    onChange={(val) => setEditForm((f: any) => ({ ...f, status_slug: val }))}
                    options={allStatuses.map((s) => ({ value: s.slug, label: s.title }))}
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {allStatuses.map((s) => (
                      <button
                        key={s.slug}
                        onClick={() => canEditTask && handleQuickStatusChange(s.slug)}
                        disabled={!canEditTask}
                        className={`px-3 py-1 rounded-full text-xs font-medium text-white transition-opacity ${task.status_slug === s.slug ? 'opacity-100 ring-2 ring-offset-1' : 'opacity-50 hover:opacity-80'} ${!canEditTask ? 'cursor-not-allowed' : ''}`}
                        style={{ backgroundColor: s.color, outlineColor: s.color }}
                      >
                        {s.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Priority</p>
                {editMode ? (
                  <Select
                    value={editForm.priority}
                    onChange={(val) => setEditForm((f: any) => ({ ...f, priority: val }))}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' },
                      { value: 'urgent', label: 'Urgent' },
                    ]}
                  />
                ) : (
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_STYLES[task.priority] || ''}`}>
                    <Flag size={11} className="mr-1 mt-0.5" />
                    {task.priority}
                  </span>
                )}
              </div>

              {(isAdmin || canEditTask) && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Assigned To</p>
                  {editMode ? (
                    canManageAssignments ? (
                      <>
                        <Select
                          value=""
                          placeholder={editForm.assigned_to_ids?.length ? 'Add another…' : 'Select assignees'}
                          onChange={(val) => {
                            const id = Number(val);
                            if (!id) return;
                            setEditForm((f: any) => {
                              const prev = Array.isArray(f.assigned_to_ids) ? (f.assigned_to_ids as number[]) : [];
                              return prev.includes(id) ? f : { ...f, assigned_to_ids: [...prev, id] };
                            });
                          }}
                          options={employees.map((e) => ({ value: String(e.id), label: e.name || e.username }))}
                        />
                        {Array.isArray(editForm.assigned_to_ids) && editForm.assigned_to_ids.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {editForm.assigned_to_ids.map((id: number) => {
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
                                      setEditForm((f: any) => ({
                                        ...f,
                                        assigned_to_ids: (Array.isArray(f.assigned_to_ids) ? f.assigned_to_ids : []).filter(
                                          (x: number) => x !== id
                                        ),
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
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <User size={14} className="text-gray-400" />
                        {(task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : []).length
                          ? (task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : [])
                              .map((a) => a?.name || a?.username)
                              .filter(Boolean)
                              .join(', ')
                          : <span className="text-gray-400">Unassigned</span>}
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <User size={14} className="text-gray-400" />
                      {(task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : []).length ? (
                        <span
                          title={(task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : [])
                            .map((a) => a?.name || a?.username)
                            .filter(Boolean)
                            .join(', ')}
                        >
                          {(task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : [])
                            .map((a) => a?.name || a?.username)
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Due Date</p>
                {editMode ? (
                  <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm((f: any) => ({ ...f, due_date: e.target.value }))} />
                ) : (
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Calendar size={14} className="text-gray-400" />
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : <span className="text-gray-400">Not set</span>}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Project</p>
                {editMode ? (
                  <Input value={editForm.project} onChange={(e) => setEditForm((f: any) => ({ ...f, project: e.target.value }))} placeholder="Project name" list="task-projects" />
                ) : (
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Tag size={14} className="text-gray-400" />
                    {task.project || <span className="text-gray-400">None</span>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Est. Hours</p>
                  {editMode ? (
                    <Input type="number" min="0" step="0.5" value={editForm.estimated_hours} onChange={(e) => setEditForm((f: any) => ({ ...f, estimated_hours: e.target.value }))} placeholder="0" />
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <Clock size={14} className="text-gray-400" />
                      {task.estimated_hours ?? <span className="text-gray-400">-</span>}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Actual Hours</p>
                  {editMode ? (
                    <Input type="number" min="0" step="0.5" value={editForm.actual_hours} onChange={(e) => setEditForm((f: any) => ({ ...f, actual_hours: e.target.value }))} placeholder="0" />
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <Clock size={14} className="text-gray-400" />
                      {task.actual_hours ?? <span className="text-gray-400">-</span>}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4 space-y-1.5 text-xs text-gray-400">
              <p>Created by <span className="text-gray-700 font-medium">{task.creator?.name || task.creator?.username || '-'}</span></p>
              <p>Created at <span className="text-gray-700">{fmtTime(task.created_at)}</span></p>
              {task.updated_at && <p>Last updated <span className="text-gray-700">{fmtTime(task.updated_at)}</span></p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
