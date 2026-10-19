import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Wallet, PlusCircle, FileText, 
  Download, Trash2, Sparkles, ArrowUpRight, ArrowDownRight, Filter 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function FinanceLedger({ theme, activeRole }) {
  const safeTheme = theme || {
    bg: 'bg-[#0a0a0a]',
    surface: 'bg-[#121212]',
    border: 'border-[#262626]',
    textStrong: 'text-white',
    textMuted: 'text-gray-400',
    inputBg: 'bg-[#1a1a1a]',
    hover: 'hover:bg-[#1f1f1f]',
  };

  const canEditFinance = activeRole === 'admin' || activeRole === 'council';

  const [funds, setFunds] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ledgerFilter, setLedgerFilter] = useState('all'); // 'all' | 'inflow' | 'expense'

  // Form states for Incoming Fund
  const [fundSource, setFundSource] = useState('');
  const [fundAmount, setFundAmount] = useState('');

  // Form states for Expense
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

  // --- ADD INCOMING FUND TO TREASURY ---
  const handleAddFund = async (e) => {
    e.preventDefault();
    if (!fundSource.trim() || !fundAmount) return;

    const newFund = {
      source: fundSource.trim(),
      amount: Number(fundAmount),
      date: new Date().toISOString().split('T')[0],
    };

    const { data, error } = await supabase.from('funds').insert([newFund]).select();

    if (error) {
      // Fallback if 'source' column is named 'title' or 'description' in your schema
      const fallbackFund = {
        description: fundSource.trim(),
        amount: Number(fundAmount),
      };
      const retry = await supabase.from('funds').insert([fallbackFund]).select();
      if (retry.error) {
        alert('Error adding fund: ' + error.message);
        return;
      }
      if (retry.data) setFunds((prev) => [retry.data[0], ...prev]);
    } else if (data) {
      setFunds((prev) => [data[0], ...prev.filter(f => f.id !== data[0].id)]);
    }

    setFundSource('');
    setFundAmount('');
  };

  // --- ADD EXPENSE TRANSACTION ---
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!txDescription.trim() || !txAmount) return;

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

  const handleDeleteEntry = async (entryType, id) => {
    const tableName = entryType === 'inflow' ? 'funds' : 'transactions';
    const { error } = await supabase.from(tableName).delete().eq('id', id);

    if (!error) {
      if (entryType === 'inflow') setFunds(funds.filter(f => f.id !== id));
      else setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  // Totals Calculation
  const totalTreasury = funds.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const totalUtilized = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const availableBalance = totalTreasury - totalUtilized;

  // Combine both Funds (Inflows) and Transactions (Expenses) into one unified ledger list!
  const unifiedLedger = [
    ...funds.map((f) => ({
      id: f.id,
      entryType: 'inflow',
      category: 'Treasury Inflow',
      description: f.source || f.description || f.title || 'Cohort Fund / Sponsorship',
      reference: 'Added to Treasury',
      amount: Number(f.amount || 0),
      date: f.date || (f.created_at ? f.created_at.split('T')[0] : 'Recorded'),
      timestamp: f.created_at ? new Date(f.created_at).getTime() : 0,
    })),
    ...transactions.map((t) => ({
      id: t.id,
      entryType: 'expense',
      category: t.category || 'General',
      description: t.description || t.title || 'Cohort Expense',
      reference: t.receipt || 'Verified',
      amount: Number(t.amount || 0),
      date: t.date || (t.created_at ? t.created_at.split('T')[0] : 'Recorded'),
      timestamp: t.created_at ? new Date(t.created_at).getTime() : 0,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  const filteredLedger = unifiedLedger.filter((item) => {
    if (ledgerFilter === 'inflow') return item.entryType === 'inflow';
    if (ledgerFilter === 'expense') return item.entryType === 'expense';
    return true;
  });

  // Export Unified CSV (Both Inflows & Expenses)
  const handleExportCSV = () => {
    const headers = ['Type,Category,Description,Reference,Date,Amount (INR)\n'];
    const rows = unifiedLedger.map(item => 
      `${item.entryType === 'inflow' ? 'CREDIT (+)' : 'DEBIT (-)'},"${item.category}","${item.description}","${item.reference}",${item.date},${item.entryType === 'inflow' ? item.amount : -item.amount}`
    );
    const blob = new Blob([headers.concat(rows.join('\n'))], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Scaler_Transparency_Ledger_${new Date().toISOString().split('T')[0]}.csv`;
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
        </div>

        <button
          onClick={handleExportCSV}
          className={`px-4 py-2 rounded-xl border ${safeTheme.border} ${safeTheme.surface} ${safeTheme.textStrong} text-xs font-extrabold flex items-center gap-2 hover:border-emerald-500/50 transition-all shadow-sm`}
        >
          <Download className="w-4 h-4 text-emerald-500" /> Export CSV
        </button>
      </div>

      {/* Top 3 KPI Summary Cards */}
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

      {/* Admin / Council Entry Forms */}
      {canEditFinance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Log Incoming Fund / Sponsorship */}
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

          {/* Record New Expense */}
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
                  <option value="Refreshments">Refreshments</option>
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

      {/* UNIFIED LEDGER TABLE (Shows BOTH Treasury Additions and Expenses) */}
      <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm overflow-x-auto`}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className={`text-base font-extrabold ${safeTheme.textStrong}`}>
              Complete Transaction & Treasury History
            </h3>
            <p className={`text-xs ${safeTheme.textMuted}`}>
              Every rupee added to the treasury and spent by the council is logged below
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5">
            <Filter className={`w-3.5 h-3.5 ${safeTheme.textMuted} mr-1`} />
            {[
              { id: 'all', label: 'All Entries' },
              { id: 'inflow', label: 'Treasury Inflows (+)' },
              { id: 'expense', label: 'Expenses (-)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLedgerFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  ledgerFilter === tab.id
                    ? 'bg-emerald-500 text-white'
                    : `${safeTheme.inputBg} ${safeTheme.textMuted} hover:${safeTheme.textStrong}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b ${safeTheme.border} text-[11px] font-extrabold uppercase tracking-wider ${safeTheme.textMuted}`}>
              <th className="pb-3 pr-4">Type / Category</th>
              <th className="pb-3 px-4">Description / Source</th>
              <th className="pb-3 px-4">Reference</th>
              <th className="pb-3 px-4">Date</th>
              <th className="pb-3 pl-4 text-right">Amount</th>
              {canEditFinance && <th className="pb-3 pl-4 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-500/10 text-xs">
            {filteredLedger.length === 0 ? (
              <tr>
                <td colSpan={6} className={`py-8 text-center ${safeTheme.textMuted} font-semibold`}>
                  No financial records found. Add funds or log an expense above!
                </td>
              </tr>
            ) : (
              filteredLedger.map((item) => {
                const isCredit = item.entryType === 'inflow';
                return (
                  <tr key={`${item.entryType}-${item.id}`} className="hover:bg-gray-500/5 transition-colors">
                    <td className="py-4 pr-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isCredit
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {isCredit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {item.category}
                      </span>
                    </td>
                    <td className={`py-4 px-4 font-extrabold ${safeTheme.textStrong}`}>
                      {item.description}
                    </td>
                    <td className={`py-4 px-4 ${safeTheme.textMuted}`}>
                      {item.reference}
                    </td>
                    <td className={`py-4 px-4 ${safeTheme.textMuted}`}>
                      {item.date}
                    </td>
                    <td className={`py-4 pl-4 text-right font-extrabold text-sm ${
                      isCredit ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {isCredit ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                    </td>
                    {canEditFinance && (
                      <td className="py-4 pl-4 text-right">
                        <button
                          onClick={() => handleDeleteEntry(item.entryType, item.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete Entry"
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
  );
}