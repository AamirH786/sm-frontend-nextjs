'use client';

export default function ProfileBuilderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-6 md:px-8">
      {children}
    </div>
  );
}
