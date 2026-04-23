import type { ResponseLanguage } from '@/services/languagesService';

const normalize = (value?: string | null) => String(value || '').trim().toLowerCase();

export const findResponseLanguage = (
  languages: ResponseLanguage[],
  value?: string | null
) => {
  const normalized = normalize(value);
  if (!normalized) return null;

  return (
    languages.find((language) => normalize(language.code) === normalized) ||
    languages.find((language) => normalize(language.name) === normalized) ||
    languages.find((language) => normalize(language.native_name) === normalized) ||
    languages.find((language) => normalize(language.locale) === normalized) ||
    null
  );
};

export const getResponseLanguageLabel = (language?: ResponseLanguage | null) => {
  if (!language) return '';
  const native = String(language.native_name || '').trim();
  if (native && normalize(native) !== normalize(language.name)) {
    return `${language.name} (${native})`;
  }
  return language.name;
};

export const getPromptResponseLanguageName = (language?: ResponseLanguage | null) => {
  if (!language) return 'Hindi';
  return normalize(language.code) === 'hinglish' ? 'Hinglish' : language.name;
};

export const getPromptResponseLanguageInstruction = (language?: ResponseLanguage | null) => {
  if (!language) {
    return 'You must strictly respond ONLY in Hindi. Do not mix other languages.';
  }
  if (normalize(language.code) === 'hinglish') {
    return 'You must strictly respond ONLY in Hinglish (a natural mix of Hindi and English). Do not switch to fully English or fully Hindi.';
  }
  return `You must strictly respond ONLY in ${language.name}. Do not mix other languages.`;
};
