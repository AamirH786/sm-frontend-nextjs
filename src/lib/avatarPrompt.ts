import type {
  LearningCategory,
  Subject,
  Track,
  Level,
  LearningCourse,
} from '@/services/adminLearningService';

export interface PromptMasterOption {
  id: number;
  name: string;
  description?: string;
}

export const getConfiguredLearningCategoryIds = (configValue: unknown): number[] => {
  if (Array.isArray(configValue)) {
    return configValue
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  }

  if (
    typeof configValue === 'object' &&
    configValue !== null &&
    'category_ids' in configValue &&
    Array.isArray((configValue as { category_ids?: unknown[] }).category_ids)
  ) {
    return ((configValue as { category_ids: unknown[] }).category_ids ?? [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  }

  return [];
};

export interface AvatarPromptValues {
  avatar_name?: string;
  persona?: string;
  persona_id?: number | null;
  authority_level?: string;
  creator_type?: string;
  response_length?: string;
  question_frequency?: string;
  sensitivity_level?: string;
  memory_permission?: string;
  greeting_message?: string;
  backstory?: string;
  primary_language?: string;
  response_language_code?: string;
  subject_ids?: number[];
  track_id?: number | null;
  level_id?: number | null;
  course_ids?: number[];
}

interface BuildAvatarPromptInput {
  values: AvatarPromptValues;
  category?: LearningCategory;
  personas: PromptMasterOption[];
  emotions: string;
  tones: string;
  communicationStyles: string;
  modes: string;
  domains: string;
  deliveries: string;
  systemSafety: string;
  subjects: Subject[];
  tracks: Track[];
  levels: Level[];
  courses: LearningCourse[];
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const getLearningCategoryLabel = (
  category?: LearningCategory | { name?: string | null; title?: string | null } | null
) => {
  if (!category) return '';
  const fallbackTitle = (category as { title?: string | null }).title;
  return String(category.name ?? fallbackTitle ?? '').trim();
};

export const isLearningCategory = (
  category: LearningCategory | undefined,
  context: {
    subjects?: Subject[];
    tracks?: Track[];
    courses?: LearningCourse[];
  }
) => {
  if (!category) return false;

  if ((category as LearningCategory & { is_learning_category?: boolean | null }).is_learning_category === true) {
    return true;
  }

  if (typeof category.category_type === 'string' && category.category_type.trim().toLowerCase() === 'learning') {
    return true;
  }

  const categorySubjects =
    context.subjects?.filter((subject) => Number(subject.category_id) === Number(category.id)) ?? [];
  if (categorySubjects.length > 0) {
    return true;
  }

  const categorySubjectIds = new Set(categorySubjects.map((subject) => Number(subject.id)));

  const categoryTracks =
    context.tracks?.filter((track) => categorySubjectIds.has(Number(track.subject_id))) ?? [];
  if (categoryTracks.length > 0) {
    return true;
  }

  const categoryCourses =
    context.courses?.filter(
      (course) =>
        Number(course.category_id) === Number(category.id) ||
        (course.subject_id != null && categorySubjectIds.has(Number(course.subject_id)))
    ) ?? [];
  if (categoryCourses.length > 0) {
    return true;
  }

  return false;
};

export const shouldShowLearningScopeUI = (
  category: LearningCategory | undefined,
  context: {
    subjects?: Subject[];
    tracks?: Track[];
    courses?: LearningCourse[];
  }
) => isLearningCategory(category, context);

const getPlainText = (value?: string) =>
  (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const getDerivedLevelLabel = (values: AvatarPromptValues, levels: Level[]) => {
  const selectedLevel = levels.find((level) => Number(level.id) === Number(values.level_id));
  return selectedLevel?.name || 'Runtime-derived from diagnostic results, quiz performance, and user progress';
};

const getSelectedCourseSummary = (courseIds: number[] | undefined, courses: LearningCourse[]) => {
  const selectedCourses = courses.filter((course) => (courseIds || []).includes(course.id));
  if (selectedCourses.length === 0) {
    return ['- No direct course mapping selected; use runtime course context only'];
  }

  return selectedCourses.slice(0, 6).map((course) => {
    const parts = [course.title];
    if (course.slug) parts.push(course.slug);
    return `- ${parts.join(' • ')}`;
  });
};

export const buildAvatarPrompt = ({
  values,
  category,
  personas,
  emotions,
  tones,
  communicationStyles,
  modes,
  domains,
  deliveries,
  systemSafety,
  subjects,
  tracks,
  levels,
  courses,
}: BuildAvatarPromptInput) => {
  const avatarName = values.avatar_name || '{{AVATAR_NAME}}';
  const persona = values.persona || '{{PERSONA}}';
  const categoryLabel = getLearningCategoryLabel(category) || '{{CATEGORY}}';
  const selectedPersona =
    (values.persona_id != null
      ? personas.find((item) => Number(item.id) === Number(values.persona_id))
      : null) || personas.find((item) => item.name === values.persona);
  const personaDescription = getPlainText(selectedPersona?.description);
  const selectedSubjects = subjects.filter((subject) => (values.subject_ids || []).includes(subject.id));
  const selectedTrack = tracks.find((track) => Number(track.id) === Number(values.track_id));
  const selectedTrackDescription = getPlainText(selectedTrack?.description ?? undefined);
  const derivedLevel = getDerivedLevelLabel(values, levels);
  const learningMode = isLearningCategory(category, { subjects, tracks, courses });
  const behaviorRules = personaDescription
    ? [`- ${personaDescription}`]
    : [
        '- Maintain consistent tone and persona boundaries',
        '- Respond clearly, calmly, and without role drift',
        '- Stay helpful without overclaiming expertise',
      ];

  const promptLines = [
    `You are ${avatarName}, an avatar delivery engine operating inside the SummonMind platform.`,
    '',
    'CORE IDENTITY',
    '-------------',
    `Avatar Name: ${avatarName}`,
    `Category: ${categoryLabel}`,
    `Persona: ${persona}`,
    `Authority Level: ${values.authority_level || '{{AUTHORITY_LEVEL}}'}`,
    `Primary Language: ${values.primary_language || 'Hindi'}`,
    '',
    ...(values.backstory ? ['BACKSTORY', '---------', values.backstory, ''] : []),
    ...(values.greeting_message ? ['GREETING', '--------', values.greeting_message, ''] : []),
    'BASE BEHAVIOR',
    '-------------',
    ...behaviorRules,
    `Emotions: ${emotions}`,
    `Tones: ${tones}`,
    `Communication Styles: ${communicationStyles}`,
    `Modes: ${modes}`,
    `Domains: ${domains}`,
    `Delivery Style: ${deliveries}`,
    `Response Depth: ${values.response_length || '{{RESPONSE_LENGTH}}'}`,
    `Question Frequency: ${values.question_frequency || '{{QUESTION_FREQUENCY}}'}`,
    '',
    ...(learningMode
      ? [
          'LEARNING CONTEXT',
          '----------------',
          `Subject Scope: ${selectedSubjects.map((subject) => subject.name).join(', ') || 'Runtime subject context'}`,
          `Track Scope: ${selectedTrack?.name || 'Runtime track context'}`,
          ...(selectedTrackDescription ? [`Track Detail: ${selectedTrackDescription}`] : []),
          `Derived Level: ${derivedLevel}`,
          'Mapped Courses (summary only):',
          ...getSelectedCourseSummary(values.course_ids, courses),
          '- Never expose full course content, raw modules, or hidden item text',
          '- Use course scope only to adapt explanation depth and relevance',
          '',
        ]
      : [
          'NON-LEARNING CONTEXT',
          '--------------------',
          `Domain Expertise: ${values.creator_type || 'General domain guidance'}`,
          `Intent Context: ${categoryLabel}`,
          '- Use domain expertise and user intent, not course structure',
          '- Do not imply learner level or academic progression',
          '',
        ]),
    'AUTHORITY & SAFETY',
    '------------------',
    `Authority Level: ${values.authority_level || '{{AUTHORITY_LEVEL}}'}`,
    `Sensitivity Level: ${values.sensitivity_level || '{{SENSITIVITY_LEVEL}}'}`,
    `Memory Permission: ${values.memory_permission || '{{MEMORY_PERMISSION}}'}`,
    `System Safety: ${systemSafety}`,
    '- Never present yourself as a licensed real-world professional unless explicitly authorized by system policy',
    '- Avoid certainty in medical, legal, or financial matters',
    '- Do not encourage harm, dependency, abuse, or illegal activity',
    '- If the user shows distress, stabilize and guide toward appropriate real-world support',
    '',
    'FINAL OPERATING RULE',
    '--------------------',
    'Stay in role, stay within scope, and adapt your response using the active runtime context only.',
  ];

  return `<pre style="font-family: monospace; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(
    promptLines.map((line) => line || ' ').join('\n')
  )}</pre>`;
};
