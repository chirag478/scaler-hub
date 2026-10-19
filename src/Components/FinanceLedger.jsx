import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Wallet, PlusCircle, FileText, 
  Download, Trash2, Sparkles, ArrowUpRight, ArrowDownRight, Lock 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function FinanceLedger({ theme, activeRole, userProfile }) {
  const safeTheme = theme || {
    bg: 'bg-[#0a0a0a]',
    surface: 'bg-[#121212]',
    border: 'border-[#262626]',
    textStrong: 'text-white',
    textMuted: 'text-gray-400',
    inputBg: 'bg-[#1a1a1a]',
    hover: 'hover:bg-[#1f1f1f]',
  };

  // Strictly only Student Council and System Admin can add or delete financial records
  const effectiveRole = userProfile?.role || activeRole || 'student';
  const canEditFinance = effectiveRole === 'admin' || effectiveRole === 'council';

  const [funds, setFunds] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fundSource, setFundSource] = useState('');
  const [fundAmount, setFundAmount] = useState('');

  const [txCategory, setTxCategory] = useState('Events');
  const [txDescription, setTxDescription] = useState('');
  const [txReceipt, setTxReceipt] = useState('');
  const [txAmount, setTxAmount] = useState('');

  useEffect(() => {
    fetchFinanceData();

    const fundsSub = supabase
      .channel('public:funds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funds' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setFunds((prev) => prev.some(f => f.id === payload.new.id) ? prev : [payload.new, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setFunds((prev) => prev.filter(f => f.id !== payload.old.id));
        }
      })
      .subscribe();

    const txSub = supabase
      .channel('public:transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTransactions((prev) => prev.some(t => t.id === payload.new.id) ? prev : [payload.new, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setTransactions((prev) => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(fundsSub);
      supabase.removeChannel(txSub);
    };
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    const [fundsRes, txRes] = await Promise.all([
      supabase.from('funds').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }),
    ]);

    if (!fundsRes.error && fundsRes.data) setFunds(fundsRes.data);
    if (!txRes.error && txRes.data) setTransactions(txRes.data);
    setLoading(false);
  };

  const handleAddFund = async (e) => {
    e.preventDefault();
    if (!canEditFinance || !fundSource.trim() || !fundAmount) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newFund = {
      source: fundSource.trim(),
      amount: Number(fundAmount),
      date: todayStr,
    };

    const { data, error } = await supabase.from('funds').insert([newFund]).select();

    if (error) {
      const fallbackFund = {
        description: fundSource.trim(),
        amount: Number(fundAmount),
      };
      const retry = await supabase.from('funds').insert([fallbackFund]).select();
      if (retry.error) {
        alert('Error adding fund: ' + retry.error.message);
        return;
      }
      if (retry.data) setFunds((prev) => [retry.data[0], ...prev]);
    } else if (data) {
      setFunds((prev) => [data[0], ...prev.filter(f => f.id !== data[0].id)]);
    }

    setFundSource('');
    setFundAmount('');
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!canEditFinance || !txDescription.trim() || !txAmount) return;

    const newTx = {
      category: txCategory,
      description: txDescription.trim(),
      receipt: txReceipt.trim() || 'Verified',
      amount: Number(txAmount),
      date: new Date().toISOString().split('T')[0],
    };

    const { data, error } = await supabase.from('transactions').insert([newTx]).select();

    if (error) {
      alert('Error logging expense: ' + error.message);
      return;
    }

    if (data) {
      setTransactions((prev) => [data[0], ...prev.filter(t => t.id !== data[0].id)]);
      setTxDescription('');
      setTxReceipt('');
      setTxAmount('');
    }
  };

  const handleDeleteFund = async (id) => {
    if (!canEditFinance) return;
    const { error } = await supabase.from('funds').delete().eq('id', id);
    if (!error) setFunds(funds.filter(f => f.id !== id));
  };

  const handleDeleteTransaction = async (id) => {
    if (!canEditFinance) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) setTransactions(transactions.filter(t => t.id !== id));
  };

  const totalTreasury = funds.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const totalUtilized = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const availableBalance = totalTreasury - totalUtilized;

  const handleExportCSV = () => {
    const headers = ['Type,Category/Source,Description,Reference,Date,Amount (INR)\n'];
    const fundRows = funds.map(f => {
      const src = f.source || f.description || f.title || 'Cohort Fund / Sponsorship';
      const dt = f.date || (f.created_at ? f.created_at.split('T')[0] : '');
      return `TREASURY INFLOW (+),"Treasury Addition","${src}","Added to Treasury",${dt},${f.amount}`;
    });
    const txRows = transactions.map(t => {
      const dt = t.date || (t.created_at ? t.created_at.split('T')[0] : '');
      return `EXPENSE (-),"${t.category || 'General'}","${t.description || t.title || 'Cohort Expense'}","${t.receipt || 'Verified'}",${dt},-${t.amount}`;
    });

    const blob = new Blob([headers.concat([...fundRows, ...txRows].join('\n'))], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Scaler_Finance_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-500 tracking-wider uppercase">
            Live Financial Ledger
          </span>
          {!canEditFinance && (
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/20 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Read-Only View (Managed by Council & Admin)
            </span>
          )}
        </div>

        <button
          onClick={handleExportCSV}
          className={`px-4 py-2 rounded-xl border ${safeTheme.border} ${safeTheme.surface} ${safeTheme.textStrong} text-xs font-extrabold flex items-center gap-2 hover:border-emerald-500/50 transition-all shadow-sm`}
        >
          <Download className="w-4 h-4 text-emerald-500" /> Export CSV
        </button>
      </div>

      {/* Top 3 KPI Summary Cards (Visible to Everyone) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${safeTheme.textMuted}`}>Total Treasury</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-extrabold ${safeTheme.textStrong}`}>
            ₹{totalTreasury.toLocaleString('en-IN')}
          </div>
        </div>

        <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${safeTheme.textMuted}`}>Total Utilized</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-extrabold ${safeTheme.textStrong}`}>
            ₹{totalUtilized.toLocaleString('en-IN')}
          </div>
        </div>

        <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${safeTheme.textMuted}`}>Available Balance</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-500">
            ₹{availableBalance.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Admin & Student Council Entry Forms ONLY */}
      {canEditFinance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm`}>
            <h3 className={`text-sm font-extrabold ${safeTheme.textStrong} mb-4 flex items-center gap-2`}>
              <PlusCircle className="w-4 h-4 text-emerald-500" /> Log Incoming Fund / Sponsorship
            </h3>
            <form onSubmit={handleAddFund} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Source (e.g. Cohort Fee / Sponsor)"
                  value={fundSource}
                  onChange={(e) => setFundSource(e.target.value)}
                  className={`${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-4 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
                />
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Amount (₹)"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className={`${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-4 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white text-xs font-extrabold py-3 rounded-xl transition-all shadow-sm"
              >
                Add to Treasury
              </button>
            </form>
          </div>

          <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm`}>
            <h3 className={`text-sm font-extrabold ${safeTheme.textStrong} mb-4 flex items-center gap-2`}>
              <FileText className="w-4 h-4 text-amber-500" /> Record New Expense
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className={`${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs font-bold ${safeTheme.textStrong} outline-none`}
                >
                  <option value="Events">Events</option>
                  <option value="Club Ops">Club Ops</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Catering">Catering</option>
                  <option value="Cultural & Sports">Cultural & Sports</option>
                  <option value="Misc">Misc</option>
                </select>
                <input
                  type="text"
                  required
                  placeholder="Expense Title"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className={`${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
                />
                <input
                  type="text"
                  placeholder="Receipt / Ref #"
                  value={txReceipt}
                  onChange={(e) => setTxReceipt(e.target.value)}
                  className={`${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
                />
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Amount (₹)"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className={`${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white text-xs font-extrabold py-3 rounded-xl transition-all shadow-sm"
              >
                Log Expense
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TABLE 1: TREASURY INFLOWS & ADDITIONS LEDGER (Visible to Everyone) */}
      <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div>
            <h3 className={`text-base font-extrabold ${safeTheme.textStrong} flex items-center gap-2`}>
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Treasury Inflows & Additions Ledger
            </h3>
            <p className={`text-xs ${safeTheme.textMuted} mt-0.5`}>
              Every rupee added to the cohort treasury (Visible to all students; managed by Council & Admin)
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {funds.length} {funds.length === 1 ? 'Addition' : 'Additions'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className={`border-b ${safeTheme.border} text-[11px] font-extrabold uppercase tracking-wider ${safeTheme.textMuted}`}>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 px-4">Funding Source / Sponsor</th>
                <th className="pb-3 px-4">Reference</th>
                <th className="pb-3 px-4">Date</th>
                <th className="pb-3 pl-4 text-right">Amount Added</th>
                {canEditFinance && <th className="pb-3 pl-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-500/10 text-xs">
              {funds.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`py-8 text-center ${safeTheme.textMuted} font-semibold`}>
                    No treasury additions recorded yet.
                  </td>
                </tr>
              ) : (
                funds.map((f) => {
                  const sourceLabel = f.source || f.description || f.title || 'Cohort Fund / Sponsorship';
                  const dateLabel = f.date || (f.created_at ? f.created_at.split('T')[0] : 'Recorded');
                  return (
                    <tr key={f.id} className="hover:bg-gray-500/5 transition-colors">
                      <td className="py-4 pr-4 align-middle">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                          <ArrowUpRight className="w-3 h-3 shrink-0" /> Treasury Inflow
                        </span>
                      </td>
                      <td className={`py-4 px-4 font-extrabold ${safeTheme.textStrong} align-middle`}>
                        {sourceLabel}
                      </td>
                      <td className={`py-4 px-4 ${safeTheme.textMuted} align-middle`}>
                        Added to Treasury
                      </td>
                      <td className={`py-4 px-4 ${safeTheme.textMuted} align-middle whitespace-nowrap`}>
                        {dateLabel}
                      </td>
                      <td className="py-4 pl-4 text-right font-extrabold text-sm text-emerald-400 align-middle whitespace-nowrap">
                        +₹{Number(f.amount || 0).toLocaleString('en-IN')}
                      </td>
                      {canEditFinance && (
                        <td className="py-4 pl-4 text-right align-middle">
                          <button
                            onClick={() => handleDeleteFund(f.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete Treasury Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABLE 2: EXPENSE & UTILIZATION LEDGER (Visible to Everyone) */}
      <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div>
            <h3 className={`text-base font-extrabold ${safeTheme.textStrong} flex items-center gap-2`}>
              <TrendingDown className="w-4 h-4 text-amber-500" /> Cohort Expenses & Utilization Ledger
            </h3>
            <p className={`text-xs ${safeTheme.textMuted} mt-0.5`}>
              Every expense spent from the cohort treasury (Visible to all students; managed by Council & Admin)
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {transactions.length} {transactions.length === 1 ? 'Expense' : 'Expenses'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className={`border-b ${safeTheme.border} text-[11px] font-extrabold uppercase tracking-wider ${safeTheme.textMuted}`}>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 px-4">Expense Description</th>
                <th className="pb-3 px-4">Receipt / Reference</th>
                <th className="pb-3 px-4">Date</th>
                <th className="pb-3 pl-4 text-right">Amount Spent</th>
                {canEditFinance && <th className="pb-3 pl-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-500/10 text-xs">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`py-8 text-center ${safeTheme.textMuted} font-semibold`}>
                    No expenses recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const dateLabel = t.date || (t.created_at ? t.created_at.split('T')[0] : 'Recorded');
                  return (
                    <tr key={t.id} className="hover:bg-gray-500/5 transition-colors">
                      <td className="py-4 pr-4 align-middle">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                          <ArrowDownRight className="w-3 h-3 shrink-0" /> {t.category || 'General'}
                        </span>
                      </td>
                      <td className={`py-4 px-4 font-extrabold ${safeTheme.textStrong} align-middle`}>
                        {t.description || t.title || 'Cohort Expense'}
                      </td>
                      <td className={`py-4 px-4 ${safeTheme.textMuted} align-middle`}>
                        {t.receipt || 'Verified'}
                      </td>
                      <td className={`py-4 px-4 ${safeTheme.textMuted} align-middle whitespace-nowrap`}>
                        {dateLabel}
                      </td>
                      <td className="py-4 pl-4 text-right font-extrabold text-sm text-red-400 align-middle whitespace-nowrap">
                        -₹{Number(t.amount || 0).toLocaleString('en-IN')}
                      </td>
                      {canEditFinance && (
                        <td className="py-4 pl-4 text-right align-middle">
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}