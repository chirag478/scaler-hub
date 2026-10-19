import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Trash2, Users, X, Sparkles, Clock } from 'lucide-react';

export default function EventCalendar({ theme, activeRole }) {
  const isAdmin = activeRole === 'admin';
  const isCouncil = activeRole === 'council';
  const isClubLead = activeRole === 'club_lead';
  const isStudent = activeRole === 'student';

  const canBlockDate = isAdmin || isCouncil || isClubLead;
  const canUnblockDate = isAdmin || isCouncil; 
  const canViewRSVPs = isAdmin || isCouncil || isClubLead;
  
  const isDark = theme.bg.includes('0a0a0a');

  const [calendarEvents, setCalendarEvents] = useState([
    { 
      id: 1, date: '2026-10-25', time: '10:00 AM - 4:00 PM', name: 'Product Management Hackathon', 
      desc: '48-hour case study competition.', reason: 'Flagship cohort event', attendees: ['Alex S.', 'Priya M.', 'Rahul T.'] 
    }
  ]);
  
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

  const handleAddCalendarEvent = (e) => {
    e.preventDefault();
    if (!eventDate || !eventName) return;
    setCalendarEvents([...calendarEvents, { 
      id: Date.now(), date: eventDate, time: eventTime || 'All Day', name: eventName, desc: eventDesc, reason: eventReason, attendees: [] 
    }]);
    setEventDate(''); setEventTime(''); setEventName(''); setEventDesc(''); setEventReason('');
    setCurrentDate(new Date(new Date(eventDate).getFullYear(), new Date(eventDate).getMonth(), 1));
  };

  const handleUnblockDate = (id) => {
    if (isClubLead || isStudent) {
      alert("Security Alert: Club Presidents cannot delete events.");
      return;
    }
    setCalendarEvents(calendarEvents.filter(event => event.id !== id));
    setSelectedEventId(null);
  };

  const handleRSVP = (id) => {
    setCalendarEvents(calendarEvents.map(event => {
      if (event.id === id) {
        const currentUserName = "Current User";
        const hasRSVPd = event.attendees.includes(currentUserName);
        const updatedAttendees = hasRSVPd 
          ? event.attendees.filter(name => name !== currentUserName) : [...event.attendees, currentUserName]; 
        return { ...event, attendees: updatedAttendees };
      }
      return event;
    }));
  };

  const handleEventClick = (id) => setSelectedEventId(selectedEventId === id ? null : id);
  const handlePrevMonth = () => { setCurrentDate(new Date(currentYear, currentMonth - 1, 1)); setSelectedEventId(null); };
  const handleNextMonth = () => { setCurrentDate(new Date(currentYear, currentMonth + 1, 1)); setSelectedEventId(null); };

  return (
    <div className={`max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-emerald-500" />
        <span className="text-sm font-bold text-emerald-500 tracking-wider uppercase">Event Schedule</span>
      </div>

      <div className={`grid grid-cols-1 ${canBlockDate ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-5 md:gap-6`}>
        {canBlockDate && (
          <div className={`lg:col-span-1 ${theme.surface} border ${theme.border} rounded-2xl p-6 h-fit shadow-sm hover:shadow-md transition-all duration-300`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20`}><Calendar className="w-5 h-5 text-emerald-500" /></div>
              <h3 className={`text-base font-extrabold ${theme.textStrong}`}>Block a Date</h3>
            </div>

            <form onSubmit={handleAddCalendarEvent} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold ${theme.textMuted} mb-1.5 uppercase tracking-wider`}>Date</label>
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-4 py-3 text-sm ${theme.textStrong} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all`} />
                </div>
                <div>
                  <label className={`block text-xs font-bold ${theme.textMuted} mb-1.5 uppercase tracking-wider`}>Time</label>
                  <input type="text" value={eventTime} onChange={(e) => setEventTime(e.target.value)} placeholder="e.g. 2:00 PM" className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-4 py-3 text-sm ${theme.textStrong} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all`} />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-bold ${theme.textMuted} mb-1.5 uppercase tracking-wider`}>Event Name</label>
                <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. AI Workshop" required className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-4 py-3 text-sm ${theme.textStrong} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all`} />
              </div>
              <div>
                <label className={`block text-xs font-bold ${theme.textMuted} mb-1.5 uppercase tracking-wider`}>Description</label>
                <textarea value={eventDesc} onChange={(e) => setEventDesc(e.target.value)} placeholder="What is happening?" rows="3" className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-4 py-3 text-sm ${theme.textStrong} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none resize-none transition-all`} />
              </div>
              <div>
                <label className={`block text-xs font-bold ${theme.textMuted} mb-1.5 uppercase tracking-wider`}>Reason for Blocking</label>
                <input type="text" value={eventReason} onChange={(e) => setEventReason(e.target.value)} placeholder="Why restrict this date?" className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-4 py-3 text-sm ${theme.textStrong} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all`} />
              </div>
              <button type="submit" className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-emerald-900/20 mt-2 hover:-translate-y-0.5">
                Reserve Date
              </button>
            </form>
          </div>
        )}

        <div className={`${canBlockDate ? 'lg:col-span-2' : 'lg:col-span-1'} ${theme.surface} border ${theme.border} rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300`}>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0 mb-8 pb-4 border-b border-gray-500/10">
            <div className="flex items-center gap-4">
              <h3 className={`text-2xl font-extrabold ${theme.textStrong} w-48 tracking-tight`}>{monthNames[currentMonth]} {currentYear}</h3>
              <div className="flex gap-2">
                <button onClick={handlePrevMonth} className={`p-2 rounded-lg border ${theme.border} ${theme.hover} hover:shadow-sm transition-all`}><ChevronLeft className={`w-4 h-4 ${theme.textMuted}`} /></button>
                <button onClick={handleNextMonth} className={`p-2 rounded-lg border ${theme.border} ${theme.hover} hover:shadow-sm transition-all`}><ChevronRight className={`w-4 h-4 ${theme.textMuted}`} /></button>
              </div>
            </div>
            <div className="flex gap-2 items-center bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className={`text-xs font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'} uppercase tracking-wider`}>Scheduled Event</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3 text-center mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className={`text-[11px] font-extrabold ${theme.textMuted} uppercase tracking-widest`}>{day}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`empty-${index}`} className="h-28 bg-transparent" />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const monthStr = String(currentMonth + 1).padStart(2, '0');
              const dayStr = String(day).padStart(2, '0');
              const exactDateStr = `${currentYear}-${monthStr}-${dayStr}`;
              const blockedEvent = calendarEvents.find(e => e.date === exactDateStr);
              const hasRSVPd = blockedEvent?.attendees.includes("Current User");
              const isSelected = blockedEvent && selectedEventId === blockedEvent.id;
              
              const dayOfWeek = (firstDayOfMonth + day - 1) % 7;
              let popoverClass = "left-1/2 -translate-x-1/2";
              let pointerClass = "left-1/2 -translate-x-1/2";
              
              if (dayOfWeek === 0 || dayOfWeek === 1) {
                popoverClass = "left-0 translate-x-0";
                pointerClass = "left-6 translate-x-0";
              } else if (dayOfWeek === 5 || dayOfWeek === 6) {
                popoverClass = "right-0 translate-x-0";
                pointerClass = "right-6 translate-x-0";
              }

              return (
                <div 
                  key={day} 
                  onClick={() => blockedEvent && handleEventClick(blockedEvent.id)}
                  className={`relative h-28 border rounded-xl p-3 transition-all duration-300 flex flex-col justify-between overflow-visible 
                    ${blockedEvent ? 'bg-emerald-500/10 border-emerald-500/50 cursor-pointer hover:bg-emerald-500/20 hover:-translate-y-1 hover:shadow-lg shadow-emerald-500/10' : `${theme.bg} ${theme.border}${isDark ? 'hover:border-gray-500' : 'hover:border-gray-400'}`}`}
                >
                  <span className={`text-sm font-extrabold ${blockedEvent ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : theme.textMuted}`}>{day}</span>
                  {blockedEvent && (
                    <div className="mt-auto">
                      <span className={`text-[10px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'} truncate w-full text-left block leading-tight mb-1`}>{blockedEvent.name}</span>
                      <span className="flex items-center gap-1 text-[9px] font-bold text-white bg-emerald-500 px-1.5 py-0.5 rounded w-fit">
                        <Users className="w-2.5 h-2.5" /> {blockedEvent.attendees.length}
                      </span>
                    </div>
                  )}

                  {isSelected && (
                    <div onClick={(e) => e.stopPropagation()} className={`absolute z-50 bottom-[110%] ${popoverClass} w-72 p-6 rounded-2xl shadow-2xl border ${isDark ? 'bg-[#1a1a1a]/95 border-[#333]' : 'bg-white/95 border-gray-200'} backdrop-blur-xl cursor-default ring-1 ring-black/5`}>
                      <button onClick={() => setSelectedEventId(null)} className={`absolute top-4 right-4 ${theme.textMuted} hover:text-red-500 transition-colors bg-gray-500/10 rounded-full p-1`}><X className="w-4 h-4" /></button>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`px-2.5 py-1 bg-emerald-500/10 ${isDark ? 'text-emerald-400' : 'text-emerald-600'} rounded text-[10px] font-bold uppercase tracking-wider`}>{blockedEvent.date}</span>
                        <span className={`px-2.5 py-1 bg-gray-500/10 ${theme.textMuted} rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5`}>
                          <Clock className="w-3 h-3" /> {blockedEvent.time || 'All Day'}
                        </span>
                      </div>
                      
                      <h4 className={`font-extrabold text-lg mb-2 pr-6 ${theme.textStrong} leading-tight`}>{blockedEvent.name}</h4>
                      <p className={`text-xs mb-4 ${theme.textMuted} leading-relaxed`}>{blockedEvent.desc || 'No description provided.'}</p>
                      
                      <div className={`p-3 rounded-lg bg-gray-500/5 border border-gray-500/10 mb-4`}>
                        <div className={`text-[10px] uppercase tracking-widest font-bold ${theme.textMuted} mb-1`}>Reason for Block</div>
                        <p className={`text-xs font-medium ${theme.textStrong} italic`}>{blockedEvent.reason || 'None provided.'}</p>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-500/10">
                        {isStudent && (
                          <button onClick={() => handleRSVP(blockedEvent.id)} className={`w-full py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-sm 
                            ${hasRSVPd ? 'bg-red-500 text-white hover:bg-red-600 hover:-translate-y-0.5' : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:-translate-y-0.5'}`}>
                            {hasRSVPd ? 'Cancel RSVP' : 'Count Me In!'}
                          </button>
                        )}

                        {canViewRSVPs && (
                          <div className="mt-2">
                            <div className={`flex items-center justify-between text-xs font-extrabold ${isDark ? 'text-emerald-400' : 'text-emerald-600'} mb-2.5`}>
                              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> Guest List</span>
                              <span className="bg-emerald-500/20 px-2 py-0.5 rounded-md">{blockedEvent.attendees.length} RSVPs</span>
                            </div>
                            {blockedEvent.attendees.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                                {blockedEvent.attendees.map(attendee => (
                                  <span key={attendee} className={`text-[10px] font-bold px-2 py-1 rounded-md bg-gray-500/10 ${theme.textStrong}`}>{attendee}</span>
                                ))}
                              </div>
                            ) : (
                              <p className={`text-[11px] font-medium ${theme.textMuted} italic`}>No one has RSVP'd yet.</p>
                            )}
                          </div>
                        )}
                      </div>

                      {canUnblockDate && (
                        <button onClick={() => handleUnblockDate(blockedEvent.id)} className="mt-4 w-full bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/20 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5">
                          <Trash2 className="w-4 h-4" /> Remove Event
                        </button>
                      )}
                      
                      <div className={`absolute -bottom-2 ${pointerClass} w-4 h-4 rotate-45 border-r border-b ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'}`}></div>
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