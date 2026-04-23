const PROMPT_PRE_STYLE = 'font-family: monospace; white-space: pre-wrap; line-height: 1.6;';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const decodeHTML = (value: string) => {
  if (!value) return '';

  if (typeof document === 'undefined') {
    return value
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

export const getPromptPlainText = (value: string) => {
  if (!value) return '';

  if (typeof window === 'undefined') {
    return decodeHTML(value.replace(/<[^>]*>/g, '')).replace(/\u00A0/g, ' ');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'text/html');
  return decodeHTML(doc.body.textContent || '').replace(/\u00A0/g, ' ');
};

export const toPromptEditorHtml = (value: string) => {
  const plainText = getPromptPlainText(value);
  if (!plainText.trim()) return '';
  return `<pre style="${PROMPT_PRE_STYLE}">${escapeHtml(plainText)}</pre>`;
};

export const normalizePromptForSave = (value: string) => toPromptEditorHtml(value);
