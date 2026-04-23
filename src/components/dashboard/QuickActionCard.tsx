import Link from 'next/link';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const actionTones = {
  blue: 'bg-sky-50 text-sky-700',
  green: 'bg-emerald-50 text-emerald-700',
  purple: 'bg-violet-50 text-violet-700',
  yellow: 'bg-amber-50 text-amber-700',
  orange: 'bg-orange-50 text-orange-700',
  gray: 'bg-slate-100 text-slate-700',
  pink: 'bg-pink-50 text-pink-700',
  indigo: 'bg-indigo-50 text-indigo-700',
} as const;

interface QuickActionCardProps {
  href: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  tone?: keyof typeof actionTones;
  className?: string;
}

export default function QuickActionCard({
  href,
  icon: Icon,
  label,
  description,
  tone = 'blue',
  className,
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/60 transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-26px_rgba(15,23,42,0.4)] hover:ring-slate-300/60',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', actionTones[tone])}>
          <Icon size={20} />
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {description ? <p className="text-xs leading-5 text-slate-500">{description}</p> : null}
      </div>
    </Link>
  );
}
