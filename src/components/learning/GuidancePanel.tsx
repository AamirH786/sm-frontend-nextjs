'use client';

interface GuidancePanelProps {
  eyebrow: string;
  title: string;
  description: string;
  bullets?: string[];
}

export default function GuidancePanel({
  eyebrow,
  title,
  description,
  bullets = [],
}: GuidancePanelProps) {
  return (
    <div className="rounded-3xl border border-blue-100/80 bg-gradient-to-br from-blue-50 via-white to-pink-50 px-5 py-5 shadow-sm shadow-blue-100/60">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">{eyebrow}</div>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      {bullets.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {bullets.map((bullet) => (
            <div
              key={bullet}
              className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm shadow-blue-100/40"
            >
              {bullet}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
