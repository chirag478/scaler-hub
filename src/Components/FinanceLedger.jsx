import React, { useState, useEffect } from 'react';
import { DollarSign, PlusCircle, Download, FileText, Trash2, TrendingUp, TrendingDown, Wallet, Sparkles } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { supabase } from '../supabaseClient';

export default function FinanceLedger({ theme, activeRole }) {
  const canEditFinance = activeRole === 'admin' || activeRole === 'council';
  const isDark = theme.bg.includes('0a0a0a');

  const [funds, setFunds] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [fundDesc, setFundDesc] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [txCategory, setTxCategory] = useState('Events');
  const [txName, setTxName] = useState('');
  const [txVendor, setTxVendor] = useState('');
  const [txAmount, setTxAmount] = useState('');

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    const { data: fundsData } = await supabase.from('funds').select('*').order('created_at', { ascending: false });
    const { data: txData } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });

    if (fundsData) setFunds(fundsData);
    if (txData) setTransactions(txData);
    setLoading(false);
  };

  const handleAddFund = async (e) => {
    e.preventDefault();
    if (!fundDesc || !fundAmount) return;

    const newFund = {
      desc: fundDesc,
      amount: Number(fundAmount),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    };

    const { data, error } = await supabase.from('funds').insert([newFund]).select();
    if (!error && data) {
      setFunds([data[0], ...funds]);
      setFundDesc('');
      setFundAmount('');
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!txName || !txVendor || !txAmount) return;

    const newTx = {
      category: txCategory,
      name: txName,
      vendor: txVendor,
      amount: Number(txAmount),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      status: 'Completed',
      receipt: null
    };

    const { data, error } = await supabase.from('transactions').insert([newTx]).select();
    if (!error && data) {
      setTransactions([data[0], ...transactions]);
      setTxName('');
      setTxVendor('');
      setTxAmount('');
    }
  };

  const handleDeleteTransaction = async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const totalFunds = funds.reduce((acc, f) => acc + Number(f.amount), 0);
  const totalSpent = transactions.reduce((acc, t) => acc + Number(t.amount), 0);
  const remainingBalance = totalFunds - totalSpent;

  const categoryData = Object.values(
    transactions.reduce((acc, tx) => {
      acc[tx.category] = acc[tx.category] || { name: tx.category, value: 0 };
      acc[tx.category].value += Number(tx.amount);
      return acc;
    }, {})
  );

  const exportToCSV = () => {
    const headers = ['Category,Expense Name,Vendor,Date,Amount (INR),Status\n'];
    const rows = transactions.map(t => `${t.category},"${t.name}","${t.vendor}","${t.date}",${t.amount},${t.status}\n`);
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scaler_cohort_ledger.csv';
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-500 tracking-wider uppercase">Live Financial Ledger</span>
        </div>
        <div className="flex items-center gap-3">
          {loading && <span className={`text-xs font-semibold animate-pulse ${theme.textMuted}`}>Syncing with cloud...</span>}
          <button onClick={exportToCSV} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border ${theme.border} ${theme.surface} ${theme.textStrong} hover:border-emerald-500 transition-all shadow-sm`}>
            <Download className="w-3.5 h-3.5 text-emerald-500" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className={`${theme.surface} border ${theme.border} rounded-2xl p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Total Treasury</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><TrendingUp className="w-5 h-5" /></div>
          </div>
          <div className={`text-3xl font-extrabold ${theme.textStrong}`}>₹{totalFunds.toLocaleString('en-IN')}</div>
        </div>

        <div className={`${theme.surface} border ${theme.border} rounded-2xl p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Total Utilized</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500"><TrendingDown className="w-5 h-5" /></div>
          </div>
          <div className={`text-3xl font-extrabold ${theme.textStrong}`}>₹{totalSpent.toLocaleString('en-IN')}</div>
        </div>

        <div className={`${theme.surface} border ${theme.border} rounded-2xl p-6 shadow-sm`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${theme.textMuted}`}>Available Balance</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500"><Wallet className="w-5 h-5" /></div>
          </div>
          <div className={`text-3xl font-extrabold ${remainingBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            ₹{remainingBalance.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Admin Input Forms */}
      {canEditFinance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleAddFund} className={`${theme.surface} border ${theme.border} rounded-2xl p-6 space-y-4`}>
            <h3 className={`text-sm font-extrabold ${theme.textStrong} flex items-center gap-2`}>
              <PlusCircle className="w-4 h-4 text-emerald-500" /> Log Incoming Fund / Sponsorship
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" placeholder="Source (e.g. Scaler Seed)" value={fundDesc} onChange={e => setFundDesc(e.target.value)} required className={`${theme.inputBg} border ${theme.border} rounded-xl px-3.5 py-2.5 text-xs ${theme.textStrong} outline-none`} />
              <input type="number" placeholder="Amount (₹)" value={fundAmount} onChange={e => setFundAmount(e.target.value)} required className={`${theme.inputBg} border ${theme.border} rounded-xl px-3.5 py-2.5 text-xs ${theme.textStrong} outline-none`} />
            </div>
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl transition-all">
              Add to Treasury
            </button>
          </form>

          <form onSubmit={handleAddTransaction} className={`${theme.surface} border ${theme.border} rounded-2xl p-6 space-y-4`}>
            <h3 className={`text-sm font-extrabold ${theme.textStrong} flex items-center gap-2`}>
              <FileText className="w-4 h-4 text-amber-500" /> Record New Expense
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <select value={txCategory} onChange={e => setTxCategory(e.target.value)} className={`${theme.inputBg} border ${theme.border} rounded-xl px-3 py-2.5 text-xs font-bold ${theme.textStrong} outline-none`}>
                <option value="Events">Events</option>
                <option value="Marketing">Marketing</option>
                <option value="Catering">Catering</option>
                <option value="Logistics">Logistics</option>
              </select>
              <input type="text" placeholder="Expense Name" value={txName} onChange={e => setTxName(e.target.value)} required className={`${theme.inputBg} border ${theme.border} rounded-xl px-3 py-2.5 text-xs ${theme.textStrong} outline-none`} />
              <input type="text" placeholder="Vendor" value={txVendor} onChange={e => setTxVendor(e.target.value)} required className={`${theme.inputBg} border ${theme.border} rounded-xl px-3 py-2.5 text-xs ${theme.textStrong} outline-none`} />
              <input type="number" placeholder="Amount (₹)" value={txAmount} onChange={e => setTxAmount(e.target.value)} required className={`${theme.inputBg} border ${theme.border} rounded-xl px-3 py-2.5 text-xs ${theme.textStrong} outline-none`} />
            </div>
            <button type="submit" className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white text-xs font-bold py-2.5 rounded-xl transition-all">
              Log Expense
            </button>
          </form>
        </div>
      )}

      {/* Breakdown & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${theme.surface} border ${theme.border} rounded-2xl p-6 flex flex-col justify-between`}>
          <h3 className={`text-base font-extrabold ${theme.textStrong} mb-4`}>Spend Breakdown</h3>
          {categoryData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5}>
                    {categoryData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className={`text-xs ${theme.textMuted} italic my-auto text-center`}>No expenses logged yet.</p>
          )}
        </div>

        <div className={`lg:col-span-2 ${theme.surface} border ${theme.border} rounded-2xl p-6 overflow-x-auto`}>
          <h3 className={`text-base font-extrabold ${theme.textStrong} mb-4`}>Itemized Expense Ledger</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b ${theme.border} text-[11px] font-extrabold uppercase tracking-wider ${theme.textMuted}`}>
                <th className="pb-3 pr-4">Expense</th>
                <th className="pb-3 px-4">Category</th>
                <th className="pb-3 px-4">Vendor</th>
                <th className="pb-3 px-4">Date</th>
                <th className="pb-3 pl-4 text-right">Amount</th>
                {canEditFinance && <th className="pb-3 pl-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-500/10 text-xs">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-500/5 transition-colors">
                  <td className={`py-3.5 pr-4 font-bold ${theme.textStrong}`}>{tx.name}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                      {tx.category}
                    </span>
                  </td>
                  <td className={`py-3.5 px-4 ${theme.textMuted}`}>{tx.vendor}</td>
                  <td className={`py-3.5 px-4 ${theme.textMuted}`}>{tx.date}</td>
                  <td className={`py-3.5 pl-4 text-right font-extrabold ${theme.textStrong}`}>₹{Number(tx.amount).toLocaleString('en-IN')}</td>
                  {canEditFinance && (
                    <td className="py-3.5 pl-4 text-right">
                      <button onClick={() => handleDeleteTransaction(tx.id)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
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