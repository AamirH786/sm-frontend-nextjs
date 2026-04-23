// NOTE: TopTabs (tab bar via moduleSlugMap) is superseded by AppSidebar.
// Kept here for reference — do not delete.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { moduleSlugMap } from "@/lib/moduleSlugMap";
import usePermission from "@/hooks/usePermission";
import { useMemo } from "react";

const ACRONYMS: Record<string, string> = {
  pp: "PP",
  bopp: "BOPP",
  nw: "NW",
};

const humanize = (routeKey: string) => {
  const parts = routeKey.split("/");
  const last = parts[parts.length - 1] || parts[parts.length - 2] || routeKey;

  return last
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYMS[lower]) return ACRONYMS[lower];
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};

export default function TopTabs() {
  const pathname = usePathname();
  const { can } = usePermission();

  const segments = pathname.split("/").filter(Boolean);
  const base = segments[0] || ""; // e.g., 'job-details'

  const tabs = useMemo(() => {
    if (!base) return [];

    const routeKeys = Object.keys(moduleSlugMap).filter((k) =>
      k.startsWith(base + "/")
    );

    const groupMap = new Map<string, string[]>();

    for (const key of routeKeys) {
      const parts = key.split("/");
      const groupKey = `${parts[0]}/${parts[1]}`;
      const slug = moduleSlugMap[key];

      if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
      groupMap.get(groupKey)!.push(slug);
    }

    let tabList = Array.from(groupMap.entries())
      .map(([gKey, slugs]) => ({
          name: gKey === "roles-users/users" ? "Employees" : humanize(gKey.split("/")[1]),
        href: "/" + gKey,
        slugs,
      }))
      .filter((t) => t.slugs.some((s) => can(s)));

    // ⭐ Force Users tab to /all
    tabList = tabList.map((t) =>
      t.href === "/roles-users/users"
        ? { ...t, href: "/roles-users/users/all" }
        : t
    );

    return tabList;
  }, [base, can]);

  if (!tabs.length) return null;

  return (
    <div className="flex items-center gap-8">
      {tabs.map((tab) => {
        
        // 🚀 NEW/FIXED ACTIVE LOGIC: 
        // 1. Check if the current module is one that uses exact path matching (like job-details/all, job-details/pending)
        const isExactMatchModule = tab.href.startsWith('/job-details'); 
        
        let active = false;

        if (isExactMatchModule) {
            // For Job Details, only an exact path match should activate the tab.
            active = pathname === tab.href;
            
            // If we are on the base page (/job-details), activate the /all tab as a fallback.
            if (pathname === `/${base}` && tab.href === `/${base}/all`) {
                active = true;
            }
        } else {
            // Keep the original startsWith logic for other modules (like roles-users/users/all)
            // which rely on it to activate the tab for all sub-pages.
            active = pathname.startsWith(tab.href) || pathname.startsWith(tab.href.replace("/all", ""));
        }
        
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`text-[16px] pb-2 border-b-2 ${
              active
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-black"
            }`}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
