// NOTE: This top header component is no longer used as the primary navigation.
// Navigation has been moved to AppSidebar (left panel).
// Kept here for reference — do not delete.
"use client";

import { getRoleDisplayName, getUserDisplayName } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { CircleHelp, LogOut, Settings, SlidersHorizontal, User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type HeaderProps = {
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
};

export default function Header({ menuOpen, onMenuOpenChange }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/65">
      <div className="flex h-[72px] items-center justify-end gap-4 px-6 md:px-10">
        <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 px-3 py-2 shadow-sm ring-1 ring-slate-200/60 transition hover:bg-white">
              <div className="text-right leading-tight">
                <div className="text-sm font-semibold text-slate-900">{getUserDisplayName(user)}</div>
                <div className="text-xs text-slate-500">{getRoleDisplayName(user)}</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <User size={18} />
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-lg">
            <DropdownMenuItem asChild>
              <Link href="/account" className="flex items-center gap-2 cursor-pointer">
                <Settings size={16} /> My Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/account" className="flex items-center gap-2 cursor-pointer">
                <SlidersHorizontal size={16} /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/help" className="flex items-center gap-2 cursor-pointer">
                <CircleHelp size={16} /> Help
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onMenuOpenChange?.(false);
                logout();
              }}
              className="flex items-center gap-2 text-red-600 cursor-pointer"
            >
              <LogOut size={16} /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
