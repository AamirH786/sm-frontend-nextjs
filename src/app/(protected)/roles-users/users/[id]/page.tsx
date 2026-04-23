'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import employeeService, { EmployeeProfile } from '@/services/employeeService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowLeft, Save, User, MapPin, Phone, CreditCard, Briefcase } from 'lucide-react';

const KYC_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const Section = ({ title, icon: Icon, children }: any) => (
  <Card className="mb-6">
    <CardContent className="pt-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b">
        <Icon size={18} className="text-blue-500" />
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </CardContent>
  </Card>
);

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const userId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState<Partial<EmployeeProfile>>({});
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getProfile(userId);
      setUser(data.user);
      setForm(data.profile || {});
      setDepartments(data.masters?.departments || []);
      setDesignations(data.masters?.designations || []);
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof EmployeeProfile, value: any) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    try {
      setSaving(true);
      await employeeService.saveProfile(userId, form);
      showToast('Profile saved successfully', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 md:px-10 py-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/roles-users/users')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Employee Profile
            </h1>
            {user && (
              <p className="text-sm text-gray-500">
                @{user.username} — {user.first_name} {user.last_name}
              </p>
            )}
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Profile'}
        </Button>
      </div>

      <Section title="Work Information" icon={Briefcase}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Employee Code</label>
          <Input value={form.employee_code || ''} onChange={(e) => set('employee_code', e.target.value)} placeholder="EMP001" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
          <Select
            value={form.department || ''}
            onChange={(val) => set('department', val as string)}
            options={[
              { value: '', label: 'Select Department' },
              ...departments.map((item) => ({ value: item, label: item })),
              ...(form.department && !departments.includes(form.department)
                ? [{ value: form.department, label: form.department }]
                : []),
            ]}
            placeholder={departments.length ? 'Select Department' : 'No departments available'}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Designation</label>
          <Select
            value={form.designation || ''}
            onChange={(val) => set('designation', val as string)}
            options={[
              { value: '', label: 'Select Designation' },
              ...designations.map((item) => ({ value: item, label: item })),
              ...(form.designation && !designations.includes(form.designation)
                ? [{ value: form.designation, label: form.designation }]
                : []),
            ]}
            placeholder={designations.length ? 'Select Designation' : 'No designations available'}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Join Date</label>
          <Input type="date" value={form.join_date || ''} onChange={(e) => set('join_date', e.target.value)} />
        </div>
      </Section>

      <Section title="Personal Information" icon={User}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
          <Input type="date" value={form.dob || ''} onChange={(e) => set('dob', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
          <Select
            value={form.gender || ''}
            onChange={(val) => set('gender', val as string)}
            options={[{ value: '', label: 'Select Gender' }, ...GENDER_OPTIONS]}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Personal Email</label>
          <Input type="email" value={form.personal_email || ''} onChange={(e) => set('personal_email', e.target.value)} placeholder="personal@email.com" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Personal Phone</label>
          <Input value={form.personal_phone || ''} onChange={(e) => set('personal_phone', e.target.value)} placeholder="+91 9876543210" />
        </div>
      </Section>

      <Section title="Emergency Contact" icon={Phone}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Contact Name</label>
          <Input value={form.emergency_contact_name || ''} onChange={(e) => set('emergency_contact_name', e.target.value)} placeholder="Name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Contact Phone</label>
          <Input value={form.emergency_contact_phone || ''} onChange={(e) => set('emergency_contact_phone', e.target.value)} placeholder="+91 9876543210" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Relation</label>
          <Input value={form.emergency_contact_relation || ''} onChange={(e) => set('emergency_contact_relation', e.target.value)} placeholder="Spouse, Parent, etc." />
        </div>
      </Section>

      <Section title="Address" icon={MapPin}>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 1</label>
          <Input value={form.address_line1 || ''} onChange={(e) => set('address_line1', e.target.value)} placeholder="House / Flat / Street" />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 2</label>
          <Input value={form.address_line2 || ''} onChange={(e) => set('address_line2', e.target.value)} placeholder="Area / Locality" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
          <Input value={form.city || ''} onChange={(e) => set('city', e.target.value)} placeholder="Mumbai" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
          <Input value={form.state || ''} onChange={(e) => set('state', e.target.value)} placeholder="Maharashtra" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label>
          <Input value={form.pincode || ''} onChange={(e) => set('pincode', e.target.value)} placeholder="400001" maxLength={10} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
          <Input value={form.country || 'India'} onChange={(e) => set('country', e.target.value)} placeholder="India" />
        </div>
      </Section>

      <Section title="KYC Documents" icon={CreditCard}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Aadhaar Number</label>
          <Input value={form.kyc_aadhaar || ''} onChange={(e) => set('kyc_aadhaar', e.target.value)} placeholder="XXXX XXXX XXXX" maxLength={20} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">PAN Number</label>
          <Input value={form.kyc_pan || ''} onChange={(e) => set('kyc_pan', e.target.value)} placeholder="ABCDE1234F" maxLength={20} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Passport Number</label>
          <Input value={form.kyc_passport || ''} onChange={(e) => set('kyc_passport', e.target.value)} placeholder="A1234567" maxLength={50} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">KYC Status</label>
          <Select
            value={form.kyc_status || 'pending'}
            onChange={(val) => set('kyc_status', val as string)}
            options={KYC_STATUS_OPTIONS}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">KYC Notes</label>
          <Input value={form.kyc_notes || ''} onChange={(e) => set('kyc_notes', e.target.value)} placeholder="Any notes about KYC verification…" />
        </div>
      </Section>
    </div>
  );
}
