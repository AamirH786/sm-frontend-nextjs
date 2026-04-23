'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useToast } from '@/context/ToastContext';
import { websiteSettingsService, WebsiteSettings } from '@/services/websiteService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Save, ToggleLeft, ToggleRight, Plus, Trash2 } from 'lucide-react';

const SOCIAL_PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'other', label: 'Other' },
];

export default function WebsiteSettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<WebsiteSettings | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<WebsiteSettings>({
    defaultValues: { social_accounts: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'social_accounts',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await websiteSettingsService.get();
      setSettings(data);
      reset({ ...data, social_accounts: data.social_accounts ?? [] });
    } catch (err: any) {
      showToast(err.message || 'Failed to load website settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: WebsiteSettings) => {
    try {
      setSaving(true);
      const updated = await websiteSettingsService.update({
        website_name: data.website_name,
        email: data.email,
        phone: data.phone,
        city: data.city || undefined,
        address: data.address || undefined,
        logo_url: data.logo_url || undefined,
        favicon_url: data.favicon_url || undefined,
        currency: data.currency || 'INR',
        credits_per_currency: Number(data.credits_per_currency) || 1,
        trial_reset_days: Number(data.trial_reset_days) || 0,
        purchase_validity_days: Number(data.purchase_validity_days) || 30,
        low_balance_warning_mins: Number(data.low_balance_warning_mins) || 3,
        deduction_interval_mins: Number(data.deduction_interval_mins) || 0.25,
        referral_enabled: data.referral_enabled,
        referrer_reward_credits: Number(data.referrer_reward_credits) || 0,
        referred_signup_bonus: Number(data.referred_signup_bonus) || 0,
        referral_reward_on: data.referral_reward_on || 'first_purchase',
        social_accounts: (data.social_accounts ?? []).filter(s => s.platform && s.url),
      });
      setSettings(updated);
      showToast('Website settings updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const updated = await websiteSettingsService.toggleStatus();
      setSettings(updated);
      showToast(`Website is now ${updated.is_active ? 'active' : 'inactive'}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 py-6 md:px-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Website Settings</h1>
          <p className="text-sm text-gray-500">Manage your website configuration</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={settings?.is_active ? 'primary' : 'outline'}
            onClick={handleToggleStatus}
          >
            {settings?.is_active ? (
              <><ToggleRight className="w-4 h-4 mr-2" />Active</>
            ) : (
              <><ToggleLeft className="w-4 h-4 mr-2" />Inactive</>
            )}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Basic Information */}
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Website Name"
                {...register('website_name', { required: 'Website name is required' })}
                error={errors.website_name?.message}
                required
              />
              <Input
                label="Email"
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' }
                })}
                error={errors.email?.message}
                required
              />
              <Input
                label="Phone"
                {...register('phone', { required: 'Phone is required' })}
                error={errors.phone?.message}
                required
              />
              <Input label="City" {...register('city')} />
              <Input label="Address" {...register('address')} />
            </CardContent>
          </Card>

          {/* Brand Assets */}
          <Card>
            <CardHeader><CardTitle>Brand Assets</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Logo URL" {...register('logo_url')} placeholder="https://example.com/logo.png" />
              <Input label="Favicon URL" {...register('favicon_url')} placeholder="https://example.com/favicon.ico" />
            </CardContent>
          </Card>

          {/* Credits & Billing */}
          <Card>
            <CardHeader><CardTitle>Credits & Billing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Currency" {...register('currency')} placeholder="INR" />
                <Input label="Credits per Currency" type="number" step="0.01" {...register('credits_per_currency')} placeholder="1.0" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Trial Reset Days" type="number" {...register('trial_reset_days')} placeholder="0 = one-time, 30 = monthly" />
                <Input label="Purchase Validity (days)" type="number" {...register('purchase_validity_days')} placeholder="30" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Low Balance Warning (mins)" type="number" step="0.1" {...register('low_balance_warning_mins')} placeholder="3.0" />
                <Input label="Deduction Interval (mins)" type="number" step="0.01" {...register('deduction_interval_mins')} placeholder="0.25" />
              </div>
            </CardContent>
          </Card>

          {/* Referral System */}
          <Card>
            <CardHeader><CardTitle>Referral System</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="referral_enabled" {...register('referral_enabled')} className="w-4 h-4" />
                <label htmlFor="referral_enabled" className="text-sm font-medium">Enable Referral System</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Referrer Reward (credits)" type="number" step="0.01" {...register('referrer_reward_credits')} placeholder="0" />
                <Input label="New User Signup Bonus (credits)" type="number" step="0.01" {...register('referred_signup_bonus')} placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Referrer Gets Reward On</label>
                <select {...register('referral_reward_on')} className="w-full px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg">
                  <option value="signup">On Signup</option>
                  <option value="first_purchase">On First Purchase</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Social Accounts – full width */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Social Accounts</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ platform: 'instagram', url: '' })}
                    className="h-8 text-sm"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add More
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No social accounts added yet. Click "Add More" to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-3">
                        <select
                          {...register(`social_accounts.${index}.platform`)}
                          className="w-44 px-3 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {SOCIAL_PLATFORMS.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                        <input
                          {...register(`social_accounts.${index}.url`, { required: 'URL is required' })}
                          placeholder="https://..."
                          className="flex-1 px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
