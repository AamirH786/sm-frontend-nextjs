'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import Button from '@/components/ui/Button';

interface AvatarPricing {
  id: number;
  avatar_id: number;
  price: number;
  minutes_per_month: number;
  status: number;
}

interface CoursePricing {
  id: number;
  course_id: number;
  price: number;
  minutes_per_month: number;
  status: number;
}

export default function PricingTab({ orgId }: { orgId?: number }) {
  const { showToast } = useToast();
  const [avatarPricing, setAvatarPricing] = useState<AvatarPricing[]>([]);
  const [coursePricing, setCoursePricing] = useState<CoursePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'avatar' | 'course'>('avatar');

  useEffect(() => {
    if (orgId) {
      fetchPricing();
    }
  }, [orgId]);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const [avatarRes, courseRes] = await Promise.all([
        api.get(`/organizations/${orgId}/avatar-pricing`),
        api.get(`/organizations/${orgId}/course-pricing`)
      ]);
      setAvatarPricing(avatarRes.data);
      setCoursePricing(courseRes.data);
    } catch (error) {
      showToast('Failed to load pricing', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading pricing...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('avatar')}
          className={`pb-2 font-medium transition-colors ${
            activeTab === 'avatar'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Avatar Pricing ({avatarPricing.length})
        </button>
        <button
          onClick={() => setActiveTab('course')}
          className={`pb-2 font-medium transition-colors ${
            activeTab === 'course'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Course Pricing ({coursePricing.length})
        </button>
      </div>

      {/* Avatar Pricing */}
      {activeTab === 'avatar' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Avatar Pricing</h3>
            <Button className="bg-blue-600 hover:bg-blue-700">+ Add Avatar</Button>
          </div>
          {avatarPricing.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No avatar pricing configured</p>
          ) : (
            <div className="bg-white rounded-lg overflow-hidden shadow">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Avatar ID
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Price (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Minutes/Month
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {avatarPricing.map((pricing) => (
                    <tr key={pricing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        #{pricing.avatar_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        ₹{pricing.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {pricing.minutes_per_month}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-blue-600 hover:text-blue-900 font-medium text-sm mr-3">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-900 font-medium text-sm">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Course Pricing */}
      {activeTab === 'course' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Course Pricing</h3>
            <Button className="bg-blue-600 hover:bg-blue-700">+ Add Course</Button>
          </div>
          {coursePricing.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No course pricing configured</p>
          ) : (
            <div className="bg-white rounded-lg overflow-hidden shadow">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Course ID
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Price (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Minutes/Month
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {coursePricing.map((pricing) => (
                    <tr key={pricing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        #{pricing.course_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        ₹{pricing.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {pricing.minutes_per_month}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-blue-600 hover:text-blue-900 font-medium text-sm mr-3">
                          Edit
                        </button>
                        <button className="text-red-600 hover:text-red-900 font-medium text-sm">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
