const {useState,useMemo,useEffect,useContext,createContext,useCallback,useRef}=React;
const {LineChart,Line,BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,Legend,
       ResponsiveContainer,ReferenceLine,Cell}=Recharts;

// ═══════════════════════════════════════════════════════════════
// TAX ENGINE — Stage 3 (FY2024-25+) with LITO, Medicare, indexation
// ═══════════════════════════════════════════════════════════════
function calcTax(taxable, opts) {
  opts = opts || {};
  const idx = opts.bracketIndex || 0;
  const yrs = opts.yearsFromBase || 0;
  const m = Math.pow(1+idx, yrs);
  const t = Math.max(0, taxable);
  let tax = 0;
  if (t <= 18200*m) tax = 0;
  else if (t <= 45000*m) tax = (t - 18200*m) * 0.16;
  else if (t <= 135000*m) tax = (45000-18200)*m*0.16 + (t - 45000*m) * 0.30;
  else if (t <= 190000*m) tax = (45000-18200)*m*0.16 + (135000-45000)*m*0.30 + (t - 135000*m) * 0.37;
  else tax = (45000-18200)*m*0.16 + (135000-45000)*m*0.30 + (190000-135000)*m*0.37 + (t - 190000*m) * 0.45;
  let medicare = 0;
  const mcLo = 27222*m, mcHi = 34028*m;
  if (t > mcHi) medicare = t * 0.02;
  else if (t > mcLo) medicare = (t - mcLo) * 0.10;
  let lito = 0;
  const lA = 37500*m, lB = 45000*m, lC = 66667*m;
  if (t <= lA) lito = 700;
  else if (t <= lB) lito = 700 - (t - lA) * 0.05;
  else if (t <= lC) lito = 325 - (t - lB) * 0.015;
  lito = Math.max(0, lito);
  return Math.max(0, tax + medicare - lito);
}

function marginalRate(taxable, opts) {
  opts = opts || {};
  const idx = opts.bracketIndex || 0;
  const yrs = opts.yearsFromBase || 0;
  const m = Math.pow(1+idx, yrs);
  const t = Math.max(0, taxable);
  if (t <= 18200*m) return 0;
  if (t <= 45000*m) return 0.16 + 0.02;
  if (t <= 135000*m) return 0.30 + 0.02;
  if (t <= 190000*m) return 0.37 + 0.02;
  return 0.45 + 0.02;
}

function vicStampDuty(price) {
  if (price <= 25000) return price*0.014;
  if (price <= 130000) return 350+(price-25000)*0.024;
  if (price <= 960000) return 2870+(price-130000)*0.06;
  if (price <= 2000000) return price*0.055;
  return price*0.065;
}

// ═══════════════════════════════════════════════════════════════
// SYNC LAYER — Supabase JSONB blob, debounced 1.5s
// ═══════════════════════════════════════════════════════════════
const SyncCtx = createContext({status:'synced', userId:null});
const useSync = () => useContext(SyncCtx);

function SyncProvider({children}) {
  const [status, setStatus] = useState('synced'); // synced | saving | offline | error
  const [userId, setUserId] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef(null);
  const pendingRef = useRef(null);

  // Get user, then pull blob from Supabase (overwrites local — per your choice)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sess } = await window._sb.auth.getSession();
        if(!sess || !sess.session || cancelled) return;
        const uid = sess.session.user.id;
        setUserId(uid);
        // Pull existing row
        const { data: row, error } = await window._sb
          .from('user_state').select('data').eq('user_id', uid).maybeSingle();
        if(cancelled) return;
        if(error){ console.warn('Pull failed:', error); setStatus('error'); return; }
        if(row && row.data && Object.keys(row.data).length > 0){
          // Hydrate localStorage from Supabase (source of truth)
          if(row.data.FinancePlan_A) localStorage.setItem('FinancePlan_A', JSON.stringify(row.data.FinancePlan_A));
          if(row.data.FinancePlan_D) localStorage.setItem('FinancePlan_D', JSON.stringify(row.data.FinancePlan_D));
          if(row.data.FinancePlan_T) localStorage.setItem('FinancePlan_T', JSON.stringify(row.data.FinancePlan_T));
        } else {
          // First sign-in for this user: push current local state up
          await pushBlob(uid);
        }
      } catch(e){
        console.warn('Sync init error:', e);
        setStatus('error');
      } finally {
        if(!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function pushBlob(uid) {
    const blob = {
      FinancePlan_A: JSON.parse(localStorage.getItem('FinancePlan_A') || 'null'),
      FinancePlan_D: JSON.parse(localStorage.getItem('FinancePlan_D') || 'null'),
      FinancePlan_T: JSON.parse(localStorage.getItem('FinancePlan_T') || 'null'),
    };
    const { error } = await window._sb.from('user_state')
      .upsert({ user_id: uid, data: blob, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if(error){ setStatus('error'); console.warn('Push failed:', error); return false; }
    return true;
  }

  // Public method called by state providers on change
  const schedulePush = useCallback(() => {
    if(!userId || !hydrated) return;
    if(!navigator.onLine){ setStatus('offline'); return; }
    setStatus('saving');
    if(debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const ok = await pushBlob(userId);
      if(ok) setStatus('synced');
    }, 1500);
  }, [userId, hydrated]);

  // Online/offline listeners
  useEffect(() => {
    const onOnline = () => { if(userId) schedulePush(); };
    const onOffline = () => setStatus('offline');
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, [userId, schedulePush]);

  return React.createElement(SyncCtx.Provider, {value:{status, userId, hydrated, schedulePush}}, children);
}

function SyncBadge() {
  const { status } = useSync();
  const map = {
    synced: { label: 'Synced', cls: 'synced' },
    saving: { label: 'Saving…', cls: 'saving' },
    offline: { label: 'Offline', cls: 'offline' },
    error: { label: 'Sync error', cls: 'error' },
  };
  const m = map[status] || map.synced;
  return React.createElement('span', {className:'sync-badge '+m.cls},
    React.createElement('span', {className:'sync-dot'}),
    React.createElement('span', {className:'sync-label'}, m.label)
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const fmt = n => n==null ? '—' : (n<0?'-':'') + '$' + Math.abs(n).toLocaleString('en-AU',{maximumFractionDigits:0});
const fmtA = fmt;
const fmtL = n => (n/1e5).toFixed(2)+'L';
const ymStr = ym => { const s=String(ym); return s.slice(0,4)+'-'+s.slice(4); };
const strYm = s => { const v=parseInt(s.replace('-','')); return isNaN(v)?0:v; };

// ═══════════════════════════════════════════════════════════════
// FAMILY PLAN
// ═══════════════════════════════════════════════════════════════
