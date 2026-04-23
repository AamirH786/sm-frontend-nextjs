'use client';

// Character left sidebar removed — navigation is now handled by AppSidebar.
// Previously rendered a sidebar with icon links for: Emotions, Tones,
// Communication Styles, Modes, Domains, Delivery, Personas, System Safety.

export default function CharacterLayout({
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
