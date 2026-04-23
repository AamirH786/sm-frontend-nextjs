import type {
  LearningCategory,
  Subject,
  Track,
  Level,
  LearningCourse,
} from '@/services/adminLearningService';
import type { PromptMasterOption, AvatarPromptValues } from '@/lib/avatarPrompt';
import { getLearningCategoryLabel, isLearningCategory } from '@/lib/avatarPrompt';
import type { ResponseLanguage } from '@/services/languagesService';
import { getPromptResponseLanguageInstruction, getPromptResponseLanguageName } from '@/lib/responseLanguage';

interface BuildAvatarPromptInput {
  values: AvatarPromptValues;
  category?: LearningCategory;
  isLearningMode?: boolean;
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
  responseLanguage?: ResponseLanguage | null;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getPlainText = (value?: string) =>
  (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const getConfiguredLevelLabel = (values: AvatarPromptValues, levels: Level[]) => {
  const selectedLevel = levels.find((level) => Number(level.id) === Number(values.level_id));
  return selectedLevel?.name || 'Not manually fixed';
};

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
    return `- ${parts.join(' | ')}`;
  });
};

export const buildAvatarPromptContent = ({
  values,
  category,
  isLearningMode,
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
  responseLanguage,
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
  const configuredLevel = getConfiguredLevelLabel(values, levels);
  const derivedLevel = getDerivedLevelLabel(values, levels);
  const learningMode =
    typeof isLearningMode === 'boolean'
      ? isLearningMode
      : isLearningCategory(category, { subjects, tracks, courses });
  const domainExpertise = String(values.creator_type || '').trim() || 'General domain guidance';
  const responseLanguageName = getPromptResponseLanguageName(responseLanguage);
  const responseLanguageInstruction = getPromptResponseLanguageInstruction(responseLanguage);
  const selectedSubCategorySummary =
    selectedSubjects.map((subject) => subject.name).join(', ') || 'No explicit sub category selected';
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
    `Response Language: ${responseLanguageName}`,
    ...(responseLanguage?.locale ? [`Language Locale: ${responseLanguage.locale}`] : []),
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
    'RESPONSE LANGUAGE RULE',
    '----------------------',
    responseLanguageInstruction,
    '',
    ...(learningMode
      ? [
          'LEARNING CONTEXT',
          '----------------',
          `Sub Category Scope: ${selectedSubCategorySummary === 'No explicit sub category selected' ? 'Runtime sub category context' : selectedSubCategorySummary}`,
          `Specialization Scope: ${selectedTrack?.name || 'Runtime specialization context'}`,
          ...(selectedTrackDescription ? [`Specialization Detail: ${selectedTrackDescription}`] : []),
          `Configured Level Filter: ${configuredLevel}`,
          `Runtime Leveling Rule: ${derivedLevel}`,
          'Mapped Courses (summary only):',
          ...getSelectedCourseSummary(values.course_ids, courses),
          '- Use learning scope only to adapt explanation depth, examples, and placement relevance',
          '- Never expose full course content, raw modules, hidden item text, or internal admin structure',
          '- If runtime context is missing, stay inside the selected teaching domain without inventing syllabus details',
          '',
        ]
      : [
          'NON-LEARNING CONTEXT',
          '--------------------',
          `Domain Expertise: ${domainExpertise}`,
          `Intent Context: ${categoryLabel}`,
          `Sub Category Context: ${selectedSubCategorySummary}`,
          `Specialization Context: ${selectedTrack?.name || 'Not explicitly fixed'}`,
          ...(selectedTrackDescription ? [`Specialization Detail: ${selectedTrackDescription}`] : []),
          '- Use domain expertise and user intent, not course structure',
          '- Do not imply learner level, academic progression, or course enrollment',
          '- Keep guidance practical, scoped, and aligned to the selected expertise domain',
          '',
        ]),
    'RESPONSE CONTRACT',
    '-----------------',
    '- Start with clarity: answer directly before expanding',
    '- Ask follow-up questions only when they improve the outcome',
    '- Keep explanations aligned to the selected persona, authority, and delivery style',
    ...(learningMode
      ? ['- Teach with structured progression, but never leak hidden curriculum or internal item content']
      : ['- Guide with expert framing, but never pretend there is a course path when none exists']),
    '',
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
