'use client';

import { useEffect, useMemo, useState } from 'react';
import stepUpAuthService, {
  SendStepUpOtpPayload,
  StepUpPurpose,
} from '@/services/stepUpAuthService';

interface BeginVerificationOptions {
  purpose: StepUpPurpose;
  title: string;
  description: string;
  email: string;
  sendPayload?: SendStepUpOtpPayload;
  onVerified: (token: string) => Promise<void> | void;
}

interface StoredTokenState {
  token: string;
  expiresAt: number;
}

export default function useOtpStepUpAuth() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasSentOtp, setHasSentOtp] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [activeConfig, setActiveConfig] = useState<BeginVerificationOptions | null>(null);
  const [storedTokens, setStoredTokens] = useState<Partial<Record<StepUpPurpose, StoredTokenState>>>({});
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    if (!activeConfig && resendAvailableAt <= Date.now()) return;
    const interval = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeConfig, resendAvailableAt]);

  const resendInSeconds = useMemo(
    () => Math.max(0, Math.ceil((resendAvailableAt - nowTick) / 1000)),
    [nowTick, resendAvailableAt]
  );

  const getToken = (purpose: StepUpPurpose) => {
    const tokenState = storedTokens[purpose];
    if (!tokenState) return '';
    if (Date.now() >= tokenState.expiresAt) return '';
    return tokenState.token;
  };

  const hasValidToken = (purpose: StepUpPurpose) => !!getToken(purpose);

  const closeModal = () => {
    setActiveConfig(null);
    setOtp('');
    setError('');
    setLoading(false);
    setSending(false);
    setHasSentOtp(false);
    setResendAvailableAt(0);
  };

  const sendOtp = async (purpose: StepUpPurpose, payload?: SendStepUpOtpPayload) => {
    const response = await stepUpAuthService.sendOtp(purpose, payload);
    const resendLockMs = 60 * 1000;
    setResendAvailableAt(Date.now() + resendLockMs);
    return response;
  };

  const beginVerification = async (config: BeginVerificationOptions) => {
    setActiveConfig(config);
    setOtp('');
    setError('');
    setHasSentOtp(false);
    setResendAvailableAt(0);
    setError('');
    setSending(true);
    try {
      await sendOtp(config.purpose, config.sendPayload);
      setHasSentOtp(true);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
      setActiveConfig(null);
      throw err;
    } finally {
      setSending(false);
    }
  };

  const resendOtp = async () => {
    if (!activeConfig || resendInSeconds > 0) return;
    setError('');
    setSending(true);
    try {
      await sendOtp(activeConfig.purpose, activeConfig.sendPayload);
      setHasSentOtp(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to resend OTP');
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!activeConfig || otp.length !== 6) return;
    const currentConfig = activeConfig;
    setLoading(true);
    setError('');
    try {
      const response = await stepUpAuthService.verifyOtp(currentConfig.purpose, otp);
      const expiresAt = Date.now() + response.expires_in * 1000;
      setStoredTokens((current) => ({
        ...current,
        [currentConfig.purpose]: {
          token: response.reauth_token,
          expiresAt,
        },
      }));

      closeModal();
      await currentConfig.onVerified(response.reauth_token);
    } catch (err: any) {
      setError(err?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    modalState: {
      isOpen: !!activeConfig,
      title: activeConfig?.title || 'Verify OTP',
      description: activeConfig?.description || '',
      email: activeConfig?.email || '',
      otp,
      error,
      hasSentOtp,
      resendInSeconds,
      loading,
      sending,
    },
    setOtp,
    beginVerification,
    verifyOtp,
    resendOtp,
    closeModal,
    getToken,
    hasValidToken,
  };
}
