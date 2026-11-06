import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, CheckCircle, Clock, AlertCircle, ShieldAlert, Trash2, XCircle, Sparkles, DollarSign, UserCheck } from 'lucide-react';

const DEFAULT_DEMO_EVENTS = [
  {
    id: 'ev-1',
    date: '2026-11-12',
    name: 'Product Management Hackathon',
    purpose: 'Inter-cohort 48-hour case challenge with industry product leaders. Includes goodies & guest speaker cabs.',
    estimated_budget: 15000,
    status: 'pending',
    ashil_approved: true,
    madhur_approved: false,
    spandan_approved: false,
    pres_approved: true,
    vp_approved: false,
    treas_approved: false
  },
  {
    id: 'ev-2',
    date: '2026-11-20',
    name: 'Venture Capital & Founders Panel',
    purpose: 'Fireside chat with seed stage partners and SSB founders.',
    estimated_budget: 8000,
    status: 'approved',
    ashil_approved: true,
    madhur_approved: true,
    spandan_approved: true,
    pres_approved: true,
    vp_approved: true,
    treas_approved: true
  }
];

export default function EventCalendar({ theme, activeRole, userName, userProfile }) {
  const safeTheme = theme || {
    bg: 'bg-[#0a0a0a]', surface: 'bg-[#121212]', border: 'border-[#262626]',
    textStrong: 'text-white', textMuted: 'text-gray-400', inputBg: 'bg-[#1a1a1a]'
  };

  const normalizedRole = String(activeRole || '').toLowerCase().trim();
  const userFullName = String(userProfile?.full_name || userName || '').toLowerCase();

  if (normalizedRole === 'student' || !normalizedRole) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
        <ShieldAlert className="w-16 h-16 text-red-500/50 mb-4" />
        <h2 className={`text-xl font-bold ${safeTheme.textStrong} mb-2`}>Access Restricted</h2>
        <p className={`${safeTheme.textMuted} text-sm max-w-md`}>
          The Event Planner is restricted to Club Leads and Student Council. Use the bottom-right <strong>POV Switcher</strong> to switch to <strong>Ashil</strong>, <strong>Madhur</strong>, <strong>Spandan</strong>, or <strong>Club Lead</strong>.
        </p>
      </div>
    );
  }

  const isAdmin = normalizedRole.includes('admin');
  
  // Named approvers per Guidelines: Ashil, Madhur, and Spandan
  const isAshil = userFullName.includes('ashil') || normalizedRole.includes('president') || isAdmin;
  const isMadhur = userFullName.includes('madhur') || normalizedRole.includes('vp') || normalizedRole.includes('vice') || isAdmin;
  const isSpandan = userFullName.includes('spandan') || normalizedRole.includes('treasurer') || isAdmin;
  
  const isCouncil = normalizedRole.includes('council') || isAdmin || isAshil || isMadhur || isSpandan;

  const [events, setEvents] = useState(() => {
    try {
      const cached = localStorage.getItem('scaler_events_backup');
      return cached ? JSON.parse(cached) : DEFAULT_DEMO_EVENTS;
    } catch (e) {
      return DEFAULT_DEMO_EVENTS;
    }
  });

  const [eventDate, setEventDate] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventPurpose, setEventPurpose] = useState('');
  const [eventBudget, setEventBudget] = useState('');

  useEffect(() => {
    fetchEvents();
    const sub = supabase.channel('public:calendar_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, fetchEvents)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  // Sync to local storage
  useEffect(() => {
    if (events && events.length > 0) {
      try {
        localStorage.setItem('scaler_events_backup', JSON.stringify(events));
      } catch (e) {}
    }
  }, [events]);

  const fetchEvents = async () => {
    try {
      const fetchPromise = supabase.from('calendar_events').select('*').order('date', { ascending: true });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 700));
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      if (!error && data && data.length > 0) {
        setEvents(data);
        localStorage.setItem('scaler_events_backup', JSON.stringify(data));
      }
    } catch (err) {
      // Supabase fetch timed out or offline, relying on local events
    }
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    const newEvent = {
      id: 'ev-' + Date.now(),
      date: eventDate,
      name: eventName,
      purpose: eventPurpose,
      estimated_budget: Number(eventBudget) || 0,
      status: 'pending',
      ashil_approved: false,
      madhur_approved: false,
      spandan_approved: false,
      pres_approved: false,
      vp_approved: false,
      treas_approved: false
    };

    // Optimistic addition
    setEvents(prev => [...prev, newEvent]);
    setEventDate('');
    setEventName('');
    setEventPurpose('');
    setEventBudget('');

    try {
      await supabase.from('calendar_events').insert([newEvent]);
    } catch (err) {
      console.warn('Supabase remote insert sync failed:', err);
    }
  };

  const handleToggleApproval = async (event, keyName) => {
    if (!event.id) return;

    let isCurrentlyApproved = false;
    if (keyName === 'ashil') isCurrentlyApproved = !!(event.ashil_approved ?? event.pres_approved);
    if (keyName === 'madhur') isCurrentlyApproved = !!(event.madhur_approved ?? event.vp_approved);
    if (keyName === 'spandan') isCurrentlyApproved = !!(event.spandan_approved ?? event.treas_approved);

    let updates = {};
    if (keyName === 'ashil') {
      updates.ashil_approved = !isCurrentlyApproved;
      updates.pres_approved = updates.ashil_approved;
    }
    if (keyName === 'madhur') {
      updates.madhur_approved = !isCurrentlyApproved;
      updates.vp_approved = updates.madhur_approved;
    }
    if (keyName === 'spandan') {
      updates.spandan_approved = !isCurrentlyApproved;
      updates.treas_approved = updates.spandan_approved;
    }

    const willBeAshil = keyName === 'ashil' ? updates.ashil_approved : !!(event.ashil_approved ?? event.pres_approved);
    const willBeMadhur = keyName === 'madhur' ? updates.madhur_approved : !!(event.madhur_approved ?? event.vp_approved);
    const willBeSpandan = keyName === 'spandan' ? updates.spandan_approved : !!(event.spandan_approved ?? event.treas_approved);

    updates.status = (willBeAshil && willBeMadhur && willBeSpandan) ? 'approved' : 'pending';

    // Optimistically update state
    setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, ...updates } : ev));

    try {
      await supabase.from('calendar_events').update(updates).eq('id', event.id);
    } catch (err) {
      console.warn('Supabase remote update sync failed:', err);
    }
  };

  const handleDenyEvent = async (id) => {
    if (!isCouncil || !id) return;
    
    const confirmDeny = window.confirm("Are you sure you want to DENY and remove this event proposal?");
    if (!confirmDeny) return;

    // Optimistically remove from state
    setEvents(prev => prev.filter(e => e.id !== id));

    try {
      await supabase.from('calendar_events').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase remote delete sync failed:', err);
    }
  };

  const pendingEvents = events.filter(e => e.status === 'pending');
  const approvedEvents = events.filter(e => e.status === 'approved');

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full animate-in fade-in">
      
      {/* 3-KEY PENDING APPROVAL QUEUE: ASHIL, MADHUR & SPANDAN */}
      {pendingEvents.length > 0 && (
        <div className={`${safeTheme.surface} border border-amber-500/30 rounded-2xl p-6 shadow-sm`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-amber-500 flex items-center gap-2 uppercase tracking-wider">
                <AlertCircle className="w-4 h-4" /> Needs 3-Key Approval ({pendingEvents.length})
              </h3>
              <p className={`text-[11px] ${safeTheme.textMuted} mt-0.5`}>
                All event plans & budgets must be approved by <strong>Ashil</strong>, <strong>Madhur</strong>, and <strong>Spandan</strong> before commitments.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 self-start sm:self-auto">
              Mandatory Guideline 2
            </span>
          </div>

          <div className="space-y-3">
            {pendingEvents.map(ev => {
              const isAshilSigned = ev.ashil_approved ?? ev.pres_approved;
              const isMadhurSigned = ev.madhur_approved ?? ev.vp_approved;
              const isSpandanSigned = ev.spandan_approved ?? ev.treas_approved;

              return (
                <div key={ev.id} className={`p-4 ${safeTheme.inputBg} rounded-xl border ${safeTheme.border} flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-sm`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-amber-500">{ev.date}</span>
                      {ev.estimated_budget ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Est. Budget: ₹{Number(ev.estimated_budget).toLocaleString('en-IN')}
                        </span>
                      ) : null}
                    </div>
                    <div className={`text-sm font-extrabold ${safeTheme.textStrong}`}>{ev.name}</div>
                    <div className={`text-xs ${safeTheme.textMuted} leading-relaxed`}>{ev.purpose}</div>
                  </div>
                  
                  {/* Signatures & Deny Button */}
                  <div className="flex flex-wrap items-center gap-2">
                    <ApprovalKey 
                      label="Ashil" 
                      subLabel="Approver 1"
                      isSigned={isAshilSigned} 
                      canSign={isAshil} 
                      onToggle={() => handleToggleApproval(ev, 'ashil')} 
                      roleStr={normalizedRole} 
                    />
                    <ApprovalKey 
                      label="Madhur" 
                      subLabel="Approver 2"
                      isSigned={isMadhurSigned} 
                      canSign={isMadhur} 
                      onToggle={() => handleToggleApproval(ev, 'madhur')} 
                      roleStr={normalizedRole} 
                    />
                    <ApprovalKey 
                      label="Spandan" 
                      subLabel="Budget Owner"
                      isSigned={isSpandanSigned} 
                      canSign={isSpandan} 
                      onToggle={() => handleToggleApproval(ev, 'spandan')} 
                      roleStr={normalizedRole} 
                    />
                    
                    {isCouncil && (
                      <button 
                        onClick={() => handleDenyEvent(ev.id)} 
                        title="Deny event proposal"
                        className="ml-1 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg border border-red-500/20 transition-all flex flex-col items-center justify-center h-14 shadow-sm cursor-pointer"
                      >
                        <XCircle className="w-4 h-4 mb-1" />
                        <span className="text-[9px] font-bold uppercase">Deny</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SUBMIT NEW EVENT FORM */}
        <div className={`lg:col-span-1 ${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 h-fit shadow-sm`}>
          <div className="mb-4">
            <h3 className={`text-sm font-extrabold ${safeTheme.textStrong}`}>Propose Event & Budget</h3>
            <p className={`text-[11px] ${safeTheme.textMuted} mt-0.5`}>
              Requires approval from <strong>Ashil</strong>, <strong>Madhur</strong>, and <strong>Spandan</strong>.
            </p>
          </div>

          <form onSubmit={handleSubmitEvent} className="space-y-3.5">
            <div>
              <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1 block`}>
                Event Date *
              </label>
              <input 
                type="date" 
                required 
                value={eventDate} 
                onChange={(e)=>setEventDate(e.target.value)} 
                className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3 py-2.5 text-xs outline-none focus:border-emerald-500 transition-all`} 
              />
            </div>

            <div>
              <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1 block`}>
                Event Name *
              </label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Product Hackathon, Treks, Trek Meet" 
                value={eventName} 
                onChange={(e)=>setEventName(e.target.value)} 
                className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3 py-2.5 text-xs outline-none focus:border-emerald-500 transition-all`} 
              />
            </div>

            <div>
              <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1 block`}>
                Estimated Budget (₹) *
              </label>
              <input 
                type="number" 
                required
                placeholder="e.g. 15000 (Fits in ₹20k club / ₹2.5L council)" 
                value={eventBudget} 
                onChange={(e)=>setEventBudget(e.target.value)} 
                className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-emerald-500 transition-all`} 
              />
            </div>

            <div>
              <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1 block`}>
                Purpose, Requirements & Itemised Heads *
              </label>
              <textarea 
                required 
                placeholder="Detail venue, guest cabs, prize money, certificates, goodies, or faculty gifts..." 
                value={eventPurpose} 
                onChange={(e)=>setEventPurpose(e.target.value)} 
                rows="3" 
                className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3 py-2.5 text-xs outline-none focus:border-emerald-500 transition-all leading-relaxed`} 
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white text-xs font-extrabold py-3.5 rounded-xl transition-all shadow-sm cursor-pointer active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Submit for 3-Key Sign-off</span>
            </button>
          </form>
        </div>

        {/* OFFICIAL CALENDAR LIST */}
        <div className={`lg:col-span-2 ${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-emerald-500 flex items-center gap-2 uppercase tracking-wider">
              <Calendar className="w-4 h-4" /> Official Approved Calendar
            </h3>
            <span className="text-[10px] font-bold text-emerald-500 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              Approved by Ashil, Madhur & Spandan
            </span>
          </div>

          <div className="space-y-3">
            {approvedEvents.length === 0 ? (
              <p className="text-xs text-gray-500 italic font-medium py-8 text-center">
                No approved events yet. Needs all 3 signatures (Ashil, Madhur, and Spandan) to become officially approved.
              </p>
            ) : (
              approvedEvents.map(ev => {
                const dateObj = new Date(ev.date);
                const day = isNaN(dateObj.getDate()) ? '—' : dateObj.getDate();
                const month = isNaN(dateObj.getTime()) ? 'DATE' : dateObj.toLocaleString('default', { month: 'short' });

                return (
                  <div key={ev.id} className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="px-3 py-2 bg-emerald-500/10 rounded-lg text-center min-w-[70px] shrink-0">
                        <div className="text-lg font-extrabold text-emerald-500">{day}</div>
                        <div className="text-[10px] uppercase font-bold text-emerald-600">{month}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-sm font-extrabold ${safeTheme.textStrong} truncate`}>{ev.name}</h4>
                          {ev.estimated_budget ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 whitespace-nowrap">
                              Allocated: ₹{Number(ev.estimated_budget).toLocaleString('en-IN')}
                            </span>
                          ) : null}
                        </div>
                        <p className={`text-xs ${safeTheme.textMuted} mt-1 leading-relaxed`}>{ev.purpose}</p>
                      </div>
                    </div>
                    {/* Allow reverting even after it is officially approved */}
                    {isCouncil && (
                      <button 
                        onClick={() => handleToggleApproval(ev, isAshil ? 'ashil' : isMadhur ? 'madhur' : 'spandan')} 
                        className="px-3 py-2 text-amber-500 hover:bg-amber-500/10 border border-amber-500/20 bg-amber-500/5 rounded-lg transition-colors flex flex-col items-center cursor-pointer shrink-0"
                        title="Revoke your signature"
                      >
                         <Clock className="w-4 h-4 mb-1" />
                         <span className="text-[9px] font-bold uppercase">Revoke</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Updated Key Component for Ashil, Madhur & Spandan
function ApprovalKey({ label, subLabel, isSigned, canSign, onToggle, roleStr }) {
  const forceCanSign = canSign || String(roleStr).includes('council') || String(roleStr).includes('admin');

  if (isSigned) {
    return (
      <button 
        type="button"
        onClick={forceCanSign ? onToggle : undefined} 
        title={forceCanSign ? `Click to Revoke ${label}'s Approval` : `Approved by ${label}`}
        className={`flex flex-col items-center justify-center w-24 h-14 rounded-lg transition-all shadow-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 ${forceCanSign ? 'cursor-pointer hover:bg-red-500/10 hover:border-red-500 hover:text-red-500' : ''}`}
      >
        <CheckCircle className="w-4 h-4 mb-0.5" />
        <span className="text-[10px] font-extrabold uppercase leading-none">{label}</span>
        <span className="text-[8px] font-bold opacity-75 mt-0.5">Approved</span>
      </button>
    );
  }
  
  if (forceCanSign) {
    return (
      <button 
        type="button"
        onClick={onToggle} 
        className="flex flex-col items-center justify-center w-24 h-14 bg-emerald-500/10 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white border border-emerald-500/30 rounded-lg text-emerald-500 transition-all shadow-sm cursor-pointer"
        title={`Sign as ${label} (${subLabel})`}
      >
        <CheckCircle className="w-4 h-4 mb-0.5" />
        <span className="text-[10px] font-extrabold uppercase leading-none">{label}</span>
        <span className="text-[8px] font-bold uppercase opacity-80 mt-0.5">Approve</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-24 h-14 bg-gray-500/10 border border-gray-500/20 rounded-lg text-gray-500">
      <Clock className="w-4 h-4 mb-0.5" />
      <span className="text-[10px] font-bold uppercase leading-none">{label}</span>
      <span className="text-[8px] font-medium opacity-75 mt-0.5">Pending</span>
    </div>
  );
}
