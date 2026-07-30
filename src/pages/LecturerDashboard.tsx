import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';

interface LecturerDashboardProps {
  lecturerName: string;
  onLogout: () => void;
}

interface ClassSection {
  id: string;
  section_name: string;
  courses: {
    course_code: string;
    course_name: string;
  };
}

interface ActiveSession {
  id: string;
  section_id: string;
  current_qr_token: string;
  start_time: string;
}

interface StudentRecord {
  id: string;
  name: string;
  attendanceRate: number;
  attended: number;
  total: number;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ lecturerName, onLogout }) => {
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  const [roster, setRoster] = useState<StudentRecord[]>([]);
  const [loadingRoster, setLoadingRoster] = useState<boolean>(false);

  useEffect(() => {
    fetchLecturerSections();
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
      fetchSectionRoster(selectedSectionId);
      checkActiveSessionForSection(selectedSectionId);
    }
  }, [selectedSectionId]);

  const fetchLecturerSections = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase.from('lecturer_profiles').select('id').eq('user_id', user.id).single();
    if (profile) {
      const { data: courseList } = await supabase.from('courses').select('id').eq('lecturer_id', profile.id);
      const courseIds = courseList?.map(c => c.id) || [];

      if (courseIds.length > 0) {
        const { data: sectionList } = await supabase
          .from('class_sections')
          .select('id, section_name, courses(course_code, course_name)')
          .in('course_id', courseIds);

        if (sectionList && sectionList.length > 0) {
          setSections(sectionList as any);
          setSelectedSectionId(sectionList[0].id);
        }
      }
    }
    setLoading(false);
  };

  const checkActiveSessionForSection = async (sectionId: string) => {
    const { data: session } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('section_id', sectionId)
      .gt('end_time', new Date().toISOString())
      .maybeSingle();

    setActiveSession(session || null);
    setStatusMessage('');
  };

  const fetchSectionRoster = async (sectionId: string) => {
    setLoadingRoster(true);
    const { data: enrollments } = await supabase.from('enrollments').select('student_id, student_profiles(first_name, last_name)').eq('section_id', sectionId);
    const { data: sessions } = await supabase.from('attendance_sessions').select('id').eq('section_id', sectionId);

    const totalSessions = sessions?.length || 0;
    const sessionIds = sessions?.map(s => s.id) || [];

    let recordsData: any[] = [];
    if (sessionIds.length > 0) {
      const { data: records } = await supabase.from('attendance_records').select('student_id').in('session_id', sessionIds);
      recordsData = records || [];
    }

    const rosterStats: StudentRecord[] = (enrollments || []).map(enrollment => {
      const studentId = enrollment.student_id;
      const profile = enrollment.student_profiles as any;
      const name = `${profile.first_name} ${profile.last_name}`;
      const attended = recordsData.filter(r => r.student_id === studentId).length;
      const rate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;
      return { id: studentId, name, attendanceRate: rate, attended, total: totalSessions };
    });

    rosterStats.sort((a, b) => a.name.localeCompare(b.name));
    setRoster(rosterStats);
    setLoadingRoster(false);
  };

  const exportToCSV = () => {
    if (roster.length === 0) return;

    const headers = ['Student Name', 'Classes Attended', 'Total Sessions', 'Attendance Rate (%)'];
    const rows = roster.map(student => [
      `"${student.name}"`,
      student.attended,
      student.total,
      `"${student.attendanceRate}%"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Section_Attendance_Report_${selectedSectionId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLecturerLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject(new Error("Geolocation not supported."));
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
    });
  };

  const handleStartSession = async () => {
    if (!selectedSectionId) return;

    setStatusMessage('Acquiring GPS coordinates...');
    let lat = null;
    let lng = null;

    try {
      const position = await getLecturerLocation();
      lat = position.coords.latitude;
      lng = position.coords.longitude;
    } catch (err) {
      setStatusMessage('Error: Location access required for Geofencing.');
      return;
    }

    setStatusMessage('Generating secure session...');
    const qrToken = `QR-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const endTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { data: newSession, error } = await supabase
      .from('attendance_sessions')
      .insert([{ 
        section_id: selectedSectionId,
        current_qr_token: qrToken, 
        end_time: endTime, 
        radius_meters: 50,
        latitude: lat,
        longitude: lng
      }])
      .select()
      .single();

    if (error) {
      setStatusMessage(`Failed: ${error.message}`);
    } else if (newSession) {
      setActiveSession(newSession);
      setStatusMessage('Live class session secured with Geofencing!');
      fetchSectionRoster(selectedSectionId);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] relative overflow-x-hidden font-sans flex flex-col pb-20">
      <div className="absolute -top-[10%] -right-[10%] w-[120vw] h-[120vw] md:w-[60vw] md:h-[60vw] max-w-[800px] max-h-[800px] bg-gradient-to-bl from-[#FFEDED] via-[#FFF5F5] to-transparent rounded-full opacity-90 pointer-events-none"></div>

      <header className="relative z-10 px-6 py-5 flex justify-between items-center bg-white/60 backdrop-blur-xl border-b border-gray-100 sticky top-0">
        <div>
          <h1 className="text-xl font-bold text-black tracking-tight">CampusGuard Portal</h1>
          <p className="text-[13px] text-gray-500 font-medium">{lecturerName}</p>
        </div>
        <button onClick={handleSignOut} className="text-[13px] font-bold text-[#FF4444] hover:text-[#D00000] transition-colors">
          Sign out
        </button>
      </header>

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full p-6 mt-4 flex flex-col gap-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <h2 className="text-xl font-bold text-black mb-6 tracking-tight">Select Class Section</h2>

            {loading ? (
              <p className="text-sm text-gray-400">Loading assigned sections...</p>
            ) : (
              <div className="space-y-6">
                <div className="relative">
                  <select
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                    className="w-full px-6 py-[18px] bg-gray-50 border border-gray-100 rounded-full text-black text-sm focus:border-[#FF4444] focus:ring-1 focus:ring-[#FF4444] transition-all outline-none appearance-none cursor-pointer font-semibold"
                  >
                    {sections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.courses.course_code}: {sec.courses.course_name} — {sec.section_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <button
                  onClick={handleStartSession}
                  className="w-full bg-[#FF4444] hover:bg-[#E63030] text-white font-semibold text-[15px] rounded-full py-4 transition-all shadow-[0_4px_14px_0_rgba(255,68,68,0.39)] active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Start Live Session for This Class
                </button>

                {statusMessage && (
                  <p className="text-center text-[13px] font-bold text-[#FF4444]">
                    {statusMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col items-center justify-center min-h-[280px]">
            {activeSession ? (
              <div className="text-center w-full">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold tracking-wider mb-8 uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Section Session Active
                </div>
                <div className="bg-[#FFF5F5] border border-[#FFEDED] rounded-3xl p-8 mb-4">
                  <div className="text-4xl md:text-5xl font-bold tracking-widest text-[#FF4444] font-mono">
                    {activeSession.current_qr_token}
                  </div>
                </div>
                <p className="text-[13px] text-gray-500 font-medium">Broadcast passcode to students in this specific class.</p>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-[13px] font-medium">No active session for this class section</p>
              </div>
            )}
          </div>
        </div>

        {/* Section Roster Analytics */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <div className="mb-6 flex justify-between items-center">
             <div>
               <h2 className="text-xl font-bold text-black tracking-tight">Class Section Roster</h2>
               <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{roster.length} Students Enrolled</span>
             </div>
             {roster.length > 0 && (
               <button
                 onClick={exportToCSV}
                 className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-full border border-gray-200 transition-all flex items-center gap-2 active:scale-95"
               >
                 <svg className="w-4 h-4 text-[#FF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                 </svg>
                 Export Section CSV
               </button>
             )}
          </div>

          {loadingRoster ? (
            <p className="text-sm text-gray-400 text-center py-8">Fetching class records...</p>
          ) : roster.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No students enrolled in this class section.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-4 px-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Student Name</th>
                    <th className="py-4 px-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider text-right">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((student) => (
                    <tr key={student.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-2 text-sm font-semibold text-gray-800">{student.name}</td>
                      <td className="py-4 px-2 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-xs font-medium text-gray-400">
                            {student.attended} / {student.total} Sessions
                          </span>
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold w-14 text-center ${
                            student.attendanceRate >= 75 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                          }`}>
                            {student.attendanceRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};