import { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { LecturerDashboard } from './pages/LecturerDashboard';
import { StudentDashboard } from './pages/StudentDashboard'; // 1. Added Import
import type { ActiveView, UserSession } from './types';

function App() {
  const [view, setView] = useState<ActiveView>('LANDING');
  const [user, setUser] = useState<UserSession | null>(null);

  const handleLoginSuccess = (role: 'LECTURER' | 'STUDENT', name: string) => {
    setUser({
      email: role === 'LECTURER' ? 'lecturer@university.edu' : 'student@university.edu',
      role,
      name,
    });
    
    if (role === 'LECTURER') {
      setView('LECTURER_DASHBOARD');
    } else {
      setView('STUDENT_DASHBOARD');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('LANDING');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {view === 'LANDING' && (
        <LandingPage onLoginSuccess={handleLoginSuccess} />
      )}

      {view === 'LECTURER_DASHBOARD' && user && (
        <LecturerDashboard lecturerName={user.name} onLogout={handleLogout} />
      )}

      {/* 2. Swapped static placeholder with our real StudentDashboard component */}
      {view === 'STUDENT_DASHBOARD' && user && (
        <StudentDashboard studentName={user.name} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;