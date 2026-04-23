import api from '@/lib/api';

export interface ExtraTrialRequestItem {
  request_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_type?: string;
  avatar_id: number;
  avatar_name: string;
  requested_minutes: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at?: string;
  requester?: {
    id?: number;
    name?: string;
    email?: string;
    phone?: string;
    user_type?: string;
  };
  action_eligibility?: {
    can_approve?: boolean;
    can_reject?: boolean;
    can_view?: boolean;
  };
}

export interface ExtraTrialListResponse {
  requests: ExtraTrialRequestItem[];
  total: number;
  page: number;
  limit: number;
}

const trialService = {
  getUserExtraRequests: (params: { status?: string; page?: number; limit?: number }) =>
    api
      .get('/trial/extra-requests', { params })
      .then((r) => r.data),

  getUserExtraRequestDetail: (requestId: number) =>
    api
      .get(`/trial/extra-requests/${requestId}`)
      .then((r) => r.data),

  getExtraRequests: (params: { status?: string; page?: number; limit?: number }) =>
    api
      .get<ExtraTrialListResponse>('/admin/trial/extra-requests', { params })
      .then((r) => r.data),

  getExtraRequestDetail: (requestId: number) =>
    api
      .get(`/admin/trial/extra-requests/${requestId}`)
      .then((r) => r.data),

  approveRequest: (requestId: number, approvedMinutes: number) =>
    api
      .post(`/admin/trial/extra-requests/${requestId}/approve`, {
        approved_minutes: approvedMinutes,
      })
      .then((r) => r.data),

  rejectRequest: (requestId: number, rejectionReason: string) =>
    api
      .post(`/admin/trial/extra-requests/${requestId}/reject`, {
        rejection_reason: rejectionReason,
      })
      .then((r) => r.data),
};

export default trialService;
