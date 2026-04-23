'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  CircleHelp,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  Lock,
  LogOut,
  SlidersHorizontal,
  Settings,
  ShoppingBag,
  Users,
  Wand2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const orgNavItems = [
  { href: '/organization', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/organization/avatars', label: 'My Avatars', icon: Wand2 },
  { href: '/organization/browse', label: 'Browse Avatars', icon: ShoppingBag },
  { href: '/organization/members', label: 'Members', icon: Users },
  { href: '/organization/batches', label: 'Batches', icon: Building2 },
  { href: '/organization/transactions', label: 'Transactions', icon: CreditCard },
];

export default function OrganizationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userContext, logout } = useAuth();

  const profileName = useMemo(() => {
    return user?.name || user?.username || user?.email || 'Organization User';
  }, [user]);

  const organizationName = userContext?.organization?.name || 'Organization Portal';
  const orgThemeColor = userContext?.organization?.theme_color || '#2563eb';
  const orgLogo = userContext?.organization?.logo_url || null;

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl text-white"
              style={{ backgroundColor: orgThemeColor }}
            >
              {orgLogo ? (
                <img src={orgLogo} alt={organizationName} className="h-full w-full object-cover" />
              ) : (
                <Building2 size={20} />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{organizationName}</p>
              <p className="truncate text-xs text-slate-500">
                {userContext?.context_type === 'contact_person' ? 'Org Admin' : 'Member Workspace'}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {orgNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-900">{organizationName}</p>
              <p className="text-sm text-slate-500">Organization dashboard</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-700">
                    {profileName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate text-sm font-semibold text-slate-900">{profileName}</p>
                    <p className="truncate text-xs text-slate-500">{userContext?.organization?.role || 'member'}</p>
                  </div>
                  <ChevronDown size={16} className="text-slate-400" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => router.push('/account')}>
                  <Users size={16} className="mr-2 text-slate-500" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push('/account?tab=security')}>
                  <Lock size={16} className="mr-2 text-slate-500" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push('/account?tab=preferences')}>
                  <SlidersHorizontal size={16} className="mr-2 text-slate-500" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push('/help')}>
                  <CircleHelp size={16} className="mr-2 text-slate-500" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push('/organization')}>
                  <Settings size={16} className="mr-2 text-slate-500" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={logout} className="text-red-600 focus:bg-red-50">
                  <LogOut size={16} className="mr-2 text-red-500" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {orgNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
