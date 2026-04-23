'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface Member {
  id: number;
  user_id: number;
  organization_id: number;
  role: string;
  added_at: string;
  status: number;
  user?: {
    username: string;
    email: string;
  };
}

export default function MembersTab({ orgId }: { orgId?: number }) {
  const { showToast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('student');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (orgId) {
      fetchMembers();
    }
  }, [orgId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/organizations/${orgId}/members?limit=1000`);
      setMembers(res.data);
    } catch (error) {
      showToast('Failed to load members', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail) {
      showToast('Please enter email', 'error');
      return;
    }

    try {
      setAdding(true);
      // Note: In real implementation, you'd need to create user from email first
      // For now, we'll assume user exists by ID
      await api.post(`/organizations/${orgId}/members`, {
        user_id: 0, // Would need to look up from email
        role: newMemberRole
      });
      
      showToast('Member added successfully', 'success');
      setNewMemberEmail('');
      await fetchMembers();
    } catch (error: any) {
      showToast(error?.response?.data?.detail || 'Failed to add member', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await api.delete(`/organizations/${orgId}/members/${memberId}`);
      showToast('Member removed successfully', 'success');
      await fetchMembers();
    } catch (error) {
      showToast('Failed to remove member', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading members...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Add Member Form */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Member</h3>
        <form onSubmit={handleAddMember} className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-64">
            <Input
              type="email"
              placeholder="Member email address"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              disabled={adding}
            />
          </div>
          <div className="w-40">
            <select
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              disabled={adding}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Button type="submit" isLoading={adding}>
            {adding ? 'Adding...' : 'Add Member'}
          </Button>
        </form>
      </div>

      {/* Members List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Members ({members.length})
        </h3>
        {members.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No members yet</p>
        ) : (
          <div className="bg-white rounded-lg overflow-hidden shadow">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {member.user?.username || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {member.user?.email}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        member.status === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.status === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-900 font-medium text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
