'use client';

// Roles-Users horizontal tab bar removed — navigation is now handled by AppSidebar.
// Previously rendered tabs for: Actions, Modules, Permissions, Roles,
// Employees, IP Restrictions, Logs.

export default function RolesUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-6 md:px-8">
      {children}
    </div>
  );
}
