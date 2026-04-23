import type { LearningConfig, Level } from '@/services/adminLearningService';

export const SUBJECT_LEVEL_BINDINGS_CONFIG_KEY = 'learning_subject_level_bindings';

export type SubjectLevelBindings = Record<number, number[]>;

const normalizeLevelIds = (value: unknown): number[] =>
  Array.isArray(value)
    ? value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry) && entry > 0)
    : [];

export const parseSubjectLevelBindings = (configs: LearningConfig[]): SubjectLevelBindings => {
  const config = configs.find((entry) => entry.config_key === SUBJECT_LEVEL_BINDINGS_CONFIG_KEY);
  const rawValue = config?.config_value;
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return {};
  }

  return Object.entries(rawValue as Record<string, unknown>).reduce<SubjectLevelBindings>((acc, [subjectId, levelIds]) => {
    const normalizedSubjectId = Number(subjectId);
    if (!Number.isFinite(normalizedSubjectId) || normalizedSubjectId <= 0) return acc;
    acc[normalizedSubjectId] = normalizeLevelIds(levelIds);
    return acc;
  }, {});
};

export const stringifySubjectLevelBindings = (bindings: SubjectLevelBindings) =>
  Object.entries(bindings).reduce<Record<string, number[]>>((acc, [subjectId, levelIds]) => {
    const normalized = normalizeLevelIds(levelIds);
    if (normalized.length > 0) {
      acc[String(subjectId)] = normalized;
    }
    return acc;
  }, {});

export const getBoundLevelsForSubject = (
  subjectId: number | null | undefined,
  bindings: SubjectLevelBindings,
  levels: Level[]
) => {
  if (!subjectId) return [];
  const levelIds = bindings[Number(subjectId)] ?? [];
  return levels.filter((level) => levelIds.includes(Number(level.id)));
};

export const getBoundLevelsForSubjects = (
  subjectIds: number[],
  bindings: SubjectLevelBindings,
  levels: Level[]
) => {
  const linkedIds = new Set(
    subjectIds.flatMap((subjectId) => bindings[Number(subjectId)] ?? [])
  );
  if (linkedIds.size === 0) return [];
  return levels.filter((level) => linkedIds.has(Number(level.id)));
};
