import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Wallet, PlusCircle, FileText, 
  Download, Trash2, Sparkles, ArrowDownRight, CheckCircle2, 
  Clock, AlertCircle, ShieldAlert
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function FinanceLedger({ theme, activeRole, userProfile }) {
  const safeTheme = theme || {
    bg: 'bg-[#0a0a0a]', surface: 'bg-[#121212]', border: 'border-[#262626]',
    textStrong: 'text-white', textMuted: 'text-gray-400', inputBg: 'bg-[#1a1a1a]', hover: 'hover:bg-[#1f1f1f]'
  };

  const effectiveRole = userProfile?.role || activeRole || 'student';
  const canEditFinance = effectiveRole === 'admin' || effectiveRole === 'council';
  // Admin (Ashil, Madhur, Spandan) can approve
  const canApprove = effectiveRole === 'admin'; 

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Expense State
  const [txEntity, setTxEntity] = useState('Student Council');
  const [txCategory, setTxCategory] = useState('Events');
  const [txDescription, setTxDescription] = useState('');
  const [txEstimated, setTxEstimated] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txReceipt, setTxReceipt] = useState('');

  const clubsList = [
    'Student Council', 'Product Management Club', 'Strategy Club', 
    'Marketing Club', 'Entrepreneurship & VC Club', 'Finance Club', 'Cultural & Sports'
  ];

  useEffect(() => {
    fetchFinanceData();
    const txSub = supabase.channel('public:transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchFinanceData())
      .subscribe();
    return () => supabase.removeChannel(txSub);
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (!error && data) setTransactions(data);
    setLoading(false);
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!canEditFinance || !txDescription.trim()) return;

    const newTx = {
      entity: txEntity,
      category: txCategory,
      description: txDescription.trim(),
      receipt: txReceipt.trim() || 'Pending Attachment',
      estimated_cost: Number(txEstimated || txAmount),
      amount: Number(txAmount),
      date: new Date().toISOString().split('T')[0],
      approval_status: 'Pending' // Requires Ashil/Madhur/Spandan approval
    };

    const { error } = await supabase.from('transactions').insert([newTx]);
    if (!error) {
      setTxDescription(''); setTxEstimated(''); setTxAmount(''); setTxReceipt('');
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    if (!canApprove) return alert("Only Admin (Ashil, Madhur, Spandan) can approve expenses.");
    await supabase.from('transactions').update({ approval_status: newStatus }).eq('id', id);
  };

  const handleDeleteTransaction = async (id) => {
    if (!canEditFinance) return;
    await supabase.from('transactions').delete().eq('id', id);
  };

  // BUDGET CALCULATIONS
  const councilBudget = 250000;
  const clubBudget = 20000;

  const councilSpent = transactions.filter(t => t.entity === 'Student Council' && t.approval_status === 'Approved').reduce((sum, t) => sum + Number(t.amount), 0);
  const councilBurn = Math.min((councilSpent / councilBudget) * 100, 100);

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 w-full">
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-500 tracking-wider uppercase">Official Budget & Ledger</span>
        </div>
      </div>

      {/* ADMIN BUDGET BURN CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-5 md:p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${safeTheme.textMuted}`}>Student Council Allocation</span>
            <span className="text-xs font-extrabold text-emerald-500">₹{councilBudget.toLocaleString('en-IN')} Limit</span>
          </div>
          <div className={`text-2xl md:text-3xl font-extrabold ${safeTheme.textStrong} mb-3`}>
            ₹{councilSpent.toLocaleString('en-IN')} <span className={`text-sm font-medium ${safeTheme.textMuted}`}>Spent (Approved)</span>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-gray-500/20 rounded-full overflow-hidden mb-2">
            <div style={{ width: `${councilBurn}%` }} className={`h-full ${councilBurn > 85 ? 'bg-red-500' : 'bg-emerald-500'}`} />
          </div>
          <div className={`text-[10px] font-bold ${safeTheme.textMuted} flex justify-between`}>
            <span>Used for: Fests, Sports, Cultural, Gifts</span>
            <span>₹{(councilBudget - councilSpent).toLocaleString('en-IN')} Remaining</span>
          </div>
        </div>

        <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-5 md:p-6 shadow-sm`}>
           <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${safeTheme.textMuted}`}>Standard Club Allocation</span>
            <span className="text-xs font-extrabold text-blue-500">₹{clubBudget.toLocaleString('en-IN')} / Club</span>
          </div>
          <p className={`text-xs ${safeTheme.textMuted} leading-relaxed mb-4`}>
            Each official club is allocated a strict maximum of ₹20,000 for the academic year. Funds may primarily be used for guest cab bookings, prize money, certificates, and participant goodies.
          </p>
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2 text-[11px] text-blue-400 font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p>All expense requests must be approved by Ashil, Madhur, or Spandan before commitments or bookings are made.</p>
          </div>
        </div>
      </div>

      {/* REQUEST EXPENSE FORM */}
      {canEditFinance && (
        <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-4 md:p-6 shadow-sm`}>
          <h3 className={`text-sm font-extrabold ${safeTheme.textStrong} mb-4 flex items-center gap-2`}>
            <FileText className="w-4 h-4 text-amber-500" /> Submit Expense for Approval
          </h3>
          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={txEntity} onChange={(e) => setTxEntity(e.target.value)} className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs font-bold ${safeTheme.textStrong} outline-none`}>
                {clubsList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="text" required placeholder="Event / Purpose Description" value={txDescription} onChange={(e) => setTxDescription(e.target.value)} className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500 sm:col-span-2`} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input type="number" required placeholder="Estimated Cost (₹)" value={txEstimated} onChange={(e) => setTxEstimated(e.target.value)} className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`} />
              <input type="number" required placeholder="Actual Amount (₹)" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`} />
              <input type="text" placeholder="Receipt / Bill Link" value={txReceipt} onChange={(e) => setTxReceipt(e.target.value)} className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`} />
            </div>
            <button type="submit" className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white text-xs font-extrabold py-3 rounded-xl transition-all shadow-sm">
              Submit for Admin Approval
            </button>
          </form>
        </div>
      )}

      {/* TRACKER TABLE */}
      <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-4 md:p-6 shadow-sm overflow-hidden w-full`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className={`text-sm md:text-base font-extrabold ${safeTheme.textStrong} flex items-center gap-2`}>
              <TrendingDown className="w-4 h-4 text-amber-500" /> Consolidated Expense Tracker
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className={`border-b ${safeTheme.border} text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider ${safeTheme.textMuted}`}>
                <th className="pb-3 pr-2">Entity</th>
                <th className="pb-3 px-2">Description</th>
                <th className="pb-3 px-2 text-right">Est. Cost</th>
                <th className="pb-3 px-2 text-right">Actual Cost</th>
                <th className="pb-3 px-2">Status</th>
                {(canEditFinance || canApprove) && <th className="pb-3 pl-2 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-500/10 text-[11px] md:text-xs">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-500/5 transition-colors">
                  <td className={`py-3 pr-2 font-extrabold ${safeTheme.textStrong}`}>{t.entity}</td>
                  <td className={`py-3 px-2 ${safeTheme.textMuted}`}>{t.description}</td>
                  <td className={`py-3 px-2 text-right ${safeTheme.textMuted}`}>₹{Number(t.estimated_cost).toLocaleString()}</td>
                  <td className="py-3 px-2 text-right font-extrabold text-red-400">-₹{Number(t.amount).toLocaleString()}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 w-fit ${
                      t.approval_status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500' :
                      t.approval_status === 'Rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {t.approval_status === 'Approved' ? <CheckCircle2 className="w-3 h-3"/> : t.approval_status === 'Rejected' ? <AlertCircle className="w-3 h-3"/> : <Clock className="w-3 h-3"/>}
                      {t.approval_status}
                    </span>
                  </td>
                  {(canEditFinance || canApprove) && (
                    <td className="py-3 pl-2 text-right flex items-center justify-end gap-1">
                      {canApprove && t.approval_status === 'Pending' && (
                        <>
                          <button onClick={() => handleUpdateStatus(t.id, 'Approved')} className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-bold hover:bg-emerald-500 hover:text-white">Approve</button>
                          <button onClick={() => handleUpdateStatus(t.id, 'Rejected')} className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-[9px] font-bold hover:bg-red-500 hover:text-white">Reject</button>
                        </>
                      )}
                      {canEditFinance && (
                        <button onClick={() => handleDeleteTransaction(t.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}