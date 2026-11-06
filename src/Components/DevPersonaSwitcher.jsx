import React, { useState } from 'react';
import { 
  Users, Crown, Shield, DollarSign, Rocket, 
  GraduationCap, Key, Check, ChevronDown, Sparkles, RefreshCw, X
} from 'lucide-react';

export const DEMO_PERSONAS = [
  {
    id: 'student',
    role: 'student',
    label: 'Student',
    fullName: 'Aarav Sharma (Student)',
    email: 'student@scaler.com',
    subRole: 'Cohort Member',
    organization: 'PGP Cohort',
    icon: GraduationCap,
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    description: 'Restricted calendar view; can submit townhall ideas & vote on polls.',
    capabilities: ['View overview & treasury', 'Restricted calendar', 'Vote & post in townhall'],
  },
  {
    id: 'president',
    role: 'president',
    label: 'President',
    fullName: 'Rahul Verma (President)',
    email: 'president@scaler.com',
    subRole: 'President',
    organization: 'Student Council',
    icon: Crown,
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    description: 'Council President. 1st key signature to approve calendar events.',
    capabilities: ['Sign President 1st key', 'Official forum replies', 'Council governance'],
  },
  {
    id: 'vp',
    role: 'vp',
    label: 'Vice President',
    fullName: 'Sneha Rao (VP)',
    email: 'vp@scaler.com',
    subRole: 'Vice President',
    organization: 'Student Council',
    icon: Shield,
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    description: 'Council VP. 2nd key signature to approve calendar events.',
    capabilities: ['Sign VP 2nd key', 'Official forum replies', 'Revoke/deny events'],
  },
  {
    id: 'treasurer',
    role: 'treasurer',
    label: 'Treasurer',
    fullName: 'Vikram Patel (Treasurer)',
    email: 'treasurer@scaler.com',
    subRole: 'Treasurer',
    organization: 'Student Council',
    icon: DollarSign,
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    description: 'Controls treasury ledger. Can log expenses and sign 3rd key.',
    capabilities: ['Log/delete ledger expenses', 'Sign Treasurer 3rd key', 'Track club caps'],
  },
  {
    id: 'club_lead',
    role: 'club_lead',
    label: 'Club Lead',
    fullName: 'Ananya Gupta (Product Lead)',
    email: 'productlead@scaler.com',
    subRole: 'President',
    organization: 'Product Management Club',
    icon: Rocket,
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    description: 'Product Club Lead. Can propose events for 3-key council review.',
    capabilities: ['Submit calendar proposals', 'View club budgets', 'Cohort participation'],
  },
  {
    id: 'admin',
    role: 'admin',
    label: 'System Admin',
    fullName: 'System Administrator',
    email: 'admin@scaler.com',
    subRole: 'System Admin',
    organization: 'Administration',
    icon: Key,
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    description: 'Superuser. Unlocks Access Control panel to manage cohort credentials.',
    capabilities: ['Access Control panel', 'All 3 signature overrides', 'Full system control'],
  },
];

export default function DevPersonaSwitcher({ 
  activeRole, 
  userProfile, 
  onSwitchPersona, 
  onResetRealUser, 
  isSimulated = false 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const currentPersona = DEMO_PERSONAS.find(p => p.role === activeRole) || {
    id: 'custom',
    label: userProfile?.sub_role || activeRole || 'Current User',
    fullName: userProfile?.full_name || 'Active User',
    role: activeRole,
    icon: Users,
    badgeColor: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    description: 'Logged-in user profile from Supabase Auth.',
    capabilities: ['Live database writes'],
  };

  const CurrentIcon = currentPersona.icon || Users;

  return (
    <>
      {/* FLOATING ACTION PILL */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#121212]/95 hover:bg-[#1a1a1a] border border-emerald-500/40 text-white shadow-2xl backdrop-blur-md transition-all hover:scale-[1.02] active:scale-[0.98] group"
          title="Switch User Persona (Dev Testing)"
        >
          <div className="relative flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-gray-400 font-medium">POV:</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CurrentIcon className="w-3.5 h-3.5 text-emerald-400" />
              {currentPersona.label}
            </span>
          </div>

          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Dev Switcher
          </span>

          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* EXPANDABLE PERSONA POPUP */}
        {isOpen && (
          <div className="absolute bottom-12 right-0 w-[calc(100vw-2rem)] max-w-[380px] bg-[#121212] border border-[#262626] rounded-2xl shadow-2xl p-4 text-white animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#262626] mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Multi-User POV Switcher
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
              Instantly toggle the UI to experience the hub through any role's eyes without logging out or entering passwords:
            </p>

            {/* Persona List */}
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
              {DEMO_PERSONAS.map((persona) => {
                const Icon = persona.icon;
                const isSelected = activeRole === persona.role;

                return (
                  <button
                    key={persona.id}
                    onClick={() => {
                      onSwitchPersona(persona);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-3 ${
                      isSelected 
                        ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm' 
                        : 'bg-[#181818] border-[#262626] hover:bg-[#202020] hover:border-gray-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 border ${persona.badgeColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate">
                          {persona.label}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-emerald-400 font-medium truncate">
                        {persona.fullName}
                      </div>

                      <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                        {persona.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer Status & Reset */}
            <div className="mt-3 pt-3 border-t border-[#262626] flex items-center justify-between text-[10px]">
              <span className="text-gray-400">
                {isSimulated ? '⚡ Simulation Mode (Instant)' : '🔒 Supabase Connected'}
              </span>
              {onResetRealUser && (
                <button
                  onClick={() => {
                    onResetRealUser();
                    setIsOpen(false);
                  }}
                  className="text-gray-400 hover:text-white flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" /> Reset to Real Auth
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
