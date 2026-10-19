import React, { useState } from 'react';
import { 
  Trash2, Plus, Building2, Wallet, Receipt, Tag, 
  Paperclip, FileText, PieChart as PieChartIcon, BarChart as BarChartIcon, Download, Sparkles 
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

export default function FinanceLedger({ theme, activeRole }) {
  const canEditFinance = activeRole === 'admin' || activeRole === 'council';

  const [funds, setFunds] = useState([
    { id: 1, desc: 'Seed Loan (Scaler)', amount: 25000, date: 'Oct 08, 2026' }
  ]);
  const [isAddingFund, setIsAddingFund] = useState(false);
  const [fundDesc, setFundDesc] = useState('');
  const [fundAmount, setFundAmount] = useState('');

  const [transactions, setTransactions] = useState([
    { id: 1, category: 'Marketing', name: 'Product Club VP Campaign', vendor: 'Print Shop', date: 'Oct 10, 2026', amount: 4500, status: 'Completed', receipt: 'campaign_posters.pdf' },
    { id: 2, category: 'Catering', name: 'Cohort Mixer: Tech & PMs', vendor: 'Campus Catering Co.', date: 'Oct 12, 2026', amount: 12500, status: 'Completed', receipt: null },
  ]);

  const [category, setCategory] = useState('Logistics');
  const [newName, setNewName] = useState('');
  const [newVendor, setNewVendor] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);

  const totalFunds = funds.reduce((sum, fund) => sum + Number(fund.amount), 0);
  const totalSpent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const availableBalance = totalFunds - totalSpent;
  const burnPercentage = Math.min((totalSpent / totalFunds) * 100, 100) || 0;

  const expenseCategories = ['Logistics', 'Catering', 'Marketing', 'Prizes', 'Operations', 'Misc'];

  const categoryData = expenseCategories.map(cat => ({
    name: cat,
    value: transactions.filter(tx => tx.category === cat).reduce((sum, tx) => sum + Number(tx.amount), 0)
  })).filter(item => item.value > 0);
  
  const PIE_COLORS = ['#0A8647', '#10B981', '#34D399', '#059669', '#047857', '#6EE7B7'];

  const barData = [
    { name: 'Allocated', amount: totalFunds, fill: '#10B981' },
    { name: 'Spent', amount: totalSpent, fill: '#EF4444' }
  ];

  const handleAddFund = (e) => {
    e.preventDefault();
    if (!fundDesc || !fundAmount) return;
    setFunds([{ id: Date.now(), desc: fundDesc, amount: Number(fundAmount), date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) }, ...funds]);
    setFundDesc(''); setFundAmount(''); setIsAddingFund(false);
  };

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!newName || !newAmount) return;
    
    setTransactions([{ 
      id: Date.now(), category, name: newName, vendor: newVendor || 'Internal', 
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }), 
      amount: Number(newAmount), status: 'Allocated', 
      receipt: receiptFile ? receiptFile.name : null 
    }, ...transactions]);
    
    setNewName(''); setNewVendor(''); setNewAmount(''); setReceiptFile(null);
  };

  const handleDeleteTransaction = (id) => setTransactions(transactions.filter(tx => tx.id !== id));
  const handleDeleteFund = (id) => setFunds(funds.filter(f => f.id !== id));

  const exportToCSV = () => {
    const headers = ["ID", "Type", "Category/Desc", "Vendor", "Date", "Amount (INR)", "Status"];
    const rows = [
      ...funds.map(f => [f.id, "Funding Source", f.desc, "Internal", `"${f.date}"`, f.amount, "Added"]),
      ...transactions.map(t => [t.id, "Expense", t.name, t.vendor, `"${t.date}"`, `-${t.amount}`, t.status])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Scaler_Finance_Ledger_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isDark = theme.bg.includes('0a0a0a');
  const chartTextColor = isDark ? '#9CA3AF' : '#6B7280';
  const chartGridColor = isDark ? '#333333' : '#E5E7EB'; 

  // --- CUSTOM TOOLTIPS ---
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-4 rounded-xl border ${theme.border} ${theme.tooltipBg} shadow-2xl`}>
          <div className={`text-sm font-bold mb-2 ${theme.textStrong}`}>{label}</div>
          <div className={`text-xs font-medium flex items-center gap-2 ${theme.textMuted}`}>
            Amount: 
            <span className="font-mono font-extrabold text-[14px]" style={{ color: payload[0].payload.fill }}>
              ₹{payload[0].value.toLocaleString()}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-4 rounded-xl border ${theme.border} ${theme.tooltipBg} shadow-2xl`}>
          <div className={`text-sm font-bold flex items-center gap-2 mb-2 ${theme.textStrong}`}>
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.fill }}></span>
            {payload[0].name}
          </div>
          <div className={`text-xs font-medium ${theme.textMuted}`}>
            Total Spent: <span className="font-mono font-extrabold text-[14px] ml-1">₹{payload[0].value.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-emerald-500" />
        <span className="text-sm font-bold text-emerald-500 tracking-wider uppercase">Financial Transparency</span>
      </div>

      {/* ROW 1: METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
        
        {/* Total Budget Card */}
        <div className={`${theme.surface} border ${theme.border} rounded-2xl p-6 flex flex-col h-auto min-h-[10rem] relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300`}>
          {!isAddingFund ? (
            <>
              <div className="flex justify-between items-start mb-2">
                <div className={`text-xs font-bold ${theme.textMuted} uppercase tracking-widest flex items-center gap-2`}><Wallet className="w-4 h-4" /> Total Budget</div>
                {canEditFinance && (
                  <button onClick={() => setIsAddingFund(true)} className="text-[10px] bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-2.5 py-1 rounded-full font-bold transition-colors shadow-sm">+ Add Funds</button>
                )}
              </div>
              <div className={`text-3xl font-extrabold ${theme.textStrong} mt-auto`}>₹{totalFunds.toLocaleString()}</div>
              <div className={`text-xs ${theme.textMuted} mt-2 font-medium`}>{funds.length} funding sources verified</div>
            </>
          ) : (
            <form onSubmit={handleAddFund} className="flex flex-col h-full justify-between animate-in fade-in duration-200">
              <div className="space-y-3">
                <input type="text" value={fundDesc} onChange={(e) => setFundDesc(e.target.value)} placeholder="Fund Name" className={`w-full ${theme.inputBg} border ${theme.border} rounded-lg px-3 py-2 text-sm ${theme.textStrong} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all`} />
                <input type="number" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} placeholder="Amount (₹)" className={`w-full ${theme.inputBg} border ${theme.border} rounded-lg px-3 py-2 text-sm ${theme.textStrong} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all`} />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setIsAddingFund(false)} className={`flex-1 ${theme.hover} text-gray-500 text-xs py-2 rounded-lg border ${theme.border} font-bold`}>Cancel</button>
                <button type="submit" className="flex-1 bg-[#0A8647] hover:bg-[#0c9d54] text-white text-xs font-bold py-2 rounded-lg shadow-sm">Save</button>
              </div>
            </form>
          )}
        </div>
        
        {/* Total Spent Card */}
        <div className={`${theme.surface} border ${theme.border} rounded-2xl p-6 flex flex-col justify-between h-auto min-h-[10rem] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300`}>
          <div className={`text-xs font-bold ${theme.textMuted} uppercase tracking-widest flex items-center gap-2`}><Receipt className="w-4 h-4" /> Total Spent</div>
          <div className={`text-3xl font-extrabold ${theme.textStrong} mt-auto`}>₹{totalSpent.toLocaleString()}</div>
          <div className={`text-xs ${theme.textMuted} mt-2 font-medium`}>{transactions.length} transactions logged</div>
        </div>
        
        {/* Available Balance Hero Card */}
        <div className="bg-gradient-to-br from-[#0A8647] to-emerald-400 rounded-2xl p-6 flex flex-col justify-between h-auto min-h-[10rem] relative overflow-hidden shadow-lg shadow-emerald-900/20 transform hover:-translate-y-1 transition-all duration-300 group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
          <div className="relative z-10">
            <div className="text-xs font-bold text-emerald-50 uppercase tracking-widest flex items-center gap-2 mb-2">
              Available Balance
            </div>
            <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              ₹{availableBalance.toLocaleString()}
            </div>
          </div>
          
          <div className="mt-4 relative z-10">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5 text-emerald-50">
              <span>Budget Burn</span>
              <span>{burnPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-black/20 overflow-hidden shadow-inner">
              <div className="h-full bg-white rounded-full relative" style={{ width: `${burnPercentage}%` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/50 w-full h-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: LIVE DATA VISUALIZATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        
        <div className={`${theme.surface} border ${theme.border} rounded-2xl p-5 md:p-6 h-72 md:h-80 flex flex-col shadow-sm hover:shadow-md transition-all duration-300`}>
          <h3 className={`text-sm font-bold ${theme.textStrong} mb-4 flex items-center gap-2`}><PieChartIcon className="w-4 h-4 text-emerald-500"/> Spending by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: chartTextColor, strokeWidth: 1 }}
                  style={{ fontSize: '11px', fontWeight: 'bold' }}
                >
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <RechartsTooltip content={<CustomPieTooltip />} cursor={{ fill: 'transparent' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className={`flex-1 flex items-center justify-center text-xs font-medium italic ${theme.textMuted}`}>No expenses logged to chart yet.</div>
          )}
        </div>

        <div className={`${theme.surface} border ${theme.border} rounded-2xl p-5 md:p-6 h-72 md:h-80 flex flex-col shadow-sm hover:shadow-md transition-all duration-300`}>
          <h3 className={`text-sm font-bold ${theme.textStrong} mb-4 flex items-center gap-2`}><BarChartIcon className="w-4 h-4 text-emerald-500"/> Budget Burn Timeline</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGridColor} />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: chartTextColor, fontSize: 13, fontWeight: 'bold' }} width={80} />
              <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={28}>
                {barData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROW 3: FORMS & TABLES */}
      <div className={`grid grid-cols-1 ${canEditFinance ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-5 md:gap-6`}>
        
        {canEditFinance && (
          <div className={`lg:col-span-1 ${theme.surface} border ${theme.border} rounded-2xl p-5 md:p-6 h-fit shadow-sm hover:shadow-md transition-all duration-300`}>
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-8 h-8 rounded-lg ${theme.bg} flex items-center justify-center border ${theme.border}`}><Plus className="w-4 h-4 text-emerald-500" /></div>
              <h3 className={`text-sm font-bold ${theme.textStrong}`}>Log Expense</h3>
            </div>
            
            <form onSubmit={handleAddTransaction} className="space-y-5">
              <div>
                <label className={`block text-xs font-bold ${theme.textMuted} mb-1.5 uppercase tracking-wider`}>Initiative Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Guest Speaker" className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-4 py-3 text-sm ${theme.textStrong} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold ${theme.textMuted} mb-1.5 uppercase tracking-wider`}>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-4 py-3 text-sm ${theme.textStrong} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all`}>
                    {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-bold ${theme.textMuted} mb-1.5 uppercase tracking-wider`}>Cost (₹)</label>
                  <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0" className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-4 py-3 text-sm ${theme.textStrong} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all`} />
                </div>
              </div>
              <div>
                <label className={`block text-xs font-bold ${theme.textMuted} mb-1.5 uppercase tracking-wider`}>Vendor Details</label>
                <input type="text" value={newVendor} onChange={(e) => setNewVendor(e.target.value)} placeholder="Add supplier details" className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-4 py-3 text-sm ${theme.textStrong} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all`} />
              </div>
              
              <div>
                <label className={`block text-xs font-bold ${theme.textMuted} mb-1.5 uppercase tracking-wider`}>Receipt / Invoice (Optional)</label>
                <div className={`w-full flex items-center justify-center border-2 border-dashed ${theme.border} rounded-xl p-4 ${theme.hover} hover:border-emerald-500/50 transition-all cursor-pointer relative group`}>
                  <input type="file" onChange={(e) => setReceiptFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,.pdf" />
                  <div className={`flex items-center gap-2 text-xs font-medium ${receiptFile ? 'text-emerald-500 font-bold' : theme.textMuted} group-hover:text-emerald-400 transition-colors`}>
                    <Paperclip className="w-4 h-4" />
                    <span className="truncate max-w-[150px]">{receiptFile ? receiptFile.name : 'Upload PDF or Image'}</span>
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-emerald-900/20 flex items-center justify-center gap-2 mt-2 hover:-translate-y-0.5">
                <Plus className="w-4 h-4" /> Add to Ledger
              </button>
            </form>
          </div>
        )}

        <div className={`${canEditFinance ? 'lg:col-span-2' : 'lg:col-span-1'} ${theme.surface} border ${theme.border} rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-all duration-300`}>
          <div className={`p-5 md:p-6 border-b ${theme.border} flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0 ${theme.surface}`}>
            <div>
              <h3 className={`text-sm font-bold ${theme.textStrong}`}>Master Ledger</h3>
              <span className={`text-xs font-medium ${theme.textMuted}`}>{transactions.length + funds.length} Records Documented</span>
            </div>
            
            <button 
              onClick={exportToCSV}
              className="flex items-center justify-center gap-2 bg-[#0A8647]/10 text-[#0A8647] hover:bg-[#0A8647] hover:text-white border border-[#0A8647]/30 px-4 py-2 rounded-lg text-xs font-bold transition-all w-full sm:w-auto shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Export Data
            </button>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className={`${theme.tableHeader} border-b ${theme.border} ${theme.textMuted} text-[10px] uppercase tracking-widest`}>
                <tr>
                  <th className="p-5 font-bold">Record Details</th>
                  <th className="p-5 font-bold">Date</th>
                  <th className="p-5 font-bold text-right">Amount</th>
                  <th className="p-5 font-bold text-center">Receipt</th>
                  {canEditFinance && <th className="p-5 font-bold text-center">Action</th>}
                </tr>
              </thead>
              <tbody className={`divide-y ${theme.border}`}>
                {funds.map((fund) => (
                  <tr key={fund.id} className={`${theme.tableRowHover} transition-colors group`}>
                    <td className="p-5">
                      <div className={`font-bold ${theme.textStrong} text-sm`}>{fund.desc}</div>
                      <div className="flex items-center gap-2 mt-2"><span className={`text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-md`}><Wallet className="w-3 h-3" /> Funding Source</span></div>
                    </td>
                    <td className={`p-5 text-sm font-medium ${theme.textMuted}`}>{fund.date}</td>
                    <td className="p-5 text-right">
                      <div className="font-mono text-emerald-500 font-extrabold text-[15px]">+₹{fund.amount.toLocaleString()}</div>
                    </td>
                    <td className="p-5 text-center"><span className="text-[10px] font-medium text-gray-500 italic">—</span></td>
                    {canEditFinance && (
                      <td className="p-5 text-center">
                        <button onClick={() => handleDeleteFund(fund.id)} className={`text-gray-400 hover:text-white hover:bg-red-500 p-2 rounded-lg mx-auto transition-all opacity-0 group-hover:opacity-100 shadow-sm`}><Trash2 className="w-4 h-4" /></button>
                      </td>
                    )}
                  </tr>
                ))}
                
                {transactions.map((tx) => (
                  <tr key={tx.id} className={`${theme.tableRowHover} transition-colors group`}>
                    <td className="p-5">
                      <div className={`font-bold ${theme.textStrong} text-sm`}>{tx.name}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-bold ${theme.textMuted} flex items-center gap-1.5 border ${theme.border} px-2 py-0.5 rounded-md`}><Tag className="w-3 h-3" /> {tx.category}</span>
                        <span className={`text-[11px] font-medium ${theme.textMuted} flex items-center gap-1.5`}><Building2 className="w-3 h-3" /> {tx.vendor}</span>
                      </div>
                    </td>
                    <td className={`p-5 text-sm font-medium ${theme.textMuted}`}>{tx.date}</td>
                    <td className="p-5 text-right">
                      <div className={`font-mono ${theme.textStrong} font-extrabold text-[15px]`}>-₹{tx.amount.toLocaleString()}</div>
                    </td>
                    <td className="p-5 text-center">
                      {tx.receipt ? (
                        <button 
                          onClick={() => alert(`Simulating opening receipt: ${tx.receipt}`)}
                          className="mx-auto p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider shadow-sm" 
                          title="View Receipt"
                        >
                          <FileText className="w-3.5 h-3.5" /> View
                        </button>
                      ) : (
                        <span className="text-[10px] font-medium text-gray-500 italic">No receipt</span>
                      )}
                    </td>
                    {canEditFinance && (
                      <td className="p-5 text-center">
                        <button onClick={() => handleDeleteTransaction(tx.id)} className={`text-gray-400 hover:text-white hover:bg-red-500 p-2 mx-auto rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-sm`}><Trash2 className="w-4 h-4" /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}