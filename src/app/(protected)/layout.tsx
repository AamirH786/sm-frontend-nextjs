'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import usePermission from '@/hooks/usePermission';
import AccessDenied from '@/components/permissions/AccessDenied';
import AppSidebar from '@/components/layout/AppSidebar';
import OrganizationShell from '@/components/layout/OrganizationShell';
import { getDefaultProtectedRoute, getProtectedRouteAccess, canAccessRule } from '@/lib/appAccess';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAuthenticated, user, userContext } = useAuth();
  const { can } = usePermission();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const routeAccess = getProtectedRouteAccess(pathname);
  const hasRouteAccess = canAccessRule(routeAccess?.access, user, can);
  const isOrganizationContext =
    userContext?.context_type === 'contact_person' ||
    userContext?.context_type === 'organization_member';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsSidebarCollapsed(window.localStorage.getItem('sm-sidebar-collapsed') === 'true');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('sm-sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (
      isAuthenticated &&
      isOrganizationContext &&
      !pathname.startsWith('/organization') &&
      !pathname.startsWith('/account')
    ) {
      router.push('/organization');
    }
  }, [isAuthenticated, isOrganizationContext, pathname, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isOrganizationContext) {
    return <OrganizationShell>{children}</OrganizationShell>;
  }

  if (routeAccess && !hasRouteAccess) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AppSidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
        />
        <div className="flex min-w-0 flex-1">
          <main className="flex-1 overflow-y-auto">
            <AccessDenied
              title={routeAccess.title}
              description={routeAccess.description}
              backHref={getDefaultProtectedRoute(user)}
              backLabel="Go to an allowed section"
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AppSidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />
      <div className="flex min-w-0 flex-1">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
