'use client';

import { useEffect, useMemo, useState } from 'react';
import { avatarsService, Avatar } from '@/services/avatarsService';
import Button from '@/components/ui/Button';
import AdvancedDataTable from '@/components/ui/AdvancedDataTable';
import { Card, CardContent } from '@/components/ui/Card';
import GuidancePanel from '@/components/learning/GuidancePanel';
import RelationshipTree from '@/components/learning/RelationshipTree';
import { useToast } from '@/context/ToastContext';
import { Plus, Edit, Trash2, Eye, ArrowDown, ArrowUp } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AvatarsListPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({ search: '' });
  const [showSystemGuide, setShowSystemGuide] = useState(false);
  const [guideMode, setGuideMode] = useState<'learning' | 'non-learning'>('learning');
  const [summary, setSummary] = useState({ total: 0, complete: 0, pending: 0, conflict: 0 });

  const reloadTable = () => setRefreshKey((k) => k + 1);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this avatar?')) return;
    try {
      await avatarsService.delete(id);
      showToast('Avatar deleted', 'success');
      reloadTable();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await avatarsService.toggle(id);
      showToast('Avatar status updated', 'success');
      reloadTable();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const fetchTable = async ({ page, limit, search }: any) => {
    const params: any = { page, limit };
    if (search) params.search = search;

    const res = await avatarsService.list(params);
    return {
      data: res.data,
      pagination: {
        page: res.meta.page,
        limit: res.meta.limit,
        total: res.meta.total,
        totalPages: res.meta.totalPages ?? 0,
      },
    };
  };

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const firstPage = await avatarsService.list({ page: 1, limit: 100 });
        const totalPages = Number(firstPage?.meta?.totalPages ?? 1);
        const total = Number(firstPage?.meta?.total ?? 0);
        const remainingPages =
          totalPages > 1
            ? await Promise.all(
                Array.from({ length: totalPages - 1 }, (_, index) =>
                  avatarsService.list({ page: index + 2, limit: 100 })
                )
              )
            : [];
        const avatars = [
          ...(Array.isArray(firstPage.data) ? firstPage.data : []),
          ...remainingPages.flatMap((result) => (Array.isArray(result.data) ? result.data : [])),
        ];
        const nextSummary = avatars.reduce(
          (acc, avatar) => {
            const normalizedCategory = (avatar.category || '').trim().toLowerCase();
            const isLearningAvatar =
              normalizedCategory.includes('teacher') ||
              normalizedCategory.includes('learning') ||
              (avatar.learning_scopes?.length ?? 0) > 0 ||
              (avatar.mapped_courses?.length ?? 0) > 0;
            const hasPrompt = Boolean(avatar.prompt_content?.replace(/<[^>]+>/g, '').trim());
            const hasPricing = Boolean(avatar.active_pricing);
            const hasScope = !isLearningAvatar || (avatar.learning_scopes?.length ?? 0) > 0 || (avatar.mapped_courses?.length ?? 0) > 0;
            const hasIdentity = Boolean(avatar.avatar_name && avatar.persona && avatar.category);

            if (isLearningAvatar && !hasScope) {
              acc.conflict += 1;
            } else if (avatar.is_active && hasIdentity && hasPrompt && hasPricing && hasScope) {
              acc.complete += 1;
            } else {
              acc.pending += 1;
            }

            return acc;
          },
          { total, complete: 0, pending: 0, conflict: 0 }
        );

        setSummary(nextSummary);
      } catch (err: any) {
        showToast(err.message || 'Failed to load avatar summary', 'error');
      }
    };

    loadSummary();
  }, [refreshKey, showToast]);

  const guideContent = useMemo(() => {
    if (guideMode === 'learning') {
      return {
        title: 'Learning avatars connect identity with LMS scope',
        description:
          'Use learning avatars when the category is tied to teaching, learner progression, and course routing. Runtime can then narrow placement using subject, track, level, and mapped courses.',
        bullets: [
          'Use Learning Admin to define category, subject, track, level, and courses.',
          'Use avatar create/edit to map teaching identity and LMS scope together.',
          'Use Avatar Mapping and course mappings when runtime selection must be precise.',
        ],
        relationshipTitle: 'Learning Relationship Model',
        relationshipChain: [
          { label: 'Category', value: 'Defines the teaching domain' },
          { label: 'Subject', value: 'Anchors the learning scope' },
          { label: 'Track / Level', value: 'Narrows path and learner depth' },
          { label: 'Course', value: 'Controls exact learner-facing placement' },
          { label: 'Avatar', value: 'Delivers teaching guidance and assistance' },
        ],
      };
    }

    return {
      title: 'Non-learning avatars focus on expertise, not LMS scope',
      description:
        'Use non-learning avatars for domains like politics, wellbeing, career guidance, or other expert-led experiences where no academic structure needs to be mapped.',
      bullets: [
        'Use avatar create/edit to define identity, domain expertise, behavior, and safety.',
        'Learning-only fields like subject, track, level, and course stay hidden for clarity.',
        'Runtime should route these avatars by category, intent, and expertise context instead of LMS structure.',
      ],
      relationshipTitle: 'Non-Learning Relationship Model',
      relationshipChain: [
        { label: 'Category', value: 'Defines the expertise domain' },
        { label: 'Intent', value: 'Shapes the conversational use case' },
        { label: 'Domain Expertise', value: 'Explains what the avatar is expert in' },
        { label: 'Avatar', value: 'Delivers guidance and specialist support' },
      ],
    };
  }, [guideMode]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.10),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_48%,#f5f9ff_100%)] px-6 py-6 md:px-10">
      <div className="mb-6 rounded-[24px] border border-blue-100/80 bg-[linear-gradient(135deg,rgba(236,245,255,0.98)_0%,rgba(221,237,255,0.98)_50%,rgba(205,228,255,0.94)_100%)] px-5 py-3 text-slate-900 shadow-[0_18px_42px_rgba(59,130,246,0.14)] backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="mt-2 text-[25px] font-semibold leading-none tracking-tight">All Avatars</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Manage avatar identity, runtime scope, pricing readiness, and learning alignment in one premium workspace.
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              {summary.total} total · {summary.complete} complete · {summary.pending} pending · {summary.conflict} conflicts
            </p>
          </div>
          <div className="flex items-center gap-2 md:justify-end">
            <button
              type="button"
              onClick={() => setShowSystemGuide((current) => !current)}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              {showSystemGuide ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
              {showSystemGuide ? 'Collapse guide' : 'Expand guide'}
            </button>
            <Link href="/masters/avatars/create">
              <Button className="h-10 whitespace-nowrap rounded-full border border-blue-100 bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                <Plus size={18} className="mr-2" /> Create Avatar
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {showSystemGuide ? (
        <div className="mb-6 rounded-[24px] border border-primary-100/80 bg-[linear-gradient(135deg,rgba(248,250,252,0.98)_0%,rgba(239,246,255,0.96)_55%,rgba(253,242,248,0.88)_100%)] p-5 shadow-sm shadow-primary-100/60">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setGuideMode('learning')}
              className={`inline-flex h-9 items-center rounded-full px-3.5 text-xs font-semibold transition ${
                guideMode === 'learning'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              Learning Avatar
            </button>
            <button
              type="button"
              onClick={() => setGuideMode('non-learning')}
              className={`inline-flex h-9 items-center rounded-full px-3.5 text-xs font-semibold transition ${
                guideMode === 'non-learning'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              Non-Learning Avatar
            </button>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
            <GuidancePanel
              eyebrow="Avatar system"
              title={guideContent.title}
              description={guideContent.description}
              bullets={guideContent.bullets}
            />
            <RelationshipTree
              title={guideContent.relationshipTitle}
              chain={guideContent.relationshipChain}
            />
          </div>
        </div>
      ) : null}

      <Card className="rounded-[24px] border border-slate-200/80 bg-white/95 shadow-sm shadow-slate-100/70">
        <CardContent className="p-5">
          <AdvancedDataTable
            refreshTrigger={refreshKey}
            externalSearch={filters.search}
            onSearchChange={(val) => setFilters({ search: val })}
            showAnalytics={false}
            showRowsPerPageControl={false}
            showTopSummary={false}
            columns={[
              { key: 'avatar_name', label: 'Avatar Name' },
              { key: 'category', label: 'Category' },
              { key: 'persona', label: 'Persona' },
              { key: 'authority_level', label: 'Authority', render: (r: Avatar) => r.authority_level || '-' },
              {
                key: 'active_pricing',
                label: 'Price',
                render: (r: Avatar) =>
                  r.active_pricing ? (
                    <span className="font-medium text-green-700">
                      {r.active_pricing.currency} {r.active_pricing.price}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  ),
              },
              {
                key: 'is_active',
                label: 'Status',
                render: (r: Avatar) => {
                  const normalizedCategory = (r.category || '').trim().toLowerCase();
                  const isLearningAvatar =
                    normalizedCategory.includes('teacher') ||
                    normalizedCategory.includes('learning') ||
                    (r.learning_scopes?.length ?? 0) > 0 ||
                    (r.mapped_courses?.length ?? 0) > 0;
                  const hasPrompt = Boolean(r.prompt_content?.replace(/<[^>]+>/g, '').trim());
                  const hasPricing = Boolean(r.active_pricing);
                  const hasScope = !isLearningAvatar || (r.learning_scopes?.length ?? 0) > 0 || (r.mapped_courses?.length ?? 0) > 0;
                  const tone = isLearningAvatar && !hasScope
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : r.is_active && hasPrompt && hasPricing && hasScope
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700';
                  const label = isLearningAvatar && !hasScope
                    ? 'Conflict'
                    : r.is_active && hasPrompt && hasPricing && hasScope
                      ? 'Complete'
                      : 'Pending';

                  return (
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
                        {label}
                      </span>
                      <button onClick={() => handleToggle(r.id)} className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline">
                        {r.is_active ? 'Set inactive' : 'Set active'}
                      </button>
                    </div>
                  );
                },
              },
              {
                key: 'created_at',
                label: 'Created',
                render: (r: Avatar) => formatDateTime(r.created_at),
              },
            ]}
            fetchData={fetchTable}
            actions={(row: Avatar) => (
              <div className="flex justify-end gap-2">
                <Tooltip text="View">
                  <button 
                    onClick={() => router.push(`/masters/avatars/${row.id}`)} 
                    className="p-1.5 hover:bg-gray-100 rounded"
                  >
                    <Eye size={16} />
                  </button>
                </Tooltip>
                <Tooltip text="Edit">
                  <button 
                    onClick={() => router.push(`/masters/avatars/${row.id}/edit`)} 
                    className="p-1.5 hover:bg-gray-100 rounded"
                  >
                    <Edit size={16} />
                  </button>
                </Tooltip>
                <Tooltip text="Delete">
                  <button onClick={() => handleDelete(row.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                </Tooltip>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
