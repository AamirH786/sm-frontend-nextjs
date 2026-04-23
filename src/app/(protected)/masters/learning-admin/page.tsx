'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Brain,
  CheckSquare,
  Cpu,
  GraduationCap,
  Layers3,
  Link2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import Tooltip from '@/components/ui/Tooltip';
import Modal from '@/components/ui/Modal';
import IconButton from '@/components/ui/IconButton';
import TableActions from '@/components/ui/TableActions';
import ViewDrawer, { type ViewDrawerSection } from '@/components/ui/ViewDrawer';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import AccessDenied from '@/components/permissions/AccessDenied';
import GuidancePanel from '@/components/learning/GuidancePanel';
import RelationshipTree from '@/components/learning/RelationshipTree';
import usePermission from '@/hooks/usePermission';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/context/ToastContext';
import { canAccessRule, mastersSections } from '@/lib/appAccess';
import {
  adminLearningService,
  findNextPosition,
  type AvatarSelectionPreviewResponse,
  type AvatarMapping,
  type Checkpoint,
  type Intent,
  type LearningCategory,
  type LearningConfig,
  type LearningCourse,
  type LearningItem,
  type LearningModule,
  type LearningSubmodule,
  type Level,
  type QuizOption,
  type QuizQuestion,
  type QuizRule,
  type Subject,
  type Track,
} from '@/services/adminLearningService';
import { avatarsService } from '@/services/avatarsService';
import { usersService, type User as AdminUser } from '@/services/rbacService';
import { buildCategorySubjectGroups, dedupeLearningCategories } from '@/lib/learningCategoryHierarchy';
import {
  getBoundLevelsForSubject,
  parseSubjectLevelBindings,
  stringifySubjectLevelBindings,
  SUBJECT_LEVEL_BINDINGS_CONFIG_KEY,
  type SubjectLevelBindings,
} from '@/lib/subjectLevelBindings';

type TabKey =
  | 'overview'
  | 'intents'
  | 'structure'
  | 'courses'
  | 'quiz'
  | 'mappings'
  | 'checkpoints'
  | 'config'
  | 'analytics';

type ResourceKey =
  | 'intent'
  | 'category'
  | 'subject'
  | 'track'
  | 'level'
  | 'course'
  | 'module'
  | 'submodule'
  | 'item'
  | 'question'
  | 'option'
  | 'rule'
  | 'mapping'
  | 'checkpoint'
  | 'config';

type ModalState = {
  resource: ResourceKey;
  mode: 'create' | 'edit';
  values: Record<string, any>;
  id?: number;
};

type DeleteState = {
  resource: ResourceKey;
  id: number;
  title: string;
};

type ViewState = {
  resource: ResourceKey;
  row: Record<string, any>;
  title: string;
  subtitle?: string;
};

type AvatarOption = {
  id: number;
  avatar_name?: string;
};

type ContextMode = 'intents' | 'structure';

const TABS: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: 'overview', label: 'Overview', icon: Sparkles },
  { key: 'intents', label: 'Intent Flow', icon: Brain },
  { key: 'structure', label: 'Learning Structure', icon: Layers3 },
  { key: 'courses', label: 'Course Builder', icon: GraduationCap },
  { key: 'quiz', label: 'Quiz Engine', icon: CheckSquare },
  { key: 'mappings', label: 'Avatar Mapping', icon: Link2 },
  { key: 'checkpoints', label: 'Checkpoints', icon: AlertCircle },
  { key: 'config', label: 'Configurations', icon: Settings2 },
  { key: 'analytics', label: 'Analytics', icon: Cpu },
];

const COURSE_DRAFT_KEY = 'sm_learning_course_draft';
const LEARNING_ADMIN_UI_STATE_KEY = 'sm_learning_admin_ui_state_v1';
const DEFAULT_PHASE_TABS: Record<string, TabKey> = {
  define: 'intents',
  structure: 'structure',
  build: 'courses',
  connect: 'mappings',
  validate: 'quiz',
  preview: 'overview',
  publish: 'config',
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseJsonValue = (value: string, fallback: unknown = {}) => {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return JSON.parse(trimmed);
};

const stringifyJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2);

const truncatePreview = (value?: string | null, limit = 20) => {
  const normalized = value?.trim() ?? '';
  if (!normalized) return 'No description';
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}...`;
};

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  intent: 'Intent',
  category: 'Category',
  subject: 'Sub Category',
  track: 'Specialization',
  level: 'Level',
  course: 'Course',
  module: 'Module',
  submodule: 'Submodule',
  item: 'Item',
  question: 'Question',
  option: 'Option',
  rule: 'Rule',
  mapping: 'Mapping',
  checkpoint: 'Checkpoint',
  config: 'Configuration',
};

const getResourceLabel = (resource: ResourceKey) => RESOURCE_LABELS[resource] ?? resource;

const parseJsonObject = (value: string, fallback: Record<string, unknown> = {}) => {
  try {
    const parsed = parseJsonValue(value, fallback);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : fallback;
  } catch {
    return fallback;
  }
};

const withOptionalValue = (target: Record<string, unknown>, key: string, value: unknown) => {
  if (value === '' || value === null || typeof value === 'undefined') {
    delete target[key];
    return;
  }
  target[key] = value;
};

const parseConfigValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    return JSON.parse(trimmed);
  } catch {
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (!Number.isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed);
    return trimmed;
  }
};

const isTeacherEligibleUser = (user: AdminUser) => {
  const roleSignals = [user.role_title, user.user_type]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();

  return (
    user.status !== 0 &&
    (
      roleSignals.includes('teacher') ||
      roleSignals.includes('instructor') ||
      roleSignals.includes('mentor') ||
      roleSignals.includes('faculty')
    )
  );
};

const levelOptions = (levels: Level[]) =>
  levels
    .slice()
    .sort((a, b) => a.order_index - b.order_index)
    .map((level) => ({ value: level.id, label: `${level.order_index}. ${level.name}` }));

const isLearningEnabledCategory = (category?: LearningCategory | null) => {
  if (!category) return false;
  if (category.is_learning_category === true) return true;
  if (String(category.category_type || '').trim().toLowerCase() === 'learning') return true;
  return category.name.trim().toLowerCase().includes('teacher');
};

const parseDelimitedNames = (value: unknown) =>
  String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const SectionHeader = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="space-y-1">
      <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    {action}
  </div>
);

const StatCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint: string;
}) => (
  <Card className="border-blue-100/80 bg-white/95 shadow-sm shadow-blue-100/40">
    <CardContent className="px-5 py-5">
      <div className="space-y-1">
        <div className="text-sm font-medium text-gray-500">{label}</div>
        <div className="text-3xl font-semibold tracking-tight text-slate-800">{value}</div>
        <div className="text-xs text-gray-400">{hint}</div>
      </div>
    </CardContent>
  </Card>
);

function TableShell({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-blue-100/70 bg-white/95 shadow-[0_24px_50px_rgba(37,99,235,0.08)]">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="sticky top-0 z-10 bg-blue-50/85 backdrop-blur-sm">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white [&>tr:nth-child(even)]:bg-slate-50/40 [&>tr:hover]:bg-blue-50/40 [&>tr]:transition-colors">
          {children}
        </tbody>
      </table>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-blue-200/90 bg-gradient-to-br from-blue-50 via-white to-slate-50 px-6 py-10 text-center shadow-inner shadow-blue-100/40">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="mt-1 text-sm leading-relaxed text-slate-500">{description}</div>
      {action ? (
        <div className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Next: {action}
        </div>
      ) : null}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-blue-100/80 bg-white p-5 shadow-sm shadow-blue-100/30">
          <div className="h-3 w-24 rounded bg-blue-100" />
          <div className="mt-4 h-8 w-16 rounded bg-blue-200" />
          <div className="mt-3 h-3 w-32 rounded bg-blue-100" />
        </div>
      ))}
    </div>
  );
}

function AddActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled}
      size="md"
      className="h-9 w-auto whitespace-nowrap rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-100 transition-all duration-200 hover:bg-blue-700 active:translate-y-px disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
    >
      <Plus size={16} className="mr-2" />
      {label}
    </Button>
  );
}

export default function LearningAdminPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { can } = usePermission();
  const accessRule = mastersSections.find((section) => section.href === '/masters/learning-admin')?.access;
  const hasPageAccess = canAccessRule(accessRule, user, can);
  const canCreate = can('learning_admin', 'create');
  const canUpdate = can('learning_admin', 'update');
  const canDelete = can('learning_admin', 'delete');

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalErrors, setModalErrors] = useState<Record<string, string>>({});
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const [viewState, setViewState] = useState<ViewState | null>(null);

  const [intents, setIntents] = useState<Intent[]>([]);
  const [categories, setCategories] = useState<LearningCategory[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [courses, setCourses] = useState<LearningCourse[]>([]);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [submodules, setSubmodules] = useState<LearningSubmodule[]>([]);
  const [items, setItems] = useState<LearningItem[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [options, setOptions] = useState<QuizOption[]>([]);
  const [rules, setRules] = useState<QuizRule[]>([]);
  const [avatarMappings, setAvatarMappings] = useState<AvatarMapping[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [configs, setConfigs] = useState<LearningConfig[]>([]);
  const [subjectLevelBindings, setSubjectLevelBindings] = useState<SubjectLevelBindings>({});
  const [avatars, setAvatars] = useState<AvatarOption[]>([]);
  const [teachers, setTeachers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [mappingPreview, setMappingPreview] = useState<AvatarSelectionPreviewResponse | null>(null);
  const [mappingPreviewLoading, setMappingPreviewLoading] = useState(false);
  const [showContextDetails, setShowContextDetails] = useState(false);
  const [showRuntimePanel, setShowRuntimePanel] = useState(false);
  const [lastPhaseTabByStep, setLastPhaseTabByStep] = useState<Record<string, TabKey>>(DEFAULT_PHASE_TABS);
  const [activeContextMode, setActiveContextMode] = useState<ContextMode>('intents');
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [openSubCategoryGroups, setOpenSubCategoryGroups] = useState<number[]>([]);
  const [mappingPreviewForm, setMappingPreviewForm] = useState<{
    course_id: number | '';
    intent_id: number | '';
    category_id: number | '';
    subject_id: number | '';
    track_id: number | '';
    level_id: number | '';
  }>({
    course_id: '',
    intent_id: '',
    category_id: '',
    subject_id: '',
    track_id: '',
    level_id: '',
  });

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [selectedSubmoduleId, setSelectedSubmoduleId] = useState<number | null>(null);
  const [selectedQuizItemId, setSelectedQuizItemId] = useState<number | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);

  const flowSteps = [
    { key: 'define', label: 'Define', hint: 'Set learner entry behavior and routing rules.' },
    { key: 'structure', label: 'Structure', hint: 'Define category and sub category, then seed specialization and level from the right place.' },
    { key: 'build', label: 'Build', hint: 'Create courses, modules, submodules, and items.' },
    { key: 'connect', label: 'Connect', hint: 'Link avatars and checkpoints to learning context.' },
    { key: 'validate', label: 'Validate', hint: 'Check quiz rules, gaps, and readiness.' },
    { key: 'preview', label: 'Preview', hint: 'Inspect backend avatar selection and chain.' },
    { key: 'publish', label: 'Publish', hint: 'Confirm state before learner-facing rollout.' },
  ] as const;

  const categoryMap = useMemo(() => new Map(categories.map((row) => [row.id, row])), [categories]);
  const subjectMap = useMemo(() => new Map(subjects.map((row) => [row.id, row])), [subjects]);
  const trackMap = useMemo(() => new Map(tracks.map((row) => [row.id, row])), [tracks]);
  const levelMap = useMemo(() => new Map(levels.map((row) => [row.id, row])), [levels]);
  const courseMap = useMemo(() => new Map(courses.map((row) => [row.id, row])), [courses]);
  const avatarMap = useMemo(() => new Map(avatars.map((row) => [row.id, row])), [avatars]);
  const displayCategories = useMemo(
    () => dedupeLearningCategories(categories, subjects, tracks, courses),
    [categories, courses, subjects, tracks]
  );
  const categoryOptions = useMemo(
    () => displayCategories.map((row) => ({ value: row.id, label: row.name })),
    [displayCategories]
  );
  const categorySubjectGroups = useMemo(
    () => buildCategorySubjectGroups(displayCategories, subjects),
    [displayCategories, subjects]
  );
  const subjectModalCategory = useMemo(() => {
    if (modal?.resource !== 'subject') return null;
    return categoryMap.get(Number(modal.values.category_id || 0)) ?? null;
  }, [categoryMap, modal]);
  const subjectModalNeedsLearningSetup = Boolean(
    modal?.resource === 'subject' && isLearningEnabledCategory(subjectModalCategory)
  );
  const subjectModalLinkedTracks = useMemo(() => {
    if (modal?.resource !== 'subject' || !modal.id) return [];
    return tracks.filter((track) => Number(track.subject_id) === Number(modal.id));
  }, [modal, tracks]);
  const subjectModalExistingTrackNames = useMemo(
    () => subjectModalLinkedTracks.map((track) => track.name),
    [subjectModalLinkedTracks]
  );
  const subjectModalLinkedLevels = useMemo(
    () => getBoundLevelsForSubject(modal?.resource === 'subject' ? modal.id : null, subjectLevelBindings, levels),
    [levels, modal, subjectLevelBindings]
  );
  const subjectModalRequiresSpecialization = Boolean(
    subjectModalNeedsLearningSetup && (modal?.mode === 'create' || subjectModalLinkedTracks.length === 0)
  );
  const subjectModalRequiresLevels = Boolean(
    subjectModalNeedsLearningSetup && (modal?.mode === 'create' || subjectModalLinkedLevels.length === 0)
  );
  const teacherOptions = useMemo(
    () =>
      teachers
        .map((row) => ({ value: row.id, label: row.name || row.email || row.username }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [teachers]
  );

  const selectedCourse = courses.find((row) => row.id === selectedCourseId) ?? null;
  const previewCourse = courses.find((row) => row.id === Number(mappingPreviewForm.course_id || 0)) ?? null;
  const filteredModules = modules
    .filter((row) => row.course_id === selectedCourseId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const selectedModule = filteredModules.find((row) => row.id === selectedModuleId) ?? null;
  const filteredSubmodules = submodules
    .filter((row) => row.module_id === selectedModuleId)
    .sort((a, b) => a.position - b.position);
  const selectedSubmodule = filteredSubmodules.find((row) => row.id === selectedSubmoduleId) ?? null;
  const filteredItems = items
    .filter((row) => row.submodule_id === selectedSubmoduleId)
    .sort((a, b) => a.position - b.position);
  const quizItems = items.filter((row) => row.type === 'quiz').sort((a, b) => a.title.localeCompare(b.title));
  const filteredQuestions = questions
    .filter((row) => row.quiz_id === selectedQuizItemId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const filteredOptions = options
    .filter((row) => row.question_id === selectedQuestionId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const selectedRule = rules.find((row) => row.item_id === selectedQuizItemId) ?? null;
  const activeFlowStepKey = useMemo(() => {
    if (activeTab === 'intents') return 'define';
    if (activeTab === 'structure') return 'structure';
    if (activeTab === 'courses') return 'build';
    if (activeTab === 'mappings' || activeTab === 'checkpoints') return 'connect';
    if (activeTab === 'quiz' || activeTab === 'analytics') return 'validate';
    if (activeTab === 'overview') return 'preview';
    return 'publish';
  }, [activeTab]);
  const activeFlowStep = flowSteps.find((step) => step.key === activeFlowStepKey) ?? flowSteps[0];

  const phaseTabGroups = useMemo(
    () =>
      ({
        define: ['intents'],
        structure: ['structure'],
        build: ['courses'],
        connect: ['mappings', 'checkpoints'],
        validate: ['quiz', 'analytics'],
        preview: ['overview'],
        publish: ['config'],
      }) satisfies Record<string, TabKey[]>,
    []
  );

  const activePhaseTabs = phaseTabGroups[activeFlowStepKey] ?? [];
  const visibleTabs = TABS;

  const contextCourse = selectedCourse ?? previewCourse;
  const contextCategory = contextCourse ? categoryMap.get(contextCourse.category_id) : null;
  const contextSubject = contextCourse?.subject_id ? subjectMap.get(contextCourse.subject_id) : null;
  const contextTrack = contextCourse?.track_id ? trackMap.get(contextCourse.track_id) : null;
  const contextLevel = contextCourse?.level_id ? levelMap.get(contextCourse.level_id) : null;
  const contextAvatar =
    (contextCourse?.default_avatar_id ? avatarMap.get(contextCourse.default_avatar_id)?.avatar_name : null) ||
    mappingPreview?.avatar_name ||
    null;

  const guidance = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return {
          eyebrow: 'System overview',
          title: 'Use this workspace in a fixed order',
          description: 'Define the learning structure, build the course graph, connect avatars and checkpoints, then validate the learner flow',
          bullets: [
            'Start with category, then create sub category and seed specialization or level from that flow when needed.',
            'Build courses, modules, submodules, and items in Course Builder.',
            'Finish by linking avatars and checkpoints, then verify runtime preview.',
          ],
        };
      case 'intents':
        return {
          eyebrow: 'Define',
          title: 'Intent decides the learner entry path',
          description: 'Use this tab to decide whether learners see diagnostics, courses, avatars, and checkpoints when a flow begins.',
          bullets: ['Entry type controls how the journey starts.', 'Default level is only a fallback, not the full learning graph.'],
        };
      case 'structure':
        return {
          eyebrow: 'Define',
          title: 'Structure is your teaching graph',
          description: 'Categories define domain, subcategories define what is taught, and teacher-type subcategories can seed specialization and level setup for the runtime graph.',
          bullets: ['Create category first.', 'Then add sub categories under category.', 'For Teacher and learning-enabled categories, create specialization and level from the sub category modal.'],
        };
      case 'courses':
        return {
          eyebrow: 'Build',
          title: 'Build the learner-visible path',
          description: 'A course becomes teachable only after modules, submodules, and learning items are connected in order.',
          bullets: ['Use video items for content playback.', 'Use quiz items for validation.', 'Use avatar items when live help should trigger in-flow.'],
        };
      case 'quiz':
        return {
          eyebrow: 'Validate',
          title: 'Quiz rules define progress confidence',
          description: 'Question metadata narrows which question fits the learner context, while pass score controls unlock confidence.',
          bullets: ['Specialization and level targeting should match course context.', 'Create a rule after questions so pass/fail behavior is predictable.'],
        };
      case 'mappings':
        return {
          eyebrow: 'Connect',
          title: 'Avatar mapping decides who teaches',
          description: 'Runtime preview uses the real backend selector, so this is the safest place to confirm which avatar will serve a given context.',
          bullets: ['Context mapping is more specific than a global fallback.', 'Default avatar on course acts as the course-level fallback.'],
        };
      case 'checkpoints':
        return {
          eyebrow: 'Connect',
          title: 'Checkpoints define when to assist',
          description: 'Use checkpoints to control what happens when a learner struggles or reaches a critical moment in a lesson.',
          bullets: ['Trigger second controls when intervention can happen.', 'Assist mode should match the intended learner action.'],
        };
      case 'config':
        return {
          eyebrow: 'Publish',
          title: 'Configurations change runtime behavior',
          description: 'Only add tenant configs here when behavior should be dynamic and not hardcoded in UI or services.',
          bullets: ['Use config for thresholds, routing aids, and runtime feature toggles.'],
        };
      default:
        return {
          eyebrow: 'Validate',
          title: 'Analytics shows structural health',
          description: 'These numbers help confirm whether your learning graph has enough quiz, video, and avatar coverage.',
          bullets: ['Low avatar mappings means runtime coverage is likely weak.', 'Low video or quiz counts often indicate incomplete learning flows.'],
        };
    }
  }, [activeTab]);

  const contextEntries = useMemo(
    () => [
      { label: 'Category', value: contextCategory?.name ?? (previewCourse ? categoryMap.get(previewCourse.category_id)?.name : null) },
      { label: 'Sub Category', value: contextSubject?.name },
      { label: 'Specialization', value: contextTrack?.name },
      { label: 'Level', value: contextLevel?.name },
      { label: 'Course', value: contextCourse?.title },
      { label: 'Avatar', value: contextAvatar },
    ],
    [categoryMap, contextAvatar, contextCategory?.name, contextCourse?.title, contextLevel?.name, contextSubject?.name, contextTrack?.name, previewCourse]
  );

  const refreshAnalytics = (
    nextCourses: LearningCourse[],
    nextItems: LearningItem[],
    nextQuestions: QuizQuestion[],
    nextMappings: AvatarMapping[],
    nextConfigs: LearningConfig[]
  ) => {
    setAnalytics({
      publishedCourses: nextCourses.filter((row) => row.publish_state === 'published').length,
      draftCourses: nextCourses.filter((row) => row.publish_state !== 'published').length,
      quizItems: nextItems.filter((row) => row.type === 'quiz').length,
      avatarItems: nextItems.filter((row) => row.type === 'avatar').length,
      videoItems: nextItems.filter((row) => row.type === 'video').length,
      quizQuestions: nextQuestions.length,
      avatarMappings: nextMappings.length,
      configs: nextConfigs.length,
    });
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const [
        nextIntents,
        nextCategories,
        nextSubjects,
        nextTracks,
        nextLevels,
        nextCourses,
        nextModules,
        nextSubmodules,
        nextItems,
        nextQuestions,
        nextOptions,
        nextRules,
        nextMappings,
        nextCheckpoints,
        nextConfigs,
        avatarResponse,
        teachersResponse,
      ] = await Promise.all([
        adminLearningService.intents.list(),
        adminLearningService.categories.list(),
        adminLearningService.subjects.list(),
        adminLearningService.tracks.list(),
        adminLearningService.levels.list(),
        adminLearningService.courses.list(),
        adminLearningService.modules.list(),
        adminLearningService.submodules.list(),
        adminLearningService.learningItems.list(),
        adminLearningService.quizQuestions.list(),
        adminLearningService.quizOptions.list(),
        adminLearningService.quizRules.list(),
        adminLearningService.avatarMappings.list(),
        adminLearningService.checkpoints.list(),
        adminLearningService.configs.list(),
        avatarsService.list({ page: 1, limit: 100 }),
        usersService.list({ page: 1, limit: 100, exclude_client: true, status: 1 }),
      ]);

      setIntents(nextIntents);
      setCategories(nextCategories);
      setSubjects(nextSubjects);
      setTracks(nextTracks);
      setLevels(nextLevels);
      setCourses(nextCourses);
      setModules(nextModules);
      setSubmodules(nextSubmodules);
      setItems(nextItems);
      setQuestions(nextQuestions);
      setOptions(nextOptions);
      setRules(nextRules);
      setAvatarMappings(nextMappings);
      setCheckpoints(nextCheckpoints);
      setConfigs(nextConfigs);
      setSubjectLevelBindings(parseSubjectLevelBindings(nextConfigs));
      setAvatars(avatarResponse.data);
      const teacherUsers = teachersResponse.data.filter(isTeacherEligibleUser);
      setTeachers(teacherUsers);
      refreshAnalytics(nextCourses, nextItems, nextQuestions, nextMappings, nextConfigs);
    } catch (error: any) {
      showToast(error.message || 'Failed to load learning admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasPageAccess) return;
    loadAll();
  }, [hasPageAccess]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawState = localStorage.getItem(LEARNING_ADMIN_UI_STATE_KEY);
      if (!rawState) return;
      const parsed = JSON.parse(rawState) as {
        activeTab?: TabKey;
        showContextDetails?: boolean;
        showRuntimePanel?: boolean;
        lastPhaseTabByStep?: Record<string, TabKey>;
        activeContextMode?: ContextMode;
      };
      if (parsed.activeTab && TABS.some((tab) => tab.key === parsed.activeTab)) {
        setActiveTab(parsed.activeTab);
      }
      setShowContextDetails(Boolean(parsed.showContextDetails));
      setShowRuntimePanel(Boolean(parsed.showRuntimePanel));
      if (parsed.lastPhaseTabByStep) {
        setLastPhaseTabByStep((current) => ({ ...current, ...parsed.lastPhaseTabByStep }));
      }
      if (parsed.activeContextMode === 'intents' || parsed.activeContextMode === 'structure') {
        setActiveContextMode(parsed.activeContextMode);
      }
    } catch {
      localStorage.removeItem(LEARNING_ADMIN_UI_STATE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(
      LEARNING_ADMIN_UI_STATE_KEY,
      JSON.stringify({ activeTab, showContextDetails, showRuntimePanel, lastPhaseTabByStep, activeContextMode })
    );
  }, [activeTab, showContextDetails, showRuntimePanel, lastPhaseTabByStep, activeContextMode]);

  useEffect(() => {
    if (!selectedCourseId && courses[0]) {
      setSelectedCourseId(courses[0].id);
    } else if (selectedCourseId && !courses.some((row) => row.id === selectedCourseId)) {
      setSelectedCourseId(courses[0]?.id ?? null);
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    setLastPhaseTabByStep((current) => {
      if (current[activeFlowStepKey] === activeTab) return current;
      return { ...current, [activeFlowStepKey]: activeTab };
    });
  }, [activeFlowStepKey, activeTab]);

  useEffect(() => {
    if (activeTab === 'intents' || activeTab === 'structure') {
      setActiveContextMode(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!selectedModuleId && filteredModules[0]) {
      setSelectedModuleId(filteredModules[0].id);
    } else if (selectedModuleId && !filteredModules.some((row) => row.id === selectedModuleId)) {
      setSelectedModuleId(filteredModules[0]?.id ?? null);
    }
  }, [filteredModules, selectedModuleId]);

  useEffect(() => {
    if (!selectedSubmoduleId && filteredSubmodules[0]) {
      setSelectedSubmoduleId(filteredSubmodules[0].id);
    } else if (selectedSubmoduleId && !filteredSubmodules.some((row) => row.id === selectedSubmoduleId)) {
      setSelectedSubmoduleId(filteredSubmodules[0]?.id ?? null);
    }
  }, [filteredSubmodules, selectedSubmoduleId]);

  useEffect(() => {
    if (!selectedQuizItemId && quizItems[0]) {
      setSelectedQuizItemId(quizItems[0].id);
    } else if (selectedQuizItemId && !quizItems.some((row) => row.id === selectedQuizItemId)) {
      setSelectedQuizItemId(quizItems[0]?.id ?? null);
    }
  }, [quizItems, selectedQuizItemId]);

  useEffect(() => {
    if (!selectedQuestionId && filteredQuestions[0]) {
      setSelectedQuestionId(filteredQuestions[0].id);
    } else if (selectedQuestionId && !filteredQuestions.some((row) => row.id === selectedQuestionId)) {
      setSelectedQuestionId(filteredQuestions[0]?.id ?? null);
    }
  }, [filteredQuestions, selectedQuestionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawDraft = localStorage.getItem(COURSE_DRAFT_KEY);
    if (!rawDraft) return;
    try {
      const draft = JSON.parse(rawDraft) as Record<string, unknown>;
      if (draft && draft.type === 'course') {
        setModal({ resource: 'course', mode: 'create', values: draft.values as Record<string, any> });
      }
    } catch {
      localStorage.removeItem(COURSE_DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (modal?.resource === 'course' && modal.mode === 'create') {
      localStorage.setItem(COURSE_DRAFT_KEY, JSON.stringify({ type: 'course', values: modal.values }));
      return;
    }
    localStorage.removeItem(COURSE_DRAFT_KEY);
  }, [modal]);

  const openModal = (resource: ResourceKey, mode: 'create' | 'edit', values: Record<string, any>, id?: number) => {
    setModalErrors({});
    setModal({ resource, mode, values, id });
  };

  const defaultValues = (resource: ResourceKey): Record<string, any> => {
    switch (resource) {
      case 'intent':
        return {
          name: '',
          description: '',
          flow_type: '',
          is_active: true,
          entry_type: 'default',
          enable_diagnostic: false,
          enable_course: true,
          enable_avatar: true,
          enable_checkpoint: false,
          default_level_id: '',
          flow_config_json: '{}',
        };
      case 'category':
        return { name: '', description: '', position: findNextPosition(categories) };
      case 'subject':
        return {
          category_id: categories[0]?.id ?? '',
          name: '',
          description: '',
          specialization_names: '',
          specialization_description: '',
          level_names: '',
          level_order_index: levels.length + 1,
        };
      case 'track':
        return { subject_id: subjects[0]?.id ?? '', name: '', description: '' };
      case 'level':
        return { name: '', order_index: levels.length + 1 };
      case 'course':
        return {
          teacher_id: teachers[0]?.id ?? '',
          category_id: categories[0]?.id ?? '',
          subject_id: '',
          track_id: '',
          level_id: levels[0]?.id ?? '',
          default_avatar_id: '',
          title: '',
          slug: '',
          short_description: '',
          full_description: '',
          difficulty_level: '',
          estimated_duration_seconds: '',
          visibility: 'private',
          publish_state: 'draft',
          status: 1,
        };
      case 'module':
        return {
          course_id: selectedCourseId ?? courses[0]?.id ?? '',
          title: '',
          slug: '',
          group: '',
          description: '',
          position: findNextPosition(filteredModules),
          estimated_duration_seconds: '',
          is_locked: false,
          status: 1,
        };
      case 'submodule':
        return {
          module_id: selectedModuleId ?? filteredModules[0]?.id ?? '',
          title: '',
          summary: '',
          position: findNextPosition(filteredSubmodules),
          estimated_duration_seconds: '',
        };
      case 'item':
        return {
          submodule_id: selectedSubmoduleId ?? filteredSubmodules[0]?.id ?? '',
          type: 'video',
          title: '',
          description: '',
          position: findNextPosition(filteredItems),
          estimated_seconds: '',
          weight: 1,
          is_mandatory: true,
          can_skip: false,
          status: 1,
          visibility: 1,
          metadata_video_url: '',
          metadata_track_id: '',
          metadata_level_id: '',
          metadata_difficulty: '',
          metadata_json: '{}',
        };
      case 'question':
        return {
          quiz_id: selectedQuizItemId ?? quizItems[0]?.id ?? '',
          question: '',
          question_type: 'mcq',
          explanation: '',
          position: findNextPosition(filteredQuestions),
          marks: 1,
          metadata_track_id: '',
          metadata_level_id: '',
          metadata_difficulty: '',
          metadata_accepted_answer: '',
          metadata_json: '{}',
        };
      case 'option':
        return {
          question_id: selectedQuestionId ?? filteredQuestions[0]?.id ?? '',
          option_text: '',
          is_correct: false,
          position: findNextPosition(filteredOptions),
          metadata_json: '{}',
        };
      case 'rule':
        return {
          item_id: selectedQuizItemId ?? quizItems[0]?.id ?? '',
          pass_score: 70,
          max_attempts: 3,
        };
      case 'mapping':
        return {
          avatar_id: avatars[0]?.id ?? '',
          intent_id: '',
          category_id: '',
          subject_id: '',
          track_id: '',
          level_id: '',
          priority: 1,
        };
      case 'checkpoint':
        return {
          learning_item_id: selectedQuizItemId ?? items[0]?.id ?? '',
          checkpoint_type: 'struggle',
          concept_label: '',
          trigger_second: '',
          difficulty_score: '',
          is_mandatory: false,
          assist_mode: '',
          config_prompt: '',
          config_options_text: 'continue, replay_video, start_avatar',
          config_json: '{}',
        };
      case 'config':
        return { config_key: '', config_value_text: '', description: '' };
      default:
        return {};
    }
  };

  const openCreate = (resource: ResourceKey) => openModal(resource, 'create', defaultValues(resource));

  const openEdit = (resource: ResourceKey, row: any) => {
    switch (resource) {
      case 'intent':
        openModal('intent', 'edit', {
          name: row.name,
          description: row.description ?? '',
          flow_type: row.flow_type ?? '',
          is_active: row.is_active,
          entry_type: row.flow_config?.entry_type ?? 'default',
          enable_diagnostic: row.flow_config?.enable_diagnostic ?? false,
          enable_course: row.flow_config?.enable_course ?? false,
          enable_avatar: row.flow_config?.enable_avatar ?? false,
          enable_checkpoint: row.flow_config?.enable_checkpoint ?? false,
          default_level_id: row.flow_config?.default_level_id ?? '',
          flow_config_json: stringifyJson(row.flow_config?.config ?? {}),
        }, row.id);
        return;
      case 'item':
        const itemMeta = parseJsonObject(stringifyJson(row.meta ?? {}));
        openModal('item', 'edit', {
          ...row,
          metadata_video_url: String(itemMeta.video_url ?? ''),
          metadata_track_id: itemMeta.track_id ?? '',
          metadata_level_id: itemMeta.level_id ?? '',
          metadata_difficulty: String(itemMeta.difficulty ?? ''),
          metadata_json: stringifyJson(row.meta ?? {}),
        }, row.id);
        return;
      case 'question':
        const questionMeta = parseJsonObject(stringifyJson(row.meta ?? {}));
        openModal('question', 'edit', {
          ...row,
          metadata_track_id: questionMeta.track_id ?? '',
          metadata_level_id: questionMeta.level_id ?? '',
          metadata_difficulty: String(questionMeta.difficulty ?? ''),
          metadata_accepted_answer: String(questionMeta.accepted_answer ?? ''),
          metadata_json: stringifyJson(row.meta ?? {}),
        }, row.id);
        return;
      case 'option':
        openModal('option', 'edit', {
          ...row,
          metadata_json: stringifyJson(row.meta ?? {}),
        }, row.id);
        return;
      case 'checkpoint':
        const checkpointConfig = parseJsonObject(stringifyJson(row.config ?? {}));
        openModal('checkpoint', 'edit', {
          ...row,
          config_prompt: String(checkpointConfig.prompt ?? ''),
          config_options_text: Array.isArray(checkpointConfig.options) ? checkpointConfig.options.join(', ') : '',
          config_json: stringifyJson(row.config ?? {}),
        }, row.id);
        return;
      case 'config':
        openModal('config', 'edit', {
          config_key: row.config_key,
          config_value_text: stringifyJson(row.config_value),
          description: row.description ?? '',
        }, row.id);
        return;
      default:
        if (resource === 'subject') {
          openModal(
            'subject',
            'edit',
            {
              ...row,
              specialization_names: tracks
                .filter((track) => Number(track.subject_id) === Number(row.id))
                .map((track) => track.name)
                .join(', '),
              specialization_description:
                tracks.find((track) => Number(track.subject_id) === Number(row.id))?.description ?? '',
              level_names: getBoundLevelsForSubject(row.id, subjectLevelBindings, levels).map((level) => level.name).join(', '),
              level_order_index: levels.length + 1,
            },
            row.id
          );
          return;
        }
        openModal(resource, 'edit', { ...row }, row.id);
    }
  };

  const updateModalField = (field: string, value: any) => {
    setModalErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setModal((prev) => (prev ? { ...prev, values: { ...prev.values, [field]: value } } : prev));
  };

  const getModalError = (field: string) => modalErrors[field];
  const scrollToValidationField = (field: string) => {
    if (typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      const container = document.querySelector(`[data-field-name="${field}"]`);
      if (container instanceof HTMLElement) {
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = container.querySelector('input, textarea, [role="button"], button');
        if (focusable instanceof HTMLElement) {
          focusable.focus();
        }
      }
    });
  };

  const hasText = (value: unknown) => String(value ?? '').trim().length > 0;
  const hasValue = (value: unknown) => value !== '' && value !== null && typeof value !== 'undefined';

  const validateModal = (resource: ResourceKey, values: Record<string, any>) => {
    const errors: Record<string, string> = {};
    const requireText = (field: string, label: string) => {
      if (!hasText(values[field])) errors[field] = `${label} is required`;
    };
    const requireValue = (field: string, label: string) => {
      if (!hasValue(values[field])) errors[field] = `${label} is required`;
    };

    switch (resource) {
      case 'intent':
        requireText('name', 'Intent name');
        requireText('flow_type', 'Flow type');
        requireText('entry_type', 'Entry type');
        break;
      case 'category':
        requireText('name', 'Category name');
        break;
      case 'subject':
        requireValue('category_id', 'Category');
        requireText('name', 'Sub category name');
        if (subjectModalNeedsLearningSetup) {
          if (subjectModalRequiresSpecialization) requireText('specialization_names', 'Specialization');
          if (subjectModalRequiresLevels) requireText('level_names', 'Level');
        }
        break;
      case 'track':
        requireValue('subject_id', 'Sub category');
        requireText('name', 'Specialization name');
        break;
      case 'level':
        requireText('name', 'Level name');
        requireValue('order_index', 'Order index');
        break;
      case 'course':
        requireValue('teacher_id', 'Teacher');
        requireValue('category_id', 'Category');
        requireValue('subject_id', 'Sub category');
        requireText('title', 'Title');
        requireText('short_description', 'Short description');
        requireText('full_description', 'Full description');
        break;
      case 'module':
        requireValue('course_id', 'Course');
        requireText('title', 'Title');
        break;
      case 'submodule':
        requireValue('module_id', 'Module');
        requireText('title', 'Title');
        break;
      case 'item':
        requireValue('submodule_id', 'Submodule');
        requireText('type', 'Item type');
        requireText('title', 'Title');
        break;
      case 'question':
        requireValue('quiz_id', 'Quiz item');
        requireText('question', 'Question');
        requireText('question_type', 'Question type');
        break;
      case 'option':
        requireValue('question_id', 'Question');
        requireText('option_text', 'Option text');
        break;
      case 'rule':
        requireValue('item_id', 'Quiz item');
        requireValue('pass_score', 'Pass score');
        break;
      case 'mapping':
        requireValue('avatar_id', 'Avatar');
        break;
      case 'checkpoint':
        requireValue('learning_item_id', 'Learning item');
        requireText('checkpoint_type', 'Checkpoint type');
        requireText('concept_label', 'Concept label');
        requireText('assist_mode', 'Assist mode');
        break;
      case 'config':
        if (modal?.mode === 'create') requireText('config_key', 'Config key');
        requireText('config_value_text', 'Config value');
        break;
    }

    return errors;
  };

  const normalizedId = (value: any) => {
    if (value === '' || value === null || typeof value === 'undefined') return null;
    return Number(value);
  };

  const buildItemMetadata = (values: Record<string, any>) => {
    const metadata = parseJsonObject(values.metadata_json || '{}');
    withOptionalValue(metadata, 'video_url', values.metadata_video_url?.trim() || null);
    withOptionalValue(metadata, 'track_id', normalizedId(values.metadata_track_id));
    withOptionalValue(metadata, 'level_id', normalizedId(values.metadata_level_id));
    withOptionalValue(metadata, 'difficulty', values.metadata_difficulty?.trim() || null);
    return metadata;
  };

  const buildQuestionMetadata = (values: Record<string, any>) => {
    const metadata = parseJsonObject(values.metadata_json || '{}');
    withOptionalValue(metadata, 'track_id', normalizedId(values.metadata_track_id));
    withOptionalValue(metadata, 'level_id', normalizedId(values.metadata_level_id));
    withOptionalValue(metadata, 'difficulty', values.metadata_difficulty?.trim() || null);
    withOptionalValue(metadata, 'accepted_answer', values.metadata_accepted_answer?.trim() || null);
    return metadata;
  };

  const buildCheckpointConfig = (values: Record<string, any>) => {
    const config = parseJsonObject(values.config_json || '{}');
    withOptionalValue(config, 'prompt', values.config_prompt?.trim() || null);
    const options = String(values.config_options_text || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    withOptionalValue(config, 'options', options.length > 0 ? options : null);
    return config;
  };

  const syncSubjectLearningSetup = async (subjectId: number, values: Record<string, any>) => {
    const desiredTrackNames = parseDelimitedNames(values.specialization_names);
    const desiredLevelNames = parseDelimitedNames(values.level_names);
    const existingTracksForSubject = tracks.filter((track) => Number(track.subject_id) === Number(subjectId));
    const existingTrackNames = new Set(existingTracksForSubject.map((track) => track.name.trim().toLowerCase()));

    if (
      modal?.mode === 'edit' &&
      existingTracksForSubject.length === 1 &&
      desiredTrackNames.length === 1 &&
      existingTracksForSubject[0].name.trim().toLowerCase() !== desiredTrackNames[0].trim().toLowerCase()
    ) {
      await adminLearningService.tracks.update(existingTracksForSubject[0].id, {
        name: desiredTrackNames[0],
        description: values.specialization_description?.trim() || existingTracksForSubject[0].description || null,
      });
    } else {
      for (const trackName of desiredTrackNames) {
        const normalizedTrackName = trackName.trim().toLowerCase();
        const matchingTrack = existingTracksForSubject.find(
          (track) => track.name.trim().toLowerCase() === normalizedTrackName
        );
        if (matchingTrack) {
          if (
            values.specialization_description?.trim() &&
            values.specialization_description.trim() !== (matchingTrack.description || '').trim()
          ) {
            await adminLearningService.tracks.update(matchingTrack.id, {
              description: values.specialization_description.trim(),
            });
          }
          continue;
        }
        await adminLearningService.tracks.create({
          subject_id: subjectId,
          name: trackName,
          description: values.specialization_description?.trim() || null,
        });
      }
    }

    const currentBoundLevelIds = subjectLevelBindings[Number(subjectId)] ?? [];
    let nextBoundLevelIds = [...currentBoundLevelIds];
    if (desiredLevelNames.length === 0) {
      return;
    }

    const existingLevelNames = new Set(levels.map((level) => level.name.trim().toLowerCase()));
    let nextOrderIndex = Math.max(
      Number(values.level_order_index || 0),
      levels.reduce((max, level) => Math.max(max, Number(level.order_index || 0)), 0)
    );

    for (const levelName of desiredLevelNames) {
      const normalizedLevelName = levelName.trim().toLowerCase();
      const existingLevel = levels.find((level) => level.name.trim().toLowerCase() === normalizedLevelName);
      if (existingLevel) {
        nextBoundLevelIds.push(existingLevel.id);
        continue;
      }

      nextOrderIndex += 1;
      const createdLevel = await adminLearningService.levels.create({
        name: levelName,
        order_index: nextOrderIndex,
      });
      existingLevelNames.add(normalizedLevelName);
      nextBoundLevelIds.push(createdLevel.id);
    }

    const uniqueBoundLevelIds = Array.from(new Set(nextBoundLevelIds));
    const nextBindings: SubjectLevelBindings = {
      ...subjectLevelBindings,
      [Number(subjectId)]: uniqueBoundLevelIds,
    };
    const existingBindingsConfig = configs.find((config) => config.config_key === SUBJECT_LEVEL_BINDINGS_CONFIG_KEY);
    const configPayload = {
      config_key: SUBJECT_LEVEL_BINDINGS_CONFIG_KEY,
      config_value: stringifySubjectLevelBindings(nextBindings),
      description: existingBindingsConfig?.description || 'Maps sub categories to linked shared levels for runtime filtering.',
    };

    if (existingBindingsConfig?.id) {
      await adminLearningService.configs.update(existingBindingsConfig.id, {
        config_value: configPayload.config_value,
        description: configPayload.description,
      });
    } else {
      await adminLearningService.configs.create(configPayload);
    }
  };

  const updateMappingPreviewField = (
    field: keyof typeof mappingPreviewForm,
    value: number | ''
  ) => {
    setMappingPreview((prev) => (field === 'course_id' ? null : prev));
    setMappingPreviewForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'course_id') {
        const nextCourse = courses.find((row) => row.id === Number(value || 0)) ?? null;
        next.category_id = nextCourse?.category_id ?? '';
        next.subject_id = nextCourse?.subject_id ?? '';
        next.track_id = nextCourse?.track_id ?? '';
        next.level_id = nextCourse?.level_id ?? '';
      }
      return next;
    });
  };

  const runMappingPreview = async () => {
    setMappingPreviewLoading(true);
    try {
      const result = await adminLearningService.avatarRuntime.previewSelection({
        course_id: normalizedId(mappingPreviewForm.course_id),
        intent_id: normalizedId(mappingPreviewForm.intent_id),
        category_id: normalizedId(mappingPreviewForm.category_id),
        subject_id: normalizedId(mappingPreviewForm.subject_id),
        track_id: normalizedId(mappingPreviewForm.track_id),
        level_id: normalizedId(mappingPreviewForm.level_id),
      });
      setMappingPreview(result);
    } catch (error: any) {
      setMappingPreview(null);
      showToast(error.message || 'Failed to preview avatar routing', 'error');
    } finally {
      setMappingPreviewLoading(false);
    }
  };

  const handleFlowStepClick = (stepKey: string) => {
    if (stepKey === activeFlowStepKey) return;
    if (stepKey === 'define') {
      setActiveTab('intents');
      return;
    }
    setActiveTab(lastPhaseTabByStep[stepKey] ?? DEFAULT_PHASE_TABS[stepKey] ?? 'overview');
  };

  const submitModal = async () => {
    if (!modal) return;
    const validationErrors = validateModal(modal.resource, modal.values);
    if (Object.keys(validationErrors).length > 0) {
      setModalErrors(validationErrors);
      scrollToValidationField(Object.keys(validationErrors)[0]);
      return;
    }
    try {
      setSaving(true);
      const values = modal.values;
      switch (modal.resource) {
        case 'intent': {
          const payload = {
            name: values.name?.trim(),
            description: values.description?.trim() || null,
            flow_type: values.flow_type?.trim() || null,
            is_active: Boolean(values.is_active),
            flow_config: {
              entry_type: values.entry_type || 'default',
              enable_diagnostic: Boolean(values.enable_diagnostic),
              enable_course: Boolean(values.enable_course),
              enable_avatar: Boolean(values.enable_avatar),
              enable_checkpoint: Boolean(values.enable_checkpoint),
              default_level_id: normalizedId(values.default_level_id),
              config: parseJsonValue(values.flow_config_json || '{}'),
            },
          };
          if (modal.mode === 'create') await adminLearningService.intents.create(payload);
          else await adminLearningService.intents.update(modal.id!, payload);
          break;
        }
        case 'category': {
          const payload = { name: values.name?.trim(), description: values.description?.trim() || null, position: Number(values.position || 0) };
          if (modal.mode === 'create') await adminLearningService.categories.create(payload);
          else await adminLearningService.categories.update(modal.id!, payload);
          break;
        }
        case 'subject': {
          const payload = { category_id: Number(values.category_id), name: values.name?.trim(), description: values.description?.trim() || null };
          const subjectResult =
            modal.mode === 'create'
              ? await adminLearningService.subjects.create(payload)
              : await adminLearningService.subjects.update(modal.id!, payload);
          const targetSubjectId = Number(subjectResult?.id ?? modal.id);
          if (subjectModalNeedsLearningSetup && targetSubjectId) {
            await syncSubjectLearningSetup(targetSubjectId, values);
          }
          break;
        }
        case 'track': {
          const payload = { subject_id: Number(values.subject_id), name: values.name?.trim(), description: values.description?.trim() || null };
          if (modal.mode === 'create') await adminLearningService.tracks.create(payload);
          else await adminLearningService.tracks.update(modal.id!, payload);
          break;
        }
        case 'level': {
          const payload = { name: values.name?.trim(), order_index: Number(values.order_index || 1) };
          if (modal.mode === 'create') await adminLearningService.levels.create(payload);
          else await adminLearningService.levels.update(modal.id!, payload);
          break;
        }
        case 'course': {
          const payload = {
            teacher_id: Number(values.teacher_id),
            category_id: Number(values.category_id),
            subject_id: normalizedId(values.subject_id),
            track_id: normalizedId(values.track_id),
            level_id: normalizedId(values.level_id),
            default_avatar_id: normalizedId(values.default_avatar_id),
            title: values.title?.trim(),
            slug: slugify(values.slug || values.title || ''),
            short_description: values.short_description?.trim() || null,
            full_description: values.full_description?.trim() || null,
            difficulty_level: values.difficulty_level?.trim() || null,
            estimated_duration_seconds: values.estimated_duration_seconds ? Number(values.estimated_duration_seconds) : null,
            visibility: values.visibility?.trim() || null,
            publish_state: values.publish_state?.trim() || null,
            status: Number(values.status || 1),
          };
          if (modal.mode === 'create') await adminLearningService.courses.create(payload);
          else await adminLearningService.courses.update(modal.id!, payload);
          break;
        }
        case 'module': {
          const payload = {
            course_id: Number(values.course_id),
            title: values.title?.trim(),
            slug: slugify(values.slug || values.title || ''),
            group: values.group?.trim() || null,
            description: values.description?.trim() || null,
            position: Number(values.position || 0),
            estimated_duration_seconds: values.estimated_duration_seconds ? Number(values.estimated_duration_seconds) : null,
            is_locked: Boolean(values.is_locked),
            status: Number(values.status || 1),
          };
          if (modal.mode === 'create') await adminLearningService.modules.create(payload);
          else await adminLearningService.modules.update(modal.id!, payload);
          break;
        }
        case 'submodule': {
          const payload = {
            module_id: Number(values.module_id),
            title: values.title?.trim(),
            summary: values.summary?.trim() || null,
            position: Number(values.position || 0),
            estimated_duration_seconds: values.estimated_duration_seconds ? Number(values.estimated_duration_seconds) : null,
          };
          if (modal.mode === 'create') await adminLearningService.submodules.create(payload);
          else await adminLearningService.submodules.update(modal.id!, payload);
          break;
        }
        case 'item': {
          const payload = {
            submodule_id: Number(values.submodule_id),
            type: values.type,
            title: values.title?.trim(),
            description: values.description?.trim() || null,
            position: Number(values.position || 0),
            estimated_seconds: values.estimated_seconds ? Number(values.estimated_seconds) : null,
            weight: values.weight ? Number(values.weight) : null,
            is_mandatory: Boolean(values.is_mandatory),
            can_skip: Boolean(values.can_skip),
            status: Number(values.status || 1),
            visibility: Number(values.visibility || 1),
            metadata: buildItemMetadata(values),
          };
          if (modal.mode === 'create') await adminLearningService.learningItems.create(payload);
          else await adminLearningService.learningItems.update(modal.id!, payload);
          break;
        }
        case 'question': {
          const payload = {
            quiz_id: Number(values.quiz_id),
            question: values.question?.trim(),
            question_type: values.question_type,
            explanation: values.explanation?.trim() || null,
            position: values.position ? Number(values.position) : null,
            marks: values.marks ? Number(values.marks) : null,
            metadata: buildQuestionMetadata(values),
          };
          if (modal.mode === 'create') await adminLearningService.quizQuestions.create(payload);
          else await adminLearningService.quizQuestions.update(modal.id!, payload);
          break;
        }
        case 'option': {
          const payload = {
            question_id: Number(values.question_id),
            option_text: values.option_text?.trim(),
            is_correct: Boolean(values.is_correct),
            position: values.position ? Number(values.position) : null,
            metadata: parseJsonValue(values.metadata_json || '{}'),
          };
          if (modal.mode === 'create') await adminLearningService.quizOptions.create(payload);
          else await adminLearningService.quizOptions.update(modal.id!, payload);
          break;
        }
        case 'rule': {
          const payload = {
            item_id: Number(values.item_id),
            pass_score: Number(values.pass_score || 0),
            max_attempts: Number(values.max_attempts || 1),
          };
          if (modal.mode === 'create') await adminLearningService.quizRules.create(payload);
          else await adminLearningService.quizRules.update(modal.id!, payload);
          break;
        }
        case 'mapping': {
          const payload = {
            avatar_id: Number(values.avatar_id),
            intent_id: normalizedId(values.intent_id),
            category_id: normalizedId(values.category_id),
            subject_id: normalizedId(values.subject_id),
            track_id: normalizedId(values.track_id),
            level_id: normalizedId(values.level_id),
            priority: Number(values.priority || 1),
          };
          if (modal.mode === 'create') await adminLearningService.avatarMappings.create(payload);
          else await adminLearningService.avatarMappings.update(modal.id!, payload);
          break;
        }
        case 'checkpoint': {
          const payload = {
            learning_item_id: Number(values.learning_item_id),
            checkpoint_type: values.checkpoint_type?.trim() || null,
            concept_label: values.concept_label?.trim() || null,
            trigger_second: values.trigger_second ? Number(values.trigger_second) : null,
            difficulty_score: values.difficulty_score ? Number(values.difficulty_score) : null,
            is_mandatory: Boolean(values.is_mandatory),
            assist_mode: values.assist_mode?.trim() || null,
            config: buildCheckpointConfig(values),
          };
          if (modal.mode === 'create') await adminLearningService.checkpoints.create(payload);
          else await adminLearningService.checkpoints.update(modal.id!, payload);
          break;
        }
        case 'config': {
          const payload = {
            config_key: values.config_key?.trim(),
            config_value: parseConfigValue(values.config_value_text ?? ''),
            description: values.description?.trim() || null,
          };
          if (modal.mode === 'create') await adminLearningService.configs.create(payload);
          else await adminLearningService.configs.update(modal.id!, {
            config_value: payload.config_value,
            description: payload.description,
          });
          break;
        }
      }

      showToast(`${modal.resource} ${modal.mode === 'create' ? 'created' : 'updated'} successfully`, 'success');
      setModal(null);
      await loadAll();
    } catch (error: any) {
      showToast(error.message || `Failed to ${modal.mode} ${modal.resource}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteState) return;
    try {
      setSaving(true);
      switch (deleteState.resource) {
        case 'intent':
          await adminLearningService.intents.delete(deleteState.id);
          break;
        case 'category':
          await adminLearningService.categories.delete(deleteState.id);
          break;
        case 'subject':
          await adminLearningService.subjects.delete(deleteState.id);
          break;
        case 'track':
          await adminLearningService.tracks.delete(deleteState.id);
          break;
        case 'level':
          await adminLearningService.levels.delete(deleteState.id);
          break;
        case 'course':
          await adminLearningService.courses.delete(deleteState.id);
          break;
        case 'module':
          await adminLearningService.modules.delete(deleteState.id);
          break;
        case 'submodule':
          await adminLearningService.submodules.delete(deleteState.id);
          break;
        case 'item':
          await adminLearningService.learningItems.delete(deleteState.id);
          break;
        case 'question':
          await adminLearningService.quizQuestions.delete(deleteState.id);
          break;
        case 'option':
          await adminLearningService.quizOptions.delete(deleteState.id);
          break;
        case 'rule':
          await adminLearningService.quizRules.delete(deleteState.id);
          break;
        case 'mapping':
          await adminLearningService.avatarMappings.delete(deleteState.id);
          break;
        case 'checkpoint':
          await adminLearningService.checkpoints.delete(deleteState.id);
          break;
        case 'config':
          await adminLearningService.configs.delete(deleteState.id);
          break;
      }
      showToast(`${deleteState.title} deleted successfully`, 'success');
      setDeleteState(null);
      await loadAll();
    } catch (error: any) {
      showToast(error.message || `Failed to delete ${deleteState.title}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const moveEntity = async (
    resource: 'module' | 'submodule' | 'item',
    row: LearningModule | LearningSubmodule | LearningItem,
    direction: 'up' | 'down'
  ) => {
    const siblings =
      resource === 'module'
        ? filteredModules
        : resource === 'submodule'
          ? filteredSubmodules
          : filteredItems;
    const index = siblings.findIndex((entry) => entry.id === row.id);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= siblings.length) return;
    const target = siblings[swapIndex];
    const currentPosition = (row as any).position ?? index + 1;
    const targetPosition = (target as any).position ?? swapIndex + 1;

    try {
      setSaving(true);
      if (resource === 'module') {
        await adminLearningService.modules.update(row.id, { position: targetPosition });
        await adminLearningService.modules.update(target.id, { position: currentPosition });
      } else if (resource === 'submodule') {
        await adminLearningService.submodules.update(row.id, { position: targetPosition });
        await adminLearningService.submodules.update(target.id, { position: currentPosition });
      } else {
        await adminLearningService.learningItems.update(row.id, { position: targetPosition });
        await adminLearningService.learningItems.update(target.id, { position: currentPosition });
      }
      await loadAll();
    } catch (error: any) {
      showToast(error.message || 'Failed to update ordering', 'error');
    } finally {
      setSaving(false);
    }
  };

  const detailValue = (value: unknown) => {
    if (value === null || typeof value === 'undefined' || value === '') {
      return '-';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
      return (
        <pre className="overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs text-slate-100">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return String(value);
  };

  const descriptionDetail = (value?: string | null) => (
    <div className="rounded-2xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(255,255,255,0.96)_100%)] px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm shadow-slate-100/70">
      {value?.trim() ? value : 'No description added yet.'}
    </div>
  );

  const renderDescriptionPreview = (
    resource: ResourceKey,
    row: Record<string, any>,
    title: string
  ) => {
    const preview = truncatePreview(typeof row.description === 'string' ? row.description : '');
    return (
      <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
        <button
          type="button"
          onClick={() => openView(resource, row, title)}
          className="max-w-[240px] truncate text-left transition-colors hover:text-blue-700"
          title="View full description"
        >
          {preview}
        </button>
        <button
          type="button"
          onClick={() => openView(resource, row, title)}
          aria-label="View full description"
          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-200 hover:text-blue-700"
        >
          <AlertCircle size={13} />
        </button>
      </div>
    );
  };

  const openView = (resource: ResourceKey, row: Record<string, any>, title: string, subtitle?: string) => {
    setViewState({ resource, row, title, subtitle });
  };

  const renderViewSections = (): ViewDrawerSection[] => {
    if (!viewState) return [];

    const row = viewState.row;
    switch (viewState.resource) {
      case 'intent':
        return [
          {
            title: 'Overview',
            tone: 'success',
            fields: [
              { label: 'Name', value: detailValue(row.name) },
              { label: 'Flow Type', value: detailValue(row.flow_type) },
              { label: 'Description', value: detailValue(row.description) },
              { label: 'Active', value: detailValue(row.is_active) },
              { label: 'Updated', value: detailValue(fmtDateTime(row.updated_at)) },
            ],
          },
          {
            title: 'Behavior / Config',
            tone: 'default',
            fields: [
              { label: 'Entry Type', value: detailValue(row.flow_config?.entry_type) },
              { label: 'Diagnostic', value: detailValue(row.flow_config?.enable_diagnostic) },
              { label: 'Course', value: detailValue(row.flow_config?.enable_course) },
              { label: 'Avatar', value: detailValue(row.flow_config?.enable_avatar) },
              { label: 'Checkpoint', value: detailValue(row.flow_config?.enable_checkpoint) },
              { label: 'Default Level', value: detailValue(levelMap.get(row.flow_config?.default_level_id)?.name) },
            ],
          },
          {
            title: 'Metadata',
            tone: 'muted',
            collapsible: true,
            defaultOpen: false,
            fields: [{ label: 'Advanced Config', value: detailValue(row.flow_config?.config ?? {}) }],
          },
        ];
      case 'category':
        return [
          {
            title: 'Overview',
            tone: 'success',
            fields: [
              { label: 'Category', value: detailValue(row.name) },
              { label: 'Description', value: descriptionDetail(row.description) },
              { label: 'Position', value: detailValue(row.position) },
              { label: 'Created', value: detailValue(fmtDateTime(row.created_at)) },
              { label: 'Updated', value: detailValue(fmtDateTime(row.updated_at)) },
            ],
          },
        ];
      case 'subject':
        const subjectTracks = tracks.filter((track) => Number(track.subject_id) === Number(row.id));
        const linkedLevels = getBoundLevelsForSubject(row.id, subjectLevelBindings, levels);
        return [
          {
            title: 'Overview',
            tone: 'success',
            fields: [
              { label: 'Sub Category', value: detailValue(row.name) },
              { label: 'Category', value: detailValue(categoryMap.get(row.category_id)?.name) },
              { label: 'Description', value: descriptionDetail(row.description) },
              { label: 'Created', value: detailValue(fmtDateTime(row.created_at)) },
              { label: 'Updated', value: detailValue(fmtDateTime(row.updated_at)) },
            ],
          },
          {
            title: 'Learning Setup',
            tone: 'default',
            fields: [
              {
                label: 'Specializations',
                value:
                  subjectTracks.length > 0
                    ? (
                        <div className="whitespace-pre-wrap">
                          {subjectTracks.map((track) => `${track.name}${track.description ? `: ${track.description}` : ''}`).join('\n')}
                        </div>
                      )
                    : 'No specialization linked',
              },
              {
                label: 'Levels',
                value:
                  linkedLevels.length > 0
                    ? (
                        <div className="whitespace-pre-wrap">
                          {linkedLevels
                            .slice()
                            .sort((left, right) => left.order_index - right.order_index)
                            .map((level) => `${level.order_index}. ${level.name}`)
                            .join('\n')}
                        </div>
                      )
                    : 'No linked levels',
              },
            ],
          },
        ];
      case 'track':
        return [
          {
            title: 'Overview',
            tone: 'success',
            fields: [
              { label: 'Specialization', value: detailValue(row.name) },
              { label: 'Sub Category', value: detailValue(subjectMap.get(row.subject_id)?.name) },
              { label: 'Description', value: descriptionDetail(row.description) },
              { label: 'Created', value: detailValue(fmtDateTime(row.created_at)) },
              { label: 'Updated', value: detailValue(fmtDateTime(row.updated_at)) },
            ],
          },
        ];
      case 'level':
        return [
          {
            title: 'Overview',
            fields: [
              { label: 'Level', value: detailValue(row.name) },
              { label: 'Order', value: detailValue(row.order_index) },
              { label: 'Created', value: detailValue(fmtDateTime(row.created_at)) },
              { label: 'Updated', value: detailValue(fmtDateTime(row.updated_at)) },
            ],
          },
        ];
      case 'course':
        return [
          {
            title: 'Overview',
            tone: 'success',
            fields: [
              { label: 'Title', value: detailValue(row.title) },
              { label: 'Slug', value: detailValue(row.slug) },
              { label: 'Teacher', value: detailValue(teachers.find((entry) => entry.id === row.teacher_id)?.name || teachers.find((entry) => entry.id === row.teacher_id)?.email) },
              { label: 'Publish State', value: detailValue(row.publish_state) },
              { label: 'Visibility', value: detailValue(row.visibility) },
              { label: 'Status', value: detailValue(row.status) },
            ],
          },
          {
            title: 'Relationships',
            tone: 'default',
            fields: [
              { label: 'Category', value: detailValue(categoryMap.get(row.category_id)?.name) },
              { label: 'Sub Category', value: detailValue(subjectMap.get(row.subject_id)?.name) },
              { label: 'Specialization', value: detailValue(trackMap.get(row.track_id)?.name) },
              { label: 'Level', value: detailValue(levelMap.get(row.level_id)?.name) },
              { label: 'Default Avatar', value: detailValue(avatarMap.get(row.default_avatar_id)?.avatar_name) },
            ],
          },
          {
            title: 'Behavior / Config',
            fields: [
              { label: 'Short Description', value: detailValue(row.short_description) },
              { label: 'Full Description', value: detailValue(row.full_description) },
              { label: 'Difficulty', value: detailValue(row.difficulty_level) },
              { label: 'Duration', value: detailValue(row.estimated_duration_seconds) },
            ],
          },
        ];
      case 'module':
      case 'submodule':
      case 'item':
        return [
          {
            title: 'Structure Details',
            fields: [
              { label: 'Title', value: detailValue(row.title) },
              { label: 'Type', value: detailValue(row.type) },
              { label: 'Slug', value: detailValue(row.slug) },
              { label: 'Summary', value: detailValue(row.summary ?? row.description) },
              { label: 'Position', value: detailValue(row.position) },
              { label: 'Locked', value: detailValue(row.is_locked) },
              { label: 'Mandatory', value: detailValue(row.is_mandatory) },
              { label: 'Can Skip', value: detailValue(row.can_skip) },
              { label: 'Weight', value: detailValue(row.weight) },
              { label: 'Metadata', value: detailValue(row.meta ?? row.metadata ?? {}) },
            ],
          },
        ];
      case 'question':
      case 'option':
      case 'rule':
        return [
          {
            title: 'Quiz Details',
            fields: [
              { label: 'Question', value: detailValue(row.question) },
              { label: 'Question Type', value: detailValue(row.question_type) },
              { label: 'Explanation', value: detailValue(row.explanation) },
              { label: 'Option Text', value: detailValue(row.option_text) },
              { label: 'Correct', value: detailValue(row.is_correct) },
              { label: 'Pass Score', value: detailValue(row.pass_score) },
              { label: 'Max Attempts', value: detailValue(row.max_attempts) },
              { label: 'Marks', value: detailValue(row.marks) },
              { label: 'Position', value: detailValue(row.position) },
              { label: 'Metadata', value: detailValue(row.meta ?? row.metadata ?? {}) },
            ],
          },
        ];
      case 'mapping':
        return [
          {
            title: 'Overview',
            tone: 'success',
            fields: [
              { label: 'Avatar', value: detailValue(avatarMap.get(row.avatar_id)?.avatar_name || `Avatar ${row.avatar_id}`) },
              { label: 'Priority', value: detailValue(row.priority) },
            ],
          },
          {
            title: 'Relationships',
            fields: [
              { label: 'Intent', value: detailValue(intents.find((entry) => entry.id === row.intent_id)?.name) },
              { label: 'Category', value: detailValue(categoryMap.get(row.category_id)?.name) },
              { label: 'Sub Category', value: detailValue(subjectMap.get(row.subject_id)?.name) },
              { label: 'Specialization', value: detailValue(trackMap.get(row.track_id)?.name) },
              { label: 'Level', value: detailValue(levelMap.get(row.level_id)?.name) },
            ],
          },
        ];
      case 'checkpoint':
        return [
          {
            title: 'Checkpoint Details',
            fields: [
              { label: 'Learning Item', value: detailValue(items.find((entry) => entry.id === row.learning_item_id)?.title) },
              { label: 'Type', value: detailValue(row.checkpoint_type) },
              { label: 'Concept', value: detailValue(row.concept_label) },
              { label: 'Trigger Second', value: detailValue(row.trigger_second) },
              { label: 'Difficulty Score', value: detailValue(row.difficulty_score) },
              { label: 'Mandatory', value: detailValue(row.is_mandatory) },
              { label: 'Assist Mode', value: detailValue(row.assist_mode) },
              { label: 'Config', value: detailValue(row.config ?? {}) },
            ],
          },
        ];
      case 'config':
        return [
          {
            title: 'Configuration Details',
            fields: [
              { label: 'Key', value: detailValue(row.config_key) },
              { label: 'Value', value: detailValue(row.config_value) },
              { label: 'Description', value: detailValue(row.description) },
              { label: 'Updated', value: detailValue(fmtDateTime(row.updated_at)) },
            ],
          },
        ];
      default:
        return [];
    }
  };

  const renderActions = (resource: ResourceKey, row: any, title: string) => (
    <TableActions
      canView
      canEdit={canUpdate}
      canDelete={canDelete}
      onView={() => openView(resource, row, title)}
      onEdit={() => openEdit(resource, row)}
      onDelete={() => setDeleteState({ resource, id: row.id, title })}
    />
  );

  const boolBadge = (value: boolean | null | undefined) => (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        value ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {value ? 'Yes' : 'No'}
    </span>
  );

  if (!hasPageAccess) {
    return <AccessDenied title="Learning admin unavailable" description="Your role does not have permission to manage LMS administration." />;
  }

  const modalValues = modal?.values ?? {};
  const subjectOptions = subjects
    .filter((row) => !modal || !modalValues.category_id || row.category_id === Number(modalValues.category_id))
    .map((row) => ({ value: row.id, label: row.name }));
  const trackOptions = tracks
    .filter((row) => !modal || !modalValues.subject_id || row.subject_id === Number(modalValues.subject_id))
    .map((row) => ({ value: row.id, label: row.name }));

  const renderModalContent = () => {
    if (!modal) return null;
    const values = modal.values;
    const errorSummary = Object.keys(modalErrors).length > 0 ? (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Please complete the highlighted required fields before submitting.
      </div>
    ) : null;

    const footer = (
      <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-5">
        <Button variant="outline" onClick={() => { setModalErrors({}); setModal(null); }} disabled={saving}>Cancel</Button>
        <Button onClick={submitModal} isLoading={saving}>{modal.mode === 'create' ? 'Create' : 'Save changes'}</Button>
      </div>
    );

      if (modal.resource === 'intent') {
        return (
          <div className="space-y-4">
          {errorSummary}
          <Input fieldName="name" label="Intent name" required error={getModalError('name')} value={values.name} onChange={(e) => updateModalField('name', e.target.value)} />
          <Input fieldName="flow_type" label="Flow type" required error={getModalError('flow_type')} value={values.flow_type} onChange={(e) => updateModalField('flow_type', e.target.value)} />
          <Textarea label="Description" value={values.description} onChange={(e: any) => updateModalField('description', e.target.value)} />
          <Input fieldName="entry_type" label="Entry type" required error={getModalError('entry_type')} value={values.entry_type} onChange={(e) => updateModalField('entry_type', e.target.value)} />
          <Select label="Default level" options={[{ value: '', label: 'None' }, ...levelOptions(levels)]} value={values.default_level_id} onChange={(value) => updateModalField('default_level_id', value)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(values.is_active)} onChange={(e) => updateModalField('is_active', e.target.checked)} /> Active</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(values.enable_diagnostic)} onChange={(e) => updateModalField('enable_diagnostic', e.target.checked)} /> Enable diagnostic</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(values.enable_course)} onChange={(e) => updateModalField('enable_course', e.target.checked)} /> Enable course</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(values.enable_avatar)} onChange={(e) => updateModalField('enable_avatar', e.target.checked)} /> Enable avatar</label>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(values.enable_checkpoint)} onChange={(e) => updateModalField('enable_checkpoint', e.target.checked)} /> Enable checkpoint</label>
          </div>
          <Textarea label="Advanced flow config JSON (optional)" value={values.flow_config_json} onChange={(e: any) => updateModalField('flow_config_json', e.target.value)} />
          {footer}
        </div>
      );
    }

      if (modal.resource === 'category' || modal.resource === 'subject' || modal.resource === 'track' || modal.resource === 'level') {
        return (
          <div className="space-y-4">
          {errorSummary}
          {modal.resource === 'subject' && <Select fieldName="category_id" label="Category" required error={getModalError('category_id')} options={categoryOptions} value={values.category_id} onChange={(value) => {
            updateModalField('category_id', value);
            const nextCategory = categoryMap.get(Number(value || 0));
            if (!isLearningEnabledCategory(nextCategory)) {
              updateModalField('specialization_names', '');
              updateModalField('specialization_description', '');
              updateModalField('level_names', '');
            }
          }} />}
          {modal.resource === 'track' && <Select fieldName="subject_id" label="Sub Category" required error={getModalError('subject_id')} options={subjects.map((row) => ({ value: row.id, label: row.name }))} value={values.subject_id} onChange={(value) => updateModalField('subject_id', value)} />}
          <Input fieldName="name" label={modal.resource === 'subject' ? 'Sub Category Name' : 'Name'} required error={getModalError('name')} value={values.name} onChange={(e) => updateModalField('name', e.target.value)} />
          {(modal.resource === 'category' || modal.resource === 'subject' || modal.resource === 'track') && <Textarea label={modal.resource === 'subject' ? 'Sub Category Description' : 'Description'} value={values.description} onChange={(e: any) => updateModalField('description', e.target.value)} />}
          {modal.resource === 'subject' && subjectModalNeedsLearningSetup ? (
            <div className="space-y-4">
              <div className="mt-4">
                <Input
                  fieldName="specialization_names"
                  label="Specialization Name"
                  required={subjectModalRequiresSpecialization}
                  error={getModalError('specialization_names')}
                  value={values.specialization_names}
                  onChange={(e) => updateModalField('specialization_names', e.target.value)}
                  hint={
                    modal.mode === 'edit'
                      ? 'Use one name to add or rename the primary specialization for this sub category.'
                      : 'Example: Interview Skills'
                  }
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Specialization Description"
                  fieldName="specialization_description"
                  value={values.specialization_description}
                  onChange={(e: any) => updateModalField('specialization_description', e.target.value)}
                />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr),180px]">
                <Input
                  fieldName="level_names"
                  label="Level Name"
                  required={subjectModalRequiresLevels}
                  error={getModalError('level_names')}
                  value={values.level_names}
                  onChange={(e) => updateModalField('level_names', e.target.value)}
                  hint={
                    modal.mode === 'edit'
                      ? 'Enter the exact shared level you want linked to this sub category. Existing linked levels stay visible above.'
                      : 'Example: Beginner'
                  }
                />
                <Input
                  label="Position"
                  type="number"
                  value={values.level_order_index}
                  onChange={(e) => updateModalField('level_order_index', e.target.value)}
                  hint="Auto-filled from the next available level order."
                />
              </div>
            </div>
          ) : null}
          {modal.resource === 'category' && <Input label="Position" type="number" value={values.position} onChange={(e) => updateModalField('position', e.target.value)} />}
          {modal.resource === 'level' && <Input fieldName="order_index" label="Order index" required error={getModalError('order_index')} type="number" value={values.order_index} onChange={(e) => updateModalField('order_index', e.target.value)} />}
          {footer}
        </div>
      );
    }

    if (modal.resource === 'config') {
        return (
          <div className="space-y-4">
          {errorSummary}
          <Input fieldName="config_key" label="Config key" required={modal.mode === 'create'} error={getModalError('config_key')} value={values.config_key} onChange={(e) => updateModalField('config_key', e.target.value)} disabled={modal.mode === 'edit'} />
          <Textarea fieldName="config_value_text" label="Config value" required error={getModalError('config_value_text')} value={values.config_value_text} onChange={(e: any) => updateModalField('config_value_text', e.target.value)} />
          <Textarea label="Description" value={values.description} onChange={(e: any) => updateModalField('description', e.target.value)} />
          {footer}
        </div>
      );
    }

    if (modal.resource === 'course' || modal.resource === 'module' || modal.resource === 'submodule' || modal.resource === 'item') {
        return (
          <div className="space-y-4">
          {errorSummary}
          {modal.resource === 'course' && <Select fieldName="teacher_id" label="Teacher" required error={getModalError('teacher_id')} options={teacherOptions} value={values.teacher_id} onChange={(value) => updateModalField('teacher_id', value)} />}
          {modal.resource === 'course' && <Select fieldName="category_id" label="Category" required error={getModalError('category_id')} options={categoryOptions} value={values.category_id} onChange={(value) => updateModalField('category_id', value)} />}
          {modal.resource === 'course' && <Select fieldName="subject_id" label="Sub Category" required error={getModalError('subject_id')} options={[{ value: '', label: 'None' }, ...subjectOptions]} value={values.subject_id} onChange={(value) => updateModalField('subject_id', value)} />}
          {modal.resource === 'course' && <Select label="Specialization" options={[{ value: '', label: 'None' }, ...trackOptions]} value={values.track_id} onChange={(value) => updateModalField('track_id', value)} />}
          {modal.resource === 'course' && <Select label="Level" options={[{ value: '', label: 'None' }, ...levelOptions(levels)]} value={values.level_id} onChange={(value) => updateModalField('level_id', value)} />}
          {modal.resource === 'course' && <Select label="Default avatar" options={[{ value: '', label: 'None' }, ...avatars.map((row) => ({ value: row.id, label: row.avatar_name || `Avatar ${row.id}` }))]} value={values.default_avatar_id} onChange={(value) => updateModalField('default_avatar_id', value)} />}
          {modal.resource === 'module' && <Select fieldName="course_id" label="Course" required error={getModalError('course_id')} options={courses.map((row) => ({ value: row.id, label: row.title }))} value={values.course_id} onChange={(value) => updateModalField('course_id', value)} />}
          {modal.resource === 'submodule' && <Select fieldName="module_id" label="Module" required error={getModalError('module_id')} options={modules.map((row) => ({ value: row.id, label: row.title }))} value={values.module_id} onChange={(value) => updateModalField('module_id', value)} />}
          {modal.resource === 'item' && <Select fieldName="submodule_id" label="Submodule" required error={getModalError('submodule_id')} options={submodules.map((row) => ({ value: row.id, label: row.title }))} value={values.submodule_id} onChange={(value) => updateModalField('submodule_id', value)} />}
          {modal.resource === 'item' && <Select fieldName="type" label="Item type" required error={getModalError('type')} options={[{ value: 'video', label: 'Video' }, { value: 'quiz', label: 'Quiz' }, { value: 'avatar', label: 'Avatar' }]} value={values.type} onChange={(value) => updateModalField('type', value)} />}
          <Input fieldName="title" label="Title" required error={getModalError('title')} value={values.title} onChange={(e) => updateModalField('title', e.target.value)} />
          {(modal.resource === 'course' || modal.resource === 'module') && <Input label="Slug" value={values.slug} onChange={(e) => updateModalField('slug', e.target.value)} hint="Will be normalized before submit." />}
          {modal.resource === 'module' && <Input label="Group" value={values.group} onChange={(e) => updateModalField('group', e.target.value)} />}
          {modal.resource === 'course' && <Input label="Difficulty level" value={values.difficulty_level} onChange={(e) => updateModalField('difficulty_level', e.target.value)} />}
          {(modal.resource === 'course' || modal.resource === 'module') && <Textarea label="Description" value={values.description} onChange={(e: any) => updateModalField('description', e.target.value)} />}
          {modal.resource === 'submodule' && <Textarea label="Summary" value={values.summary} onChange={(e: any) => updateModalField('summary', e.target.value)} />}
          {modal.resource === 'item' && <Textarea label="Description" value={values.description} onChange={(e: any) => updateModalField('description', e.target.value)} />}
          {modal.resource === 'course' && <Textarea fieldName="short_description" label="Short description" required error={getModalError('short_description')} value={values.short_description} onChange={(e: any) => updateModalField('short_description', e.target.value)} />}
          {modal.resource === 'course' && <Textarea fieldName="full_description" label="Full description" required error={getModalError('full_description')} value={values.full_description} onChange={(e: any) => updateModalField('full_description', e.target.value)} />}
          {(modal.resource === 'module' || modal.resource === 'submodule' || modal.resource === 'item') && <Input label="Position" type="number" value={values.position} onChange={(e) => updateModalField('position', e.target.value)} />}
          {(modal.resource === 'course' || modal.resource === 'module') && <Input label="Duration seconds" type="number" value={values.estimated_duration_seconds} onChange={(e) => updateModalField('estimated_duration_seconds', e.target.value)} />}
          {modal.resource === 'item' && <Input label="Estimated seconds" type="number" value={values.estimated_seconds} onChange={(e) => updateModalField('estimated_seconds', e.target.value)} />}
          {modal.resource === 'item' && <Input label="Weight" type="number" step="0.1" value={values.weight} onChange={(e) => updateModalField('weight', e.target.value)} />}
          {(modal.resource === 'course' || modal.resource === 'module' || modal.resource === 'item') && <Input label="Status" type="number" value={values.status} onChange={(e) => updateModalField('status', e.target.value)} />}
          {modal.resource === 'item' && <Input label="Visibility" type="number" value={values.visibility} onChange={(e) => updateModalField('visibility', e.target.value)} />}
          {modal.resource === 'course' && <Input label="Visibility" value={values.visibility} onChange={(e) => updateModalField('visibility', e.target.value)} />}
          {modal.resource === 'course' && <Input label="Publish state" value={values.publish_state} onChange={(e) => updateModalField('publish_state', e.target.value)} />}
          {modal.resource === 'module' && <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(values.is_locked)} onChange={(e) => updateModalField('is_locked', e.target.checked)} /> Locked</label>}
          {modal.resource === 'item' && <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(values.is_mandatory)} onChange={(e) => updateModalField('is_mandatory', e.target.checked)} /> Mandatory</label>}
          {modal.resource === 'item' && <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(values.can_skip)} onChange={(e) => updateModalField('can_skip', e.target.checked)} /> Can skip</label>}
          {modal.resource === 'item' && values.type === 'video' && <Input label="Video URL" value={values.metadata_video_url} onChange={(e) => updateModalField('metadata_video_url', e.target.value)} hint="Direct lesson video URL used by the player/runtime." />}
          {modal.resource === 'item' && <Select label="Target Specialization" options={[{ value: '', label: 'Any specialization' }, ...tracks.map((row) => ({ value: row.id, label: row.name }))]} value={values.metadata_track_id} onChange={(value) => updateModalField('metadata_track_id', value)} />}
          {modal.resource === 'item' && <Select label="Target Level" options={[{ value: '', label: 'Any level' }, ...levelOptions(levels)]} value={values.metadata_level_id} onChange={(value) => updateModalField('metadata_level_id', value)} />}
          {modal.resource === 'item' && <Input label="Difficulty tag" value={values.metadata_difficulty} onChange={(e) => updateModalField('metadata_difficulty', e.target.value)} hint="Optional label like beginner, intermediate, advanced." />}
          {modal.resource === 'item' && <Textarea label="Advanced metadata JSON (optional)" value={values.metadata_json} onChange={(e: any) => updateModalField('metadata_json', e.target.value)} />}
          {footer}
        </div>
      );
    }

      if (modal.resource === 'question' || modal.resource === 'option' || modal.resource === 'rule' || modal.resource === 'mapping' || modal.resource === 'checkpoint') {
        return (
          <div className="space-y-4">
          {errorSummary}
          {modal.resource === 'question' && <Select fieldName="quiz_id" label="Quiz item" required error={getModalError('quiz_id')} options={quizItems.map((row) => ({ value: row.id, label: row.title }))} value={values.quiz_id} onChange={(value) => updateModalField('quiz_id', value)} />}
          {modal.resource === 'question' && <Textarea fieldName="question" label="Question" required error={getModalError('question')} value={values.question} onChange={(e: any) => updateModalField('question', e.target.value)} />}
          {modal.resource === 'question' && <Input fieldName="question_type" label="Question type" required error={getModalError('question_type')} value={values.question_type} onChange={(e) => updateModalField('question_type', e.target.value)} />}
          {modal.resource === 'question' && <Textarea label="Explanation" value={values.explanation} onChange={(e: any) => updateModalField('explanation', e.target.value)} />}
          {modal.resource === 'question' && <Input label="Position" type="number" value={values.position} onChange={(e) => updateModalField('position', e.target.value)} />}
          {modal.resource === 'question' && <Input label="Marks" type="number" step="0.1" value={values.marks} onChange={(e) => updateModalField('marks', e.target.value)} />}
          {modal.resource === 'question' && <Select label="Target Specialization" options={[{ value: '', label: 'Any specialization' }, ...tracks.map((row) => ({ value: row.id, label: row.name }))]} value={values.metadata_track_id} onChange={(value) => updateModalField('metadata_track_id', value)} />}
          {modal.resource === 'question' && <Select label="Target Level" options={[{ value: '', label: 'Any level' }, ...levelOptions(levels)]} value={values.metadata_level_id} onChange={(value) => updateModalField('metadata_level_id', value)} />}
          {modal.resource === 'question' && <Input label="Difficulty" value={values.metadata_difficulty} onChange={(e) => updateModalField('metadata_difficulty', e.target.value)} />}
          {modal.resource === 'question' && <Input label="Accepted answer" value={values.metadata_accepted_answer} onChange={(e) => updateModalField('metadata_accepted_answer', e.target.value)} hint="Useful for text-answer questions." />}
          {modal.resource === 'question' && <Textarea label="Advanced metadata JSON (optional)" value={values.metadata_json} onChange={(e: any) => updateModalField('metadata_json', e.target.value)} />}

          {modal.resource === 'option' && <Select fieldName="question_id" label="Question" required error={getModalError('question_id')} options={filteredQuestions.map((row) => ({ value: row.id, label: row.question }))} value={values.question_id} onChange={(value) => updateModalField('question_id', value)} />}
          {modal.resource === 'option' && <Input fieldName="option_text" label="Option text" required error={getModalError('option_text')} value={values.option_text} onChange={(e) => updateModalField('option_text', e.target.value)} />}
          {modal.resource === 'option' && <Input label="Position" type="number" value={values.position} onChange={(e) => updateModalField('position', e.target.value)} />}
          {modal.resource === 'option' && <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(values.is_correct)} onChange={(e) => updateModalField('is_correct', e.target.checked)} /> Correct answer</label>}
          {modal.resource === 'option' && <Textarea label="Advanced metadata JSON (optional)" value={values.metadata_json} onChange={(e: any) => updateModalField('metadata_json', e.target.value)} />}

          {modal.resource === 'rule' && <Select fieldName="item_id" label="Quiz item" required error={getModalError('item_id')} options={quizItems.map((row) => ({ value: row.id, label: row.title }))} value={values.item_id} onChange={(value) => updateModalField('item_id', value)} />}
          {modal.resource === 'rule' && <Input fieldName="pass_score" label="Pass score" required error={getModalError('pass_score')} type="number" step="0.1" value={values.pass_score} onChange={(e) => updateModalField('pass_score', e.target.value)} />}
          {modal.resource === 'rule' && <Input label="Max attempts" type="number" value={values.max_attempts} onChange={(e) => updateModalField('max_attempts', e.target.value)} />}

          {modal.resource === 'mapping' && <Select fieldName="avatar_id" label="Avatar" required error={getModalError('avatar_id')} options={avatars.map((row) => ({ value: row.id, label: row.avatar_name || `Avatar ${row.id}` }))} value={values.avatar_id} onChange={(value) => updateModalField('avatar_id', value)} />}
          {modal.resource === 'mapping' && <Select label="Intent" options={[{ value: '', label: 'Any' }, ...intents.map((row) => ({ value: row.id, label: row.name }))]} value={values.intent_id} onChange={(value) => updateModalField('intent_id', value)} />}
          {modal.resource === 'mapping' && <Select label="Category" options={[{ value: '', label: 'Any' }, ...categoryOptions]} value={values.category_id} onChange={(value) => updateModalField('category_id', value)} />}
          {modal.resource === 'mapping' && <Select label="Sub Category" options={[{ value: '', label: 'Any' }, ...subjects.map((row) => ({ value: row.id, label: row.name }))]} value={values.subject_id} onChange={(value) => updateModalField('subject_id', value)} />}
          {modal.resource === 'mapping' && <Select label="Specialization" options={[{ value: '', label: 'Any' }, ...tracks.map((row) => ({ value: row.id, label: row.name }))]} value={values.track_id} onChange={(value) => updateModalField('track_id', value)} />}
          {modal.resource === 'mapping' && <Select label="Level" options={[{ value: '', label: 'Any' }, ...levelOptions(levels)]} value={values.level_id} onChange={(value) => updateModalField('level_id', value)} />}
          {modal.resource === 'mapping' && <Input label="Priority" type="number" value={values.priority} onChange={(e) => updateModalField('priority', e.target.value)} />}

          {modal.resource === 'checkpoint' && <Select fieldName="learning_item_id" label="Learning item" required error={getModalError('learning_item_id')} options={items.map((row) => ({ value: row.id, label: row.title }))} value={values.learning_item_id} onChange={(value) => updateModalField('learning_item_id', value)} />}
          {modal.resource === 'checkpoint' && <Input fieldName="checkpoint_type" label="Checkpoint type" required error={getModalError('checkpoint_type')} value={values.checkpoint_type} onChange={(e) => updateModalField('checkpoint_type', e.target.value)} />}
          {modal.resource === 'checkpoint' && <Input fieldName="concept_label" label="Concept label" required error={getModalError('concept_label')} value={values.concept_label} onChange={(e) => updateModalField('concept_label', e.target.value)} />}
          {modal.resource === 'checkpoint' && <Input label="Trigger second" type="number" value={values.trigger_second} onChange={(e) => updateModalField('trigger_second', e.target.value)} />}
          {modal.resource === 'checkpoint' && <Input label="Difficulty score" type="number" step="0.1" value={values.difficulty_score} onChange={(e) => updateModalField('difficulty_score', e.target.value)} />}
          {modal.resource === 'checkpoint' && <Input fieldName="assist_mode" label="Assist mode" required error={getModalError('assist_mode')} value={values.assist_mode} onChange={(e) => updateModalField('assist_mode', e.target.value)} />}
          {modal.resource === 'checkpoint' && <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={Boolean(values.is_mandatory)} onChange={(e) => updateModalField('is_mandatory', e.target.checked)} /> Mandatory</label>}
          {modal.resource === 'checkpoint' && <Textarea label="Checkpoint prompt" value={values.config_prompt} onChange={(e: any) => updateModalField('config_prompt', e.target.value)} />}
          {modal.resource === 'checkpoint' && <Input label="Actions" value={values.config_options_text} onChange={(e) => updateModalField('config_options_text', e.target.value)} hint="Comma separated, e.g. continue, replay_video, start_avatar" />}
          {modal.resource === 'checkpoint' && <Textarea label="Advanced config JSON (optional)" value={values.config_json} onChange={(e: any) => updateModalField('config_json', e.target.value)} />}
          {footer}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-500">Use the contextual controls in this panel to manage this resource.</div>
        {footer}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.10),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_48%,#f5f9ff_100%)]">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
          <div className={`grid gap-4 ${isNavCollapsed ? 'xl:grid-cols-[80px,minmax(0,1fr)]' : 'xl:grid-cols-[200px,minmax(0,1fr)]'}`}>
            <aside className="min-w-0">
              <div className="sticky top-[72px] space-y-4 rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  {!isNavCollapsed ? (
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">LMS Navigation</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">Learning Admin</div>
                    </div>
                  ) : (
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">LMS</div>
                  )}
                  <Tooltip text={isNavCollapsed ? 'Expand navigation' : 'Collapse navigation'} position="right">
                    <button
                      type="button"
                      onClick={() => setIsNavCollapsed((current) => !current)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {isNavCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                    </button>
                  </Tooltip>
                </div>
                <nav className="space-y-1">
                  {visibleTabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.key;
                    const button = (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex w-full items-center rounded-2xl px-3 py-3 text-left text-sm font-medium transition ${
                          isNavCollapsed ? 'justify-center' : 'gap-3'
                        } ${
                          active
                            ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-100/60'
                            : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        <Icon size={17} />
                        {!isNavCollapsed ? <span>{tab.label}</span> : null}
                      </button>
                    );

                    return isNavCollapsed ? (
                      <Tooltip key={tab.key} text={tab.label} position="right">
                        {button}
                      </Tooltip>
                    ) : (
                      button
                    );
                  })}
                </nav>
              </div>
            </aside>
            <div className="min-w-0 space-y-4">
          <div className="rounded-[24px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(236,72,153,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(244,247,255,0.98)_48%,rgba(240,244,248,0.96)_100%)] px-5 py-3 text-slate-900 shadow-[0_18px_42px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <h1 className="mt-2 text-[25px] font-semibold leading-none tracking-tight">{guidance.title}</h1>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600">
                  Build courses, map avatars, and validate learner flow.
                </p>
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  {activeFlowStep.label} · {TABS.find((tab) => tab.key === activeTab)?.label || 'Overview'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={() => setShowContextDetails((current) => !current)}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
                >
                  {showContextDetails ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setShowRuntimePanel((current) => !current)}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700"
                >
                  {showRuntimePanel ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                  Runtime
                </button>
              </div>
            </div>
          </div>

          {showContextDetails ? (
            <div className="mt-4 rounded-[22px] border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
                <GuidancePanel
                  eyebrow={guidance.eyebrow}
                  title={guidance.title}
                  description={guidance.description}
                  bullets={guidance.bullets}
                />
                <RelationshipTree
                  title="Current Relationship Chain"
                  chain={[
                    { label: 'Category', value: contextCategory?.name },
                    { label: 'Sub Category', value: contextSubject?.name },
                    { label: 'Course', value: contextCourse?.title },
                    { label: 'Avatar', value: contextAvatar },
                  ]}
                />
              </div>
            </div>
          ) : null}

          <div className={`grid gap-4 pt-1 ${showRuntimePanel ? 'xl:grid-cols-[minmax(0,1fr),320px]' : ''}`}>
            <div className="min-w-0 space-y-5">
              <div className="hidden flex-wrap gap-2 rounded-2xl border border-blue-100/80 bg-white/90 p-2 shadow-sm shadow-blue-100/30 backdrop-blur">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        active ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {loading ? (
                <LoadingGrid />
              ) : (
                <>
            {activeTab === 'overview' && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Intents" value={intents.length} hint="Entry flow controls" />
                <StatCard label="Courses" value={courses.length} hint="Learning journeys" />
                <StatCard label="Items" value={items.length} hint="Videos, quizzes, avatars" />
                <StatCard label="Mappings" value={avatarMappings.length} hint="Avatar routing coverage" />
                <StatCard label="Categories" value={displayCategories.length} hint="Dynamic learning domains" />
                <StatCard label="Sub Categories" value={subjects.length} hint="Category scoped" />
                <StatCard label="Specializations" value={tracks.length} hint="Sub category scoped" />
                <StatCard label="Levels" value={levels.length} hint="Difficulty ladder" />
                <StatCard label="Published Courses" value={analytics?.publishedCourses ?? 0} hint="Learner visible" />
                <StatCard label="Draft Courses" value={analytics?.draftCourses ?? 0} hint="Builder in progress" />
                <StatCard label="Quiz Questions" value={analytics?.quizQuestions ?? 0} hint="Assessment coverage" />
                <StatCard label="Configs" value={analytics?.configs ?? 0} hint="Runtime tuning" />
              </div>
            )}

            {activeTab === 'intents' && (
              <Card className="border-gray-200/80 shadow-sm">
                <CardContent className="space-y-5 p-6">
                  <SectionHeader title="Intent Management" description="Control entry intent behavior and flow flags." action={canCreate ? <AddActionButton label="Add intent" onClick={() => openCreate('intent')} /> : undefined} />
                  {intents.length === 0 ? <EmptyState title="No intents found" description="Create your first intent flow to control learner entry routing." action="Open Create Intent" /> : (
                    <TableShell headers={['Intent', 'Flow', 'Flags', 'Updated', 'Actions']}>
                      {intents.map((intent) => (
                        <tr key={intent.id}>
                          <td className="px-4 py-3"><div className="font-medium text-gray-900">{intent.name}</div><div className="text-xs text-gray-500">{intent.description || 'No description'}</div></td>
                          <td className="px-4 py-3 text-gray-600">{intent.flow_type || intent.flow_config?.entry_type || '-'}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{['enable_diagnostic', 'enable_course', 'enable_avatar', 'enable_checkpoint'].filter((key) => (intent.flow_config as any)?.[key]).map((key) => key.replace('enable_', '')).join(', ') || 'No toggles enabled'}</td>
                          <td className="px-4 py-3 text-gray-600">{fmtDateTime(intent.updated_at)}</td>
                          <td className="px-4 py-3">{renderActions('intent', intent, intent.name)}</td>
                        </tr>
                      ))}
                    </TableShell>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'structure' && (
              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="border-gray-200/80 shadow-sm">
                  <CardContent className="space-y-4 p-6">
                    <SectionHeader title="Categories" description="Dynamic LMS hierarchy master data." action={canCreate ? <AddActionButton label="Add category" onClick={() => openCreate('category')} /> : undefined} />
                    <div className="space-y-3">
                      {displayCategories.length === 0 ? (
                        <EmptyState title="No categories yet" description="Create records to make the learning graph available." action="Create Category" />
                      ) : (
                        displayCategories.map((row) => (
                          <div key={row.id} className="flex items-start justify-between rounded-2xl border border-gray-200/80 bg-white px-4 py-3">
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900">{row.name}</div>
                              {renderDescriptionPreview('category', row, row.name)}
                            </div>
                            {renderActions('category', row, row.name)}
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200/80 shadow-sm">
                  <CardContent className="space-y-4 p-6">
                    <SectionHeader title="Sub Categories" description="Category-based child options for runtime." action={canCreate ? <AddActionButton label="Add sub category" onClick={() => openCreate('subject')} /> : undefined} />
                    <div className="space-y-3">
                      {categorySubjectGroups.length === 0 ? (
                        <EmptyState title="No sub categories yet" description="Create sub categories under a category to make the learning graph available." action="Create Sub Category" />
                      ) : (
                        categorySubjectGroups.map((group) => (
                          <div key={group.category.id} className="rounded-2xl border border-gray-200/80 bg-white px-4 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenSubCategoryGroups((current) =>
                                  current.includes(group.category.id)
                                    ? current.filter((id) => id !== group.category.id)
                                    : [...current, group.category.id]
                                )
                              }
                              className="flex w-full cursor-pointer items-start justify-between gap-4 text-left"
                            >
                              <div>
                                <div className="font-medium text-gray-900">{group.category.name}</div>
                                <div className="text-sm text-gray-500">
                                  {group.subjects.length > 0 ? `${group.subjects.length} sub categories added` : 'No sub categories added'}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                  {group.subjects.length}
                                </span>
                                {openSubCategoryGroups.includes(group.category.id) ? (
                                  <ArrowUp size={16} className="text-slate-500" />
                                ) : (
                                  <ArrowDown size={16} className="text-slate-500" />
                                )}
                              </div>
                            </button>

                            <div
                              className={`grid transition-all duration-200 ease-out ${
                                openSubCategoryGroups.includes(group.category.id)
                                  ? 'mt-3 grid-rows-[1fr] opacity-100'
                                  : 'grid-rows-[0fr] opacity-0'
                              }`}
                            >
                              <div className="overflow-hidden">
                                <div className="space-y-2 border-t border-slate-100 pt-3">
                                  {group.subjects.length > 0 ? (
                                    group.subjects.map((subject) => (
                                  <div key={subject.id} className="ml-3 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
                                        <div className="min-w-0">
                                          <div className="text-sm font-medium text-emerald-900">{subject.name}</div>
                                          {renderDescriptionPreview('subject', subject, subject.name)}
                                          {isLearningEnabledCategory(group.category) ? (
                                            <div className="mt-2 space-y-1 text-xs text-emerald-900/90">
                                              <div>
                                                Specializations:{' '}
                                                <span className="font-medium">
                                                  {tracks
                                                    .filter((track) => Number(track.subject_id) === Number(subject.id))
                                                    .map((track) => track.name)
                                                    .join(', ') || 'Not added'}
                                                </span>
                                              </div>
                                              <div>
                                                Levels:{' '}
                                                <span className="font-medium">
                                                  {getBoundLevelsForSubject(subject.id, subjectLevelBindings, levels)
                                                    .slice()
                                                    .sort((left, right) => left.order_index - right.order_index)
                                                    .map((level) => level.name)
                                                    .join(', ') || 'Not added'}
                                                </span>
                                              </div>
                                            </div>
                                          ) : null}
                                        </div>
                                        {renderActions('subject', subject, subject.name)}
                                  </div>
                                    ))
                                  ) : (
                                    <div className="ml-3 text-sm text-slate-500">No sub categories linked yet.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200/80 shadow-sm xl:col-span-2">
                  <CardContent className="space-y-4 p-6">
                    <SectionHeader
                      title="Learning Setup Source"
                      description="Teacher and learning-enabled categories now manage specialization and level setup from the Sub Category modal, so hierarchy stays in one place."
                    />
                    <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">How it works now</div>
                      <div className="mt-2">1. Create category.</div>
                      <div className="mt-1">2. Add sub category.</div>
                      <div className="mt-1">3. If the category is Teacher / learning-enabled, create specialization and level directly inside that sub category flow.</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'courses' && (
              <div className="space-y-6">
                <Card className="border-gray-200/80 shadow-sm">
                  <CardContent className="space-y-5 p-6">
                    <SectionHeader title="Course Builder" description="Build the adaptive learning graph from course to item level." action={canCreate ? <AddActionButton label="Add course" onClick={() => openCreate('course')} /> : undefined} />
                    {courses.length === 0 ? <EmptyState title="No courses found" description="Create a course after setting category, sub category, track, and level." action="Open Add Course" /> : (
                      <TableShell headers={['Course', 'Structure', 'Teacher', 'State', 'Actions']}>
                        {courses.map((course) => (
                          <tr key={course.id} className={selectedCourseId === course.id ? 'bg-slate-50' : ''}>
                            <td className="px-4 py-3"><button className="text-left" onClick={() => setSelectedCourseId(course.id)}><div className="font-medium text-gray-900">{course.title}</div><div className="text-xs text-gray-500">{course.slug}</div></button></td>
                            <td className="px-4 py-3 text-gray-600">{categoryMap.get(course.category_id)?.name || '-'} / {course.subject_id ? subjectMap.get(course.subject_id)?.name : 'No sub category'} / {course.track_id ? trackMap.get(course.track_id)?.name : 'No specialization'} / {course.level_id ? levelMap.get(course.level_id)?.name : 'No level'}</td>
                            <td className="px-4 py-3 text-gray-600">{teachers.find((row) => row.id === course.teacher_id)?.name || teachers.find((row) => row.id === course.teacher_id)?.email || `User ${course.teacher_id}`}</td>
                            <td className="px-4 py-3 text-gray-600">{course.publish_state || 'draft'}</td>
                            <td className="px-4 py-3">{renderActions('course', course, course.title)}</td>
                          </tr>
                        ))}
                      </TableShell>
                    )}
                  </CardContent>
                </Card>

                {selectedCourse && (
                  <div className="grid gap-6 xl:grid-cols-3">
                    <Card className="border-gray-200/80 shadow-sm">
                      <CardContent className="space-y-4 p-6">
                        <SectionHeader title="Modules" description={selectedCourse.title} action={canCreate ? <AddActionButton label="Add module" onClick={() => openCreate('module')} /> : undefined} />
                        {filteredModules.length === 0 ? <EmptyState title="No modules yet" description="Add modules to start the course sequence." action="Add Module to selected course" /> : filteredModules.map((module) => (
                          <div key={module.id} className={`rounded-3xl border px-4 py-3 shadow-sm transition-all duration-200 ${selectedModuleId === module.id ? 'border-blue-300 bg-blue-50/60 shadow-blue-100/70' : 'border-slate-200/80 bg-white hover:border-blue-200 hover:shadow-md hover:shadow-blue-100/40'}`}>
                            <button className="w-full text-left" onClick={() => setSelectedModuleId(module.id)}><div className="font-medium text-gray-900">{module.title}</div><div className="text-xs text-gray-500">Position {module.position ?? 0}</div></button>
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <TableActions
                                canView
                                canEdit={canUpdate}
                                canDelete={canDelete}
                                onView={() => openView('module', module, module.title)}
                                onEdit={() => openEdit('module', module)}
                                onDelete={() => setDeleteState({ resource: 'module', id: module.id, title: module.title })}
                              />
                              <div className="flex gap-2">
                              {canUpdate && <IconButton label="Move up" icon={<ArrowUp size={14} />} onClick={() => moveEntity('module', module, 'up')} />}
                              {canUpdate && <IconButton label="Move down" icon={<ArrowDown size={14} />} onClick={() => moveEntity('module', module, 'down')} />}
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-gray-200/80 shadow-sm">
                      <CardContent className="space-y-4 p-6">
                        <SectionHeader title="Submodules" description={selectedModule?.title || 'Select a module'} action={canCreate ? <AddActionButton label="Add submodule" onClick={() => openCreate('submodule')} disabled={!selectedModuleId} /> : undefined} />
                        {filteredSubmodules.length === 0 ? <EmptyState title="No submodules yet" description="Select a module and create child submodules." action="Add Submodule to selected module" /> : filteredSubmodules.map((submodule) => (
                          <div key={submodule.id} className={`rounded-3xl border px-4 py-3 shadow-sm transition-all duration-200 ${selectedSubmoduleId === submodule.id ? 'border-blue-300 bg-blue-50/60 shadow-blue-100/70' : 'border-slate-200/80 bg-white hover:border-blue-200 hover:shadow-md hover:shadow-blue-100/40'}`}>
                            <button className="w-full text-left" onClick={() => setSelectedSubmoduleId(submodule.id)}><div className="font-medium text-gray-900">{submodule.title}</div><div className="text-xs text-gray-500">Position {submodule.position}</div></button>
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <TableActions
                                canView
                                canEdit={canUpdate}
                                canDelete={canDelete}
                                onView={() => openView('submodule', submodule, submodule.title)}
                                onEdit={() => openEdit('submodule', submodule)}
                                onDelete={() => setDeleteState({ resource: 'submodule', id: submodule.id, title: submodule.title })}
                              />
                              <div className="flex gap-2">
                              {canUpdate && <IconButton label="Move up" icon={<ArrowUp size={14} />} onClick={() => moveEntity('submodule', submodule, 'up')} />}
                              {canUpdate && <IconButton label="Move down" icon={<ArrowDown size={14} />} onClick={() => moveEntity('submodule', submodule, 'down')} />}
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-gray-200/80 shadow-sm">
                      <CardContent className="space-y-4 p-6">
                        <SectionHeader title="Learning Items" description={selectedSubmodule?.title || 'Select a submodule'} action={canCreate ? <AddActionButton label="Add item" onClick={() => openCreate('item')} disabled={!selectedSubmoduleId} /> : undefined} />
                        {filteredItems.length === 0 ? <EmptyState title="No items yet" description="Create video, quiz, or avatar items under the selected submodule." action="Add Item to selected submodule" /> : filteredItems.map((item) => (
                          <div key={item.id} className={`rounded-3xl border px-4 py-3 shadow-sm transition-all duration-200 ${selectedQuizItemId === item.id ? 'border-blue-300 bg-blue-50/60 shadow-blue-100/70' : 'border-slate-200/80 bg-white hover:border-blue-200 hover:shadow-md hover:shadow-blue-100/40'}`}>
                            <button className="w-full text-left" onClick={() => item.type === 'quiz' && setSelectedQuizItemId(item.id)}><div className="font-medium text-gray-900">{item.title}</div><div className="text-xs uppercase tracking-wide text-gray-500">{item.type} Â· Position {item.position}</div></button>
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <TableActions
                                canView
                                canEdit={canUpdate}
                                canDelete={canDelete}
                                onView={() => openView('item', item, item.title)}
                                onEdit={() => openEdit('item', item)}
                                onDelete={() => setDeleteState({ resource: 'item', id: item.id, title: item.title })}
                              />
                              <div className="flex gap-2">
                              {canUpdate && <IconButton label="Move up" icon={<ArrowUp size={14} />} onClick={() => moveEntity('item', item, 'up')} />}
                              {canUpdate && <IconButton label="Move down" icon={<ArrowDown size={14} />} onClick={() => moveEntity('item', item, 'down')} />}
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'quiz' && (
              <div className="grid gap-6 xl:grid-cols-3">
                <Card className="border-gray-200/80 shadow-sm">
                  <CardContent className="space-y-4 p-6">
                    <SectionHeader title="Quiz Items" description="Choose a quiz learning item to manage questions and rules." />
                    <Select label="Quiz item" options={quizItems.map((row) => ({ value: row.id, label: row.title }))} value={selectedQuizItemId ?? ''} onChange={(value) => setSelectedQuizItemId(Number(value))} />
                    {canCreate && <AddActionButton label="Add question" onClick={() => openCreate('question')} disabled={!selectedQuizItemId} />}
                    {canCreate && <AddActionButton label={selectedRule ? 'Create another rule' : 'Create rule'} onClick={() => openCreate('rule')} disabled={!selectedQuizItemId} />}
                  </CardContent>
                </Card>
                <Card className="border-gray-200/80 shadow-sm">
                  <CardContent className="space-y-4 p-6">
                    <SectionHeader title="Questions" description="Manage question bank for the selected quiz." />
                    {filteredQuestions.length === 0 ? <EmptyState title="No questions yet" description="Add the first question to the selected quiz." action="Select quiz item and add question" /> : filteredQuestions.map((question) => (
                      <div key={question.id} className={`rounded-3xl border px-4 py-3 shadow-sm transition-all duration-200 ${selectedQuestionId === question.id ? 'border-blue-300 bg-blue-50/60 shadow-blue-100/70' : 'border-slate-200/80 bg-white hover:border-blue-200 hover:shadow-md hover:shadow-blue-100/40'}`}>
                        <button className="w-full text-left" onClick={() => setSelectedQuestionId(question.id)}><div className="font-medium text-gray-900">{question.question}</div><div className="text-xs text-gray-500">{question.question_type} Â· Marks {question.marks ?? 0}</div></button>
                        <div className="mt-3"><TableActions canView canEdit={canUpdate} canDelete={canDelete} onView={() => openView('question', question, 'Question')} onEdit={() => openEdit('question', question)} onDelete={() => setDeleteState({ resource: 'question', id: question.id, title: 'question' })} /></div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border-gray-200/80 shadow-sm">
                  <CardContent className="space-y-4 p-6">
                    <SectionHeader title="Options & Rule" description="Manage answer options and pass thresholds." action={canCreate ? <AddActionButton label="Add option" onClick={() => openCreate('option')} disabled={!selectedQuestionId} /> : undefined} />
                    {selectedRule ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 shadow-sm shadow-emerald-100"><div className="text-sm font-semibold text-emerald-900">Pass score {selectedRule.pass_score}%</div><div className="text-xs text-emerald-700">Max attempts {selectedRule.max_attempts ?? 0}</div><div className="mt-3"><TableActions canView canEdit={canUpdate} canDelete={canDelete} onView={() => openView('rule', selectedRule, 'Quiz rule')} onEdit={() => openEdit('rule', selectedRule)} onDelete={() => setDeleteState({ resource: 'rule', id: selectedRule.id, title: 'quiz rule' })} /></div></div> : <EmptyState title="No quiz rule" description="Create a pass rule for the selected quiz item." action="Add quiz rule" />}
                    {filteredOptions.length === 0 ? <EmptyState title="No options yet" description="Select a question and add answer options." action="Add answer options" /> : filteredOptions.map((option) => (
                      <div key={option.id} className="rounded-3xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm shadow-slate-100 transition-all hover:border-blue-200 hover:shadow-md hover:shadow-blue-100/40">
                        <div className="flex items-center justify-between gap-3"><div className="space-y-1"><div className="font-medium text-gray-900">{option.option_text}</div><div className="text-xs text-gray-500">Position {option.position ?? 0}</div></div>{boolBadge(option.is_correct)}</div>
                        <div className="mt-3"><TableActions canView canEdit={canUpdate} canDelete={canDelete} onView={() => openView('option', option, 'Quiz option')} onEdit={() => openEdit('option', option)} onDelete={() => setDeleteState({ resource: 'option', id: option.id, title: 'quiz option' })} /></div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'mappings' && (
              <div className="space-y-6">
                <Card className="border-blue-100/80 bg-white/95 shadow-sm shadow-blue-100/40">
                  <CardContent className="space-y-5 p-6">
                    <SectionHeader
                      title="Runtime Preview"
                      description="Preview which avatar the backend will select for a given learning context."
                    />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <Select
                        label="Course"
                        options={[{ value: '', label: 'Select course' }, ...courses.map((row) => ({ value: row.id, label: row.title }))]}
                        value={mappingPreviewForm.course_id}
                        onChange={(value) => updateMappingPreviewField('course_id', value ? Number(value) : '')}
                      />
                      <Select
                        label="Intent"
                        options={[{ value: '', label: 'Any intent' }, ...intents.map((row) => ({ value: row.id, label: row.name }))]}
                        value={mappingPreviewForm.intent_id}
                        onChange={(value) => updateMappingPreviewField('intent_id', value ? Number(value) : '')}
                      />
                      <Select
                        label="Category"
                        options={[{ value: '', label: 'Any category' }, ...categoryOptions]}
                        value={mappingPreviewForm.category_id}
                        onChange={(value) => updateMappingPreviewField('category_id', value ? Number(value) : '')}
                      />
                      <Select
                        label="Sub Category"
                        options={[{ value: '', label: 'Any sub category' }, ...subjects.map((row) => ({ value: row.id, label: row.name }))]}
                        value={mappingPreviewForm.subject_id}
                        onChange={(value) => updateMappingPreviewField('subject_id', value ? Number(value) : '')}
                      />
                      <Select
                        label="Specialization"
                        options={[{ value: '', label: 'Any specialization' }, ...tracks.map((row) => ({ value: row.id, label: row.name }))]}
                        value={mappingPreviewForm.track_id}
                        onChange={(value) => updateMappingPreviewField('track_id', value ? Number(value) : '')}
                      />
                      <Select
                        label="Level"
                        options={[{ value: '', label: 'Any level' }, ...levels.map((row) => ({ value: row.id, label: row.name }))]}
                        value={mappingPreviewForm.level_id}
                        onChange={(value) => updateMappingPreviewField('level_id', value ? Number(value) : '')}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button onClick={runMappingPreview} isLoading={mappingPreviewLoading} disabled={!mappingPreviewForm.course_id}>
                        Preview Avatar
                      </Button>
                      {previewCourse ? (
                        <div className="text-sm text-slate-500">
                          Using course defaults from <span className="font-medium text-slate-700">{previewCourse.title}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">Select a course to preview exact runtime routing.</div>
                      )}
                    </div>
                    {mappingPreview ? (
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5 shadow-sm shadow-emerald-100">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-sm font-medium uppercase tracking-[0.12em] text-emerald-700">Selected Avatar</div>
                            <div className="mt-1 text-2xl font-semibold text-emerald-950">{mappingPreview.avatar_name}</div>
                            <div className="mt-2 text-sm text-emerald-800">
                              Source: <span className="font-medium">{mappingPreview.source}</span>
                              {' â€¢ '}
                              Priority: <span className="font-medium">{mappingPreview.priority}</span>
                            </div>
                          </div>
                          <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm">
                            {mappingPreview.mapped_courses.length > 0
                              ? mappingPreview.mapped_courses.map((row) => row.title).join(', ')
                              : 'No course mapping payload returned'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmptyState title="No preview yet" description="Run preview to inspect the live backend avatar selection result." action="Choose context and run preview" />
                    )}
                  </CardContent>
                </Card>

                <Card className="border-gray-200/80 shadow-sm">
                  <CardContent className="space-y-5 p-6">
                  <SectionHeader title="Avatar Mapping" description="Context-aware avatar routing for intent and structure combinations." action={canCreate ? <AddActionButton label="Add mapping" onClick={() => openCreate('mapping')} /> : undefined} />
                    {avatarMappings.length === 0 ? <EmptyState title="No avatar mappings yet" description="Create routing rules to bind avatars to learning context." action="Create avatar mapping" /> : (
                      <TableShell headers={['Avatar', 'Context', 'Priority', 'Actions']}>
                        {avatarMappings.map((mapping) => (
                          <tr key={mapping.id}>
                            <td className="px-4 py-3 text-gray-900">{avatarMap.get(mapping.avatar_id)?.avatar_name || `Avatar ${mapping.avatar_id}`}</td>
                            <td className="px-4 py-3 text-gray-600">{[mapping.intent_id ? intents.find((row) => row.id === mapping.intent_id)?.name : null, mapping.category_id ? categoryMap.get(mapping.category_id)?.name : null, mapping.subject_id ? subjectMap.get(mapping.subject_id)?.name : null, mapping.track_id ? trackMap.get(mapping.track_id)?.name : null, mapping.level_id ? levelMap.get(mapping.level_id)?.name : null].filter(Boolean).join(' / ') || 'Global default'}</td>
                            <td className="px-4 py-3 text-gray-600">{mapping.priority ?? 1}</td>
                            <td className="px-4 py-3">{renderActions('mapping', mapping, 'avatar mapping')}</td>
                          </tr>
                        ))}
                      </TableShell>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'checkpoints' && (
              <Card className="border-gray-200/80 shadow-sm">
                <CardContent className="space-y-5 p-6">
                  <SectionHeader title="Checkpoint Management" description="Configure struggle detection and assistance checkpoints." action={canCreate ? <AddActionButton label="Add checkpoint" onClick={() => openCreate('checkpoint')} /> : undefined} />
                  {checkpoints.length === 0 ? <EmptyState title="No checkpoints found" description="Create checkpoints to shape adaptive intervention behavior." action="Add checkpoint" /> : (
                    <TableShell headers={['Item', 'Type', 'Concept', 'Assist', 'Actions']}>
                      {checkpoints.map((checkpoint) => (
                        <tr key={checkpoint.id}>
                          <td className="px-4 py-3 text-gray-900">{items.find((row) => row.id === checkpoint.learning_item_id)?.title || `Item ${checkpoint.learning_item_id}`}</td>
                          <td className="px-4 py-3 text-gray-600">{checkpoint.checkpoint_type || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{checkpoint.concept_label || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{checkpoint.assist_mode || '-'}</td>
                          <td className="px-4 py-3">{renderActions('checkpoint', checkpoint, 'checkpoint')}</td>
                        </tr>
                      ))}
                    </TableShell>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'config' && (
              <Card className="border-gray-200/80 shadow-sm">
                <CardContent className="space-y-5 p-6">
                  <SectionHeader title="Configuration Panel" description="Manage runtime configuration values used by the adaptive learning engine." action={canCreate ? <AddActionButton label="Add config" onClick={() => openCreate('config')} /> : undefined} />
                  {configs.length === 0 ? <EmptyState title="No configs found" description="Create tenant-scoped configuration values for LMS runtime." action="Add configuration value" /> : (
                    <TableShell headers={['Key', 'Value', 'Description', 'Updated', 'Actions']}>
                      {configs.map((config) => (
                        <tr key={config.id}>
                          <td className="px-4 py-3 font-medium text-gray-900">{config.config_key}</td>
                          <td className="max-w-md px-4 py-3 text-xs text-gray-600">{stringifyJson(config.config_value)}</td>
                          <td className="px-4 py-3 text-gray-600">{config.description || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{fmtDateTime(config.updated_at)}</td>
                          <td className="px-4 py-3">{renderActions('config', config, config.config_key)}</td>
                        </tr>
                      ))}
                    </TableShell>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === 'analytics' && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Quiz Items" value={analytics?.quizItems ?? 0} hint="Assessment-enabled items" />
                <StatCard label="Avatar Items" value={analytics?.avatarItems ?? 0} hint="Live avatar learning steps" />
                <StatCard label="Video Items" value={analytics?.videoItems ?? 0} hint="Content playback nodes" />
                <StatCard label="Mappings" value={analytics?.avatarMappings ?? 0} hint="Context routing coverage" />
              </div>
            )}
                </>
              )}
            </div>

            {showRuntimePanel ? (
              <aside className="min-w-0">
                <div className="sticky top-[170px] space-y-4 rounded-[22px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">Runtime Preview</div>
                    <h2 className="mt-2 text-base font-semibold text-slate-950">Read-only learner flow</h2>
                    <p className="mt-1 text-sm text-slate-600">Use this panel to understand how the current setup moves from intent to avatar without mutating backend state.</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: 'Intent', value: intents[0]?.name || 'Not selected yet' },
                      { label: 'Course', value: contextCourse?.title || 'Not selected yet' },
                      { label: 'Video', value: filteredItems.find((row) => row.type === 'video')?.title || 'No video item in current scope' },
                      { label: 'Quiz', value: filteredItems.find((row) => row.type === 'quiz')?.title || 'No quiz item in current scope' },
                      { label: 'Avatar', value: contextAvatar || 'Not resolved yet' },
                    ].map((step, index) => (
                      <div key={step.label} className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                          {index + 1}
                        </div>
                        <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{step.label}</div>
                          <div className="mt-1 text-sm font-medium text-slate-800">{step.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Live Selection Snapshot</div>
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      <div>Sub Category: <span className="font-medium">{contextSubject?.name || 'Not set'}</span></div>
                      <div>Specialization: <span className="font-medium">{contextTrack?.name || 'Not set'}</span></div>
                      <div>Level: <span className="font-medium">{contextLevel?.name || 'Not set'}</span></div>
                      <div>Preview status: <span className="font-medium">{mappingPreview ? mappingPreview.source : 'No preview run yet'}</span></div>
                    </div>
                  </div>
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </div>
      </div>

        <Modal
          isOpen={Boolean(modal)}
          onClose={() => {
            if (saving) return;
            setModalErrors({});
            setModal(null);
          }}
          title={modal ? `${modal.mode === 'create' ? 'Create' : 'Edit'} ${getResourceLabel(modal.resource)}` : ''}
          size="lg"
        >
        {renderModalContent()}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteState)}
        title="Delete record"
        message={`Delete ${deleteState?.title || 'this record'}? This will use the existing backend delete flow.`}
        onConfirm={confirmDelete}
        onCancel={() => !saving && setDeleteState(null)}
        confirmText="Delete"
        isLoading={saving}
      />

      <ViewDrawer
        open={Boolean(viewState)}
        title={viewState?.title || 'Details'}
        subtitle={viewState?.subtitle}
        sections={renderViewSections()}
        onClose={() => setViewState(null)}
        onEdit={
          viewState && canUpdate
            ? () => {
                const currentView = viewState;
                setViewState(null);
                openEdit(currentView.resource, currentView.row);
              }
            : undefined
        }
      />
    </div>
  );
}
