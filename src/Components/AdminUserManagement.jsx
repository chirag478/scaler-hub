import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, Users, CheckCircle2, AlertCircle, Sparkles, Shield } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AdminUserManagement({ theme }) {
  const safeTheme = theme || {
    bg: 'bg-[#0a0a0a]',
    surface: 'bg-[#121212]',
    border: 'border-[#262626]',
    textStrong: 'text-white',
    textMuted: 'text-gray-400',
    inputBg: 'bg-[#1a1a1a]',
    hover: 'hover:bg-[#1f1f1f]',
  };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleGroup, setRoleGroup] = useState('council');
  const [subRole, setSubRole] = useState('President');
  const [clubName, setClubName] = useState('Product Management Club');

  const [creating, setCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // All 6 Official Clubs including Cultural & Sports
  const clubsList = [
    'Product Management Club',
    'Strategy Club',
    'Marketing Club',
    'Entrepreneurship & VC Club',
    'Finance Club',
    'Cultural & Sports'
  ];

  useEffect(() => {
    fetchAllProfiles();
  }, []);

  const fetchAllProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleRoleGroupChange = (group) => {
    setRoleGroup(group);
    if (group === 'council' || group === 'club_lead') setSubRole('President');
    else if (group === 'admin') setSubRole('System Admin');
    else setSubRole('Cohort Member');
  };

  const handleCreateCredential = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: '', text: '' });
    setCreating(true);

    try {
      let finalSubRole = 'Cohort Member';
      let finalOrg = 'PGP Cohort';

      if (roleGroup === 'council') {
        finalSubRole = subRole;
        finalOrg = 'Student Council';
      } else if (roleGroup === 'club_lead') {
        finalSubRole = subRole;
        finalOrg = clubName;
      } else if (roleGroup === 'admin') {
        finalSubRole = 'System Admin';
        finalOrg = 'Administration';
      }

      const tempSupabase = createClient(
        supabase.supabaseUrl,
        supabase.supabaseKey,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { error } = await tempSupabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: roleGroup,
            sub_role: finalSubRole,
            organization: finalOrg,
          },
        },
      });

      if (error) throw error;

      setStatusMsg({
        type: 'success',
        text: `Credentials created for ${fullName} (${finalSubRole} • ${finalOrg})!`
      });

      setFullName('');
      setEmail('');
      setPassword('');
      setTimeout(fetchAllProfiles, 800);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create user.' });
    } finally {
      setCreating(false);
    }
  };

  const handleQuickRoleUpdate = async (userId, newRole, newSubRole, newOrg) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, sub_role: newSubRole, organization: newOrg })
      .eq('id', userId);

    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole, sub_role: newSubRole, organization: newOrg } : u));
    }
  };

  const getBadgeStyle = (role) => {
    if (role === 'admin') return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    if (role === 'council') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (role === 'club_lead') return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    return 'bg-gray-500/10 text-gray-300 border-gray-500/20';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-500 tracking-wider uppercase">
            System Admin • Role & Credential Provisioning
          </span>
        </div>
        <span className={`text-xs font-bold ${safeTheme.textMuted}`}>
          {loading ? 'Syncing directory...' : `${users.length} Registered Accounts`}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: CREATE CREDENTIALS FORM */}
        <div className={`lg:col-span-4 ${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm`}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className={`text-base font-extrabold ${safeTheme.textStrong}`}>Issue New Credentials</h3>
              <p className={`text-[11px] ${safeTheme.textMuted}`}>Create Council, Club, or Admin logins</p>
            </div>
          </div>

          {statusMsg.text && (
            <div className={`mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleCreateCredential} className="space-y-4">
            <div>
              <label className={`block text-[11px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1`}>
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Abhijeet"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3.5 py-2.5 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1`}>
                Login Email
              </label>
              <input
                type="email"
                required
                placeholder="leader@ssb.scaler.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3.5 py-2.5 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1`}>
                Assign Password
              </label>
              <input
                type="text"
                required
                minLength={6}
                placeholder="e.g. Scaler@2026"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3.5 py-2.5 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
              />
            </div>

            <div className="pt-2 border-t border-gray-500/10 space-y-3">
              <label className="block text-[11px] font-bold text-emerald-500 uppercase tracking-wider">
                Section & Authority Level
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'council', label: 'Student Council' },
                  { id: 'club_lead', label: 'Club Leadership' },
                  { id: 'admin', label: 'System Admin' },
                  { id: 'student', label: 'Student' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleRoleGroupChange(item.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border text-left transition-all ${
                      roleGroup === item.id
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : `${safeTheme.inputBg} ${safeTheme.border}${safeTheme.textMuted}`
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {roleGroup === 'council' && (
                <div>
                  <label className={`block text-[11px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1`}>
                    Council Position
                  </label>
                  <select
                    value={subRole}
                    onChange={(e) => setSubRole(e.target.value)}
                    className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-2.5 text-xs font-bold ${safeTheme.textStrong} outline-none`}
                  >
                    <option value="President">President</option>
                    <option value="Vice-President">Vice-President</option>
                    <option value="Treasurer">Treasurer</option>
                  </select>
                </div>
              )}

              {roleGroup === 'club_lead' && (
                <div className="space-y-3">
                  <div>
                    <label className={`block text-[11px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1`}>
                      Select Club
                    </label>
                    <select
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-2.5 text-xs font-bold ${safeTheme.textStrong} outline-none`}
                    >
                      {clubsList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[11px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1`}>
                      Club Role
                    </label>
                    <select
                      value={subRole}
                      onChange={(e) => setSubRole(e.target.value)}
                      className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-2.5 text-xs font-bold ${safeTheme.textStrong} outline-none`}
                    >
                      <option value="President">President</option>
                      <option value="Vice-President">Vice-President</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-[#0A8647] hover:bg-[#0c9d54] disabled:opacity-50 text-white text-xs font-extrabold py-3 rounded-xl transition-all shadow-sm mt-2"
            >
              {creating ? 'Provisioning Account...' : 'Create & Activate Credentials'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: COHORT & LEADERSHIP DIRECTORY */}
        <div className={`lg:col-span-8 ${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm overflow-hidden`}>
          <h3 className={`text-base font-extrabold ${safeTheme.textStrong} mb-5 flex items-center gap-2`}>
            <Users className="w-4 h-4 text-emerald-500" /> Cohort & Leadership Directory
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className={`border-b ${safeTheme.border} text-[11px] font-extrabold uppercase tracking-wider ${safeTheme.textMuted}`}>
                  <th className="pb-3 pr-4 w-[32%]">Name & Email</th>
                  <th className="pb-3 px-4 w-[36%]">Current Designation</th>
                  <th className="pb-3 pl-4 text-right w-[32%]">Quick Role Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-500/10 text-xs">
                {users.map((u) => {
                  const displayOrg = u.organization === 'Cultural & Sports Committee' ? 'Cultural & Sports' : u.organization;
                  const selectVal = `${u.role}|${u.sub_role}|${displayOrg}`;

                  return (
                    <tr key={u.id} className="hover:bg-gray-500/5 transition-colors">
                      {/* Column 1: Name & Email */}
                      <td className="py-4 pr-4 align-middle">
                        <div className={`font-extrabold text-sm ${safeTheme.textStrong}`}>{u.full_name}</div>
                        <div className={`text-[11px] ${safeTheme.textMuted} truncate max-w-[200px]`}>{u.email}</div>
                      </td>

                      {/* Column 2: Clean Non-Wrapping Badge Layout */}
                      <td className="py-4 px-4 align-middle">
                        <div className="flex flex-col items-start gap-1">
                          <span 
                            style={{ whiteSpace: 'nowrap' }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border ${getBadgeStyle(u.role)}`}
                          >
                            <Shield className="w-3 h-3 shrink-0" />
                            {u.sub_role}
                          </span>
                          <span className={`text-[11px] font-bold ${safeTheme.textMuted} pl-1`}>
                            {displayOrg}
                          </span>
                        </div>
                      </td>

                      {/* Column 3: Role Override Select */}
                      <td className="py-4 pl-4 text-right align-middle">
                        <select
                          value={selectVal}
                          onChange={(e) => {
                            const [r, sr, org] = e.target.value.split('|');
                            handleQuickRoleUpdate(u.id, r, sr, org);
                          }}
                          className={`${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-2 text-xs font-bold ${safeTheme.textStrong} outline-none focus:border-emerald-500 transition-colors cursor-pointer w-full max-w-[240px]`}
                        >
                          <optgroup label="Student Cohort">
                            <option value="student|Cohort Member|PGP Cohort">Student (PGP Cohort)</option>
                          </optgroup>
                          <optgroup label="Student Council">
                            <option value="council|President|Student Council">Council: President</option>
                            <option value="council|Vice-President|Student Council">Council: Vice-President</option>
                            <option value="council|Treasurer|Student Council">Council: Treasurer</option>
                          </optgroup>
                          <optgroup label="Product Management Club">
                            <option value="club_lead|President|Product Management Club">Product Management Club: President</option>
                            <option value="club_lead|Vice-President|Product Management Club">Product Management Club: Vice-President</option>
                          </optgroup>
                          <optgroup label="Strategy Club">
                            <option value="club_lead|President|Strategy Club">Strategy Club: President</option>
                            <option value="club_lead|Vice-President|Strategy Club">Strategy Club: Vice-President</option>
                          </optgroup>
                          <optgroup label="Marketing Club">
                            <option value="club_lead|President|Marketing Club">Marketing Club: President</option>
                            <option value="club_lead|Vice-President|Marketing Club">Marketing Club: Vice-President</option>
                          </optgroup>
                          <optgroup label="Entrepreneurship & VC Club">
                            <option value="club_lead|President|Entrepreneurship & VC Club">Entrepreneurship & VC Club: President</option>
                            <option value="club_lead|Vice-President|Entrepreneurship & VC Club">Entrepreneurship & VC Club: Vice-President</option>
                          </optgroup>
                          <optgroup label="Finance Club">
                            <option value="club_lead|President|Finance Club">Finance Club: President</option>
                            <option value="club_lead|Vice-President|Finance Club">Finance Club: Vice-President</option>
                          </optgroup>
                          <optgroup label="Cultural & Sports">
                            <option value="club_lead|President|Cultural & Sports">Cultural & Sports: President</option>
                            <option value="club_lead|Vice-President|Cultural & Sports">Cultural & Sports: Vice-President</option>
                          </optgroup>
                          <optgroup label="System Administration">
                            <option value="admin|System Admin|Administration">System Admin</option>
                          </optgroup>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}