import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { TrendingDown, Wallet, FileText, Trash2, Sparkles, ShieldAlert } from 'lucide-react';

export default function FinanceLedger({ theme, activeRole }) {
  const safeTheme = theme || {
    bg: 'bg-[#0a0a0a]', surface: 'bg-[#121212]', border: 'border-[#262626]',
    textStrong: 'text-white', textMuted: 'text-gray-400', inputBg: 'bg-[#1a1a1a]'
  };

  // ONLY the Treasurer can add/edit the ledger
  const isTreasurer = activeRole === 'treasurer';

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [txEntity, setTxEntity] = useState('Student Council');
  const [txDescription, setTxDescription] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txReceipt, setTxReceipt] = useState('');

  const mainClubs = ['Product Club', 'Strategy Club', 'Finance Club', 'Marketing Club'];
  const entityList = ['Student Council', ...mainClubs, 'Other'];

  useEffect(() => {
    fetchFinanceData();
    const txSub = supabase.channel('public:transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchFinanceData())
      .subscribe();
    return () => supabase.removeChannel(txSub);
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (data) setTransactions(data);
    setLoading(false);
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!isTreasurer) return alert("Only the Treasurer can update the ledger.");

    const newTx = {
      entity: txEntity,
      description: txDescription.trim(),
      receipt: txReceipt.trim() || 'No receipt',
      amount: Number(txAmount),
      date: new Date().toISOString().split('T')[0],
      approval_status: 'Approved' // Treasurer entry is final
    };

    const { error } = await supabase.from('transactions').insert([newTx]);
    if (!error) {
      setTxDescription(''); setTxAmount(''); setTxReceipt('');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!isTreasurer) return;
    await supabase.from('transactions').delete().eq('id', id);
  };

  // CALCULATIONS
  const councilSpent = transactions.filter(t => t.entity === 'Student Council').reduce((sum, t) => sum + Number(t.amount), 0);
  const councilBurn = Math.min((councilSpent / 250000) * 100, 100);

  const getClubSpent = (clubName) => transactions.filter(t => t.entity === clubName).reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 w-full animate-in fade-in">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-emerald-500" />
        <span className="text-sm font-bold text-emerald-500 tracking-wider uppercase">Live Treasury Ledger</span>
      </div>

      {/* COUNCIL BUDGET (2.5L) */}
      <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm`}>
        <div className="flex justify-between mb-2">
          <span className={`text-xs font-bold uppercase ${safeTheme.textMuted}`}>Student Council Cap</span>
          <span className="text-xs font-extrabold text-emerald-500">₹2,50,000</span>
        </div>
        <div className={`text-3xl font-extrabold ${safeTheme.textStrong} mb-3`}>
          ₹{councilSpent.toLocaleString('en-IN')} <span className={`text-sm ${safeTheme.textMuted}`}>Spent</span>
        </div>
        <div className="w-full h-2.5 bg-gray-500/20 rounded-full overflow-hidden">
          <div style={{ width: `${councilBurn}%` }} className={`h-full ${councilBurn > 85 ? 'bg-red-500' : 'bg-emerald-500'}`} />
        </div>
      </div>

      {/* INDIVIDUAL CLUB BUDGETS (20k Each) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainClubs.map(club => {
          const spent = getClubSpent(club);
          const burn = Math.min((spent / 20000) * 100, 100);
          return (
            <div key={club} className={`${safeTheme.surface} border ${safeTheme.border} rounded-xl p-4`}>
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${safeTheme.textStrong}`}>{club}</h4>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-amber-500 font-bold">₹{spent.toLocaleString()}</span>
                <span className={safeTheme.textMuted}>/ ₹20k</span>
              </div>
              <div className="w-full h-1.5 bg-gray-500/20 rounded-full overflow-hidden">
                <div style={{ width: `${burn}%` }} className={`h-full ${burn > 90 ? 'bg-red-500' : 'bg-amber-500'}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* TREASURER ONLY: ADD EXPENSE FORM */}
      {isTreasurer ? (
        <div className={`${safeTheme.surface} border border-emerald-500/30 rounded-2xl p-6 shadow-sm`}>
          <h3 className={`text-sm font-extrabold text-emerald-500 mb-4 flex items-center gap-2`}>
            <FileText className="w-4 h-4" /> Log Official Expense (Treasurer Only)
          </h3>
          <form onSubmit={handleAddTransaction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select value={txEntity} onChange={(e) => setTxEntity(e.target.value)} className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs font-bold text-white outline-none`}>
                {entityList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="text" required placeholder="Expense Description" value={txDescription} onChange={(e) => setTxDescription(e.target.value)} className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs text-white outline-none sm:col-span-2`} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="number" required placeholder="Actual Amount (₹)" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs text-white outline-none`} />
              <input type="text" placeholder="Receipt Link" value={txReceipt} onChange={(e) => setTxReceipt(e.target.value)} className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs text-white outline-none`} />
            </div>
            <button type="submit" className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white text-xs font-extrabold py-3 rounded-xl transition-all shadow-sm">
              Commit to Ledger
            </button>
          </form>
        </div>
      ) : (
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2 text-xs text-blue-400 font-bold">
          <ShieldAlert className="w-4 h-4" /> Only the official Treasurer can record expenses. Club leads must submit receipts directly to the Treasurer.
        </div>
      )}

      {/* TRACKER TABLE */}
      <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 overflow-x-auto`}>
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className={`border-b ${safeTheme.border} text-[11px] font-extrabold uppercase tracking-wider ${safeTheme.textMuted}`}>
              <th className="pb-3">Entity</th>
              <th className="pb-3">Description</th>
              <th className="pb-3 text-right">Amount</th>
              {isTreasurer && <th className="pb-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-500/10 text-xs text-white">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-gray-500/5">
                <td className="py-3 font-bold">{t.entity}</td>
                <td className="py-3 text-gray-400">{t.description}</td>
                <td className="py-3 text-right font-extrabold text-red-400">-₹{Number(t.amount).toLocaleString()}</td>
                {isTreasurer && (
                  <td className="py-3 text-right">
                    <button onClick={() => handleDeleteTransaction(t.id)} className="text-red-500 hover:bg-red-500/20 p-1.5 rounded"><Trash2 className="w-4 h-4"/></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}