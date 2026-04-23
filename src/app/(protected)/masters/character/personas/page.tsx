
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  categoriesService,
  getMasterAvatarAssignmentCount,
  isMasterAssignedToAvatar,
  Master,
  PersonaCategory,
  PersonaSuggestionItem,
  personasService,
} from '@/services/mastersService';
import { adminLearningService, Subject } from '@/services/adminLearningService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import SearchableMultiSelect from '@/components/ui/SearchableMultiSelect';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/context/ToastContext';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Edit, Loader2, Plus, Sparkles, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link'],
    ['clean'],
  ],
};

const formats = ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'blockquote', 'code-block', 'link', 'color', 'background'];
const defaultSuggestionLabels = ['Short', 'Detailed', 'Professional', 'Simple'];

type PersonaFormValues = {
  name: string;
  category_id: string;
  subject_ids: string[];
  is_duplicate_locked: boolean;
};

type DuplicateState = {
  duplicate: boolean;
  is_locked: boolean;
  existing?: Master | null;
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const normalizeRichText = (value: string) => {
  const plainText = value.replace(/<(.|\n)*?>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return plainText ? value : '';
};

const stripHtml = (value?: string) =>
  String(value ?? '')
    .replace(/<(.|\n)*?>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}...`;
};

const compareValues = (a: unknown, b: unknown) => {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').toLowerCase().localeCompare(String(b ?? '').toLowerCase());
};

export default function PersonasPage() {
  const { showToast } = useToast();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Master | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<PersonaCategory[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicateState, setDuplicateState] = useState<DuplicateState | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<PersonaSuggestionItem[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number | null>(null);
  const [suggestionMeta, setSuggestionMeta] = useState<{ source?: string; cached?: boolean; reason?: string | null }>({});
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<number, boolean>>({});

  const reloadTable = () => setRefreshKey((key) => key + 1);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PersonaFormValues>({
    defaultValues: {
      name: '',
      category_id: '',
      subject_ids: [],
      is_duplicate_locked: false,
    },
  });

  const watchedName = watch('name');
  const watchedCategoryId = watch('category_id');
  const watchedSubjectIds = watch('subject_ids');
  const selectedCategory = useMemo(
    () => categories.find((category) => String(category.id) === String(watchedCategoryId)) ?? null,
    [categories, watchedCategoryId]
  );
  const scopedSubjects = useMemo(
    () =>
      subjects
        .filter((subject) => Number(subject.category_id) === Number(watchedCategoryId))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [subjects, watchedCategoryId]
  );
  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: String(category.id), label: category.name })),
    [categories]
  );
  const subjectOptions = useMemo(
    () => scopedSubjects.map((subject) => ({ value: String(subject.id), label: subject.name })),
    [scopedSubjects]
  );
  const selectedSubjects = useMemo(
    () => scopedSubjects.filter((subject) => (watchedSubjectIds ?? []).includes(String(subject.id))),
    [scopedSubjects, watchedSubjectIds]
  );

  useEffect(() => {
    let active = true;
    setLoadingCategories(true);
    Promise.allSettled([categoriesService.list(), adminLearningService.subjects.list()])
      .then(([categoriesResult, subjectsResult]) => {
        if (!active) return;

        if (categoriesResult.status === 'fulfilled') {
          setCategories(categoriesResult.value);
        } else {
          showToast(categoriesResult.reason?.message || 'Unable to load categories.', 'error');
        }

        if (subjectsResult.status === 'fulfilled') {
          setSubjects(subjectsResult.value);
        } else {
          showToast(subjectsResult.reason?.message || 'Unable to load sub categories.', 'error');
        }
      })
      .finally(() => {
        if (active) setLoadingCategories(false);
      });

    return () => {
      active = false;
    };
  }, [showToast]);

  useEffect(() => {
    if (watchedSubjectIds?.length) {
      const validIds = watchedSubjectIds.filter((id) => scopedSubjects.some((subject) => String(subject.id) === String(id)));
      if (validIds.length !== watchedSubjectIds.length) {
        setValue('subject_ids', validIds, { shouldDirty: true, shouldValidate: true });
      }
    }
  }, [scopedSubjects, setValue, watchedSubjectIds]);

  useEffect(() => {
    reloadTable();
  }, [filters.status, categories.length, subjects.length]);

  useEffect(() => {
    if (editing) {
      setDuplicateState(null);
      return;
    }

    const trimmedName = watchedName?.trim();
    const numericCategoryId = Number(watchedCategoryId);
    const numericSubjectId = watchedSubjectIds?.[0] ? Number(watchedSubjectIds[0]) : null;
    if (!trimmedName || !numericCategoryId) {
      setDuplicateState(null);
      setDuplicateLoading(false);
      return;
    }
    if (scopedSubjects.length > 0 && !numericSubjectId) {
      setDuplicateState(null);
      setDuplicateLoading(false);
      return;
    }

    let active = true;
    setDuplicateLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await personasService.checkDuplicate(trimmedName, numericCategoryId, numericSubjectId);
        if (active) {
          setDuplicateState(result);
          if (!result.duplicate) setAllowDuplicate(false);
        }
      } catch (error: any) {
        if (active) {
          setDuplicateState(null);
          showToast(error?.message || 'Could not check duplicates.', 'error');
        }
      } finally {
        if (active) setDuplicateLoading(false);
      }
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [editing, watchedName, watchedCategoryId, watchedSubjectIds, scopedSubjects.length, showToast]);

  const resetFlowState = () => {
    setDescription('');
    setDuplicateState(null);
    setAllowDuplicate(false);
    setSuggestions([]);
    setSelectedSuggestionIndex(null);
    setSuggestionMeta({});
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    reset({ name: '', category_id: '', subject_ids: [], is_duplicate_locked: false });
    resetFlowState();
  };

  const handleOpenCreate = () => {
    setEditing(null);
    reset({ name: '', category_id: '', subject_ids: [], is_duplicate_locked: false });
    resetFlowState();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (row: Master) => {
    setEditing(row);
    reset({
      name: row.name,
      category_id: row.category_id ? String(row.category_id) : '',
      subject_ids: row.subject_id ? [String(row.subject_id)] : [],
      is_duplicate_locked: Boolean(row.is_duplicate_locked),
    });
    setDescription(row.description || '');
    setAllowDuplicate(true);
    setDuplicateState(null);
    setSuggestions([]);
    setSelectedSuggestionIndex(null);
    setSuggestionMeta({});
    setIsModalOpen(true);
  };

  const handleUseExisting = () => {
    if (!duplicateState?.existing) return;
    closeModal();
    handleOpenEdit(duplicateState.existing);
  };

  const handleGenerateSuggestions = async () => {
    const trimmedName = watchedName?.trim();
    const numericCategoryId = Number(watchedCategoryId);

    if (!trimmedName) {
      showToast('Enter a persona name first.', 'error');
      return;
    }
    if (!numericCategoryId) {
      showToast('Select a category first.', 'error');
      return;
    }

    try {
      setGenerating(true);
      const result = await personasService.generateDescription({
        name: trimmedName,
        category_id: numericCategoryId,
        subject_id: watchedSubjectIds?.[0] ? Number(watchedSubjectIds[0]) : undefined,
      });
      const nextSuggestions = result.suggestions.length > 0
        ? result.suggestions
        : defaultSuggestionLabels.map((label) => ({ label, description: '' }));

      setSuggestions(nextSuggestions);
      setSuggestionMeta({ source: result.source, cached: result.cached, reason: result.reason });

      if (nextSuggestions[0]?.description) {
        setSelectedSuggestionIndex(0);
        setDescription(nextSuggestions[0].description);
        requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      }

      if (result.source === 'ai') {
        showToast(result.cached ? 'Suggestions loaded from recent cache.' : 'Suggestions generated successfully.', 'success');
      }
    } catch (error: any) {
      showToast(error?.message || 'Unable to generate suggestions.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSuggestionSelect = async (suggestion: PersonaSuggestionItem, index: number) => {
    setSelectedSuggestionIndex(index);
    setDescription(suggestion.description);
    if (watchedCategoryId) {
      try {
        await personasService.trackSuggestionSelection({
          name: watchedName.trim(),
          category_id: Number(watchedCategoryId),
          subject_id: watchedSubjectIds?.[0] ? Number(watchedSubjectIds[0]) : undefined,
          label: suggestion.label,
        });
      } catch {
        // analytics should never block the flow
      }
    }
    requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };

  const handleToggle = async (row: Master) => {
    if (isMasterAssignedToAvatar(row as Master & Record<string, unknown>)) {
      showToast('Assigned personas cannot be deactivated while linked to an avatar.', 'error');
      return;
    }

    try {
      await personasService.toggle(row.id);
      showToast(`Status ${row.is_active ? 'deactivated' : 'activated'}`, 'success');
      reloadTable();
    } catch (error: any) {
      showToast(error?.message || 'Could not update status.', 'error');
    }
  };

  const handleDelete = async (row: Master) => {
    if (isMasterAssignedToAvatar(row as Master & Record<string, unknown>)) {
      showToast('Assigned personas cannot be deleted while linked to an avatar.', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this persona?')) return;
    try {
      await personasService.delete(row.id);
      showToast('Persona deleted', 'success');
      reloadTable();
    } catch (error: any) {
      showToast(error?.message || 'Could not delete persona.', 'error');
    }
  };

  const onSubmit = async (data: PersonaFormValues) => {
    const payload = {
      name: data.name.trim(),
      category_id: data.category_id ? Number(data.category_id) : null,
      subject_id: data.subject_ids?.[0] ? Number(data.subject_ids[0]) : null,
      description: normalizeRichText(description),
      is_duplicate_locked: Boolean(data.is_duplicate_locked),
      allow_duplicate: allowDuplicate,
    };

    if (!payload.name) {
      showToast('Persona name is required.', 'error');
      return;
    }
    if (!payload.category_id) {
      showToast('Category is required.', 'error');
      return;
    }
    if (scopedSubjects.length > 0 && !payload.subject_id) {
      showToast('Sub category is required.', 'error');
      return;
    }
    if (!payload.description) {
      showToast('Select or write a description before saving.', 'error');
      return;
    }
    if (duplicateState?.duplicate && duplicateState.is_locked && !editing) {
      showToast('This persona cannot be duplicated.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (editing) {
        await personasService.update(editing.id, payload);
        showToast('Persona updated successfully', 'success');
      } else {
        await personasService.create(payload);
        showToast('Persona created successfully', 'success');
      }
      closeModal();
      reloadTable();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      if (detail?.error === 'duplicate_persona') {
        showToast(detail?.message || 'This persona already exists.', 'error');
        setDuplicateState({
          duplicate: true,
          is_locked: Boolean(detail?.is_locked),
          existing: detail?.existing ?? null,
        });
      } else {
        showToast(error?.message || 'Could not save persona.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDescription = (id: number) => {
    setExpandedDescriptions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchTable = async ({ page, limit, search, sortBy, sortOrder }: any) => {
    const response = await personasService.list({ limit: 500, sortBy: 'created_at', sortOrder: 'desc' });
    let rows = Array.isArray(response.data) ? [...response.data] : [];

    if (filters.status !== '') {
      rows = rows.filter((row) => Boolean(row.is_active) === (filters.status === '1'));
    }

    const query = String(search ?? '').trim().toLowerCase();
    if (query) {
      rows = rows.filter((row) =>
        [
          row.name,
          row.description,
          categories.find((item) => item.id === row.category_id)?.name,
          subjects.find((subject) => Number(subject.id) === Number(row.subject_id))?.name,
        ]
          .map((value) => String(value ?? '').toLowerCase())
          .some((value) => value.includes(query))
      );
    }

    const activeSortKey = sortBy || 'created_at';
    const activeSortOrder = sortOrder || 'desc';
    rows.sort((left, right) => {
      const result = compareValues((left as any)?.[activeSortKey], (right as any)?.[activeSortKey]);
      return activeSortOrder === 'asc' ? result : -result;
    });

    const total = rows.length;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Number(limit) || 10);
    const start = (safePage - 1) * safeLimit;

    return {
      data: rows.slice(start, start + safeLimit),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  };

  const duplicateBlockVisible = Boolean(watchedName?.trim() && watchedCategoryId);
  const saveDisabled =
    submitting ||
    !watchedName?.trim() ||
    !watchedCategoryId ||
    (subjectOptions.length > 0 && !watchedSubjectIds?.length) ||
    !normalizeRichText(description) ||
    (!editing && Boolean(duplicateState?.duplicate) && !allowDuplicate);

  const isFilterApplied = filters.status !== '' || filters.search.trim() !== '';

  return (
    <div className="max-w-full space-y-5 overflow-x-hidden">
      <div className="w-full overflow-hidden rounded-[28px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),transparent_34%),radial-gradient(circle_at_top_right,_rgba(236,72,153,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98))] px-5 py-4 shadow-[0_28px_60px_-42px_rgba(15,23,42,0.42)] backdrop-blur-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-[760px] space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
              Smart Persona Studio
            </div>
            <div className="space-y-2">
              <h1 className="max-w-[680px] text-[2.05rem] font-semibold tracking-[-0.04em] text-slate-950">
                Create premium personas with AI guidance
              </h1>
              <p className="max-w-[760px] text-[15px] leading-6 text-slate-600">
                Add the right context, generate suggestions, and save in one clean flow.
              </p>
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center justify-end gap-3 xl:w-auto">
            {isFilterApplied && (
              <Button variant="outline" onClick={() => setFilters({ status: '', search: '' })} className="rounded-xl border-red-200 text-red-600 hover:bg-red-50">
                Reset Filters
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowFilters((prev) => !prev)} className="h-10 rounded-2xl border-slate-300/80 bg-white/90 px-5 text-slate-700 shadow-sm hover:border-slate-400 hover:bg-white">
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button onClick={handleOpenCreate} className="h-10 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 text-white shadow-[0_16px_34px_-18px_rgba(37,99,235,0.92)] hover:-translate-y-0.5 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700">
              <Plus size={18} className="mr-2" />
              Create Persona
            </Button>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="grid max-w-full grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Filter by Status"
            value={filters.status}
            options={[
              { value: '', label: 'All' },
              { value: '1', label: 'Active' },
              { value: '0', label: 'Inactive' },
            ]}
            onChange={(value) => setFilters((prev) => ({ ...prev, status: String(value) }))}
          />
        </div>
      )}

      <Card className="overflow-hidden border border-slate-200/80 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.4)]">
        <CardContent className="p-0">
          <AdvancedDataTable
            refreshTrigger={refreshKey}
            externalSearch={filters.search}
            onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
            columns={[
              { key: 'name', label: 'Persona Name', className: 'w-[8rem]' },
              {
                key: 'category_id',
                label: 'Category',
                className: 'w-[7.5rem]',
                render: (row: Master) => categories.find((item) => item.id === row.category_id)?.name || 'Not linked',
              },
              {
                key: 'subject_id',
                label: 'Sub Category',
                className: 'w-[8rem]',
                render: (row: Master) =>
                  subjects.find((subject) => Number(subject.id) === Number(row.subject_id))?.name || 'Not linked',
              },
              {
                key: 'description',
                label: 'Description',
                className: 'w-[12rem]',
                render: (row: Master) => {
                  const expanded = Boolean(expandedDescriptions[row.id]);
                  const plain = stripHtml(row.description);
                  if (!plain) return <span className="text-slate-400">No description</span>;
                  const preview = truncateText(plain, 20);

                  return (
                    <div className="max-w-[220px]">
                      <div className="inline-flex max-w-full items-start gap-1 align-top">
                        <div className={expanded ? 'text-sm leading-6 text-slate-600' : 'max-w-[172px] truncate text-sm leading-6 text-slate-600'}>
                          {expanded ? plain : preview}
                        </div>
                        {plain.length > 20 && (
                          <button
                            type="button"
                            onClick={() => toggleDescription(row.id)}
                            className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                            aria-label={expanded ? 'Collapse description' : 'Expand description'}
                          >
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'is_duplicate_locked',
                label: 'Duplicate Control',
                className: 'w-[7rem]',
                render: (row: Master) =>
                  row.is_duplicate_locked ? (
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Locked</span>
                  ) : (
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">Flexible</span>
                  ),
              },
              {
                key: 'status',
                label: 'Status',
                className: 'w-[5.5rem]',
                render: (row: Master) =>
                  row.is_active ? (
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Active</span>
                  ) : (
                    <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">Inactive</span>
                  ),
              },
              {
                key: 'created_at',
                label: 'Created',
                className: 'w-[8rem]',
                render: (row: Master) => formatDateTime(row.created_at),
              },
            ]}
            fetchData={fetchTable}
            showAnalytics
            actions={(row: Master) => (
              <div className="flex justify-end gap-2">
                <Tooltip text="Edit">
                  <button onClick={() => handleOpenEdit(row)} className="rounded-lg p-1.5 hover:bg-slate-100">
                    <Edit size={16} />
                  </button>
                </Tooltip>
                <Tooltip text={isMasterAssignedToAvatar(row as Master & Record<string, unknown>) ? `Assigned to ${getMasterAvatarAssignmentCount(row as Master & Record<string, unknown>)} avatar(s)` : row.is_active ? 'Deactivate' : 'Activate'}>
                  <button
                    onClick={() => handleToggle(row)}
                    disabled={isMasterAssignedToAvatar(row as Master & Record<string, unknown>)}
                    className="rounded-lg p-1.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {row.is_active ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} className="text-slate-400" />}
                  </button>
                </Tooltip>
                <Tooltip text={isMasterAssignedToAvatar(row as Master & Record<string, unknown>) ? `Assigned to ${getMasterAvatarAssignmentCount(row as Master & Record<string, unknown>)} avatar(s)` : 'Delete'}>
                  <button
                    onClick={() => handleDelete(row)}
                    disabled={isMasterAssignedToAvatar(row as Master & Record<string, unknown>)}
                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </Tooltip>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editing ? 'Edit Persona' : 'Create Persona'} size="xl" closeOnOutsideClick>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.98))] p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Persona details</div>
                  <h3 className="mt-1 text-lg font-semibold text-slate-950">Name and context</h3>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                  {editing ? 'Edit mode' : 'New persona'}
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <Input
                  label="Persona Name"
                  {...register('name', { required: 'Persona name is required' })}
                  error={errors.name?.message}
                  required
                  placeholder="e.g. Growth Coach, Policy Mentor, Calm Therapist"
                />

                <div>
                  <Select
                    label="Category"
                    value={watchedCategoryId}
                    options={categoryOptions}
                    onChange={(value) => setValue('category_id', String(value), { shouldDirty: true, shouldValidate: true })}
                    placeholder={loadingCategories ? 'Loading categories...' : 'Select a category'}
                    required
                    error={errors.category_id?.message}
                    disabled={loadingCategories}
                  />
                  <input type="hidden" {...register('category_id', { required: 'Category is required' })} />
                </div>

                <div>
                  <SearchableMultiSelect
                    label="Sub Category"
                    value={watchedSubjectIds ?? []}
                    options={subjectOptions}
                    onChange={(value) => setValue('subject_ids', value as string[], { shouldDirty: true, shouldValidate: true })}
                    placeholder={selectedCategory ? (subjectOptions.length ? 'Select sub categories' : 'No sub categories available') : 'Select category first'}
                    disabled={!selectedCategory || subjectOptions.length === 0}
                    emptyText="No sub categories available"
                    closeOnSelect={false}
                  />
                </div>

                {selectedCategory && (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <div className="font-medium text-slate-900">{selectedCategory.name}</div>
                    <div className="mt-1">
                      {selectedSubjects.length > 0
                        ? selectedSubjects.map((s) => s.name).join(', ')
                        : selectedCategory.description || 'This category drives persona suggestions and avatar mapping.'}
                    </div>
                  </div>
                )}

                {duplicateBlockVisible && (
                  <div className={`rounded-2xl border px-4 py-4 ${
                    duplicateState?.duplicate
                      ? duplicateState.is_locked
                        ? 'border-red-200 bg-red-50/80'
                        : 'border-amber-200 bg-amber-50/80'
                      : 'border-emerald-200 bg-emerald-50/70'
                  }`}>
                    <div className="flex items-start gap-3">
                      {duplicateLoading ? (
                        <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-slate-500" />
                      ) : duplicateState?.duplicate ? (
                        <AlertCircle size={18} className={`mt-0.5 shrink-0 ${duplicateState.is_locked ? 'text-red-600' : 'text-amber-600'}`} />
                      ) : (
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">
                          {duplicateLoading
                            ? 'Checking for existing personas...'
                            : duplicateState?.duplicate
                              ? duplicateState.is_locked
                                ? 'This persona name is locked for this category'
                                : 'This persona already exists in this category'
                              : 'This name is available'}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {duplicateLoading
                            ? 'We are validating the name and category combination before you continue.'
                            : duplicateState?.duplicate
                              ? duplicateState.is_locked
                                ? 'Duplicate creation is blocked for this persona. Use the existing record instead.'
                                : 'You can open the existing persona or continue by explicitly allowing a duplicate.'
                              : 'No matching persona was found for this name and category.'}
                        </div>
                        {duplicateState?.duplicate && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {duplicateState.existing && (
                              <Button type="button" variant="outline" className="rounded-xl" onClick={handleUseExisting}>
                                Use Existing
                              </Button>
                            )}
                            {!duplicateState.is_locked && !editing && (
                              <Button
                                type="button"
                                variant={allowDuplicate ? 'primary' : 'secondary'}
                                className="rounded-xl"
                                onClick={() => setAllowDuplicate((value) => !value)}
                              >
                                {allowDuplicate ? 'Duplicate allowed for this save' : 'Create New Anyway'}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" {...register('is_duplicate_locked')} />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Do not allow duplicate for this persona</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Enable this when the name + category combination should stay unique for future persona creation.
                    </div>
                  </div>
                </label>
              </div>
            </div>

          </div>

          <div ref={editorRef} className="rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Description</div>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">Final description</h3>
              </div>
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                Editable after AI autofill
              </div>
            </div>
            <div className="p-5">
              <ReactQuill theme="snow" value={description} onChange={setDescription} modules={modules} formats={formats} className="persona-quill" />
              <div className="mt-4 flex justify-end gap-3">
                <Button type="button" variant="secondary" className="rounded-xl whitespace-nowrap" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveDisabled} className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 whitespace-nowrap text-white hover:from-blue-700 hover:to-indigo-700">
                  {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Save Persona'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
