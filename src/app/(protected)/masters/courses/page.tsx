'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { BookOpen, ChevronRight, Edit, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/hooks/useAuth';
import { adminLearningService, LearningCourse } from '@/services/adminLearningService';

type FormValues = {
  title: string;
  short_description: string;
  full_description: string;
  intro_video_url: string;
  thumbnail: string;
  price: number | null;
  complimentary_minutes: number | null;
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const slugify = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const DEFAULT_CATEGORY_ID = 3;

export default function CoursesPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<LearningCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LearningCourse | null>(null);
  const [search, setSearch] = useState('');
  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>();

  const load = async () => {
    try {
      setLoading(true);
      const data = await adminLearningService.courses.list();
      setCourses(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to load courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ title: '', short_description: '', full_description: '', intro_video_url: '', thumbnail: '', price: null, complimentary_minutes: null });
    setModalOpen(true);
  };

  const openEdit = (course: LearningCourse) => {
    setEditing(course);
    reset({
      title: course.title,
      short_description: course.short_description || '',
      full_description: course.full_description || '',
      intro_video_url: course.intro_video_url || '',
      thumbnail: course.thumbnail || '',
      price: course.price ?? null,
      complimentary_minutes: course.complimentary_minutes ?? null,
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); reset(); };

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        title: values.title.trim(),
        slug: slugify(values.title),
        short_description: values.short_description || null,
        full_description: values.full_description || null,
        intro_video_url: values.intro_video_url || null,
        thumbnail: values.thumbnail || null,
        teacher_id: user?.id ?? 1,
        category_id: DEFAULT_CATEGORY_ID,
        status: 1,
        price: values.price != null ? Number(values.price) : null,
        complimentary_minutes: values.complimentary_minutes != null ? Number(values.complimentary_minutes) : null,
      };

      if (editing) {
        await adminLearningService.courses.update(editing.id, payload);
        showToast('Course updated', 'success');
      } else {
        await adminLearningService.courses.create(payload as any);
        showToast('Course created', 'success');
      }
      closeModal();
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Save failed', 'error');
    }
  };

  const handleDelete = async (course: LearningCourse) => {
    if (!confirm(`Delete course "${course.title}"? This will also remove its modules and topics.`)) return;
    try {
      await adminLearningService.courses.delete(course.id);
      showToast('Course deleted', 'success');
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Delete failed', 'error');
    }
  };

  const filtered = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-semibold">Courses</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage your course library</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} className="mr-2" />Add Course</Button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <div className="py-16 text-center">
              <BookOpen size={40} className="mx-auto mb-3 text-slate-200" />
              <p className="text-slate-400 text-sm">No courses yet. Create your first course.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(course => (
            <div
              key={course.id}
              className="group relative flex flex-col rounded-xl border border-slate-100 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
              onClick={() => router.push(`/masters/courses/${course.id}`)}
            >
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} className="mb-3 h-32 w-full rounded-lg object-cover" />
              ) : (
                <div className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                  <BookOpen size={32} className="text-blue-200" />
                </div>
              )}

              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 leading-snug">{course.title}</h3>
                {course.short_description && (
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{course.short_description}</p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {course.difficulty_level && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      course.difficulty_level === 'beginner' ? 'bg-green-50 text-green-700' :
                      course.difficulty_level === 'intermediate' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {course.difficulty_level}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    course.status === 1 ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {course.status === 1 ? 'Active' : 'Draft'}
                  </span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
              </div>

              <div className="absolute top-3 right-3 hidden gap-1 group-hover:flex" onClick={e => e.stopPropagation()}>
                <Tooltip text="Edit">
                  <button onClick={() => openEdit(course)} className="rounded-lg bg-white p-1.5 shadow-sm hover:bg-slate-50 border border-slate-100">
                    <Edit size={13} className="text-slate-500" />
                  </button>
                </Tooltip>
                <Tooltip text="Delete">
                  <button onClick={() => handleDelete(course)} className="rounded-lg bg-white p-1.5 shadow-sm hover:bg-red-50 border border-slate-100">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit Course' : 'Add Course'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Course Title"
            {...register('title', { required: 'Title is required' })}
            error={errors.title?.message}
            required
          />
          <Input
            label="Short Description"
            {...register('short_description')}
            placeholder="Brief overview (shown in cards)"
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Description</label>
            <textarea
              {...register('full_description')}
              rows={3}
              placeholder="Detailed course description"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            />
          </div>
          <Input
            label="Intro Video URL"
            {...register('intro_video_url')}
            placeholder="https://..."
          />
          <Input
            label="Thumbnail URL"
            {...register('thumbnail')}
            placeholder="https://..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price (₹)"
              type="number"
              min={0}
              step={1}
              {...register('price', { valueAsNumber: true })}
              placeholder="e.g. 299"
            />
            <Input
              label="Complimentary Chat Minutes"
              type="number"
              min={0}
              step={1}
              {...register('complimentary_minutes', { valueAsNumber: true })}
              placeholder="e.g. 30"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
