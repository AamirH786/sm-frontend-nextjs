'use client';

import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Link from 'next/link';
import { ArrowLeft, Check, Edit, Globe2, Plus, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import { useToast } from '@/context/ToastContext';
import { languagesService, type ResponseLanguage } from '@/services/languagesService';

type LanguageFormValues = {
  code: string;
  name: string;
  native_name: string;
  locale: string;
  is_active: string;
  is_default: string;
};

export default function CreateLanguagePage() {
  const { showToast } = useToast();
  const [languages, setLanguages] = useState<ResponseLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<ResponseLanguage | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<LanguageFormValues>({
    defaultValues: {
      code: '',
      name: '',
      native_name: '',
      locale: '',
      is_active: 'true',
      is_default: 'false',
    },
  });

  const loadLanguages = async (force = false) => {
    try {
      setLoading(true);
      const rows = await languagesService.listAll(force);
      setLanguages(rows);
    } catch (err: any) {
      showToast(err.message || 'Failed to load response languages', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLanguages();
  }, []);

  const sortedLanguages = useMemo(() => {
    return [...languages].sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [languages]);

  const resetForm = () => {
    setEditingLanguage(null);
    reset({
      code: '',
      name: '',
      native_name: '',
      locale: '',
      is_active: 'true',
      is_default: 'false',
    });
  };

  const handleEdit = (language: ResponseLanguage) => {
    setEditingLanguage(language);
    reset({
      code: language.code,
      name: language.name,
      native_name: language.native_name || '',
      locale: language.locale || '',
      is_active: language.is_active ? 'true' : 'false',
      is_default: language.is_default ? 'true' : 'false',
    });
  };

  const handleDelete = async (language: ResponseLanguage) => {
    if (!confirm(`Delete language "${language.name}"?`)) return;
    try {
      await languagesService.delete(language.id);
      showToast('Language deleted', 'success');
      if (editingLanguage?.id === language.id) {
        resetForm();
      }
      await loadLanguages(true);
    } catch (err: any) {
      showToast(err.message || 'Unable to delete language', 'error');
    }
  };

  const onSubmit = async (values: LanguageFormValues) => {
    const payload = {
      code: values.code.trim().toLowerCase(),
      name: values.name.trim(),
      native_name: values.native_name.trim() || null,
      locale: values.locale.trim() || null,
      is_active: values.is_active === 'true',
      is_default: values.is_default === 'true',
    };

    try {
      setSubmitting(true);
      if (editingLanguage) {
        await languagesService.update(editingLanguage.id, payload);
        showToast('Language updated successfully', 'success');
      } else {
        await languagesService.create(payload);
        showToast('Language added successfully', 'success');
      }
      resetForm();
      await loadLanguages(true);
    } catch (err: any) {
      showToast(err.message || 'Unable to save language', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-6 md:px-10 py-6">
      <div className="mb-6 rounded-[24px] border border-white/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.94)_0%,rgba(29,78,216,0.92)_52%,rgba(14,165,233,0.9)_100%)] px-5 py-3 text-white shadow-[0_20px_48px_rgba(37,99,235,0.16)] backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="mt-1 text-[24px] font-semibold leading-none tracking-tight">
                {editingLanguage ? 'Edit Response Language' : 'Add Response Language'}
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-blue-100/85">
                Add a language once here and it becomes available automatically in avatar create and edit response language dropdowns.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Link href="/masters/ai-settings">
                <Button className="h-10 rounded-full border border-white/20 bg-white/12 px-4 text-sm font-semibold text-white transition hover:border-white/35 hover:bg-white/18">
                  <ArrowLeft size={16} className="mr-2" />
                  Back to AI Settings
                </Button>
              </Link>
            </div>
          </div>
          
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        <Card className="border border-slate-200 shadow-sm shadow-slate-200/60">
          <CardContent className="p-6">
            <div className="mb-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Language Form
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {editingLanguage ? 'Update language details' : 'Add a new response language'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Use short language codes like <span className="font-medium text-slate-700">ta</span>, locales like <span className="font-medium text-slate-700">ta-IN</span>, and mark only one language as default.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Language Name"
                  {...register('name', { required: 'Language name is required' })}
                  error={errors.name?.message}
                  placeholder="e.g., Tamil"
                  required
                />
                <Input
                  label="Language Code"
                  {...register('code', { required: 'Language code is required' })}
                  error={errors.code?.message}
                  placeholder="e.g., ta"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Native Name"
                  {...register('native_name')}
                  placeholder="e.g., தமிழ்"
                />
                <Input
                  label="Locale"
                  {...register('locale')}
                  placeholder="e.g., ta-IN"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Status"
                      value={field.value}
                      options={[
                        { value: 'true', label: 'Active' },
                        { value: 'false', label: 'Inactive' },
                      ]}
                      onChange={(value) => field.onChange(String(value))}
                    />
                  )}
                />
                <Controller
                  name="is_default"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Default Language"
                      value={field.value}
                      options={[
                        { value: 'false', label: 'No' },
                        { value: 'true', label: 'Yes' },
                      ]}
                      onChange={(value) => field.onChange(String(value))}
                    />
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                {editingLanguage ? (
                  <Button variant="secondary" type="button" onClick={resetForm}>
                    Cancel Edit
                  </Button>
                ) : null}
                <Button type="submit" disabled={submitting}>
                  {editingLanguage ? 'Update Language' : 'Add Language'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm shadow-slate-200/60">
          <CardContent className="p-6">
            <div className="mb-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Globe2 size={14} />
                Live Language Inventory
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-900">Active and reusable languages</h2>
              <p className="mt-1 text-sm text-slate-500">
                These entries power the avatar response language dropdown automatically.
              </p>
            </div>

            {loading ? (
              <div className="py-8 text-sm text-slate-500">Loading languages...</div>
            ) : sortedLanguages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-600">
                No languages found yet. Add one from the form and it will be available in avatar create and edit flows.
              </div>
            ) : (
              <div className="space-y-3">
                {sortedLanguages.map((language) => (
                  <div
                    key={language.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-100/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-slate-900">{language.name}</div>
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                            {language.code}
                          </span>
                          {language.is_default ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                              <Check size={12} />
                              Default
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {language.native_name || 'No native label'}{language.locale ? ` • ${language.locale}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip text="Edit language">
                          <button
                            type="button"
                            onClick={() => handleEdit(language)}
                            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"
                          >
                            <Edit size={15} />
                          </button>
                        </Tooltip>
                        <Tooltip text="Delete language">
                          <button
                            type="button"
                            onClick={() => handleDelete(language)}
                            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${language.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {language.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        Used by avatars via dynamic dropdown
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
