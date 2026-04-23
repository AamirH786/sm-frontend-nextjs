'use client';

interface FlowStep {
  key: string;
  label: string;
  hint?: string;
}

interface FlowProgressProps {
  title: string;
  subtitle: string;
  steps: FlowStep[];
  activeStepKey: string;
  onStepClick?: (stepKey: string) => void;
}

export default function FlowProgress({
  title,
  subtitle,
  steps,
  activeStepKey,
  onStepClick,
}: FlowProgressProps) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.key === activeStepKey)
  );

  return (
    <div className="sticky top-[72px] z-20 overflow-hidden rounded-3xl border border-blue-100/80 bg-white/88 shadow-[0_16px_40px_rgba(37,99,235,0.08)] backdrop-blur-xl">
      <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-pink-50 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">{title}</p>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>
      <div className="grid gap-3 px-4 py-4 md:grid-cols-6">
        {steps.map((step, index) => {
          const isActive = step.key === activeStepKey;
          const isComplete = index < activeIndex;

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onStepClick?.(step.key)}
              className={[
                'rounded-2xl border px-4 py-3 text-left transition-all duration-200',
                isActive
                  ? 'border-blue-300 bg-blue-600 text-white shadow-lg shadow-blue-200/70'
                  : isComplete
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-300'
                    : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-blue-200 hover:bg-blue-50/70',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  className={[
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    isActive
                      ? 'bg-white/20 text-white'
                      : isComplete
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600',
                  ].join(' ')}
                >
                  {isComplete ? '✓' : index + 1}
                </span>
              </div>
              <div className="mt-3 text-sm font-semibold">{step.label}</div>
              {step.hint ? <div className="mt-1 text-xs opacity-80">{step.hint}</div> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
