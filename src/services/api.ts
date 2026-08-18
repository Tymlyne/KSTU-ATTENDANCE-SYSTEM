const API_BASE_URL = `http://${window.location.hostname}:5000/api`;

export const api = {
  async getSession(courseId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/session?courseId=${courseId}`);
      return await res.json();
    } catch (err) {
      console.error('API Error:', err);
      return { is_open: 0, qr_token: '' };
    }
  },

  async toggleSession(data: { courseId: string; isOpen: boolean; qrToken: string; latitude: number; longitude: number; radiusMeters: number }) {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err) {
      console.error('API Error:', err);
      return { success: false };
    }
  },

  async getRecords(courseId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/records?courseId=${courseId}`);
      return await res.json();
    } catch (err) {
      console.error('API Error:', err);
      return [];
    }
  },

  async submitAttendance(data: any) {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch (err) {
      return { error: 'Server connection failed.' };
    }
  }
};