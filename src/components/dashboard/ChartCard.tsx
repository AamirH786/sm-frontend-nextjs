import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
}: ChartCardProps) {
  return (
    <section
      className={cn(
        'rounded-[24px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/60 backdrop-blur',
        className
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
              <Icon size={18} />
            </div>
          ) : null}
          <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight text-slate-950">{title}</h3>
            {description ? <p className="text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
