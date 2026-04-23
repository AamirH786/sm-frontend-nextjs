'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/context/ToastContext';
import { websiteSettingsService, WebsiteSettings } from '@/services/websiteService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Building2, FileText, IndianRupee, Receipt, Save } from 'lucide-react';

type BillingForm = Pick<WebsiteSettings,
  | 'billing_company_name'
  | 'address'
  | 'city'
  | 'gstin'
  | 'pan_number'
  | 'billing_footer_note'
  | 'phone'
  | 'email'
  | 'logo_url'
>;

export default function BillingSettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BillingForm>();

  useEffect(() => {
    websiteSettingsService.get()
      .then(data => {
        reset({
          billing_company_name: data.billing_company_name || '',
          address: data.address || '',
          city: data.city || '',
          gstin: data.gstin || '',
          pan_number: data.pan_number || '',
          billing_footer_note: data.billing_footer_note || '',
          phone: data.phone || '',
          email: data.email || '',
          logo_url: data.logo_url || '',
        });
      })
      .catch(() => showToast('Failed to load billing settings', 'error'))
      .finally(() => setLoading(false));
  }, [reset, showToast]);

  const onSubmit = async (data: BillingForm) => {
    try {
      setSaving(true);
      await websiteSettingsService.update({
        billing_company_name: data.billing_company_name || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        gstin: data.gstin || undefined,
        pan_number: data.pan_number || undefined,
        billing_footer_note: data.billing_footer_note || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        logo_url: data.logo_url || undefined,
      });
      showToast('Billing settings saved successfully', 'success');
    } catch {
      showToast('Failed to save billing settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        Loading billing settings…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <Receipt className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Settings</h1>
          <p className="text-sm text-gray-500">Company details printed on customer invoices</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4 text-gray-500" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Company Name
                <span className="ml-1 text-xs text-gray-400">(appears on invoices)</span>
              </label>
              <Input
                {...register('billing_company_name')}
                placeholder="e.g. SummonMind Technologies Pvt. Ltd."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input {...register('phone')} placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input {...register('email')} type="email" placeholder="billing@company.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <Input {...register('address')} placeholder="Street address, building, floor…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <Input {...register('city')} placeholder="Mumbai" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <Input {...register('logo_url')} placeholder="https://yoursite.com/logo.png" />
            </div>
          </CardContent>
        </Card>

        {/* Tax Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <IndianRupee className="w-4 h-4 text-gray-500" />
              Tax & Registration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GSTIN
                </label>
                <Input
                  {...register('gstin', {
                    pattern: {
                      value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                      message: 'Invalid GSTIN format (e.g. 27AABCU9603R1ZX)',
                    },
                  })}
                  placeholder="27AABCU9603R1ZX"
                  className="uppercase"
                />
                {errors.gstin && (
                  <p className="text-xs text-red-500 mt-1">{errors.gstin.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                <Input
                  {...register('pan_number', {
                    pattern: {
                      value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
                      message: 'Invalid PAN format (e.g. AABCU9603R)',
                    },
                  })}
                  placeholder="AABCU9603R"
                  className="uppercase"
                />
                {errors.pan_number && (
                  <p className="text-xs text-red-500 mt-1">{errors.pan_number.message}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400">
              GST at 18% is automatically calculated on all digital service invoices.
            </p>
          </CardContent>
        </Card>

        {/* Invoice Footer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-gray-500" />
              Invoice Footer Note
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              {...register('billing_footer_note')}
              rows={3}
              placeholder="e.g. Bank: HDFC Bank | Account: 12345678 | IFSC: HDFC0001234&#10;Thank you for your business. All sales are final."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Printed at the bottom of every invoice. You can add bank details, terms, or any note.
            </p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Billing Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
