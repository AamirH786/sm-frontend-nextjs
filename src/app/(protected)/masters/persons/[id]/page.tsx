'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { personMastersService, Person, PersonDocument } from '@/services/personMastersService';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import {
  Edit, User, Building2, MapPin, FileText, Trash2, Upload,
  AlertCircle, CheckCircle, Clock,
} from 'lucide-react';
import { getApiAssetUrl } from '@/lib/api-base';

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
  ready: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: CheckCircle },
  processing: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', icon: Clock },
  failed: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: AlertCircle },
};

export default function PersonMasterViewPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const personId = Number(params.id);

  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPerson = async () => {
    try {
      setLoading(true);
      const data = await personMastersService.get(personId);
      setPerson(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load person', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPerson(); }, [personId]);

  const handleFileUpload = async (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.txt') && !name.endsWith('.docx')) {
      showToast('Only PDF, TXT, DOCX files supported', 'error');
      return;
    }
    if (file.size > 30 * 1024 * 1024) { showToast('File exceeds 30MB limit', 'error'); return; }
    try {
      setUploading(true);
      await personMastersService.uploadDocument(personId, file);
      showToast('Document uploaded — processing embeddings...', 'success');
      await loadPerson();
    } catch (err: any) {
      showToast(err.response?.data?.detail || err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!confirm('Delete this document?')) return;
    try {
      await personMastersService.deleteDocument(personId, docId);
      showToast('Document deleted', 'success');
      await loadPerson();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this person? This cannot be undone.')) return;
    try {
      await personMastersService.delete(personId);
      showToast('Person deleted', 'success');
      router.push('/masters/persons');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  if (!person) return null;

  const docs: PersonDocument[] = person.documents || [];
  const photoSrc = person.photo_url
    ? (person.photo_url.startsWith('http') ? person.photo_url : getApiAssetUrl(person.photo_url))
    : null;

  return (
    <div className="px-6 md:px-10 py-6 max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/masters" className="hover:text-blue-600">Masters</Link>
            <span>/</span>
            <Link href="/masters/persons" className="hover:text-blue-600">Person Master</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{person.name}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{person.name}</h1>
          {person.designation && (
            <p className="text-sm text-gray-500 mt-0.5">
              {person.designation}{person.company ? ` · ${person.company}` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.push(`/masters/persons/${personId}/edit`)} className="flex items-center gap-2">
            <Edit size={14} /> Edit
          </Button>
          <Button variant="danger" onClick={handleDelete} className="flex items-center gap-2">
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center mb-4">
                {photoSrc ? (
                  <img src={photoSrc} alt={person.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-gray-400" />
                )}
              </div>
              <h2 className="font-semibold text-gray-900">{person.name}</h2>
              {person.designation && <p className="text-sm text-gray-500">{person.designation}</p>}
              {person.company && (
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <Building2 size={12} /> {person.company}
                </div>
              )}
              {person.address && (
                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <MapPin size={12} /> {person.address}
                </div>
              )}

              <div className="mt-4 pt-4 border-t w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Face Recognition</span>
                  <span className={`font-medium ${person.face_descriptor ? 'text-green-600' : 'text-gray-400'}`}>
                    {person.face_descriptor ? 'Registered' : 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Documents</span>
                  <span className="font-medium text-gray-900">{docs.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Knowledge Chunks</span>
                  <span className="font-medium text-gray-900">{person.chunk_count ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Added</span>
                  <span className="text-gray-700">{formatDateTime(person.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {person.description && (
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">About</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{person.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">Knowledge Documents</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Uploaded docs are embedded and used when the AI is asked about this person</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Upload size={14} /> Upload
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }}
              />

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
                className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    <span className="text-sm text-gray-500">Processing document & generating embeddings...</span>
                  </div>
                ) : (
                  <>
                    <FileText size={24} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Drag & drop PDF, TXT, or DOCX here</p>
                    <p className="text-xs text-gray-400 mt-1">Max 30MB per file</p>
                  </>
                )}
              </div>

              {docs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No documents uploaded yet</p>
              ) : (
                <div className="space-y-2">
                  {docs.map((doc) => {
                    const sc = statusColors[doc.status] || statusColors.processing;
                    const StatusIcon = sc.icon;
                    return (
                      <div key={doc.id} className={`flex items-center justify-between border rounded-lg px-4 py-3 ${sc.bg}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <StatusIcon size={16} className={sc.text} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(doc.file_size)} · {doc.chunk_count} chunks · {formatDateTime(doc.created_at)}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteDoc(doc.id)} className="ml-3 p-1.5 text-gray-400 hover:text-red-600 flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
