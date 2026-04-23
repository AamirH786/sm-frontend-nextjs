'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { useToast } from '@/context/ToastContext';
import { contentPagesService, ContentPage } from '@/services/websiteService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Editor } from '@tinymce/tinymce-react';
import { ArrowLeft, Save } from 'lucide-react';

const TINYMCE_API_KEY = 'sw0q7z8lus4keopwkzem4b857uut553k41mt7jn1i7i4xgce';

interface FormValues {
  title: string;
  is_active: boolean;
}

export default function EditContentPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState<ContentPage | null>(null);
  const editorRef = useRef<any>(null);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      title: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (id) {
      fetchPage();
    }
  }, [id]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      const data = await contentPagesService.getById(id);
      setPage(data);
      reset({
        title: data.title,
        is_active: data.is_active,
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to load content page', 'error');
      router.push('/masters/content-pages');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    const contentHtml = editorRef.current?.getContent() || '';
    
    if (!contentHtml.trim()) {
      showToast('Content is required', 'error');
      return;
    }

    try {
      setSaving(true);
      await contentPagesService.update(id, {
        title: data.title,
        content_html: contentHtml,
        is_active: data.is_active,
      });
      showToast('Content page updated successfully', 'success');
      router.push('/masters/content-pages');
    } catch (err: any) {
      showToast(err.message || 'Failed to update content page', 'error');
    } finally {
      setSaving(false);
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Content Page</h1>
          <p className="text-sm text-gray-500">Update the content page details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Page Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Title"
                {...register('title', { required: 'Title is required' })}
                error={errors.title?.message}
                placeholder="e.g., About Us, Privacy Policy"
                required
              />
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Status"
                    value={field.value ? 'true' : 'false'}
                    options={[
                      { value: 'true', label: 'Active' },
                      { value: 'false', label: 'Inactive' },
                    ]}
                    onChange={(val) => field.onChange(val === 'true')}
                  />
                )}
              />
            </div>
            {page?.slug && (
              <div>
                <label className="text-sm font-medium text-gray-500">Slug</label>
                <p className="text-gray-700 mt-1">{page.slug}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Content <span className="text-red-500">*</span></CardTitle>
          </CardHeader>
          <CardContent>
            <Editor
              apiKey={TINYMCE_API_KEY}
              onInit={(evt: any, editor: any) => editorRef.current = editor}
              initialValue={page?.content_html || ''}
              init={{
                height: 500,
                menubar: true,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                  'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                  'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                ],
                toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | link image | code | help',
                content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 14px; }'
              }}
            />
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Update Page'}
          </Button>
        </div>
      </form>
    </div>
  );
}
