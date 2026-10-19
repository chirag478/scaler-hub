import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Trash2, Users, X, Sparkles, Clock } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function EventCalendar({ theme, activeRole, userName }) {
  const safeTheme = theme || {
    bg: 'bg-[#0a0a0a]',
    surface: 'bg-[#121212]',
    border: 'border-[#262626]',
    textStrong: 'text-white',
    textMuted: 'text-gray-400',
    inputBg: 'bg-[#1a1a1a]',
    hover: 'hover:bg-[#1f1f1f]',
  };

  const isAdmin = activeRole === 'admin';
  const isCouncil = activeRole === 'council';
  const isClubLead = activeRole === 'club_lead';
  const isStudent = activeRole === 'student';

  const canBlockDate = isAdmin || isCouncil || isClubLead;
  const canUnblockDate = isAdmin || isCouncil; 
  const canViewRSVPs = isAdmin || isCouncil || isClubLead;
  
  const isDark = safeTheme.bg.includes('0a0a0a');

  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventReason, setEventReason] = useState('');
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEventId, setSelectedEventId] = useState(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    fetchEvents();

    const subscription = supabase
      .channel('public:calendar_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setCalendarEvents((prev) => [...prev, payload.new]);
        } else if (payload.eventType === 'DELETE') {
          setCalendarEvents((prev) => prev.filter((event) => event.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setCalendarEvents((prev) => prev.map((event) => event.id === payload.new.id ? payload.new : event));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setCalendarEvents(data);
    }
    setLoading(false);
  };

  const handleAddCalendarEvent = async (e) => {
    e.preventDefault();
    if (!eventDate || !eventName) return;

    const newEvent = {
      date: eventDate,
      time: eventTime || 'All Day',
      name: eventName,
      desc: eventDesc,
      reason: eventReason,
      attendees: []
    };

    const { data, error } = await supabase
      .from('calendar_events')
      .insert([newEvent])
      .select();

    if (error) {
      alert("Error adding event: " + error.message);
      return;
    }

    if (data) {
      setEventDate(''); setEventTime(''); setEventName(''); setEventDesc(''); setEventReason('');
      setCurrentDate(new Date(new Date(eventDate).getFullYear(), new Date(eventDate).getMonth(), 1));
    }
  };

  const handleUnblockDate = async (id) => {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (!error) {
      setSelectedEventId(null);
    }
  };

  const handleRSVP = async (id) => {
    const targetEvent = calendarEvents.find(e => e.id === id);
    if (!targetEvent) return;

    const currentUserName = userName || "Cohort Member";
    const currentAttendees = targetEvent.attendees || [];
    const hasRSVPd = currentAttendees.includes(currentUserName);
    
    const updatedAttendees = hasRSVPd 
      ? currentAttendees.filter(name => name !== currentUserName) 
      : [...currentAttendees, currentUserName];

    await supabase
      .from('calendar_events')
      .update({ attendees: updatedAttendees })
      .eq('id', id);
  };

  const handleEventClick = (id) => setSelectedEventId(selectedEventId === id ? null : id);
  const handlePrevMonth = () => { setCurrentDate(new Date(currentYear, currentMonth - 1, 1)); setSelectedEventId(null); };
  const handleNextMonth = () => { setCurrentDate(new Date(currentYear, currentMonth + 1, 1)); setSelectedEventId(null); };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-500 tracking-wider uppercase">Event Schedule</span>
        </div>
        {loading && <span className={`text-xs font-semibold animate-pulse ${safeTheme.textMuted}`}>Syncing with cloud...</span>}
      </div>

      <div className={`grid grid-cols-1 ${canBlockDate ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-5 md:gap-6 items-start`}>
        {canBlockDate && (
          <div className={`lg:col-span-1 ${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Calendar className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className={`text-base font-extrabold ${safeTheme.textStrong}`}>Block a Date</h3>
            </div>

            <form onSubmit={handleAddCalendarEvent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-[11px] font-bold ${safeTheme.textMuted} mb-1 uppercase tracking-wider`}>Date</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-2.5 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`} />
                </div>
                <div>
                  <label className={`block text-[11px] font-bold ${safeTheme.textMuted} mb-1 uppercase tracking-wider`}>Time</label>
                  <input type="text" value={eventTime} onChange={(e) => setEventTime(e.target.value)} placeholder="e.g. 2:00 PM" className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-2.5 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`} />
                </div>
              </div>
              <div>
                <label className={`block text-[11px] font-bold ${safeTheme.textMuted} mb-1 uppercase tracking-wider`}>Event Name</label>
                <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. AI Workshop" required className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-2.5 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`} />
              </div>
              <div>
                <label className={`block text-[11px] font-bold ${safeTheme.textMuted} mb-1 uppercase tracking-wider`}>Description</label>
                <textarea value={eventDesc} onChange={(e) => setEventDesc(e.target.value)} placeholder="What is happening?" rows="2" className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-2.5 text-xs ${safeTheme.textStrong} outline-none resize-none focus:border-emerald-500`} />
              </div>
              <div>
                <label className={`block text-[11px] font-bold ${safeTheme.textMuted} mb-1 uppercase tracking-wider`}>Reason for Blocking</label>
                <input type="text" value={eventReason} onChange={(e) => setEventReason(e.target.value)} placeholder="Why restrict this date?" className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-2.5 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`} />
              </div>
              <button type="submit" className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white text-xs font-bold py-3 rounded-xl transition-all shadow-sm">
                Reserve Date
              </button>
            </form>
          </div>
        )}

        <div className={`${canBlockDate ? 'lg:col-span-2' : 'lg:col-span-1'} ${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm`}>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-gray-500/10">
            <div className="flex items-center gap-4">
              <h3 className={`text-xl md:text-2xl font-extrabold ${safeTheme.textStrong} tracking-tight`}>{monthNames[currentMonth]} {currentYear}</h3>
              <div className="flex gap-2">
                <button onClick={handlePrevMonth} className={`p-2 rounded-lg border ${safeTheme.border} ${safeTheme.hover} transition-all`}><ChevronLeft className={`w-4 h-4 ${safeTheme.textMuted}`} /></button>
                <button onClick={handleNextMonth} className={`p-2 rounded-lg border ${safeTheme.border} ${safeTheme.hover} transition-all`}><ChevronRight className={`w-4 h-4 ${safeTheme.textMuted}`} /></button>
              </div>
            </div>
            <div className="flex gap-2 items-center bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'} uppercase tracking-wider`}>Live Calendar</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center mb-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className={`text-[11px] font-extrabold ${safeTheme.textMuted} uppercase tracking-widest`}>{day}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`empty-${index}`} className="h-24 bg-transparent" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const monthStr = String(currentMonth + 1).padStart(2, '0');
              const dayStr = String(day).padStart(2, '0');
              const exactDateStr = `${currentYear}-${monthStr}-${dayStr}`;
              const blockedEvent = calendarEvents.find(e => e.date === exactDateStr);
              const attendeesList = blockedEvent?.attendees || [];
              const currentUserName = userName || "Cohort Member";
              const hasRSVPd = attendeesList.includes(currentUserName);
              const isSelected = blockedEvent && selectedEventId === blockedEvent.id;

              return (
                <div 
                  key={day} 
                  onClick={() => blockedEvent && handleEventClick(blockedEvent.id)}
                  className={`relative h-24 border rounded-xl p-2.5 transition-all duration-300 flex flex-col justify-between overflow-visible 
                    ${blockedEvent ? 'bg-emerald-500/10 border-emerald-500/50 cursor-pointer hover:bg-emerald-500/20 hover:-translate-y-0.5' : `${safeTheme.bg}${safeTheme.border}`}`}
                >
                  <span className={`text-xs font-extrabold ${blockedEvent ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : safeTheme.textMuted}`}>{day}</span>
                  {blockedEvent && (
                    <div className="mt-auto">
                      <span className={`text-[10px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'} truncate w-full text-left block leading-tight mb-1`}>{blockedEvent.name}</span>
                      <span className="flex items-center gap-1 text-[9px] font-bold text-white bg-emerald-500 px-1.5 py-0.5 rounded w-fit">
                        <Users className="w-2.5 h-2.5" /> {attendeesList.length}
                      </span>
                    </div>
                  )}

                  {isSelected && (
                    <div onClick={(e) => e.stopPropagation()} className={`absolute z-50 bottom-[110%] left-1/2 -translate-x-1/2 w-72 p-5 rounded-2xl shadow-2xl border ${isDark ? 'bg-[#1a1a1a]/95 border-[#333]' : 'bg-white/95 border-gray-200'} backdrop-blur-xl cursor-default`}>
                      <button onClick={() => setSelectedEventId(null)} className={`absolute top-3 right-3 ${safeTheme.textMuted} hover:text-red-500 bg-gray-500/10 rounded-full p-1`}><X className="w-3.5 h-3.5" /></button>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold uppercase">{blockedEvent.date}</span>
                        <span className="px-2 py-0.5 bg-gray-500/10 text-gray-400 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {blockedEvent.time || 'All Day'}
                        </span>
                      </div>
                      
                      <h4 className={`font-extrabold text-base mb-1.5 pr-4 ${safeTheme.textStrong}`}>{blockedEvent.name}</h4>
                      <p className={`text-xs mb-3 ${safeTheme.textMuted}`}>{blockedEvent.desc || 'No description provided.'}</p>
                      
                      <div className="p-2.5 rounded-lg bg-gray-500/5 border border-gray-500/10 mb-3">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Reason</div>
                        <p className={`text-xs font-medium ${safeTheme.textStrong} italic`}>{blockedEvent.reason || 'None provided.'}</p>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-500/10 space-y-2">
                        {isStudent && (
                          <button onClick={() => handleRSVP(blockedEvent.id)} className={`w-full py-2 rounded-xl text-xs font-extrabold transition-all 
                            ${hasRSVPd ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                            {hasRSVPd ? 'Cancel RSVP' : 'Count Me In!'}
                          </button>
                        )}

                        {canViewRSVPs && (
                          <div>
                            <div className="flex items-center justify-between text-[11px] font-extrabold text-emerald-400 mb-1.5">
                              <span>Guest List</span>
                              <span>{attendeesList.length} RSVPs</span>
                            </div>
                            {attendeesList.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                                {attendeesList.map(a => <span key={a} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-500/10 text-white">{a}</span>)}
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-500 italic">No RSVPs yet.</p>
                            )}
                          </div>
                        )}

                        {canUnblockDate && (
                          <button onClick={() => handleUnblockDate(blockedEvent.id)} className="w-full bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/20 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 mt-2">
                            <Trash2 className="w-3.5 h-3.5" /> Remove Event
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}