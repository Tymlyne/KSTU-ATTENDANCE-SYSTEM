import { useState, useEffect } from 'react';
import { StudentDashboard } from './pages/StudentDashboard';
import { LecturerDashboard } from './pages/LecturerDashboard';

export function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(window.location.pathname === '/admin');

  useEffect(() => {
    const handlePopState = () => {
      setIsAdminRoute(window.location.pathname === '/admin');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToAdmin = () => {
    window.history.pushState({}, '', '/admin');
    setIsAdminRoute(true);
  };

  const navigateToHome = () => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-emerald-600 selection:text-white">
      {isAdminRoute ? (
        <LecturerDashboard onBack={navigateToHome} />
      ) : (
        <StudentDashboard onOpenAdmin={navigateToAdmin} />
      )}
    </div>
  );
}

export default App;