"use client";

import { useEffect, useMemo, useState, ChangeEvent, useRef } from "react";
import { Search, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { resolveTotalPages } from "@/lib/pagination";
import Button from "./Button";

type Column<T = any> = {
  key?: string; // optional key for sorting
  label: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

type FetchParams = {
  page: number;
  limit: number;
  search: string;
  sortBy?: string | null;
  sortOrder?: "asc" | "desc" | null;
  externalSearch?: string;
};

type FetchResult<T = any> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  analytics?: {
    totalActive?: number;
    totalInactive?: number;
    addedToday?: number;
  };
};

interface AdvancedDataTableProps<T = any> {
  columns: Column<T>[];
  fetchData: (params: FetchParams) => Promise<FetchResult<T>>;
  actions?: (row: T) => React.ReactNode;
  initialPage?: number;
  initialLimit?: number;
  rowsPerPageOptions?: number[];
  showAnalytics?: boolean;
  className?: string;
  refreshTrigger?: number;  // ← ADD THIS
  // NEW props for bulk actions / selection
  selectable?: boolean;
  externalSearch?: string;
  onSearchChange?: (value: string) => void;
  rowKey?: string; // which field to use as row id (default 'id')
  onBulkDelete?: (ids: any[]) => Promise<void>; // optional handler for bulk delete
  showRowsPerPageControl?: boolean;
  showTopSummary?: boolean;
}

export default function AdvancedDataTable<T = any>({
  columns,
  fetchData,
  actions,
  initialPage = 1,
  initialLimit = 10,
  rowsPerPageOptions = [10, 25, 50, 100],
  showAnalytics = true,
  className,
  refreshTrigger = 0,  // ← ADD THIS
  // NEW defaults
  selectable = false,
  externalSearch = "",
  onSearchChange,
  rowKey = "id",
  onBulkDelete,
  showRowsPerPageControl = true,
  showTopSummary = true,
}: AdvancedDataTableProps<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  // const [search, setSearch] = useState("");
  const [search, setSearch] = useState(externalSearch ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [analytics, setAnalytics] = useState<any>(null);

  // NEW: selection state
  const [selectedIds, setSelectedIds] = useState<any[]>([]);

  const isInitialMount = useRef(true);
  const prevParams = useRef({ limit, debouncedSearch, sortBy, sortOrder });

  // Debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchData({
        page,
        limit,
        search: debouncedSearch,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
      });
      setRows(res.data || []);
      const nextTotal = res.pagination.total ?? 0;
      const nextLimit = res.pagination.limit ?? limit;
      setTotal(nextTotal);
      setTotalPages(resolveTotalPages(res.pagination.totalPages, nextTotal, nextLimit));
      if (res.analytics) setAnalytics(res.analytics);
    } catch (err) {
      // caller handles toasts/errors; still ensure UI stable
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Clear selected when rows/page/refresh change
  useEffect(() => {
    // whenever rows change (new page / refresh), clear selection of rows not present
    if (!selectable) return;
    const visibleIds = rows.map((r: any) => r?.[rowKey]);
    setSelectedIds((prev) => prev.filter((id) => visibleIds.includes(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, page, limit, refreshTrigger]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, debouncedSearch, sortBy, sortOrder, refreshTrigger]);  // ← ADD refreshTrigger

  useEffect(() => {
    if (externalSearch !== undefined) {
      setSearch(externalSearch);
    }
  }, [externalSearch]);

  const toggleSort = (colKey?: string) => {
    if (!colKey) return;

    // If clicking a new column → start with ASC
    if (sortBy !== colKey) {
      setSortBy(colKey);
      setSortOrder("asc");
      return;
    }

    // Same column cycle: asc → desc → asc → ...
    if (sortOrder === "asc") {
      setSortOrder("desc");
    } else {
      setSortOrder("asc");
    }
  };

  // NEW helpers for selection
  const visibleIds = useMemo(() => rows.map((r: any) => r?.[rowKey]), [rows, rowKey]);

  const allVisibleSelected = useMemo(() => {
    if (!selectable) return false;
    if (visibleIds.length === 0) return false;
    return visibleIds.every((id) => selectedIds.includes(id));
  }, [visibleIds, selectedIds, selectable]);

  const toggleSelectAll = () => {
    if (!selectable) return;
    if (allVisibleSelected) {
      // unselect visible
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      // add all visible
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectRow = (id: any) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete) return;
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected item(s)?`)) return;
    await onBulkDelete(selectedIds);
    // after deletion caller likely refreshes; still clear selection here
    setSelectedIds([]);
    // optionally reload (if parent doesn't)
    load();
  };

  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const pageInfo = `${from}–${to} of ${total}`;

  // compute extra column count for colspan
  const extraCols = selectable ? 1 : 0;

  return (
    <div className={className}>
      {/* Top: search + rows per page + analytics */}
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <input
              className="w-full bg-white border border-gray-200 rounded-lg py-1.5 pl-10 pr-10 shadow-sm 
                        placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
              placeholder="Search..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setSearch(e.target.value);
                onSearchChange?.(e.target.value);
              }}
            />

            {/* Search Icon — perfectly centered */}
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />

            {/* Clear Icon — perfectly centered */}
            {search.trim() !== "" && (
              <button
                onClick={() => {
                  setSearch("");
                  onSearchChange?.("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {showRowsPerPageControl ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Rows per page</span>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setLimit(newLimit);
                  setPage(1);
                }}
                className="border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none"
              >
                {rowsPerPageOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Bulk actions area (shows only when selectable && handler provided) */}
          {selectable && onBulkDelete && (
            <div className="ml-3">
              <Button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-700 text-white">
                Delete Selected ({selectedIds.length})
              </Button>
            </div>
          )}
        </div>

        {showAnalytics && showTopSummary && (
          <div className="mb-3 flex flex-wrap items-center justify-end gap-4">

            {/* Left - Showing */}
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 shadow-sm">
              <div className="text-xs text-gray-500">Showing &nbsp;</div>
              <div className="text-sm font-semibold text-gray-800">
                {pageInfo}
              </div>
            </div>

            {/* Right - Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-700">
              <div className="flex items-center gap-1">
                <span className="text-gray-500 text-xs">Total</span>
                <span className="font-semibold text-gray-800">{total}</span>
              </div>

              {/* <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-xs">Active</span>
                    <span className="font-semibold text-green-600">
                    {analytics?.totalActive ?? 0}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-xs">Inactive</span>
                    <span className="font-semibold text-red-600">
                    {analytics?.totalInactive ?? 0}
                    </span>
                </div> */}
            </div>

          </div>
        )}

      </div>

      {/* Table Card */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-hidden">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-white">
                {/* NEW: selection header */}
                {selectable && (
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                )}

                {columns.map((col, idx) => {
                  const isSortable = !!col.key;
                  const active = sortBy === col.key;
                  return (
                    <th
                      key={idx}
                      className={`px-3 py-3 text-left text-sm font-medium text-gray-700 ${col.className || ""}`}
                      style={{ cursor: isSortable ? "pointer" : "default" }}
                      onClick={() => isSortable && toggleSort(col.key)}
                    >
                      <div className="flex items-center gap-2 select-none">
                        <span>{col.label}</span>
                        {isSortable && (
                          <span className="text-gray-400">
                            {active ? (
                              sortOrder === "asc" ? (
                                <ChevronUp size={14} />
                              ) : sortOrder === "desc" ? (
                                <ChevronDown size={14} />
                              ) : (
                                <ChevronsUpDown size={14} />
                              )
                            ) : (
                              <ChevronsUpDown size={14} />
                            )}
                          </span>
                        )}

                      </div>
                    </th>
                  );
                })}

                {actions && (
                  <th className="sticky right-0 z-10 w-[7.25rem] bg-white px-3 py-3 text-right text-sm font-medium text-gray-700">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0) + extraCols} className="py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0) + extraCols} className="py-8 text-center text-gray-500">
                    No records found
                  </td>
                </tr>
              ) : (
                rows.map((row: any, rIdx) => (
                  <tr key={rIdx} className="odd:bg-white even:bg-gray-50 hover:bg-gray-50">
                    {/** NEW: selection cell */}
                    {selectable && (
                      <td className="py-3 px-4 text-sm text-gray-800 align-top">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row?.[rowKey])}
                          onChange={() => toggleSelectRow(row?.[rowKey])}
                        />
                      </td>
                    )}

                    {columns.map((col, cIdx) => (
                      <td key={cIdx} className="px-3 py-3 align-top text-sm text-gray-800 break-words">
                        {col.render ? col.render(row) : (col.key ? (row[col.key] ?? "-") : "-")}
                      </td>
                    ))}

                    {actions && (
                      <td className="sticky right-0 z-[1] w-[7.25rem] whitespace-nowrap bg-inherit px-3 py-3 text-right text-sm">
                        {actions(row)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: pagination */}
        <div className="flex items-center justify-between gap-4 p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <button
              className="p-2 rounded hover:bg-gray-100"
              onClick={() => setPage(1)}
              disabled={page === 1}
              aria-label="first"
            >
              <ChevronsLeft size={16} />
            </button>

            <button
              className="p-2 rounded hover:bg-gray-100"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="prev"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="text-sm text-gray-700">
              Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
            </div>

            <button
              className="p-2 rounded hover:bg-gray-100"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="next"
            >
              <ChevronRight size={16} />
            </button>

            <button
              className="p-2 rounded hover:bg-gray-100"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              aria-label="last"
            >
              <ChevronsRight size={16} />
            </button>
          </div>

          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{from}</span> to <span className="font-semibold">{to}</span> of <span className="font-semibold">{total}</span> records
          </div>
        </div>
      </div>
    </div>
  );
}
