import React, { useState } from 'react';
import { supabase } from '../config/supabaseClient';

interface LandingPageProps {
  onLoginSuccess: (role: 'LECTURER' | 'STUDENT', name: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  const [role, setRole] = useState<'STUDENT' | 'LECTURER'>('STUDENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', email)
        .single();
        
      if (userError || !userData) throw new Error('User record not found.');
      if (userData.role !== role) throw new Error(`Account registered as ${userData.role}.`);

      let profileName = 'User';
      if (role === 'LECTURER') {
        const { data: prof } = await supabase.from('lecturer_profiles').select('first_name, last_name').eq('user_id', userData.id).single();
        if (prof) profileName = `Dr. ${prof.first_name} ${prof.last_name}`;
      } else {
        const { data: prof } = await supabase.from('student_profiles').select('first_name, last_name').eq('user_id', userData.id).single();
        if (prof) profileName = `${prof.first_name} ${prof.last_name}`;
      }

      setLoading(false);
      onLoginSuccess(userData.role, profileName);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden font-sans flex flex-col">
      
      {/* Background Red/Rose Blob */}
      <div className="absolute -top-[10%] -left-[10%] w-[120vw] h-[120vw] md:w-[60vw] md:h-[60vw] max-w-[800px] max-h-[800px] bg-gradient-to-br from-[#FFEDED] via-[#FFF5F5] to-transparent rounded-full opacity-90 pointer-events-none"></div>

      <div className="flex-1 flex flex-col justify-center items-center px-6 md:px-12 relative z-10 w-full min-h-[100dvh]">
        
        <div className="w-full max-w-[400px] flex flex-col h-full py-12 md:py-20 md:h-auto md:justify-center">
          
          {/* Header Typography - Clean, Institutional */}
          <div className="mb-10 md:mb-12 mt-10 md:mt-0">
            <h1 className="text-3xl md:text-[38px] font-bold text-black mb-2 tracking-tight">Login</h1>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Secure Institutional Portal
            </p>
          </div>

          {/* Role Segmented Control */}
          <div className="flex p-1 bg-gray-50 rounded-full mb-8 border border-gray-200">
            <button
              type="button"
              onClick={() => { setRole('STUDENT'); setErrorMessage(''); }}
              className={`flex-1 py-2.5 md:py-3 text-[13px] md:text-sm font-bold rounded-full transition-all duration-300 ${
                role === 'STUDENT' ? 'bg-white text-black shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => { setRole('LECTURER'); setErrorMessage(''); }}
              className={`flex-1 py-2.5 md:py-3 text-[13px] md:text-sm font-bold rounded-full transition-all duration-300 ${
                role === 'LECTURER' ? 'bg-white text-black shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Lecturer
            </button>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 bg-orange-50 text-orange-600 text-[13px] rounded-2xl px-5 border border-orange-100 font-medium">
              {errorMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6 flex-1 md:flex-none">
            
            {/* Email Input */}
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'STUDENT' ? 'Student Email' : 'Staff Email'}
                className="w-full px-6 py-4 md:py-[18px] bg-transparent border border-gray-300 rounded-full text-black text-sm placeholder-gray-400 focus:border-[#FF4444] focus:ring-1 focus:ring-[#FF4444] transition-all outline-none"
                required
              />
            </div>

            {/* Password Input with Show/Hide Toggle */}
            <div className="relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-[18px] h-[18px] md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-14 pr-24 py-4 md:py-[18px] bg-transparent border border-gray-300 rounded-full text-black text-sm placeholder-gray-400 focus:border-[#FF4444] focus:ring-1 focus:ring-[#FF4444] transition-all outline-none"
                required
              />
              
              {/* Show / Hide Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400 hover:text-black tracking-wider transition-colors uppercase"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2 md:pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FF4444] hover:bg-[#E63030] disabled:bg-gray-300 text-white font-semibold text-sm md:text-[15px] rounded-full py-4 flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_0_rgba(255,68,68,0.39)] active:scale-95"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                {!loading && (
                  <svg className="w-[18px] h-[18px] md:w-5 md:h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                )}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};