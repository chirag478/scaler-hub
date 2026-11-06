import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const SHEET_ID = '1qnp8WpX7sLvXSMy4qj59fHDsKA0KwL6WfDcSAhtR4h8';

function parseSheetRows(rawRows) {
  const transactions = [];
  let currentCategory = 'General';

  rawRows.forEach((r, idx) => {
    const rowNum = idx + 1;
    const col0 = (r[0] || '').trim();
    const item = (r[1] || '').trim();
    const vendor = (r[2] || '').trim();
    const council = (r[3] || '').trim();
    const qty = (r[4] || '').trim();
    const unitPrice = (r[5] || '').trim();
    const amountStr = (r[6] || '').trim().replace(/,/g, '');
    const amount = parseFloat(amountStr);
    const invoice = (r[7] || '').trim();
    const paidBy = (r[8] || '').trim();
    const reimbNeeded = (r[9] || '').trim();
    const notes = (r[12] || '').trim();

    if (col0 && !item && isNaN(amount)) {
      currentCategory = col0;
      return;
    }
    if (item && (item.toLowerCase() === 'subtotal' || item.toLowerCase().includes('grand total'))) {
      return;
    }

    if (item && !isNaN(amount) && amount > 0) {
      let entityName = 'Student Council';
      if (council.toLowerCase().includes('cultural')) entityName = 'Cultural & Sports';
      else if (council.toLowerCase().includes('student body')) entityName = 'Student Council';
      else if (council) entityName = council;

      transactions.push({
        id: `sheet-${rowNum}`,
        sheetRow: rowNum,
        date: col0 || '2026-10-25',
        category: currentCategory,
        description: item,
        vendor: vendor,
        entity: entityName,
        qty: qty,
        unitPrice: unitPrice,
        amount: amount,
        receipt: invoice,
        paidBy: paidBy,
        reimbursement: reimbNeeded || 'No',
        notes: notes,
        approval_status: 'Approved',
        source: 'Google Sheet',
      });
    }
  });

  return transactions;
}

function googleSheetsSyncPlugin() {
  return {
    name: 'google-sheets-sync',
    configureServer(server) {
      // 1. Fetch live transactions from Google Sheet
      server.middlewares.use('/api/sheets/fetch', async (req, res) => {
        try {
          const { stdout } = await execAsync(`gsheets readonly read ${SHEET_ID} "'Council Spends'!A1:M90" --json`);
          const rows = JSON.parse(stdout);
          const data = parseSheetRows(rows);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, count: data.length, data }));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });

      // 2. Append new transaction to Google Sheet (supporting new Event Headers)
      server.middlewares.use('/api/sheets/append', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end();
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const tx = JSON.parse(body);
            const categoryName = (tx.category || 'Week 1 Cohort Connect').trim();

            // Read current sheet layout
            const { stdout } = await execAsync(`gsheets readonly read ${SHEET_ID} "'Council Spends'!A1:M90" --json`);
            const rawRows = JSON.parse(stdout);

            let targetRow = null;

            // Step A: Check if categoryName already exists in Column A
            let categoryRowIndex = -1;
            for (let i = 0; i < rawRows.length; i++) {
              const r = rawRows[i];
              if (r && r[0] && r[0].trim().toLowerCase() === categoryName.toLowerCase()) {
                categoryRowIndex = i;
                break;
              }
            }

            if (categoryRowIndex !== -1) {
              // Found existing event header section! Look for the first blank row under it
              for (let i = categoryRowIndex + 1; i < rawRows.length; i++) {
                const r = rawRows[i];
                if (r && r[1] && r[1].toLowerCase().includes('subtotal')) {
                  // No empty row before subtotal: insert a new row right above subtotal
                  await execAsync(`gsheets mutate insert-rows ${SHEET_ID} --range "'Council Spends'!${i + 1}:${i + 1}"`);
                  targetRow = i + 1;
                  break;
                }
                const isEmpty = !r || r.length === 0 || r.every(cell => !cell || cell.trim() === '');
                if (isEmpty) {
                  targetRow = i + 1;
                  break;
                }
              }
            } else {
              // Step B: New Event Header! Check if a template placeholder like "New event 1" or "New event" exists
              let placeholderRow = -1;
              for (let i = 0; i < rawRows.length; i++) {
                const r = rawRows[i];
                if (r && r[0] && (r[0].trim().toLowerCase().startsWith('new event'))) {
                  placeholderRow = i + 1;
                  break;
                }
              }

              if (placeholderRow !== -1) {
                // Rename placeholder row Column A to the brand new event header name!
                await execAsync(`gsheets mutate write ${SHEET_ID} "'Council Spends'!A${placeholderRow}" "${categoryName.replace(/,/g, '\\,')}"`);
                targetRow = placeholderRow + 1; // Write the expense in the first row under it
              } else {
                // Find Grand Total row index and insert new event header + expense row above it
                let grandTotalRow = 85;
                for (let i = 0; i < rawRows.length; i++) {
                  const r = rawRows[i];
                  if (r && r[1] && r[1].toLowerCase().includes('grand total')) {
                    grandTotalRow = i + 1;
                    break;
                  }
                }
                await execAsync(`gsheets mutate insert-rows ${SHEET_ID} --range "'Council Spends'!${grandTotalRow}:${grandTotalRow}" --count 2`);
                await execAsync(`gsheets mutate write ${SHEET_ID} "'Council Spends'!A${grandTotalRow}" "${categoryName.replace(/,/g, '\\,')}"`);
                targetRow = grandTotalRow + 1;
              }
            }

            if (!targetRow) targetRow = 80;

            // Prepare CSV escaped values matching sheet columns
            const clean = (val) => String(val || '').replace(/,/g, '\\,').trim();
            const dateVal = clean(tx.date || new Date().toISOString().split('T')[0]);
            const itemVal = clean(tx.description);
            const vendorVal = clean(tx.vendor);
            const councilVal = clean(tx.entity || 'Student Council');
            const qtyVal = clean(tx.qty);
            const unitPriceVal = clean(tx.unitPrice);
            const amountVal = clean(tx.amount);
            const invoiceVal = clean(tx.receipt);
            const paidByVal = clean(tx.paidBy);
            const reimbNeededVal = clean(tx.reimbursement || 'No');
            const reimbAmtVal = tx.reimbursement === 'Yes' ? amountVal : '';
            const reimbursedVal = 'No';
            const notesVal = clean(tx.notes);

            const rowCsv = `${dateVal},${itemVal},${vendorVal},${councilVal},${qtyVal},${unitPriceVal},${amountVal},${invoiceVal},${paidByVal},${reimbNeededVal},${reimbAmtVal},${reimbursedVal},${notesVal}`;
            
            await execAsync(`gsheets mutate write ${SHEET_ID} "'Council Spends'!A${targetRow}:M${targetRow}" "${rowCsv}"`);

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              success: true, 
              sheetRow: targetRow, 
              eventHeader: categoryName,
              message: `Saved to Google Sheet row ${targetRow} under "${categoryName}"` 
            }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      });

      // 3. Remove / Clear transaction from Google Sheet
      server.middlewares.use('/api/sheets/delete', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end();
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const { sheetRow, description } = JSON.parse(body);
            let targetRow = sheetRow;

            // If sheetRow not explicitly known, search for the row matching description
            if (!targetRow) {
              const { stdout } = await execAsync(`gsheets readonly read ${SHEET_ID} "'Council Spends'!A1:M90" --json`);
              const rawRows = JSON.parse(stdout);
              for (let i = 0; i < rawRows.length; i++) {
                const r = rawRows[i];
                if (r && r[1] && r[1].trim() === String(description).trim()) {
                  targetRow = i + 1;
                  break;
                }
              }
            }

            if (targetRow) {
              await execAsync(`gsheets mutate clear ${SHEET_ID} "'Council Spends'!A${targetRow}:M${targetRow}"`);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: `Cleared row ${targetRow} in Google Sheet` }));
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Item removed locally' }));
            }
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), googleSheetsSyncPlugin()],
});
