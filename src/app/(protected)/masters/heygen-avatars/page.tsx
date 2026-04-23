'use client';

import { useState, useEffect } from 'react';
import { heygenService, PhotoAvatarGroup } from '@/services/heygenService';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/context/ToastContext';
import { Trash2, RefreshCw, Image, Camera } from 'lucide-react';

const formatDateTime = (timestamp?: number) => {
  if (!timestamp) return '-';
  return new Date(timestamp * 1000).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function HeyGenAvatarsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<PhotoAvatarGroup[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await heygenService.listPhotoAvatarGroups();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load HeyGen avatars', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this avatar group? This action cannot be undone.')) return;
    try {
      setDeletingId(groupId);
      await heygenService.deletePhotoAvatarGroup(groupId);
      showToast('Avatar group deleted successfully', 'success');
      loadGroups();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete avatar group', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 px-6 py-6 md:px-10">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-xl font-semibold">HeyGen Avatars</h2>
          <p className="text-gray-500 text-sm mt-1">Manage photo avatars in your HeyGen account</p>
        </div>
        <Button
          variant="outline"
          onClick={loadGroups}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <Image size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No HeyGen Avatars Found</h3>
              <p className="text-gray-500 mt-2">Your HeyGen account doesn't have any photo avatar groups yet.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <strong>{groups.length}</strong> avatar group{groups.length !== 1 ? 's' : ''} found in your HeyGen account.
            Free plan allows 3 photo avatars. Delete unused ones to create new avatars.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {group.preview_image ? (
                        <img
                          src={group.preview_image}
                          alt={group.name || 'Avatar'}
                          className="w-16 h-16 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border">
                          <Camera size={24} className="text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm">{group.name || 'Unnamed Group'}</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-mono truncate">{group.id}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            group.train_status === 'trained' || group.train_status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : group.train_status === 'pending' || group.train_status === 'processing'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {group.train_status || 'unknown'}
                          </span>
                          <span className="text-xs text-gray-400">{group.group_type || 'PHOTO'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-50 rounded p-2">
                        <span className="text-gray-500">Looks</span>
                        <p className="font-semibold text-gray-900">{group.num_looks ?? 0}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-2">
                        <span className="text-gray-500">Created</span>
                        <p className="font-semibold text-gray-900">{formatDateTime(group.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t px-4 py-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteGroup(group.id)}
                      disabled={deletingId === group.id}
                      className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5"
                    >
                      {deletingId === group.id ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Delete Group
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
