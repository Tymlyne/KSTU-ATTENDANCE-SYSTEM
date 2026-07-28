import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabaseClient';

interface StudentDashboardProps {
  studentName: string;
  onLogout: () => void;
}

interface EnrolledCourse {
  course_id: string;
  course_code: string;
  course_name: string;
}

interface AttendanceHistory {
  date: string;
  status: 'PRESENT' | 'ABSENT';
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ studentName, onLogout }) => {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [passcode, setPasscode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [studentId, setStudentId] = useState<string>('');
  
  const [history, setHistory] = useState<AttendanceHistory[]>([]);
  const [attendanceRate, setAttendanceRate] = useState<number>(0);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId && studentId) fetchCourseHistory(selectedCourseId, studentId);
  }, [selectedCourseId, studentId]);

  const fetchEnrolledCourses = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile } = await supabase.from('student_profiles').select('id').eq('user_id', user.id).single();
    if (profile) {
      setStudentId(profile.id);
      const { data: enrollments } = await supabase.from('enrollments').select(`course_id, courses (course_code, course_name)`).eq('student_id', profile.id);
      if (enrollments && enrollments.length > 0) {
        const formattedCourses = enrollments.map((e: any) => ({
          course_id: e.course_id,
          course_code: e.courses.course_code,
          course_name: e.courses.course_name,
        }));
        setCourses(formattedCourses);
        setSelectedCourseId(formattedCourses[0].course_id);
      }
    }
    setLoading(false);
  };

  const fetchCourseHistory = async (courseId: string, studId: string) => {
    setLoadingHistory(true);
    const { data: sessions } = await supabase.from('attendance_sessions').select('id, start_time').eq('course_id', courseId).order('start_time', { ascending: false });
    
    if (!sessions || sessions.length === 0) {
      setHistory([]);
      setAttendanceRate(0);
      setLoadingHistory(false);
      return;
    }

    const { data: records } = await supabase.from('attendance_records').select('session_id').eq('student_id', studId);
    const attendedSessionIds = new Set(records?.map(r => r.session_id) || []);

    const historyLog: AttendanceHistory[] = sessions.map(session => ({
      date: new Date(session.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      status: attendedSessionIds.has(session.id) ? 'PRESENT' : 'ABSENT'
    }));

    setHistory(historyLog);
    setAttendanceRate(Math.round((attendedSessionIds.size / sessions.length) * 100));
    setLoadingHistory(false);
  };

  // The Haversine Formula implemented in TypeScript
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  const getStudentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject(new Error("Geolocation not supported."));
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
    });
  };

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || !selectedCourseId) return;

    setStatusMessage({ text: 'Acquiring GPS constraints...', type: '' });

    // 1. Get Student GPS
    let studentLat = null;
    let studentLng = null;
    try {
      const position = await getStudentLocation();
      studentLat = position.coords.latitude;
      studentLng = position.coords.longitude;
    } catch (err) {
      setStatusMessage({ text: 'Error: Location access required.', type: 'error' });
      return;
    }

    setStatusMessage({ text: 'Verifying...', type: '' });

    // 2. Get Lecturer Session Data
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('id, current_qr_token, end_time, latitude, longitude, radius_meters')
      .eq('course_id', selectedCourseId)
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    if (sessionError || !session) {
      setStatusMessage({ text: 'No active session found.', type: 'error' });
      return;
    }

    if (new Date(session.end_time) < new Date()) {
      setStatusMessage({ text: 'Session expired.', type: 'error' });
      return;
    }

    if (session.current_qr_token !== passcode.trim().toUpperCase()) {
      setStatusMessage({ text: 'Invalid passcode.', type: 'error' });
      return;
    }

    // 3. Mathematical Geofence Check
    if (session.latitude && session.longitude) {
      const distance = calculateDistance(studentLat, studentLng, session.latitude, session.longitude);
      const maxRadius = session.radius_meters || 50; // Default to 50 meters
      
      if (distance > maxRadius) {
        setStatusMessage({ 
          text: `Geofence failed. You are ${Math.round(distance)}m away (Max: ${maxRadius}m).`, 
          type: 'error' 
        });
        return; // Block attendance
      }
    }

    // 4. Record Attendance
    const { error: recordError } = await supabase
      .from('attendance_records')
      .insert([{ session_id: session.id, student_id: studentId, status: 'PRESENT', verified_via: 'QR_CODE' }]);

    if (recordError) {
      if (recordError.code === '23505') {
        setStatusMessage({ text: 'Attendance already marked!', type: 'success' });
      } else {
        setStatusMessage({ text: `Error: ${recordError.message}`, type: 'error' });
      }
    } else {
      setStatusMessage({ text: 'GPS Verified! You are marked present.', type: 'success' });
      setPasscode('');
      fetchCourseHistory(selectedCourseId, studentId);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] relative overflow-x-hidden font-sans flex flex-col pb-20">
      <div className="absolute -top-[10%] -left-[10%] w-[120vw] h-[120vw] md:w-[60vw] md:h-[60vw] max-w-[800px] max-h-[800px] bg-gradient-to-br from-[#FFEDED] via-[#FFF5F5] to-transparent rounded-full opacity-90 pointer-events-none"></div>

      <header className="relative z-10 px-6 py-5 flex justify-between items-center bg-white/60 backdrop-blur-xl border-b border-gray-100 sticky top-0">
        <div>
          <h1 className="text-xl font-bold text-black tracking-tight">Portal</h1>
          <p className="text-[13px] text-gray-500 font-medium">{studentName}</p>
        </div>
        <button onClick={handleSignOut} className="text-[13px] font-bold text-[#FF4444] hover:text-[#D00000] transition-colors">
          Sign out
        </button>
      </header>

      <main className="relative z-10 flex-1 max-w-lg mx-auto w-full p-6 mt-4 flex flex-col gap-6">
        
        {/* Check-In Card */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-black tracking-tight">Check In</h2>
          </div>

          {loading ? (
            <p className="text-center text-sm text-gray-400">Loading courses...</p>
          ) : (
            <form onSubmit={handleMarkAttendance} className="space-y-5">
              <div className="relative">
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-6 py-[18px] bg-gray-50 border border-gray-100 rounded-full text-black text-sm focus:border-[#FF4444] focus:ring-1 focus:ring-[#FF4444] transition-all outline-none appearance-none cursor-pointer font-semibold"
                >
                  {courses.map((course) => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.course_code} - {course.course_name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter Passcode (e.g. QR-A1B2)"
                  className="w-full px-6 py-[18px] bg-transparent border border-gray-300 rounded-full text-black text-sm placeholder-gray-400 focus:border-[#FF4444] focus:ring-1 focus:ring-[#FF4444] transition-all outline-none text-center font-mono uppercase tracking-wider"
                  required
                />
              </div>

              {statusMessage.text && (
                <div className={`p-4 text-[13px] font-medium rounded-2xl text-center border ${
                  statusMessage.type === 'error' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                  statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  'bg-gray-50 text-gray-500 border-gray-100'
                }`}>
                  {statusMessage.text}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-[#FF4444] hover:bg-[#E63030] text-white font-semibold text-[15px] rounded-full py-4 transition-all shadow-[0_4px_14px_0_rgba(255,68,68,0.39)] active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Verify GPS & Confirm
              </button>
            </form>
          )}
        </div>

        {/* Analytics Card */}
        <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-black tracking-tight">My Record</h2>
            {history.length > 0 && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                attendanceRate >= 75 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
              }`}>
                {attendanceRate}% Total
              </span>
            )}
          </div>

          {loadingHistory ? (
            <p className="text-sm text-gray-400 text-center py-4">Analyzing records...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No sessions recorded for this course yet.</p>
          ) : (
            <div className="space-y-4">
              {history.map((record, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[13px] font-semibold text-gray-700">{record.date}</span>
                  {record.status === 'PRESENT' ? (
                    <div className="flex items-center gap-1.5 text-emerald-500 text-[11px] font-bold tracking-wider">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      PRESENT
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-400 text-[11px] font-bold tracking-wider">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      ABSENT
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};