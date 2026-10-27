import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, CheckCircle, Clock, AlertCircle, ShieldAlert, Trash2, XCircle } from 'lucide-react';

export default function EventCalendar({ theme, activeRole }) {
  const normalizedRole = String(activeRole || '').toLowerCase().trim();

  if (normalizedRole === 'student' || !normalizedRole) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
        <ShieldAlert className="w-16 h-16 text-red-500/50 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-gray-400 text-sm">The Event Planner is restricted to Club Leads and Student Council.</p>
      </div>
    );
  }

  const safeTheme = theme || {
    bg: 'bg-[#0a0a0a]', surface: 'bg-[#121212]', border: 'border-[#262626]',
    textStrong: 'text-white', textMuted: 'text-gray-400', inputBg: 'bg-[#1a1a1a]'
  };

  const isAdmin = normalizedRole.includes('admin');
  const isPresident = normalizedRole.includes('president') || isAdmin;
  const isVP = normalizedRole.includes('vp') || normalizedRole.includes('vice') || isAdmin;
  const isTreasurer = normalizedRole.includes('treasurer') || isAdmin;
  
  const isCouncil = normalizedRole.includes('council') || isAdmin || isPresident || isVP || isTreasurer;

  const [events, setEvents] = useState([]);
  const [eventDate, setEventDate] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventPurpose, setEventPurpose] = useState('');

  useEffect(() => {
    fetchEvents();
    const sub = supabase.channel('public:calendar_events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, fetchEvents)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase.from('calendar_events').select('*').order('date', { ascending: true });
    if (data) setEvents(data);
  };

  const handleSubmitEvent = async (e) => {
    e.preventDefault();
    const newEvent = {
      date: eventDate, name: eventName, purpose: eventPurpose,
      status: 'pending', pres_approved: false, vp_approved: false, treas_approved: false
    };
    await supabase.from('calendar_events').insert([newEvent]);
    setEventDate(''); setEventName(''); setEventPurpose('');
  };

  const handleToggleApproval = async (event, roleType) => {
    // SAFETY CATCH: Prevent mass-updates if ID is missing
    if (!event.id) {
      alert("Critical Error: Event ID is missing. Cannot update.");
      return;
    }

    // Determine if we are approving or reverting based on current state
    let isCurrentlyApproved = false;
    if (roleType === 'president') isCurrentlyApproved = event.pres_approved;
    if (roleType === 'vp') isCurrentlyApproved = event.vp_approved;
    if (roleType === 'treasurer') isCurrentlyApproved = event.treas_approved;

    let updates = {};
    if (roleType === 'president') updates.pres_approved = !isCurrentlyApproved;
    if (roleType === 'vp') updates.vp_approved = !isCurrentlyApproved;
    if (roleType === 'treasurer') updates.treas_approved = !isCurrentlyApproved;

    // Calculate if all 3 signatures are present after this click
    const willBePres = roleType === 'president' ? updates.pres_approved : event.pres_approved;
    const willBeVp = roleType === 'vp' ? updates.vp_approved : event.vp_approved;
    const willBeTreas = roleType === 'treasurer' ? updates.treas_approved : event.treas_approved;

    updates.status = (willBePres && willBeVp && willBeTreas) ? 'approved' : 'pending';

    const { error } = await supabase.from('calendar_events').update(updates).eq('id', event.id);
    if (error) alert("Action failed: " + error.message);
  };

  const handleDenyEvent = async (id) => {
    if (!isCouncil) return;
    if (!id) return alert("Critical Error: Event ID is missing.");
    
    const confirmDeny = window.confirm("Are you sure you want to DENY and delete this event request?");
    if (!confirmDeny) return;

    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) alert("Deny failed: " + error.message);
  };

  const pendingEvents = events.filter(e => e.status === 'pending');
  const approvedEvents = events.filter(e => e.status === 'approved');

  return (
    <div className="max-w-6xl mx-auto space-y-8 w-full animate-in fade-in">
      
      {/* 3-KEY PENDING APPROVAL QUEUE */}
      {pendingEvents.length > 0 && (
        <div className={`${safeTheme.surface} border border-amber-500/30 rounded-2xl p-6 shadow-sm`}>
          <h3 className="text-sm font-extrabold text-amber-500 mb-4 flex items-center gap-2 uppercase tracking-wider">
            <AlertCircle className="w-4 h-4" /> Needs 3-Key Approval
          </h3>
          <div className="space-y-3">
            {pendingEvents.map(ev => (
              <div key={ev.id} className="p-4 bg-[#1a1a1a] rounded-xl border border-[#262626] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-amber-500 mb-1">{ev.date}</div>
                  <div className="text-sm font-extrabold text-white">{ev.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{ev.purpose}</div>
                </div>
                
                {/* Signatures & Deny Button */}
                <div className="flex flex-wrap items-center gap-2">
                  <ApprovalKey label="President" isSigned={ev.pres_approved} canSign={isPresident} onToggle={() => handleToggleApproval(ev, 'president')} roleStr={normalizedRole} />
                  <ApprovalKey label="VP" isSigned={ev.vp_approved} canSign={isVP} onToggle={() => handleToggleApproval(ev, 'vp')} roleStr={normalizedRole} />
                  <ApprovalKey label="Treasurer" isSigned={ev.treas_approved} canSign={isTreasurer} onToggle={() => handleToggleApproval(ev, 'treasurer')} roleStr={normalizedRole} />
                  
                  {isCouncil && (
                    <button 
                      onClick={() => handleDenyEvent(ev.id)} 
                      className="ml-2 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg border border-red-500/20 transition-all flex flex-col items-center justify-center h-14 shadow-sm"
                    >
                      <XCircle className="w-4 h-4 mb-1" />
                      <span className="text-[9px] font-bold uppercase">Deny</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SUBMIT NEW EVENT FORM */}
        <div className={`lg:col-span-1 ${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 h-fit`}>
          <h3 className="text-sm font-extrabold text-white mb-4">Propose Event</h3>
          <form onSubmit={handleSubmitEvent} className="space-y-4">
            <input type="date" required value={eventDate} onChange={(e)=>setEventDate(e.target.value)} className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs text-white outline-none`} />
            <input type="text" required placeholder="Event Name" value={eventName} onChange={(e)=>setEventName(e.target.value)} className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs text-white outline-none`} />
            <textarea required placeholder="Purpose / Requirements" value={eventPurpose} onChange={(e)=>setEventPurpose(e.target.value)} rows="3" className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs text-white outline-none`} />
            <button type="submit" className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white text-xs font-extrabold py-3 rounded-xl transition-all shadow-sm">Submit for 3-Key Approval</button>
          </form>
        </div>

        {/* OFFICIAL CALENDAR LIST */}
        <div className={`lg:col-span-2 ${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6`}>
          <h3 className="text-sm font-extrabold text-emerald-500 mb-4 flex items-center gap-2 uppercase tracking-wider">
            <Calendar className="w-4 h-4" /> Official Approved Calendar
          </h3>
          <div className="space-y-3">
            {approvedEvents.length === 0 ? <p className="text-xs text-gray-500 italic font-medium">No approved events yet.</p> : 
             approvedEvents.map(ev => (
              <div key={ev.id} className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="px-3 py-2 bg-emerald-500/10 rounded-lg text-center min-w-[70px]">
                    <div className="text-lg font-extrabold text-emerald-500">{new Date(ev.date).getDate()}</div>
                    <div className="text-[10px] uppercase font-bold text-emerald-600">{new Date(ev.date).toLocaleString('default', { month: 'short' })}</div>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">{ev.name}</h4>
                    <p className="text-xs text-gray-400 mt-1">{ev.purpose}</p>
                  </div>
                </div>
                {/* Allow reverting even after it is officially approved */}
                {isCouncil && (
                  <button onClick={() => handleToggleApproval(ev, isPresident ? 'president' : isVP ? 'vp' : 'treasurer')} className="px-3 py-2 text-amber-500 hover:bg-amber-500/10 border border-amber-500/20 bg-amber-500/5 rounded-lg transition-colors flex flex-col items-center">
                     <Clock className="w-4 h-4 mb-1" />
                     <span className="text-[9px] font-bold uppercase">Revoke</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Updated Key Component that supports Reverting
function ApprovalKey({ label, isSigned, canSign, onToggle, roleStr }) {
  const forceCanSign = canSign || String(roleStr).includes('council') || String(roleStr).includes('admin');

  if (isSigned) {
    return (
      <button 
        onClick={forceCanSign ? onToggle : undefined} 
        title={forceCanSign ? "Click to Revoke Approval" : ""}
        className={`flex flex-col items-center justify-center w-20 h-14 rounded-lg transition-all shadow-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 ${forceCanSign ? 'cursor-pointer hover:bg-red-500/10 hover:border-red-500 hover:text-red-500' : ''}`}
      >
        <CheckCircle className="w-4 h-4 mb-1" />
        <span className="text-[9px] font-bold uppercase">{label}</span>
      </button>
    );
  }
  
  if (forceCanSign) {
    return (
      <button 
        onClick={onToggle} 
        className="flex flex-col items-center justify-center w-20 h-14 bg-emerald-500/10 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white border border-emerald-500/30 rounded-lg text-emerald-500 transition-all shadow-sm cursor-pointer"
      >
        <CheckCircle className="w-4 h-4 mb-1" />
        <span className="text-[9px] font-bold uppercase">Approve</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-20 h-14 bg-gray-500/10 border border-gray-500/20 rounded-lg text-gray-500">
      <Clock className="w-4 h-4 mb-1" />
      <span className="text-[9px] font-bold uppercase">Pending</span>
    </div>
  );
}