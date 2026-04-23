"use client";

import { JSX, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { resolveTotalPages } from "@/lib/pagination";
import Button from "./Button";

interface Column {
  label: string;
  render: (row: any) => any;
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  fetchData: (params: {
    page: number;
    limit: number;
    search: string;
  }) => Promise<{
    data: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>;
  actions?: (row: any) => JSX.Element;
}

export default function DataTable({
  columns,
  fetchData,
  actions,
}: DataTableProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const response = await fetchData({ page, limit, search });
    setRows(response.data);
    setTotalPages(
      resolveTotalPages(response.pagination.totalPages, response.pagination.total, response.pagination.limit)
    );
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [page, search]);

  return (
    <div>
      {/* SEARCH BAR */}
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search..."
            className="w-full border rounded-lg pl-10 pr-3 py-2"
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <Search className="absolute left-2 top-2.5 text-gray-500" size={18} />
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`text-left py-3 px-4 text-sm font-semibold ${col.className}`}
                >
                  {col.label}
                </th>
              ))}
              {actions && (
                <th className="text-right py-3 px-4 text-sm font-semibold">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-6 text-center">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-6 text-center">
                  No records found
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  {columns.map((col, i) => (
                    <td key={i} className="py-3 px-4 text-sm">
                      {col.render(row)}
                    </td>
                  ))}
                  {actions && (
                    <td className="py-3 px-4 text-right">{actions(row)}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center mt-4">
        <p className="text-sm text-gray-500">
          Page {page} of {totalPages}
        </p>

        <div className="flex gap-2">
          <Button
            disabled={page === 1}
            variant="secondary"
            onClick={() => setPage(page - 1)}
          >
            Prev
          </Button>

          <Button
            disabled={page === totalPages}
            variant="secondary"
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
