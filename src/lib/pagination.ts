function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function resolveTotalPages(
  totalPages: number | undefined | null,
  total: number,
  limit: number
): number {
  if (typeof totalPages === 'number' && Number.isFinite(totalPages) && totalPages > 0) {
    return totalPages;
  }

  if (limit <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(total / limit));
}

export function normalizePaginationMeta(
  value: unknown,
  defaults: { page?: number; limit?: number; total?: number } = {}
) {
  const record = toRecord(value);
  const page = toNumber(record?.page) ?? toNumber(record?.current_page) ?? defaults.page ?? 1;
  const limit = toNumber(record?.limit) ?? toNumber(record?.per_page) ?? defaults.limit ?? 10;
  const total = toNumber(record?.total) ?? toNumber(record?.total_count) ?? defaults.total ?? 0;
  const totalPages = resolveTotalPages(
    toNumber(record?.totalPages) ?? toNumber(record?.total_pages),
    total,
    limit
  );

  return { page, limit, total, totalPages };
}
