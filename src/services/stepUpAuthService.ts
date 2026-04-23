import api from '@/lib/api';

export type StepUpPurpose = 'ip_reauth' | 'password_change';
export type StepUpAuditPurpose = 'password_change' | 'ip_create' | 'ip_update' | 'ip_delete';

export interface SendStepUpOtpResponse {
  message: string;
  expires_in: number;
}

export interface VerifyStepUpOtpResponse {
  verified: boolean;
  reauth_token: string;
  expires_in: number;
}

export interface SendStepUpOtpPayload {
  action_purpose?: StepUpAuditPurpose;
  target_ip?: string;
  step_up_scope?: string;
}

const stepUpAuthService = {
  async sendOtp(
    purpose: StepUpPurpose,
    payload?: SendStepUpOtpPayload
  ): Promise<SendStepUpOtpResponse> {
    const res = await api.post('/auth/otp/send', {
      purpose,
      ...payload,
    });
    return res.data;
  },

  async verifyOtp(purpose: StepUpPurpose, otp: string): Promise<VerifyStepUpOtpResponse> {
    const res = await api.post('/auth/otp/verify', { purpose, otp });
    return res.data;
  },
};

export default stepUpAuthService;
