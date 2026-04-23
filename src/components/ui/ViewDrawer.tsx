'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Pencil } from 'lucide-react';
import { createPortal } from 'react-dom';
import IconButton from '@/components/ui/IconButton';

export interface ViewDrawerSection {
  title: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'muted';
  collapsible?: boolean;
  defaultOpen?: boolean;
  fields: Array<{
    label: string;
    value: React.ReactNode;
  }>;
}

interface ViewDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  sections: ViewDrawerSection[];
  onClose: () => void;
  onEdit?: () => void;
}

export default function ViewDrawer({
  open,
  title,
  subtitle,
  sections,
  onClose,
  onEdit,
}: ViewDrawerProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      setIsMounted(false);
    }, 220);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, [open]);

  useEffect(() => {
    if (!isMounted) return;
    document.body.style.overflow = 'hidden';
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEscape);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onEscape);
    };
  }, [isMounted, onClose]);

  useEffect(() => {
    if (!isMounted) return;
    setCollapsedSections(
      sections.reduce<Record<string, boolean>>((acc, section) => {
        acc[section.title] = section.collapsible ? !section.defaultOpen : false;
        return acc;
      }, {})
    );
  }, [isMounted, sections]);

  if (!isMounted) return null;

  const toneStyles: Record<NonNullable<ViewDrawerSection['tone']>, string> = {
    default: 'border-slate-200/70 bg-slate-50/50',
    success: 'border-emerald-200 bg-emerald-50/60',
    warning: 'border-amber-200 bg-amber-50/60',
    danger: 'border-rose-200 bg-rose-50/60',
    muted: 'border-slate-200/70 bg-white',
  };

  return createPortal(
    <div className="fixed inset-0 z-[130]">
      <button
        type="button"
        aria-label="Close drawer"
        className={`absolute inset-0 bg-slate-950/18 backdrop-blur-[2px] transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-[520px] overflow-hidden border-l border-slate-200/80 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.18)] transition-transform duration-200 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="sticky top-0 z-10 border-b border-slate-100 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(255,255,255,0.96)_100%)] px-6 py-5 backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
            <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">
                View Details
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h2>
              {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              {onEdit ? <IconButton label="Edit" icon={<Pencil size={15} />} onClick={onEdit} /> : null}
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 shadow-sm transition-all duration-200 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:ring-offset-2"
              >
                <X size={18} />
              </button>
            </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {sections.map((section) => (
                <section
                  key={section.title}
                  className={`rounded-3xl border p-5 shadow-sm shadow-slate-100/70 ${toneStyles[section.tone ?? 'default']}`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {section.title}
                    </h3>
                    {section.collapsible ? (
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedSections((current) => ({
                            ...current,
                            [section.title]: !current[section.title],
                          }))
                        }
                        className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 transition hover:text-blue-700"
                      >
                        {collapsedSections[section.title] ? 'Show' : 'Hide'}
                      </button>
                    ) : null}
                  </div>
                  {!collapsedSections[section.title] ? (
                    <div className="space-y-3">
                      {section.fields.map((field) => (
                        <div key={`${section.title}-${field.label}`} className="grid gap-1 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                            {field.label}
                          </div>
                          <div className="min-w-0 break-words text-sm leading-6 text-slate-800">
                            {field.value || <span className="text-slate-400">-</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}
