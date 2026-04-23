'use client';

import { useState, useEffect, useCallback } from 'react';
import usePermission from '@/hooks/usePermission';
import { useToast } from '@/context/ToastContext';
import trialService, { ExtraTrialRequestItem } from '@/services/trialService';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { Clock, CheckCircle, XCircle, AlertCircle, User, UserCircle, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export default function TrialRequestsPage() {
  const { can } = usePermission();
  const { showToast } = useToast();
  const canUpdateTrial = can('trial', 'update');
  const [requests, setRequests] = useState<ExtraTrialRequestItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<ExtraTrialRequestItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [approveModal, setApproveModal] = useState<ExtraTrialRequestItem | null>(null);
  const [rejectModal, setRejectModal] = useState<ExtraTrialRequestItem | null>(null);
  const [approvedMinutes, setApprovedMinutes] = useState(5);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadRequests = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await trialService.getExtraRequests({
        status: activeTab || undefined,
        page,
        limit: 15,
      });
      setRequests(data.requests);
      setMeta({
        total: data.total,
        page: data.page,
        limit: data.limit,
        pages: Math.ceil(data.total / data.limit),
      });
    } catch {
      showToast('Failed to load trial requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadRequests(1); }, [loadRequests]);

  const loadRequestDetail = async (requestId: number) => {
    try {
      setDetailLoading(true);
      const detail = await trialService.getExtraRequestDetail(requestId);
      setSelectedRequest(detail?.request || detail?.data || detail);
    } catch (e: any) {
      showToast(e?.message || 'Failed to load request detail', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approveModal) return;
    if (approvedMinutes < 1) {
      showToast('Enter at least 1 minute', 'error');
      return;
    }
    try {
      setActionLoading(true);
      await trialService.approveRequest(approveModal.request_id, approvedMinutes);
      showToast(`Approved! ${approvedMinutes} minutes added to ${approveModal.user_name}`, 'success');
      setApproveModal(null);
      setApprovedMinutes(5);
      loadRequests(meta.page);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Approval failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (rejectionReason.trim().length < 5) {
      showToast('Reason must be at least 5 characters', 'error');
      return;
    }
    try {
      setActionLoading(true);
      await trialService.rejectRequest(rejectModal.request_id, rejectionReason.trim());
      showToast(`Request rejected`, 'success');
      setRejectModal(null);
      setRejectionReason('');
      loadRequests(meta.page);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Rejection failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const canApproveRequest = (request: ExtraTrialRequestItem) =>
    request.action_eligibility?.can_approve ?? request.status === 'pending';

  const canRejectRequest = (request: ExtraTrialRequestItem) =>
    request.action_eligibility?.can_reject ?? request.status === 'pending';

  const pendingCount = activeTab === 'pending' ? meta.total : null;

  return (
    <div className="px-6 md:px-10 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Trial Requests</h1>
        <p className="text-sm text-gray-500">Manage extra trial minute requests from users</p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.key === 'pending' && meta.total > 0 && activeTab === 'pending' && (
              <span className="ml-1.5 bg-yellow-100 text-yellow-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {meta.total}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              Loading...
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <AlertCircle size={36} className="mb-3 opacity-40" />
              <p className="text-sm">No {activeTab || ''} requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Avatar</th>
                    <th className="px-4 py-3 text-center font-medium">Requested</th>
                    <th className="px-4 py-3 text-left font-medium">Reason</th>
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-center font-medium">View</th>
                    {canUpdateTrial && (activeTab === 'pending' || activeTab === '') ? (
                      <th className="px-4 py-3 text-center font-medium">Action</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.request_id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{req.user_name}</p>
                            <p className="text-xs text-gray-400">{req.user_email}</p>
                            <p className="text-[11px] text-gray-400 capitalize">{req.requester?.user_type || req.user_type || 'user'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <UserCircle size={14} className="text-purple-500" />
                          <span className="text-gray-700">{req.avatar_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-gray-800">
                          <Clock size={13} className="text-indigo-400" />
                          {req.requested_minutes} min
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed">{req.reason}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {fmtDate(req.created_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[req.status] || 'bg-gray-100 text-gray-600'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => loadRequestDetail(req.request_id)}
                          className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          <Eye size={12} />
                          View
                        </button>
                      </td>
                      {canUpdateTrial && (activeTab === 'pending' || activeTab === '') && (
                        <td className="px-4 py-3 text-center">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                disabled={!canApproveRequest(req)}
                                onClick={() => { setApproveModal(req); setApprovedMinutes(req.requested_minutes); }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button
                                disabled={!canRejectRequest(req)}
                                onClick={() => setRejectModal(req)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-gray-600">
              <span>{meta.total} total requests</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={meta.page <= 1}
                  onClick={() => loadRequests(meta.page - 1)}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs">Page {meta.page} of {meta.pages}</span>
                <button
                  disabled={meta.page >= meta.pages}
                  onClick={() => loadRequests(meta.page + 1)}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {approveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setApproveModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={18} className="text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Approve Request</h2>
              </div>
              <button onClick={() => setApproveModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-1">
              <p><span className="text-gray-500">User:</span> <span className="font-medium">{approveModal.user_name}</span></p>
              <p><span className="text-gray-500">Avatar:</span> <span className="font-medium">{approveModal.avatar_name}</span></p>
              <p><span className="text-gray-500">Requested:</span> <span className="font-medium">{approveModal.requested_minutes} min</span></p>
              <p className="text-gray-600 italic text-xs mt-1">"{approveModal.reason}"</p>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minutes to Grant <span className="text-gray-400 font-normal">(you decide)</span>
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={approvedMinutes}
              onChange={(e) => setApprovedMinutes(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 mb-5"
            />

            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {actionLoading ? 'Approving...' : `Approve ${approvedMinutes} min`}
              </Button>
              <Button
                onClick={() => setApproveModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRejectModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle size={18} className="text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Reject Request</h2>
              </div>
              <button onClick={() => setRejectModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-1">
              <p><span className="text-gray-500">User:</span> <span className="font-medium">{rejectModal.user_name}</span></p>
              <p><span className="text-gray-500">Requested:</span> <span className="font-medium">{rejectModal.requested_minutes} min</span></p>
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Rejection
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Let the user know why their request was rejected..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none mb-5"
            />

            <div className="flex gap-2">
              <Button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Request'}
              </Button>
              <Button
                onClick={() => setRejectModal(null)}
                className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Trial Request Details"
      >
        {detailLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading request details...</div>
        ) : selectedRequest ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Requester</p>
                <p className="mt-1 font-medium text-gray-900">{selectedRequest.requester?.name || selectedRequest.user_name}</p>
                <p className="text-gray-500">{selectedRequest.requester?.email || selectedRequest.user_email}</p>
                <p className="text-gray-500">{selectedRequest.requester?.phone || '-'}</p>
                <p className="mt-1 capitalize text-gray-500">{selectedRequest.requester?.user_type || selectedRequest.user_type || 'user'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Request Meta</p>
                <p className="mt-1 text-gray-900">Avatar: {selectedRequest.avatar_name}</p>
                <p className="text-gray-900">Requested Minutes: {selectedRequest.requested_minutes}</p>
                <p className="text-gray-900">Created: {fmtDate(selectedRequest.created_at)}</p>
                <p className="text-gray-900">Updated: {selectedRequest.updated_at ? fmtDate(selectedRequest.updated_at) : '-'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Reason</p>
              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 px-3 py-3 text-gray-700">{selectedRequest.reason || '-'}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border px-3 py-3">
                <p className="text-xs text-gray-500">Status</p>
                <p className="mt-1 capitalize text-gray-900">{selectedRequest.status}</p>
              </div>
              <div className="rounded-lg border px-3 py-3">
                <p className="text-xs text-gray-500">Can Approve</p>
                <p className="mt-1 text-gray-900">{canApproveRequest(selectedRequest) ? 'Yes' : 'No'}</p>
              </div>
              <div className="rounded-lg border px-3 py-3">
                <p className="text-xs text-gray-500">Can Reject</p>
                <p className="mt-1 text-gray-900">{canRejectRequest(selectedRequest) ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
