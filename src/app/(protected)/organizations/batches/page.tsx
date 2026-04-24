'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Layers3, Plus, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import OrganizationAdminHeader from '@/components/organization/admin/OrganizationAdminHeader';
import { useToast } from '@/context/ToastContext';
import { avatarsService, type Avatar } from '@/services/avatarsService';
import organizationAdminService, {
  type BatchPayload,
  type OrganizationBatchMemberRecord,
  type OrganizationBatchRecord,
  type OrganizationItem,
  type OrganizationMemberRecord,
} from '@/services/organizationAdminService';

type BatchFormState = {
  name: string;
  description: string;
  schedule_days: string;
  schedule_time: string;
  duration_minutes: string;
  avatar_id: string;
  course_id: string;
  status: string;
};

const DEFAULT_BATCH_FORM: BatchFormState = {
  name: '',
  description: '',
  schedule_days: 'MON,TUE,WED,THU,FRI',
  schedule_time: '10:00',
  duration_minutes: '60',
  avatar_id: '',
  course_id: '',
  status: '1',
};

const SCHEDULE_PRESETS = [
  { label: 'Weekdays', value: 'MON,TUE,WED,THU,FRI' },
  { label: 'Daily', value: 'DAILY' },
  { label: 'Weekend', value: 'SAT,SUN' },
];

const normalizeTimeInput = (value?: string | null) => {
  if (!value) return '10:00';
  return value.slice(0, 5);
};

const toNullableNumber = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatMemberName = (member: OrganizationMemberRecord) =>
  member.user?.username || member.user?.email || `Member #${member.id}`;

const buildBatchPayload = (form: BatchFormState): BatchPayload => ({
  name: form.name.trim(),
  description: form.description.trim() || null,
  schedule_days: form.schedule_days.trim(),
  schedule_time: form.schedule_time,
  duration_minutes: Number(form.duration_minutes) || 60,
  avatar_id: toNullableNumber(form.avatar_id),
  course_id: toNullableNumber(form.course_id),
  status: Number(form.status) || 1,
});

const buildBatchForm = (batch?: OrganizationBatchRecord | null): BatchFormState => {
  if (!batch) return DEFAULT_BATCH_FORM;
  return {
    name: batch.name || '',
    description: batch.description || '',
    schedule_days: batch.schedule_days || 'MON,TUE,WED,THU,FRI',
    schedule_time: normalizeTimeInput(batch.schedule_time),
    duration_minutes: String(batch.duration_minutes || 60),
    avatar_id: batch.avatar_id ? String(batch.avatar_id) : '',
    course_id: batch.course_id ? String(batch.course_id) : '',
    status: String(batch.status ?? 1),
  };
};

export default function OrganizationBatchesAdminPage() {
  const { showToast } = useToast();
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [members, setMembers] = useState<OrganizationMemberRecord[]>([]);
  const [batches, setBatches] = useState<OrganizationBatchRecord[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<OrganizationBatchRecord | null>(null);
  const [batchMembers, setBatchMembers] = useState<OrganizationBatchMemberRecord[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [formState, setFormState] = useState<BatchFormState>(DEFAULT_BATCH_FORM);
  const [editingBatch, setEditingBatch] = useState<OrganizationBatchRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<OrganizationBatchRecord | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [orgs, avatarResponse] = await Promise.all([
          organizationAdminService.listOrganizations({ limit: 1000, skip: 0 }),
          avatarsService.list({ page: 1, limit: 200 }),
        ]);
        setOrganizations(orgs);
        setSelectedOrganizationId((current) => current ?? orgs[0]?.id ?? null);
        setAvatars(avatarResponse.data ?? []);
      } catch (error: any) {
        showToast(error?.message || 'Unable to load organization batch settings.', 'error');
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, [showToast]);

  useEffect(() => {
    if (!selectedOrganizationId) {
      setBatches([]);
      setMembers([]);
      return;
    }

    const loadOrganizationData = async () => {
      try {
        setIsLoading(true);
        const [nextBatches, nextMembers] = await Promise.all([
          organizationAdminService.listBatches(selectedOrganizationId),
          organizationAdminService.listMembers(selectedOrganizationId),
        ]);
        setBatches(nextBatches);
        setMembers(nextMembers);
      } catch (error: any) {
        showToast(error?.message || 'Unable to load batches for the selected organization.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrganizationData();
  }, [selectedOrganizationId, showToast]);

  const avatarMap = useMemo(() => new Map(avatars.map((avatar) => [avatar.id, avatar])), [avatars]);
  const memberMap = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const sortedBatches = useMemo(
    () =>
      [...batches].sort((a, b) => {
        const left = Date.parse(a.created_at || '') || 0;
        const right = Date.parse(b.created_at || '') || 0;
        return right - left;
      }),
    [batches]
  );

  const enrolledMemberIds = useMemo(() => new Set(batchMembers.map((member) => member.member_id)), [batchMembers]);

  const availableMembers = useMemo(
    () => members.filter((member) => !enrolledMemberIds.has(member.id) && member.status === 1),
    [members, enrolledMemberIds]
  );

  const loadBatchMembers = async (batch: OrganizationBatchRecord) => {
    if (!selectedOrganizationId) return;

    try {
      setIsMembersLoading(true);
      const records = await organizationAdminService.listBatchMembers(selectedOrganizationId, batch.id);
      setBatchMembers(records);
      setSelectedBatch(batch);
    } catch (error: any) {
      showToast(error?.message || 'Unable to load batch members.', 'error');
    } finally {
      setIsMembersLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingBatch(null);
    setFormState(DEFAULT_BATCH_FORM);
    setIsFormOpen(true);
  };

  const openEditModal = (batch: OrganizationBatchRecord) => {
    setEditingBatch(batch);
    setFormState(buildBatchForm(batch));
    setIsFormOpen(true);
  };

  const handleBatchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOrganizationId) return;
    if (!formState.name.trim()) {
      showToast('Batch name is required.', 'error');
      return;
    }
    if (!formState.schedule_days.trim()) {
      showToast('Schedule days are required.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const payload = buildBatchPayload(formState);
      if (editingBatch) {
        await organizationAdminService.updateBatch(selectedOrganizationId, editingBatch.id, payload);
        showToast('Batch updated successfully.', 'success');
      } else {
        const { status: _unusedStatus, ...createPayload } = payload;
        await organizationAdminService.createBatch(selectedOrganizationId, createPayload);
        showToast('Batch created successfully.', 'success');
      }
      setIsFormOpen(false);
      setEditingBatch(null);
      setFormState(DEFAULT_BATCH_FORM);
      setBatches(await organizationAdminService.listBatches(selectedOrganizationId));
    } catch (error: any) {
      showToast(error?.message || 'Unable to save batch.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBatch = async () => {
    if (!selectedOrganizationId || !batchToDelete) return;

    try {
      setIsSaving(true);
      await organizationAdminService.deleteBatch(selectedOrganizationId, batchToDelete.id);
      showToast('Batch deleted successfully.', 'success');
      setBatchToDelete(null);
      setBatches(await organizationAdminService.listBatches(selectedOrganizationId));
    } catch (error: any) {
      showToast(error?.message || 'Unable to delete batch.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSelectedMembers = async () => {
    if (!selectedOrganizationId || !selectedBatch) return;
    if (selectedMemberIds.length === 0) {
      showToast('Select at least one member to enroll.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      await organizationAdminService.addBatchMembersBulk(selectedOrganizationId, selectedBatch.id, selectedMemberIds);
      showToast('Selected members enrolled successfully.', 'success');
      setSelectedMemberIds([]);
      await loadBatchMembers(selectedBatch);
    } catch (error: any) {
      showToast(error?.message || 'Unable to enroll selected members.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveBatchMember = async (batchMemberId: number) => {
    if (!selectedOrganizationId || !selectedBatch) return;

    try {
      setIsSaving(true);
      await organizationAdminService.removeBatchMember(selectedOrganizationId, selectedBatch.id, batchMemberId);
      showToast('Member removed from batch.', 'success');
      await loadBatchMembers(selectedBatch);
    } catch (error: any) {
      showToast(error?.message || 'Unable to remove member from batch.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const stats = [
    { label: 'Total batches', value: batches.length },
    { label: 'Active batches', value: batches.filter((batch) => batch.status === 1).length },
    { label: 'Members available', value: members.length },
  ];

  return (
    <div className="space-y-6 p-6">
      <OrganizationAdminHeader
        title="Organization Batches"
        description="Create, update, and manage learning batches for each organization, then enroll members into the right schedule."
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={(value) => setSelectedOrganizationId(value)}
        stats={stats}
        actions={
          <Button className="gap-2 rounded-2xl" onClick={openCreateModal} disabled={!selectedOrganizationId}>
            <Plus size={16} />
            Create Batch
          </Button>
        }
      />

      {isBootstrapping || isLoading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        </div>
      ) : !selectedOrganizationId ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          No organizations available for batch management.
        </div>
      ) : sortedBatches.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500">
          No batches created for this organization yet.
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {sortedBatches.map((batch) => {
            const avatarName = batch.avatar_id ? avatarMap.get(batch.avatar_id)?.avatar_name : null;
            return (
              <article
                key={batch.id}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">{batch.name}</h2>
                    <p className="max-w-2xl text-sm leading-6 text-slate-500">
                      {batch.description || 'Batch schedule ready for organization learners.'}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${batch.status === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {batch.status === 1 ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <CalendarDays size={14} />
                      Schedule
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{batch.schedule_days}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Clock3 size={14} />
                      Time & Duration
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {normalizeTimeInput(batch.schedule_time)} • {batch.duration_minutes} mins
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Layers3 size={14} />
                      Avatar
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{avatarName || 'Not assigned'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <Users size={14} />
                      Course / Created
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {batch.course_id ? `Course #${batch.course_id}` : 'No course'} • {formatDateTime(batch.created_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setIsMembersOpen(true);
                      setSelectedMemberIds([]);
                      await loadBatchMembers(batch);
                    }}
                  >
                    Manage Members
                  </Button>
                  <Button variant="outline" onClick={() => openEditModal(batch)}>Edit</Button>
                  <Button variant="danger" onClick={() => setBatchToDelete(batch)}>Delete</Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBatch(null);
          setFormState(DEFAULT_BATCH_FORM);
        }}
        title={editingBatch ? 'Edit Batch' : 'Create Batch'}
        size="lg"
      >
        <form onSubmit={handleBatchSubmit} className="space-y-5">
          <Input
            label="Batch Name"
            required
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
            placeholder="Enter a batch name"
          />
          <Textarea
            label="Description"
            value={formState.description}
            onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
            placeholder="Write a short summary about this batch."
          />

          <div className="space-y-2">
            <Input
              label="Schedule Days"
              required
              value={formState.schedule_days}
              onChange={(event) => setFormState((current) => ({ ...current, schedule_days: event.target.value }))}
              placeholder="Example: MON,TUE,WED or DAILY"
              hint="Use comma-separated day codes like MON,TUE,WED or DAILY."
            />
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setFormState((current) => ({ ...current, schedule_days: preset.value }))}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Schedule Time"
              type="time"
              required
              value={formState.schedule_time}
              onChange={(event) => setFormState((current) => ({ ...current, schedule_time: event.target.value }))}
            />
            <Input
              label="Duration (minutes)"
              type="number"
              min={15}
              max={480}
              required
              value={formState.duration_minutes}
              onChange={(event) => setFormState((current) => ({ ...current, duration_minutes: event.target.value }))}
              placeholder="60"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Avatar"
              options={[
                { value: '', label: 'No avatar assigned' },
                ...avatars.map((avatar) => ({
                  value: avatar.id,
                  label: avatar.avatar_name || `Avatar ${avatar.id}`,
                })),
              ]}
              value={formState.avatar_id}
              onChange={(value) => setFormState((current) => ({ ...current, avatar_id: String(value) }))}
            />
            <Input
              label="Course ID"
              type="number"
              value={formState.course_id}
              onChange={(event) => setFormState((current) => ({ ...current, course_id: event.target.value }))}
              placeholder="Optional course ID"
              hint="Keep empty if this batch is not tied to a specific course."
            />
          </div>

          {editingBatch ? (
            <Select
              label="Status"
              options={[
                { value: 1, label: 'Active' },
                { value: 0, label: 'Inactive' },
              ]}
              value={Number(formState.status)}
              onChange={(value) => setFormState((current) => ({ ...current, status: String(value) }))}
            />
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsFormOpen(false);
                setEditingBatch(null);
                setFormState(DEFAULT_BATCH_FORM);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {editingBatch ? 'Save Changes' : 'Create Batch'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isMembersOpen}
        onClose={() => {
          setIsMembersOpen(false);
          setSelectedBatch(null);
          setBatchMembers([]);
          setSelectedMemberIds([]);
        }}
        title={selectedBatch ? `Manage Members • ${selectedBatch.name}` : 'Manage Members'}
        size="xl"
      >
        {selectedBatch ? (
          isMembersLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Enrolled Members</h3>
                    <p className="mt-1 text-sm text-slate-500">Review everyone currently assigned to this batch.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {batchMembers.length}
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {batchMembers.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                      No members enrolled yet.
                    </p>
                  ) : (
                    batchMembers.map((batchMember) => {
                      const member = memberMap.get(batchMember.member_id);
                      return (
                        <div
                          key={batchMember.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {member ? formatMemberName(member) : `Member #${batchMember.member_id}`}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {member?.user?.email || `Batch member added on ${formatDateTime(batchMember.added_at)}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleRemoveBatchMember(batchMember.id)}
                            isLoading={isSaving}
                          >
                            Remove
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Available Members</h3>
                    <p className="mt-1 text-sm text-slate-500">Select active organization members to enroll in bulk.</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {availableMembers.length}
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {availableMembers.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                      All active members are already enrolled.
                    </p>
                  ) : (
                    availableMembers.map((member) => {
                      const checked = selectedMemberIds.includes(member.id);
                      return (
                        <label
                          key={member.id}
                          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/40"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setSelectedMemberIds((current) =>
                                event.target.checked
                                  ? [...current, member.id]
                                  : current.filter((value) => value !== member.id)
                              );
                            }}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{formatMemberName(member)}</p>
                            <p className="truncate text-xs text-slate-500">{member.user?.email || 'No email available'}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{member.role}</p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="mt-5 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedMemberIds([])}
                    disabled={selectedMemberIds.length === 0 || isSaving}
                  >
                    Clear
                  </Button>
                  <Button onClick={handleAddSelectedMembers} isLoading={isSaving} disabled={selectedMemberIds.length === 0}>
                    Add Selected Members
                  </Button>
                </div>
              </section>
            </div>
          )
        ) : null}
      </Modal>

      <Modal
        isOpen={Boolean(batchToDelete)}
        onClose={() => setBatchToDelete(null)}
        title="Delete Batch"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            {batchToDelete
              ? `Delete ${batchToDelete.name}? This only removes the batch record and does not change the organization itself.`
              : 'Are you sure?'}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setBatchToDelete(null)}>Cancel</Button>
            <Button variant="danger" isLoading={isSaving} onClick={handleDeleteBatch}>Delete Batch</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
