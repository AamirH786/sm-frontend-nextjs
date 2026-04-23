export const KNOWLEDGE_LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

export type KnowledgeLevel = (typeof KNOWLEDGE_LEVEL_OPTIONS)[number]['value'];

const KNOWLEDGE_LEVEL_SET = new Set<KnowledgeLevel>(
  KNOWLEDGE_LEVEL_OPTIONS.map((option) => option.value)
);

export const DEFAULT_KNOWLEDGE_LEVEL: KnowledgeLevel = 'beginner';

export function normalizeKnowledgeLevel(value?: string | null): KnowledgeLevel {
  if (!value) {
    return DEFAULT_KNOWLEDGE_LEVEL;
  }

  const normalized = value.trim().toLowerCase();
  if (KNOWLEDGE_LEVEL_SET.has(normalized as KnowledgeLevel)) {
    return normalized as KnowledgeLevel;
  }

  return DEFAULT_KNOWLEDGE_LEVEL;
}

export function getKnowledgeLevelLabel(level?: string | null): string {
  const normalized = normalizeKnowledgeLevel(level);
  return (
    KNOWLEDGE_LEVEL_OPTIONS.find((option) => option.value === normalized)?.label ??
    'Beginner'
  );
}

export function getKnowledgePromptGuidance(level?: string | null): string[] {
  const normalized = normalizeKnowledgeLevel(level);

  switch (normalized) {
    case 'intermediate':
      return [
        '- Explain clearly with moderate detail and practical examples',
        '- Assume the user understands basics, but avoid unnecessary jargon',
        '- Break down concepts into steps when the topic becomes complex',
      ];
    case 'advanced':
      return [
        '- Answer with expert-level depth, precision, and strong structure',
        '- Use domain terminology when it improves clarity',
        '- Include nuance, tradeoffs, edge cases, and implementation detail when relevant',
      ];
    case 'beginner':
    default:
      return [
        '- Use simple language and define terms before using them',
        '- Prefer short explanations, analogies, and basic examples',
        '- Avoid assuming prior knowledge unless the user clearly shows it',
      ];
  }
}

export function getKnowledgeScopeGuidance(level?: string | null): string[] {
  const normalized = normalizeKnowledgeLevel(level);

  switch (normalized) {
    case 'intermediate':
      return [
        '- Retrieve and use beginner + intermediate knowledge only',
        '- Build on fundamentals before giving intermediate detail',
        '- Do not use advanced-only explanations unless the user explicitly asks and the level is upgraded',
      ];
    case 'advanced':
      return [
        '- Retrieve and use beginner + intermediate + advanced knowledge',
        '- Start from the most relevant level, but include deeper layers when useful',
        '- You may include advanced nuance, tradeoffs, and expert-level depth',
      ];
    case 'beginner':
    default:
      return [
        '- Retrieve and use beginner knowledge only',
        '- Do not rely on intermediate or advanced-only concepts in the answer',
        '- Keep the explanation foundational, simple, and easy to follow',
      ];
  }
}
