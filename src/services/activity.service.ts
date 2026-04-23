import api from "@/lib/api";

export const getActivityLogs = async (params?: any) => {
  const res = await api.get('/activity-logs', { params });
  return res.data;
};