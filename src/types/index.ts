export type ActiveView = 'LANDING' | 'LECTURER_DASHBOARD' | 'STUDENT_DASHBOARD';

export interface UserSession {
  email: string;
  role: 'LECTURER' | 'STUDENT';
  name: string;
}