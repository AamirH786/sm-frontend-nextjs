'use client';

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Plus, Edit, Trash2, Video, Image, User, ToggleLeft, ToggleRight, Tag, X, FolderOpen, ChevronDown } from 'lucide-react';

interface FeedReel {
  id: number;
  title: string;
  description: string | null;
  cover_image: string | null;
  video_url: string | null;
  avatar_id: number | null;
  avatar_name: string | null;
  avatar_image: string | null;
  position: number;
  is_active: boolean;
  category: string | null;
  subcategories: string[];
  tags: string[];
}

interface AvatarOption { id: number; avatar_name: string; }
interface CategoryOption { id: number; name: string; }
interface SubjectOption { id: number; name: string; category_id: number; }

type ReelForm = {
  title: string;
  description: string;
  cover_image: string;
  video_url: string;
  avatar_id: string;
  position: number;
  is_active: boolean;
  category_id: string;
};

// ── Tags chip input ────────────────────────────────────────────────────────────
function TagInput({ label, icon, values, onChange, placeholder }: {
  label: string; icon?: React.ReactNode;
  values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (raw: string) => {
    const val = raw.trim();
    if (val && !values.includes(val)) onChange([...values, val]);
    setInput('');
  };
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); }
    if (e.key === 'Backspace' && input === '' && values.length > 0) onChange(values.slice(0, -1));
  };
  const remove = (v: string) => onChange(values.filter(x => x !== v));

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">{icon} {label}</label>
      <div
        onClick={() => inputRef.current?.focus()}
        className="min-h-[40px] w-full rounded-lg border border-slate-200 px-2 py-1.5 flex flex-wrap gap-1.5 cursor-text focus-within:ring-2 focus-within:ring-blue-500"
      >
        {values.map(v => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2.5 py-0.5 font-medium">
            {v}
            <button type="button" onClick={() => remove(v)} className="text-blue-400 hover:text-blue-700 transition"><X size={10} /></button>
          </span>
        ))}
        <input
          ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey} onBlur={() => { if (input.trim()) add(input); }}
          className="flex-1 min-w-[100px] text-sm outline-none bg-transparent py-0.5 px-1"
          placeholder={values.length === 0 ? (placeholder || 'Type and press Enter…') : ''}
        />
      </div>
      <p className="text-[11px] text-slate-400 mt-0.5">Press Enter or comma to add</p>
    </div>
  );
}

// ── Multi-select dropdown for subcategories ────────────────────────────────────
function SubcategorySelect({ subjects, selected, onChange, disabled }: {
  subjects: SubjectOption[];
  selected: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (name: string) => {
    if (selected.includes(name)) onChange(selected.filter(x => x !== name));
    else onChange([...selected, name]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected.length === 0 ? 'text-slate-400' : 'text-slate-800'}>
          {selected.length === 0
            ? (disabled ? 'Select category first' : 'Select subcategories…')
            : selected.join(', ')}
        </span>
        <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
      </button>

      {open && subjects.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {subjects.map(s => (
            <label
              key={s.id}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(s.name)}
                onChange={() => toggle(s.name)}
                className="rounded border-slate-300 text-blue-600"
              />
              <span className="text-slate-700">{s.name}</span>
            </label>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(name => (
            <span key={name} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs px-2.5 py-0.5 font-medium">
              {name}
              <button type="button" onClick={() => toggle(name)} className="text-indigo-400 hover:text-indigo-700"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FeedManagementPage() {
  const { showToast } = useToast();
  const [reels, setReels] = useState<FeedReel[]>([]);
  const [avatars, setAvatars] = useState<AvatarOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReel, setEditingReel] = useState<FeedReel | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const form = useForm<ReelForm>({
    defaultValues: {
      title: '', description: '', cover_image: '', video_url: '',
      avatar_id: '', position: 0, is_active: true, category_id: '',
    },
  });

  const selectedCategoryId = useWatch({ control: form.control, name: 'category_id' });

  // When category changes, clear subcategories
  useEffect(() => { setSubcategories([]); }, [selectedCategoryId]);

  const filteredSubjects = subjects.filter(
    s => !selectedCategoryId || String(s.category_id) === String(selectedCategoryId)
  );

  const selectedCategoryName = categories.find(c => String(c.id) === String(selectedCategoryId))?.name || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reelsRes, avatarsRes, catsRes, subsRes] = await Promise.all([
        api.get('/admin/feed-reels'),
        api.get('/avatars?page=1&limit=100'),
        api.get('/admin/categories'),
        api.get('/admin/subjects'),
      ]);
      setReels((reelsRes.data as any).data || []);
      setAvatars(((avatarsRes.data as any).data || []).map((a: any) => ({ id: a.id, avatar_name: a.avatar_name })));
      // categories & subjects may return {data:[]} or [] directly
      const catsData = (catsRes.data as any)?.data ?? (catsRes.data as any) ?? [];
      const subsData = (subsRes.data as any)?.data ?? (subsRes.data as any) ?? [];
      setCategories(Array.isArray(catsData) ? catsData : []);
      setSubjects(Array.isArray(subsData) ? subsData : []);
    } catch {
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingReel(null);
    setSubcategories([]);
    setTags([]);
    form.reset({ title: '', description: '', cover_image: '', video_url: '', avatar_id: '', position: reels.length, is_active: true, category_id: '' });
    setModalOpen(true);
  };

  const openEdit = (reel: FeedReel) => {
    setEditingReel(reel);
    setSubcategories(reel.subcategories || []);
    setTags(reel.tags || []);
    // Find category_id by matching the stored category name
    const cat = categories.find(c => c.name === reel.category);
    form.reset({
      title: reel.title,
      description: reel.description || '',
      cover_image: reel.cover_image || '',
      video_url: reel.video_url || '',
      avatar_id: reel.avatar_id ? String(reel.avatar_id) : '',
      position: reel.position,
      is_active: reel.is_active,
      category_id: cat ? String(cat.id) : '',
    });
    setModalOpen(true);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    try {
      const payload = {
        title: values.title,
        description: values.description || null,
        cover_image: values.cover_image || null,
        video_url: values.video_url || null,
        avatar_id: values.avatar_id ? Number(values.avatar_id) : null,
        position: Number(values.position),
        is_active: values.is_active,
        category: selectedCategoryName,
        subcategories,
        tags,
      };
      if (editingReel) {
        await api.put(`/admin/feed-reels/${editingReel.id}`, payload);
        showToast('Reel updated', 'success');
      } else {
        await api.post('/admin/feed-reels', payload);
        showToast('Reel created', 'success');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  });

  const toggleActive = async (reel: FeedReel) => {
    try {
      await api.put(`/admin/feed-reels/${reel.id}`, { is_active: !reel.is_active });
      showToast(`Reel ${!reel.is_active ? 'activated' : 'deactivated'}`, 'success');
      load();
    } catch { showToast('Failed to update status', 'error'); }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/admin/feed-reels/${deletingId}`);
      showToast('Reel deleted', 'success');
      setDeletingId(null);
      load();
    } catch { showToast('Delete failed', 'error'); }
  };

  return (
    <div className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Feed Reels</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage short video reels shown on the client Feed page</p>
        </div>
        <Button onClick={openCreate} className="inline-flex items-center gap-2">
          <Plus size={16} /> Add Reel
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Loading…</div>
      ) : reels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <Video size={40} strokeWidth={1.2} />
          <p className="text-sm">No reels yet. Click "Add Reel" to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {reels.map((reel) => (
            <div key={reel.id} className={`relative rounded-2xl overflow-hidden bg-slate-900 shadow group ${!reel.is_active ? 'opacity-50' : ''}`}>
              {reel.cover_image ? (
                <img src={reel.cover_image} alt={reel.title} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 flex items-center justify-center bg-slate-800">
                  <Image size={32} className="text-slate-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute top-2 right-2 flex gap-1.5">
                {reel.video_url && (
                  <span className="rounded-full bg-black/50 backdrop-blur-sm p-1.5 text-white"><Video size={12} /></span>
                )}
                <button onClick={() => toggleActive(reel)} className="rounded-full bg-black/50 backdrop-blur-sm p-1.5 text-white hover:bg-black/70 transition" title={reel.is_active ? 'Deactivate' : 'Activate'}>
                  {reel.is_active ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                </button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1">
                <p className="text-sm font-semibold text-white truncate">{reel.title}</p>
                {reel.avatar_name && (
                  <p className="text-xs text-white/60 flex items-center gap-1"><User size={10} /> {reel.avatar_name}</p>
                )}
                {reel.category && (
                  <p className="text-xs text-white/50 flex items-center gap-1 flex-wrap">
                    <FolderOpen size={10} /> {reel.category}
                    {reel.subcategories?.length > 0 && (
                      <span className="text-white/40">· {reel.subcategories.join(', ')}</span>
                    )}
                  </p>
                )}
                {reel.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {reel.tags.slice(0, 3).map(t => (
                      <span key={t} className="rounded-full bg-white/10 text-white/70 text-[10px] px-2 py-0.5 border border-white/10">#{t}</span>
                    ))}
                    {reel.tags.length > 3 && <span className="text-[10px] text-white/40">+{reel.tags.length - 3}</span>}
                  </div>
                )}
              </div>

              <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition flex gap-1.5">
                <button onClick={() => openEdit(reel)} className="rounded-full bg-white/90 p-1.5 text-slate-700 hover:bg-white shadow"><Edit size={12} /></button>
                <button onClick={() => setDeletingId(reel.id)} className="rounded-full bg-white/90 p-1.5 text-red-500 hover:bg-white shadow"><Trash2 size={12} /></button>
              </div>

              <div className="absolute bottom-0 right-2 pb-3">
                <span className="text-[10px] text-white/40">#{reel.position}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingReel ? 'Edit Reel' : 'Add Reel'} size="md">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
            <input {...form.register('title', { required: true })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Reel title" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea {...form.register('description')} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Short description shown on the reel…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Image size={12} /> Cover Image URL</label>
              <input {...form.register('cover_image')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Video size={12} /> Video URL</label>
              <input {...form.register('video_url')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://… (.mp4 / HLS)" />
            </div>
          </div>

          {/* Category from Masters */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><FolderOpen size={12} /> Category</label>
            <select
              {...form.register('category_id')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Select category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Subcategories filtered by selected category */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><FolderOpen size={12} /> Subcategories</label>
            <SubcategorySelect
              subjects={filteredSubjects}
              selected={subcategories}
              onChange={setSubcategories}
              disabled={!selectedCategoryId}
            />
          </div>

          {/* Linked Avatar */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><User size={12} /> Linked Avatar</label>
            <select {...form.register('avatar_id')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">— No avatar —</option>
              {avatars.map(a => <option key={a.id} value={a.id}>{a.avatar_name}</option>)}
            </select>
          </div>

          {/* Tags — free form */}
          <TagInput
            label="Tags"
            icon={<Tag size={12} />}
            values={tags}
            onChange={setTags}
            placeholder="e.g. beginner, trending…"
          />

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Position (order)</label>
              <input type="number" {...form.register('position')} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" {...form.register('is_active')} className="rounded" />
                <span className="text-xs text-slate-600">Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingReel ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title="Delete Reel" size="sm">
        <p className="text-sm text-slate-600 mb-4">Are you sure you want to delete this reel? This cannot be undone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeletingId(null)}>Cancel</Button>
          <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
