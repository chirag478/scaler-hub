import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, Mail, Lock, ArrowRight, Loader2, KeyRound } from 'lucide-react';

export default function AuthScreen({ onAuthSuccess }) {
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

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsResetMode(false);
    setMessage({ text: '', type: '' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#121212] border border-[#262626] rounded-3xl p-8 relative z-10 shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Shield className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1">
            {isResetMode ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Join the Hub'}
          </h1>
          <p className="text-sm font-medium text-gray-400">
            {isResetMode 
              ? 'Enter your cohort email to get a reset link.' 
              : 'Secure access for SSB Cohort members only.'}
          </p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`p-3 rounded-xl text-xs font-bold mb-6 flex items-center gap-2 border ${
            message.type === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
          }`}>
            {message.text}
          </div>
        )}

        {/* Auth Form */}
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
                placeholder="name@ssb.scaler.com"
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
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
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white text-sm font-extrabold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
             isResetMode ? <KeyRound className="w-4 h-4" /> : 
             <ArrowRight className="w-4 h-4" />}
            {loading ? 'Processing...' : isResetMode ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="mt-8 text-center border-t border-[#262626] pt-6">
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