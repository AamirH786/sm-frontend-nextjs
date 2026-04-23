'use client';

interface LearningContextStripProps {
  context: Array<{
    label: string;
    value?: string | null;
  }>;
}

export default function LearningContextStrip({ context }: LearningContextStripProps) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/92 px-5 py-4 shadow-sm shadow-slate-200/70 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Learning Context</div>
        {context.map((entry) => (
          <div
            key={entry.label}
            className="inline-flex min-w-[148px] items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-2"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${entry.value ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]' : 'bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.18)]'}`}
            />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {entry.label}
              </div>
              <div className="truncate text-sm font-medium text-slate-800">{entry.value || 'Not set'}</div>
              <div className={`text-[11px] font-medium ${entry.value ? 'text-emerald-700' : 'text-amber-700'}`}>
                {entry.value ? 'Ready' : 'Missing'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
