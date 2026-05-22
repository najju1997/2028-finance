// ═══════════════════════════════════════════════════════════════
// CASHFLOW TRACKER MODULE v3 — full reconciliation, no double-counting
// ═══════════════════════════════════════════════════════════════
// RECONCILIATION LOGIC (priority order):
//
// 1. StepPay loan settlements:
//    Card purchase (-$X SHOP on StepPay card)  → REAL EXPENSE (categorised by merchant)
//    StepPay Repayment (-$X from Everyday)     → INTERNAL TRANSFER (not counted)
//    STEPPAY PYMT credit (+$X on StepPay card) → INTERNAL TRANSFER (auto-hidden, not counted)
//    Repayment ↔ PYMT credit matched by amount + ≤14 days. If unmatched, repayment
//    remains as BNPL expense (fallback) so totals stay accurate.
//
// 2. Internal transfers between user's own accounts:
//    Matched by: same magnitude, opposite signs, different accounts, ≤5 days apart,
//    both already categorised as Transfers. Both legs excluded from totals.
//
// 3. Unmatched transfers appear as "External Inflow" / "External Outflow" — never
//    silently dropped, user can verify.
// ═══════════════════════════════════════════════════════════════

const CATS = {
  'Income':         {color:'#22c55e', icon:'💰', kind:'income'},
  'Transfers':      {color:'#6b7280', icon:'🔄', kind:'transfer'},
  'Groceries':      {color:'#4ade80', icon:'🛒', kind:'expense'},
  'Eating Out':     {color:'#fb923c', icon:'🍔', kind:'expense'},
  'Transport/Fuel': {color:'#60a5fa', icon:'⛽', kind:'expense'},
  'Utilities':      {color:'#a78bfa', icon:'💡', kind:'expense'},
  'Rent/Housing':   {color:'#f472b6', icon:'🏠', kind:'expense'},
  'Insurance':      {color:'#06b6d4', icon:'🛡️', kind:'expense'},
  'Education':      {color:'#eab308', icon:'🎓', kind:'expense'},
  'Healthcare':     {color:'#34d399', icon:'💊', kind:'expense'},
  'Shopping':       {color:'#facc15', icon:'🛍️', kind:'expense'},
  'Entertainment':  {color:'#818cf8', icon:'🎮', kind:'expense'},
  'Tech':           {color:'#22d3ee', icon:'💻', kind:'expense'},
  'BNPL/StepPay':   {color:'#f87171', icon:'📱', kind:'expense'},
  'Other':          {color:'#94a3b8', icon:'💸', kind:'expense'},
};

const EXPENSE_CATS = Object.keys(CATS).filter(c => CATS[c].kind === 'expense');

const AUTO_RULES = [
  {k:['SALARY ','LUXOTTICA RETAIL','ESSILOR AUSTRAL','PAYROLL','WAGES ','DIRECT CREDIT','INTEREST PAID','BONUS '], cat:'Income'},
  {k:['TRANSFER TO','TRANSFER FROM','FAST TRANSFER FROM','FAST TRANSFER TO','TO U PRAJAPATI','TO UJJAN','FROM SALONI','FROM SHRAMIKA','FROM PRAJAPATI','TO SALONI','BPAY BILLER REFUND','OSKO PAYMENT','PAYID '], cat:'Transfers'},
  {k:['STEPPAY REPAYMENT','STEPPAY PYMT','AFTERPAY ','AFTERPAY.','ZIP PAY','KLARNA','HUMM ','LATITUDE PAY','BRIGHTE'], cat:'BNPL/StepPay'},
  {k:['NIB HEALTH','MEDIBANK','BUPA ','AAMI ','ALLIANZ','BUDGET DIRECT','NRMA','SUNCORP','YOUI ','REAL INSURANCE','HCF ','AHM HEALTH','FRANK HEALTH','GIO ','QBE ','TIO ','INSURANCE','LIFE INS','HEALTH INS','CAR INS'], cat:'Insurance'},
  {k:['TAFE','CHILDCARE','DAY CARE','DAYCARE','KINDY','KINDERGARTEN','SCHOOL FEE','TUITION','COURSE','COLLEGE','UNIVERSITY','EDUCATION','PRIMARY SCHOOL','HIGH SCHOOL','GOODSTART','TG EARLY LEARNING'], cat:'Education'},
  {k:['WOOLWORTHS','WW METRO','WW ','COLES ','ALDI STORES','ALDI ','IGA ','COSTCO','MOONLIGHT BAZAAR','MOONLIGHT BUTCHERY','MOONLIGHT GROCERY','SAJILO NEPALESE','SAJILO ','LEKALI MEATS','ABRAHIM AL TAEI','HARRIS FARM','FOODWORKS','FRUIT MARKET','BUTCHERY','GROCER','WESTMEAD CONVENIENCE'], cat:'Groceries'},
  {k:['KFC ','MCDONALD','HUNGRY JACK','HJS ','HJ\'S ','HJS GRANVILLE','HJS NORTHMEAD','HJS WENTWORTHVILLE','NANDO','SUBWAY ','DOMINO','PIZZA','BAKERY','CAFE ','COFFEE ','RESTAURANT','UBER EATS','MENULOG','DOORDASH','CHATIME','GONG CHA','GUZMAN','RED ROOSTER','CHICKEN ','OPORTO','HJs ','MCDONALDS','BARBER','ZLR*WESTMEAD'], cat:'Eating Out'},
  {k:['APEX VILLAWOOD','SPEEDWAY','CALTEX','SHELL ','7-ELEVEN','7ELEVEN','AMPOL','LIBERTY ','PETROL','BP ','METRO PETROL','PUMA ENERGY','UBER TRIP','UBER *','OPAL ','TRANSPORTFORNSW','SIXT ','BUDGET RENT','HERTZ','TRANSURBAN','LINKT','REGO ','PARKING ','TOLL ','SERVICE NSW'], cat:'Transport/Fuel'},
  {k:['DODO ','DODO SERVICE','DODO POWER','AGL ','ORIGIN ENERGY','SYDNEY WATER','AUSGRID','OPTUS ','TELSTRA','VODAFONE','IINET','TPG ','NBN ','ENERGY AUST','RED ENERGY','ENGIE ','ALINTA ','SUMO ','POWERSHOP','SIMPLY ENERGY','LYCAMOBILE','BELONG ','AMAYSIM','BOOST MOBILE','KOGAN MOBILE'], cat:'Utilities'},
  {k:['DEFT PAYMENTS','DEFT PAYMENT','RENT PAYMENT','REA GROUP','REALESTATE.COM','BODY CORP','STRATA '], cat:'Rent/Housing'},
  {k:['KMART ','TARGET ','BIG W','MYER ','DAVID JONES','COTTON ON','AMAZON','EBAY ','BEST & LESS','BUNNINGS','OFFICEWORKS','JB HI-FI','HARVEY NORMAN','THE GOOD GUYS','IKEA ','SUPERCHEAP','TEMU','SHEIN '], cat:'Shopping'},
  {k:['PHARMACY','CHEMIST','MEDICAL CENTRE','DOCTOR ','DENTAL','HOSPITAL','MEDICARE','CHEMIST WAREHOUSE','PRICELINE','TERRY WHITE','SONIC HEALTH','PATHOLOGY','OPTOMETRIST','OPSM','SPECSAVERS'], cat:'Healthcare'},
  {k:['NETFLIX','SPOTIFY','STAN ','DISNEY','YOUTUBE','STEAM ','HOYTS','EVENT CINEMA','VILLAGE CINEMA','AMAZON PRIME','APPLE.COM/BILL','APPLE PAY','PLAYSTATION','XBOX ','NINTENDO','TWITCH','GAME '], cat:'Entertainment'},
  {k:['DIGITALOCEAN','CLOUDFLARE','AWS ','GOOGLE CLOUD','AZURE ','GITHUB ','VERCEL','LINODE','NAMECHEAP','GODADDY','OPENAI','ANTHROPIC','CURSOR.AI','HEROKU','NETLIFY','SUPABASE'], cat:'Tech'},
];

function autoCategory(desc) {
  const d = (desc || '').toUpperCase();
  for (const rule of AUTO_RULES) {
    if (rule.k.some(k => d.includes(k.toUpperCase().trim()))) return rule.cat;
  }
  return 'Other';
}

function hashTxn(date, amount, desc) {
  const s = date + '|' + amount + '|' + (desc || '').trim().slice(0, 40);
  let h = 5381;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h = h & h; }
  return Math.abs(h).toString(36);
}

function uid() { return Math.random().toString(36).slice(2, 11); }

function splitCsvLine(line) {
  const parts = []; let inQ = false, cur = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else { inQ = !inQ; } }
    else if (c === ',' && !inQ) { parts.push(cur); cur = ''; }
    else cur += c;
  }
  parts.push(cur);
  return parts;
}

function detectBank(text) {
  const first = (text.split(/\r?\n/)[0] || '').toLowerCase();
  if (first.includes('transaction date') && first.includes('debit') && first.includes('credit')) return 'macquarie';
  if (first.includes('date') && first.includes('description') && (first.includes('debit') || first.includes('credit'))) return 'westpac';
  if (/^\d{2}\/\d{2}\/\d{4}/.test(text.trim())) return 'commbank';
  return 'unknown';
}

const MONTHS = {JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12'};

function parseDate(s) {
  s = (s || '').trim();
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (m) { const mo = MONTHS[m[2].toUpperCase()]; if (mo) return m[3]+'-'+mo+'-'+m[1].padStart(2,'0'); }
  return null;
}

function parseCommBankCSV(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/).filter(l => l.trim())) {
    const parts = splitCsvLine(line);
    if (parts.length < 3) continue;
    const date = parseDate(parts[0]);
    if (!date) continue;
    const amount = parseFloat(String(parts[1]).replace(/[^0-9.\-]/g, ''));
    if (isNaN(amount)) continue;
    rows.push({ date, amount, description:(parts[2]||'').trim(), balance:(parts[3]||'').trim() });
  }
  return rows;
}

function parseMacquarieCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const header = splitCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const col = name => header.indexOf(name);
  const iDate=col('transaction date'),iDetails=col('details'),iAcct=col('account'),
        iCat=col('category'),iSub=col('subcategory'),iDebit=col('debit'),iCredit=col('credit'),
        iBal=col('balance'),iOrig=col('original description');
  const rows = [];
  for (let li = 1; li < lines.length; li++) {
    const parts = splitCsvLine(lines[li]);
    const date = parseDate(parts[iDate]);
    if (!date) continue;
    const debit = parseFloat(String(parts[iDebit]||'').replace(/[^0-9.]/g,''))||0;
    const credit = parseFloat(String(parts[iCredit]||'').replace(/[^0-9.]/g,''))||0;
    const amount = credit - debit;
    if (amount === 0 && !debit && !credit) continue;
    const details=(parts[iDetails]||'').trim(); const origDesc=(parts[iOrig]||'').trim();
    const description = details||origDesc;
    const acct=(parts[iAcct]||'').trim()||'Macquarie';
    const mqCat=(parts[iCat]||'').trim().toLowerCase(); const mqSub=(parts[iSub]||'').trim().toLowerCase();
    let preCat = null;
    if (mqSub === 'transfers' || mqCat === 'financial') preCat = 'Transfers';
    else if (mqCat === 'income') preCat = 'Income';
    rows.push({ date, amount, description, balance:(parts[iBal]||'').trim(), account:acct, preCat });
  }
  return rows;
}

// Account detection — recognises StepPay card
function detectAccount(rows, bank) {
  if (bank === 'macquarie') {
    const counts = {};
    rows.forEach(r => { if (r.account) counts[r.account] = (counts[r.account]||0)+1; });
    const top = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
    return top ? top[0] : 'Macquarie';
  }
  const joined = rows.map(r => r.description || '').join('\n').toUpperCase();
  if (joined.includes('DEFT PAYMENT')) return 'Rent Account';
  if (joined.includes('LUXOTTICA') || joined.includes('ESSILOR')) return 'Salary Account';
  const emptyBal = rows.filter(r => !r.balance || r.balance.trim() === '').length;
  const hasSteppayPymt = joined.includes('STEPPAY PYMT');
  if (emptyBal > rows.length * 0.7 && hasSteppayPymt) return 'StepPay';
  if (emptyBal > rows.length * 0.7) return 'Credit Card';
  return 'Everyday Account';
}

function isAutoHide(desc) { return (desc || '').toUpperCase().includes('STEPPAY PYMT'); }

function catKind(cat) { return (CATS[cat] || {}).kind || 'expense'; }
function isReconciled(t, rec) { return rec && rec.has(t.id); }

function effectiveKind(t, rec) {
  if (isReconciled(t, rec)) return 'transfer';
  return catKind(t.category);
}

function isExpenseTxn(t, rec) { return !t.hidden && t.amount < 0 && effectiveKind(t, rec) === 'expense'; }
function isIncomeTxn(t, rec)  { return !t.hidden && t.amount > 0 && effectiveKind(t, rec) === 'income'; }

// ── Reconciliation engine ──────────────────────────────────────
function reconcileAll(allTxns) {
  const rec = new Map();

  // Stage A: StepPay PYMT credits ↔ StepPay Repayments (description-based, hardest)
  const pymts = allTxns.filter(t => t.amount > 0 && (t.description||'').toUpperCase().includes('STEPPAY PYMT'));
  const reps = allTxns.filter(t => t.amount < 0 && (t.description||'').includes('StepPay Repayment'));
  const usedP = new Set();
  const repsSorted = [...reps].sort((a,b) => a.date.localeCompare(b.date));
  for (const rep of repsSorted) {
    let best = null, bestDelta = Infinity;
    const dRep = new Date(rep.date).getTime();
    for (const p of pymts) {
      if (usedP.has(p.id)) continue;
      if (p.account === rep.account) continue;
      if (Math.abs(p.amount - Math.abs(rep.amount)) > 0.01) continue;
      const delta = Math.abs((new Date(p.date).getTime() - dRep) / 86400000);
      if (delta > 14) continue;
      if (delta < bestDelta) { best = p; bestDelta = delta; }
    }
    if (best) {
      rec.set(rep.id, { linkedTo:best.id, type:'steppay', delta:bestDelta });
      rec.set(best.id, { linkedTo:rep.id, type:'steppay', delta:bestDelta });
      usedP.add(best.id);
    }
  }

  // Stage B: Generic internal transfers (both legs categorised as Transfers)
  const transfers = allTxns.filter(t => !rec.has(t.id) && t.category === 'Transfers');
  transfers.sort((a,b) => a.date.localeCompare(b.date));
  const usedT = new Set();
  for (const a of transfers) {
    if (usedT.has(a.id)) continue;
    let best = null, bestDelta = Infinity;
    const dA = new Date(a.date).getTime();
    for (const b of transfers) {
      if (a.id === b.id || usedT.has(b.id)) continue;
      if (a.account === b.account) continue;
      if (Math.abs(a.amount + b.amount) > 0.01) continue;
      const delta = Math.abs((new Date(b.date).getTime() - dA) / 86400000);
      if (delta > 5) continue;
      if (delta < bestDelta) { best = b; bestDelta = delta; }
    }
    if (best) {
      rec.set(a.id, { linkedTo:best.id, type:'transfer', delta:bestDelta });
      rec.set(best.id, { linkedTo:a.id, type:'transfer', delta:bestDelta });
      usedT.add(a.id); usedT.add(best.id);
    }
  }

  return rec;
}

// ═══════════════════════════════════════════════════════════════
// Transaction Context
// ═══════════════════════════════════════════════════════════════
const TxnCtx = createContext(null);

function TxnProvider({ children }) {
  const { schedulePush, hydrated } = useSync();
  const [T, setT] = useState(() => {
    try { const s = localStorage.getItem('FinancePlan_T'); if (s) return JSON.parse(s); } catch (e) {}
    return { transactions: [], budgets: {} };
  });

  useEffect(() => {
    if (!hydrated) return;
    try { const s = localStorage.getItem('FinancePlan_T'); if (s) setT(JSON.parse(s)); } catch (e) {}
  }, [hydrated]);

  useEffect(() => {
    localStorage.setItem('FinancePlan_T', JSON.stringify(T));
    schedulePush();
  }, [T, schedulePush]);

  const rec = useMemo(() => reconcileAll(T.transactions || []), [T.transactions]);

  const importTransactions = useCallback(newTxns => {
    setT(prev => {
      const ids = new Set((prev.transactions||[]).map(t => t.id));
      const added = newTxns.filter(t => !ids.has(t.id));
      return { ...prev, transactions: [...(prev.transactions||[]), ...added] };
    });
  }, []);
  const addManual = useCallback(txn => {
    setT(prev => ({ ...prev, transactions: [...(prev.transactions||[]), { ...txn, id:'m_'+uid(), manual:true }] }));
  }, []);
  const updateCategory = useCallback((id, cat) => {
    setT(prev => ({ ...prev, transactions: (prev.transactions||[]).map(t => t.id===id?{...t,category:cat,manual:true}:t) }));
  }, []);
  const bulkUpdateCategory = useCallback((ids, cat) => {
    const s = new Set(ids);
    setT(prev => ({ ...prev, transactions: (prev.transactions||[]).map(t => s.has(t.id)?{...t,category:cat,manual:true}:t) }));
  }, []);
  const bulkSetHidden = useCallback((ids, hidden) => {
    const s = new Set(ids);
    setT(prev => ({ ...prev, transactions: (prev.transactions||[]).map(t => s.has(t.id)?{...t,hidden}:t) }));
  }, []);
  const bulkDelete = useCallback(ids => {
    const s = new Set(ids);
    setT(prev => ({ ...prev, transactions: (prev.transactions||[]).filter(t => !s.has(t.id)) }));
  }, []);
  const toggleHidden = useCallback(id => {
    setT(prev => ({ ...prev, transactions: (prev.transactions||[]).map(t => t.id===id?{...t,hidden:!t.hidden}:t) }));
  }, []);
  const updateBudget = useCallback((cat, amt) => {
    setT(prev => ({ ...prev, budgets: { ...prev.budgets, [cat]:amt } }));
  }, []);
  const deleteMonth = useCallback(ym => {
    setT(prev => ({ ...prev, transactions: (prev.transactions||[]).filter(t => t.date.slice(0,7)!==ym) }));
  }, []);
  const clearAll = useCallback(() => setT({ transactions:[], budgets:{} }), []);

  return React.createElement(TxnCtx.Provider, {
    value: { T, rec, importTransactions, addManual, updateCategory, bulkUpdateCategory, bulkSetHidden, bulkDelete, toggleHidden, updateBudget, deleteMonth, clearAll }
  }, children);
}

const useTxn = () => useContext(TxnCtx);

// ═══════════════════════════════════════════════════════════════
// Upload Zone
// ═══════════════════════════════════════════════════════════════
function UploadZone({ onDone }) {
  const { T, importTransactions } = useTxn();
  const [drag, setDrag] = useState(false);
  const [previews, setPreviews] = useState([]);
  const inputRef = useRef(null);

  async function processFiles(flist) {
    const results = [];
    for (const file of [...flist]) {
      if (!file.name.toLowerCase().endsWith('.csv')) continue;
      const text = await file.text();
      const bank = detectBank(text);
      let raw, acctFromFile=null;
      if (bank === 'macquarie') { raw = parseMacquarieCSV(text); acctFromFile = detectAccount(raw,'macquarie'); }
      else { raw = parseCommBankCSV(text); acctFromFile = detectAccount(raw, bank==='commbank'?'commbank':'unknown'); }
      if (!raw.length) { results.push({fname:file.name,bank,error:'No valid rows found',txns:[],total:0,dupes:0,fresh:0,account:'-'}); continue; }
      const txns = raw.map(r => ({
        id: hashTxn(r.date, r.amount, r.description),
        date: r.date,
        amount: r.amount,
        description: r.description,
        account: r.account || acctFromFile,
        category: r.preCat || autoCategory(r.description),
        hidden: isAutoHide(r.description),
        manual: false,
        bank,
      }));
      const existIds = new Set((T.transactions||[]).map(t => t.id));
      const dupes = txns.filter(t => existIds.has(t.id)).length;
      results.push({ fname:file.name, bank, txns, account:acctFromFile, total:txns.length, dupes, fresh:txns.length-dupes });
    }
    if (results.length) setPreviews(p => [...p, ...results]);
  }
  function renameAcct(i, name) {
    setPreviews(p => p.map((f,j) => j!==i?f:{...f, account:name, txns:f.txns.map(t=>({...t,account:name}))}));
  }
  function removePrev(i) { setPreviews(p => p.filter((_,j) => j!==i)); }
  function getCatCounts(txns) {
    const acc = {};
    txns.filter(t => !t.hidden).forEach(t => { acc[t.category]=(acc[t.category]||0)+1; });
    return Object.entries(acc).sort((a,b) => b[1]-a[1]).slice(0,6);
  }
  function doImport() { importTransactions(previews.flatMap(f=>f.txns)); setPreviews([]); if(onDone) onDone(); }

  const totalFresh = previews.reduce((s,f) => s+f.fresh, 0);
  const bankLabel = {commbank:'🏦 CommBank',macquarie:'🏛 Macquarie',westpac:'🔴 Westpac',unknown:'❓ Unknown'};

  return React.createElement('div', null,
    React.createElement('div', {
      onDragOver:e=>{e.preventDefault();setDrag(true);},
      onDragLeave:()=>setDrag(false),
      onDrop:e=>{e.preventDefault();setDrag(false);processFiles(e.dataTransfer.files);},
      onClick:()=>inputRef.current&&inputRef.current.click(),
      style:{border:'2px dashed '+(drag?'var(--gold)':'var(--border2)'),borderRadius:'var(--radius)',padding:'2rem 1.5rem',textAlign:'center',cursor:'pointer',transition:'all .2s',background:drag?'rgba(212,175,55,.07)':'var(--bg2)',marginBottom:previews.length?'1rem':'0'}
    },
      React.createElement('input', {ref:inputRef,type:'file',accept:'.csv',multiple:true,style:{display:'none'},onChange:e=>processFiles(e.target.files)}),
      React.createElement('div', {style:{fontSize:'2rem',marginBottom:'.4rem'}}, drag?'📥':'📂'),
      React.createElement('div', {style:{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:'var(--t-md)',color:drag?'var(--gold)':'var(--text)',marginBottom:'.25rem'}},
        drag?'Release to upload':'Drag & drop CSVs here'),
      React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)'}}, 'CommBank · Macquarie · multi-file supported  ·  Click to browse')
    ),
    previews.length > 0 && React.createElement('div', null,
      React.createElement('div', {style:{display:'flex',flexDirection:'column',gap:'.5rem',marginBottom:'1rem'}},
        ...previews.map((f,i) => React.createElement('div', {key:i,style:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',overflow:'hidden'}},
          React.createElement('div', {style:{padding:'.7rem 1rem',display:'flex',gap:'.75rem',alignItems:'center',flexWrap:'wrap',background:'var(--surface2)'}},
            React.createElement('div', {style:{flex:1,minWidth:'120px'}},
              React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginBottom:'.15rem',wordBreak:'break-all'}}, f.fname),
              React.createElement('div', {style:{display:'flex',gap:'.4rem',flexWrap:'wrap',alignItems:'center'}},
                React.createElement('span', {style:{fontSize:'var(--t-xs)',padding:'.1rem .4rem',borderRadius:'.5rem',background:'rgba(74,158,255,.12)',color:'var(--blue)'}}, bankLabel[f.bank]||'CSV'),
                React.createElement('span', {style:{fontSize:'var(--t-sm)',fontWeight:600,color:'var(--text)'}}, f.total+' rows'),
                f.dupes > 0 && React.createElement('span', {style:{fontSize:'var(--t-xs)',color:'var(--gold)',background:'rgba(212,175,55,.1)',padding:'.1rem .4rem',borderRadius:'.5rem'}}, f.dupes+' dupes'),
                f.fresh > 0 && React.createElement('span', {style:{fontSize:'var(--t-xs)',fontWeight:700,color:'var(--green)',background:'rgba(74,222,128,.1)',padding:'.1rem .4rem',borderRadius:'.5rem'}}, '+'+f.fresh+' new'),
                f.error && React.createElement('span', {style:{fontSize:'var(--t-xs)',color:'var(--red)'}}, '⚠ '+f.error)
              )
            ),
            React.createElement('div', {className:'input-group',style:{margin:0,minWidth:'155px',flex:'1 1 155px'}},
              React.createElement('label', {className:'input-label'}, 'Account name'),
              React.createElement('input', {type:'text',className:'input-field',value:f.account||'',onChange:e=>renameAcct(i,e.target.value)})
            ),
            React.createElement('button', {onClick:()=>removePrev(i),title:'Remove',style:{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:'1rem',padding:'.25rem .4rem',flexShrink:0}}, '✕')
          ),
          React.createElement('div', {style:{padding:'.55rem 1rem',display:'flex',gap:'.3rem',flexWrap:'wrap'}},
            ...getCatCounts(f.txns).map(([cat,n]) => {
              const c = CATS[cat]||{color:'#94a3b8',icon:'•'};
              return React.createElement('span', {key:cat,style:{fontSize:'var(--t-xs)',padding:'.15rem .45rem',borderRadius:'1rem',background:c.color+'1a',color:c.color,border:'1px solid '+c.color+'44'}}, c.icon+' '+cat+' ('+n+')');
            })
          )
        ))
      ),
      React.createElement('button', {className:'btn-primary',onClick:doImport,style:{width:'100%',opacity:totalFresh===0?.5:1,cursor:totalFresh===0?'not-allowed':'pointer'}},
        totalFresh > 0 ? '✓ Import '+totalFresh+' new transaction'+(totalFresh!==1?'s':'')+' from '+previews.length+' file'+(previews.length!==1?'s':'') : 'No new transactions — all duplicates')
    )
  );
}

// ═══════════════════════════════════════════════════════════════
// Manual Add Modal
// ═══════════════════════════════════════════════════════════════
function ManualAddModal({ accounts, onClose }) {
  const { addManual } = useTxn();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [account, setAccount] = useState(accounts[0]||'Manual');
  const [category, setCategory] = useState('Other');

  function submit() {
    const amt = parseFloat(amount);
    if (isNaN(amt) || !desc.trim()) { alert('Need description and a valid amount'); return; }
    const signed = type==='income' ? Math.abs(amt) : type==='expense' ? -Math.abs(amt) : amt;
    const cat = type==='income' ? 'Income' : type==='transfer' ? 'Transfers' : category;
    addManual({ date, amount:signed, description:desc.trim(), account, category:cat, hidden:false });
    onClose();
  }

  return React.createElement('div', {onClick:onClose,style:{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}},
    React.createElement('div', {onClick:e=>e.stopPropagation(),style:{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:'var(--radius)',padding:'1.25rem',width:'100%',maxWidth:'480px',maxHeight:'90vh',overflowY:'auto'}},
      React.createElement('div', {style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}},
        React.createElement('div', {style:{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'var(--t-lg)',color:'var(--gold)'}}, '➕ Add Transaction'),
        React.createElement('button', {onClick:onClose,style:{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:'1.2rem'}}, '✕')
      ),
      React.createElement('div', {style:{display:'flex',gap:'.5rem',marginBottom:'.75rem'}},
        ...[['expense','Expense','var(--red)'],['income','Income','var(--green)'],['transfer','Transfer','var(--text3)']].map(([k,lbl,col]) =>
          React.createElement('button', {key:k,onClick:()=>setType(k),style:{flex:1,padding:'.5rem',borderRadius:'var(--radius-sm)',border:'1px solid '+(type===k?col:'var(--border)'),background:type===k?col+'22':'transparent',color:type===k?col:'var(--text2)',cursor:'pointer',fontFamily:"'Syne',sans-serif",fontWeight:600,fontSize:'var(--t-sm)'}}, lbl)
        )
      ),
      React.createElement('div', {className:'input-group',style:{marginBottom:'.6rem'}}, React.createElement('label',{className:'input-label'},'Date'), React.createElement('input',{type:'date',className:'input-field',value:date,onChange:e=>setDate(e.target.value)})),
      React.createElement('div', {className:'input-group',style:{marginBottom:'.6rem'}}, React.createElement('label',{className:'input-label'},'Description'), React.createElement('input',{type:'text',className:'input-field',value:desc,onChange:e=>setDesc(e.target.value),placeholder:'e.g. Coles Westmead'})),
      React.createElement('div', {className:'input-group',style:{marginBottom:'.6rem'}}, React.createElement('label',{className:'input-label'},'Amount (positive number)'), React.createElement('input',{type:'number',step:'0.01',className:'input-field',value:amount,onChange:e=>setAmount(e.target.value),placeholder:'0.00'})),
      React.createElement('div', {className:'input-group',style:{marginBottom:'.6rem'}}, React.createElement('label',{className:'input-label'},'Account'),
        accounts.length > 0 ? React.createElement('select',{className:'input-field',value:account,onChange:e=>setAccount(e.target.value)},
          ...accounts.map(a => React.createElement('option',{key:a,value:a},a)), React.createElement('option',{value:'Manual'},'Other / Manual')
        ) : React.createElement('input',{type:'text',className:'input-field',value:account,onChange:e=>setAccount(e.target.value)})
      ),
      type === 'expense' && React.createElement('div', {className:'input-group',style:{marginBottom:'1rem'}}, React.createElement('label',{className:'input-label'},'Category'),
        React.createElement('select',{className:'input-field',value:category,onChange:e=>setCategory(e.target.value)},
          ...EXPENSE_CATS.map(c => React.createElement('option',{key:c,value:c},CATS[c].icon+' '+c))
        )
      ),
      React.createElement('div', {style:{display:'flex',gap:'.5rem'}},
        React.createElement('button', {onClick:onClose,style:{flex:1,padding:'.6rem',background:'transparent',border:'1px solid var(--border)',color:'var(--text2)',borderRadius:'var(--radius-sm)',cursor:'pointer',fontFamily:"'Syne',sans-serif",fontWeight:600}}, 'Cancel'),
        React.createElement('button', {className:'btn-primary',onClick:submit,style:{flex:1}}, 'Add')
      )
    )
  );
}

// ═══════════════════════════════════════════════════════════════
// Summary Cards
// ═══════════════════════════════════════════════════════════════
function CfSummaryCards({ txns, rec }) {
  let income=0, expenses=0, internalCount=0, externalIn=0, externalOut=0, steppayPairs=0;
  for (const t of txns) {
    if (t.hidden) continue;
    if (isReconciled(t, rec)) {
      internalCount++;
      const info = rec.get(t.id);
      if (info && info.type === 'steppay') steppayPairs++;
      continue;
    }
    const k = catKind(t.category);
    if (k === 'income' && t.amount > 0) income += t.amount;
    else if (k === 'expense' && t.amount < 0) expenses += Math.abs(t.amount);
    else if (k === 'transfer') {
      if (t.amount > 0) externalIn += t.amount;
      else externalOut += Math.abs(t.amount);
    }
  }
  internalCount = Math.floor(internalCount / 2);
  steppayPairs = Math.floor(steppayPairs / 2);
  const transferPairs = internalCount - steppayPairs;
  const net = income - expenses;
  const savRate = income > 0 ? net/income*100 : 0;
  return React.createElement('div', {className:'stat-grid',style:{marginBottom:'1.5rem'}},
    React.createElement('div', {className:'stat-card highlight'},
      React.createElement('div', {className:'stat-label'}, 'Total Income'),
      React.createElement('div', {className:'stat-value'}, fmt(income)),
      React.createElement('div', {className:'stat-sub'}, 'Salary & wages')
    ),
    React.createElement('div', {className:'stat-card'},
      React.createElement('div', {className:'stat-label'}, 'Total Expenses'),
      React.createElement('div', {className:'stat-value',style:{color:'var(--red)'}}, fmt(expenses)),
      React.createElement('div', {className:'stat-sub'}, 'Net of reconciliation')
    ),
    React.createElement('div', {className:'stat-card'},
      React.createElement('div', {className:'stat-label'}, 'Net Cash Flow'),
      React.createElement('div', {className:'stat-value',style:{color:net>=0?'var(--green)':'var(--red)'}}, (net>=0?'+':'')+fmt(net)),
      React.createElement('div', {className:'stat-sub'}, net>=0?'✓ Positive':'⚠ Overspent')
    ),
    React.createElement('div', {className:'stat-card'},
      React.createElement('div', {className:'stat-label'}, 'Savings Rate'),
      React.createElement('div', {className:'stat-value',style:{color:savRate>=20?'var(--green)':savRate>=10?'var(--gold)':'var(--red)'}}, savRate.toFixed(1)+'%'),
      React.createElement('div', {className:'stat-sub'}, savRate>=20?'On track':savRate>=10?'Could be higher':'Below 10%')
    ),
  );
}

// ═══════════════════════════════════════════════════════════════
// Spend by Category
// ═══════════════════════════════════════════════════════════════
function SpendByCategory({ txns, rec, budgets, onDrillCategory }) {
  const catAmt = {};
  txns.filter(t => isExpenseTxn(t, rec)).forEach(t => { catAmt[t.category]=(catAmt[t.category]||0)+Math.abs(t.amount); });
  const data = Object.entries(catAmt).sort((a,b) => b[1]-a[1]).map(([cat,amt]) => ({
    cat, amt:parseFloat(amt.toFixed(2)), color:(CATS[cat]||{color:'#94a3b8'}).color, budget:budgets[cat]||0
  }));
  const total = data.reduce((s,d) => s+d.amt, 0);
  if (!data.length) return React.createElement('div', {className:'chart-card'},
    React.createElement('div', {className:'chart-title'}, 'Spending by Category'),
    React.createElement('div', {style:{color:'var(--text3)',textAlign:'center',padding:'2rem',fontSize:'var(--t-sm)'}}, 'No expenses for this month')
  );
  return React.createElement('div', {className:'chart-card'},
    React.createElement('div', {style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.5rem',flexWrap:'wrap',gap:'.5rem'}},
      React.createElement('div', {className:'chart-title',style:{margin:0}}, 'Spending by Category'),
      React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)'}}, '👆 Double-click a bar to see those transactions')
    ),
    React.createElement(ResponsiveContainer, {width:'100%',height:Math.max(220, data.length*44)},
      React.createElement(BarChart, {data,layout:'vertical',margin:{top:0,right:70,left:8,bottom:0}},
        React.createElement(XAxis, {type:'number',tickFormatter:v=>'$'+(v>=1000?(v/1000).toFixed(1)+'k':v.toFixed(0)),tick:{fill:'#fff',fontSize:11},tickLine:false,axisLine:false}),
        React.createElement(YAxis, {type:'category',dataKey:'cat',tick:{fill:'#fff',fontSize:12,fontWeight:600},tickLine:false,axisLine:false,width:115}),
        React.createElement(CartesianGrid, {strokeDasharray:'3 3',stroke:'var(--border)',horizontal:false}),
        React.createElement(Tooltip, {formatter:(v)=>['$'+v.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2})+'  ('+(total>0?(v/total*100).toFixed(1):0)+'%)','Spent'],contentStyle:{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',fontSize:'var(--t-xs)',color:'#fff'},itemStyle:{color:'#fff'},labelStyle:{color:'#fff',fontWeight:700}}),
        React.createElement(Bar, {dataKey:'amt',name:'Spent',radius:[0,4,4,0],onDoubleClick:(d)=>{if(onDrillCategory&&d&&d.cat) onDrillCategory(d.cat);},style:{cursor:'pointer'}},
          ...data.map((d,i) => React.createElement(Cell, {key:i,fill:d.color}))
        )
      )
    ),
    React.createElement('div', {style:{display:'flex',justifyContent:'flex-end',paddingTop:'.5rem',borderTop:'1px solid var(--border)',marginTop:'.5rem'}},
      React.createElement('span', {style:{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:'var(--t-sm)',color:'#fff'}}, 'Total: '+fmt(total))
    )
  );
}

// ═══════════════════════════════════════════════════════════════
// Month Trend
// ═══════════════════════════════════════════════════════════════
function MonthTrend({ allTxns, rec }) {
  const months = [...new Set(allTxns.map(t => t.date.slice(0,7)))].sort();
  if (months.length < 2) return null;
  const data = months.map(ym => {
    const txns = allTxns.filter(t => t.date.slice(0,7) === ym);
    const income = txns.filter(t => isIncomeTxn(t,rec)).reduce((s,t)=>s+t.amount,0);
    const expenses = txns.filter(t => isExpenseTxn(t,rec)).reduce((s,t)=>s+Math.abs(t.amount),0);
    return {month:new Date(ym+'-01').toLocaleDateString('en-AU',{month:'short',year:'2-digit'}),income:Math.round(income),expenses:Math.round(expenses),net:Math.round(income-expenses)};
  });
  return React.createElement('div', {className:'chart-card'},
    React.createElement('div', {className:'chart-title'}, 'Month-over-Month Trend'),
    React.createElement(ResponsiveContainer, {width:'100%',height:230},
      React.createElement(LineChart, {data,margin:{top:8,right:16,bottom:0,left:8}},
        React.createElement(CartesianGrid, {strokeDasharray:'3 3',stroke:'var(--border)'}),
        React.createElement(XAxis, {dataKey:'month',tick:{fill:'#fff',fontSize:11},tickLine:false}),
        React.createElement(YAxis, {tickFormatter:v=>'$'+(Math.abs(v)/1000).toFixed(1)+'k',tick:{fill:'#fff',fontSize:11},tickLine:false,axisLine:false}),
        React.createElement(Tooltip, {formatter:(v,n)=>[fmt(v),n],contentStyle:{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',fontSize:'var(--t-xs)',color:'#fff'},itemStyle:{color:'#fff'},labelStyle:{color:'#fff'}}),
        React.createElement(ReferenceLine, {y:0,stroke:'#fff',strokeDasharray:'4 2'}),
        React.createElement(Line, {type:'monotone',dataKey:'income',name:'Income',stroke:'var(--green)',strokeWidth:2.5,dot:{r:4,fill:'var(--green)'}}),
        React.createElement(Line, {type:'monotone',dataKey:'expenses',name:'Expenses',stroke:'var(--red)',strokeWidth:2.5,dot:{r:4,fill:'var(--red)'}}),
        React.createElement(Line, {type:'monotone',dataKey:'net',name:'Net',stroke:'var(--gold)',strokeWidth:2,strokeDasharray:'5 3',dot:{r:3,fill:'var(--gold)'}}),
        React.createElement(Legend, {wrapperStyle:{fontSize:'var(--t-xs)',color:'#fff'}})
      )
    )
  );
}

// ═══════════════════════════════════════════════════════════════
// AI Insights
// ═══════════════════════════════════════════════════════════════
function InsightsPanel({ txns, rec, selectedMonth }) {
  const [ins, setIns] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  useEffect(() => { setIns(null); setErr(null); }, [selectedMonth]);
  async function generate() {
    setLoading(true); setErr(null);
    const catAmt = {};
    txns.filter(t=>isExpenseTxn(t,rec)).forEach(t => { catAmt[t.category]=(catAmt[t.category]||0)+Math.abs(t.amount); });
    const income = txns.filter(t=>isIncomeTxn(t,rec)).reduce((s,t)=>s+t.amount,0);
    const expenses = Object.values(catAmt).reduce((s,v)=>s+v,0);
    const net = income - expenses;
    const savRate = income > 0 ? net/income*100 : 0;
    const merchantAmt = {};
    txns.filter(t=>isExpenseTxn(t,rec)).forEach(t => {
      const m = t.description.trim().replace(/\s+/g,' ').slice(0,30);
      merchantAmt[m] = (merchantAmt[m]||0) + Math.abs(t.amount);
    });
    const summary = {month:selectedMonth,income:parseFloat(income.toFixed(2)),expenses:parseFloat(expenses.toFixed(2)),net:parseFloat(net.toFixed(2)),savingsRatePct:parseFloat(savRate.toFixed(1)),categories:Object.entries(catAmt).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>({cat,amt:parseFloat(amt.toFixed(2)),pct:parseFloat((amt/expenses*100).toFixed(1))})),topMerchants:Object.entries(merchantAmt).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([m,a])=>({merchant:m,total:parseFloat(a.toFixed(2))})),accounts:[...new Set(txns.map(t=>t.account))],context:'Australian family in Western Sydney. Renting. Child (Uziel). Visa pathway to PR.'};
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:'You are a sharp personal finance analyst for an Australian household. Return ONLY a valid JSON object — no markdown fences, no text outside the JSON.',messages:[{role:'user',content:'Analyse this monthly cashflow and return EXACTLY this JSON (fill with real numbers and specifics):\n{"headline":"punchy 1-sentence summary with a key $ number (max 14 words)","insights":[{"type":"positive","icon":"✅","title":"short title","body":"1-2 sentences with specific amounts"},{"type":"warning","icon":"⚠️","title":"short title","body":"1-2 sentences with specific amounts"},{"type":"tip","icon":"💡","title":"actionable tip","body":"concrete and specific 1-2 sentences"}],"recommendation":"single most impactful action for next month (1 sentence)"}\n\nData: '+JSON.stringify(summary)}]})});
      if (!res.ok) throw new Error('API '+res.status);
      const data = await res.json();
      const raw = (data.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('').trim();
      setIns(JSON.parse(raw.replace(/^```json\s*/i,'').replace(/```\s*$/,'').trim()));
    } catch (e) { setErr('Could not generate insights: '+e.message); } finally { setLoading(false); }
  }
  const typeColor = {positive:'var(--green)',warning:'var(--gold)',tip:'var(--blue)'};
  return React.createElement('div', {className:'chart-card'},
    React.createElement('div', {style:{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'.5rem',marginBottom:ins?'1rem':0}},
      React.createElement('div', {className:'chart-title',style:{margin:0}}, '🤖 AI Financial Insights'),
      React.createElement('button', {onClick:generate,disabled:loading,style:{background:'var(--gold)',color:'#0b0e14',border:'none',borderRadius:'var(--radius-sm)',padding:'.4rem 1rem',fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:'var(--t-xs)',cursor:loading?'wait':'pointer',opacity:loading?.7:1}}, loading?'⏳ Analysing…':ins?'🔄 Regenerate':'✨ Generate Insights')
    ),
    err && React.createElement('div', {style:{marginTop:'.75rem',color:'var(--red)',fontSize:'var(--t-xs)',padding:'.6rem .9rem',background:'rgba(224,85,85,.08)',borderRadius:'var(--radius-sm)'}}, err),
    !ins && !loading && !err && React.createElement('div', {style:{color:'var(--text3)',fontSize:'var(--t-sm)',padding:'.75rem 0'}}, 'Click Generate for AI-powered analysis of your '+selectedMonth+' spending.'),
    ins && React.createElement('div', null,
      React.createElement('div', {style:{padding:'.75rem 1rem',background:'var(--bg2)',borderRadius:'var(--radius-sm)',borderLeft:'3px solid var(--gold)',marginBottom:'1rem',fontSize:'var(--t-md)',fontWeight:600,lineHeight:1.4}}, ins.headline),
      React.createElement('div', {style:{display:'flex',flexDirection:'column',gap:'.5rem',marginBottom:'.75rem'}},
        ...(ins.insights||[]).map((item,idx) => React.createElement('div', {key:idx,style:{padding:'.6rem .9rem',borderRadius:'var(--radius-sm)',background:(typeColor[item.type]||'#94a3b8')+'12',border:'1px solid '+(typeColor[item.type]||'#94a3b8')+'30',display:'flex',gap:'.65rem',alignItems:'flex-start'}},
          React.createElement('span', {style:{fontSize:'1.1em',flexShrink:0,marginTop:'.1rem'}}, item.icon),
          React.createElement('div', null,
            React.createElement('div', {style:{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:'var(--t-sm)',color:typeColor[item.type]||'var(--text2)',marginBottom:'.1rem'}}, item.title),
            React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text2)',lineHeight:1.55}}, item.body)
          )
        ))
      ),
      React.createElement('div', {style:{padding:'.6rem .9rem',borderRadius:'var(--radius-sm)',background:'rgba(74,158,255,.08)',border:'1px solid rgba(74,158,255,.28)',display:'flex',gap:'.6rem',alignItems:'flex-start'}},
        React.createElement('span', {style:{fontSize:'1em',flexShrink:0}}, '🎯'),
        React.createElement('div', null,
          React.createElement('div', {style:{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:'var(--t-xs)',color:'var(--blue)',marginBottom:'.1rem',textTransform:'uppercase',letterSpacing:'.05em'}}, 'Next Month'),
          React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text2)',lineHeight:1.55}}, ins.recommendation)
        )
      )
    )
  );
}

// ═══════════════════════════════════════════════════════════════
// Transaction Table
// ═══════════════════════════════════════════════════════════════
function TransactionTable({ txns, rec, filterCat, setFilterCat, allTxnsForAcct }) {
  const { updateCategory, toggleHidden, bulkUpdateCategory, bulkSetHidden, bulkDelete } = useTxn();
  const [showHidden, setShowHidden] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAcct, setFilterAcct] = useState('All');
  const [filterKind, setFilterKind] = useState('All');
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState(() => new Set());
  const [showAdd, setShowAdd] = useState(false);

  const accounts = useMemo(() => ['All', ...new Set((allTxnsForAcct||txns).map(t => t.account))], [allTxnsForAcct, txns]);

  const filtered = useMemo(() => {
    let list = txns.filter(t => showHidden || !t.hidden)
      .filter(t => filterCat==='All' || t.category===filterCat)
      .filter(t => filterAcct==='All' || t.account===filterAcct)
      .filter(t => filterKind==='All' || effectiveKind(t,rec)===filterKind)
      .filter(t => !search || t.description.toLowerCase().includes(search.toLowerCase()));
    list.sort((a,b) => {
      const va = sortCol==='amount' ? Math.abs(a.amount) : a[sortCol]||'';
      const vb = sortCol==='amount' ? Math.abs(b.amount) : b[sortCol]||'';
      const cmp = va<vb?-1:va>vb?1:0; return sortDir==='asc'?cmp:-cmp;
    });
    return list;
  }, [txns,rec,showHidden,filterCat,filterAcct,filterKind,search,sortCol,sortDir]);

  useEffect(() => { const ids = new Set(filtered.map(t=>t.id)); setSelected(prev => new Set([...prev].filter(id => ids.has(id)))); }, [filtered.map(t=>t.id).join(',')]);

  function toggleSort(col) { if (sortCol===col) setSortDir(d=>d==='asc'?'desc':'asc'); else { setSortCol(col); setSortDir('desc'); } }
  function toggleSel(id) { setSelected(prev => { const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s; }); }
  function toggleAll() { if (selected.size===filtered.length && filtered.length>0) setSelected(new Set()); else setSelected(new Set(filtered.map(t=>t.id))); }
  function bulkChangeCat(cat) { bulkUpdateCategory([...selected],cat); setSelected(new Set()); }
  function bulkHide(hide) { bulkSetHidden([...selected],hide); setSelected(new Set()); }
  function bulkDel() { if (!confirm('Delete '+selected.size+' transactions? Cannot be undone.')) return; bulkDelete([...selected]); setSelected(new Set()); }

  const STh = ({col,label,align,width}) => React.createElement('th', {onClick:()=>toggleSort(col),style:{cursor:'pointer',userSelect:'none',color:sortCol===col?'var(--gold)':'var(--text2)',textAlign:align||'right',whiteSpace:'nowrap',width:width||'auto'}}, label+(sortCol===col?(sortDir==='asc'?' ↑':' ↓'):''));

  const expTotal = filtered.filter(t=>isExpenseTxn(t,rec)).reduce((s,t)=>s+Math.abs(t.amount),0);
  const incTotal = filtered.filter(t=>isIncomeTxn(t,rec)).reduce((s,t)=>s+t.amount,0);
  const accountList = useMemo(() => [...new Set((allTxnsForAcct||txns).map(t=>t.account))], [allTxnsForAcct,txns]);

  return React.createElement('div', null,
    React.createElement('div', {style:{display:'flex',gap:'.6rem',flexWrap:'wrap',marginBottom:'.75rem',alignItems:'center'}},
      React.createElement('button', {onClick:()=>setShowAdd(true),style:{background:'var(--gold)',color:'#0b0e14',border:'none',padding:'.4rem .9rem',borderRadius:'var(--radius-sm)',fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:'var(--t-xs)',cursor:'pointer',whiteSpace:'nowrap'}}, '➕ Add'),
      React.createElement('input', {type:'text',className:'input-field',placeholder:'🔍 Search…',value:search,onChange:e=>setSearch(e.target.value),style:{flex:'1 1 140px',minWidth:'120px'}}),
      React.createElement('select', {className:'input-field',style:{flex:'0 1 120px',minWidth:'110px'},value:filterKind,onChange:e=>setFilterKind(e.target.value)},
        React.createElement('option', {value:'All'}, 'All types'),
        React.createElement('option', {value:'income'}, '💰 Income'),
        React.createElement('option', {value:'expense'}, '💸 Expenses'),
        React.createElement('option', {value:'transfer'}, '🔄 Transfers'),
      ),
      React.createElement('select', {className:'input-field',style:{flex:'0 1 150px',minWidth:'130px'},value:filterCat,onChange:e=>setFilterCat(e.target.value)},
        React.createElement('option', {value:'All'}, 'All categories'),
        ...Object.keys(CATS).map(c => React.createElement('option',{key:c,value:c},CATS[c].icon+' '+c))
      ),
      React.createElement('select', {className:'input-field',style:{flex:'0 1 150px',minWidth:'130px'},value:filterAcct,onChange:e=>setFilterAcct(e.target.value)},
        ...accounts.map(a => React.createElement('option',{key:a,value:a},a==='All'?'All accounts':a))
      ),
      React.createElement('label', {style:{display:'flex',alignItems:'center',gap:'.35rem',fontSize:'var(--t-xs)',color:'var(--text2)',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}},
        React.createElement('input', {type:'checkbox',checked:showHidden,onChange:e=>setShowHidden(e.target.checked)}), 'Show hidden'
      )
    ),
    selected.size > 0 && React.createElement('div', {style:{display:'flex',gap:'.5rem',flexWrap:'wrap',alignItems:'center',padding:'.55rem .8rem',background:'rgba(212,175,55,.1)',border:'1px solid var(--gold-dim)',borderRadius:'var(--radius-sm)',marginBottom:'.5rem'}},
      React.createElement('span', {style:{fontSize:'var(--t-sm)',fontWeight:700,color:'var(--gold)'}}, selected.size+' selected'),
      React.createElement('select', {style:{background:'var(--surface)',color:'var(--text)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',padding:'.25rem .5rem',fontSize:'var(--t-xs)',cursor:'pointer'},onChange:e=>{if(e.target.value){bulkChangeCat(e.target.value);e.target.value='';}}, defaultValue:''},
        React.createElement('option', {value:'',disabled:true}, '↳ Change category…'),
        ...Object.keys(CATS).map(c => React.createElement('option',{key:c,value:c},CATS[c].icon+' '+c))
      ),
      React.createElement('button', {onClick:()=>bulkHide(true),style:{background:'transparent',border:'1px solid var(--border2)',color:'var(--text2)',padding:'.25rem .6rem',borderRadius:'var(--radius-sm)',cursor:'pointer',fontSize:'var(--t-xs)'}}, '🙈 Hide'),
      React.createElement('button', {onClick:()=>bulkHide(false),style:{background:'transparent',border:'1px solid var(--border2)',color:'var(--text2)',padding:'.25rem .6rem',borderRadius:'var(--radius-sm)',cursor:'pointer',fontSize:'var(--t-xs)'}}, '👁 Unhide'),
      React.createElement('button', {onClick:bulkDel,style:{background:'rgba(224,85,85,.15)',border:'1px solid var(--red)',color:'var(--red)',padding:'.25rem .6rem',borderRadius:'var(--radius-sm)',cursor:'pointer',fontSize:'var(--t-xs)'}}, '🗑 Delete'),
      React.createElement('button', {onClick:()=>setSelected(new Set()),style:{marginLeft:'auto',background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:'var(--t-xs)'}}, 'Clear')
    ),
    React.createElement('div', {style:{display:'flex',gap:'1rem',marginBottom:'.6rem',fontSize:'var(--t-xs)',color:'var(--text3)',flexWrap:'wrap'}},
      React.createElement('span', null, filtered.length+' rows'),
      expTotal > 0 && React.createElement('span', {style:{color:'var(--red)'}}, 'Expenses: '+fmt(expTotal)),
      incTotal > 0 && React.createElement('span', {style:{color:'var(--green)'}}, 'Income: '+fmt(incTotal)),
      filterCat !== 'All' && React.createElement('button', {onClick:()=>setFilterCat('All'),style:{background:'rgba(74,158,255,.1)',border:'1px solid var(--blue)',color:'var(--blue)',padding:'.1rem .5rem',borderRadius:'.5rem',fontSize:'var(--t-xs)',cursor:'pointer'}}, '× Clear category filter: '+filterCat),
    ),
    React.createElement('div', {className:'table-wrap cf-table-wrap'},
      React.createElement('table', {className:'data-table cf-table'},
        React.createElement('thead', null, React.createElement('tr', null,
          React.createElement('th', {className:'cf-col-sel',style:{textAlign:'center',width:'34px'}}, React.createElement('input', {type:'checkbox',checked:filtered.length>0 && selected.size===filtered.length,onChange:toggleAll,title:'Select all visible'})),
          React.createElement(STh, {col:'date',label:'Date',align:'left',width:'90px'}),
          React.createElement(STh, {col:'description',label:'Description',align:'left'}),
          React.createElement('th', {className:'cf-col-acct',style:{textAlign:'left',width:'120px'}}, 'Account'),
          React.createElement(STh, {col:'amount',label:'Amount',width:'110px'}),
          React.createElement(STh, {col:'category',label:'Category',align:'left',width:'150px'}),
          React.createElement('th', {className:'cf-col-vis',style:{textAlign:'center',width:'40px'}}, 'Vis'),
        )),
        React.createElement('tbody', null,
          ...filtered.map(t => {
            const catMeta = CATS[t.category]||{color:'#94a3b8',icon:'•'};
            const reconciled = isReconciled(t, rec);
            const recInfo = rec && rec.get(t.id);
            return React.createElement('tr', {key:t.id,style:{opacity:t.hidden?.42:1,background:selected.has(t.id)?'rgba(212,175,55,.08)':undefined}},
              React.createElement('td', {className:'cf-col-sel',style:{textAlign:'center'}}, React.createElement('input', {type:'checkbox',checked:selected.has(t.id),onChange:()=>toggleSel(t.id)})),
              React.createElement('td', {style:{textAlign:'left',fontSize:'var(--t-xs)',color:'var(--text3)',whiteSpace:'nowrap'}}, t.date),
              React.createElement('td', {className:'cf-col-desc',style:{textAlign:'left',fontSize:'var(--t-sm)',whiteSpace:'normal',wordBreak:'break-word'}},
                t.description,
                t.manual && React.createElement('span', {title:'Manual',style:{marginLeft:'.3rem',color:'var(--gold)'}}, '✏️'),
                reconciled && React.createElement('span', {title:'Reconciled internal '+(recInfo&&recInfo.type==='steppay'?'StepPay loan':'transfer')+' — not counted',style:{marginLeft:'.3rem',color:'var(--blue)'}}, recInfo&&recInfo.type==='steppay'?'🔁':'🔗')
              ),
              React.createElement('td', {className:'cf-col-acct',style:{textAlign:'left',fontSize:'var(--t-xs)',color:'var(--text3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}, t.account),
              React.createElement('td', {style:{fontFamily:"'Syne',sans-serif",fontWeight:700,color:reconciled?'var(--text3)':(t.amount>0?'var(--green)':'var(--text)'),whiteSpace:'nowrap',textDecoration:reconciled?'line-through':'none'}}, (t.amount>0?'+':'')+fmt(t.amount)),
              React.createElement('td', {style:{textAlign:'left'}},
                React.createElement('select', {value:t.category,onChange:e=>updateCategory(t.id,e.target.value),style:{background:catMeta.color+'1a',color:catMeta.color,border:'1px solid '+catMeta.color+'50',borderRadius:'1rem',padding:'.15rem .5rem',fontSize:'var(--t-xs)',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",width:'100%',maxWidth:'150px'}},
                  ...Object.keys(CATS).map(c => React.createElement('option',{key:c,value:c,style:{background:'var(--surface2)',color:'var(--text)'}},CATS[c].icon+' '+c))
                )
              ),
              React.createElement('td', {className:'cf-col-vis',style:{textAlign:'center'}}, React.createElement('button', {onClick:()=>toggleHidden(t.id),title:t.hidden?'Unhide':'Hide',style:{background:'none',border:'none',cursor:'pointer',fontSize:'.85em',color:t.hidden?'var(--gold)':'var(--text3)',padding:'.2rem .3rem'}}, t.hidden?'👁':'🙈'))
            );
          })
        )
      )
    ),
    showAdd && React.createElement(ManualAddModal, {accounts:accountList,onClose:()=>setShowAdd(false)})
  );
}

// ═══════════════════════════════════════════════════════════════
// Reconciliation Audit Panel — shows the user what was matched
// ═══════════════════════════════════════════════════════════════
function ReconciliationAudit({ txns, rec }) {
  if (!rec || rec.size === 0) return null;
  const byId = new Map(txns.map(t => [t.id, t]));
  const pairs = [];
  const seen = new Set();
  for (const [id, info] of rec.entries()) {
    if (seen.has(id) || seen.has(info.linkedTo)) continue;
    const a = byId.get(id), b = byId.get(info.linkedTo);
    if (!a || !b) continue;
    seen.add(id); seen.add(info.linkedTo);
    pairs.push({a, b, type:info.type, delta:info.delta});
  }
  if (!pairs.length) return null;
  const steppayPairs = pairs.filter(p => p.type==='steppay');
  const transferPairs = pairs.filter(p => p.type==='transfer');
  const stTotal = steppayPairs.reduce((s,p) => s+Math.abs(p.a.amount), 0);
  const tTotal = transferPairs.reduce((s,p) => s+Math.abs(p.a.amount), 0);
  return React.createElement('div', {className:'chart-card',style:{borderLeft:'3px solid var(--blue)'}},
    React.createElement('div', {className:'chart-title',style:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'.5rem'}},
      React.createElement('span', null, '🔍 Reconciliation Audit'),
      React.createElement('span', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',fontWeight:400}}, pairs.length+' pair'+(pairs.length!==1?'s':'')+' auto-matched · excluded from totals')
    ),
    steppayPairs.length > 0 && React.createElement('div', {style:{marginBottom:'.75rem'}},
      React.createElement('div', {style:{fontSize:'var(--t-xs)',fontWeight:700,color:'#f87171',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:'.4rem'}}, '🔁 StepPay Loan Settlements (' + steppayPairs.length + ', total ' + fmt(stTotal) + ')'),
      React.createElement('div', {style:{display:'flex',flexDirection:'column',gap:'.25rem',maxHeight:'160px',overflowY:'auto'}},
        ...steppayPairs.slice(0,40).map((p,i) => React.createElement('div', {key:i,style:{display:'flex',gap:'.5rem',fontSize:'var(--t-xs)',color:'var(--text3)',padding:'.25rem .5rem',background:'var(--bg2)',borderRadius:'var(--radius-sm)',alignItems:'center',flexWrap:'wrap'}},
          React.createElement('span', {style:{color:'var(--text2)',whiteSpace:'nowrap'}}, p.a.date),
          React.createElement('span', {style:{flex:1,minWidth:'140px'}}, p.a.description.slice(0,40)+' ↔ '+p.b.description.slice(0,40)),
          React.createElement('span', {style:{fontWeight:700,color:'#f87171',whiteSpace:'nowrap'}}, fmt(Math.abs(p.a.amount)))
        )),
        steppayPairs.length > 40 && React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',padding:'.25rem .5rem'}}, '... and '+(steppayPairs.length-40)+' more')
      )
    ),
    transferPairs.length > 0 && React.createElement('div', null,
      React.createElement('div', {style:{fontSize:'var(--t-xs)',fontWeight:700,color:'var(--blue)',textTransform:'uppercase',letterSpacing:'.04em',marginBottom:'.4rem'}}, '🔗 Internal Account Transfers (' + transferPairs.length + ', total ' + fmt(tTotal) + ')'),
      React.createElement('div', {style:{display:'flex',flexDirection:'column',gap:'.25rem',maxHeight:'160px',overflowY:'auto'}},
        ...transferPairs.slice(0,40).map((p,i) => React.createElement('div', {key:i,style:{display:'flex',gap:'.5rem',fontSize:'var(--t-xs)',color:'var(--text3)',padding:'.25rem .5rem',background:'var(--bg2)',borderRadius:'var(--radius-sm)',alignItems:'center',flexWrap:'wrap'}},
          React.createElement('span', {style:{color:'var(--text2)',whiteSpace:'nowrap'}}, p.a.date),
          React.createElement('span', {style:{flex:1,minWidth:'140px'}}, p.a.account+' ↔ '+p.b.account),
          React.createElement('span', {style:{fontWeight:700,color:'var(--blue)',whiteSpace:'nowrap'}}, fmt(Math.abs(p.a.amount)))
        )),
        transferPairs.length > 40 && React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',padding:'.25rem .5rem'}}, '... and '+(transferPairs.length-40)+' more')
      )
    )
  );
}

// ═══════════════════════════════════════════════════════════════
// Budget Tab
// ═══════════════════════════════════════════════════════════════
function BudgetTab({ txns, rec, budgets, onUpdate }) {
  const catAmt = {};
  txns.filter(t=>isExpenseTxn(t,rec)).forEach(t => { catAmt[t.category]=(catAmt[t.category]||0)+Math.abs(t.amount); });
  return React.createElement('div', null,
    React.createElement('p', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginBottom:'1.25rem'}}, 'Set monthly budget targets per category. Reconciled internal transfers excluded.'),
    React.createElement('div', {style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(min(210px,100%),1fr))',gap:'.75rem'}},
      ...EXPENSE_CATS.map(cat => {
        const c=CATS[cat]||{color:'#94a3b8',icon:'•'}; const spent=catAmt[cat]||0; const budget=budgets[cat]||0;
        const pct = budget>0 ? Math.min(100,spent/budget*100) : 0; const over = budget>0 && spent>budget;
        return React.createElement('div', {key:cat,style:{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'.8rem',borderLeft:'3px solid '+c.color}},
          React.createElement('div', {style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.4rem'}},
            React.createElement('div', {style:{fontSize:'var(--t-xs)',fontWeight:700,color:c.color,fontFamily:"'Syne',sans-serif"}}, c.icon+' '+cat),
            React.createElement('div', {style:{fontSize:'var(--t-xs)',color:spent>0?(over?'var(--red)':'var(--green)'):'var(--text3)'}}, spent>0?fmt(spent):'—')
          ),
          React.createElement('div', {style:{position:'relative'}},
            React.createElement('span', {style:{position:'absolute',left:'.75rem',top:'50%',transform:'translateY(-50%)',color:'var(--gold)',fontSize:'var(--t-sm)',pointerEvents:'none'}}, '$'),
            React.createElement('input', {type:'number',className:'input-field has-prefix',placeholder:'Monthly target',min:0,value:budget||'',onChange:e=>{const v=parseFloat(e.target.value);onUpdate(cat,isNaN(v)?0:v);}})
          ),
          budget>0 && React.createElement('div', {style:{marginTop:'.5rem'}},
            React.createElement('div', {style:{height:'5px',background:'var(--border)',borderRadius:'3px',overflow:'hidden'}},
              React.createElement('div', {style:{height:'100%',width:pct+'%',background:over?'var(--red)':c.color,borderRadius:'3px',transition:'width .4s'}})
            ),
            React.createElement('div', {style:{fontSize:'var(--t-xs)',color:over?'var(--red)':'var(--text3)',marginTop:'.2rem'}}, Math.round(pct)+'%'+(over?' — over by '+fmt(spent-budget):' of '+fmt(budget)))
          )
        );
      })
    )
  );
}

// ═══════════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════════

