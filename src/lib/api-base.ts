const DEFAULT_API_BASE_URL = 'http://localhost:8010';

function normalizeApiBaseUrl(value: string): string {
  return value
    .replace('http://127.0.0.1:', 'http://localhost:')
    .replace(/\/+$/, '')
    .replace(/\/api$/i, '');
}

export function getApiOrigin(): string {
  const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
  const normalizedApiBaseUrl = normalizeApiBaseUrl(rawApiBaseUrl);
  console.log('API URL:', normalizedApiBaseUrl);
  return normalizedApiBaseUrl;
}

export function getApiBaseUrl(): string {
  return `${getApiOrigin()}/api`;
}

export function getApiAssetUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiOrigin()}${normalizedPath}`;
}
