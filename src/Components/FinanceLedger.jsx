import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Wallet, PlusCircle, FileText, 
  Download, Trash2, Sparkles, ArrowUpRight, ArrowDownRight 
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
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full overflow-x-hidden">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-500 tracking-wider uppercase">
            Live Financial Ledger
          </span>
        </div>

        <button
          onClick={handleExportCSV}
          className={`px-4 py-2 rounded-xl border ${safeTheme.border} ${safeTheme.surface} ${safeTheme.textStrong} text-xs font-extrabold flex items-center gap-2 hover:border-emerald-500/50 transition-all shadow-sm`}
        >
          <Download className="w-4 h-4 text-emerald-500" /> <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* Top 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-5 md:p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${safeTheme.textMuted}`}>Total Treasury</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl md:text-3xl font-extrabold ${safeTheme.textStrong} break-words`}>
            ₹{totalTreasury.toLocaleString('en-IN')}
          </div>
        </div>

        <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-5 md:p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${safeTheme.textMuted}`}>Total Utilized</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl md:text-3xl font-extrabold ${safeTheme.textStrong} break-words`}>
            ₹{totalUtilized.toLocaleString('en-IN')}
          </div>
        </div>

        <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-5 md:p-6 shadow-sm sm:col-span-2 md:col-span-1`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${safeTheme.textMuted}`}>Available Balance</span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-emerald-500 break-words">
            ₹{availableBalance.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Admin & Student Council Entry Forms */}
      {canEditFinance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-4 md:p-6 shadow-sm`}>
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
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-4 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
                />
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Amount (₹)"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-4 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
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

          <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-4 md:p-6 shadow-sm`}>
            <h3 className={`text-sm font-extrabold ${safeTheme.textStrong} mb-4 flex items-center gap-2`}>
              <FileText className="w-4 h-4 text-amber-500" /> Record New Expense
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs font-bold ${safeTheme.textStrong} outline-none`}
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
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500 lg:col-span-1`}
                />
                <input
                  type="text"
                  placeholder="Receipt / Ref #"
                  value={txReceipt}
                  onChange={(e) => setTxReceipt(e.target.value)}
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
                />
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Amount (₹)"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-3 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
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

      {/* TABLE 1: TREASURY INFLOWS & ADDITIONS LEDGER */}
      <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-4 md:p-6 shadow-sm overflow-hidden w-full`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 md:mb-5">
          <div>
            <h3 className={`text-sm md:text-base font-extrabold ${safeTheme.textStrong} flex items-center gap-2`}>
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Treasury Additions
            </h3>
            <p className={`text-[10px] md:text-xs ${safeTheme.textMuted} mt-0.5`}>
              Every rupee added to the cohort treasury
            </p>
          </div>
          <span className="px-2 md:px-3 py-1 rounded-full text-[10px] md:text-[11px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {funds.length} <span className="hidden sm:inline">{funds.length === 1 ? 'Addition' : 'Additions'}</span>
          </span>
        </div>

        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b ${safeTheme.border} text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider ${safeTheme.textMuted}`}>
                  <th className="pb-3 pr-2 md:pr-4">Type</th>
                  <th className="pb-3 px-2 md:px-4">Funding Source</th>
                  <th className="pb-3 px-2 md:px-4 hidden sm:table-cell">Reference</th>
                  <th className="pb-3 px-2 md:px-4">Date</th>
                  <th className="pb-3 pl-2 md:pl-4 text-right">Amount</th>
                  {canEditFinance && <th className="pb-3 pl-2 md:pl-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-500/10 text-[11px] md:text-xs">
                {funds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`py-6 md:py-8 text-center ${safeTheme.textMuted} font-semibold`}>
                      No treasury additions recorded yet.
                    </td>
                  </tr>
                ) : (
                  funds.map((f) => {
                    const sourceLabel = f.source || f.description || f.title || 'Cohort Fund';
                    const dateLabel = f.date || (f.created_at ? f.created_at.split('T')[0] : 'Recorded');
                    return (
                      <tr key={f.id} className="hover:bg-gray-500/5 transition-colors">
                        <td className="py-3 md:py-4 pr-2 md:pr-4 align-middle">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                            <ArrowUpRight className="w-2.5 h-2.5 shrink-0" /> <span className="hidden sm:inline">Treasury Inflow</span>
                          </span>
                        </td>
                        <td className={`py-3 md:py-4 px-2 md:px-4 font-extrabold ${safeTheme.textStrong} align-middle max-w-[120px] md:max-w-none truncate`}>
                          {sourceLabel}
                        </td>
                        <td className={`py-3 md:py-4 px-2 md:px-4 ${safeTheme.textMuted} align-middle hidden sm:table-cell whitespace-nowrap`}>
                          Added to Treasury
                        </td>
                        <td className={`py-3 md:py-4 px-2 md:px-4 ${safeTheme.textMuted} align-middle whitespace-nowrap`}>
                          {dateLabel}
                        </td>
                        <td className="py-3 md:py-4 pl-2 md:pl-4 text-right font-extrabold text-xs md:text-sm text-emerald-400 align-middle whitespace-nowrap">
                          +₹{Number(f.amount || 0).toLocaleString('en-IN')}
                        </td>
                        {canEditFinance && (
                          <td className="py-3 md:py-4 pl-2 md:pl-4 text-right align-middle">
                            <button
                              onClick={() => handleDeleteFund(f.id)}
                              className="p-1 md:p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Delete Treasury Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
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

      {/* TABLE 2: EXPENSE & UTILIZATION LEDGER */}
      <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-4 md:p-6 shadow-sm overflow-hidden w-full`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 md:mb-5">
          <div>
            <h3 className={`text-sm md:text-base font-extrabold ${safeTheme.textStrong} flex items-center gap-2`}>
              <TrendingDown className="w-4 h-4 text-amber-500" /> Cohort Expenses
            </h3>
            <p className={`text-[10px] md:text-xs ${safeTheme.textMuted} mt-0.5`}>
              Every expense spent from the cohort treasury
            </p>
          </div>
          <span className="px-2 md:px-3 py-1 rounded-full text-[10px] md:text-[11px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {transactions.length} <span className="hidden sm:inline">{transactions.length === 1 ? 'Expense' : 'Expenses'}</span>
          </span>
        </div>

        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b ${safeTheme.border} text-[10px] md:text-[11px] font-extrabold uppercase tracking-wider ${safeTheme.textMuted}`}>
                  <th className="pb-3 pr-2 md:pr-4">Category</th>
                  <th className="pb-3 px-2 md:px-4">Description</th>
                  <th className="pb-3 px-2 md:px-4 hidden sm:table-cell">Reference</th>
                  <th className="pb-3 px-2 md:px-4">Date</th>
                  <th className="pb-3 pl-2 md:pl-4 text-right">Amount</th>
                  {canEditFinance && <th className="pb-3 pl-2 md:pl-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-500/10 text-[11px] md:text-xs">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`py-6 md:py-8 text-center ${safeTheme.textMuted} font-semibold`}>
                      No expenses recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => {
                    const dateLabel = t.date || (t.created_at ? t.created_at.split('T')[0] : 'Recorded');
                    return (
                      <tr key={t.id} className="hover:bg-gray-500/5 transition-colors">
                        <td className="py-3 md:py-4 pr-2 md:pr-4 align-middle">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            <ArrowDownRight className="w-2.5 h-2.5 shrink-0" /> {t.category || 'General'}
                          </span>
                        </td>
                        <td className={`py-3 md:py-4 px-2 md:px-4 font-extrabold ${safeTheme.textStrong} align-middle max-w-[120px] md:max-w-none truncate`}>
                          {t.description || t.title || 'Cohort Expense'}
                        </td>
                        <td className={`py-3 md:py-4 px-2 md:px-4 ${safeTheme.textMuted} align-middle hidden sm:table-cell truncate max-w-[100px]`}>
                          {t.receipt || 'Verified'}
                        </td>
                        <td className={`py-3 md:py-4 px-2 md:px-4 ${safeTheme.textMuted} align-middle whitespace-nowrap`}>
                          {dateLabel}
                        </td>
                        <td className="py-3 md:py-4 pl-2 md:pl-4 text-right font-extrabold text-xs md:text-sm text-red-400 align-middle whitespace-nowrap">
                          -₹{Number(t.amount || 0).toLocaleString('en-IN')}
                        </td>
                        {canEditFinance && (
                          <td className="py-3 md:py-4 pl-2 md:pl-4 text-right align-middle">
                            <button
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="p-1 md:p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
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

    </div>
  );
}