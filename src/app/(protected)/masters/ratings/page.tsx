"use client";

import { useEffect, useState } from "react";
import { Star, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import api from "@/lib/api";

interface RatingItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string | null;
  avatar_id: number;
  avatar_name: string;
  rating: string | null;
  stars: number | null;
  review: string | null;
  created_at: string | null;
}

interface RatingsResponse {
  total: number;
  items: RatingItem[];
}

const StarDisplay = ({ count }: { count: number | null }) => {
  if (!count) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= count ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
        />
      ))}
      <span className="ml-1 text-xs text-gray-600">{count}/5</span>
    </span>
  );
};

export default function RatingsPage() {
  const [data, setData] = useState<RatingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterAvatar, setFilterAvatar] = useState("");
  const [filterStars, setFilterStars] = useState("");

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStars) params.stars = filterStars;
      const query = new URLSearchParams(params).toString();
      const res = await api.get<RatingsResponse>(`/ratings/admin/all${query ? `?${query}` : ""}`);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRatings();
  }, []);

  const filteredItems = (data?.items ?? []).filter((item) => {
    if (filterAvatar) {
      return item.avatar_name.toLowerCase().includes(filterAvatar.toLowerCase());
    }
    return true;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Ratings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data ? `${data.total} total rating${data.total !== 1 ? "s" : ""}` : "Loading..."}
          </p>
        </div>
        <button
          onClick={fetchRatings}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filter by mentor name..."
          value={filterAvatar}
          onChange={(e) => setFilterAvatar(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 w-56"
        />
        <select
          value={filterStars}
          onChange={(e) => setFilterStars(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          <option value="">All star ratings</option>
          {[5, 4, 3, 2, 1].map((s) => (
            <option key={s} value={s}>{s} star{s !== 1 ? "s" : ""}</option>
          ))}
        </select>
        <button
          onClick={fetchRatings}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition"
        >
          Apply
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : filteredItems.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm">No ratings found.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Mentor</th>
                <th className="px-4 py-3">Quick Rating</th>
                <th className="px-4 py-3">Stars</th>
                <th className="px-4 py-3">Review</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{item.user_name}</p>
                    {item.user_email && (
                      <p className="text-xs text-gray-400">{item.user_email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{item.avatar_name}</p>
                    <p className="text-xs text-gray-400">ID: {item.avatar_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    {item.rating === "like" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                        <ThumbsUp className="h-3 w-3" /> Like
                      </span>
                    ) : item.rating === "dislike" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                        <ThumbsDown className="h-3 w-3" /> Dislike
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StarDisplay count={item.stars} />
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    {item.review ? (
                      <p className="text-xs text-gray-600 line-clamp-2">{item.review}</p>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
