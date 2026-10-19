import React, { useState, useEffect } from 'react';
import { 
  Shield, Home, DollarSign, Calendar, MessageSquare, 
  Sun, Moon, Bell, LogOut, Sparkles, TrendingUp, 
  Users, ArrowRight, CheckCircle2, Clock, Wallet, Menu, X
} from 'lucide-react';
import { supabase } from './supabaseClient';
import AuthScreen from './Components/AuthScreen';
import FinanceLedger from './Components/FinanceLedger';
import EventCalendar from './Components/EventCalendar';
import AnonymousForum from './Components/AnonymousForum';
import AdminUserManagement from './Components/AdminUserManagement';
import { Key } from 'lucide-react'; // Add Key to your lucide-react import list

export default function App() {
  // --- AUTH & USER HIERARCHY STATE ---
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeRole, setActiveRole] = useState('student');

  // --- NAVIGATION & THEME STATE ---
  const [activeTab, setActiveTab] = useState('overview');
  const [isDark, setIsDark] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- OVERVIEW LIVE STATS ---
  const [stats, setStats] = useState({
    totalFunds: 0,
    totalSpent: 0,
    upcomingEventsCount: 0,
    nextEvent: null,
    openIssuesCount: 0,
    resolvedIssuesCount: 0,
  });

  const theme = isDark
    ? {
        bg: 'bg-[#0a0a0a]',
        surface: 'bg-[#121212]',
        border: 'border-[#262626]',
        textStrong: 'text-white',
        textMuted: 'text-gray-400',
        inputBg: 'bg-[#1a1a1a]',
        hover: 'hover:bg-[#1f1f1f]',
      }
    : {
        bg: 'bg-[#f8fafc]',
        surface: 'bg-white',
        border: 'border-gray-200',
        textStrong: 'text-gray-900',
        textMuted: 'text-gray-500',
        inputBg: 'bg-gray-50',
        hover: 'hover:bg-gray-100',
      };

  // --- 1. CHECK AUTH SESSION & FETCH HIERARCHY PROFILE ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUserProfile(null);
        setActiveRole('student');
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (user) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setUserProfile(data);
      setActiveRole(data.role);
    } else {
      // Fallback to auth metadata if trigger is still completing
      const meta = user.user_metadata || {};
      const fallbackProfile = {
        full_name: meta.full_name || user.email?.split('@')[0] || 'Cohort Member',
        role: meta.role || 'student',
        sub_role: meta.sub_role || 'Cohort Member',
        organization: meta.organization || 'PGP Cohort',
      };
      setUserProfile(fallbackProfile);
      setActiveRole(fallbackProfile.role);
    }
    setAuthLoading(false);
  };

  // --- 2. FETCH LIVE OVERVIEW METRICS ---
  useEffect(() => {
    if (!session) return;
    fetchOverviewStats();

    const overviewSub = supabase
      .channel('overview-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchOverviewStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(overviewSub);
    };
  }, [session]);

  const fetchOverviewStats = async () => {
    const [fundsRes, txRes, eventsRes, postsRes] = await Promise.all([
      supabase.from('funds').select('amount'),
      supabase.from('transactions').select('amount'),
      supabase.from('calendar_events').select('*').order('date', { ascending: true }),
      supabase.from('forum_posts').select('status'),
    ]);

    const totalFunds = (fundsRes.data || []).reduce((acc, f) => acc + Number(f.amount), 0);
    const totalSpent = (txRes.data || []).reduce((acc, t) => acc + Number(t.amount), 0);
    const events = eventsRes.data || [];
    const posts = postsRes.data || [];

    setStats({
      totalFunds,
      totalSpent,
      upcomingEventsCount: events.length,
      nextEvent: events[0] || null,
      openIssuesCount: posts.filter(p => p.status !== 'Resolved').length,
      resolvedIssuesCount: posts.filter(p => p.status === 'Resolved').length,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // --- GUARD ROUTES ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-emerald-500 flex flex-col items-center justify-center gap-3 font-bold text-sm">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center animate-pulse">
          <Shield className="w-5 h-5 text-emerald-500" />
        </div>
        <span>Syncing Transparency Hub...</span>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onAuthSuccess={(user) => fetchUserProfile(user)} />;
  }

  const navItems = [
  { id: 'overview', label: 'Hub Overview', icon: Home },
  { id: 'finance', label: 'Finance Ledger', icon: DollarSign },
  { id: 'calendar', label: 'Event Calendar', icon: Calendar },
  { id: 'forum', label: 'Anonymous Forum', icon: MessageSquare },
  ...(activeRole === 'admin' ? [{ id: 'users', label: 'Access Control', icon: Key }] : []),
];

  const availableBalance = stats.totalFunds - stats.totalSpent;

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.textStrong} flex flex-col md:flex-row transition-colors duration-300 selection:bg-emerald-500 selection:text-white`}>
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={`w-full md:w-64 ${theme.surface} border-b md:border-b-0 md:border-r ${theme.border} flex flex-col justify-between shrink-0 z-30`}>
        <div>
          {/* Brand Logo */}
          <div className={`h-20 px-6 flex items-center justify-between border-b ${theme.border}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-inner">
                <Shield className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className={`font-extrabold text-sm tracking-wider uppercase ${theme.textStrong}`}>
                  SCALER
                </div>
                <div className={`text-[10px] font-bold tracking-widest uppercase ${theme.textMuted}`}>
                  SCHOOL OF BUSINESS
                </div>
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg border ${theme.border} ${theme.textMuted}`}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block p-4 space-y-1.5`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-extrabold transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-sm'
                      : `${theme.textMuted} ${theme.hover} hover:${theme.textStrong}`
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : ''}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logged-in Hierarchy Card (Bottom of Sidebar on Desktop) */}
        <div className={`hidden md:block p-4 m-4 rounded-2xl border ${theme.border} ${theme.inputBg}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
              Verified Session
            </span>
          </div>
          <div className={`text-xs font-extrabold ${theme.textStrong} truncate`}>
            {userProfile?.full_name}
          </div>
          <div className={`text-[11px] font-semibold ${theme.textMuted} truncate mt-0.5`}>
            {userProfile?.sub_role} • {userProfile?.organization}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP HEADER BAR */}
        <header className={`h-20 px-6 md:px-10 ${theme.surface} border-b ${theme.border} flex items-center justify-between shrink-0`}>
          <div>
            <h1 className={`text-lg md:text-xl font-extrabold tracking-tight ${theme.textStrong}`}>
              Transparency Hub
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button className={`relative p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.textMuted} hover:${theme.textStrong} transition-all`}>
              <Bell className="w-4 h-4" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            {/* Official User Designation Badge */}
            <div className={`px-3.5 py-1.5 rounded-xl border ${theme.border} ${theme.inputBg} flex items-center gap-2.5`}>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse hidden sm:block" />
              <div className="text-left">
                <div className={`text-xs font-extrabold ${theme.textStrong} leading-tight`}>
                  {userProfile?.full_name || 'Cohort Member'}
                </div>
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                  {userProfile?.role === 'student'
                    ? 'Student • PGP Cohort'
                    : `${userProfile?.sub_role} • ${userProfile?.organization}`}
                </div>
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              title="Toggle Theme"
              className={`p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.textMuted} hover:${theme.textStrong} transition-all`}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              title="Sign Out"
              className={`p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-1.5 text-xs font-bold`}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* DYNAMIC PAGE CONTENT */}
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Welcome Banner */}
              <div className={`${theme.surface} border ${theme.border} rounded-3xl p-8 relative overflow-hidden shadow-sm`}>
                <div className="absolute -right-20 -top-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-2 text-emerald-500 text-xs font-extrabold uppercase tracking-widest mb-2">
                  <Sparkles className="w-4 h-4" /> Cohort Governance & Operations
                </div>
                <h2 className={`text-2xl md:text-3xl font-extrabold ${theme.textStrong} mb-2`}>
                  Welcome back, {userProfile?.full_name?.split(' ')[0]}!
                </h2>
                <p className={`text-xs md:text-sm ${theme.textMuted} max-w-2xl leading-relaxed`}>
                  You are logged in as <span className="text-emerald-500 font-bold">{userProfile?.sub_role} ({userProfile?.organization})</span>. 
                  All treasury transactions, event reservations, and townhall discussions are synced in real time across the cohort.
                </p>
              </div>

              {/* Live Overview Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Finance Snapshot */}
                <div 
                  onClick={() => setActiveTab('finance')}
                  className={`${theme.surface} border ${theme.border} rounded-2xl p-6 cursor-pointer hover:border-emerald-500/50 transition-all group shadow-sm`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Available Treasury</span>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Wallet className="w-5 h-5" />
                    </div>
                  </div>
                  <div className={`text-3xl font-extrabold ${theme.textStrong} mb-2`}>
                    ₹{availableBalance.toLocaleString('en-IN')}
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-500/10">
                    <span className={theme.textMuted}>Total Raised: ₹{stats.totalFunds.toLocaleString('en-IN')}</span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Ledger <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Calendar Snapshot */}
                <div 
                  onClick={() => setActiveTab('calendar')}
                  className={`${theme.surface} border ${theme.border} rounded-2xl p-6 cursor-pointer hover:border-emerald-500/50 transition-all group shadow-sm`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Scheduled Events</span>
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                      <Calendar className="w-5 h-5" />
                    </div>
                  </div>
                  <div className={`text-3xl font-extrabold ${theme.textStrong} mb-2`}>
                    {stats.upcomingEventsCount}
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-500/10">
                    <span className={`${theme.textMuted} truncate max-w-[180px]`}>
                      {stats.nextEvent ? `Next: ${stats.nextEvent.name}` : 'No upcoming events'}
                    </span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Calendar <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Forum Snapshot */}
                <div 
                  onClick={() => setActiveTab('forum')}
                  className={`${theme.surface} border ${theme.border} rounded-2xl p-6 cursor-pointer hover:border-emerald-500/50 transition-all group shadow-sm`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Townhall Pulse</span>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  </div>
                  <div className={`text-3xl font-extrabold ${theme.textStrong} mb-2`}>
                    {stats.openIssuesCount} <span className={`text-sm font-semibold ${theme.textMuted}`}>Active</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-500/10">
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {stats.resolvedIssuesCount} Resolved
                    </span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Forum <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <FinanceLedger theme={theme} activeRole={activeRole} userProfile={userProfile} />
          )}

          {activeTab === 'calendar' && (
            <EventCalendar 
              theme={theme} 
              activeRole={activeRole} 
              userName={userProfile?.full_name} 
              userProfile={userProfile} 
            />
          )}

          {activeTab === 'forum' && (
            <AnonymousForum theme={theme} activeRole={activeRole} userProfile={userProfile} />
          )}
          {activeTab === 'users' && activeRole === 'admin' && (
  <AdminUserManagement theme={theme} />
)}
        </main>
      </div>
    </div>
  );
}