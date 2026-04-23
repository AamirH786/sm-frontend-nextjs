import type {
  LearningCategory,
  Subject,
  Track,
  LearningCourse,
  Level,
} from '@/services/adminLearningService';

const normalizeCategoryName = (value: string) => value.trim().toLowerCase();
const normalizeName = (value?: string | null) => String(value || '').trim().toLowerCase();
const normalizeId = (value: unknown) => {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
};
const normalizeIdList = (values: unknown[] | null | undefined) =>
  Array.isArray(values)
    ? values
        .map((value) => normalizeId(value))
        .filter((value): value is number => value !== null)
    : [];

const getCategoryScore = (
  category: LearningCategory,
  subjects: Subject[],
  tracks: Track[],
  courses: LearningCourse[]
) => {
  const categorySubjects = subjects.filter((subject) => Number(subject.category_id) === Number(category.id));
  const subjectIds = new Set(categorySubjects.map((subject) => Number(subject.id)));
  const categoryTracks = tracks.filter((track) => subjectIds.has(Number(track.subject_id)));
  const categoryCourses = courses.filter(
    (course) =>
      Number(course.category_id) === Number(category.id) ||
      (course.subject_id != null && subjectIds.has(Number(course.subject_id)))
  );

  return categorySubjects.length * 100 + categoryTracks.length * 10 + categoryCourses.length * 5 + Number(category.id);
};

export const dedupeLearningCategories = (
  categories: LearningCategory[],
  subjects: Subject[],
  tracks: Track[],
  courses: LearningCourse[]
) => {
  const bestByName = new Map<string, LearningCategory>();

  categories.forEach((category) => {
    const key = normalizeCategoryName(category.name);
    const current = bestByName.get(key);

    if (!current) {
      bestByName.set(key, category);
      return;
    }

    if (getCategoryScore(category, subjects, tracks, courses) > getCategoryScore(current, subjects, tracks, courses)) {
      bestByName.set(key, category);
    }
  });

  return Array.from(bestByName.values()).sort((left, right) => left.name.localeCompare(right.name));
};

export const getCategoryFamily = (
  categories: LearningCategory[],
  selectedCategory?: LearningCategory | null
) => {
  if (!selectedCategory) return [];
  const key = normalizeCategoryName(selectedCategory.name);
  return categories.filter((category) => normalizeCategoryName(category.name) === key);
};

export const getScopedSubjectsForCategory = (
  categories: LearningCategory[],
  selectedCategory: LearningCategory | null | undefined,
  subjects: Subject[],
  tracks: Track[],
  courses: LearningCourse[]
) => {
  if (!selectedCategory) return [];

  const family = getCategoryFamily(categories, selectedCategory);
  const familyIds = new Set(family.map((category) => Number(category.id)));
  const scopedSubjects = subjects.filter((subject) => familyIds.has(Number(subject.category_id)));
  const bestByName = new Map<string, Subject>();

  scopedSubjects.forEach((subject) => {
    const key = normalizeName(subject.name);
    const current = bestByName.get(key);
    if (!current) {
      bestByName.set(key, subject);
      return;
    }

    const subjectTrackCount = tracks.filter((track) => Number(track.subject_id) === Number(subject.id)).length;
    const currentTrackCount = tracks.filter((track) => Number(track.subject_id) === Number(current.id)).length;
    const subjectCourseCount = courses.filter((course) => Number(course.subject_id) === Number(subject.id)).length;
    const currentCourseCount = courses.filter((course) => Number(course.subject_id) === Number(current.id)).length;
    const nextScore = subjectTrackCount * 10 + subjectCourseCount * 5 + Number(subject.id);
    const currentScore = currentTrackCount * 10 + currentCourseCount * 5 + Number(current.id);

    if (nextScore > currentScore) {
      bestByName.set(key, subject);
    }
  });

  return Array.from(bestByName.values()).sort((left, right) => left.name.localeCompare(right.name));
};

const getEquivalentSubjectIdsByName = (
  categories: LearningCategory[],
  selectedCategory: LearningCategory | null | undefined,
  subjects: Subject[],
  selectedSubjectIds: number[]
) => {
  if (!selectedCategory) return [];
  const normalizedSelectedSubjectIds = normalizeIdList(selectedSubjectIds);
  const family = getCategoryFamily(categories, selectedCategory);
  const familyIds = new Set(family.map((category) => Number(category.id)));
  const selectedNames = new Set(
    subjects
      .filter((subject) => normalizedSelectedSubjectIds.includes(Number(subject.id)))
      .map((subject) => normalizeName(subject.name))
      .filter(Boolean)
  );

  return subjects
    .filter((subject) => familyIds.has(Number(subject.category_id)))
    .filter((subject) => {
      if (normalizedSelectedSubjectIds.includes(Number(subject.id))) return true;
      return selectedNames.size > 0 && selectedNames.has(normalizeName(subject.name));
    })
    .map((subject) => Number(subject.id));
};

const getEquivalentTrackIdsByName = (
  tracks: Track[],
  selectedTrackId: number | null | undefined
) => {
  if (!selectedTrackId) return [];
  const selectedTrack = tracks.find((track) => Number(track.id) === Number(selectedTrackId));
  if (!selectedTrack) return [];
  const selectedName = normalizeName(selectedTrack.name);
  return tracks
    .filter((track) => normalizeName(track.name) === selectedName)
    .map((track) => Number(track.id));
};

export const getScopedTracksForCategory = (
  categories: LearningCategory[],
  selectedCategory: LearningCategory | null | undefined,
  subjects: Subject[],
  tracks: Track[],
  courses: LearningCourse[],
  selectedSubjectIds: number[]
) => {
  if (!selectedCategory) return [];
  const normalizedSelectedSubjectIds = normalizeIdList(selectedSubjectIds);
  const subjectIds =
    normalizedSelectedSubjectIds.length > 0
      ? getEquivalentSubjectIdsByName(categories, selectedCategory, subjects, normalizedSelectedSubjectIds)
      : getScopedSubjectsForCategory(categories, selectedCategory, subjects, tracks, courses).map((subject) =>
          Number(subject.id)
        );

  return tracks
    .filter((track) => subjectIds.includes(Number(track.subject_id)))
    .slice()
    .sort((left, right) => {
      const leftSubject = subjects.find((subject) => Number(subject.id) === Number(left.subject_id))?.name || '';
      const rightSubject = subjects.find((subject) => Number(subject.id) === Number(right.subject_id))?.name || '';
      if (leftSubject !== rightSubject) return leftSubject.localeCompare(rightSubject);
      return left.name.localeCompare(right.name);
    });
};

export const getScopedCoursesForCategory = (
  categories: LearningCategory[],
  selectedCategory: LearningCategory | null | undefined,
  subjects: Subject[],
  tracks: Track[],
  courses: LearningCourse[],
  selectedSubjectIds: number[],
  selectedTrackId: number | null | undefined,
  selectedLevelId: number | null | undefined
) => {
  if (!selectedCategory) return [];
  const normalizedSelectedSubjectIds = normalizeIdList(selectedSubjectIds);
  const normalizedSelectedTrackId = normalizeId(selectedTrackId);
  const normalizedSelectedLevelId = normalizeId(selectedLevelId);

  const family = getCategoryFamily(categories, selectedCategory);
  const familyCategoryIds = new Set(family.map((category) => Number(category.id)));
  const subjectIds =
    normalizedSelectedSubjectIds.length > 0
      ? getEquivalentSubjectIdsByName(categories, selectedCategory, subjects, normalizedSelectedSubjectIds)
      : getScopedSubjectsForCategory(categories, selectedCategory, subjects, tracks, courses).map((subject) =>
          Number(subject.id)
        );
  const trackIds = normalizedSelectedTrackId ? getEquivalentTrackIdsByName(tracks, normalizedSelectedTrackId) : [];

  return courses.filter((course) => {
    const matchesCategory =
      familyCategoryIds.has(Number(course.category_id)) ||
      (course.subject_id != null && subjectIds.includes(Number(course.subject_id)));
    if (!matchesCategory) return false;

    const matchesSubject =
      normalizedSelectedSubjectIds.length === 0 ||
      (course.subject_id != null && subjectIds.includes(Number(course.subject_id)));
    if (!matchesSubject) return false;

    const matchesTrack =
      !normalizedSelectedTrackId ||
      (course.track_id != null && trackIds.includes(Number(course.track_id)));
    if (!matchesTrack) return false;

    const matchesLevel = !normalizedSelectedLevelId || Number(course.level_id) === Number(normalizedSelectedLevelId);
    return matchesLevel;
  });
};

export const getScopedLevelsForCategory = (
  categories: LearningCategory[],
  selectedCategory: LearningCategory | null | undefined,
  subjects: Subject[],
  tracks: Track[],
  courses: LearningCourse[],
  levels: Level[],
  selectedSubjectIds: number[],
  selectedTrackId: number | null | undefined
) => {
  const scopedCourses = getScopedCoursesForCategory(
    categories,
    selectedCategory,
    subjects,
    tracks,
    courses,
    selectedSubjectIds,
    selectedTrackId,
    null
  );

  const levelIds = new Set(
    scopedCourses
      .map((course) => normalizeId(course.level_id))
      .filter((value): value is number => value !== null)
  );

  if (levelIds.size === 0) {
    return levels;
  }

  return levels.filter((level) => levelIds.has(Number(level.id)));
};

export const buildCategorySubjectGroups = (
  categories: LearningCategory[],
  subjects: Subject[]
) =>
  categories
    .map((category) => ({
      category,
      subjects: subjects
        .filter((subject) => Number(subject.category_id) === Number(category.id))
        .sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => left.category.name.localeCompare(right.category.name));
