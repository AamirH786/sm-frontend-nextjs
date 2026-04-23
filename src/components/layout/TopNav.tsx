// NOTE: TopNav (horizontal sub-section tabs via moduleSlugMap) is superseded by AppSidebar.
// Kept here for reference — do not delete.
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { moduleSlugMap } from "@/lib/moduleSlugMap";
import { getModuleConfig } from "@/lib/moduleConfig";
import usePermission from "@/hooks/usePermission";
import { useEffect } from "react";

export default function TopTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const { can } = usePermission();

  const segments = pathname.split("/").filter(Boolean);
  const base = segments[0];
  const sub = segments[1] || null;

  const moduleConfig = getModuleConfig(base);

  const routeKeys = Object.keys(moduleSlugMap).filter(r =>
    r.startsWith(base + "/")
  );

  const tabs = routeKeys.map(routeKey => {
    const slug = moduleSlugMap[routeKey];
    const name = routeKey.split("/")[1]?.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return {
      routeKey,
      slug,
      name,
      href: "/" + routeKey
    };
  });

  const visibleTabs = tabs.filter(t => can(t.slug));

  // ============================
  // TEMPORARILY DISABLE AUTO REDIRECT
  // ============================
  useEffect(() => {
    // Do nothing (redirect disabled)
    return;
  }, []);

  if (visibleTabs.length === 0) return null;

  return (
    <div className="flex gap-6 border-b mb-5">
      {visibleTabs.map(t => {
        const active = pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`pb-2 px-1 text-[16px] ${
              active ? "text-black font-semibold border-b-2 border-black"
                      : "text-gray-500 hover:text-black"
            }`}
          >
            {t.name}
          </Link>
        );
      })}
    </div>
  );
}
