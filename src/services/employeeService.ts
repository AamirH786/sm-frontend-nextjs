import api from '@/lib/api';

export interface EmployeeProfile {
  id?: number;
  user_id?: number;
  employee_code?: string;
  department?: string;
  designation?: string;
  join_date?: string;
  dob?: string;
  gender?: string;
  personal_email?: string;
  personal_phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  kyc_aadhaar?: string;
  kyc_pan?: string;
  kyc_passport?: string;
  kyc_status?: string;
  kyc_notes?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeProfileMasters {
  departments: string[];
  designations: string[];
}

export interface EmployeeProfileResponse {
  user: {
    id: number;
    username?: string;
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    status?: number;
  };
  profile: EmployeeProfile | null;
  masters: EmployeeProfileMasters;
}

export interface AttendanceRecord {
  id?: number;
  user_id?: number;
  username?: string;
  name?: string;
  date?: string;
  check_in?: string;
  check_out?: string;
  duration_minutes?: number;
  status?: string;
  check_in_ip?: string;
  check_out_ip?: string;
  notes?: string;
}

export interface IPRestriction {
  id?: number;
  ip_address: string;
  label?: string;
  is_active: boolean;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ReauthVerificationResponse {
  reauth_token: string;
  expires_at?: string;
}

const employeeService = {
  getProfile: (userId: number) =>
    api.get(`/employees/${userId}/profile`).then((r) => r.data as EmployeeProfileResponse),

  saveProfile: (userId: number, data: Partial<EmployeeProfile>) =>
    api.put(`/employees/${userId}/profile`, data).then((r) => r.data),

  checkIn: () => api.post('/attendance/checkin').then((r) => r.data),

  checkOut: () => api.post('/attendance/checkout').then((r) => r.data),

  todayStatus: () => api.get('/attendance/today').then((r) => r.data),

  myAttendance: (params: {
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }) => api.get('/attendance/my', { params }).then((r) => r.data),

  adminAttendance: (params: {
    user_id?: number;
    date_from?: string;
    date_to?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get('/attendance/admin', { params }).then((r) => r.data),

  updateAttendance: (id: number, data: Partial<AttendanceRecord>) =>
    api.put(`/attendance/${id}`, data).then((r) => r.data),

  listIPRestrictions: () => api.get('/ip-restrictions').then((r) => r.data),

  verifyIPRestrictionReauth: (password: string) =>
    api.post('/ip-restrictions/re-auth/verify', { password }).then((r) => r.data as ReauthVerificationResponse),

  addIPRestriction: (data: { ip_address: string; label?: string; is_active?: boolean }) =>
    api.post('/ip-restrictions', data).then((r) => r.data),

  addSecureIPRestriction: (
    data: { ip_address: string; label?: string; is_active?: boolean },
    reauthToken: string
  ) =>
    api.post('/ip-restrictions/secure', {
      ...data,
      reauth_token: reauthToken,
    }).then((r) => r.data),

  updateIPRestriction: (
    id: number,
    data: { ip_address: string; label?: string; is_active: boolean }
  ) => api.put(`/ip-restrictions/${id}`, data).then((r) => r.data),

  updateSecureIPRestriction: (
    id: number,
    data: { ip_address: string; label?: string; is_active: boolean },
    reauthToken: string
  ) => api.put(`/ip-restrictions/secure/${id}`, {
    ...data,
    reauth_token: reauthToken,
  }).then((r) => r.data),

  deleteIPRestriction: (id: number) =>
    api.delete(`/ip-restrictions/${id}`).then((r) => r.data),

  deleteSecureIPRestriction: (id: number, reauthToken: string) =>
    api.delete(`/ip-restrictions/secure/${id}`, {
      headers: { 'X-Reauth-Token': reauthToken },
    }).then((r) => r.data),
};

export default employeeService;
