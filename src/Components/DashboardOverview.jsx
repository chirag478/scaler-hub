import React from 'react';
import { 
  Wallet, Receipt, ArrowRight, Calendar, Users, 
  MessageSquare, TrendingUp, Clock, Sparkles, Quote
} from 'lucide-react';

export default function DashboardOverview({ theme, setActiveTab, activeRole }) {
  // Snapshot Data
  const financeSnapshot = { budget: 25000, spent: 17000, balance: 8000 };
  const nextEvent = { name: "Product Management Hackathon", month: "OCT", day: "25", rsvps: 12 };
  const topPost = { text: "Can we get an update on the library WiFi? It drops every evening.", author: "Anonymous", upvotes: 42, status: "Under Review" };

  const burnPercentage = Math.min((financeSnapshot.spent / financeSnapshot.budget) * 100, 100);
  const isDark = theme.bg.includes('0a0a0a');

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-bold text-amber-500 tracking-wider uppercase">Overview</span>
          </div>
          <h2 className={`text-3xl font-extrabold ${theme.textStrong} tracking-tight`}>
            Welcome back, {activeRole === 'student' ? 'Student' : 'Admin'}
          </h2>
          <p className={`text-sm ${theme.textMuted} mt-1.5`}>Here is your snapshot of the Scaler cohort today.</p>
        </div>
        <div className="text-right hidden md:block">
          <div className={`px-4 py-2 rounded-full border ${theme.border} ${theme.surface} text-xs font-bold ${theme.textStrong} shadow-sm`}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ROW 1: FINANCE AT A GLANCE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
        
        {/* HERO CARD: Available Balance */}
        <div className="md:col-span-1 bg-gradient-to-br from-[#0A8647] to-emerald-400 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-emerald-900/20 transform hover:-translate-y-1 transition-all duration-300 group">
          {/* Abstract background shapes */}
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
          <div className="absolute right-4 bottom-4 opacity-20 transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
            <Wallet className="w-20 h-20 text-white" />
          </div>
          
          <div className="relative z-10">
            <div className="text-xs font-bold text-emerald-50 uppercase tracking-widest flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Wallet className="w-3 h-3 text-white" />
              </div>
              Available Balance
            </div>
            <div className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mt-2">
              ₹{financeSnapshot.balance.toLocaleString()}
            </div>
          </div>
          
          <div className="mt-8 relative z-10">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-2 text-emerald-50">
              <span>Budget Burn</span>
              <span>{burnPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/20 overflow-hidden backdrop-blur-sm shadow-inner">
              <div 
                className="h-full bg-white rounded-full relative" 
                style={{ width: `${burnPercentage}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/50 w-full h-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          </div>
        </div>

        {/* METRIC CARDS & SHORTCUT */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          <div className="flex flex-col gap-5 md:gap-6">
            <div className={`${theme.surface} border ${theme.border} rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-emerald-500/30 transition-all duration-300`}>
              <div>
                <div className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-widest mb-1.5`}>Total Budget</div>
                <div className={`text-2xl font-extrabold ${theme.textStrong}`}>₹{financeSnapshot.budget.toLocaleString()}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            
            <div className={`${theme.surface} border ${theme.border} rounded-2xl p-5 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-red-500/30 transition-all duration-300`}>
              <div>
                <div className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-widest mb-1.5`}>Total Spent</div>
                <div className={`text-2xl font-extrabold ${theme.textStrong}`}>₹{financeSnapshot.spent.toLocaleString()}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab('dashboard')}
            className={`${theme.surface} border ${theme.border} rounded-2xl p-6 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer group`}
          >
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-sm">
              <TrendingUp className="w-7 h-7" />
            </div>
            <h3 className={`font-extrabold text-lg ${theme.textStrong} mb-2`}>Master Ledger</h3>
            <p className={`text-xs ${theme.textMuted} mb-5 leading-relaxed px-4`}>Access full financial reports, vendor receipts, and CSV exports.</p>
            <span className="flex items-center gap-2 text-xs font-bold text-white bg-[#0A8647] hover:bg-[#0c9d54] px-5 py-2.5 rounded-full transition-colors shadow-sm">
              View Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* ROW 2: CALENDAR & FORUM WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        
        {/* Next Upcoming Event */}
        <div className={`${theme.surface} border ${theme.border} rounded-2xl p-6 flex flex-col shadow-sm hover:shadow-md transition-all duration-300 group`}>
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-500/10">
            <h3 className={`text-sm font-bold ${theme.textStrong} flex items-center gap-2.5 uppercase tracking-wider`}>
              <span className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center"><Calendar className="w-3.5 h-3.5 text-emerald-500"/></span>
              Next Event
            </h3>
            <button onClick={() => setActiveTab('calendar')} className={`text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1`}>
              Full Calendar <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className={`flex-1 flex items-center gap-5 p-5 rounded-xl border ${isDark ? 'border-gray-800 bg-black/20' : 'border-gray-100 bg-gray-50'} hover:border-emerald-500/30 transition-colors`}>
           {/* Calendar Visual Date Block */}
            <div className={`flex flex-col items-center justify-center min-w-[70px] ${isDark ? 'bg-[#1a1a1a] border-gray-800' : 'bg-white border-gray-200'} rounded-xl border shadow-sm overflow-hidden flex-shrink-0`}>
              <div className="bg-red-500 w-full text-center py-1 text-[9px] font-extrabold text-white uppercase tracking-widest">{nextEvent.month}</div>
              <div className={`text-2xl font-black py-2 ${theme.textStrong}`}>{nextEvent.day}</div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className={`text-lg font-extrabold ${theme.textStrong} mb-2 truncate`}>{nextEvent.name}</h4>
              <div className="flex items-center gap-4">
                <div className={`text-xs font-semibold ${theme.textMuted} flex items-center gap-1.5`}>
                  <Clock className="w-3.5 h-3.5" /> All Day
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md">
                  <Users className="w-3.5 h-3.5" /> {nextEvent.rsvps} RSVPs
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Community Post */}
        <div className={`${theme.surface} border ${theme.border} rounded-2xl p-6 flex flex-col shadow-sm hover:shadow-md transition-all duration-300 group`}>
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-500/10">
            <h3 className={`text-sm font-bold ${theme.textStrong} flex items-center gap-2.5 uppercase tracking-wider`}>
              <span className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center"><MessageSquare className="w-3.5 h-3.5 text-blue-500"/></span>
              Trending Discussion
            </h3>
            <button onClick={() => setActiveTab('forum')} className={`text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1`}>
              Open Forum <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className={`flex-1 p-6 rounded-xl border ${isDark ? 'border-gray-800 bg-black/20' : 'border-gray-100 bg-gray-50'} relative overflow-hidden flex flex-col justify-between hover:border-blue-500/30 transition-colors`}>
            <Quote className={`absolute right-4 top-4 w-16 h-16 ${isDark ? 'text-white/5' : 'text-black/5'} -rotate-12`} />
            
            <p className={`text-[15px] ${theme.textStrong} font-medium leading-relaxed relative z-10 mb-6`}>
              "{topPost.text}"
            </p>
            
            <div className="flex justify-between items-end relative z-10">
              <div className="flex flex-col gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-gray-500/10 text-gray-500 dark:text-gray-400 w-fit`}>
                  By {topPost.author}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border text-amber-600 border-amber-500/30 bg-amber-500/10 w-fit`}>
                  {topPost.status}
                </span>
              </div>
              <div className={`text-sm font-black ${theme.textStrong} flex items-center gap-1.5 bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg`}>
                <TrendingUp className="w-4 h-4" /> {topPost.upvotes}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}