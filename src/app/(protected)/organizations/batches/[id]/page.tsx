'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, CalendarDays, Clock3, Layers3, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import organizationAdminService, { type OrganizationBatchRecord } from '@/services/organizationAdminService';
import { adminLearningService, type LearningCourse } from '@/services/adminLearningService';
import { avatarsService, type Avatar } from '@/services/avatarsService';

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function OrganizationBatchDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [batch, setBatch] = useState<(OrganizationBatchRecord & { batch_members?: Array<{ id: number; member_id: number }> }) | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [courses, setCourses] = useState<LearningCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const batchId = Number(params?.id || 0);
  const orgId = Number(searchParams.get('orgId') || 0);

  useEffect(() => {
    if (!batchId || !orgId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const [nextBatch, avatarResponse, courseResponse] = await Promise.all([
          organizationAdminService.getBatch(orgId, batchId),
          avatarsService.list({ page: 1, limit: 200 }),
          adminLearningService.courses.list(),
        ]);
        setBatch(nextBatch);
        setAvatars(avatarResponse.data ?? []);
        setCourses(courseResponse ?? []);
      } catch (error: any) {
        showToast(error?.message || 'Unable to load batch details.', 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [batchId, orgId, showToast]);

  const avatarName = useMemo(() => avatars.find((item) => item.id === batch?.avatar_id)?.avatar_name, [avatars, batch]);
  const courseName = useMemo(() => courses.find((item) => item.id === batch?.course_id)?.title, [courses, batch]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" /></div>;
  }

  if (!batch) {
    return <div className="p-6"><Link href="/organizations/batches"><Button variant="outline" className="gap-2"><ArrowLeft size={16} />Back to batches</Button></Link></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <Link href="/organizations/batches">
        <Button variant="outline" className="gap-2"><ArrowLeft size={16} />Back to batches</Button>
      </Link>
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">{batch.name}</h1>
        <p className="mt-2 text-sm text-slate-500">{batch.description || 'No description added for this batch yet.'}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"><CalendarDays size={14} />Schedule</div><p className="mt-2 text-sm font-semibold text-slate-900">{batch.schedule_days}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"><Clock3 size={14} />Time</div><p className="mt-2 text-sm font-semibold text-slate-900">{String(batch.schedule_time).slice(0, 5)} / {batch.duration_minutes} mins</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"><Layers3 size={14} />Avatar</div><p className="mt-2 text-sm font-semibold text-slate-900">{avatarName || 'Not assigned'}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"><Users size={14} />Course</div><p className="mt-2 text-sm font-semibold text-slate-900">{courseName || 'No course linked'}</p></div>
        </div>
      </section>
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Batch Meta</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Created</p><p className="mt-2 text-sm text-slate-900">{formatDateTime(batch.created_at)}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Enrolled Members</p><p className="mt-2 text-sm text-slate-900">{batch.batch_members?.length || 0}</p></div>
        </div>
      </section>
    </div>
  );
}
