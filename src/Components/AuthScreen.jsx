import React, { useState } from 'react';
import { Shield, Mail, Lock, User, ArrowRight, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AuthScreen({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isValidScalerEmail = (mail) => {
    return mail.trim().toLowerCase().endsWith('@ssb.scaler.com');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();

    // Enforce @ssb.scaler.com strictly on public student registration
    if (!isLogin && !isValidScalerEmail(cleanEmail)) {
      setErrorMsg('Access Restricted: Please use your official @ssb.scaler.com student email (e.g., name.26020@ssb.scaler.com).');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        if (onAuthSuccess && data?.user) onAuthSuccess(data.user);
      } else {
        // Public signup strictly creates Student accounts only
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: 'student',
              sub_role: 'Cohort Member',
              organization: 'PGP Cohort'
            },
          },
        });
        if (error) throw error;

        // Sign out any auto-session so the user sees the success message and logs in cleanly
        await supabase.auth.signOut();

        setSuccessMsg('Account created successfully! Please sign in below with your new credentials.');
        setPassword('');
        setFullName('');
        setIsLogin(true);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md bg-[#121212] border border-[#262626] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/20 blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-7 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-inner">
            <Shield className="w-7 h-7 text-emerald-500" />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-emerald-500 mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Scaler School of Business
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Transparency Hub
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {isLogin 
              ? 'Sign in with your cohort or council credentials' 
              : 'Student registration via official @ssb.scaler.com email'}
          </p>
        </div>

        {/* Toggle Pills */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#1a1a1a] rounded-xl border border-[#262626] mb-6">
          <button
            type="button"
            onClick={() => { setIsLogin(true); setErrorMsg(''); setSuccessMsg(''); }}
            className={`py-2.5 text-xs font-extrabold rounded-lg transition-all ${
              isLogin ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsLogin(false); setErrorMsg(''); setSuccessMsg(''); }}
            className={`py-2.5 text-xs font-extrabold rounded-lg transition-all ${
              !isLogin ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Student Sign Up
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-red-400 text-xs font-semibold animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Notification */}
        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-emerald-400 text-xs font-semibold animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Chirag Melanta"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              {isLogin ? 'Official Email' : 'Scaler SSB Student Email'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name.26020@ssb.scaler.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            {!isLogin && (
              <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Must end with <span className="text-gray-300 font-semibold">@ssb.scaler.com</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0A8647] hover:bg-[#0c9d54] disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 mt-4"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In to Hub' : 'Verify & Create Student Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#262626] text-center">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Student Council & Club Leadership credentials are provisioned directly by the System Administrator.
          </p>
        </div>
      </div>
    </div>
  );
}