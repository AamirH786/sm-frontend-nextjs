// NOTE: This old Sidebar component (partial implementation for users section) is
// superseded by AppSidebar which covers all navigation. Kept for reference — do not delete.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { moduleSlugMap } from "@/lib/moduleSlugMap";
import usePermission from "@/hooks/usePermission";

const humanize = (routeKey: string) => {
  const parts = routeKey.split("/");
  const last = parts[parts.length - 1];
  return last.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { can } = usePermission();

  const segments = pathname.split("/").filter(Boolean);
  const base = segments[0] || "";
  const second = segments[1] || "";

  const exactPrefix = `${base}/${second}`;

  // --- USERS SPECIAL CASE ---
  if (exactPrefix === "roles-users/users") {
    const isDeleted = pathname.includes("deleted");

    return (
      <aside className={`w-[240px] border-r bg-white p-4 ${className}`}>
        <div className="text-sm font-semibold text-gray-700 mb-2">Sections</div>

        <nav className="flex flex-col gap-1">

          <Link
            href="/roles-users/users/all"
            className={`py-2 px-3 rounded-md text-sm ${
              !isDeleted
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            All
          </Link>

          <Link
            href="/roles-users/users/deleted"
            className={`py-2 px-3 text-red-600 rounded-md text-sm ${
              isDeleted
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            Deleted
          </Link>

        </nav>
      </aside>
    );
  }

  // --- DEFAULT SIDEBAR (unchanged) ---
  const filtered = Object.keys(moduleSlugMap)
    .filter((key) => key.startsWith(exactPrefix))
    .map((key) => ({
      href: "/" + key,
      name: humanize(key),
      slug: moduleSlugMap[key],
    }))
    .filter((item) => can(item.slug));

  if (!filtered.length) return null;

  return (
    <aside className={`w-[240px] border-r bg-white p-4 ${className}`}>
      <div className="text-sm font-semibold text-gray-700 mb-2">Sections</div>

      <nav className="flex flex-col gap-1">
        {filtered.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`py-2 px-3 rounded-md text-sm ${
                active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
