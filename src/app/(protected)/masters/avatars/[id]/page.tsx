'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { avatarsService, Avatar } from '@/services/avatarsService';
import { avatarPricingService, AvatarPricing, CreatePricingData } from '@/services/avatarPricingService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { ArrowLeft, Edit, Plus, X, Clock, Calendar, Percent, Gift, Upload, FileText, Trash2, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import {
  DEFAULT_KNOWLEDGE_LEVEL,
  KNOWLEDGE_LEVEL_OPTIONS,
  type KnowledgeLevel,
} from '@/lib/avatarKnowledge';

interface KnowledgeDocument {
  id: number;
  avatar_id: number;
  file_name: string;
  file_type: string;
  knowledge_level: KnowledgeLevel;
  file_size: number | null;
  chunk_count: number;
  status: string;
  created_at: string;
}

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

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getMasterNames = (items?: { id: number; name: string }[] | number[]) => {
  if (!items || items.length === 0) return '-';
  if (typeof items[0] === 'number') return '-';
  return (items as { id: number; name: string }[]).map((i) => i.name).join(', ');
};

const getDerivedScope = (avatar: Avatar) => {
  const subjectIds = new Set<number>();
  const trackIds = new Set<number>();
  const levelIds = new Set<number>();

  (avatar.learning_scopes || []).forEach((scope) => {
    if (typeof scope.subject_id === 'number') subjectIds.add(scope.subject_id);
    if (typeof scope.track_id === 'number') trackIds.add(scope.track_id);
    if (typeof scope.level_id === 'number') levelIds.add(scope.level_id);
  });

  if (subjectIds.size === 0 && trackIds.size === 0 && levelIds.size === 0) {
    (avatar.mapped_courses || []).forEach((course) => {
      if (typeof course.subject_id === 'number') subjectIds.add(course.subject_id);
      if (typeof course.track_id === 'number') trackIds.add(course.track_id);
      if (typeof course.level_id === 'number') levelIds.add(course.level_id);
    });
  }

  return {
    subjectCount: subjectIds.size,
    trackCount: trackIds.size,
    levelCount: levelIds.size,
  };
};

const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
  ready: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: CheckCircle },
  processing: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', icon: Clock },
  failed: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: AlertCircle },
};

export default function AvatarViewPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const avatarId = Number(params.id);

  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [activePricing, setActivePricing] = useState<AvatarPricing | null>(null);
  const [pricingHistory, setPricingHistory] = useState<AvatarPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'knowledge'>('details');

  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedKnowledgeLevel, setSelectedKnowledgeLevel] = useState<KnowledgeLevel>(DEFAULT_KNOWLEDGE_LEVEL);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<CreatePricingData>>({
    price: 0,
    currency: 'INR',
    duration_minutes: 60,
    credits: null,
    validity_days: 30,
    discount_percent: 0,
    trial_minutes: 0,
    reason: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const avatarData = await avatarsService.get(avatarId);
      setAvatar(avatarData);

      try {
        const active = await avatarPricingService.getActive(avatarId);
        setActivePricing(active);
      } catch {
        setActivePricing(null);
      }

      try {
        const history = await avatarPricingService.getHistory(avatarId);
        setPricingHistory(history);
      } catch {
        setPricingHistory([]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load avatar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadKnowledgeDocs = useCallback(async () => {
    try {
      const res = await avatarsService.getKnowledgeDocuments(avatarId);
      setKnowledgeDocs(res.data || []);
    } catch {
      setKnowledgeDocs([]);
    }
  }, [avatarId]);

  useEffect(() => {
    if (avatarId) {
      loadData();
      loadKnowledgeDocs();
    }
  }, [avatarId]);

  const handleUploadFile = async (file: File) => {
    const validTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const name = file.name.toLowerCase();
    const isValid = validTypes.includes(file.type) || name.endsWith('.pdf') || name.endsWith('.txt') || name.endsWith('.docx');

    if (!isValid) {
      showToast('Only PDF, TXT, and DOCX files are supported', 'error');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showToast('File size exceeds 20MB limit', 'error');
      return;
    }

    try {
      setUploading(true);
      await avatarsService.uploadKnowledgeDocument(avatarId, file, selectedKnowledgeLevel);
      showToast(`"${file.name}" uploaded and processing`, 'success');
      loadKnowledgeDocs();
    } catch (err: any) {
      showToast(err.message || 'Failed to upload document', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (docId: number, fileName: string) => {
    if (!confirm(`Delete "${fileName}" and all its embeddings?`)) return;
    try {
      await avatarsService.deleteKnowledgeDocument(avatarId, docId);
      showToast('Document deleted', 'success');
      loadKnowledgeDocs();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document', 'error');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUploadFile(file);
  };

  const handleCreate = async () => {
    if (!formData.price || formData.price <= 0) {
      showToast('Price is required', 'error');
      return;
    }
    if (!formData.reason?.trim()) {
      showToast('Reason is required', 'error');
      return;
    }

    try {
      setCreating(true);
      await avatarPricingService.create({
        avatar_id: avatarId,
        price: formData.price!,
        currency: formData.currency || 'INR',
        duration_minutes: formData.duration_minutes || 60,
        credits: formData.credits || null,
        validity_days: formData.validity_days || 30,
        discount_percent: formData.discount_percent || 0,
        trial_minutes: formData.trial_minutes || 0,
        reason: formData.reason!,
      });
      showToast('Pricing created successfully', 'success');
      setShowCreateModal(false);
      setFormData({
        price: 0,
        currency: 'INR',
        duration_minutes: 60,
        credits: null,
        validity_days: 30,
        discount_percent: 0,
        trial_minutes: 0,
        reason: '',
      });
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create pricing', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!activePricing) return;
    const reason = prompt('Enter deactivation reason:');
    if (!reason?.trim()) {
      showToast('Reason is required', 'error');
      return;
    }
    try {
      await avatarPricingService.deactivate(activePricing.id, reason);
      showToast('Pricing deactivated', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate', 'error');
    }
  };

  if (loading) {
    return (
      <div className="px-6 md:px-10 py-6">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!avatar) {
    return (
      <div className="px-6 md:px-10 py-6">
        <p className="text-red-500">Avatar not found</p>
        <Link href="/masters/avatars" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to Avatars
        </Link>
      </div>
    );
  }

  const derivedScope = getDerivedScope(avatar);
  const mappedCourses = avatar.mapped_courses || [];
  const isTeacherCategory = (avatar.category || '').trim().toLowerCase() === 'teacher';

  return (
    <div className="px-6 md:px-10 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/masters" className="text-xl font-bold text-gray-900 hover:text-blue-600">
            Masters
          </Link>
          <span className="text-gray-400 mx-2">/</span>
          <Link href="/masters/avatars" className="text-xl font-bold text-gray-900 hover:text-blue-600">
            Avatars
          </Link>
          <span className="text-gray-400 mx-2">/</span>
          <span className="text-xl font-bold text-gray-900">{avatar.avatar_name}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
          <Button onClick={() => router.push(`/masters/avatars/${avatarId}/edit`)}>
            <Edit size={16} className="mr-2" /> Edit
          </Button>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Avatar Details
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'knowledge'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen size={16} />
            Knowledge Base
            {knowledgeDocs.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{knowledgeDocs.length}</span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'details' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          {isTeacherCategory ? (
            <Card className="xl:col-span-2 border border-primary-100 bg-gradient-to-r from-primary-50/70 via-white to-blue-50/70 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary-700">
                      Teacher Profile
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold text-slate-900">{avatar.avatar_name}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Teaching avatar with {mappedCourses.length} mapped {mappedCourses.length === 1 ? 'course' : 'courses'} and a backend-linked delivery profile.
                    </p>
                  </div>

                  <div className="grid min-w-[280px] grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Courses</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{mappedCourses.length}</div>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Subjects</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{derivedScope.subjectCount}</div>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Tracks</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{derivedScope.trackCount}</div>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Levels</div>
                      <div className="mt-2 text-2xl font-semibold text-slate-900">{derivedScope.levelCount}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Avatar Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium">{avatar.avatar_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Category</span>
                  <span>{avatar.category}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Persona</span>
                  <span>{avatar.persona}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Authority Level</span>
                  <span>{avatar.authority_level || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Primary Language</span>
                  <span>{avatar.primary_language || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Status</span>
                  <span className={avatar.is_active ? 'text-green-600' : 'text-red-600'}>
                    {avatar.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Emotions</span>
                  <span>{getMasterNames(avatar.emotions)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Tones</span>
                  <span>{getMasterNames(avatar.tones)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Domains</span>
                  <span>{getMasterNames(avatar.domains)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Modes</span>
                  <span>{getMasterNames(avatar.modes)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Created</span>
                  <span>{formatDateTime(avatar.created_at)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Avatar Type</span>
                  <span className={avatar.avatar_type === 'heygen' ? 'text-purple-600 font-medium' : ''}>
                    {avatar.avatar_type || 'default'}
                  </span>
                </div>
                {avatar.greeting_message && (
                  <div className="py-2 border-b">
                    <span className="text-gray-500 block mb-1">Greeting Message</span>
                    <p className="text-sm bg-gray-50 rounded p-2">{avatar.greeting_message}</p>
                  </div>
                )}
                {avatar.backstory && (
                  <div className="py-2 border-b">
                    <span className="text-gray-500 block mb-1">Backstory</span>
                    <p className="text-sm bg-gray-50 rounded p-2 whitespace-pre-wrap">{avatar.backstory}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {isTeacherCategory ? (
            <Card>
              <CardHeader>
                <CardTitle>Teaching Scope & Course Mapping</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Subjects</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">{derivedScope.subjectCount}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Tracks</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">{derivedScope.trackCount}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-400">Levels</div>
                      <div className="mt-2 text-xl font-semibold text-slate-900">{derivedScope.levelCount}</div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Mapped Courses</span>
                      <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
                        {mappedCourses.length} linked
                      </span>
                    </div>

                    {mappedCourses.length > 0 ? (
                      <div className="space-y-3">
                        {mappedCourses.map((course) => (
                          <div
                            key={course.id}
                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary-200 hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900">{course.title}</div>
                                <div className="mt-1 text-xs text-slate-500">{course.slug}</div>
                              </div>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                Course #{course.id}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500">
                        No courses mapped yet.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {avatar.avatar_type === 'heygen' && (
            <Card>
              <CardHeader>
                <CardTitle>HeyGen Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">HeyGen Avatar ID</span>
                    <span className="font-mono text-sm">{avatar.heygen_avatar_id || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">HeyGen Voice ID</span>
                    <span className="font-mono text-sm">{avatar.heygen_voice_id || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Gender</span>
                    <span>{avatar.heygen_gender || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Language</span>
                    <span>{avatar.heygen_language || 'en-US'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-500">Interactive</span>
                    <span className={avatar.is_interactive ? 'text-green-600' : 'text-gray-500'}>
                      {avatar.is_interactive ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {avatar.heygen_preview_image && (
                    <div className="py-2 border-b">
                      <span className="text-gray-500 block mb-2">Preview Image</span>
                      <img src={avatar.heygen_preview_image} alt="Preview" className="w-32 h-32 object-cover rounded-lg" />
                    </div>
                  )}
                  {avatar.heygen_preview_video && (
                    <div className="py-2">
                      <span className="text-gray-500 block mb-2">Preview Video</span>
                      <a href={avatar.heygen_preview_video} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        View Preview Video
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Active Pricing</CardTitle>
                <Button size="sm" onClick={() => setShowCreateModal(true)}>
                  <Plus size={16} className="mr-1" /> Add New
                </Button>
              </CardHeader>
              <CardContent>
                {activePricing ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <p className="text-2xl font-bold text-green-700">
                          {activePricing.currency} {activePricing.price}
                        </p>
                        <p className="text-sm text-gray-500">per {activePricing.duration_minutes} minutes</p>
                      </div>
                      <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">Active</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span>Validity: {activePricing.validity_days} days</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Percent size={14} className="text-gray-400" />
                        <span>Discount: {activePricing.discount_percent || 0}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gift size={14} className="text-gray-400" />
                        <span>Trial: {activePricing.trial_minutes || 0} mins</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span>{formatDateTime(activePricing.created_at)}</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-500">Reason: {activePricing.reason}</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-red-600" onClick={handleDeactivate}>
                      <X size={14} className="mr-1" /> Deactivate
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No active pricing set</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pricing History</CardTitle>
              </CardHeader>
              <CardContent>
                {pricingHistory.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pricing history</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {pricingHistory.map((p) => (
                      <div
                        key={p.id}
                        className={`p-3 rounded-lg border ${p.is_active ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">
                              {p.currency} {p.price}
                              <span className="text-sm text-gray-500 font-normal ml-2">
                                / {p.duration_minutes} mins
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Reason: {p.reason}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${p.is_active ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}`}
                          >
                            {p.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          <span>Created: {formatDateTime(p.created_at)}</span>
                          {p.deactivated_at && <span>Deactivated: {formatDateTime(p.deactivated_at)}</span>}
                        </div>
                        {p.deactivation_reason && (
                          <p className="text-xs text-red-500 mt-1">Deactivation: {p.deactivation_reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen size={20} />
                Knowledge Base
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Upload PDF, TXT, or DOCX files to train this avatar with custom knowledge. The content will be chunked, embedded, and used during conversations via RAG (Retrieval-Augmented Generation).
              </p>

              <div className="max-w-xs mb-4">
                <Select
                  label="Knowledge Level"
                  value={selectedKnowledgeLevel}
                  onChange={(value) => setSelectedKnowledgeLevel(String(value) as KnowledgeLevel)}
                  options={KNOWLEDGE_LEVEL_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                />
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Upload size={32} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600 font-medium">
                  {uploading ? 'Uploading & processing...' : 'Drag & drop a file here, or click to browse'}
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, TXT, DOCX up to 20MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadFile(file);
                  }}
                  className="hidden"
                  id="knowledge-file"
                />
                <label
                  htmlFor="knowledge-file"
                  className={`inline-block mt-3 px-4 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
                    uploading
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {uploading ? 'Processing...' : 'Choose File'}
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents ({knowledgeDocs.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {knowledgeDocs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No knowledge documents uploaded yet</p>
                  <p className="text-xs text-gray-400 mt-1">Upload files above to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {knowledgeDocs.map((doc) => {
                    const style = statusColors[doc.status] || statusColors.processing;
                    const StatusIcon = style.icon;
                    return (
                      <div
                        key={doc.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${style.bg}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <FileText size={20} className="text-gray-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{doc.file_name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                              <span>{doc.file_type.toUpperCase()}</span>
                              <span className="capitalize">{doc.knowledge_level}</span>
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>{doc.chunk_count} chunks</span>
                              <span>{formatDateTime(doc.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <span className={`flex items-center gap-1 text-xs font-medium ${style.text}`}>
                            <StatusIcon size={14} />
                            {doc.status}
                          </span>
                          <button
                            onClick={() => handleDeleteDocument(doc.id, doc.file_name)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete document"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add New Pricing">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price *"
              type="number"
              value={formData.price || ''}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            />
            <Select
              label="Currency"
              value={formData.currency}
              onChange={(val) => setFormData({ ...formData, currency: String(val) })}
              options={[
                { value: 'INR', label: 'INR' },
                { value: 'USD', label: 'USD' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duration (minutes)"
              type="number"
              value={formData.duration_minutes || ''}
              onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
            />
            <Input
              label="Validity (days)"
              type="number"
              value={formData.validity_days || ''}
              onChange={(e) => setFormData({ ...formData, validity_days: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Discount %"
              type="number"
              value={formData.discount_percent || ''}
              onChange={(e) => setFormData({ ...formData, discount_percent: Number(e.target.value) })}
            />
            <Input
              label="Trial (minutes)"
              type="number"
              value={formData.trial_minutes || ''}
              onChange={(e) => setFormData({ ...formData, trial_minutes: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Credits"
              type="number"
              value={formData.credits || ''}
              onChange={(e) => setFormData({ ...formData, credits: e.target.value ? Number(e.target.value) : null })}
              placeholder="Optional"
            />
            <Input
              label="Reason *"
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Why are you setting this pricing?"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={creating}>
              Create Pricing
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
