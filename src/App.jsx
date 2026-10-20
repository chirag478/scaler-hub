import React, { useState, useEffect } from 'react';
import { 
  Shield, Home, DollarSign, Calendar, MessageSquare, 
  Sun, Moon, Bell, LogOut, Sparkles, TrendingUp, 
  Wallet, Menu, X, Key, CheckCircle2, ArrowRight 
} from 'lucide-react';
import { supabase } from './supabaseClient';
import AuthScreen from './Components/AuthScreen';
import FinanceLedger from './Components/FinanceLedger';
import EventCalendar from './Components/EventCalendar';
import AnonymousForum from './Components/AnonymousForum';
import AdminUserManagement from './Components/AdminUserManagement';

export default function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeRole, setActiveRole] = useState('student');

  const [activeTab, setActiveTab] = useState('overview');
  const [isDark, setIsDark] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Realtime Notification State
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
      if (session?.user) fetchUserProfile(session.user);
      else {
        setUserProfile(null);
        setActiveRole('student');
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (user) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!error && data) {
      setUserProfile(data);
      setActiveRole(data.role);
    } else {
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

  // -------------------------------------------------------------
  // REAL-TIME CLOUD SYNC: Stats & Notifications
  // -------------------------------------------------------------
  useEffect(() => {
    if (!session) return;
    fetchOverviewStats();

    // 1. Sync Dashboard Stats
    const overviewSub = supabase
      .channel('overview-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchOverviewStats();
      })
      .subscribe();

    // 2. Listen for New Calendar Events
    const calendarSub = supabase
      .channel('notif-calendar')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calendar_events' }, (payload) => {
        addNotification('New Event Scheduled', `${payload.new.name} on ${payload.new.date}`);
      }).subscribe();

    // 3. Listen for Council Replies on the Forum
    const forumUpdateSub = supabase
      .channel('notif-forum-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'forum_posts' }, (payload) => {
        // If a reply was just added, notify the cohort
        if (payload.new.reply && !payload.old.reply) {
          addNotification('Official Council Reply', `A response was added to: "${payload.new.text.substring(0, 30)}..."`);
        }
      }).subscribe();

    // 4. Listen for New Polls & Posts
    const forumInsertSub = supabase
      .channel('notif-forum-inserts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts' }, (payload) => {
        const title = payload.new.is_poll ? 'New Cohort Poll' : 'New Townhall Post';
        addNotification(title, `"${payload.new.text.substring(0, 30)}..."`);
      }).subscribe();

    return () => {
      supabase.removeChannel(overviewSub);
      supabase.removeChannel(calendarSub);
      supabase.removeChannel(forumUpdateSub);
      supabase.removeChannel(forumInsertSub);
    };
  }, [session]);

const addNotification = (title, message) => {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setNotifications(prev => {
      const newNotifs = [{ id: Date.now(), title, message, time: timeString }, ...prev];
      // Slice the array to keep only the 4 most recent notifications
      return newNotifs.slice(0, 4); 
    });
    setUnreadCount(prev => prev + 1);
  };

  const handleOpenNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    if (!notificationsOpen) setUnreadCount(0); // Clear unread dot when opening tray
  };

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

  const handleLogout = async () => await supabase.auth.signOut();

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

  if (!session) return <AuthScreen onAuthSuccess={(user) => fetchUserProfile(user)} />;

  const navItems = [
    { id: 'overview', label: 'Hub Overview', icon: Home },
    { id: 'finance', label: 'Finance Ledger', icon: DollarSign },
    { id: 'calendar', label: 'Event Calendar', icon: Calendar },
    { id: 'forum', label: 'Student Townhall', icon: MessageSquare },
    ...(activeRole === 'admin' ? [{ id: 'users', label: 'Access Control', icon: Key }] : []),
  ];

  const availableBalance = stats.totalFunds - stats.totalSpent;

  return (
    <div className={`flex h-screen overflow-hidden ${theme.bg} ${theme.textStrong} selection:bg-emerald-500 selection:text-white`}>
      
      {/* MOBILE OVERLAY FOR SIDEBAR */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* RESPONSIVE SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out w-64 ${theme.surface} border-r ${theme.border} flex flex-col shrink-0 z-50`}>
        <div className={`h-16 flex items-center justify-between px-5 border-b ${theme.border} shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <Shield className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <div className={`font-extrabold text-sm tracking-wider uppercase ${theme.textStrong} leading-none`}>SCALER</div>
              <div className={`text-[9px] font-bold tracking-widest uppercase text-emerald-500 mt-0.5`}>SSB Cohort Hub</div>
            </div>
          </div>
          <button className="md:hidden p-1.5 rounded-md text-gray-400 hover:text-white bg-gray-500/10" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-extrabold transition-all ${
                  isActive ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-sm' : `${theme.textMuted} ${theme.hover} hover:${theme.textStrong}`
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : ''}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className={`p-4 m-4 rounded-xl border ${theme.border} ${theme.inputBg} shrink-0`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-500">Verified Identity</span>
          </div>
          <div className={`text-xs font-extrabold ${theme.textStrong} truncate`}>{userProfile?.full_name}</div>
          <div className={`text-[10px] font-bold ${theme.textMuted} truncate mt-0.5`}>
            {userProfile?.sub_role} • {userProfile?.organization === 'PGP Cohort' ? 'Student' : userProfile?.organization}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* UNIFIED TOP HEADER */}
        <header className={`h-16 px-4 md:px-8 ${theme.surface} border-b ${theme.border} flex items-center justify-between shrink-0 z-30`}>
          <div className="flex items-center gap-3">
            <button className={`md:hidden p-2 -ml-2 rounded-lg ${theme.textMuted} ${theme.hover}`} onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <h1 className={`text-base md:text-lg font-extrabold tracking-tight ${theme.textStrong}`}>
              {navItems.find(i => i.id === activeTab)?.label || 'Transparency Hub'}
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* LIVE NOTIFICATION BELL */}
            <div className="relative">
              <button
                onClick={handleOpenNotifications}
                className={`relative p-2 md:p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.textMuted} hover:${theme.textStrong} transition-all`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white shadow-sm ring-2 ring-[#121212]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className={`absolute right-0 mt-2 w-64 sm:w-80 ${theme.surface} border ${theme.border} rounded-2xl shadow-2xl z-50 overflow-hidden`}>
                  <div className={`p-3 border-b ${theme.border} flex justify-between items-center`}>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Live Cohort Updates</span>
                    <button onClick={() => setNotificationsOpen(false)} className={theme.textMuted}><X className="w-3.5 h-3.5"/></button>
                  </div>
                  <div className={`divide-y ${theme.border} max-h-72 overflow-y-auto`}>
                    {notifications.length === 0 ? (
                      <div className={`p-6 text-center text-xs font-semibold ${theme.textMuted}`}>No new updates yet.</div>
                    ) : (
                      notifications.map((notif) => (
                        <div key={notif.id} className={`p-3.5 hover:bg-gray-500/5 cursor-pointer transition-colors`}>
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-xs font-bold text-emerald-400`}>{notif.title}</span>
                            <span className={`text-[9px] ${theme.textMuted}`}>{notif.time}</span>
                          </div>
                          <p className={`text-[11px] font-medium ${theme.textStrong}`}>{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setIsDark(!isDark)} className={`p-2 md:p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} ${theme.textMuted} hover:${theme.textStrong} transition-all`}>
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <button onClick={handleLogout} className={`p-2 md:p-2.5 rounded-xl border ${theme.border} ${theme.inputBg} text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-1.5 text-xs font-bold`}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* SCROLLABLE PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 w-full">
          {activeTab === 'overview' && (
            <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
              <div className={`${theme.surface} border ${theme.border} rounded-2xl md:rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm`}>
                <div className="absolute -right-20 -top-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-2 text-emerald-500 text-[10px] md:text-xs font-extrabold uppercase tracking-widest mb-2 md:mb-3">
                  <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" /> Cohort Governance Operations
                </div>
                <h2 className={`text-xl sm:text-2xl md:text-3xl font-extrabold ${theme.textStrong} mb-1.5 md:mb-2`}>
                  Welcome back, {userProfile?.full_name?.split(' ')[0]}!
                </h2>
                <p className={`text-[11px] md:text-sm ${theme.textMuted} max-w-2xl leading-relaxed`}>
                  You are logged in securely as <span className="text-emerald-500 font-bold">{userProfile?.sub_role} ({userProfile?.organization === 'PGP Cohort' ? 'Student' : userProfile?.organization})</span>.
                  All operations, events, and townhall polls are synced in real time across the cohort.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div onClick={() => setActiveTab('finance')} className={`${theme.surface} border ${theme.border} rounded-2xl p-5 md:p-6 cursor-pointer hover:border-emerald-500/50 transition-all group shadow-sm`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Available Treasury</span>
                    <div className="p-2 md:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500"><Wallet className="w-4 h-4 md:w-5 md:h-5" /></div>
                  </div>
                  <div className={`text-2xl md:text-3xl font-extrabold ${theme.textStrong} mb-2`}>₹{availableBalance.toLocaleString('en-IN')}</div>
                  <div className="flex items-center justify-between text-[10px] md:text-xs pt-3 border-t border-gray-500/10">
                    <span className={theme.textMuted}>Total Raised: ₹{stats.totalFunds.toLocaleString('en-IN')}</span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Ledger <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5" /></span>
                  </div>
                </div>

                <div onClick={() => setActiveTab('calendar')} className={`${theme.surface} border ${theme.border} rounded-2xl p-5 md:p-6 cursor-pointer hover:border-emerald-500/50 transition-all group shadow-sm`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Scheduled Events</span>
                    <div className="p-2 md:p-2.5 rounded-xl bg-blue-500/10 text-blue-500"><Calendar className="w-4 h-4 md:w-5 md:h-5" /></div>
                  </div>
                  <div className={`text-2xl md:text-3xl font-extrabold ${theme.textStrong} mb-2`}>{stats.upcomingEventsCount}</div>
                  <div className="flex items-center justify-between text-[10px] md:text-xs pt-3 border-t border-gray-500/10">
                    <span className={`${theme.textMuted} truncate max-w-[140px]`}>{stats.nextEvent ? `Next: ${stats.nextEvent.name}` : 'No upcoming events'}</span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Calendar <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5" /></span>
                  </div>
                </div>

                <div onClick={() => setActiveTab('forum')} className={`${theme.surface} border ${theme.border} rounded-2xl p-5 md:p-6 cursor-pointer hover:border-emerald-500/50 transition-all group shadow-sm sm:col-span-2 lg:col-span-1`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Townhall Pulse</span>
                    <div className="p-2 md:p-2.5 rounded-xl bg-amber-500/10 text-amber-500"><MessageSquare className="w-4 h-4 md:w-5 md:h-5" /></div>
                  </div>
                  <div className={`text-2xl md:text-3xl font-extrabold ${theme.textStrong} mb-2`}>{stats.openIssuesCount} <span className={`text-xs md:text-sm font-semibold ${theme.textMuted}`}>Active</span></div>
                  <div className="flex items-center justify-between text-[10px] md:text-xs pt-3 border-t border-gray-500/10">
                    <span className="text-emerald-500 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5" /> {stats.resolvedIssuesCount} Resolved</span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Forum <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5" /></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'finance' && <FinanceLedger theme={theme} activeRole={activeRole} userProfile={userProfile} />}
          {activeTab === 'calendar' && <EventCalendar theme={theme} activeRole={activeRole} userName={userProfile?.full_name} userProfile={userProfile} />}
          {activeTab === 'forum' && <AnonymousForum theme={theme} activeRole={activeRole} userProfile={userProfile} />}
          {activeTab === 'users' && activeRole === 'admin' && <AdminUserManagement theme={theme} />}
        </main>
      </div>
    </div>
  );
}