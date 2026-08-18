import React, { useState, useEffect } from 'react';
import { AVAILABLE_COURSES } from '../data/mockData';
import { api } from '../services/api';
import type { AttendanceSession, AttendanceRecord } from '../data/mockData';
import kstuLogo from '../assets/kstu_logo.png';

interface LecturerDashboardProps {
  onBack: () => void;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (AVAILABLE_COURSES.length > 0) {
      setSelectedCourseId(AVAILABLE_COURSES[0].id);
    }
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadSessionAndRecords(selectedCourseId);
    }
    const interval = setInterval(() => {
      if (selectedCourseId) loadSessionAndRecords(selectedCourseId);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedCourseId]);

  const loadSessionAndRecords = async (courseId: string) => {
    try {
      const sessionRes = await api.getSession(courseId);
      setActiveSession(sessionRes.is_open ? {
        id: courseId,
        courseId,
        isOpen: true,
        qrToken: sessionRes.qr_token,
        latitude: sessionRes.latitude,
        longitude: sessionRes.longitude,
        radiusMeters: sessionRes.radius_meters
      } : null);

      const recordsRes = await api.getRecords(courseId);
      setRecords(recordsRes || []);
    } catch (err) {
      console.error('Failed to load data from SQLite server', err);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Invalid security PIN credentials.');
    }
  };

  const triggerCSVDownload = (currentRecords: AttendanceRecord[]) => {
    if (currentRecords.length === 0) return;

    const courseObj = AVAILABLE_COURSES.find(c => c.id === selectedCourseId);
    // Format name securely e.g. "COS_402_Systems_Analysis_and_Design"
    const courseCodeStr = courseObj ? courseObj.courseCode.replace(/[^a-zA-Z0-9]/g, '_') : 'Course';
    const dateStr = new Date().toISOString().split('T')[0];

    const headers = ['Full Name', 'Index Number', 'Program & Session', 'Level', 'Program of Study', 'Course Name', 'Date', 'Time'];
    const rows = currentRecords.map(r => {
      const dt = new Date(r.timestamp);
      return `"${r.fullName || ''}","${r.indexNumber || ''}","${r.programType || ''}","${r.level || ''}","${r.programOfStudy || ''}","${r.courseName || ''}","${dt.toLocaleDateString()}","${dt.toLocaleTimeString()}"`;
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KsTU_Attendance_${courseCodeStr}_${dateStr}.csv`;
    link.click();
  };

  const handleToggleSession = async () => {
    const isOpen = !activeSession?.isOpen;
    const token = `KSTU-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    try {
      if (isOpen) {
        // Step A: Wipe old records for this course so it starts completely clean
        setStatusMsg('Clearing old register for fresh session...');
        await fetch(`http://localhost:5000/api/attendance/records?courseId=${selectedCourseId}`, {
          method: 'DELETE'
        });
        setRecords([]);
      } else {
        // Step B: Auto-trigger export report dialog before closing session
        if (records.length > 0) {
          triggerCSVDownload(records);
        }
      }

      setStatusMsg(isOpen ? 'Opening session...' : 'Closing session & downloading report...');
      const res = await api.toggleSession({
        courseId: selectedCourseId,
        isOpen,
        qrToken: token,
        latitude: 6.6885,
        longitude: -1.6244,
        radiusMeters: 500
      });

      if (res.success) {
        await loadSessionAndRecords(selectedCourseId);
        setStatusMsg(isOpen ? 'Session opened. Register is clean.' : 'Session closed. File downloaded successfully.');
      }
    } catch (err) {
      setStatusMsg('Server connection failed.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-['Montserrat',sans-serif] flex flex-col justify-center items-center px-4">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-[32px] p-8 shadow-xl text-center">
          <img src={kstuLogo} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-4 drop-shadow-sm" />
          <h2 className="text-xl font-bold text-slate-900 mb-1">Staff Administration</h2>
          <p className="text-xs text-slate-500 mb-6">Enter secure PIN to access management panel.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="••••"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xl tracking-[0.5em] text-emerald-700 font-bold outline-none focus:border-emerald-600 focus:bg-white"
            />
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-2xl py-3.5 shadow-lg active:scale-[0.98] transition-all">
              Authenticate
            </button>
            {authError && <p className="text-xs font-semibold text-rose-600 mt-2">{authError}</p>}
          </form>
          <button onClick={onBack} className="mt-6 text-xs text-slate-500 hover:text-slate-800 transition-colors underline">
            Return to Student Portal
          </button>
        </div>
      </div>
    );
  }

  const courseObj = AVAILABLE_COURSES.find(c => c.id === selectedCourseId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-['Montserrat',sans-serif] flex flex-col pb-16 antialiased">
      <header className="px-8 py-4 flex justify-between items-center bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <img src={kstuLogo} alt="Logo" className="w-9 h-9 object-contain drop-shadow-sm" />
          <h1 className="text-sm font-bold tracking-tight text-slate-900 uppercase">Kumasi Technical University Staff Administration</h1>
        </div>
        <button onClick={onBack} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors">
          Exit Portal →
        </button>
      </header>

      <main className="max-w-5xl mx-auto w-full p-6 lg:p-8 mt-4 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-[28px] p-6 lg:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Select Your Course to Manage</h2>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold mb-6 outline-none focus:border-emerald-600 cursor-pointer"
            >
              {AVAILABLE_COURSES.map(c => (
                <option key={c.id} value={c.id}>{c.level} ({c.programType}) | {c.courseCode}: {c.courseName}</option>
              ))}
            </select>

            <button
              onClick={handleToggleSession}
              className={`w-full font-bold text-sm rounded-2xl py-4 shadow-lg active:scale-[0.98] transition-all text-white ${
                activeSession?.isOpen ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {activeSession?.isOpen ? `Close Session & Save Report (${courseObj?.courseCode})` : `Open Fresh Session (${courseObj?.courseCode})`}
            </button>
            {statusMsg && <p className="text-center text-xs font-semibold text-slate-600 mt-3">{statusMsg}</p>}
          </div>

          <div className="bg-white rounded-[28px] p-6 lg:p-8 border border-slate-200 shadow-sm flex flex-col justify-center items-center">
            {activeSession?.isOpen ? (
              <div className="text-center">
                <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold rounded-full uppercase tracking-widest mb-4 inline-block">
                  Session Active ({courseObj?.courseCode})
                </span>
                <div className="text-3xl lg:text-4xl font-extrabold font-mono text-emerald-700 bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl mb-2 tracking-widest">
                  {activeSession.qrToken}
                </div>
                <p className="text-xs text-slate-500">Provide this passcode to students in your class.</p>
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-3 text-base font-bold text-slate-400">🔒</div>
                <p className="text-xs font-semibold text-slate-600">Session is closed for {courseObj?.courseCode}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[28px] p-6 lg:p-8 border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Live Register for {courseObj?.courseCode}: {courseObj?.courseName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{records.length} verified student submissions recorded</p>
            </div>
            {records.length > 0 && (
              <button onClick={() => triggerCSVDownload(records)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-xs font-bold text-emerald-700 rounded-xl hover:bg-slate-100 transition-colors">
                Manual Export Report
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {records.map((rec, i) => {
              const submissionDate = new Date(rec.timestamp);
              return (
                <div key={i} className="flex justify-between items-center p-4 bg-slate-50/80 border border-slate-100 rounded-2xl text-sm">
                  <div>
                    <span className="font-bold text-slate-900 text-base">{rec.fullName}</span>
                    <div className="text-xs text-emerald-700 font-mono font-semibold mt-0.5">ID: {rec.indexNumber}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{rec.programType} • {rec.level} • {rec.programOfStudy}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 block">{submissionDate.toLocaleDateString()}</span>
                    <span className="text-[11px] text-slate-500">{submissionDate.toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
            {records.length === 0 && <p className="text-xs text-slate-400 text-center py-10">Register is empty. Open a session and wait for student submissions.</p>}
          </div>
        </div>
      </main>
    </div>
  );
};