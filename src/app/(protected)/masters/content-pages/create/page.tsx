'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

export default function CreateContentPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<any>(null);

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      title: '',
      is_active: true,
    },
  });

  const onSubmit = async (data: FormValues) => {
    const contentHtml = editorRef.current?.getContent() || '';
    
    if (!contentHtml.trim()) {
      showToast('Content is required', 'error');
      return;
    }

    try {
      setSaving(true);
      await contentPagesService.create({
        title: data.title,
        content_html: contentHtml,
        is_active: data.is_active,
      });
      showToast('Content page created successfully', 'success');
      router.push('/masters/content-pages');
    } catch (err: any) {
      showToast(err.message || 'Failed to create content page', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Content Page</h1>
          <p className="text-sm text-gray-500">Add a new content page to your website</p>
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
              initialValue=""
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
            {saving ? 'Saving...' : 'Create Page'}
          </Button>
        </div>
      </form>
    </div>
  );
}
