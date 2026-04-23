"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import usePermission from "@/hooks/usePermission";
import Tooltip from "@/components/ui/Tooltip";
import {
  canAccessRule,
  characterSections,
  getDefaultProtectedRoute,
  onboardingSections,
  type AccessSection,
} from "@/lib/appAccess";
import {
  rolesUsersSections,
  canAccessRolesUsersSection,
} from "@/lib/rolesUsersAccess";
import { getRoleDisplayName, getUserDisplayName } from "@/lib/auth";
import {
  Activity,
  BookOpen,
  Bot,
  Clapperboard,
  BrainCircuit,
  Building2,
  Calendar,
  CreditCard,
  Receipt,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Globe,
  GraduationCap,
  Heart,
  Key,
  Layers,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MonitorPlay,
  Music,
  ScrollText,
  ShieldCheck,
  Sliders,
  Sparkles,
  Star,
  Truck,
  User,
  UserCog,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AccessRule = AccessSection["access"];

type NavLeaf = {
  kind: "leaf";
  label: string;
  href: string;
  icon?: LucideIcon;
  access?: AccessRule;
};

type NavGroup = {
  kind: "group";
  label: string;
  icon?: LucideIcon;
  access?: AccessRule;
  children: NavNode[];
};

type NavNode = NavLeaf | NavGroup;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNodeActive(node: NavNode, pathname: string): boolean {
  if (node.kind === "leaf") {
    return pathname === node.href || pathname.startsWith(node.href + "/");
  }
  return node.children.some((child) => isNodeActive(child, pathname));
}

function isSectionActive(nodes: NavNode[], pathname: string): boolean {
  return nodes.some((node) => isNodeActive(node, pathname));
}

// ─── Nav Item Renderer ────────────────────────────────────────────────────────

function NavItem({
  node,
  pathname,
  depth,
  collapsed,
  onRequestExpand,
}: {
  node: NavNode;
  pathname: string;
  depth: number;
  collapsed: boolean;
  onRequestExpand: () => void;
}) {
  const isLeafActive = node.kind === "leaf" && isNodeActive(node, pathname);
  const isGroupActive = node.kind === "group" && isNodeActive(node, pathname);
  const [open, setOpen] = useState(isGroupActive);

  useEffect(() => {
    if (isGroupActive) setOpen(true);
  }, [isGroupActive]);

  const indent = collapsed ? "" : depth === 0 ? "" : depth === 1 ? "pl-3" : "pl-6";

  if (node.kind === "leaf") {
    const Icon = node.icon;
    const content = (
      <Link
        href={node.href}
        className={`group relative flex items-center rounded-xl px-3 py-[9px] text-sm transition-all duration-200 ${
          collapsed ? "justify-center" : `gap-2.5 ${indent}`
        } ${
          isLeafActive
            ? "bg-blue-50 font-medium text-blue-700 shadow-sm shadow-blue-100/60"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        {Icon ? (
          <Icon size={16} className={`shrink-0 ${isLeafActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} />
        ) : (
          <span className={`mx-[3px] h-1.5 w-1.5 shrink-0 rounded-full ${isLeafActive ? "bg-blue-500" : "bg-slate-300"}`} />
        )}
        {!collapsed ? (
          <span
            className={`relative truncate after:absolute after:bottom-[-2px] after:left-0 after:h-px after:w-full after:origin-left after:bg-current after:transition-transform after:duration-300 ${
              isLeafActive ? "after:scale-x-100" : "after:scale-x-0 group-hover:after:scale-x-100"
            }`}
          >
            {node.label}
          </span>
        ) : null}
      </Link>
    );

    return (
      <li>
        {collapsed ? <Tooltip text={node.label} position="right">{content}</Tooltip> : content}
      </li>
    );
  }

  const Icon = node.icon;
  const trigger = (
    <button
      onClick={() => {
        if (collapsed) {
          onRequestExpand();
          return;
        }
        setOpen((v) => !v);
      }}
      className={`group flex w-full items-center rounded-xl px-3 py-[9px] text-sm transition-all duration-200 ${
        collapsed ? "justify-center" : `gap-2.5 ${indent}`
      } ${
        isGroupActive
          ? "bg-blue-50 font-medium text-blue-700 shadow-sm shadow-blue-100/60"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {Icon ? (
        <Icon size={16} className={`shrink-0 ${isGroupActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} />
      ) : null}
      {!collapsed ? (
        <>
          <span
            className={`relative flex-1 truncate text-left after:absolute after:bottom-[-2px] after:left-0 after:h-px after:w-full after:origin-left after:bg-current after:transition-transform after:duration-300 ${
              isGroupActive ? "after:scale-x-100" : "after:scale-x-0 group-hover:after:scale-x-100"
            }`}
          >
            {node.label}
          </span>
          {open ? (
            <ChevronDown size={13} className="shrink-0 text-slate-400" />
          ) : (
            <ChevronRight size={13} className="shrink-0 text-slate-400" />
          )}
        </>
      ) : null}
    </button>
  );

  return (
    <li>
      {collapsed ? <Tooltip text={node.label} position="right">{trigger}</Tooltip> : trigger}

      {!collapsed && open && node.children.length > 0 && (
        <ul className="mt-0.5 space-y-0.5 border-l border-slate-100 ml-5">
          {node.children.map((child, i) => (
            <NavItem
              key={i}
              node={child}
              pathname={pathname}
              depth={depth + 1}
              collapsed={collapsed}
              onRequestExpand={onRequestExpand}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Sidebar Section Label ────────────────────────────────────────────────────

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <li>
      <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
    </li>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

type AppSidebarProps = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onProfileTrigger?: () => void;
};

export default function AppSidebar({
  collapsed = false,
  onToggleCollapsed,
  onProfileTrigger,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { can } = usePermission();
  const homeHref = getDefaultProtectedRoute(user);

  // Character children
  const characterChildren: NavNode[] = characterSections
    .filter((s) => canAccessRule(s.access, user, can))
    .map((s) => ({
      kind: "leaf",
      label: s.name,
      href: s.href,
      icon: CHARACTER_ICONS[s.href],
    }));

  // Onboarding children
  const onboardingChildren: NavNode[] = onboardingSections
    .filter((s) => canAccessRule(s.access, user, can))
    .map((s) => ({
      kind: "leaf",
      label: s.name,
      href: s.href,
      icon: ONBOARDING_ICONS[s.href],
    }));

  // Roles-Users children (excluding ip-restrictions and logs → moved to Security)
  const employeeChildren: NavNode[] = rolesUsersSections
    .filter((s) => !["ip-restrictions", "logs"].includes(s.key))
    .filter((s) => canAccessRolesUsersSection(s, user, can))
    .map((s) => ({
      kind: "leaf",
      label: s.name,
      href: s.href === "/roles-users/users" ? "/roles-users/users/all" : s.href,
      icon: ROLES_ICONS[s.key],
    }));

  // Security children (ai-settings from masters + ip-restrictions + logs from roles-users)
  const securityIpLogs: NavNode[] = rolesUsersSections
    .filter((s) => ["ip-restrictions", "logs"].includes(s.key))
    .filter((s) => canAccessRolesUsersSection(s, user, can))
    .map((s) => ({
      kind: "leaf",
      label: s.name,
      href: s.href,
      icon: ROLES_ICONS[s.key],
    }));

  const canAiSettings = canAccessRule({ module: "ai_settings", action: "read" }, user, can);
  const securityChildren: NavNode[] = [
    ...(canAiSettings
      ? [{ kind: "leaf" as const, label: "AI Settings", href: "/masters/ai-settings", icon: BrainCircuit }]
      : []),
    ...securityIpLogs,
  ];

  // ── Manage Avatars group ─────────────────────────────────────
  const manageAvatarsChildren: NavNode[] = [
    // ...(characterChildren.length > 0
    //   ? [{ kind: "group" as const, label: "Character", icon: Bot, children: characterChildren }]
    //   : []),
    ...(canAccessRule({ module: "avatar", action: "view" }, user, can)
      ? [{ kind: "leaf" as const, label: "Avatars", href: "/masters/avatars", icon: MonitorPlay }]
      : []),
    ...(canAccessRule({ module: "persona", action: "view" }, user, can)
      ? [{ kind: "leaf" as const, label: "Personas", href: "/masters/character/personas", icon: User }]
      : []),
    ...(canAccessRule({ module: "learning_admin", action: "view" }, user, can)
      ? [{ kind: "leaf" as const, label: "Knowledge Program", href: "/masters/courses", icon: BookOpen }]
      : []),
    // ...(canAccessRule({ module: "learning_admin", action: "view" }, user, can)
    //   ? [{ kind: "leaf" as const, label: "Learning Admin", href: "/masters/learning-admin", icon: GraduationCap }]
    //   : []),
    // ...(canAccessRule({ module: "avatar", action: "read" }, user, can)
    //   ? [{ kind: "leaf" as const, label: "HeyGen Avatars", href: "/masters/heygen-avatars", icon: Bot }]
    //   : []),
    ...(canAccessRule({ module: "person_master", action: "view" }, user, can)
      ? [{ kind: "leaf" as const, label: "Person Master", href: "/masters/persons", icon: User }]
      : []),
    ...(canAccessRule({ module: "learning_admin", action: "view" }, user, can)
      ? [
          { kind: "leaf" as const, label: "Categories", href: "/masters/learning-categories", icon: Sparkles },
          { kind: "leaf" as const, label: "Sub Categories", href: "/masters/learning-subjects", icon: BookOpen },
        ]
      : []),
    ...(canAccessRule({ module: "avatar", action: "view" }, user, can)
      ? [{ kind: "leaf" as const, label: "Ratings & Reviews", href: "/masters/ratings", icon: Star }]
      : []),
  ];

  // ── Site Masters group ───────────────────────────────────────
  const siteMastersChildren: NavNode[] = [
    ...(canAccessRule({ module: "website_settings", action: "update" }, user, can)
      ? [{ kind: "leaf" as const, label: "Website Settings", href: "/masters/website-settings", icon: Globe }]
      : []),
    ...(canAccessRule({ module: "website_settings", action: "update" }, user, can)
      ? [{ kind: "leaf" as const, label: "Landing Page", href: "/masters/landing-page", icon: LayoutDashboard }]
      : []),
    ...(canAccessRule({ module: "content_page", action: "view" }, user, can)
      ? [{ kind: "leaf" as const, label: "Content Pages", href: "/masters/content-pages", icon: FileText }]
      : []),
    ...(canAccessRule({ module: "website_settings", action: "update" }, user, can)
      ? [{ kind: "leaf" as const, label: "Feed Reels", href: "/masters/feed", icon: Clapperboard }]
      : []),
    ...(canAccessRule({ module: "onboarding_masters", action: "view" }, user, can)
      ? [{ kind: "leaf" as const, label: "Profile Setup", href: "/masters/profile-builder", icon: Sliders }]
      : []),
    ...(canAccessRule({ module: "website_settings", action: "update" }, user, can)
      ? [{ kind: "leaf" as const, label: "Billing Settings", href: "/masters/billing-settings", icon: Receipt }]
      : []),
  ];

  // ── Clients group ────────────────────────────────────────────
  const clientsChildren: NavNode[] = [
    ...(canAccessRule({ module: "users", action: "view" }, user, can)
      ? [{ kind: "leaf" as const, label: "Clients", href: "/clients", icon: Users }]
      : []),
    ...(canAccessRule({ module: "trial", action: "view" }, user, can)
      ? [{ kind: "leaf" as const, label: "Trial Requests", href: "/trial-requests", icon: ScrollText }]
      : []),
    ...(onboardingChildren.length > 0
      ? [{ kind: "group" as const, label: "Onboarding", icon: Wand2, children: onboardingChildren }]
      : []),
  ];

  const organizationsChildren: NavNode[] = [
    ...(canAccessRule({ module: "organizations", action: "read" }, user, can)
      ? [{ kind: "leaf" as const, label: "Organizations List", href: "/organizations", icon: Building2 }]
      : []),
    ...(canAccessRule({ module: "organizations", action: "read" }, user, can)
      ? [
          { kind: "leaf" as const, label: "Batches", href: "/organizations/batches", icon: Calendar },
          { kind: "leaf" as const, label: "Assigned Avatars", href: "/organizations/entitlements", icon: MonitorPlay },
          { kind: "leaf" as const, label: "Organization Transactions", href: "/organizations/purchases", icon: CreditCard },
        ]
      : []),
  ];

  // ── Employees group ──────────────────────────────────────────
  const attendanceAccess = canAccessRule(
    { anyOf: [{ module: "attendance", action: "view" }, { module: "attendance", action: "create" }, { module: "attendance", action: "update" }] },
    user,
    can
  );
  const fullEmployeeChildren: NavNode[] = [
    ...(attendanceAccess ? [{ kind: "leaf" as const, label: "Attendance", href: "/attendance", icon: Calendar }] : []),
    ...(canAccessRule({ module: "department", action: "view" }, user, can)
      ? [{ kind: "leaf" as const, label: "Departments", href: "/masters/departments", icon: Building2 }]
      : []),
    ...(canAccessRule({ module: "designation", action: "view" }, user, can)
      ? [{ kind: "leaf" as const, label: "Designations", href: "/masters/designations", icon: Layers }]
      : []),
    ...employeeChildren,
  ];

  // ─── Build full nav ──────────────────────────────────────────

  type AccordionSection = {
    key: string;
    label: string;
    icon: LucideIcon;
    nodes: NavNode[];
  };

  const financeNodes: NavNode[] = [
    ...(canAccessRule({ module: "website_settings", action: "update" }, user, can)
      ? [{ kind: "leaf" as const, label: "Transactions", href: "/transactions", icon: CreditCard }]
      : []),
  ];

  const workNodes: NavNode[] = [
    ...(canAccessRule({ module: "tasks", action: "view" }, user, can)
      ? [{ kind: "leaf" as const, label: "Tasks", href: "/tasks", icon: ClipboardList }]
      : []),
    ...(canAccessRule({ module: "task_status", action: "view" }, user, can)
      ? [{ kind: "leaf" as const, label: "Task Statuses", href: "/masters/task-statuses", icon: Activity }]
      : []),
  ];

  const accordionSections: AccordionSection[] = [
    ...(organizationsChildren.length > 0
      ? [{ key: "organizations", label: "Organizations", icon: Building2, nodes: organizationsChildren }]
      : []),
    ...(manageAvatarsChildren.length > 0
      ? [{ key: "manage_avatars", label: "Manage Avatars", icon: Bot, nodes: manageAvatarsChildren }]
      : []),
    ...(siteMastersChildren.length > 0
      ? [{ key: "site_masters", label: "Site Masters", icon: Globe, nodes: siteMastersChildren }]
      : []),
    ...(clientsChildren.length > 0
      ? [{ key: "clients", label: "Clients", icon: Users, nodes: clientsChildren }]
      : []),
    ...(financeNodes.length > 0
      ? [{ key: "finance", label: "Finance", icon: CreditCard, nodes: financeNodes }]
      : []),
    ...(workNodes.length > 0
      ? [{ key: "work", label: "Work", icon: ClipboardList, nodes: workNodes }]
      : []),
    ...(fullEmployeeChildren.length > 0
      ? [{ key: "employees", label: "Employees", icon: UserCog, nodes: fullEmployeeChildren }]
      : []),
    ...(securityChildren.length > 0
      ? [{ key: "security", label: "Security", icon: ShieldCheck, nodes: securityChildren }]
      : []),
  ];

  const [activeSection, setActiveSection] = useState<string | null>(null);

useEffect(() => {
  const matchedSection = accordionSections.find((section) =>
    isSectionActive(section.nodes, pathname)
  );

  if (matchedSection) {
    setActiveSection(matchedSection.key);
  } else {
    setActiveSection(null); // ✅ default sab collapse
  }
}, [pathname]);

  const profileCard = (
    <div
      className={`flex w-full items-center rounded-2xl bg-slate-50 transition hover:bg-slate-100 ${
        collapsed ? "justify-center px-0 py-3" : "gap-2 px-3 py-2.5"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
        <User size={15} />
      </div>
      {!collapsed ? (
        <>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-semibold text-slate-800">{getUserDisplayName(user)}</p>
            <p className="truncate text-[11px] text-slate-400">{getRoleDisplayName(user)}</p>
          </div>
          {onProfileTrigger ? <ChevronDown size={14} className="text-slate-400" /> : null}
        </>
      ) : null}
    </div>
  );

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-300 ${
        collapsed ? "w-[88px]" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className={`flex h-[60px] items-center gap-3 border-b border-slate-100 px-4 ${collapsed ? "justify-center px-3" : ""}`}>
        <Link
          href={homeHref}
          className={`flex min-w-0 items-center gap-3 rounded-xl transition hover:bg-slate-50/70 ${collapsed ? "justify-center p-1.5" : "flex-1 p-1.5"}`}
          aria-label="Go to SummonMind home"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-blue-50 ring-1 ring-sky-100">
            <span className="text-base font-bold text-blue-600">SM</span>
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">SummonMind</p>
            </div>
          ) : null}
        </Link>
        <Tooltip text={collapsed ? "Expand sidebar" : "Collapse sidebar"} position="right">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu size={18} />
          </button>
        </Tooltip>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-2">
          {accordionSections.map((section) => {
            const Icon = section.icon;
            const isOpen = activeSection === section.key;
            const isActive = isSectionActive(section.nodes, pathname);
            const header = (
              <button
                type="button"
                onClick={() => {
                  if (collapsed) {
                    setActiveSection(section.key);
                    onToggleCollapsed?.();
                    return;
                  }

                  setActiveSection((current) => current === section.key ? null : section.key);
                }}
                className={`group flex w-full items-center rounded-xl px-3 py-[10px] text-sm transition-all duration-200 ${
                  collapsed ? "justify-center" : "gap-2.5"
                } ${
                  isActive || isOpen
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  size={16}
                  className={`shrink-0 ${
                    isActive || isOpen ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                {!collapsed ? (
                  <>
                    <span className="flex-1 truncate text-left text-[11px] font-semibold uppercase tracking-[0.12em]">
                      {section.label}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 text-slate-400 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </>
                ) : null}
              </button>
            );

            return (
              <div key={section.key}>
                {collapsed ? <Tooltip text={section.label} position="right">{header}</Tooltip> : header}

                {!collapsed ? (
                  <div
                    className={`grid overflow-hidden transition-all duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-70"
                    }`}
                  >
                    <div className="min-h-0">
                      <ul className="mt-1 space-y-0.5 border-l border-slate-100 pl-2">
                        {section.nodes.map((node, index) => (
                          <NavItem
                            key={`${section.key}-${index}`}
                            node={node}
                            pathname={pathname}
                            depth={0}
                            collapsed={collapsed}
                            onRequestExpand={onToggleCollapsed ?? (() => undefined)}
                          />
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-slate-100 px-3 py-3">
        <Tooltip text={`${getUserDisplayName(user)} · Open profile menu`} position="right">
          {onProfileTrigger ? (
            <button type="button" onClick={onProfileTrigger}>
              {profileCard}
            </button>
          ) : (
            <Link href="/account" aria-label="Open account">
              {profileCard}
            </Link>
          )}
        </Tooltip>
      </div>
    </aside>
  );
}

// ─── Icon Maps ────────────────────────────────────────────────────────────────

const CHARACTER_ICONS: Record<string, LucideIcon> = {
  "/masters/character/emotions": Heart,
  "/masters/character/tones": Music,
  "/masters/character/communication-styles": MessageCircle,
  "/masters/character/modes": Sliders,
  "/masters/character/domains": Globe,
  "/masters/character/delivery": Truck,
  "/masters/character/personas": User,
  "/masters/character/system-safety": ShieldCheck,
};

const ONBOARDING_ICONS: Record<string, LucideIcon> = {
  "/masters/profile-builder": Sliders,
  "/masters/onboarding/interests": Heart,
  "/masters/onboarding/support-types": Users,
  "/masters/onboarding/interaction-styles": MessageCircle,
};

const ROLES_ICONS: Record<string, LucideIcon> = {
  actions: Activity,
  modules: Layers,
  permissions: Key,
  roles: ShieldCheck,
  users: Users,
  "ip-restrictions": Globe,
  logs: ScrollText,
};
