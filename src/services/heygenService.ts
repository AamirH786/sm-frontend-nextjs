import api from '@/lib/api';

export interface PhotoAvatarGroup {
  id: string;
  name: string;
  created_at?: number;
  num_looks?: number;
  preview_image?: string;
  group_type?: string;
  train_status?: string;
  default_voice_id?: string | null;
}

export const heygenService = {
  async listPhotoAvatarGroups(): Promise<PhotoAvatarGroup[]> {
    const response = await api.get('/heygen/photo-avatar-groups');
    return response.data?.data?.avatar_group_list || response.data?.avatar_group_list || [];
  },

  async deletePhotoAvatarGroup(groupId: string): Promise<void> {
    await api.delete(`/heygen/photo-avatar-group/${groupId}`);
  },

  async deletePhotoAvatar(avatarId: string): Promise<void> {
    await api.delete(`/heygen/photo-avatar/${avatarId}`);
  },
};
