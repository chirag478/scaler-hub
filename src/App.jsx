import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, MessageSquare, PanelLeft, Sun, Moon,
  Calendar, UserCircle2, ShieldAlert, Bell, Menu, X, Home
} from 'lucide-react';
import DashboardOverview from './Components/DashboardOverview';
import AnonymousForum from './Components/AnonymousForum';
import EventCalendar from './Components/EventCalendar';
import FinanceLedger from './Components/FinanceLedger';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeRole, setActiveRole] = useState('student');

  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Council Reply', desc: 'The council replied to a forum post.', time: '10m ago', unread: true },
    { id: 2, title: 'New Event', desc: 'Product Hackathon added to Calendar.', time: '2h ago', unread: true },
    { id: 3, title: 'Ledger Update', desc: '₹25,000 Seed Fund added.', time: '1d ago', unread: false },
  ]);
  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => setNotifications(notifications.map(n => ({ ...n, unread: false })));

  const theme = isDarkMode ? {
    bg: 'bg-[#0a0a0a]', surface: 'bg-[#121212]', border: 'border-[#262626]',
    text: 'text-gray-300', textStrong: 'text-white', textMuted: 'text-gray-500',
    inputBg: 'bg-[#0a0a0a]', hover: 'hover:bg-[#1a1a1a]', tableHeader: 'bg-[#1a1a1a]',
    tableRowHover: 'hover:bg-[#161616]', calendarCell: 'border-[#262626] hover:border-emerald-500/50',
    tooltipBg: 'bg-[#1a1a1a] text-white border-[#333]'
  } : {
    bg: 'bg-[#F8F9FA]', surface: 'bg-white', border: 'border-gray-200',
    text: 'text-gray-700', textStrong: 'text-gray-900', textMuted: 'text-gray-500',
    inputBg: 'bg-white', hover: 'hover:bg-gray-100', tableHeader: 'bg-gray-50',
    tableRowHover: 'hover:bg-gray-50', calendarCell: 'border-gray-200 hover:border-emerald-500',
    tooltipBg: 'bg-white text-gray-900 border-gray-200'
  };

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } }
  };

  // --- THEME TOGGLE RIPPLE ANIMATION ---
  const toggleTheme = (e) => {
    if (!document.startViewTransition) {
      setIsDarkMode(!isDarkMode);
      return;
    }

    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      setIsDarkMode(!isDarkMode);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        [
          { clipPath: `circle(0px at ${x}px ${y}px)` },
          { clipPath: `circle(${endRadius}px at ${x}px ${y}px)` },
        ],
        {
          duration: 500,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  };

  return (
    <div className={`flex h-screen ${theme.bg} ${theme.text} font-sans overflow-hidden transition-colors duration-300 relative`}>
      
      {/* Required for the View Transitions API ripple effect to override default cross-fades */}
      <style>{`
        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation: none;
          mix-blend-mode: normal;
        }
        ::view-transition-old(root) { z-index: 1; }
        ::view-transition-new(root) { z-index: 2; }
      `}</style>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20 md:hidden" 
            onClick={() => setIsSidebarOpen(false)} 
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={{ x: isSidebarOpen ? 0 : (window.innerWidth < 768 ? '-100%' : 0) }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className={`fixed md:relative z-30 h-full flex flex-col ${theme.bg} border-r ${theme.border} w-64`}
      >
        <div className={`h-16 border-b ${theme.border} flex items-center justify-between px-5 min-w-[16rem]`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-emerald-500/30 bg-emerald-500/10 rounded flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="leading-none">
              <span className={`text-[13px] font-bold ${theme.textStrong} tracking-wide block`}>SCALER</span>
              <span className="text-[10px] text-gray-400 font-semibold tracking-wider">SCHOOL OF BUSINESS</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 min-w-[16rem]">
          {[
            { id: 'overview', icon: Home, label: 'Hub Overview' },
            { id: 'dashboard', icon: LayoutDashboard, label: 'Finance Ledger' },
            { id: 'calendar', icon: Calendar, label: 'Event Calendar' },
            { id: 'forum', icon: MessageSquare, label: 'Anonymous Forum' }
          ].map(item => (
            <motion.button 
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? `${theme.hover} ${theme.textStrong} border${theme.border}` : `text-gray-400 ${theme.hover}`}`}
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </motion.button>
          ))}
        </nav>
      </motion.aside>

      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden ${theme.bg}`}>
        <header className={`h-16 border-b ${theme.border} flex items-center px-4 md:px-6 justify-between flex-shrink-0 ${theme.bg} z-10`}>
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsSidebarOpen(true)} className={`md:hidden p-2 rounded-md border ${theme.border} ${theme.hover}`}>
              <Menu className={`w-5 h-5 ${theme.textMuted}`} />
            </motion.button>
            <div className={`text-lg font-medium ${theme.textStrong} hidden sm:block`}>Transparency Hub</div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 relative">
            <div className="relative">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setShowNotifs(!showNotifs); markAllRead(); }} className={`p-2 rounded-full border ${theme.border} ${theme.hover} transition-all duration-300 relative`}>
                <Bell className={`w-4 h-4 ${theme.textMuted}`} />
                {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#121212]"></span>}
              </motion.button>
              <AnimatePresence>
                {showNotifs && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
                    className={`absolute top-full right-0 mt-2 w-72 rounded-xl shadow-2xl border ${theme.tooltipBg} overflow-hidden z-50`}
                  >
                    <div className={`p-3 border-b border-gray-500/20 text-xs font-bold uppercase tracking-wider`}>Recent Updates</div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className={`p-3 border-b border-gray-500/10 hover:bg-black/10 transition-colors ${n.unread ? 'bg-emerald-500/5' : ''}`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-sm font-bold ${n.unread ? 'text-emerald-500' : ''}`}>{n.title}</span>
                            <span className="text-[10px] text-gray-500">{n.time}</span>
                          </div>
                          <p className="text-xs opacity-80">{n.desc}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className={`flex items-center gap-2 border ${theme.border} rounded-lg px-2 py-1 ${theme.surface}`}>
              <UserCircle2 className={`w-4 h-4 ${theme.textMuted} hidden md:block`} />
              <select value={activeRole} onChange={(e) => setActiveRole(e.target.value)} className={`bg-transparent text-sm font-medium ${theme.textStrong} focus:outline-none cursor-pointer max-w-[100px] md:max-w-none`}>
                <option value="student" className="bg-gray-800 text-white">Normal Student</option>
                <option value="club_lead" className="bg-gray-800 text-white">Club President</option>
                <option value="council" className="bg-gray-800 text-white">Student Council</option>
                <option value="admin" className="bg-gray-800 text-white">System Admin</option>
              </select>
            </div>
            
            {/* Themed Button tied to the Ripple Event */}
            <motion.button whileTap={{ scale: 0.9, rotate: 180 }} onClick={toggleTheme} className={`p-2 rounded-full border ${theme.border} ${theme.hover} transition-all duration-300 hidden md:block`}>
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-emerald-500" />}
            </motion.button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="h-full">
              {activeTab === 'overview' && <DashboardOverview theme={theme} activeRole={activeRole} setActiveTab={setActiveTab} />}
              {activeTab === 'dashboard' && <FinanceLedger theme={theme} activeRole={activeRole} />}
              {activeTab === 'calendar' && <EventCalendar theme={theme} activeRole={activeRole} />}
              {activeTab === 'forum' && <AnonymousForum theme={theme} activeRole={activeRole} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}