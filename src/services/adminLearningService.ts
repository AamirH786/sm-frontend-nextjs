import api from '@/lib/api';

type Id = number;

const getTenantHeaders = () => {
  if (typeof window === 'undefined') return undefined;

  try {
    const rawUser = localStorage.getItem('sm_user');
    if (!rawUser) return undefined;
    const user = JSON.parse(rawUser) as Record<string, unknown>;
    const tenant = user.tenant as Record<string, unknown> | undefined;
    const tenantId = user.tenant_id ?? user.tenantId ?? tenant?.id;
    if (typeof tenantId === 'number' || typeof tenantId === 'string') {
      return { 'X-Tenant-Id': String(tenantId) };
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const adminRequest = {
  get: async <T>(path: string) => {
    const response = await api.get<T>(`/admin${path}`, { headers: getTenantHeaders() });
    return response.data;
  },
  post: async <T>(path: string, payload: unknown) => {
    const response = await api.post<T>(`/admin${path}`, payload, { headers: getTenantHeaders() });
    return response.data;
  },
  put: async <T>(path: string, payload: unknown) => {
    const response = await api.put<T>(`/admin${path}`, payload, { headers: getTenantHeaders() });
    return response.data;
  },
  delete: async <T>(path: string) => {
    const response = await api.delete<T>(`/admin${path}`, { headers: getTenantHeaders() });
    return response.data;
  },
};

export interface IntentFlowConfigPayload {
  entry_type: string;
  enable_diagnostic: boolean;
  enable_course: boolean;
  enable_avatar: boolean;
  enable_checkpoint: boolean;
  default_level_id?: number | null;
  config: Record<string, unknown>;
}

export interface Intent {
  id: Id;
  tenant_id?: number | null;
  name: string;
  description?: string | null;
  flow_type?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  flow_config?: (IntentFlowConfigPayload & { id: Id; intent_id: Id }) | null;
}

export interface LearningCategory {
  id: Id;
  tenant_id: Id;
  name: string;
  category_type?: string | null;
  is_learning_category?: boolean | null;
  description?: string | null;
  position?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Subject {
  id: Id;
  tenant_id: Id;
  category_id: Id;
  name: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Track {
  id: Id;
  tenant_id: Id;
  subject_id: Id;
  name: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Level {
  id: Id;
  tenant_id: Id;
  name: string;
  order_index: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LearningCourse {
  id: Id;
  tenant_id?: number | null;
  teacher_id: Id;
  category_id: Id;
  subject_id?: Id | null;
  track_id?: Id | null;
  level_id?: Id | null;
  default_avatar_id?: Id | null;
  title: string;
  slug: string;
  short_description?: string | null;
  full_description?: string | null;
  thumbnail?: string | null;
  intro_video_url?: string | null;
  difficulty_level?: string | null;
  estimated_duration_seconds?: number | null;
  status?: number | null;
  visibility?: string | null;
  publish_state?: string | null;
  price?: number | null;
  complimentary_minutes?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LearningModule {
  id: Id;
  course_id?: Id | null;
  title: string;
  slug: string;
  group?: string | null;
  description?: string | null;
  position?: number | null;
  estimated_duration_seconds?: number | null;
  is_locked?: boolean | null;
  status?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LearningSubmodule {
  id: Id;
  module_id: Id;
  title: string;
  summary?: string | null;
  position: number;
  estimated_duration_seconds?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LearningItem {
  id: Id;
  submodule_id: Id;
  type: string;
  title: string;
  description?: string | null;
  position: number;
  estimated_seconds?: number | null;
  weight?: number | null;
  is_mandatory?: boolean | null;
  can_skip?: boolean | null;
  status?: number | null;
  visibility?: number | null;
  meta?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface QuizQuestion {
  id: Id;
  quiz_id: Id;
  question: string;
  question_type: string;
  explanation?: string | null;
  position?: number | null;
  marks?: number | null;
  meta?: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface QuizOption {
  id: Id;
  question_id: Id;
  option_text: string;
  is_correct?: boolean | null;
  position?: number | null;
  meta?: Record<string, unknown> | null;
}

export interface QuizRule {
  id: Id;
  tenant_id: Id;
  item_id: Id;
  pass_score: number;
  max_attempts?: number | null;
  created_at?: string | null;
}

export interface AvatarMapping {
  id: Id;
  tenant_id: Id;
  avatar_id: Id;
  intent_id?: Id | null;
  category_id?: Id | null;
  subject_id?: Id | null;
  track_id?: Id | null;
  level_id?: Id | null;
  priority?: number | null;
  created_at?: string | null;
}

export interface Checkpoint {
  id: Id;
  learning_item_id: Id;
  checkpoint_type?: string | null;
  concept_label?: string | null;
  trigger_second?: number | null;
  difficulty_score?: number | null;
  is_mandatory?: boolean | null;
  assist_mode?: string | null;
  config?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LearningConfig {
  id: Id;
  tenant_id: Id;
  config_key: string;
  config_value: unknown;
  description?: string | null;
  updated_at?: string | null;
}

export interface AvatarSelectionPreviewRequest {
  item_id?: Id | null;
  course_id?: Id | null;
  intent_id?: Id | null;
  category_id?: Id | null;
  subject_id?: Id | null;
  track_id?: Id | null;
  level_id?: Id | null;
}

export interface AvatarSelectionPreviewResponse {
  avatar_id: Id;
  avatar_name: string;
  priority: number;
  source: string;
  mapped_courses: Array<{
    id: Id;
    title: string;
    slug: string;
    subject_id?: Id | null;
    track_id?: Id | null;
    level_id?: Id | null;
  }>;
}

export interface DeleteResponse {
  success: boolean;
  id: Id;
  message: string;
}

type CreateUpdate<TCreate, TUpdate, TEntity> = {
  list: () => Promise<TEntity[]>;
  create: (payload: TCreate) => Promise<TEntity>;
  update: (id: Id, payload: TUpdate) => Promise<TEntity>;
  delete: (id: Id) => Promise<DeleteResponse>;
};

const createCrud = <TCreate, TUpdate, TEntity>(path: string): CreateUpdate<TCreate, TUpdate, TEntity> => ({
  list: () => adminRequest.get<TEntity[]>(path),
  create: (payload) => adminRequest.post<TEntity>(path, payload),
  update: (id, payload) => adminRequest.put<TEntity>(`${path}/${id}`, payload),
  delete: (id) => adminRequest.delete<DeleteResponse>(`${path}/${id}`),
});

export const adminLearningService = {
  intents: createCrud<
    {
      name: string;
      description?: string | null;
      flow_type?: string | null;
      is_active?: boolean;
      flow_config?: IntentFlowConfigPayload | null;
    },
    {
      name?: string | null;
      description?: string | null;
      flow_type?: string | null;
      is_active?: boolean | null;
      flow_config?: IntentFlowConfigPayload | null;
    },
    Intent
  >('/intents'),
  categories: createCrud<
    { name: string; category_type?: string | null; description?: string | null; position?: number },
    { name?: string | null; category_type?: string | null; description?: string | null; position?: number | null },
    LearningCategory
  >('/categories'),
  subjects: createCrud<
    { category_id: Id; name: string; description?: string | null },
    { category_id?: Id | null; name?: string | null; description?: string | null },
    Subject
  >('/subjects'),
  tracks: createCrud<
    { subject_id: Id; name: string; description?: string | null },
    { subject_id?: Id | null; name?: string | null; description?: string | null },
    Track
  >('/tracks'),
  levels: createCrud<
    { name: string; order_index: number },
    { name?: string | null; order_index?: number | null },
    Level
  >('/levels'),
  courses: createCrud<
    Omit<LearningCourse, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>,
    Partial<Omit<LearningCourse, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>,
    LearningCourse
  >('/courses'),
  modules: createCrud<
    Omit<LearningModule, 'id' | 'created_at' | 'updated_at'>,
    Partial<Omit<LearningModule, 'id' | 'created_at' | 'updated_at'>>,
    LearningModule
  >('/modules'),
  submodules: createCrud<
    Omit<LearningSubmodule, 'id' | 'created_at' | 'updated_at'>,
    Partial<Omit<LearningSubmodule, 'id' | 'created_at' | 'updated_at'>>,
    LearningSubmodule
  >('/submodules'),
  learningItems: createCrud<
    {
      submodule_id: Id;
      type: string;
      title: string;
      description?: string | null;
      position: number;
      estimated_seconds?: number | null;
      weight?: number | null;
      is_mandatory?: boolean;
      can_skip?: boolean;
      status?: number;
      visibility?: number;
      metadata?: Record<string, unknown>;
    },
    {
      submodule_id?: Id | null;
      type?: string | null;
      title?: string | null;
      description?: string | null;
      position?: number | null;
      estimated_seconds?: number | null;
      weight?: number | null;
      is_mandatory?: boolean | null;
      can_skip?: boolean | null;
      status?: number | null;
      visibility?: number | null;
      metadata?: Record<string, unknown> | null;
    },
    LearningItem
  >('/learning-items'),
  quizQuestions: createCrud<
    {
      quiz_id: Id;
      question: string;
      question_type: string;
      explanation?: string | null;
      position?: number | null;
      marks?: number | null;
      metadata?: Record<string, unknown>;
    },
    {
      quiz_id?: Id | null;
      question?: string | null;
      question_type?: string | null;
      explanation?: string | null;
      position?: number | null;
      marks?: number | null;
      metadata?: Record<string, unknown> | null;
    },
    QuizQuestion
  >('/quiz-questions'),
  quizOptions: createCrud<
    {
      question_id: Id;
      option_text: string;
      is_correct?: boolean;
      position?: number | null;
      metadata?: Record<string, unknown>;
    },
    {
      question_id?: Id | null;
      option_text?: string | null;
      is_correct?: boolean | null;
      position?: number | null;
      metadata?: Record<string, unknown> | null;
    },
    QuizOption
  >('/quiz-options'),
  quizRules: createCrud<
    { item_id: Id; pass_score: number; max_attempts?: number },
    { item_id?: Id | null; pass_score?: number | null; max_attempts?: number | null },
    QuizRule
  >('/quiz-rules'),
  avatarMappings: createCrud<
    {
      avatar_id: Id;
      intent_id?: Id | null;
      category_id?: Id | null;
      subject_id?: Id | null;
      track_id?: Id | null;
      level_id?: Id | null;
      priority?: number;
    },
    {
      avatar_id?: Id | null;
      intent_id?: Id | null;
      category_id?: Id | null;
      subject_id?: Id | null;
      track_id?: Id | null;
      level_id?: Id | null;
      priority?: number | null;
    },
    AvatarMapping
  >('/avatar-mappings'),
  checkpoints: createCrud<
    {
      learning_item_id: Id;
      checkpoint_type?: string | null;
      concept_label?: string | null;
      trigger_second?: number | null;
      difficulty_score?: number | null;
      is_mandatory?: boolean;
      assist_mode?: string | null;
      config?: Record<string, unknown>;
    },
    {
      learning_item_id?: Id | null;
      checkpoint_type?: string | null;
      concept_label?: string | null;
      trigger_second?: number | null;
      difficulty_score?: number | null;
      is_mandatory?: boolean | null;
      assist_mode?: string | null;
      config?: Record<string, unknown> | null;
    },
    Checkpoint
  >('/checkpoints'),
  configs: createCrud<
    { config_key: string; config_value: unknown; description?: string | null },
    { config_value?: unknown; description?: string | null },
    LearningConfig
  >('/config'),
  avatarRuntime: {
    previewSelection: async (payload: AvatarSelectionPreviewRequest) => {
      const response = await api.post<AvatarSelectionPreviewResponse>('/avatar/select', payload, {
        headers: getTenantHeaders(),
      });
      return response.data;
    },
  },
};

export const findNextPosition = (items: Array<{ position?: number | null }>) =>
  (items.reduce((max, item) => Math.max(max, item.position ?? 0), 0) || 0) + 1;

// ─── Assessment Quiz Types ────────────────────────────────────────────────────
export interface DiagnosticOption {
  text: string;
  is_correct: boolean;
}

export interface DiagnosticQuestion {
  id: number;
  test_id: number;
  question: string;
  difficulty: string;
  level_id: number | null;
  options: DiagnosticOption[];
  created_at: string | null;
}

export interface DiagnosticTest {
  id: number;
  tenant_id: number;
  course_id: number | null;
  title: string | null;
  questions: DiagnosticQuestion[];
  created_at: string | null;
}

export interface LevelMaster {
  id: number;
  name: string;
  order_index: number;
}

// ─── Assessment Quiz Service ──────────────────────────────────────────────────
export const assessmentService = {
  getTest: (courseId: number) =>
    adminRequest.get<DiagnosticTest>(`/courses/${courseId}/assessment`),

  updateTitle: (courseId: number, title: string) =>
    adminRequest.put<DiagnosticTest>(`/courses/${courseId}/assessment/title`, { title }),

  listQuestions: (courseId: number) =>
    adminRequest.get<DiagnosticQuestion[]>(`/courses/${courseId}/assessment/questions`),

  addQuestion: (courseId: number, payload: {
    question: string;
    difficulty: string;
    level_id: number | null;
    options: DiagnosticOption[];
  }) => adminRequest.post<DiagnosticQuestion>(`/courses/${courseId}/assessment/questions`, payload),

  updateQuestion: (qId: number, payload: {
    question?: string;
    difficulty?: string;
    level_id?: number | null;
    options?: DiagnosticOption[];
  }) => adminRequest.put<DiagnosticQuestion>(`/assessment/questions/${qId}`, payload),

  deleteQuestion: (qId: number) =>
    adminRequest.delete<{ success: boolean; id: number }>(`/assessment/questions/${qId}`),
};

// ─── Topic Practice Quiz Types + Service ─────────────────────────────────────
export interface TopicQuizOption {
  id: number;
  option_text: string;
  is_correct: boolean;
  position: number | null;
}

export interface TopicQuizQuestion {
  id: number;
  quiz_id: number;
  question: string;
  question_type: string;
  explanation: string | null;
  marks: number;
  position: number | null;
  options: TopicQuizOption[];
}

export interface TopicQuiz {
  quiz_item_id: number;
  topic_id: number;
  questions: TopicQuizQuestion[];
  pass_score: number;
  max_attempts: number;
}

export const topicQuizService = {
  get: (topicId: number) =>
    adminRequest.get<TopicQuiz>(`/submodules/${topicId}/quiz`),

  addQuestion: (topicId: number, payload: {
    question: string;
    explanation?: string | null;
    marks?: number;
    options: { option_text: string; is_correct: boolean }[];
  }) => adminRequest.post<TopicQuizQuestion>(`/submodules/${topicId}/quiz/questions`, payload),

  updateQuestion: (topicId: number, qId: number, payload: {
    question?: string;
    explanation?: string | null;
    marks?: number;
    options?: { option_text: string; is_correct: boolean }[];
  }) => adminRequest.put<TopicQuizQuestion>(`/submodules/${topicId}/quiz/questions/${qId}`, payload),

  deleteQuestion: (topicId: number, qId: number) =>
    adminRequest.delete<{ success: boolean; id: number }>(`/submodules/${topicId}/quiz/questions/${qId}`),

  updateRules: (topicId: number, pass_score: number, max_attempts: number) =>
    adminRequest.put<{ quiz_item_id: number; pass_score: number; max_attempts: number }>(
      `/submodules/${topicId}/quiz/rules`,
      { pass_score, max_attempts }
    ),
};

// ─── Levels + Module Levels Service ──────────────────────────────────────────
export const levelService = {
  list: () => adminRequest.get<LevelMaster[]>('/levels'),
  getModuleLevels: (moduleId: number) =>
    adminRequest.get<number[]>(`/modules/${moduleId}/levels`),
  setModuleLevels: (moduleId: number, levelIds: number[]) =>
    adminRequest.put<number[]>(`/modules/${moduleId}/levels`, { level_ids: levelIds }),
};
