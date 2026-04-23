import api from '@/lib/api';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskStatusObj {
  slug: string;
  title: string;
  color: string;
}

export interface TaskStatusMaster {
  id: number;
  title: string;
  slug: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface TaskUser {
  id: number;
  username: string;
  name: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  project?: string;
  priority: TaskPriority;
  status_slug: string;
  status: TaskStatusObj;
  assigned_to?: number;
  assigned_to_ids?: number[];
  assignee?: TaskUser;
  assignees?: TaskUser[];
  created_by?: number;
  creator?: TaskUser;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  attachments?: TaskAttachment[];
  created_at?: string;
  updated_at?: string;
}

export interface TaskAttachment {
  id?: number;
  file_name?: string;
  original_name?: string;
  stored_file_name: string;
  file_size?: number;
  content_type?: string;
  uploaded_at?: string;
  created_at?: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id?: number;
  user?: TaskUser;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskActivity {
  id: number;
  task_id: number;
  user?: TaskUser;
  action: string;
  field?: string;
  old_value?: string;
  new_value?: string;
  created_at?: string;
}

export interface TaskListParams {
  search?: string;
  status_slug?: string;
  priority?: string;
  project?: string;
  assigned_to?: number;
  due_from?: string;
  due_to?: string;
  my_tasks?: boolean;
  page?: number;
  limit?: number;
}

type TaskWritePayload = Partial<Task> & { status_slug?: string };

const normalizeTaskAttachments = (value: unknown): TaskAttachment[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is TaskAttachment =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as TaskAttachment).stored_file_name === 'string'
    );
  }

  if (value && typeof value === 'object' && Array.isArray((value as { attachments?: unknown[] }).attachments)) {
    return normalizeTaskAttachments((value as { attachments?: unknown[] }).attachments);
  }

  return [];
};

const appendMultipartValue = (formData: FormData, key: string, value: unknown) => {
  if (typeof value === 'undefined' || value === null || value === '') return;
  if (Array.isArray(value)) {
    formData.append(key, JSON.stringify(value));
    return;
  }
  formData.append(key, String(value));
};

const buildTaskMultipartFormData = (payload: TaskWritePayload, attachments: File[]) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => appendMultipartValue(formData, key, value));
  attachments.forEach((file) => formData.append('attachments', file));
  return formData;
};

const taskService = {
  list: (params: TaskListParams = {}) =>
    api.get('/tasks', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get(`/tasks/${id}`).then((r) => r.data),

  create: (data: TaskWritePayload) =>
    api.post('/tasks', data).then((r) => r.data),

  createWithAttachments: (
    formData: FormData,
    onUploadProgress?: (progress: number) => void
  ) =>
    api.post('/tasks/with-attachments', formData, {
      onUploadProgress: (event) => {
        if (!event.total || !onUploadProgress) return;
        onUploadProgress(Math.round((event.loaded * 100) / event.total));
      },
    }).then((r) => r.data),

  createTask: async (
    payload: TaskWritePayload,
    attachments: File[] = [],
    onUploadProgress?: (progress: number) => void
  ) => {
    if (attachments.length === 0) {
      const response = await taskService.create(payload);
      return response;
    }

    const formData = buildTaskMultipartFormData(payload, attachments);
    return taskService.createWithAttachments(formData, onUploadProgress);
  },

  update: (id: number, data: TaskWritePayload) =>
    api.put(`/tasks/${id}`, data).then((r) => r.data),

  uploadAttachments: (
    taskId: number,
    formData: FormData,
    onUploadProgress?: (progress: number) => void
  ) => {
    const fileEntries = Array.from(formData.getAll('attachments')).filter((entry) => entry instanceof File);
    if (fileEntries.length === 0) {
      return Promise.reject({ message: 'Please select at least one attachment before uploading.' });
    }

    return api.post(`/tasks/${taskId}/attachments`, formData, {
      onUploadProgress: (event) => {
        if (!event.total || !onUploadProgress) return;
        onUploadProgress(Math.round((event.loaded * 100) / event.total));
      },
    }).then((r) => r.data);
  },

  getAttachments: (taskId: number) =>
    api.get(`/tasks/${taskId}/attachments`).then((r) => normalizeTaskAttachments(r.data)),

  getAttachmentDownloadUrl: (storedFileName: string) =>
    `${api.defaults.baseURL}/tasks/attachments/${encodeURIComponent(storedFileName)}`,

  normalizeAttachments: normalizeTaskAttachments,

  delete: (id: number) =>
    api.delete(`/tasks/${id}`).then((r) => r.data),

  addComment: (taskId: number, content: string) =>
    api.post(`/tasks/${taskId}/comments`, { content }).then((r) => r.data),

  deleteComment: (taskId: number, commentId: number) =>
    api.delete(`/tasks/${taskId}/comments/${commentId}`).then((r) => r.data),

  employees: () =>
    api.get('/tasks/meta/employees').then((r) => r.data as TaskUser[]),

  projects: () =>
    api.get('/tasks/meta/projects').then((r) => r.data as string[]),

  listStatuses: () =>
    api.get('/task-statuses').then((r) => r.data as TaskStatusMaster[]),

  createStatus: (data: { title: string; color?: string; sort_order?: number }) =>
    api.post('/task-statuses', data).then((r) => r.data),

  updateStatus: (id: number, data: { title: string; color?: string; sort_order?: number; is_active?: boolean }) =>
    api.put(`/task-statuses/${id}`, data).then((r) => r.data),

  deleteStatus: (id: number) =>
    api.delete(`/task-statuses/${id}`).then((r) => r.data),
};

export default taskService;
