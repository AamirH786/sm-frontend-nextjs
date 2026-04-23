import { NextRequest, NextResponse } from 'next/server';

const STRIP_HEADERS = new Set([
  'host',
  'connection',
  'expect',
  'transfer-encoding',
  'x-forwarded-proto',
  'x-forwarded-host',
  'x-forwarded-for',
  'x-real-ip',
  'forwarded',
]);

function normalizeBackendBaseUrl(value: string): string {
  return value
    .replace(/^http:\/\/localhost(?=[:/]|$)/i, 'http://127.0.0.1')
    .replace(/^https:\/\/localhost(?=[:/]|$)/i, 'https://127.0.0.1')
    .replace(/\/+$/, '')
    .replace(/\/api$/i, '');
}

function getBackendBaseUrl(): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || 'http://localhost:8010';
  return `${normalizeBackendBaseUrl(configuredBaseUrl)}/api`;
}

function buildResponse(status: number, body: ArrayBuffer, headers: Headers): NextResponse {
  const noBodyStatuses = new Set([204, 205, 304]);
  if (noBodyStatuses.has(status)) {
    return new NextResponse(null, { status, headers });
  }

  return new NextResponse(body, { status, headers });
}

export async function proxyBackendRequest(request: NextRequest, pathSegments: string[]) {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (!STRIP_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  let body: ArrayBuffer | null = null;
  if (!['GET', 'HEAD'].includes(request.method)) {
    body = await request.arrayBuffer();
  }

  const relativePath = pathSegments.filter(Boolean).join('/');
  const targetUrl = new URL(`${getBackendBaseUrl().replace(/\/+$/, '')}/${relativePath}`);
  targetUrl.search = request.nextUrl.search;

  try {
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    const responseBody = await response.arrayBuffer();
    return buildResponse(response.status, responseBody, responseHeaders);
  } catch (error: any) {
    console.error('Backend proxy request failed', {
      targetUrl: targetUrl.toString(),
      method: request.method,
      error,
    });

    return NextResponse.json(
      {
        error: 'backend_unreachable',
        message: 'Unable to reach the backend service. Please verify the API server is running.',
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 502 }
    );
  }
}
