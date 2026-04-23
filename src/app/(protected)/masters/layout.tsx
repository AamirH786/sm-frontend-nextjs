'use client';

// Masters horizontal tab bar removed — navigation is now handled by AppSidebar.
// Previously rendered tabs for: Character, Avatars, AI-Settings, Website Settings,
// Content Pages, Onboarding, Learning Admin, Departments, Designations,
// Person Master, Task Statuses, HeyGen Avatars.

export default function MastersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
