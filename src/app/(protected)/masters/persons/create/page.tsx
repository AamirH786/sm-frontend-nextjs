'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { personMastersService } from '@/services/personMastersService';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/context/ToastContext';
import { Upload, User, Camera, X, Loader2, CheckCircle } from 'lucide-react';

export default function PersonMasterCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: '',
    designation: '',
    company: '',
    address: '',
    description: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [faceStatus, setFaceStatus] = useState<'none' | 'detecting' | 'detected' | 'failed'>('none');
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setFaceDescriptor(null);
    setFaceStatus('none');
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    await detectFace(url);
  };

  const detectFace = async (objectUrl: string) => {
    setFaceStatus('detecting');
    try {
      const faceapi = await import('face-api.js');
      const LOCAL_MODEL_URL = '/face-models';
      const CDN_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        const loadModels = async (url: string) => Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(url),
          faceapi.nets.faceLandmark68Net.loadFromUri(url),
          faceapi.nets.faceRecognitionNet.loadFromUri(url),
        ]);
        try {
          await loadModels(LOCAL_MODEL_URL);
        } catch {
          await loadModels(CDN_MODEL_URL);
        }
      }
      const img = document.createElement('img');
      img.src = objectUrl;
      await new Promise<void>((res) => { img.onload = () => res(); });
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (detection) {
        setFaceDescriptor(Array.from(detection.descriptor));
        setFaceStatus('detected');
      } else {
        setFaceStatus('failed');
        showToast('No face detected. Person will be saved without face recognition.', 'error');
      }
    } catch (err) {
      console.error('Face detection error', err);
      setFaceStatus('failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('Name is required', 'error'); return; }
    if (!form.description.trim()) { showToast('Description / About is required', 'error'); return; }
    if (!photo) { showToast('Photo is required', 'error'); return; }
    setSaving(true);
    try {
      const person = await personMastersService.create({
        name: form.name,
        description: form.description,
        designation: form.designation || undefined,
        company: form.company || undefined,
        address: form.address || undefined,
        photo,
        face_descriptor: faceDescriptor || undefined,
      });
      showToast('Person created successfully', 'success');
      router.push(`/masters/persons/${person.id}`);
    } catch (err: any) {
      showToast(err.response?.data?.detail || err.message || 'Failed to create person', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-6 md:px-10 py-6 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Link href="/masters" className="hover:text-blue-600">Masters</Link>
          <span>/</span>
          <Link href="/masters/persons" className="hover:text-blue-600">Person Master</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Add Person</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Add Person</h1>
        <p className="text-gray-500 text-sm mt-1">Register a person with their photo and details for face recognition and AI context.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Photo & Face Detection</h2>
            <div className="flex gap-6 items-start">
              <div
                onClick={() => photoInputRef.current?.click()}
                className="w-36 h-36 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors overflow-hidden bg-gray-50 flex-shrink-0 relative"
              >
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera size={20} className="text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    <User size={32} className="text-gray-300 mb-2" />
                    <span className="text-xs text-gray-400 text-center px-2">Click to upload photo</span>
                  </>
                )}
              </div>

              <div className="flex-1">
                <p className="text-sm text-gray-700 mb-3">Upload a clear, front-facing photo. Face detection runs automatically to enable recognition during chat.</p>
                {faceStatus === 'detecting' && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <Loader2 size={14} className="animate-spin" /> Detecting face...
                  </div>
                )}
                {faceStatus === 'detected' && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle size={14} /> Face detected — recognition ready
                  </div>
                )}
                {faceStatus === 'failed' && (
                  <p className="text-sm text-amber-600">No face detected. Person will be saved without face recognition.</p>
                )}
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                {photo && (
                  <button
                    type="button"
                    onClick={() => { setPhoto(null); setPhotoPreview(null); setFaceDescriptor(null); setFaceStatus('none'); }}
                    className="mt-3 flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                  >
                    <X size={12} /> Remove photo
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 mb-2">Person Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul Sharma" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="CEO (optional)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp (optional)" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="City, Country (optional)" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">About / Background <span className="text-red-500">*</span></label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Brief background — who they are, their role, key highlights, interests..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex items-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {saving ? 'Saving...' : 'Create Person'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push('/masters/persons')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
