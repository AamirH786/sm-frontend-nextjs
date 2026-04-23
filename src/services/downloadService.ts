import api from '@/lib/api';

const downloadService = {
  async downloadFile(fileUrl: string, filename: string): Promise<void> {
    try {
      const response = await api.get('/download', {
        params: { url: fileUrl },
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download service error:', error);
      throw error;
    }
  },
};

export default downloadService;
