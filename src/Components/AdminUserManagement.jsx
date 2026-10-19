import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, Shield, Users, Award, Key, Mail, User, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AdminUserManagement({ theme }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Credential Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleGroup, setRoleGroup] = useState('council'); // 'council' | 'club_lead' | 'admin' | 'student'
  const [subRole, setSubRole] = useState('President');
  const [clubName, setClubName] = useState('Product Club');

  const [creating, setCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  const clubsList = [
    'Product Club',
    'Tech & AI Club',
    'Finance & Consulting Club',
    'Marketing & Brand Club',
    'Entrepreneurship Cell',
    'Cultural & Sports Committee'
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

  // Provision a brand new account in the background without logging out the System Admin!
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

      // Create an isolated, non-persisting client so the Admin stays logged in!
      const tempSupabase = createClient(
        supabase.supabaseUrl,
        supabase.supabaseKey,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );

      const { data, error } = await tempSupabase.auth.signUp({
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
        text: `Credentials created for ${fullName} (${finalSubRole} • ${finalOrg})! You can now share the email & password with them.`
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

  // Update an existing user's role directly in the database
  const handleQuickRoleUpdate = async (userId, newRole, newSubRole, newOrg) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, sub_role: newSubRole, organization: newOrg })
      .eq('id', userId);

    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole, sub_role: newSubRole, organization: newOrg } : u));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-500 tracking-wider uppercase">
            System Admin • Role & Credential Provisioning
          </span>
        </div>
        <span className={`text-xs font-bold ${theme.textMuted}`}>{users.length} Registered Accounts</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: CREATE CREDENTIALS FORM */}
        <div className={`lg:col-span-1 ${theme.surface} border ${theme.border} rounded-2xl p-6 h-fit shadow-sm`}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className={`text-base font-extrabold ${theme.textStrong}`}>Issue New Credentials</h3>
              <p className={`text-[11px] ${theme.textMuted}`}>Create Council, Club, or Admin logins</p>
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
              <label className={`block text-[11px] font-bold ${theme.textMuted} uppercase tracking-wider mb-1`}>
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Abhijeet"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-3.5 py-2.5 text-xs ${theme.textStrong} outline-none focus:border-emerald-500`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold ${theme.textMuted} uppercase tracking-wider mb-1`}>
                Login Email
              </label>
              <input
                type="email"
                required
                placeholder="president.council@ssb.scaler.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-3.5 py-2.5 text-xs ${theme.textStrong} outline-none focus:border-emerald-500`}
              />
            </div>

            <div>
              <label className={`block text-[11px] font-bold ${theme.textMuted} uppercase tracking-wider mb-1`}>
                Assign Temporary Password
              </label>
              <input
                type="text"
                required
                minLength={6}
                placeholder="e.g. Council@2026"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-3.5 py-2.5 text-xs ${theme.textStrong} outline-none focus:border-emerald-500`}
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
                        : `${theme.inputBg} ${theme.border}${theme.textMuted}`
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {roleGroup === 'council' && (
                <div>
                  <label className={`block text-[11px] font-bold ${theme.textMuted} uppercase tracking-wider mb-1`}>
                    Council Position
                  </label>
                  <select
                    value={subRole}
                    onChange={(e) => setSubRole(e.target.value)}
                    className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-3 py-2.5 text-xs font-bold ${theme.textStrong} outline-none`}
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
                    <label className={`block text-[11px] font-bold ${theme.textMuted} uppercase tracking-wider mb-1`}>
                      Select Club
                    </label>
                    <select
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-3 py-2.5 text-xs font-bold ${theme.textStrong} outline-none`}
                    >
                      {clubsList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[11px] font-bold ${theme.textMuted} uppercase tracking-wider mb-1`}>
                      Club Role
                    </label>
                    <select
                      value={subRole}
                      onChange={(e) => setSubRole(e.target.value)}
                      className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-3 py-2.5 text-xs font-bold ${theme.textStrong} outline-none`}
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

        {/* RIGHT COLUMN: DIRECTORY OF ALL USERS & QUICK ROLE ASSIGNER */}
        <div className={`lg:col-span-2 ${theme.surface} border ${theme.border} rounded-2xl p-6 overflow-x-auto shadow-sm`}>
          <h3 className={`text-base font-extrabold ${theme.textStrong} mb-4 flex items-center gap-2`}>
            <Users className="w-4 h-4 text-emerald-500" /> Cohort & Leadership Directory
          </h3>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b ${theme.border} text-[11px] font-extrabold uppercase tracking-wider ${theme.textMuted}`}>
                <th className="pb-3 pr-4">Name & Email</th>
                <th className="pb-3 px-4">Current Designation</th>
                <th className="pb-3 pl-4 text-right">Quick Role Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-500/10 text-xs">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-500/5 transition-colors">
                  <td className="py-3.5 pr-4">
                    <div className={`font-extrabold ${theme.textStrong}`}>{u.full_name}</div>
                    <div className={`text-[11px] ${theme.textMuted}`}>{u.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      u.role === 'admin' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                      u.role === 'council' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                      u.role === 'club_lead' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>
                      {u.sub_role} • {u.organization}
                    </span>
                  </td>
                  <td className="py-3.5 pl-4 text-right">
                    <select
                      value={`${u.role}|${u.sub_role}|${u.organization}`}
                      onChange={(e) => {
                        const [r, sr, org] = e.target.value.split('|');
                        handleQuickRoleUpdate(u.id, r, sr, org);
                      }}
                      className={`${theme.inputBg} border ${theme.border} rounded-lg px-2.5 py-1.5 text-[11px] font-bold ${theme.textStrong} outline-none`}
                    >
                      <option value="student|Cohort Member|PGP Cohort">Student (PGP Cohort)</option>
                      <option value="council|President|Student Council">Council: President</option>
                      <option value="council|Vice-President|Student Council">Council: Vice-President</option>
                      <option value="council|Treasurer|Student Council">Council: Treasurer</option>
                      <option value="club_lead|President|Product Club">Product Club: President</option>
                      <option value="club_lead|Vice-President|Product Club">Product Club: Vice-President</option>
                      <option value="club_lead|President|Tech & AI Club">Tech Club: President</option>
                      <option value="club_lead|Vice-President|Tech & AI Club">Tech Club: Vice-President</option>
                      <option value="admin|System Admin|Administration">System Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}