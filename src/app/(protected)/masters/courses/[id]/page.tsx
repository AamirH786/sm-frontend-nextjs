'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronRight, Code2, Edit,
  FileText, FileVideo, HelpCircle, Layers, Loader2, Plus, Trash2, UploadCloud, Video, X,
} from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Tooltip from '@/components/ui/Tooltip';
import { useToast } from '@/context/ToastContext';
import {
  adminLearningService,
  assessmentService,
  levelService,
  topicQuizService,
  LearningCourse, LearningModule, LearningSubmodule, LearningItem,
  DiagnosticQuestion, DiagnosticOption, LevelMaster,
  TopicQuiz, TopicQuizQuestion,
} from '@/services/adminLearningService';

// ─── Types ────────────────────────────────────────────────────────────────────
type ActiveTab = 'modules' | 'quiz';
type ModuleForm = { title: string; description: string };
type CourseEditForm = {
  title: string;
  short_description: string;
  full_description: string;
  intro_video_url: string;
  thumbnail: string;
  price: number | null;
  complimentary_minutes: number | null;
};
type TopicForm = {
  title: string;
  description: string;
  video_url: string;
  has_code_practice: boolean;
  code_practice_url: string;
};

type UploadedFile = {
  filename: string;
  original_name: string;
  file_url: string;
  file_size: number;
  chunk_count: number;
  mime_type: string;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// ─── Topic Row ────────────────────────────────────────────────────────────────
function TopicRow({
  topic,
  contentItem,
  quizCount,
  onEdit,
  onDelete,
  onManageQuiz,
}: {
  topic: LearningSubmodule;
  contentItem?: LearningItem;
  quizCount?: number;
  onEdit: () => void;
  onDelete: () => void;
  onManageQuiz: () => void;
}) {
  const meta = (contentItem?.meta as any) || {};
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white p-3 hover:border-slate-200 transition-colors">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50">
        <FileVideo size={14} className="text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{topic.title}</p>
        {topic.summary && <p className="text-xs text-slate-500 mt-0.5 truncate">{topic.summary}</p>}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {meta.video_url && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              <Video size={10} /> Video
            </span>
          )}
          {meta.has_code_practice && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
              <Code2 size={10} /> Code Practice
            </span>
          )}
          {meta.file_urls?.length > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              {meta.file_urls.length} File{meta.file_urls.length > 1 ? 's' : ''}
            </span>
          )}
          {quizCount !== undefined && quizCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
              <HelpCircle size={10} /> {quizCount} Q
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Tooltip text="Practice quiz">
          <button onClick={onManageQuiz} className="rounded p-1.5 hover:bg-green-50">
            <HelpCircle size={13} className="text-green-500" />
          </button>
        </Tooltip>
        <Tooltip text="Edit topic">
          <button onClick={onEdit} className="rounded p-1.5 hover:bg-slate-100">
            <Edit size={13} className="text-slate-400" />
          </button>
        </Tooltip>
        <Tooltip text="Delete topic">
          <button onClick={onDelete} className="rounded p-1.5 hover:bg-red-50">
            <Trash2 size={13} className="text-red-400" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

// ─── Module Card ──────────────────────────────────────────────────────────────
function ModuleCard({
  mod,
  topics,
  contentItems,
  topicQuizCounts,
  onEditModule,
  onDeleteModule,
  onAddTopic,
  onEditTopic,
  onDeleteTopic,
  onManageTopicQuiz,
}: {
  mod: LearningModule;
  topics: LearningSubmodule[];
  contentItems: LearningItem[];
  topicQuizCounts: Record<number, number>;
  onEditModule: () => void;
  onDeleteModule: () => void;
  onAddTopic: () => void;
  onEditTopic: (t: LearningSubmodule) => void;
  onDeleteTopic: (t: LearningSubmodule) => void;
  onManageTopicQuiz: (t: LearningSubmodule) => void;
}) {
  const [open, setOpen] = useState(true);
  const modTopics = topics.filter(t => t.module_id === mod.id);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 text-left">
          {open ? <ChevronDown size={15} className="shrink-0 text-slate-400" /> : <ChevronRight size={15} className="shrink-0 text-slate-400" />}
          <div>
            <p className="text-sm font-semibold text-slate-800">{mod.title}</p>
            {mod.description && <p className="text-xs text-slate-400 mt-0.5">{mod.description}</p>}
          </div>
        </button>
        <span className="text-xs text-slate-400">{modTopics.length} topic{modTopics.length !== 1 ? 's' : ''}</span>
        <div className="flex gap-1">
          <Tooltip text="Add topic">
            <button onClick={onAddTopic} className="rounded p-1.5 hover:bg-blue-50 text-blue-500">
              <Plus size={14} />
            </button>
          </Tooltip>
          <Tooltip text="Edit module">
            <button onClick={onEditModule} className="rounded p-1.5 hover:bg-slate-100">
              <Edit size={14} className="text-slate-400" />
            </button>
          </Tooltip>
          <Tooltip text="Delete module">
            <button onClick={onDeleteModule} className="rounded p-1.5 hover:bg-red-50">
              <Trash2 size={14} className="text-red-400" />
            </button>
          </Tooltip>
        </div>
      </div>

      {open && (
        <div className="p-3 space-y-2">
          {modTopics.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-slate-400">No topics yet.</p>
              <button onClick={onAddTopic} className="mt-2 text-xs text-blue-500 hover:underline">
                + Add first topic
              </button>
            </div>
          ) : (
            modTopics.map(t => (
              <TopicRow
                key={t.id}
                topic={t}
                contentItem={contentItems.find(ci => ci.submodule_id === t.id && ci.type === 'content')}
                quizCount={topicQuizCounts[t.id]}
                onEdit={() => onEditTopic(t)}
                onDelete={() => onDeleteTopic(t)}
                onManageQuiz={() => onManageTopicQuiz(t)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const courseId = Number(id);

  const [course, setCourse] = useState<LearningCourse | null>(null);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [topics, setTopics] = useState<LearningSubmodule[]>([]);
  const [contentItems, setContentItems] = useState<LearningItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('modules');

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileUploading, setFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentTopicId = useRef<string>('general');

  // Assessment quiz state
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [levels, setLevels] = useState<LevelMaster[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [qModal, setQModal] = useState<{ open: boolean; editing: DiagnosticQuestion | null }>({ open: false, editing: null });
  const [qForm, setQForm] = useState({ question: '', level_id: '', options: [
    { text: '', is_correct: true },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ] as DiagnosticOption[] });
  const [qSaving, setQSaving] = useState(false);

  // Module levels state
  const [moduleLevelIds, setModuleLevelIds] = useState<number[]>([]);

  // Topic practice quiz state
  const [topicQuizCounts, setTopicQuizCounts] = useState<Record<number, number>>({});
  const [topicQuizModal, setTopicQuizModal] = useState<{ open: boolean; topic: LearningSubmodule | null }>({ open: false, topic: null });
  const [topicQuiz, setTopicQuiz] = useState<TopicQuiz | null>(null);
  const [topicQuizLoading, setTopicQuizLoading] = useState(false);
  const [tqModal, setTqModal] = useState<{ open: boolean; editing: TopicQuizQuestion | null }>({ open: false, editing: null });
  const [tqForm, setTqForm] = useState({
    question: '',
    explanation: '',
    marks: '1',
    options: [
      { text: '', is_correct: true },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
    ],
  });
  const [tqSaving, setTqSaving] = useState(false);
  const [tqPassScore, setTqPassScore] = useState('70');
  const [tqMaxAttempts, setTqMaxAttempts] = useState('3');

  const [moduleModal, setModuleModal] = useState<{ open: boolean; editing: LearningModule | null }>({ open: false, editing: null });
  const [topicModal, setTopicModal] = useState<{ open: boolean; editing: LearningSubmodule | null; moduleId: number | null }>({ open: false, editing: null, moduleId: null });
  const [courseEditOpen, setCourseEditOpen] = useState(false);

  const moduleForm = useForm<ModuleForm>();
  const topicForm = useForm<TopicForm>({ defaultValues: { has_code_practice: false } });
  const courseEditForm = useForm<CourseEditForm>();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [allCourses, allModules, allTopics, allItems] = await Promise.all([
        adminLearningService.courses.list(),
        adminLearningService.modules.list(),
        adminLearningService.submodules.list(),
        adminLearningService.learningItems.list(),
      ]);

      const found = (Array.isArray(allCourses) ? allCourses : []).find((c: LearningCourse) => c.id === courseId);
      setCourse(found ?? null);

      const courseModules = (Array.isArray(allModules) ? allModules : [])
        .filter((m: LearningModule) => m.course_id === courseId)
        .sort((a: LearningModule, b: LearningModule) => (a.position ?? 0) - (b.position ?? 0));
      setModules(courseModules);

      const moduleIds = new Set(courseModules.map((m: LearningModule) => m.id));
      const courseTopics = (Array.isArray(allTopics) ? allTopics : [])
        .filter((t: LearningSubmodule) => moduleIds.has(t.module_id))
        .sort((a: LearningSubmodule, b: LearningSubmodule) => (a.position ?? 0) - (b.position ?? 0));
      setTopics(courseTopics);

      const topicIds = new Set(courseTopics.map((t: LearningSubmodule) => t.id));
      const items = (Array.isArray(allItems) ? allItems : [])
        .filter((i: LearningItem) => topicIds.has(i.submodule_id));
      setContentItems(items);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to load course', 'error');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  // ── Quiz / Levels load ──
  const loadQuiz = useCallback(async () => {
    if (quizLoading) return;
    setQuizLoading(true);
    try {
      const [qs, lvls] = await Promise.all([
        assessmentService.listQuestions(courseId),
        levelService.list(),
      ]);
      setQuestions(Array.isArray(qs) ? qs : []);
      setLevels(Array.isArray(lvls) ? lvls : []);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to load quiz', 'error');
    } finally {
      setQuizLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (activeTab === 'quiz' && questions.length === 0 && levels.length === 0) {
      loadQuiz();
    }
    if (activeTab === 'modules' && levels.length === 0) {
      levelService.list().then(lvls => setLevels(Array.isArray(lvls) ? lvls : [])).catch(() => {});
    }
  }, [activeTab]);

  // ── Topic Practice Quiz actions ──
  const openTopicQuiz = async (topic: LearningSubmodule) => {
    setTopicQuizModal({ open: true, topic });
    setTopicQuiz(null);
    setTopicQuizLoading(true);
    try {
      const data = await topicQuizService.get(topic.id);
      setTopicQuiz(data);
      setTqPassScore(String(data.pass_score ?? 70));
      setTqMaxAttempts(String(data.max_attempts ?? 3));
      setTopicQuizCounts(prev => ({ ...prev, [topic.id]: data.questions.length }));
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to load topic quiz', 'error');
    } finally {
      setTopicQuizLoading(false);
    }
  };

  const closeTopicQuizModal = () => {
    if (topicQuizModal.topic && topicQuiz) {
      setTopicQuizCounts(prev => ({ ...prev, [topicQuizModal.topic!.id]: topicQuiz.questions.length }));
    }
    setTopicQuizModal({ open: false, topic: null });
    setTopicQuiz(null);
    setTqModal({ open: false, editing: null });
  };

  const openAddTQ = () => {
    setTqForm({ question: '', explanation: '', marks: '1', options: [
      { text: '', is_correct: true }, { text: '', is_correct: false },
      { text: '', is_correct: false }, { text: '', is_correct: false },
    ]});
    setTqModal({ open: true, editing: null });
  };

  const openEditTQ = (q: TopicQuizQuestion) => {
    const opts = q.options.length >= 4 ? q.options.map(o => ({ text: o.option_text, is_correct: !!o.is_correct }))
      : [...q.options.map(o => ({ text: o.option_text, is_correct: !!o.is_correct })),
         ...Array(4 - q.options.length).fill({ text: '', is_correct: false })];
    setTqForm({ question: q.question, explanation: q.explanation || '', marks: String(q.marks ?? 1), options: opts });
    setTqModal({ open: true, editing: q });
  };

  const saveTQ = async () => {
    if (!topicQuizModal.topic || !topicQuiz) return;
    const topicId = topicQuizModal.topic.id;
    const payload = {
      question: tqForm.question.trim(),
      explanation: tqForm.explanation.trim() || null,
      marks: parseFloat(tqForm.marks) || 1,
      options: tqForm.options.map((o, i) => ({ option_text: o.text, is_correct: o.is_correct, position: i + 1 })),
    };
    if (!payload.question) { showToast('Question is required', 'error'); return; }
    if (payload.options.filter(o => o.option_text.trim()).length < 2) { showToast('Add at least 2 options', 'error'); return; }
    if (!payload.options.some(o => o.is_correct)) { showToast('Mark one option as correct', 'error'); return; }
    setTqSaving(true);
    try {
      if (tqModal.editing) {
        const updated = await topicQuizService.updateQuestion(topicId, tqModal.editing.id, payload);
        setTopicQuiz(prev => prev ? { ...prev, questions: prev.questions.map(q => q.id === updated.id ? updated : q) } : prev);
      } else {
        const created = await topicQuizService.addQuestion(topicId, payload);
        setTopicQuiz(prev => prev ? { ...prev, questions: [...prev.questions, created] } : prev);
      }
      setTqModal({ open: false, editing: null });
      showToast(tqModal.editing ? 'Question updated' : 'Question added', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to save question', 'error');
    } finally {
      setTqSaving(false);
    }
  };

  const deleteTQ = async (topicId: number, qId: number) => {
    if (!confirm('Delete this question?')) return;
    try {
      await topicQuizService.deleteQuestion(topicId, qId);
      setTopicQuiz(prev => prev ? { ...prev, questions: prev.questions.filter(q => q.id !== qId) } : prev);
      showToast('Question deleted', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to delete', 'error');
    }
  };

  const saveTQRules = async () => {
    if (!topicQuizModal.topic) return;
    try {
      await topicQuizService.updateRules(topicQuizModal.topic.id, parseFloat(tqPassScore) || 70, parseInt(tqMaxAttempts) || 3);
      showToast('Quiz settings saved', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to save settings', 'error');
    }
  };

  // ── Quiz question actions ──
  const openAddQuestion = () => {
    setQForm({
      question: '',
      level_id: levels[0] ? String(levels[0].id) : '',
      options: [
        { text: '', is_correct: true },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
        { text: '', is_correct: false },
      ],
    });
    setQModal({ open: true, editing: null });
  };

  const openEditQuestion = (q: DiagnosticQuestion) => {
    const opts: DiagnosticOption[] = q.options.length >= 4
      ? q.options
      : [
          ...q.options,
          ...Array(4 - q.options.length).fill({ text: '', is_correct: false }),
        ];
    setQForm({
      question: q.question,
      level_id: q.level_id ? String(q.level_id) : '',
      options: opts,
    });
    setQModal({ open: true, editing: q });
  };

  const submitQuestion = async () => {
    if (!qForm.question.trim()) { showToast('Question text is required', 'error'); return; }
    const correctCount = qForm.options.filter(o => o.is_correct).length;
    if (correctCount === 0) { showToast('Mark at least one correct answer', 'error'); return; }
    const filledOpts = qForm.options.filter(o => o.text.trim());
    if (filledOpts.length < 2) { showToast('At least 2 options are required', 'error'); return; }

    const payload = {
      question: qForm.question.trim(),
      difficulty: levels.find(l => l.id === Number(qForm.level_id))?.name?.toLowerCase() || 'beginner',
      level_id: qForm.level_id ? Number(qForm.level_id) : null,
      options: filledOpts,
    };

    setQSaving(true);
    try {
      if (qModal.editing) {
        const updated = await assessmentService.updateQuestion(qModal.editing.id, payload);
        setQuestions(prev => prev.map(q => q.id === qModal.editing!.id ? updated : q));
        showToast('Question updated', 'success');
      } else {
        const created = await assessmentService.addQuestion(courseId, payload);
        setQuestions(prev => [...prev, created]);
        showToast('Question added', 'success');
      }
      setQModal({ open: false, editing: null });
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Save failed', 'error');
    } finally {
      setQSaving(false);
    }
  };

  const deleteQuestion = async (q: DiagnosticQuestion) => {
    if (!confirm(`Delete this question?`)) return;
    try {
      await assessmentService.deleteQuestion(q.id);
      setQuestions(prev => prev.filter(x => x.id !== q.id));
      showToast('Question deleted', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Delete failed', 'error');
    }
  };

  const toggleOption = (idx: number, field: 'is_correct') => {
    setQForm(prev => ({
      ...prev,
      options: prev.options.map((o, i) =>
        field === 'is_correct' ? { ...o, is_correct: i === idx } : o
      ),
    }));
  };

  const updateOptionText = (idx: number, text: string) => {
    setQForm(prev => ({
      ...prev,
      options: prev.options.map((o, i) => i === idx ? { ...o, text } : o),
    }));
  };

  // ── Module actions ──
  const openAddModule = () => {
    moduleForm.reset({ title: '', description: '' });
    setModuleLevelIds([]);
    setModuleModal({ open: true, editing: null });
  };

  const openEditModule = async (mod: LearningModule) => {
    moduleForm.reset({ title: mod.title, description: mod.description || '' });
    setModuleModal({ open: true, editing: mod });
    try {
      const lvlIds = await levelService.getModuleLevels(mod.id);
      setModuleLevelIds(Array.isArray(lvlIds) ? lvlIds : []);
    } catch {
      setModuleLevelIds([]);
    }
  };

  const submitModule = moduleForm.handleSubmit(async values => {
    try {
      let savedId: number;
      if (moduleModal.editing) {
        await adminLearningService.modules.update(moduleModal.editing.id, {
          title: values.title,
          description: values.description || null,
        });
        savedId = moduleModal.editing.id;
        showToast('Module updated', 'success');
      } else {
        const created = await adminLearningService.modules.create({
          course_id: courseId,
          title: values.title,
          slug: slugify(values.title),
          description: values.description || null,
          position: modules.length + 1,
        } as any);
        savedId = (created as any).id;
        showToast('Module added', 'success');
      }
      // Save module levels
      if (moduleLevelIds.length > 0) {
        await levelService.setModuleLevels(savedId, moduleLevelIds);
      }
      setModuleModal({ open: false, editing: null });
      setModuleLevelIds([]);
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Save failed', 'error');
    }
  });

  const deleteModule = async (mod: LearningModule) => {
    if (!confirm(`Delete module "${mod.title}"? All its topics will also be removed.`)) return;
    try {
      await adminLearningService.modules.delete(mod.id);
      showToast('Module deleted', 'success');
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Delete failed', 'error');
    }
  };

  // ── Course edit ──
  const openEditCourse = () => {
    if (!course) return;
    courseEditForm.reset({
      title: course.title,
      short_description: course.short_description || '',
      full_description: course.full_description || '',
      intro_video_url: course.intro_video_url || '',
      thumbnail: course.thumbnail || '',
      price: course.price ?? null,
      complimentary_minutes: course.complimentary_minutes ?? null,
    });
    setCourseEditOpen(true);
  };

  const submitEditCourse = courseEditForm.handleSubmit(async values => {
    if (!course) return;
    try {
      await adminLearningService.courses.update(course.id, {
        title: values.title.trim(),
        slug: values.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        short_description: values.short_description || null,
        full_description: values.full_description || null,
        intro_video_url: values.intro_video_url || null,
        thumbnail: values.thumbnail || null,
        price: values.price != null ? Number(values.price) : null,
        complimentary_minutes: values.complimentary_minutes != null ? Number(values.complimentary_minutes) : null,
      } as any);
      showToast('Course updated', 'success');
      setCourseEditOpen(false);
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Update failed', 'error');
    }
  });

  // ── File selection (queue for upload on submit) ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFiles(prev => [...prev, file]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Upload a single file (called during submit) ──
  const uploadFile = async (file: File, topicId: string): Promise<UploadedFile | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('topic_id', topicId);
      formData.append('course_id', String(courseId));
      const resp = await api.post('/admin/upload-course-file', formData);
      return resp.data as UploadedFile;
    } catch (e: any) {
      showToast(`Failed to upload "${file.name}": ${e?.response?.data?.detail || 'Upload error'}`, 'error');
      return null;
    }
  };

  const removeUploadedFile = async (uf: UploadedFile) => {
    if (!confirm(`Remove "${uf.original_name}"?`)) return;
    try {
      const parts = uf.file_url.split('/');
      const topicFolder = parts[parts.length - 2];
      const fname = parts[parts.length - 1];
      await api.delete(`/api/admin/course-files/${topicFolder}/${fname}`);
      setUploadedFiles(prev => prev.filter(f => f.filename !== uf.filename));
    } catch { /* ignore if already deleted */ }
  };

  // ── Topic actions ──
  const openAddTopic = (moduleId: number) => {
    topicForm.reset({ title: '', description: '', video_url: '', has_code_practice: false, code_practice_url: '' });
    setUploadedFiles([]);
    setPendingFiles([]);
    currentTopicId.current = `new-${moduleId}`;
    setTopicModal({ open: true, editing: null, moduleId });
  };

  const openEditTopic = (topic: LearningSubmodule) => {
    const existing = contentItems.find(ci => ci.submodule_id === topic.id);
    const meta = (existing?.meta as any) || {};
    topicForm.reset({
      title: topic.title,
      description: topic.summary || '',
      video_url: meta.video_url || '',
      has_code_practice: meta.has_code_practice || false,
      code_practice_url: meta.code_practice_url || '',
    });
    // Restore previously uploaded files from metadata
    const existingFiles: UploadedFile[] = Array.isArray(meta.file_urls) ? meta.file_urls : [];
    setUploadedFiles(existingFiles);
    setPendingFiles([]);
    currentTopicId.current = String(topic.id);
    setTopicModal({ open: true, editing: topic, moduleId: topic.module_id });
  };

  const submitTopic = topicForm.handleSubmit(async values => {
    const { editing, moduleId } = topicModal;
    if (!moduleId) return;
    try {
      let topicId: number;
      if (editing) {
        await adminLearningService.submodules.update(editing.id, {
          title: values.title,
          summary: values.description || null,
        });
        topicId = editing.id;
        showToast('Topic updated', 'success');
      } else {
        const modTopics = topics.filter(t => t.module_id === moduleId);
        const newTopic = await adminLearningService.submodules.create({
          module_id: moduleId,
          title: values.title,
          summary: values.description || null,
          position: modTopics.length + 1,
        });
        topicId = (newTopic as any).id;
        showToast('Topic added', 'success');
      }

      // Upload any pending files now that we have the real topic ID
      let allUploadedFiles = [...uploadedFiles];
      if (pendingFiles.length > 0) {
        setFileUploading(true);
        try {
          const results = await Promise.all(
            pendingFiles.map(f => uploadFile(f, String(topicId)))
          );
          const newFiles = results.filter((r): r is UploadedFile => r !== null);
          allUploadedFiles = [...allUploadedFiles, ...newFiles];
          setPendingFiles([]);
          if (newFiles.length > 0) {
            showToast(`${newFiles.length} file${newFiles.length > 1 ? 's' : ''} uploaded`, 'success');
          }
        } finally {
          setFileUploading(false);
        }
      }

      // Save content (video URL, code practice, uploaded files) as a learning item
      const metadata: Record<string, unknown> = {
        video_url: values.video_url || null,
        has_code_practice: values.has_code_practice,
        code_practice_url: values.code_practice_url || null,
        file_urls: allUploadedFiles,
      };

      const existingItem = contentItems.find(ci => ci.submodule_id === topicId);
      if (existingItem) {
        await adminLearningService.learningItems.update(existingItem.id, { metadata });
      } else if (values.video_url || values.has_code_practice || allUploadedFiles.length > 0) {
        await adminLearningService.learningItems.create({
          submodule_id: topicId,
          type: 'content',
          title: values.title,
          position: 1,
          metadata,
        });
      }

      setTopicModal({ open: false, editing: null, moduleId: null });
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Save failed', 'error');
    }
  });

  const deleteTopic = async (topic: LearningSubmodule) => {
    if (!confirm(`Delete topic "${topic.title}"?`)) return;
    try {
      await adminLearningService.submodules.delete(topic.id);
      showToast('Topic deleted', 'success');
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Delete failed', 'error');
    }
  };

  const watchCodePractice = topicForm.watch('has_code_practice');

  if (loading) {
    return <div className="py-20 text-center text-slate-400 text-sm">Loading course...</div>;
  }

  if (!course) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">Course not found.</p>
        <button onClick={() => router.push('/masters/courses')} className="mt-3 text-sm text-blue-500 hover:underline">← Back to courses</button>
      </div>
    );
  }

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => router.push('/masters/courses')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={14} />
          Courses
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 font-medium truncate">{course.title}</span>
      </div>

      {/* Course Info */}
      <Card>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <BookOpen size={22} className="text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{course.title}</h2>
                  {course.short_description && (
                    <p className="mt-0.5 text-sm text-slate-500">{course.short_description}</p>
                  )}
                </div>
                <button
                  onClick={openEditCourse}
                  className="shrink-0 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <Edit size={12} /> Edit course
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {course.difficulty_level && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    course.difficulty_level === 'beginner' ? 'bg-green-50 text-green-700' :
                    course.difficulty_level === 'intermediate' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {course.difficulty_level}
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  course.status === 1 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {course.status === 1 ? 'Active' : 'Draft'}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                  {modules.length} module{modules.length !== 1 ? 's' : ''} · {topics.length} topic{topics.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit">
        {([['modules', 'Modules'], ['quiz', 'Assessment Quiz']] as [ActiveTab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
            {tab === 'quiz' && questions.length > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                {questions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Modules Tab ── */}
      {activeTab === 'modules' && <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Modules</h3>
          </div>
          <Button onClick={openAddModule} variant="outline" className="text-xs px-3 py-1.5 h-auto">
            <Plus size={13} className="mr-1" /> Add Module
          </Button>
        </div>

        {modules.length === 0 ? (
          <Card>
            <CardContent>
              <div className="py-12 text-center">
                <Layers size={36} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm text-slate-400">No modules yet.</p>
                <button onClick={openAddModule} className="mt-2 text-xs text-blue-500 hover:underline">
                  + Add first module
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {modules.map(mod => (
              <ModuleCard
                key={mod.id}
                mod={mod}
                topics={topics}
                contentItems={contentItems}
                topicQuizCounts={topicQuizCounts}
                onEditModule={() => openEditModule(mod)}
                onDeleteModule={() => deleteModule(mod)}
                onAddTopic={() => openAddTopic(mod.id)}
                onEditTopic={openEditTopic}
                onDeleteTopic={deleteTopic}
                onManageTopicQuiz={openTopicQuiz}
              />
            ))}
          </div>
        )}
      </div>}

      {/* ── Assessment Quiz Tab ── */}
      {activeTab === 'quiz' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Question Bank</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {questions.length} question{questions.length !== 1 ? 's' : ''} · 15–20 random shown during assessment
              </p>
            </div>
            <Button onClick={openAddQuestion} variant="outline" className="text-xs px-3 py-1.5 h-auto">
              <Plus size={13} className="mr-1" /> Add Question
            </Button>
          </div>

          {quizLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading questions…</div>
          ) : questions.length === 0 ? (
            <Card>
              <CardContent>
                <div className="py-12 text-center">
                  <BookOpen size={36} className="mx-auto mb-3 text-slate-200" />
                  <p className="text-sm text-slate-400">No questions yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Add 50–100 MCQ questions to build a strong question pool.</p>
                  <button onClick={openAddQuestion} className="mt-3 text-xs text-blue-500 hover:underline">+ Add first question</button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {questions.map((q, idx) => {
                const lvl = levels.find(l => l.id === q.level_id);
                return (
                  <Card key={q.id}>
                    <CardContent>
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{q.question}</p>
                          <div className="mt-2 grid grid-cols-2 gap-1.5">
                            {q.options.map((o, oi) => (
                              <div key={oi} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs ${o.is_correct ? 'bg-green-50 text-green-700 font-medium' : 'bg-slate-50 text-slate-500'}`}>
                                <span className={`h-2 w-2 shrink-0 rounded-full ${o.is_correct ? 'bg-green-500' : 'bg-slate-300'}`} />
                                {o.text || <span className="italic opacity-50">empty</span>}
                              </div>
                            ))}
                          </div>
                          {lvl && (
                            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              lvl.name === 'Beginner' ? 'bg-green-50 text-green-700' :
                              lvl.name === 'Intermediate' ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-700'
                            }`}>{lvl.name}</span>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button onClick={() => openEditQuestion(q)} className="rounded p-1.5 hover:bg-slate-100">
                            <Edit size={13} className="text-slate-400" />
                          </button>
                          <button onClick={() => deleteQuestion(q)} className="rounded p-1.5 hover:bg-red-50">
                            <Trash2 size={13} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Score → Level guide */}
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">Score → Level Mapping</p>
            <div className="flex gap-3 text-xs">
              <span className="rounded-full bg-green-50 px-3 py-1 text-green-700 font-medium">0–40% → Beginner</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 font-medium">41–70% → Intermediate</span>
              <span className="rounded-full bg-red-50 px-3 py-1 text-red-700 font-medium">71–100% → Advanced</span>
            </div>
          </div>
        </div>
      )}

      {/* Module Modal */}
      <Modal
        isOpen={moduleModal.open}
        onClose={() => { setModuleModal({ open: false, editing: null }); setModuleLevelIds([]); }}
        title={moduleModal.editing ? 'Edit Module' : 'Add Module'}
      >
        <form onSubmit={submitModule} className="space-y-4" noValidate>
          <Input
            label="Module Title"
            {...moduleForm.register('title', { required: 'Title is required' })}
            error={moduleForm.formState.errors.title?.message}
            required
          />
          <Input
            label="Description"
            {...moduleForm.register('description')}
            placeholder="Optional"
          />

          {/* Multi-level selection */}
          {levels.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Intended For (Levels)</p>
              <p className="text-xs text-slate-400 mb-2">Select all levels this module should be shown to</p>
              <div className="flex flex-wrap gap-2">
                {levels.map(lvl => (
                  <label key={lvl.id} className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-sm transition-all ${
                    moduleLevelIds.includes(lvl.id)
                      ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={moduleLevelIds.includes(lvl.id)}
                      onChange={e => setModuleLevelIds(prev =>
                        e.target.checked ? [...prev, lvl.id] : prev.filter(id => id !== lvl.id)
                      )}
                    />
                    {moduleLevelIds.includes(lvl.id) && <span className="text-blue-500">✓</span>}
                    {lvl.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => { setModuleModal({ open: false, editing: null }); setModuleLevelIds([]); }}>Cancel</Button>
            <Button type="submit" disabled={moduleForm.formState.isSubmitting}>
              {moduleModal.editing ? 'Update' : 'Add Module'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Topic Modal */}
      <Modal
        isOpen={topicModal.open}
        onClose={() => setTopicModal({ open: false, editing: null, moduleId: null })}
        title={topicModal.editing ? 'Edit Topic' : 'Add Topic'}
      >
        <form onSubmit={submitTopic} className="space-y-4" noValidate>
          <Input
            label="Topic Title"
            {...topicForm.register('title', { required: 'Title is required' })}
            error={topicForm.formState.errors.title?.message}
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              {...topicForm.register('description')}
              rows={2}
              placeholder="What will students learn in this topic?"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Content</p>
            <Input
              label="Video URL"
              {...topicForm.register('video_url')}
              placeholder="https://youtube.com/... or any video URL"
            />

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="has_code_practice"
                {...topicForm.register('has_code_practice')}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
              />
              <label htmlFor="has_code_practice" className="text-sm font-medium text-slate-700">
                Include Code Practice (e.g. Google Colab, Replit)
              </label>
            </div>

            {watchCodePractice && (
              <Input
                label="Code Practice URL"
                {...topicForm.register('code_practice_url')}
                placeholder="https://colab.research.google.com/..."
              />
            )}
          </div>

          {/* ── File Upload ── */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Attachments</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={fileUploading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-300 bg-blue-50/60 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <><UploadCloud size={13} />Choose File</>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">PDF, DOCX, TXT, MD — uploaded when you save the topic</p>

            {/* Pending (not yet uploaded) files */}
            {pendingFiles.length > 0 && (
              <ul className="space-y-2">
                {pendingFiles.map((f, idx) => (
                  <li key={idx} className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <FileText size={14} className="shrink-0 text-blue-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{f.name}</p>
                      <p className="text-[11px] text-blue-400">Queued — will upload on save</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingFile(idx)}
                      className="shrink-0 text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Already uploaded files */}
            {uploadedFiles.length > 0 && (
              <ul className="space-y-2">
                {uploadedFiles.map(uf => (
                  <li key={uf.filename} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <FileText size={14} className="shrink-0 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{uf.original_name}</p>
                      <p className="text-[11px] text-slate-400">{formatSize(uf.file_size)} · {uf.chunk_count} chunk{uf.chunk_count !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUploadedFile(uf)}
                      className="shrink-0 text-slate-300 hover:text-red-400 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setTopicModal({ open: false, editing: null, moduleId: null })}>
              Cancel
            </Button>
            <Button type="submit" disabled={topicForm.formState.isSubmitting || fileUploading} className="inline-flex items-center gap-1.5">
              {fileUploading ? (
                <><Loader2 size={13} className="animate-spin" />Uploading…</>
              ) : topicForm.formState.isSubmitting ? (
                <><Loader2 size={13} className="animate-spin" />Saving…</>
              ) : (
                topicModal.editing ? 'Update' : 'Add Topic'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Question Modal */}
      <Modal
        isOpen={qModal.open}
        onClose={() => setQModal({ open: false, editing: null })}
        title={qModal.editing ? 'Edit Question' : 'Add Question'}
      >
        <div className="space-y-4">
          {/* Question text */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Question <span className="text-red-500">*</span></label>
            <textarea
              value={qForm.question}
              onChange={e => setQForm(p => ({ ...p, question: e.target.value }))}
              rows={3}
              placeholder="Enter your question here…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>

          {/* Level */}
          {levels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Level Tag</label>
              <select
                value={qForm.level_id}
                onChange={e => setQForm(p => ({ ...p, level_id: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">— No level tag —</option>
                {levels.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">Tag helps balance random question selection by level</p>
            </div>
          )}

          {/* Options (MCQ) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Options (MCQ)</label>
              <span className="text-[11px] text-slate-400">Click radio to mark correct answer</span>
            </div>
            <div className="space-y-2">
              {qForm.options.map((opt, idx) => (
                <div key={idx} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${opt.is_correct ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => toggleOption(idx, 'is_correct')}
                    className={`shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center ${opt.is_correct ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}
                  >
                    {opt.is_correct && <span className="block h-1.5 w-1.5 rounded-full bg-white" />}
                  </button>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => updateOptionText(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}${idx === 0 ? ' (correct)' : ''}`}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-300"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Fill at least 2 options. Green = correct answer.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setQModal({ open: false, editing: null })}>
              Cancel
            </Button>
            <Button onClick={submitQuestion} disabled={qSaving}>
              {qSaving ? 'Saving…' : qModal.editing ? 'Update' : 'Add Question'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════
          TOPIC PRACTICE QUIZ MODAL
      ══════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={topicQuizModal.open}
        onClose={closeTopicQuizModal}
        title={`Practice Quiz — ${topicQuizModal.topic?.title ?? ''}`}
        size="lg"
      >
        {topicQuizLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
            <Loader2 size={22} className="animate-spin" />Loading quiz…
          </div>
        ) : topicQuiz ? (
          <div className="space-y-5">
            {/* Settings bar */}
            <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Pass Score (%)</label>
                <input
                  type="number"
                  min={1} max={100}
                  value={tqPassScore}
                  onChange={e => setTqPassScore(e.target.value)}
                  className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Max Attempts</label>
                <input
                  type="number"
                  min={1} max={10}
                  value={tqMaxAttempts}
                  onChange={e => setTqMaxAttempts(e.target.value)}
                  className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <Button variant="outline" className="text-xs px-3 py-1.5 h-auto" onClick={saveTQRules}>
                Save Settings
              </Button>
              <p className="text-xs text-slate-400 mt-0.5 flex-1 text-right">
                {topicQuiz.questions.length} Q in bank · 3–5 random shown per attempt
              </p>
            </div>

            {/* Question list */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {topicQuiz.questions.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  No questions yet. Add your first question below.
                </div>
              ) : (
                topicQuiz.questions.map((q, idx) => (
                  <div key={q.id} className="rounded-lg border border-slate-100 bg-white p-3 flex items-start gap-3">
                    <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{q.question}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {q.options.map(o => (
                          <span key={o.id} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${o.is_correct ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-500'}`}>
                            {o.option_text}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => openEditTQ(q)} className="rounded p-1.5 hover:bg-slate-100">
                        <Edit size={13} className="text-slate-400" />
                      </button>
                      <button onClick={() => deleteTQ(topicQuizModal.topic!.id, q.id)} className="rounded p-1.5 hover:bg-red-50">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Question button */}
            <div className="flex justify-between pt-1">
              <Button variant="outline" className="text-xs px-3 py-1.5 h-auto" onClick={openAddTQ}>
                <Plus size={13} className="mr-1" /> Add Question
              </Button>
              <Button variant="secondary" onClick={closeTopicQuizModal}>Done</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ── Topic Quiz question add/edit modal ── */}
      <Modal
        isOpen={tqModal.open}
        onClose={() => setTqModal({ open: false, editing: null })}
        title={tqModal.editing ? 'Edit Question' : 'Add Question'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Question *</label>
            <textarea
              rows={3}
              value={tqForm.question}
              onChange={e => setTqForm(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Enter the question…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Explanation (optional)</label>
            <textarea
              rows={2}
              value={tqForm.explanation}
              onChange={e => setTqForm(prev => ({ ...prev, explanation: e.target.value }))}
              placeholder="Why is this the correct answer?"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>

          {/* Options (MCQ) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Options (MCQ)</label>
              <span className="text-[11px] text-slate-400">Click circle to mark correct</span>
            </div>
            <div className="space-y-2">
              {tqForm.options.map((opt, idx) => (
                <div key={idx} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${opt.is_correct ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => setTqForm(prev => ({
                      ...prev,
                      options: prev.options.map((o, i) => ({ ...o, is_correct: i === idx })),
                    }))}
                    className={`shrink-0 h-4 w-4 rounded-full border-2 flex items-center justify-center ${opt.is_correct ? 'border-green-500 bg-green-500' : 'border-slate-300'}`}
                  >
                    {opt.is_correct && <span className="block h-1.5 w-1.5 rounded-full bg-white" />}
                  </button>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => setTqForm(prev => ({
                      ...prev,
                      options: prev.options.map((o, i) => i === idx ? { ...o, text: e.target.value } : o),
                    }))}
                    placeholder={`Option ${idx + 1}${idx === 0 ? ' (correct)' : ''}`}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-300"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Fill at least 2 options. Green = correct answer.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setTqModal({ open: false, editing: null })}>
              Cancel
            </Button>
            <Button onClick={saveTQ} disabled={tqSaving}>
              {tqSaving ? 'Saving…' : tqModal.editing ? 'Update' : 'Add Question'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Course Modal ── */}
      <Modal isOpen={courseEditOpen} onClose={() => setCourseEditOpen(false)} title="Edit Course">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Title <span className="text-red-500">*</span></label>
            <Input {...courseEditForm.register('title', { required: true })} placeholder="Course title" />
            {courseEditForm.formState.errors.title && <p className="text-xs text-red-500 mt-1">Title is required</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Short Description</label>
            <Input {...courseEditForm.register('short_description')} placeholder="Brief summary" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Full Description</label>
            <textarea
              {...courseEditForm.register('full_description')}
              rows={3}
              placeholder="Full course description"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Intro Video URL</label>
            <Input {...courseEditForm.register('intro_video_url')} placeholder="https://..." />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Thumbnail URL</label>
            <Input {...courseEditForm.register('thumbnail')} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Price (₹)</label>
              <Input
                type="number"
                min="0"
                step="1"
                {...courseEditForm.register('price', { valueAsNumber: true })}
                placeholder="e.g. 299"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Complimentary Chat Minutes</label>
              <Input
                type="number"
                min="0"
                step="1"
                {...courseEditForm.register('complimentary_minutes', { valueAsNumber: true })}
                placeholder="e.g. 30"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCourseEditOpen(false)}>Cancel</Button>
            <Button onClick={submitEditCourse} disabled={courseEditForm.formState.isSubmitting}>
              {courseEditForm.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
