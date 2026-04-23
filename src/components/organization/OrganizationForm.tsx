'use client';

import { useMemo, useState } from 'react';
import { Building2, Globe, Mail, MapPin, Palette, Phone, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import RichTextEditor from '@/components/ui/RichTextEditor';
import Button from '@/components/ui/Button';
import type { OrganizationCreatePayload } from '@/types/organization';

type OrganizationFormProps = {
  onSubmit: (payload: OrganizationCreatePayload) => Promise<void>;
  submitting?: boolean;
  cancelHref?: string;
};

type FormState = {
  name: string;
  industry: string;
  website: string;
  logo_url: string;
  theme_color: string;
  address: string;
  description: string;
  contact_person_name: string;
  contact_person_email: string;
  contact_person_phone: string;
};

const initialForm: FormState = {
  name: '',
  industry: '',
  website: '',
  logo_url: '',
  theme_color: '#2563eb',
  address: '',
  description: '',
  contact_person_name: '',
  contact_person_email: '',
  contact_person_phone: '',
};

type ErrorMap = Partial<Record<keyof FormState, string>>;

const iconClass = 'pointer-events-none absolute left-4 top-[42px] h-4 w-4 -translate-y-1/2 text-slate-400';

export default function OrganizationForm({ onSubmit, submitting = false, cancelHref }: OrganizationFormProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<ErrorMap>({});

  const isValid = useMemo(
    () => Object.keys(errors).length === 0,
    [errors]
  );

  const validate = (value: FormState): ErrorMap => {
    const nextErrors: ErrorMap = {};
    if (!value.name.trim()) nextErrors.name = 'Organization name is required.';
    if (!value.contact_person_name.trim()) nextErrors.contact_person_name = 'Contact person name is required.';
    if (!value.contact_person_email.trim()) nextErrors.contact_person_email = 'Contact person email is required.';
    if (value.contact_person_email && !/^\S+@\S+\.\S+$/.test(value.contact_person_email)) {
      nextErrors.contact_person_email = 'Enter a valid email address.';
    }
    if (value.website && !/^https?:\/\//i.test(value.website)) {
      nextErrors.website = 'Website must start with http:// or https://';
    }
    if (value.logo_url && !/^https?:\/\//i.test(value.logo_url)) {
      nextErrors.logo_url = 'Logo URL must start with http:// or https://';
    }
    return nextErrors;
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    await onSubmit({
      name: form.name.trim(),
      industry: form.industry.trim() || null,
      website: form.website.trim() || null,
      logo_url: form.logo_url.trim() || null,
      theme_color: form.theme_color.trim() || null,
      address: form.address.trim() || null,
      description: form.description.trim() || null,
      contact_person_name: form.contact_person_name.trim(),
      contact_person_email: form.contact_person_email.trim(),
      contact_person_phone: form.contact_person_phone.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Organization Details</h2>
        <p className="mt-1 text-sm text-slate-500">Add profile, branding, and public identity details.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="relative">
            <Building2 className={iconClass} />
            <Input label="Organization Name" required value={form.name} onChange={(e) => update('name', e.target.value)} error={errors.name} className="pl-11" placeholder="Enter the organization name" />
          </div>
          <div className="relative">
            <Building2 className={iconClass} />
            <Input label="Industry" value={form.industry} onChange={(e) => update('industry', e.target.value)} error={errors.industry} className="pl-11" placeholder="For example: Education, Healthcare, IT" />
          </div>
          <div className="relative">
            <Globe className={iconClass} />
            <Input label="Website URL" value={form.website} onChange={(e) => update('website', e.target.value)} error={errors.website} className="pl-11" placeholder="Paste the official website link" />
          </div>
          <div className="relative">
            <Globe className={iconClass} />
            <Input label="Logo URL" value={form.logo_url} onChange={(e) => update('logo_url', e.target.value)} error={errors.logo_url} className="pl-11" placeholder="Paste the logo image link" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium tracking-tight text-slate-700">Theme Color</label>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm shadow-slate-200/60">
              <Palette className="h-4 w-4 text-slate-400" />
              <input type="color" value={form.theme_color} onChange={(e) => update('theme_color', e.target.value)} className="h-9 w-14 rounded border-0 p-0" />
              <Input value={form.theme_color} onChange={(e) => update('theme_color', e.target.value)} className="border-0 bg-transparent p-0 shadow-none focus:ring-0" placeholder="Choose a brand color" />
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-4 top-[39px] h-4 w-4 text-slate-400" />
              <Textarea label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} error={errors.address} className="pl-11" placeholder="Enter the office or billing address" />
            </div>
          </div>
          <div className="md:col-span-2">
            <RichTextEditor
              label="Description"
              value={form.description}
              onChange={(value) => update('description', value)}
              placeholder="Write a short summary about what this organization does."
              error={errors.description}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Primary Contact</h2>
        <p className="mt-1 text-sm text-slate-500">Credentials and onboarding communication will be sent to this user.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="relative">
            <UserCircle2 className={iconClass} />
            <Input label="Contact Person Name" required value={form.contact_person_name} onChange={(e) => update('contact_person_name', e.target.value)} error={errors.contact_person_name} className="pl-11" placeholder="Enter the main contact person's full name" />
          </div>
          <div className="relative">
            <Mail className={iconClass} />
            <Input label="Contact Email" required type="email" value={form.contact_person_email} onChange={(e) => update('contact_person_email', e.target.value)} error={errors.contact_person_email} className="pl-11" placeholder="Enter the login email for the contact person" />
          </div>
          <div className="relative">
            <Phone className={iconClass} />
            <Input label="Contact Phone" value={form.contact_person_phone} onChange={(e) => update('contact_person_phone', e.target.value)} error={errors.contact_person_phone} className="pl-11" placeholder="Enter the contact phone number" />
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {cancelHref ? (
          <Link href={cancelHref}>
            <Button type="button" variant="outline" className="w-full sm:w-auto">
              Cancel
            </Button>
          </Link>
        ) : null}
        <Button type="submit" isLoading={submitting} disabled={submitting || !isValid}>
          Create Organization
        </Button>
      </div>
    </form>
  );
}
