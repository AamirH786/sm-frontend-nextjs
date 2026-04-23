'use client';

interface RelationshipTreeProps {
  title: string;
  chain: Array<{
    label: string;
    value?: string | null;
  }>;
}

export default function RelationshipTree({ title, chain }: RelationshipTreeProps) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white px-5 py-5 shadow-sm shadow-slate-200/60">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-4 space-y-3">
        {chain.map((node, index) => (
          <div key={node.label} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {index + 1}
              </div>
              {index < chain.length - 1 ? <div className="mt-1 h-6 w-px bg-slate-200" /> : null}
            </div>
            <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{node.label}</div>
              <div className="mt-1 text-sm font-medium text-slate-800">{node.value || 'Not connected yet'}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
