'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import GuidancePanel from '@/components/learning/GuidancePanel';
import RelationshipTree from '@/components/learning/RelationshipTree';

interface FlowStep {
  key: string;
  label: string;
  hint?: string;
}

interface ContextEntry {
  label: string;
  value?: string | null;
}

interface CompactFlowShellProps {
  title: string;
  subtitle: string;
  steps: readonly FlowStep[];
  activeStepKey: string;
  context: ContextEntry[];
  guidance: {
    eyebrow: string;
    title: string;
    description: string;
    bullets?: string[];
  };
  relationshipTitle: string;
  relationshipChain: Array<{
    label: string;
    value?: string | null;
  }>;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  hideHeader?: boolean;
  hideContext?: boolean;
}

export default function CompactFlowShell({
  title,
  subtitle,
  steps: _steps,
  activeStepKey: _activeStepKey,
  context,
  guidance,
  relationshipTitle,
  relationshipChain,
  expanded,
  onToggleExpanded,
  hideHeader = false,
  hideContext = false,
}: CompactFlowShellProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = typeof expanded === 'boolean' ? expanded : internalExpanded;
  const handleToggle = () => {
    if (onToggleExpanded) {
      onToggleExpanded();
      return;
    }
    setInternalExpanded((current) => !current);
  };

  return (
    <div className="space-y-4">
      
        <div className="flex flex-col gap-2">
          {!hideHeader ? (
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-700">{title}</div>
                <p className="mt-2 max-w-4xl text-sm text-slate-600">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={handleToggle}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-primary-200 bg-gradient-to-r from-primary-600 via-blue-600 to-sky-500 px-3.5 text-xs font-semibold text-white shadow-sm shadow-primary-200/80 transition duration-200 hover:-translate-y-0.5 hover:from-primary-700 hover:via-blue-700 hover:to-sky-600 hover:shadow-md hover:shadow-primary-300/60"
              >
                {isExpanded ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                {isExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>
          ) : null}

          {!hideContext ? (
            <div className="flex flex-wrap items-center gap-2">
              {context.map((entry) => (
                <div
                  key={entry.label}
                  className={`inline-flex h-8 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-semibold ${
                    entry.value
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : 'border-amber-200 bg-amber-50 text-amber-900'
                  }`}
                >
                  <span className="truncate">{entry.label}: {entry.value || 'Not set'}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      

      {isExpanded ? (
        <div className="grid gap-4 xl:grid-cols-[1.25fr,0.75fr]">
          <GuidancePanel
            eyebrow={guidance.eyebrow}
            title={guidance.title}
            description={guidance.description}
            bullets={guidance.bullets}
          />
          <RelationshipTree title={relationshipTitle} chain={relationshipChain} />
        </div>
      ) : null}
    </div>
  );
}
