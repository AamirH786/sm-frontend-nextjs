'use client';

import Link from 'next/link';

type AccessDeniedProps = {
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
};

export default function AccessDenied({
  title = 'Access denied',
  description = 'You do not have permission to view this section.',
  backHref = '/dashboard',
  backLabel = 'Back to dashboard',
}: AccessDeniedProps) {
  return (
    <div className="flex min-h-[320px] items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-500">Restricted</p>
        <h1 className="mt-3 text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-3 text-sm text-gray-500">{description}</p>
        <Link
          href={backHref}
          className="mt-6 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
