import Link from 'next/link';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const tones = {
  blue: 'from-sky-50 via-white to-blue-50 text-sky-700 ring-sky-100',
  green: 'from-emerald-50 via-white to-green-50 text-emerald-700 ring-emerald-100',
  purple: 'from-fuchsia-50 via-white to-violet-50 text-violet-700 ring-violet-100',
  orange: 'from-amber-50 via-white to-orange-50 text-orange-700 ring-orange-100',
  red: 'from-rose-50 via-white to-red-50 text-rose-700 ring-rose-100',
  teal: 'from-cyan-50 via-white to-teal-50 text-cyan-700 ring-cyan-100',
  gray: 'from-slate-50 via-white to-gray-50 text-slate-700 ring-slate-100',
} as const;

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  href: string;
  color?: keyof typeof tones;
  detail?: string;
  className?: string;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  href,
  color = 'blue',
  detail,
  className,
}: StatCardProps) {
  const tone = tones[color];

  return (
    <Link
      href={href}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] ring-1 backdrop-blur transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-24px_rgba(15,23,42,0.45)]',
        tone,
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_transparent_70%)]" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85 shadow-sm ring-1 ring-black/5">
            <Icon size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{label}</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
            {detail ? <p className="text-sm text-slate-500">{detail}</p> : null}
          </div>
        </div>
        <ArrowUpRight className="mt-1 h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
      </div>
    </Link>
  );
}
