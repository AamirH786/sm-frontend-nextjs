'use client';

import Link from 'next/link';
import { CircleHelp, LifeBuoy, MessageSquare, ShieldCheck } from 'lucide-react';

export default function HelpPage() {
  const cards = [
    {
      icon: CircleHelp,
      title: 'Product guidance',
      description: 'Open the core admin areas with a cleaner mental model and follow the main workflow first.',
    },
    {
      icon: ShieldCheck,
      title: 'Access and permissions',
      description: 'If something is hidden or disabled, your role permissions may need to be updated by an admin.',
    },
    {
      icon: LifeBuoy,
      title: 'Need support',
      description: 'Capture the exact screen, action, and error message so the issue can be resolved faster.',
    },
  ];

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,_rgba(186,230,253,0.38),_transparent_24%),linear-gradient(180deg,_#f8fbff_0%,_#f8fafc_42%,_#f6f8fc_100%)] px-6 py-8 md:px-10">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <section className="rounded-[30px] border border-white/75 bg-white/78 p-4 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/65 backdrop-blur md:p-6">
          <div className="relative overflow-hidden rounded-[28px] border border-white/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(248,250,252,0.78)),radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.12),transparent_24%)] px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-blue-600">
                  <CircleHelp size={14} />
                  Support center
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Help and support</h1>
                <p className="mt-2 text-base leading-7 text-slate-600">
                  Use this page as the quick support stop for navigation help, access issues, and next-step guidance.
                </p>
              </div>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 rounded-[22px] bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_52%,#0ea5e9_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_-22px_rgba(37,99,235,0.74)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-18px_rgba(29,78,216,0.74)]"
              >
                <MessageSquare size={16} />
                Open My Account
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-[24px] border border-white/75 bg-white/85 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/65 backdrop-blur"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <card.icon size={18} />
              </div>
              <h2 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border border-white/75 bg-white/85 p-5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.24)] ring-1 ring-slate-200/65 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Contact trail</h2>
              <p className="mt-1 text-sm text-slate-500">Share a screenshot, exact page, and the action you took before the issue happened.</p>
            </div>
            <Link
              href="/account"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <MessageSquare size={16} />
              Open account help
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
