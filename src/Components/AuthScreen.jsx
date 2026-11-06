import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Mail, Lock, ArrowRight, Loader2, KeyRound, Sparkles, Zap } from 'lucide-react';
import { DEMO_PERSONAS } from './DevPersonaSwitcher';

export default function AuthScreen({ onAuthSuccess, onDevLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (isResetMode) {
        // Handle Password Reset
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage({ text: 'Check your email for the reset link!', type: 'success' });
        setTimeout(() => setIsResetMode(false), 3000);
      } else if (isLogin) {
        // Handle Sign In
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data?.user) onAuthSuccess(data.user);
      } else {
        // Handle Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: email.split('@')[0], role: 'student' }
          }
        });
        if (error) throw error;
        setMessage({ text: 'Success! Please check your email to verify your account.', type: 'success' });
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoPersona = (persona, autoEnter = false) => {
    setEmail(persona.email);
    setPassword('scaler123');
    setMessage({ text: `Selected: ${persona.fullName}. Default password: scaler123`, type: 'info' });

    if (autoEnter && onDevLogin) {
      onDevLogin(persona);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsResetMode(false);
    setMessage({ text: '', type: '' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-lg bg-[#121212] border border-[#262626] rounded-3xl p-6 sm:p-8 relative z-10 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Shield className="w-7 h-7 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
            {isResetMode ? 'Reset Password' : isLogin ? 'Scaler Transparency Hub' : 'Join the Hub'}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-gray-400">
            {isResetMode 
              ? 'Enter your cohort email to get a reset link.' 
              : 'Sign in to access your cohort governance and treasury.'}
          </p>
        </div>

        {/* ONE-CLICK TEST PERSONAS SECTION */}
        <div className="bg-[#181818] border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> 1-Click Test Personas (Dev Mode)
            </span>
            <span className="text-[9px] text-gray-500 font-medium">No password needed</span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEMO_PERSONAS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectDemoPersona(p, true)}
                  className="p-2.5 rounded-xl bg-[#202020] hover:bg-emerald-500/15 border border-[#2b2b2b] hover:border-emerald-500/40 text-left transition-all group flex flex-col justify-between"
                  title={`Enter as ${p.fullName} (${p.description})`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-extrabold text-white truncate">{p.label}</span>
                  </div>
                  <div className="text-[9px] text-gray-400 truncate">
                    {p.role === 'student' ? 'Cohort Member' : p.subRole}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            Click any persona above to <span className="text-emerald-400 font-bold">enter immediately</span> without logging in.
          </p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            message.type === 'error' 
              ? 'bg-red-500/10 text-red-500 border-red-500/20' 
              : message.type === 'info'
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
          }`}>
            {message.text}
          </div>
        )}

        {/* Real Auth Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-500" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@scaler.com"
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {!isResetMode && (
            <div className="space-y-1">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Password</label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={() => setIsResetMode(true)}
                    className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-gray-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white text-xs font-extrabold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
             isResetMode ? <KeyRound className="w-4 h-4" /> : 
             <ArrowRight className="w-4 h-4" />}
            {loading ? 'Processing...' : isResetMode ? 'Send Reset Link' : isLogin ? 'Sign In with Supabase' : 'Create Account'}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="text-center border-t border-[#262626] pt-4">
          {isResetMode ? (
            <button onClick={() => setIsResetMode(false)} className="text-xs font-bold text-gray-400 hover:text-white transition-colors">
              Back to Login
            </button>
          ) : (
            <p className="text-xs font-bold text-gray-400">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button onClick={toggleMode} className="text-emerald-500 hover:text-emerald-400 transition-colors ml-1">
                {isLogin ? 'Sign up here' : 'Log in here'}
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
