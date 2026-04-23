'use client';

// Onboarding left sidebar removed — navigation is now handled by AppSidebar.
// Previously rendered a sidebar with links for: Interests, Support Types, Interaction Styles.

export default function OnboardingLayout({
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
