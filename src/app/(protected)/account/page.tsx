// 'use client';

// import { useState, useEffect } from 'react';
// import { useToast } from '@/context/ToastContext';
// import profileService, { ProfileData } from '@/services/profileService';
// import { User, Lock, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';

// const GENDER_OPTIONS = [
//   { value: '', label: 'Select gender' },
//   { value: 'male', label: 'Male' },
//   { value: 'female', label: 'Female' },
//   { value: 'other', label: 'Other' },
// ];

// export default function AccountPage() {
//   const { showToast } = useToast();

//   const [profile, setProfile] = useState<ProfileData | null>(null);
//   const [loading, setLoading] = useState(true);

//   const [profileForm, setProfileForm] = useState({
//     first_name: '',
//     last_name: '',
//     email: '',
//     phone: '',
//     gender: '',
//   });
//   const [savingProfile, setSavingProfile] = useState(false);

//   const [pwForm, setPwForm] = useState({
//     current_password: '',
//     new_password: '',
//     confirm_password: '',
//   });
//   const [showCurrent, setShowCurrent] = useState(false);
//   const [showNew, setShowNew] = useState(false);
//   const [showConfirm, setShowConfirm] = useState(false);
//   const [savingPw, setSavingPw] = useState(false);

//   useEffect(() => {
//     const load = async () => {
//       try {
//         const data = await profileService.getProfile();
//         setProfile(data);
//         setProfileForm({
//           first_name: data.first_name || '',
//           last_name: data.last_name || '',
//           email: data.email || '',
//           phone: data.phone || '',
//           gender: data.gender || '',
//         });
//       } catch {
//         showToast('Failed to load profile', 'error');
//       } finally {
//         setLoading(false);
//       }
//     };
//     load();
//   }, []);

//   const passwordChecks = {
//     minLength: pwForm.new_password.length >= 8,
//     upper: /[A-Z]/.test(pwForm.new_password),
//     lower: /[a-z]/.test(pwForm.new_password),
//     number: /[0-9]/.test(pwForm.new_password),
//     special: /[^a-zA-Z0-9]/.test(pwForm.new_password),
//     differentFromCurrent:
//       !!pwForm.new_password &&
//       !!pwForm.current_password &&
//       pwForm.new_password !== pwForm.current_password,
//   };

//   const isStrongPassword = Object.values(passwordChecks).every(Boolean);

//   const handleProfileSave = async () => {
//     setSavingProfile(true);
//     try {
//       const updated = await profileService.updateProfile(profileForm);
//       setProfile(updated);
//       showToast('Profile updated successfully', 'success');
//     } catch (err: any) {
//       showToast(err?.response?.data?.detail || 'Failed to update profile', 'error');
//     } finally {
//       setSavingProfile(false);
//     }
//   };

//   const handlePasswordChange = async () => {
//     if (!pwForm.current_password || !pwForm.new_password || !pwForm.confirm_password) {
//       showToast('Please fill all password fields', 'error');
//       return;
//     }
//     if (pwForm.new_password !== pwForm.confirm_password) {
//       showToast('New password and confirm password do not match', 'error');
//       return;
//     }
//     if (!isStrongPassword) {
//       showToast('Please choose a stronger password that meets all requirements', 'error');
//       return;
//     }
//     setSavingPw(true);
//     try {
//       await profileService.changePassword({
//         current_password: pwForm.current_password,
//         new_password: pwForm.new_password,
//       });
//       showToast('Password changed successfully', 'success');
//       setPwForm({ current_password: '', new_password: '', confirm_password: '' });
//     } catch (err: any) {
//       showToast(err?.response?.data?.detail || 'Failed to change password', 'error');
//     } finally {
//       setSavingPw(false);
//     }
//   };

//   const pwStrength = (pw: string) => {
//     if (!pw) return null;
//     if (pw.length < 8) return { label: 'Too short', color: 'bg-red-400', w: 'w-1/4' };
//     if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) return { label: 'Weak', color: 'bg-orange-400', w: 'w-2/4' };
//     if (/[A-Z]/.test(pw) && /[0-9]/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) return { label: 'Strong', color: 'bg-green-500', w: 'w-full' };
//     return { label: 'Medium', color: 'bg-yellow-400', w: 'w-3/4' };
//   };

//   const strength = pwStrength(pwForm.new_password);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center py-20">
//         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
//       <div>
//         <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
//         <p className="text-gray-500 text-sm mt-1">Manage your profile and security settings</p>
//       </div>

//       {/* Profile Info Banner */}
//       <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
//         <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
//           <span className="text-primary-700 text-xl font-bold">
//             {(profile?.first_name?.[0] || profile?.username?.[0] || '?').toUpperCase()}
//           </span>
//         </div>
//         <div>
//           <p className="font-semibold text-gray-900 text-lg">
//             {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username}
//           </p>
//           <p className="text-sm text-gray-400">@{profile?.username}</p>
//         </div>
//       </div>

//       {/* Profile Update Form */}
//       <div className="bg-white rounded-xl border overflow-hidden">
//         <div className="px-5 py-4 border-b flex items-center gap-2">
//           <User size={16} className="text-blue-600" />
//           <h2 className="font-semibold text-gray-800">Profile Information</h2>
//         </div>
//         <div className="p-5 space-y-4">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
//               <input
//                 type="text"
//                 className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
//                 value={profileForm.first_name}
//                 onChange={(e) => setProfileForm((f) => ({ ...f, first_name: e.target.value }))}
//                 placeholder="Enter first name"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
//               <input
//                 type="text"
//                 className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
//                 value={profileForm.last_name}
//                 onChange={(e) => setProfileForm((f) => ({ ...f, last_name: e.target.value }))}
//                 placeholder="Enter last name"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
//               <input
//                 type="email"
//                 className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
//                 value={profileForm.email}
//                 onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
//                 placeholder="Enter email"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
//               <input
//                 type="tel"
//                 className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
//                 value={profileForm.phone}
//                 onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
//                 placeholder="Enter phone number"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
//               <select
//                 className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
//                 value={profileForm.gender}
//                 onChange={(e) => setProfileForm((f) => ({ ...f, gender: e.target.value }))}
//               >
//                 {GENDER_OPTIONS.map((o) => (
//                   <option key={o.value} value={o.value}>{o.label}</option>
//                 ))}
//               </select>
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
//               <input
//                 type="text"
//                 className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
//                 value={profile?.username || ''}
//                 disabled
//               />
//             </div>
//           </div>
//           <div className="flex justify-end pt-1">
//             <button
//               onClick={handleProfileSave}
//               disabled={savingProfile}
//               className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
//             >
//               <Save size={15} />
//               {savingProfile ? 'Saving…' : 'Save Profile'}
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Password Change Form */}
//       <div className="bg-white rounded-xl border overflow-hidden">
//         <div className="px-5 py-4 border-b flex items-center gap-2">
//           <Lock size={16} className="text-orange-600" />
//           <h2 className="font-semibold text-gray-800">Change Password</h2>
//         </div>
//         <div className="p-5 space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
//             <div className="relative">
//               <input
//                 type={showCurrent ? 'text' : 'password'}
//                 className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
//                 value={pwForm.current_password}
//                 onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
//                 placeholder="Enter current password"
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowCurrent((v) => !v)}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
//               >
//                 {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
//               </button>
//             </div>
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
//             <div className="relative">
//               <input
//                 type={showNew ? 'text' : 'password'}
//                 className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
//                 value={pwForm.new_password}
//                 onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
//                 placeholder="Enter new password"
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowNew((v) => !v)}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
//               >
//                 {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
//               </button>
//             </div>
//             {strength && (
//               <div className="mt-1.5 space-y-1">
//                 <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
//                   <div className={`h-full ${strength.color} ${strength.w} transition-all`} />
//                 </div>
//                 <p className={`text-xs font-medium ${
//                   strength.label === 'Strong' ? 'text-green-600' :
//                   strength.label === 'Medium' ? 'text-yellow-600' : 'text-red-500'
//                 }`}>{strength.label}</p>
//               </div>
//             )}
//             <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-500 sm:grid-cols-2">
//               <p className={passwordChecks.minLength ? 'text-green-600' : ''}>At least 8 characters</p>
//               <p className={passwordChecks.upper ? 'text-green-600' : ''}>One uppercase letter</p>
//               <p className={passwordChecks.lower ? 'text-green-600' : ''}>One lowercase letter</p>
//               <p className={passwordChecks.number ? 'text-green-600' : ''}>One number</p>
//               <p className={passwordChecks.special ? 'text-green-600' : ''}>One special character</p>
//               <p className={passwordChecks.differentFromCurrent ? 'text-green-600' : ''}>Different from current password</p>
//             </div>
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
//             <div className="relative">
//               <input
//                 type={showConfirm ? 'text' : 'password'}
//                 className={`w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-1 ${
//                   pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password
//                     ? 'border-red-300 focus:ring-red-400'
//                     : pwForm.confirm_password && pwForm.new_password === pwForm.confirm_password
//                     ? 'border-green-300 focus:ring-green-400'
//                     : 'border-gray-300 focus:ring-primary-500'
//                 }`}
//                 value={pwForm.confirm_password}
//                 onChange={(e) => setPwForm((f) => ({ ...f, confirm_password: e.target.value }))}
//                 placeholder="Confirm new password"
//               />
//               <button
//                 type="button"
//                 onClick={() => setShowConfirm((v) => !v)}
//                 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
//               >
//                 {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
//               </button>
//               {pwForm.confirm_password && pwForm.new_password === pwForm.confirm_password && (
//                 <CheckCircle size={14} className="absolute right-9 top-1/2 -translate-y-1/2 text-green-500" />
//               )}
//             </div>
//             {pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password && (
//               <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
//             )}
//           </div>
//           <div className="flex justify-end pt-1">
//             <button
//               onClick={handlePasswordChange}
//               disabled={savingPw || !isStrongPassword || pwForm.new_password !== pwForm.confirm_password}
//               className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
//             >
//               <Lock size={15} />
//               {savingPw ? 'Updating…' : 'Update Password'}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
//
//
//-------------------------------------------------

'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/context/ToastContext';
import SecurityDropdown from './component/SecurityDropdown';
import profileService, { ProfileData } from '@/services/profileService';
import ChangePasswordModal from './component/ChangePasswordModal';
import EditProfileModal from './component/EditProfileModal';
import LogoutConfirmModal from './component/LogoutConfirmModal';
import OtpVerificationModal from '@/components/ui/OtpVerificationModal';
import useOtpStepUpAuth from '@/hooks/useOtpStepUpAuth';

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

type AccountAction =
  | 'editProfile'
  | 'changePassword'
  | 'logout'
  | null;

export default function AccountPage() {
  const { showToast } = useToast();
  const otpStepUp = useOtpStepUpAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [securityOpen, setSecurityOpen] = useState(false);
  const securityBtnRef = useRef<HTMLButtonElement | null>(null);
  const [activeAction, setActiveAction] = useState<AccountAction>(null);

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [pendingPasswordPayload, setPendingPasswordPayload] = useState<{
    current_password: string;
    new_password: string;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await profileService.getProfile();
        setProfile(data);
        setProfileForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          gender: data.gender || '',
        });
      } catch {
        showToast('Failed to load profile', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showToast]);

  const handleProfileSave = async () => {
    setSavingProfile(true);
    try {
      const updated = await profileService.updateProfile(profileForm);
      setProfile(updated);
      showToast('Profile updated successfully', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="relative min-h-[85vh] overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white px-6 py-16 flex justify-center">

    {/* Floating Background Glow */}
    <div className="pointer-events-none absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-indigo-200/30 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-40 -right-32 h-[420px] w-[420px] rounded-full bg-blue-200/30 blur-3xl" />

    <div className="w-full max-w-3xl relative">

      {/* Heading */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          My Account
        </h1>
        <p className="text-gray-500 text-sm mt-2">
          Manage profile, security & access preferences
        </p>
      </div>

      {/* HERO CARD */}
      <div className="group relative rounded-[32px] border border-gray-200/70 bg-gradient-to-b from-white to-gray-50 shadow-[0_30px_80px_rgba(0,0,0,0.08)] transition hover:shadow-[0_45px_110px_rgba(0,0,0,0.12)]">

        {/* top shine */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

        <div className="p-10 flex items-center justify-between">

          {/* LEFT */}
          <div className="flex items-center gap-6">

            {/* Avatar Glow */}
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-2xl scale-110 opacity-0 group-hover:opacity-100 transition" />

              <div className="relative h-24 w-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center text-3xl font-semibold shadow-xl ring-1 ring-white/50 transition group-hover:scale-105">
                {(profile?.first_name?.[0] || profile?.username?.[0] || '?').toUpperCase()}
              </div>
            </div>

            {/* User Info */}
            <div>
              <p className="text-2xl font-semibold text-gray-900 tracking-tight">
                {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username}
              </p>

              <p className="text-gray-500 text-sm mt-1">@{profile?.username}</p>

              <div className="mt-3 flex items-center gap-3">

                {/* Role */}
                <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-4 py-1.5 text-xs font-semibold ring-1 ring-indigo-100 shadow-sm">
                  {profile?.role || 'User'}
                </span>

                {/* Email */}
                {profile?.email && (
                  <span className="text-xs text-gray-400 font-medium">
                    {profile.email}
                  </span>
                )}

              </div>
            </div>

          </div>

          {/* RIGHT ACTION */}
          <button
            ref={securityBtnRef}
            onClick={() => setSecurityOpen(v => !v)}
            className="relative rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-1 hover:shadow-lg active:scale-[0.97]"
          >
            Security
          </button>

          <SecurityDropdown
            open={securityOpen}
            anchorRef={securityBtnRef}
            onClose={() => setSecurityOpen(false)}
            onEditProfile={() => {
              setSecurityOpen(false);
              setActiveAction('editProfile');
            }}
            onChangePassword={() => {
              setSecurityOpen(false);
              setActiveAction('changePassword');
            }}
            onLogout={() => {
              setSecurityOpen(false);
              setActiveAction('logout');
            }}
          />

          <LogoutConfirmModal
            open={activeAction === 'logout'}
            onClose={() => setActiveAction(null)}
            onConfirm={async () => {
              setActiveAction(null);
              // await logout();
            }}
          />

        </div>

      </div>

    </div>

    <EditProfileModal
      open={activeAction === 'editProfile'}
      onClose={() => setActiveAction(null)}
      profile={profile}
      initialForm={profileForm}
      onSubmit={async () => {
        await handleProfileSave();
      }}
    />

      <ChangePasswordModal
        open={activeAction === 'changePassword'}
        onClose={() => setActiveAction(null)}
        onSubmit={async (data) => {
          if (!profile?.email) {
            showToast('Registered email not found for OTP verification', 'error');
            throw new Error('Registered email not found');
          }
          setPendingPasswordPayload(data);
          try {
            await otpStepUp.beginVerification({
              purpose: 'password_change',
              email: profile.email,
              title: 'Verify Password Change OTP',
              description: 'Enter the OTP sent to your registered email to change your account password.',
              sendPayload: {
                action_purpose: 'password_change',
                step_up_scope: 'password_change',
              },
              onVerified: async (token) => {
                const payload = pendingPasswordPayload || data;
                try {
                  await profileService.changePassword({
                    ...payload,
                    reauth_token: token,
                  });
                } catch (error: any) {
                  showToast(error?.message || 'Password change failed', 'error');
                  return;
                }
                setPendingPasswordPayload(null);
                showToast('Password changed successfully', 'success');
              },
            });
            showToast('OTP sent to your registered email', 'success');
          } catch (error: any) {
            setPendingPasswordPayload(null);
            showToast(error?.message || 'Failed to send OTP for password change', 'error');
            throw error;
          }
        }}
      />

      <OtpVerificationModal
        isOpen={otpStepUp.modalState.isOpen}
        title={otpStepUp.modalState.title}
        description={otpStepUp.modalState.description}
        email={otpStepUp.modalState.email}
        otp={otpStepUp.modalState.otp}
        error={otpStepUp.modalState.error}
        hasSentOtp={otpStepUp.modalState.hasSentOtp}
        resendInSeconds={otpStepUp.modalState.resendInSeconds}
        loading={otpStepUp.modalState.loading}
        sending={otpStepUp.modalState.sending}
        onClose={() => {
          setPendingPasswordPayload(null);
          otpStepUp.closeModal();
        }}
        onOtpChange={otpStepUp.setOtp}
        onConfirm={otpStepUp.verifyOtp}
        onResend={otpStepUp.resendOtp}
      />
    </div>
  );
}
