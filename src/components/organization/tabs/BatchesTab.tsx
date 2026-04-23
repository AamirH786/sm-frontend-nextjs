'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import Button from '@/components/ui/Button';

interface Batch {
  id: number;
  name: string;
  description: string;
  schedule_days: string;
  schedule_time: string;
  duration_minutes: number;
  avatar_id?: number;
  course_id?: number;
  status: number;
  created_at: string;
}

export default function BatchesTab({ orgId }: { orgId?: number }) {
  const { showToast } = useToast();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    schedule_days: 'MON,TUE,WED,THU,FRI',
    schedule_time: '10:00',
    duration_minutes: 60,
  });

  useEffect(() => {
    if (orgId) {
      fetchBatches();
    }
  }, [orgId]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/organizations/${orgId}/batches?limit=1000`);
      setBatches(res.data);
    } catch (error) {
      showToast('Failed to load batches', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/organizations/${orgId}/batches`, formData);
      showToast('Batch created successfully', 'success');
      setFormData({
        name: '',
        schedule_days: 'MON,TUE,WED,THU,FRI',
        schedule_time: '10:00',
        duration_minutes: 60,
      });
      setShowForm(false);
      await fetchBatches();
    } catch (error: any) {
      showToast(error?.response?.data?.detail || 'Failed to create batch', 'error');
    }
  };

  const handleDeleteBatch = async (batchId: number) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;

    try {
      await api.delete(`/organizations/${orgId}/batches/${batchId}`);
      showToast('Batch deleted successfully', 'success');
      await fetchBatches();
    } catch (error) {
      showToast('Failed to delete batch', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading batches...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Create Batch Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {showForm ? '✕ Cancel' : '+ Create Batch'}
        </Button>
      </div>

      {/* Create Batch Form */}
      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Batch</h3>
          <form onSubmit={handleCreateBatch} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Class 10-A"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Days
              </label>
              <input
                type="text"
                value={formData.schedule_days}
                onChange={(e) => setFormData({ ...formData, schedule_days: e.target.value })}
                placeholder="e.g., MON,TUE,WED or DAILY"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Time
              </label>
              <input
                type="time"
                value={formData.schedule_time}
                onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                min="15"
                max="480"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Create Batch
            </Button>
          </form>
        </div>
      )}

      {/* Batches List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Batches ({batches.length})
        </h3>
        {batches.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No batches yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{batch.name}</h4>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p>📅 {batch.schedule_days}</p>
                  <p>🕐 {batch.schedule_time}</p>
                  <p>⏱️ {batch.duration_minutes} minutes</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBatch(batch.id)}
                    className="flex-1 px-3 py-2 text-sm font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
