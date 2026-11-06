import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  TrendingDown, Wallet, FileText, Trash2, Sparkles, 
  ShieldAlert, CheckCircle2, RefreshCw, ExternalLink, Table,
  PlusCircle, Tag, Building2, User, HelpCircle, Receipt, X, Calendar, Layers
} from 'lucide-react';
import { INITIAL_SHEET_TRANSACTIONS, GOOGLE_SHEET_URL } from '../sheetData';

export default function FinanceLedger({ theme, activeRole, userProfile }) {
  const safeTheme = theme || {
    bg: 'bg-[#0a0a0a]', surface: 'bg-[#121212]', border: 'border-[#262626]',
    textStrong: 'text-white', textMuted: 'text-gray-400', inputBg: 'bg-[#1a1a1a]',
    hover: 'hover:bg-[#1f1f1f]'
  };

  // ONLY the Treasurer or Admin can add/edit the ledger
  const isTreasurer = 
    activeRole === 'treasurer' || 
    activeRole === 'admin' || 
    String(userProfile?.sub_role || '').toLowerCase() === 'treasurer' ||
    String(userProfile?.role || '').toLowerCase() === 'treasurer';

  const [transactions, setTransactions] = useState(() => {
    try {
      const cached = localStorage.getItem('scaler_transactions_backup');
      return cached ? JSON.parse(cached) : INITIAL_SHEET_TRANSACTIONS;
    } catch (e) {
      return INITIAL_SHEET_TRANSACTIONS;
    }
  });

  const [syncing, setSyncing] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState('Google Sheet Connected');

  // FORM FIELDS - FULLY ALIGNED WITH GOOGLE SHEET COLUMNS
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txCategory, setTxCategory] = useState('Week 1 Cohort Connect');
  const [customEventMode, setCustomEventMode] = useState(false);
  const [newEventName, setNewEventName] = useState('');

  const [eventsList, setEventsList] = useState(() => {
    try {
      const saved = localStorage.getItem('scaler_custom_events');
      const base = [
        'Week 1 Cohort Connect',
        'Navratri',
        'Halloween',
        'Karnataka Rajyotsava',
        'General Council Spends',
        'Club Event'
      ];
      return saved ? Array.from(new Set([...base, ...JSON.parse(saved)])) : base;
    } catch (e) {
      return [
        'Week 1 Cohort Connect',
        'Navratri',
        'Halloween',
        'Karnataka Rajyotsava',
        'General Council Spends',
        'Club Event'
      ];
    }
  });

  const [txDescription, setTxDescription] = useState('');
  const [txVendor, setTxVendor] = useState('');
  const [txEntity, setTxEntity] = useState('Student Council');
  const [txQty, setTxQty] = useState('');
  const [txUnitPrice, setTxUnitPrice] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txReceipt, setTxReceipt] = useState('');
  const [txPaidBy, setTxPaidBy] = useState('');
  const [txReimbursement, setTxReimbursement] = useState('No');
  const [txNotes, setTxNotes] = useState('');

  const councilList = [
    'Student Council',
    'Cultural & Sports',
    'Product Club',
    'Strategy Club',
    'Marketing Club',
    'Finance Club',
    'E and VC Club',
    'Other'
  ];

  const mainClubs = ['Product Club', 'Strategy Club', 'Finance Club', 'Marketing Club'];

  // Auto-calculate total amount if Qty & Unit Price are filled
  useEffect(() => {
    if (txQty && txUnitPrice && !isNaN(Number(txQty)) && !isNaN(Number(txUnitPrice))) {
      const calculated = Number(txQty) * Number(txUnitPrice);
      setTxAmount(String(calculated));
    }
  }, [txQty, txUnitPrice]);

  // Initial fetch from Google Sheet
  useEffect(() => {
    fetchFromGoogleSheet();
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      try {
        localStorage.setItem('scaler_transactions_backup', JSON.stringify(transactions));
      } catch (e) {}
    }
  }, [transactions]);

  const fetchFromGoogleSheet = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sheets/fetch');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          setTransactions(json.data);
          
          // Also extract all distinct event headers found in the sheet
          const sheetCategories = Array.from(new Set(json.data.map(d => d.category).filter(Boolean)));
          setEventsList(prev => Array.from(new Set([...prev, ...sheetCategories])));

          setLastSyncTime(`Synced at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        }
      }
    } catch (err) {
      console.warn('Google Sheet fetch error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!isTreasurer) return alert("Only the Treasurer can update the ledger.");
    if (!txAmount || isNaN(Number(txAmount)) || Number(txAmount) <= 0) {
      return alert("Please enter a valid positive expense amount.");
    }

    const finalCategory = customEventMode && newEventName.trim() 
      ? newEventName.trim() 
      : txCategory;

    // Save newly created event header to list
    if (customEventMode && newEventName.trim()) {
      const updatedList = Array.from(new Set([newEventName.trim(), ...eventsList]));
      setEventsList(updatedList);
      setTxCategory(newEventName.trim());
      try {
        localStorage.setItem('scaler_custom_events', JSON.stringify(updatedList));
      } catch (e) {}
    }

    const newTx = {
      id: 'tx-' + Date.now(),
      date: txDate,
      category: finalCategory,
      description: txDescription.trim(),
      vendor: txVendor.trim(),
      entity: txEntity,
      qty: txQty.trim(),
      unitPrice: txUnitPrice.trim(),
      amount: Number(txAmount),
      receipt: txReceipt.trim() || 'No receipt',
      paidBy: txPaidBy.trim() || userProfile?.full_name || 'Treasurer',
      reimbursement: txReimbursement,
      notes: txNotes.trim(),
      approval_status: 'Approved',
      created_at: new Date().toISOString(),
      source: 'Portal'
    };

    // 1. Optimistic Update: Immediately add to local state
    setTransactions(prev => [newTx, ...prev]);
    
    // Reset form fields
    setTxDescription('');
    setTxVendor('');
    setTxQty('');
    setTxUnitPrice('');
    setTxAmount('');
    setTxReceipt('');
    setTxPaidBy('');
    setTxNotes('');
    setTxReimbursement('No');
    setCustomEventMode(false);
    setNewEventName('');
    
    setSuccessToast(`Recorded ₹${newTx.amount.toLocaleString('en-IN')} for "${finalCategory}" & syncing with Google Sheet...`);
    setTimeout(() => setSuccessToast(''), 4500);

    // 2. Append directly to Google Sheet via backend API
    try {
      const res = await fetch('/api/sheets/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.sheetRow) {
          setTransactions(prev => prev.map(t => t.id === newTx.id ? { ...t, sheetRow: json.sheetRow } : t));
        }
        setSuccessToast(`Synced to Google Sheet under header "${finalCategory}" (Row ${json.sheetRow || ''})!`);
      }
    } catch (err) {
      console.warn('Google Sheet append error:', err);
    }

    // 3. Background Sync to Supabase if available
    try {
      await supabase.from('transactions').insert([newTx]);
    } catch (err) {}
  };

  const handleDeleteTransaction = async (tx) => {
    if (!isTreasurer) return;
    const confirmDelete = window.confirm(`Are you sure you want to delete "${tx.description}" (₹${Number(tx.amount).toLocaleString('en-IN')})?\nThis will remove it from the site and clear it from the Google Sheet.`);
    if (!confirmDelete) return;

    // 1. Optimistically remove from state
    setTransactions(prev => prev.filter(t => t.id !== tx.id));
    setSuccessToast(`Removing "${tx.description}" from Google Sheet...`);
    setTimeout(() => setSuccessToast(''), 4000);

    // 2. Delete / Clear from Google Sheet via backend API
    try {
      const res = await fetch('/api/sheets/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheetRow: tx.sheetRow,
          description: tx.description,
          amount: tx.amount
        })
      });
      if (res.ok) {
        setSuccessToast(`Successfully removed from site and cleared in Google Sheet!`);
      }
    } catch (err) {
      console.warn('Google Sheet delete error:', err);
    }

    // 3. Supabase delete if applicable
    try {
      if (tx.id && !tx.id.startsWith('sheet-')) {
        await supabase.from('transactions').delete().eq('id', tx.id);
      }
    } catch (err) {}
  };

  // CALCULATIONS
  const councilSpent = transactions
    .filter(t => t.entity === 'Student Council' || t.entity === 'Cultural & Sports')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const councilBurn = Math.min((councilSpent / 250000) * 100, 100);

  const getClubSpent = (clubName) => 
    transactions.filter(t => t.entity === clubName).reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 w-full animate-in fade-in duration-300">
      
      {/* HEADER & GOOGLE SHEET SYNC BAR - RESPONSIVE */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${safeTheme.surface} border ${safeTheme.border} p-4 sm:p-5 rounded-2xl shadow-sm`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
            <Table className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs sm:text-sm font-extrabold ${safeTheme.textStrong}`}>Google Sheet Live Sync</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold whitespace-nowrap">
                Two-Way Active
              </span>
            </div>
            <p className={`text-[11px] sm:text-xs ${safeTheme.textMuted} mt-0.5 truncate`}>
              Synced with <span className={`${safeTheme.textStrong} font-semibold`}>Council Club Budget Tracker</span> ({lastSyncTime})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={fetchFromGoogleSheet}
            disabled={syncing}
            className={`flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border ${safeTheme.border} ${safeTheme.inputBg} text-xs font-bold ${safeTheme.textStrong} hover:${safeTheme.hover} transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Sheet'}</span>
          </button>

          <a
            href={GOOGLE_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>Open Sheet</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {successToast && (
        <div className="px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* COUNCIL BUDGET (2.5L) */}
      <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-5 sm:p-6 shadow-sm`}>
        <div className="flex justify-between items-center mb-2">
          <span className={`text-xs font-bold uppercase tracking-wider ${safeTheme.textMuted}`}>Student Council Cap</span>
          <span className="text-xs font-extrabold text-emerald-500">₹2,50,000</span>
        </div>
        <div className={`text-2xl sm:text-3xl font-extrabold ${safeTheme.textStrong} mb-3`}>
          ₹{councilSpent.toLocaleString('en-IN')} <span className={`text-xs sm:text-sm ${safeTheme.textMuted} font-semibold`}>Spent ({councilBurn.toFixed(1)}%)</span>
        </div>
        <div className="w-full h-2.5 bg-gray-500/20 rounded-full overflow-hidden">
          <div style={{ width: `${councilBurn}%` }} className={`h-full transition-all duration-500 ${councilBurn > 85 ? 'bg-red-500' : 'bg-emerald-500'}`} />
        </div>
        <div className={`flex justify-between items-center text-[10px] sm:text-[11px] ${safeTheme.textMuted} mt-2.5 font-medium`}>
          <span>Remaining Balance: <strong className={safeTheme.textStrong}>₹{(250000 - councilSpent).toLocaleString('en-IN')}</strong></span>
          <span>Aligned with Google Sheet</span>
        </div>
      </div>

      {/* INDIVIDUAL CLUB BUDGETS (20k Each) - RESPONSIVE GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {mainClubs.map(club => {
          const spent = getClubSpent(club);
          const burn = Math.min((spent / 20000) * 100, 100);
          return (
            <div key={club} className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-4 shadow-sm hover:border-emerald-500/40 transition-all`}>
              <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${safeTheme.textStrong}`}>{club}</h4>
              <div className="flex justify-between items-baseline text-xs mb-1.5">
                <span className="text-amber-500 font-extrabold">₹{spent.toLocaleString('en-IN')}</span>
                <span className={`${safeTheme.textMuted} text-[11px]`}>/ ₹20,000</span>
              </div>
              <div className="w-full h-1.5 bg-gray-500/20 rounded-full overflow-hidden">
                <div style={{ width: `${burn}%` }} className={`h-full transition-all duration-500 ${burn > 90 ? 'bg-red-500' : 'bg-amber-500'}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* TREASURER ONLY: ADD EXPENSE FORM - ALIGNED TO GOOGLE SHEET COLUMNS */}
      {isTreasurer ? (
        <div className={`${safeTheme.surface} border border-emerald-500/30 rounded-2xl p-5 sm:p-7 shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm sm:text-base font-extrabold text-emerald-500 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Log Official Expense (Treasurer Only)
            </h3>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Synced with Sheet
            </span>
          </div>
          <p className={`text-[11px] sm:text-xs ${safeTheme.textMuted} mb-6 leading-relaxed`}>
            Every field below maps directly to the columns in <span className={`${safeTheme.textStrong} font-semibold`}>Council Spends</span>. Committing writes to both the portal and your Google Sheet.
          </p>

          <form onSubmit={handleAddTransaction} className="space-y-4 sm:space-y-5">
            
            {/* ROW 1: Date, Event / Category (With New Event Header Creator), Council/Entity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1.5 block`}>
                  Date
                </label>
                <input 
                  type="date" 
                  required 
                  value={txDate} 
                  onChange={(e) => setTxDate(e.target.value)} 
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 transition-all`}
                />
              </div>

              {/* EVENT HEADER SELECTION OR CREATION */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider block`}>
                    Event Header
                  </label>
                  {!customEventMode ? (
                    <button
                      type="button"
                      onClick={() => setCustomEventMode(true)}
                      className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-0.5 cursor-pointer"
                    >
                      <PlusCircle className="w-3 h-3" /> New Header
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCustomEventMode(false)}
                      className={`text-[10px] font-bold ${safeTheme.textMuted} hover:${safeTheme.textStrong} cursor-pointer`}
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {customEventMode ? (
                  <div className="relative">
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Diwali Mela, Sports Meet, Alumni Mixer"
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                      className={`w-full ${safeTheme.inputBg} border border-emerald-500 ${safeTheme.textStrong} rounded-xl px-3.5 py-2.5 text-xs outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-gray-500`}
                    />
                    <button
                      type="button"
                      onClick={() => setCustomEventMode(false)}
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${safeTheme.textMuted} hover:${safeTheme.textStrong}`}
                      title="Cancel custom header"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <select 
                    value={txCategory} 
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setCustomEventMode(true);
                      } else {
                        setTxCategory(e.target.value);
                      }
                    }} 
                    className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-emerald-500 transition-all`}
                  >
                    {eventsList.map(e => <option key={e} value={e}>{e}</option>)}
                    <option value="__NEW__">+ Create New Event Header...</option>
                  </select>
                )}
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1.5 block`}>
                  Council / Club Pool
                </label>
                <select 
                  value={txEntity} 
                  onChange={(e) => setTxEntity(e.target.value)} 
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-emerald-500 transition-all`}
                >
                  {councilList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* ROW 2: Item / Details & Vendor */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1.5 block`}>
                  Item / Details (Item Description) *
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Amphitheatre lights, Flower decoration, Food expenses" 
                  value={txDescription} 
                  onChange={(e) => setTxDescription(e.target.value)} 
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500 transition-all`} 
                />
              </div>

              <div>
                <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1.5 block`}>
                  Vendor
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Blinkit, Zepto, BMS Tent House, Amazon" 
                  value={txVendor} 
                  onChange={(e) => setTxVendor(e.target.value)} 
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500 transition-all`} 
                />
              </div>
            </div>

            {/* ROW 3: Qty, Unit Price, Total Amount (Rs) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1.5 block`}>
                  Quantity (Qty)
                </label>
                <input 
                  type="number" 
                  placeholder="Optional (e.g. 5, 50)" 
                  value={txQty} 
                  onChange={(e) => setTxQty(e.target.value)} 
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500 transition-all`} 
                />
              </div>

              <div>
                <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1.5 block`}>
                  Unit Price (₹)
                </label>
                <input 
                  type="number" 
                  placeholder="Optional (e.g. 400)" 
                  value={txUnitPrice} 
                  onChange={(e) => setTxUnitPrice(e.target.value)} 
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500 transition-all`} 
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1.5 block font-extrabold">
                  Total Amount (₹) *
                </label>
                <input 
                  type="number" 
                  required 
                  placeholder="e.g. 4500" 
                  value={txAmount} 
                  onChange={(e) => setTxAmount(e.target.value)} 
                  className={`w-full ${safeTheme.inputBg} border border-emerald-500/50 ${safeTheme.textStrong} rounded-xl px-3.5 py-2.5 text-xs font-extrabold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all`} 
                />
              </div>
            </div>

            {/* ROW 4: Paid By, Reimbursement Needed?, Invoice Link */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1.5 block`}>
                  Paid By
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Student Name / Treasurer" 
                  value={txPaidBy} 
                  onChange={(e) => setTxPaidBy(e.target.value)} 
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500 transition-all`} 
                />
              </div>

              <div>
                <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1.5 block`}>
                  Reimbursement Needed?
                </label>
                <select 
                  value={txReimbursement} 
                  onChange={(e) => setTxReimbursement(e.target.value)} 
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3.5 py-2.5 text-xs font-bold outline-none focus:border-emerald-500 transition-all`}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1.5 block`}>
                  Invoice No / Reference Link
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. INV-113 / Drive link" 
                  value={txReceipt} 
                  onChange={(e) => setTxReceipt(e.target.value)} 
                  className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500 transition-all`} 
                />
              </div>
            </div>

            {/* ROW 5: Notes */}
            <div>
              <label className={`text-[10px] font-bold ${safeTheme.textMuted} uppercase tracking-wider mb-1.5 block`}>
                Notes / Remarks
              </label>
              <input 
                type="text" 
                placeholder="e.g. Marked Paid in source sheet, Buy 1 get 1 offer" 
                value={txNotes} 
                onChange={(e) => setTxNotes(e.target.value)} 
                className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} ${safeTheme.textStrong} rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500 transition-all`} 
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white text-xs sm:text-sm font-extrabold py-3.5 rounded-xl transition-all shadow-sm cursor-pointer active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Commit to Ledger & Write to Google Sheet
            </button>
          </form>
        </div>
      ) : (
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 text-xs text-blue-500 dark:text-blue-400 font-bold">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>Only the official Treasurer can record expenses. Switch to Treasurer using the bottom-right POV Switcher to add records.</span>
        </div>
      )}

      {/* EXPENSE RECORDS SECTION - RESPONSIVE (Cards on mobile, Full Table on desktop) */}
      <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-4 sm:p-6 shadow-sm overflow-hidden`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className={`text-xs sm:text-sm font-extrabold ${safeTheme.textStrong} uppercase tracking-wider`}>
              Expense Records ({transactions.length})
            </h4>
            <p className={`text-[10px] sm:text-[11px] ${safeTheme.textMuted} mt-0.5`}>
              Aligned directly with Council Spends. Deleting an item clears its row in the Google Sheet.
            </p>
          </div>
          <span className={`text-[10px] sm:text-[11px] ${safeTheme.textMuted} font-medium`}>
            {isTreasurer ? 'Click trash icon to delete' : 'Read-only view'}
          </span>
        </div>

        {/* 1. MOBILE CARD VIEW (Visible on small screens) */}
        <div className="block md:hidden space-y-3">
          {transactions.length === 0 ? (
            <div className={`py-8 text-center text-xs ${safeTheme.textMuted} italic`}>
              No expenses recorded yet. Click "Sync Sheet" to load Google Sheet data.
            </div>
          ) : (
            transactions.map((t) => (
              <div 
                key={t.id} 
                className={`p-3.5 rounded-xl border ${safeTheme.border} ${safeTheme.inputBg} space-y-2`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-amber-500 block">
                      {t.category || 'General'}
                    </span>
                    <h5 className={`text-xs font-bold ${safeTheme.textStrong} mt-0.5`}>
                      {t.description}
                    </h5>
                    {t.vendor && (
                      <span className={`text-[11px] ${safeTheme.textMuted} block`}>
                        Vendor: {t.vendor}
                      </span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-red-500 block">
                      -₹{Number(t.amount || 0).toLocaleString('en-IN')}
                    </span>
                    <span className={`text-[10px] ${safeTheme.textMuted}`}>
                      {t.date}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-500/10 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold uppercase">
                    {t.entity}
                  </span>

                  {isTreasurer && (
                    <button 
                      onClick={() => handleDeleteTransaction(t)} 
                      title="Delete from site and clear from Google Sheet"
                      className="text-red-500 hover:bg-red-500/15 p-1 rounded transition-colors flex items-center gap-1 font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 2. DESKTOP FULL TABLE VIEW (Visible on md and larger screens) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left min-w-[750px]">
            <thead>
              <tr className={`border-b ${safeTheme.border} text-[11px] font-extrabold uppercase tracking-wider ${safeTheme.textMuted}`}>
                <th className="pb-3 pr-2">Event & Date</th>
                <th className="pb-3 px-2">Item / Details</th>
                <th className="pb-3 px-2">Vendor</th>
                <th className="pb-3 px-2">Council / Entity</th>
                <th className="pb-3 px-2">Paid By</th>
                <th className="pb-3 px-2">Notes & Ref</th>
                <th className="pb-3 pl-2 text-right">Amount (₹)</th>
                {isTreasurer && <th className="pb-3 pl-2 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-500/10 text-xs ${safeTheme.textStrong}`}>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={isTreasurer ? 8 : 7} className={`py-8 text-center ${safeTheme.textMuted} italic`}>
                    No expenses recorded yet. Click "Sync Sheet" to load Google Sheet data.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className={`hover:bg-gray-500/5 transition-colors`}>
                    <td className="py-3.5 pr-2 align-top whitespace-nowrap">
                      <span className="font-bold block">{t.category || 'General'}</span>
                      <span className={`text-[10px] ${safeTheme.textMuted}`}>{t.date}</span>
                    </td>
                    <td className="py-3.5 px-2 align-top">
                      <div className="font-medium">{t.description}</div>
                      {t.qty && (
                        <span className={`text-[10px] ${safeTheme.textMuted}`}>
                          Qty: {t.qty} {t.unitPrice ? `@ ₹${t.unitPrice}` : ''}
                        </span>
                      )}
                    </td>
                    <td className={`py-3.5 px-2 align-top ${safeTheme.textMuted}`}>
                      {t.vendor ? <span className="font-medium">{t.vendor}</span> : <span className="italic">—</span>}
                    </td>
                    <td className="py-3.5 px-2 align-top">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 whitespace-nowrap">
                        {t.entity}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 align-top text-[11px]">
                      <div>{t.paidBy || '—'}</div>
                      {t.reimbursement === 'Yes' && (
                        <span className="text-[9px] text-amber-500 font-bold block mt-0.5 whitespace-nowrap">
                          Reimburse Needed
                        </span>
                      )}
                    </td>
                    <td className={`py-3.5 px-2 align-top text-[11px] ${safeTheme.textMuted} max-w-[160px]`}>
                      {t.notes && <div className={`truncate ${safeTheme.textStrong}`}>{t.notes}</div>}
                      {t.receipt && t.receipt !== 'No receipt' && (
                        <div className="truncate text-[10px] text-emerald-500/90 font-medium">Ref: {t.receipt}</div>
                      )}
                      {!t.notes && (!t.receipt || t.receipt === 'No receipt') && (
                        <span className="italic">—</span>
                      )}
                    </td>
                    <td className="py-3.5 pl-2 align-top text-right font-extrabold text-red-500 whitespace-nowrap text-sm">
                      -₹{Number(t.amount || 0).toLocaleString('en-IN')}
                    </td>
                    {isTreasurer && (
                      <td className="py-3.5 pl-2 align-top text-right">
                        <button 
                          onClick={() => handleDeleteTransaction(t)} 
                          title="Delete from site and clear from Google Sheet"
                          className="text-red-500 hover:bg-red-500/15 p-1.5 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
