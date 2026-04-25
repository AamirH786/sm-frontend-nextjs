'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { personasService, Master } from '@/services/mastersService';
import { avatarsService } from '@/services/avatarsService';
import { adminLearningService, type LearningCategory, type Subject, type Track, type Level, type LearningCourse } from '@/services/adminLearningService';
import { languagesService, type ResponseLanguage } from '@/services/languagesService';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SearchableMultiSelect from '@/components/ui/SearchableMultiSelect';
import { Card, CardContent } from '@/components/ui/Card';
import CompactFlowShell from '@/components/learning/CompactFlowShell';
import { useToast } from '@/context/ToastContext';
import { Plus, FileText, List, Sparkles, ArrowDown, ArrowUp, Upload, Image as ImageIcon, X, CheckCircle2, AlertTriangle, OctagonAlert, ArrowLeft } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import Link from 'next/link';
import api from '@/lib/api';
import { getConfiguredLearningCategoryIds, getLearningCategoryLabel, shouldShowLearningScopeUI } from '@/lib/avatarPrompt';
import { buildAvatarPromptContent } from '@/lib/avatarPromptBuilder';
import {
  dedupeLearningCategories,
  getScopedCoursesForCategory,
  getScopedLevelsForCategory,
  getScopedSubjectsForCategory,
  getScopedTracksForCategory,
} from '@/lib/learningCategoryHierarchy';
import { getPromptPlainText, normalizePromptForSave, toPromptEditorHtml } from '@/lib/promptHtml';
import { findResponseLanguage, getResponseLanguageLabel } from '@/lib/responseLanguage';
import { getBoundLevelsForSubjects, parseSubjectLevelBindings, type SubjectLevelBindings } from '@/lib/subjectLevelBindings';

interface PromptFormData {
  avatar_name: string;
  category: number | null;
  persona: string;
  persona_id: number | null;
  authority_level: string;
  knowledge_source: string;
  creator_type: string;
  response_length: string;
  question_frequency: string;
  sensitivity_level: string;
  memory_permission: string;
  greeting_message: string;
  backstory: string;
  primary_language: string;
  response_language_code: string;
  emotions: number[];
  tones: number[];
  communication_styles: number[];
  modes: number[];
  domains: number[];
  delivery: number[];
  system_safety: number[];
  price: number;
  currency: string;
  duration_minutes: number;
  credits: number | null;
  credits_per_minute: number | null;
  validity_days: number;
  discount_percent: number;
  trial_minutes: number;
  video_url: string;
  // HeyGen fields
  heygen_avatar_id: string;
  heygen_voice_id: string;
  heygen_gender: string;
  heygen_language: string;
  is_interactive: boolean;
  avatar_type: string;
  subject_ids: number[];
  track_id: number | null;
  level_id: number | null;
  course_ids: number[];
}

interface MasterOption {
  id: number;
  name: string;
  category_id?: number | null;
  subject_id?: number | null;
  description?: string;
  is_active?: boolean;
  status?: boolean;
}

const mapActiveMasterOptions = (items: Master[] = []): MasterOption[] =>
  items
    .filter((item) => item.is_active)
    .map((item) => ({
      id: item.id,
      name: item.name,
      category_id: item.category_id ?? null,
      subject_id: item.subject_id ?? null,
      description: item.description,
      is_active: item.is_active,
      status: item.status,
    }));

const getSettledValue = <T,>(result: PromiseSettledResult<T>): T | null =>
  result.status === 'fulfilled' ? result.value : null;

const CREATE_AVATAR_DRAFT_KEY = 'sm_avatar_create_draft_v1';
const AVATAR_CREATE_UI_STATE_KEY = 'sm_avatar_create_ui_state_v1';
const CURRENT_PERSONA_SENTINEL = -1;
const normalizeNumericIds = (values: unknown) =>
  Array.isArray(values)
    ? values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    : [];

const getPersonaOptionLabel = (persona: MasterOption) => persona.name;

const getTrackOptionLabel = (
  track: Track,
  subjects: Subject[],
  duplicateTrackNames: Set<string>
) => {
  if (!duplicateTrackNames.has(track.name)) return track.name;
  const subjectName = subjects.find((subject) => Number(subject.id) === Number(track.subject_id))?.name;
  return subjectName ? `${track.name} - ${subjectName}` : `${track.name} - Track ${track.id}`;
};

export default function CreateAvatarPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const editorRef = useRef<any>(null);
  const heygenImageInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFlowDetails, setShowFlowDetails] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [heygenImageFile, setHeygenImageFile] = useState<File | null>(null);
  const [heygenImagePreview, setHeygenImagePreview] = useState('');
  const [isImageDragOver, setIsImageDragOver] = useState(false);

  const [personas, setPersonas] = useState<MasterOption[]>([]);
  const [learningCategories, setLearningCategories] = useState<LearningCategory[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [allCourses, setAllCourses] = useState<LearningCourse[]>([]);
  const [isLoadingLearningData, setIsLoadingLearningData] = useState(false);
  const [configuredLearningCategoryIds, setConfiguredLearningCategoryIds] = useState<number[]>([]);
  const [subjectLevelBindings, setSubjectLevelBindings] = useState<SubjectLevelBindings>({});
  const [responseLanguages, setResponseLanguages] = useState<ResponseLanguage[]>([]);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors, isDirty } } = useForm<PromptFormData>({
    mode: 'onChange',
    defaultValues: {
      avatar_name: '',
      category: null,
      persona: '',
      persona_id: null,
      authority_level: 'moderate',
      knowledge_source: '',
      creator_type: '',
      response_length: 'medium',
      question_frequency: 'moderate',
      sensitivity_level: 'medium',
      memory_permission: 'allowed',
      greeting_message: '',
      backstory: '',
      primary_language: 'Hindi',
      response_language_code: '',
      emotions: [],
      tones: [],
      communication_styles: [],
      modes: [],
      domains: [],
      delivery: [],
      system_safety: [],
      // Pricing defaults
      price: 499,
      currency: 'INR',
      duration_minutes: 30,
      credits: null,
      credits_per_minute: null,
      validity_days: 7,
      discount_percent: 0,
      trial_minutes: 5,
      video_url: '',
      // HeyGen defaults
      heygen_avatar_id: '',
      heygen_voice_id: '',
      heygen_gender: 'male',
      heygen_language: 'en-US',
      is_interactive: true,
      avatar_type: 'default',
      subject_ids: [],
      track_id: null,
      level_id: null,
      course_ids: [],
    }
  });

  // HeyGen streaming avatars state
  const [streamingAvatars, setStreamingAvatars] = useState<any[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  const [showAvatarList, setShowAvatarList] = useState(false);

  const formValues = watch();
  const categoryOptions = useMemo(
    () => dedupeLearningCategories(learningCategories, allSubjects, tracks, allCourses),
    [allCourses, allSubjects, learningCategories, tracks]
  );
  const categorySelectOptions = useMemo(
    () =>
      categoryOptions.map((category) => ({
        value: Number(category.id),
        label: getLearningCategoryLabel(category),
      })),
    [categoryOptions]
  );
  const categoryValue = String(formValues.category ?? '').trim();
  const selectedLearningCategory = categoryOptions.find(
    (category) =>
      getLearningCategoryLabel(category).toLowerCase() === categoryValue.toLowerCase() ||
      String(category.id) === categoryValue
  );
  const selectedLearningCategoryLabel = selectedLearningCategory
    ? getLearningCategoryLabel(selectedLearningCategory)
    : '';
  const isTeacherCategory = selectedLearningCategoryLabel.toLowerCase().includes('teacher');
  const validConfiguredLearningCategoryIds = useMemo(() => {
    const visibleCategoryIds = new Set(categoryOptions.map((category) => Number(category.id)));
    return configuredLearningCategoryIds.filter((id) => visibleCategoryIds.has(Number(id)));
  }, [categoryOptions, configuredLearningCategoryIds]);
  const hasLearningStructure = Boolean(
    selectedLearningCategory &&
      shouldShowLearningScopeUI(selectedLearningCategory, {
        subjects: allSubjects,
        tracks,
        courses: allCourses,
      })
  );
  const isSelectedCategoryLearning = Boolean(
    selectedLearningCategory &&
    (
      validConfiguredLearningCategoryIds.length > 0
        ? validConfiguredLearningCategoryIds.includes(Number(selectedLearningCategory.id))
        : hasLearningStructure
    )
  );
  const showLearningUI = useMemo(() => {
    return Boolean(selectedLearningCategory && isSelectedCategoryLearning);
  }, [selectedLearningCategory, isSelectedCategoryLearning]);
  const selectedResponseLanguage = useMemo(
    () =>
      findResponseLanguage(responseLanguages, formValues.response_language_code) ||
      findResponseLanguage(responseLanguages, formValues.primary_language),
    [formValues.primary_language, formValues.response_language_code, responseLanguages]
  );
  const responseLanguageOptions = useMemo(
    () =>
      responseLanguages.map((language) => ({
        value: language.code,
        label: getResponseLanguageLabel(language),
      })),
    [responseLanguages]
  );

  useEffect(() => {
    if (!responseLanguages.length) return;

    if (!formValues.response_language_code) {
      const fallback =
        findResponseLanguage(responseLanguages, formValues.primary_language) ||
        responseLanguages.find((language) => language.is_default) ||
        responseLanguages[0];
      if (fallback) {
        setValue('response_language_code', fallback.code, { shouldDirty: false });
        setValue('primary_language', fallback.name, { shouldDirty: false });
      }
      return;
    }

    if (selectedResponseLanguage && formValues.primary_language !== selectedResponseLanguage.name) {
      setValue('primary_language', selectedResponseLanguage.name, { shouldDirty: false });
    }
  }, [
    formValues.primary_language,
    formValues.response_language_code,
    responseLanguages,
    selectedResponseLanguage,
    setValue,
  ]);

  useEffect(() => {
    setIsLoadingLearningData(Boolean(selectedLearningCategory?.id));
    const timer = window.setTimeout(() => {
      setIsLoadingLearningData(false);
    }, selectedLearningCategory?.id ? 120 : 0);
    return () => window.clearTimeout(timer);
  }, [selectedLearningCategory]);

  useEffect(() => {
    if (!selectedLearningCategory) {
      setValue('subject_ids', []);
    }
    if (showLearningUI) {
      setValue('creator_type', '');
      return;
    }
    setValue('course_ids', []);
  }, [selectedLearningCategory, setValue, showLearningUI]);
  const filteredSubjects = useMemo(
    () =>
      getScopedSubjectsForCategory(
        learningCategories,
        selectedLearningCategory,
        allSubjects,
        tracks,
        allCourses
      ),
    [allCourses, allSubjects, learningCategories, selectedLearningCategory, tracks]
  );
  const showSubCategoryUI = Boolean(selectedLearningCategory && filteredSubjects.length > 0);
  const filteredTracks = useMemo(
    () =>
      getScopedTracksForCategory(
        learningCategories,
        selectedLearningCategory,
        allSubjects,
        tracks,
        allCourses,
        formValues.subject_ids || []
      ),
    [allCourses, allSubjects, formValues.subject_ids, learningCategories, selectedLearningCategory, tracks]
  );
  const filteredCourses = useMemo(
    () =>
      selectedLearningCategory
        ? getScopedCoursesForCategory(
            learningCategories,
            selectedLearningCategory,
            allSubjects,
            tracks,
            allCourses,
            formValues.subject_ids || [],
            formValues.track_id,
            formValues.level_id
          )
        : allCourses,
    [
      allCourses,
      allSubjects,
      formValues.level_id,
      formValues.subject_ids,
      formValues.track_id,
      learningCategories,
      selectedLearningCategory,
      tracks,
    ]
  );
  const courseOptionsForMapping = useMemo(
    () => (filteredCourses.length > 0 ? filteredCourses : allCourses),
    [allCourses, filteredCourses]
  );
  const filteredLevels = useMemo(
    () => {
      const scopedLevels = getScopedLevelsForCategory(
        learningCategories,
        selectedLearningCategory,
        allSubjects,
        tracks,
        allCourses,
        levels,
        formValues.subject_ids || [],
        formValues.track_id
      );
      const selectedSubjectIds = normalizeNumericIds(formValues.subject_ids);
      const boundLevels = getBoundLevelsForSubjects(selectedSubjectIds, subjectLevelBindings, scopedLevels);
      return boundLevels.length > 0 ? boundLevels : scopedLevels;
    },
    [
      allCourses,
      allSubjects,
      formValues.subject_ids,
      formValues.track_id,
      learningCategories,
      levels,
      selectedLearningCategory,
      subjectLevelBindings,
      tracks,
    ]
  );
  const filteredPersonas = useMemo(
    () =>
      personas.filter((persona) => {
        if (!selectedLearningCategory) return true;
        if (Number(persona.category_id) !== Number(selectedLearningCategory.id)) return false;
        const selectedSubjectIds = normalizeNumericIds(formValues.subject_ids);
        if (selectedSubjectIds.length > 0) {
          return selectedSubjectIds.includes(Number(persona.subject_id));
        }
        return persona.subject_id == null;
      }),
    [formValues.subject_ids, personas, selectedLearningCategory]
  );
  const personaOptions = useMemo(
    () =>
      filteredPersonas.map((persona) => ({
        value: Number(persona.id),
        label: getPersonaOptionLabel(persona),
      })),
    [filteredPersonas]
  );
  const duplicateTrackNames = useMemo(() => {
    const counts = new Map<string, number>();
    filteredTracks.forEach((track) => {
      counts.set(track.name, (counts.get(track.name) || 0) + 1);
    });
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([name]) => name));
  }, [filteredTracks]);
  const trackOptions = useMemo(
    () => [
      { value: '', label: 'All Specializations' },
      ...filteredTracks.map((track) => ({
        value: String(track.id),
        label: getTrackOptionLabel(track, filteredSubjects, duplicateTrackNames),
      })),
    ],
    [duplicateTrackNames, filteredSubjects, filteredTracks]
  );
  useEffect(() => {
    const availableTrackIds = new Set(filteredTracks.map((track) => Number(track.id)));
    if (formValues.track_id && !availableTrackIds.has(Number(formValues.track_id))) {
      setValue('track_id', null);
    }
  }, [filteredTracks, formValues.track_id, setValue]);
  useEffect(() => {
    const availableLevelIds = new Set(filteredLevels.map((level) => Number(level.id)));
    if (formValues.level_id && !availableLevelIds.has(Number(formValues.level_id))) {
      setValue('level_id', null);
    }
  }, [filteredLevels, formValues.level_id, setValue]);
  useEffect(() => {
    if (!formValues.course_ids?.length) return;
    const availableCourseIds = new Set(courseOptionsForMapping.map((course) => Number(course.id)));
    const normalizedCourseIds = normalizeNumericIds(formValues.course_ids);
    const validCourseIds = normalizedCourseIds.filter((courseId) => availableCourseIds.has(courseId));
    if (validCourseIds.length !== normalizedCourseIds.length) {
      setValue('course_ids', validCourseIds);
    }
  }, [courseOptionsForMapping, formValues.course_ids, setValue]);
  useEffect(() => {
    if (!selectedLearningCategory) {
      if (formValues.persona || formValues.persona_id != null) {
        setValue('persona', '', { shouldDirty: true, shouldValidate: true });
        setValue('persona_id', null, { shouldDirty: true, shouldValidate: true });
      }
      return;
    }

    if (formValues.persona_id == null) return;

    if (!filteredPersonas.some((persona) => Number(persona.id) === Number(formValues.persona_id))) {
      setValue('persona', '', { shouldDirty: true, shouldValidate: true });
      setValue('persona_id', null, { shouldDirty: true, shouldValidate: true });
    }
  }, [filteredPersonas, formValues.persona, formValues.persona_id, selectedLearningCategory, setValue]);
  const domainExpertiseField = register('creator_type', {
    validate: (value) =>
      showLearningUI || String(value || '').trim().length > 0 || 'Domain expertise is required',
  });
  const avatarFlowSteps = [
    { key: 'define', label: 'Define', hint: 'Choose category and identity.' },
    { key: 'build', label: 'Build', hint: 'Set learning scope or expertise.' },
    { key: 'connect', label: 'Connect', hint: 'Map course coverage and behavior.' },
    { key: 'validate', label: 'Validate', hint: 'Check required fields and prompt.' },
    { key: 'preview', label: 'Preview', hint: 'Review prompt and runtime context.' },
    { key: 'publish', label: 'Publish', hint: 'Save the avatar once ready.' },
  ] as const;
  const activeAvatarStepKey = useMemo(() => {
    if (!formValues.category || !formValues.avatar_name) return 'define';
    if (showLearningUI) {
      if (formValues.subject_ids.length === 0) return 'build';
      if (formValues.course_ids.length === 0) return 'connect';
    } else if (!String(formValues.creator_type || '').trim()) {
      return 'build';
    }
    if (!generatedPrompt) return 'validate';
    return 'preview';
  }, [formValues.avatar_name, formValues.category, formValues.creator_type, formValues.course_ids.length, formValues.subject_ids.length, generatedPrompt, showLearningUI]);
  const selectedSubjectLabel = useMemo(
    () => {
      const selectedSubjectIds = normalizeNumericIds(formValues.subject_ids);
      return filteredSubjects.find((subject) => selectedSubjectIds.includes(Number(subject.id)))?.name || null;
    },
    [filteredSubjects, formValues.subject_ids]
  );
  const selectedTrackLabel = useMemo(
    () => filteredTracks.find((track) => Number(track.id) === Number(formValues.track_id))?.name || null,
    [filteredTracks, formValues.track_id]
  );
  const selectedLevelLabel = useMemo(
    () => filteredLevels.find((level) => Number(level.id) === Number(formValues.level_id))?.name || null,
    [filteredLevels, formValues.level_id]
  );
  const selectedCourseLabel = useMemo(
    () => {
      const selectedCourseIds = normalizeNumericIds(formValues.course_ids);
      return filteredCourses.find((course) => selectedCourseIds.includes(Number(course.id)))?.title || null;
    },
    [filteredCourses, formValues.course_ids]
  );
  const avatarContextEntries = useMemo(
    () =>
      showLearningUI
        ? [
          { label: 'Category', value: selectedLearningCategoryLabel || null },
          { label: 'Sub Category', value: selectedSubjectLabel },
          { label: 'Specialization', value: selectedTrackLabel },
          { label: 'Level', value: selectedLevelLabel },
          { label: 'Course', value: selectedCourseLabel },
          { label: 'Avatar', value: formValues.avatar_name || null },
        ]
        : [
          { label: 'Category', value: selectedLearningCategoryLabel || (formValues.category ? String(formValues.category) : null) },
          { label: 'Sub Category', value: selectedSubjectLabel },
          { label: 'Specialization', value: selectedTrackLabel },
          { label: 'Level', value: selectedLevelLabel },
          { label: 'Domain', value: String(formValues.creator_type || '').trim() || null },
          { label: 'Avatar', value: formValues.avatar_name || null },
        ],
    [
      formValues.avatar_name,
      formValues.category,
      formValues.creator_type,
      selectedCourseLabel,
      selectedLearningCategoryLabel,
      selectedLevelLabel,
      selectedSubjectLabel,
      selectedTrackLabel,
      showLearningUI,
    ]
  );
  const avatarRelationshipChain = useMemo(
    () =>
      showLearningUI
        ? [
          { label: 'Category', value: selectedLearningCategoryLabel || null },
          { label: 'Sub Category', value: selectedSubjectLabel },
          { label: 'Course', value: selectedCourseLabel },
          { label: 'Avatar', value: formValues.avatar_name || null },
        ]
        : [
          { label: 'Category', value: selectedLearningCategoryLabel || (formValues.category ? String(formValues.category) : null) },
          { label: 'Sub Category', value: selectedSubjectLabel },
          { label: 'Specialization', value: selectedTrackLabel },
          { label: 'Level', value: selectedLevelLabel },
          { label: 'Domain', value: String(formValues.creator_type || '').trim() || null },
          { label: 'Avatar', value: formValues.avatar_name || null },
        ],
    [
      formValues.avatar_name,
      formValues.category,
      formValues.creator_type,
      selectedCourseLabel,
      selectedLearningCategoryLabel,
      selectedSubjectLabel,
      showLearningUI,
    ]
  );
  const promptModeLabel = showLearningUI ? 'Learning prompt' : 'Non-learning prompt';
  const promptScopeSummary = showLearningUI
    ? [selectedSubjectLabel, selectedTrackLabel, selectedLevelLabel, selectedCourseLabel].filter(Boolean).join(' / ') || 'Runtime teaching context'
    : String(formValues.creator_type || '').trim() || 'Domain expertise not set yet';
  const selectedResponseLanguageLabel = selectedResponseLanguage
    ? getResponseLanguageLabel(selectedResponseLanguage)
    : 'Not set';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(AVATAR_CREATE_UI_STATE_KEY, JSON.stringify({ activeStepKey: activeAvatarStepKey }));
  }, [activeAvatarStepKey]);

  useEffect(() => {
    return () => {
      if (heygenImagePreview) {
        URL.revokeObjectURL(heygenImagePreview);
      }
    };
  }, [heygenImagePreview]);

  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawDraft = localStorage.getItem(CREATE_AVATAR_DRAFT_KEY);
      if (!rawDraft) return;
      const draft = JSON.parse(rawDraft) as { values?: PromptFormData; generatedPrompt?: string };
      if (draft.values) {
        reset(draft.values);
      }
      if (typeof draft.generatedPrompt === 'string') {
        setGeneratedPrompt(toPromptEditorHtml(draft.generatedPrompt));
      }
    } catch {
      localStorage.removeItem(CREATE_AVATAR_DRAFT_KEY);
    }
  }, [reset]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isDirty && !generatedPrompt) return;
    localStorage.setItem(
      CREATE_AVATAR_DRAFT_KEY,
      JSON.stringify({
        values: formValues,
        generatedPrompt,
      })
    );
  }, [formValues, generatedPrompt, isDirty]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const loadMasters = async () => {
    try {
      setLoading(true);
      const masterResults = await Promise.allSettled([
        personasService.list({ limit: 99 }),
        adminLearningService.categories.list(),
        adminLearningService.subjects.list(),
        adminLearningService.tracks.list(),
        adminLearningService.levels.list(),
        adminLearningService.courses.list(),
        adminLearningService.configs.list(),
        languagesService.listActive(),
      ]);
      const [
        personasRes,
        categoriesRes,
        subjectsRes,
        tracksRes,
        levelsRes,
        coursesRes,
        configsRes,
        languagesRes,
      ] = masterResults;

      setPersonas(mapActiveMasterOptions(getSettledValue(personasRes)?.data));
      setLearningCategories(getSettledValue(categoriesRes) ?? []);
      setAllSubjects(getSettledValue(subjectsRes) ?? []);
      setTracks(getSettledValue(tracksRes) ?? []);
      setLevels(getSettledValue(levelsRes) ?? []);
      setAllCourses(getSettledValue(coursesRes) ?? []);
      setResponseLanguages(getSettledValue(languagesRes) ?? []);
      const configs = getSettledValue(configsRes) ?? [];
      const learningCategoryConfig = configs.find((config) => config.config_key === 'avatar_learning_categories');
      setConfiguredLearningCategoryIds(getConfiguredLearningCategoryIds(learningCategoryConfig?.config_value));
      setSubjectLevelBindings(parseSubjectLevelBindings(configs));

      if (masterResults.some((result) => result.status === 'rejected')) {
        showToast('Some master data could not be loaded. Available backend-driven options are still usable.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load masters', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStreamingAvatars = async () => {
    try {
      setLoadingAvatars(true);
      const res = await api.get('/heygen/streaming-avatars');
      const avatars = res.data?.data || res.data || [];
      setStreamingAvatars(Array.isArray(avatars) ? avatars : []);
      setShowAvatarList(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch streaming avatars', 'error');
    } finally {
      setLoadingAvatars(false);
    }
  };

  const selectStreamingAvatar = (avatar: any) => {
    setValue('heygen_avatar_id', avatar.avatar_id || avatar.id || '');
    if (avatar.voice_id) setValue('heygen_voice_id', avatar.voice_id);
    if (avatar.gender) setValue('heygen_gender', avatar.gender);
    setShowAvatarList(false);
    showToast(`Selected: ${avatar.avatar_name || avatar.name || avatar.avatar_id}`, 'success');
  };

  const clearHeygenImage = () => {
    if (heygenImagePreview) {
      URL.revokeObjectURL(heygenImagePreview);
    }
    setHeygenImagePreview('');
    setHeygenImageFile(null);
    if (heygenImageInputRef.current) {
      heygenImageInputRef.current.value = '';
    }
  };

  const handleHeygenImageSelection = (file: File) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const fileName = file.name.toLowerCase();
    const isAllowedType =
      allowedMimeTypes.includes(file.type) ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.webp');

    if (!isAllowedType) {
      showToast('Only JPG, PNG, and WEBP images are supported', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Image size must be 10MB or less', 'error');
      return;
    }

    if (heygenImagePreview) {
      URL.revokeObjectURL(heygenImagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setHeygenImageFile(file);
    setHeygenImagePreview(previewUrl);
  };

  const getSelectedWithDescriptions = (ids: number[], options: MasterOption[]) => {
    const selected = options.filter(o => ids.includes(o.id));
    if (selected.length === 0) return 'Not specified';
    if (selected.length === 1) {
      const o = selected[0];
      return `${o.name}${o.description ? `: ${o.description}` : ''}`;
    }
    return '\n  - ' + selected.map(o => `${o.name}${o.description ? `: ${o.description}` : ''}`).join('\n  - ');
  };

  const getSelectedNames = (ids: number[], options: MasterOption[]) => {
    return options.filter(o => ids.includes(o.id)).map(o => o.name).join(', ') || 'Not specified';
  };

  const getPlainText = (value?: string) => {
    if (!value) return '';
    if (typeof window !== 'undefined') {
      const doc = new DOMParser().parseFromString(value, 'text/html');
      return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
    }
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const generatePrompt = () => {
    const selectedEmotions = 'Not specified';
    const selectedTones = 'Not specified';
    const selectedStyles = 'Not specified';
    const selectedModes = 'Not specified';
    const selectedDomains = 'Not specified';
    const selectedDelivery = 'Not specified';
    const selectedSafety = 'Not specified';

      const htmlPrompt = buildAvatarPromptContent({
        values: formValues,
        category: selectedLearningCategory,
        isLearningMode: showLearningUI,
        personas: filteredPersonas,
        emotions: selectedEmotions,
      tones: selectedTones,
      communicationStyles: selectedStyles,
      modes: selectedModes,
      domains: selectedDomains,
      deliveries: selectedDelivery,
      systemSafety: selectedSafety,
      subjects: filteredSubjects,
      tracks: filteredTracks,
      levels,
      courses: filteredCourses,
      responseLanguage: selectedResponseLanguage,
    });

    setGeneratedPrompt(toPromptEditorHtml(htmlPrompt));
    showToast('Prompt generated successfully!', 'success');
  };

  const syncAvatarLearningData = async (avatarId: number, data: PromptFormData) => {
    const normalizedSubjectIds = Array.isArray(data.subject_ids)
      ? data.subject_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : [];
    const normalizedCourseIds = Array.isArray(data.course_ids)
      ? data.course_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : [];

    await avatarsService.assignLearningScopes(avatarId, {
      subject_ids: normalizedSubjectIds,
      track_id: showLearningUI && data.track_id ? Number(data.track_id) : null,
      level_id: showLearningUI && data.level_id ? Number(data.level_id) : null,
    });

    await avatarsService.assignMappedCourses(avatarId, normalizedCourseIds);
  };

  const onSubmit = async (data: PromptFormData) => {
    const promptContent = normalizePromptForSave(editorRef.current?.getContent() || generatedPrompt);
    if (!getPromptPlainText(promptContent).trim()) {
      showToast('Please generate a prompt first', 'error');
      return;
    }

    try {
      setSubmitting(true);

      // Use FormData for multipart/form-data upload
      const formData = new FormData();
      formData.append('avatar_name', data.avatar_name);
      if (selectedLearningCategoryLabel) {
        formData.append('category', selectedLearningCategoryLabel);
      }
      formData.append('persona', data.persona || '');
      formData.append('authority_level', data.authority_level || 'moderate');
      formData.append('creator_type', data.creator_type || '');
      formData.append('response_length', data.response_length || 'medium');
      formData.append('question_frequency', data.question_frequency || 'moderate');
      formData.append('sensitivity_level', data.sensitivity_level || 'medium');
      formData.append('memory_permission', data.memory_permission || 'allowed');
      formData.append('greeting_message', data.greeting_message || '');
      formData.append('backstory', data.backstory || '');
      formData.append('primary_language', selectedResponseLanguage?.name || data.primary_language || 'Hindi');
      formData.append('response_language_code', selectedResponseLanguage?.code || data.response_language_code || '');
      formData.append('prompt_content', promptContent);

      // Arrays as JSON strings
      formData.append('emotions', JSON.stringify(data.emotions || []));
      formData.append('tones', JSON.stringify(data.tones || []));
      formData.append('communication_styles', JSON.stringify(data.communication_styles || []));
      formData.append('modes', JSON.stringify(data.modes || []));
      formData.append('domains', JSON.stringify(data.domains || []));
      formData.append('deliveries', JSON.stringify(data.delivery || []));
      formData.append('system_safety', JSON.stringify(data.system_safety || []));

      // Pricing fields
      formData.append('price', String(Number(data.price) || 499));
      formData.append('currency', data.currency || 'INR');
      formData.append('duration_minutes', String(Number(data.duration_minutes) || 30));
      if (data.credits) formData.append('credits', String(data.credits));
      if (data.credits_per_minute) formData.append('credits_per_minute', String(data.credits_per_minute));
      formData.append('validity_days', String(Number(data.validity_days) || 7));
      formData.append('discount_percent', String(Number(data.discount_percent) || 0));
      formData.append('trial_minutes', String(Number(data.trial_minutes) || 5));
      formData.append('video_url', data.video_url || '');

      // HeyGen fields
      if (data.heygen_avatar_id) formData.append('heygen_avatar_id', data.heygen_avatar_id);
      formData.append('heygen_voice_id', data.heygen_voice_id || '');
      formData.append('heygen_gender', data.heygen_gender || 'male');
      formData.append('heygen_language', data.heygen_language || 'en-US');
      formData.append('is_interactive', String(data.is_interactive ?? true));
      formData.append('avatar_type', data.avatar_type || 'default');
      if (heygenImageFile) formData.append('heygen_image', heygenImageFile);

      const avatarResponse = await api.post('/avatars/upload', formData);
      const createdAvatar = avatarResponse.data?.data || avatarResponse.data;

      if (createdAvatar?.id) {
        try {
          await syncAvatarLearningData(createdAvatar.id, data);
        } catch (syncError: any) {
          showToast(
            syncError?.message || 'Avatar was created, but learning mappings need another try.',
            'warning'
          );
        }
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem(CREATE_AVATAR_DRAFT_KEY);
      }
      showToast('Avatar created successfully!', 'success');
      router.push('/masters/avatars');
    } catch (err: any) {
      showToast(err.message || 'Failed to create avatar', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToFirstFormError = (fieldNames: string[]) => {
    if (typeof window === 'undefined') return;
    const firstField = fieldNames[0];
    if (!firstField) return;

    window.requestAnimationFrame(() => {
      const field = document.querySelector(`[data-field-name="${firstField}"]`);
      if (field instanceof HTMLElement) {
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const focusable = field.querySelector('input, textarea, [role="button"], button');
        if (focusable instanceof HTMLElement) {
          focusable.focus();
        }
      }
    });
  };

  const onInvalid = (formErrors: typeof errors) => {
    showToast('Please complete the highlighted required fields.', 'error');
    scrollToFirstFormError(Object.keys(formErrors));
  };

  const MultiSelectField = ({
    label,
    options,
    value,
    onChange
  }: {
    label: string;
    options: MasterOption[];
    value: number[];
    onChange: (val: number[]) => void;
  }) => (
    <SearchableMultiSelect
      label={label}
      value={value}
      onChange={onChange}
      options={options.map((option) => ({
        value: option.id,
        label: option.name,
        description: option.description ?? null,
      }))}
      placeholder={`Select ${label.toLowerCase()}`}
      emptyText="No options available"
      closeOnSelect={false}
    />
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-10 py-6">
      <div className="mb-6 rounded-[24px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(236,72,153,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(244,247,255,0.98)_48%,rgba(240,244,248,0.96)_100%)] px-5 py-3 text-slate-900 shadow-[0_18px_42px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-[24px] font-semibold leading-none tracking-tight">Create Avatar</h1>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">
                Build avatar identity, connect the right scope, and prepare a prompt that stays aligned with runtime behavior.
              </p>
            </div>
            <div className="flex items-center gap-2 md:justify-end">
              <button
                type="button"
                onClick={() => setShowFlowDetails((current) => !current)}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700"
              >
                {showFlowDetails ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                {showFlowDetails ? 'Collapse' : 'Expand'}
              </button>
              <Link href="/masters/avatars">
                <Button className="h-10 rounded-full border border-emerald-200/80 bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition hover:bg-emerald-700">
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Avatars
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showFlowDetails ? (
        <div className="mb-5">
          <CompactFlowShell
            title="Avatar Setup Flow"
            subtitle="Define the avatar identity first, then connect learning scope or domain expertise, validate the prompt, and save only when the runtime context is clear."
            steps={[...avatarFlowSteps]}
            activeStepKey={activeAvatarStepKey}
            hideHeader
            hideContext
            expanded
            context={avatarContextEntries}
            guidance={{
              eyebrow: 'Creator guidance',
              title: showLearningUI ? 'This avatar will act as a learning delivery engine' : 'This avatar will act as a non-learning specialist',
              description: showLearningUI ? 'For learning categories, sub category is the required scope anchor. Specialization, level, and course mapping help the runtime narrow where this avatar should appear.' : 'For non-learning categories, domain expertise explains what the avatar is expert in. If backend sub categories exist for this category, you can still map them for cleaner runtime targeting.',
              bullets: showLearningUI ? [
                'Category decides whether LMS scope fields are needed.',
                'Sub category is required because it anchors teaching scope.',
                'Mapped courses are recommended when you want precise routing.',
              ] : [
                'Domain expertise is required for non-learning avatars.',
                'Sub category appears dynamically only when backend child options exist for the selected category.',
              ],
            }}
            relationshipTitle="Avatar Relationship Preview"
            relationshipChain={avatarRelationshipChain}
          />
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
        <div className="grid grid-cols-1 gap-6 lg:h-[calc(100vh-128px)] lg:grid-cols-2 lg:overflow-hidden">
          <div className="space-y-6 lg:max-h-[calc(100vh-128px)] lg:overflow-y-auto lg:pr-2" style={{ scrollBehavior: 'smooth' }}>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText size={20} />
                  Core Identity
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    fieldName="avatar_name"
                    label="Avatar Name"
                    {...register('avatar_name', { required: 'Avatar name is required' })}
                    error={errors.avatar_name?.message}
                    placeholder="e.g., Wisdom Guide"
                    required
                  />
                  <Controller
                    name="category"
                    control={control}
                    rules={{ required: 'Category is required' }}
                    render={({ field }) => (
                      <Select
                        fieldName="category"
                        label="Category"
                        value={field.value ?? undefined}
                        options={categorySelectOptions}
                        onChange={(value) => field.onChange(value !== '' && value != null ? Number(value) : null)}
                        placeholder="Select a category"
                        required
                        error={errors.category?.message}
                        disabled={!categorySelectOptions.length}
                      />
                    )}
                  />
                  <Controller
                    name="persona_id"
                    control={control}
                    rules={{ required: 'Persona is required' }}
                    render={({ field }) => (
                      <Select
                        fieldName="persona_id"
                        label="Persona"
                        value={field.value ?? undefined}
                        options={personaOptions}
                        onChange={(value) => {
                          const selectedPersonaOption = filteredPersonas.find(
                            (persona) => Number(persona.id) === Number(value)
                          );
                          if (Number(value) === CURRENT_PERSONA_SENTINEL) {
                            field.onChange(null);
                            return;
                          }
                          field.onChange(value !== '' && value != null ? Number(value) : null);
                          setValue('persona', selectedPersonaOption?.name || '', {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }}
                        placeholder={selectedLearningCategory ? 'Select a persona' : 'Select category first'}
                        disabled={!selectedLearningCategory || personaOptions.length === 0}
                        required
                        error={errors.persona_id?.message}
                      />
                    )}
                  />
                  <Controller
                    name="authority_level"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Authority Level"
                        value={field.value}
                        options={[
                          { value: 'low', label: 'Low' },
                          { value: 'moderate', label: 'Moderate' },
                          { value: 'high', label: 'High' },
                        ]}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {!showLearningUI ? (
                    <Input
                      fieldName="creator_type"
                      label="Domain Expertise"
                      {...domainExpertiseField}
                      required={!showLearningUI}
                      error={errors.creator_type?.message}
                      placeholder="e.g., Public policy, wellbeing, career guidance"
                    />
                  ) : null}
                  <Controller
                    name="response_language_code"
                    control={control}
                    render={({ field }) => (
                      <Select
                        fieldName="response_language_code"
                        label="Response Language"
                        value={field.value}
                        options={responseLanguageOptions}
                        onChange={(value) => field.onChange(String(value))}
                        placeholder={responseLanguages.length ? 'Select a response language' : 'Loading languages...'}
                        disabled={!responseLanguages.length}
                        required
                      />
                    )}
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Greeting Message</label>
                  <textarea
                    {...register('greeting_message')}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="The first message users see when starting a chat. e.g., Namaste! Main hoon Guruji, aaj kaise madad kar sakta hoon?"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Backstory</label>
                  <textarea
                    {...register('backstory')}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Character backstory for deeper immersion. e.g., Born in Varanasi, trained under a spiritual master for 20 years..."
                  />
                </div>
                <div className="mt-4">
                  <Input
                    label="Avatar Video"
                    {...register('video_url')}
                    placeholder="e.g., https://example.com/video.mp4"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-primary-100 bg-gradient-to-br from-white via-primary-50/30 to-blue-50/40 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Course Mapping</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Selected courses are saved through avatar-course mapping and help runtime narrow where this avatar should appear.
                    </p>
                    {isLoadingLearningData ? (
                      <div className="mt-3 inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                        Loading learning structure...
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-5">
                    <Controller
                      name="course_ids"
                      control={control}
                      render={({ field }) => (
                        <SearchableMultiSelect
                          fieldName="course_ids"
                          closeOnSelect={false}
                          label="Mapped Courses"
                          value={field.value}
                          onChange={field.onChange}
                          options={courseOptionsForMapping.map((course) => ({
                            value: course.id,
                            label: course.title,
                            description: [course.slug, course.difficulty_level].filter(Boolean).join(' • '),
                          }))}
                          helperText={filteredCourses.length > 0
                                ? "Selected courses are saved through avatar-course mapping API"
                                : "Showing all backend courses because no scoped course matched the current filters."}
                          emptyText="No courses available"
                          error={errors.course_ids?.message}
                        />
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Behavior Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="response_length"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Response Length"
                        value={field.value}
                        options={[
                          { value: 'short', label: 'Short' },
                          { value: 'medium', label: 'Medium' },
                          { value: 'detailed', label: 'Detailed' },
                        ]}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="sensitivity_level"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Sensitivity Level"
                        value={field.value}
                        options={[
                          { value: 'low', label: 'Low' },
                          { value: 'medium', label: 'Medium' },
                          { value: 'high', label: 'High' },
                        ]}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </CardContent>
            </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Pricing Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  fieldName="price"
                  label="Price *"
                  type="number"
                  step="0.01"
                  {...register('price', { required: 'Price is required' })}
                  error={errors.price?.message}
                  placeholder="499.00"
                  required
                />
                <Controller
                  name="currency"
                  control={control}
                  rules={{ required: 'Currency is required' }}
                  render={({ field }) => (
                    <Select
                      fieldName="currency"
                      label="Currency"
                      value={field.value}
                      options={[
                        { value: 'INR', label: 'INR' },
                        { value: 'USD', label: 'USD' },
                      ]}
                      onChange={field.onChange}
                      required
                      error={errors.currency?.message}
                    />
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Input
                  fieldName="duration_minutes"
                  label="Duration (minutes)"
                  type="number"
                  {...register('duration_minutes', { required: 'Duration is required' })}
                  error={errors.duration_minutes?.message}
                  placeholder="30"
                  required
                />
                <Input
                  fieldName="validity_days"
                  label="Validity (days)"
                  type="number"
                  {...register('validity_days', { required: 'Validity is required' })}
                  error={errors.validity_days?.message}
                  placeholder="7"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Input
                  label="Discount %"
                  type="number"
                  {...register('discount_percent')}
                  placeholder="0"
                />
                <Input
                  label="Trial (minutes)"
                  type="number"
                  {...register('trial_minutes')}
                  placeholder="5"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Input
                  label="Credits"
                  type="number"
                  {...register('credits')}
                  placeholder="Optional"
                />
                <Input
                  label="Credits Per Minute"
                  type="number"
                  step="0.01"
                  {...register('credits_per_minute')}
                  placeholder="Optional"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Avatar Configuration</h3>
              <p className="text-sm text-gray-500 mb-4">
                Enter the Interactive Avatar ID. Backend will auto-populate preview image, video, gender &amp; voice.
              </p>

              <div className="mb-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      label="Avatar ID"
                      {...register('heygen_avatar_id')}
                      placeholder="Paste Interactive Avatar ID"
                    />
                  </div>
                  {/* <Button
                    type="button"
                    variant="secondary"
                    onClick={fetchStreamingAvatars}
                    disabled={loadingAvatars}
                    className="mb-[2px]"
                  >
                    <List size={16} className="mr-1" />
                    {loadingAvatars ? 'Loading...' : 'Browse Avatars'}
                  </Button> */}
                </div>
              </div>

              {showAvatarList && streamingAvatars.length > 0 && (
                <div className="mb-4 border rounded-lg max-h-60 overflow-y-auto">
                  <div className="p-2 bg-gray-50 border-b text-sm font-medium text-gray-600 sticky top-0">
                    Available Interactive Avatars ({streamingAvatars.length})
                  </div>
                  {streamingAvatars.map((avatar: any, idx: number) => (
                    <div
                      key={avatar.avatar_id || idx}
                      className="flex items-center gap-3 p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => selectStreamingAvatar(avatar)}
                    >
                      {avatar.preview_image_url && (
                        <img src={avatar.preview_image_url} alt="" className="w-10 h-10 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{avatar.avatar_name || avatar.name || avatar.avatar_id}</div>
                        <div className="text-xs text-gray-500 font-mono">{avatar.avatar_id || avatar.id}</div>
                      </div>
                      <span className="text-xs text-blue-600">Select</span>
                    </div>
                  ))}
                </div>
              )}

              {showAvatarList && streamingAvatars.length === 0 && !loadingAvatars && (
                <div className="mb-4 p-3 bg-yellow-50 text-yellow-700 text-sm rounded-lg">
                  No interactive avatars found. Create one at labs.heygen.com first.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Voice ID"
                  {...register('heygen_voice_id')}
                  placeholder="e.g., voice_abc123"
                />
                <Controller
                  name="heygen_gender"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Gender"
                      value={field.value}
                      options={[
                        { value: 'male', label: 'Male' },
                        { value: 'female', label: 'Female' },
                      ]}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Input
                  label="Language"
                  {...register('heygen_language')}
                  placeholder="e.g., en-US"
                />
                <Controller
                  name="avatar_type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Avatar Type"
                      value={field.value}
                      options={[
                        { value: 'default', label: 'Default' },
                        { value: 'heygen', label: 'Avatar' },
                        { value: 'custom', label: 'Custom' },
                      ]}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_interactive"
                    {...register('is_interactive')}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="is_interactive" className="text-sm text-gray-700">
                    Is Interactive (Streaming Avatar)
                  </label>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo Avatar Image (Optional)
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsImageDragOver(true);
                  }}
                  onDragLeave={() => setIsImageDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsImageDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      handleHeygenImageSelection(file);
                    }
                  }}
                  className={`rounded-xl border-2 border-dashed p-4 transition-colors ${isImageDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
                    }`}
                >
                  {heygenImagePreview ? (
                    <div className="flex items-center gap-4">
                      <img
                        src={heygenImagePreview}
                        alt="Selected Avatar upload"
                        className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{heygenImageFile?.name}</p>
                        <p className="text-xs text-gray-500">Will be sent as `heygen_image` with avatar form</p>
                      </div>
                      <Button type="button" variant="secondary" onClick={clearHeygenImage}>
                        <X size={16} className="mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="mx-auto h-12 w-12 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-3">
                        <ImageIcon size={20} className="text-gray-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">Drag and drop image here</p>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP up to 10MB</p>
                      <input
                        ref={heygenImageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleHeygenImageSelection(file);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="mt-3"
                        onClick={() => heygenImageInputRef.current?.click()}
                      >
                        <Upload size={16} className="mr-2" />
                        Choose Image
                      </Button>
                    </div>
                  )}
                </div>
                </div>
              </CardContent>
            </Card>

          </div>

        <div className="space-y-6 lg:max-h-[calc(100vh-128px)] lg:overflow-y-auto lg:pl-2" style={{ scrollBehavior: 'smooth' }}>
          <Card className="lg:sticky lg:top-6">
            <CardContent className="p-6">
                <div className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(248,250,252,0.98)_0%,rgba(239,246,255,0.95)_58%,rgba(255,255,255,0.98)_100%)] px-4 py-3 shadow-sm shadow-slate-100/70">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex h-7 items-center rounded-full px-3 text-[11px] font-semibold ${showLearningUI ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'}`}>
                        {promptModeLabel}
                      </span>
                    </div>
                    <Button
                      type="button"
                      onClick={generatePrompt}
                      className="inline-flex h-9 items-center gap-2 rounded-full border border-blue-500/20 bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_52%,#0ea5e9_100%)] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(37,99,235,0.3)]"
                    >
                      <Sparkles size={15} />
                      Generate Prompt
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-white/95 px-3 text-[11px] font-medium text-slate-700 shadow-sm">
                      Language: {selectedResponseLanguageLabel}
                    </span>
                    {isDirty ? (
                      <span className="inline-flex h-7 items-center rounded-full bg-amber-50 px-3 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                        Draft autosaved locally
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm shadow-slate-100/70">
                <div className="flex items-center justify-between border-b border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Editable Prompt Content
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-900">
                      Review, refine, and save the final runtime prompt
                    </div>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                    Live prompt surface
                  </div>
                </div>
                <div className="bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.06),transparent_48%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3">
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner shadow-slate-100">
                    <Editor
                      apiKey="sw0q7z8lus4keopwkzem4b857uut553k41mt7jn1i7i4xgce"
                      onInit={(_evt: any, editor: any) => editorRef.current = editor}
                      value={generatedPrompt}
                      onEditorChange={(content: string) => setGeneratedPrompt(content)}
                      init={{
                        height: 500,
                        menubar: false,
                        plugins: [
                          'advlist', 'autolink', 'lists', 'link', 'charmap',
                          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                          'insertdatetime', 'table', 'preview', 'wordcount'
                        ],
                        toolbar: 'undo redo | blocks | ' +
                          'bold italic forecolor | alignleft aligncenter ' +
                          'alignright alignjustify | bullist numlist outdent indent | ' +
                          'removeformat | code',
                        content_style:
                          'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif; font-size: 14px; line-height: 1.7; color: #0f172a; background: linear-gradient(180deg,#ffffff 0%,#f8fafc 100%); padding: 8px; } ' +
                          'h1,h2,h3,strong { color: #64748b; } ' +
                          'pre { display: block; width: 100%; max-width: 100%; margin: 0; background: linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%); border: 1px solid #dbeafe; border-radius: 16px; padding: 16px; color: #0f172a; white-space: pre-wrap; box-sizing: border-box; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8); }',
                        branding: false,
                      }}
                    />
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
        <div className="sticky bottom-0 z-10 mt-4 flex justify-end gap-3 rounded-[20px] border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
          <Button type="button" variant="outline" onClick={() => setGeneratedPrompt('')}>
            Clear
          </Button>
                  <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Avatar'}
          </Button>
        </div>
      </div>
      </form>
    </div>

  );
}
