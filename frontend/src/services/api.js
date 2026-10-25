import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const downloadStudentReportPdf = async (studentId) => {
  const response = await api.get(`/reports/student/${studentId}/export-pdf`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  const disposition = response.headers['content-disposition'] || '';
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  link.download = filename || `attendance_${studentId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
};

export const assignClassAdvisor = async (classId, teacherId) => {
  return api.put(`/admin/classes/${classId}/advisor`, { teacher_id: teacherId });
};


// Attach JWT token from localStorage to every outbound request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('neuroface_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Handle transient connection errors during server warmup & catch 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Auto-retry up to 2 times with a short delay if the backend is initializing
    if (config && (!config._retryCount || config._retryCount < 2)) {
      const isWarmup =
        !error.response ||
        error.response.status === 503 ||
        error.code === 'ERR_NETWORK';

      const isLiveStream = config.url && config.url.includes('/attendance/process-frame');

      if (isWarmup && !isLiveStream) {
        config._retryCount = (config._retryCount || 0) + 1;
        await new Promise((resolve) => setTimeout(resolve, 800));
        return api(config);
      }
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem('neuroface_token');
      localStorage.removeItem('neuroface_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
