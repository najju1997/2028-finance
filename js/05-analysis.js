// ═══════════════════════════════════════════════════════════════
// ANALYSIS TAB — 5 deep insights for monthly cashflow
// ═══════════════════════════════════════════════════════════════

const FIXED_CATS = ['Rent/Housing','Utilities','Insurance','Education','Healthcare','Tech'];
const VARIABLE_CATS = ['Groceries','Eating Out','Transport/Fuel','Shopping','Entertainment','BNPL/StepPay','Other'];

// ── 1. Waterfall: Where did the money go? ──────────────────────
function WaterfallChart({ txns, rec }) {
  const { allCats } = useTxn();
  const income = txns.filter(t => isIncomeTxn(t, rec)).reduce((s,t)=>s+t.amount, 0);
  const catAmt = {};
  txns.filter(t => isExpenseTxn(t, rec)).forEach(t => { catAmt[t.category] = (catAmt[t.category]||0) + Math.abs(t.amount); });
  // Order: fixed essentials first, then variable
  const order = ['Rent/Housing','Utilities','Insurance','Education','Healthcare','Tech','Groceries','Transport/Fuel','BNPL/StepPay','Eating Out','Shopping','Entertainment','Other'];
  const orderedCats = order.filter(c => catAmt[c] > 0).concat(Object.keys(catAmt).filter(c => !order.includes(c) && catAmt[c] > 0));

  if (income === 0 && orderedCats.length === 0) return null;

  let running = 0;
  const data = [{name:'Income', base:0, value:income, kind:'income', color:'#22c55e'}];
  running = income;
  for (const cat of orderedCats) {
    const v = catAmt[cat];
    running -= v;
    data.push({name:cat, base:Math.max(0, running), value:v, kind:'expense', color:allCats[cat]?allCats[cat].color:'#94a3b8'});
  }
  const net = running;
  data.push({name:'Net', base:net < 0 ? 0 : 0, value:Math.abs(net), kind:net>=0?'positive':'negative', color:net>=0?'#22c55e':'#ef4444'});

  return React.createElement('div', {className:'chart-card'},
    React.createElement('div', {className:'chart-title'}, '💰 Where Did the Money Go?'),
    React.createElement('p', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginBottom:'.75rem',marginTop:'-.5rem'}},
      'Income flows in, expenses subtract down to your net cashflow. Tall drops = biggest categories.'),
    React.createElement(ResponsiveContainer, {width:'100%',height:Math.max(280, data.length * 30)},
      React.createElement(BarChart, {data,margin:{top:8,right:16,bottom:60,left:8}},
        React.createElement(CartesianGrid, {strokeDasharray:'3 3',stroke:'var(--border)'}),
        React.createElement(XAxis, {dataKey:'name',tick:{fill:'var(--chart-text)',fontSize:10},angle:-45,textAnchor:'end',interval:0,height:60}),
        React.createElement(YAxis, {tickFormatter:v=>'$'+(v/1000).toFixed(1)+'k',tick:{fill:'var(--chart-text)',fontSize:11},axisLine:false,tickLine:false}),
        React.createElement(Tooltip, {
          formatter:(v, n, p)=>{
            if(n==='base') return null;
            const d = p.payload;
            return ['$'+v.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2}), d.kind==='income'?'Income':d.kind==='expense'?'Spent':d.kind==='positive'?'Net Positive':'Net Negative'];
          },
          contentStyle:{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',fontSize:'var(--t-xs)',color:'#fff'},
          itemStyle:{color:'#fff'},labelStyle:{color:'#fff',fontWeight:700}
        }),
        React.createElement(Bar, {dataKey:'base',stackId:'a',fill:'transparent'}),
        React.createElement(Bar, {dataKey:'value',stackId:'a',radius:[2,2,0,0]},
          ...data.map((d,i) => React.createElement(Cell, {key:i,fill:d.color}))
        )
      )
    ),
    React.createElement('div', {style:{display:'flex',justifyContent:'space-between',paddingTop:'.5rem',borderTop:'1px solid var(--border)',marginTop:'.5rem',fontSize:'var(--t-sm)',flexWrap:'wrap',gap:'.5rem'}},
      React.createElement('span', null, 'Started: ', React.createElement('strong', {style:{color:'var(--green)'}}, fmt(income))),
      React.createElement('span', null, 'Spent: ', React.createElement('strong', {style:{color:'var(--red)'}}, fmt(income-net))),
      React.createElement('span', null, 'Ended: ', React.createElement('strong', {style:{color:net>=0?'var(--green)':'var(--red)'}}, (net>=0?'+':'')+fmt(net)))
    )
  );
}

// ── 2. Fixed vs Variable Split ─────────────────────────────────
function FixedVsVariable({ txns, rec }) {
  let fixed = 0, variable = 0, fixedByCat = {}, variableByCat = {};
  let income = txns.filter(t => isIncomeTxn(t, rec)).reduce((s,t)=>s+t.amount, 0);
  txns.filter(t => isExpenseTxn(t, rec)).forEach(t => {
    const amt = Math.abs(t.amount);
    if (FIXED_CATS.includes(t.category)) { fixed += amt; fixedByCat[t.category] = (fixedByCat[t.category]||0) + amt; }
    else { variable += amt; variableByCat[t.category] = (variableByCat[t.category]||0) + amt; }
  });
  const total = fixed + variable;
  if (total === 0) return null;
  const fixedPct = total > 0 ? fixed/total*100 : 0;
  const ceiling = income - fixed;
  const realisticTarget = variable * 0.2;  // saving 20% of variable

  return React.createElement('div', {className:'chart-card'},
    React.createElement('div', {className:'chart-title'}, '🔒 Fixed vs 🎯 Variable Spending'),
    React.createElement('p', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginBottom:'.75rem',marginTop:'-.5rem'}},
      'Fixed costs are locked in. Variable spending is where you have control.'),
    React.createElement('div', {style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(220px,100%),1fr))',gap:'.75rem',marginBottom:'1rem'}},
      React.createElement('div', {style:{background:'var(--bg2)',border:'1px solid var(--border)',borderLeft:'3px solid #a78bfa',borderRadius:'var(--radius-sm)',padding:'.9rem'}},
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginBottom:'.3rem',textTransform:'uppercase',letterSpacing:'.05em'}}, '🔒 Fixed Costs'),
        React.createElement('div', {style:{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1.8rem',color:'#a78bfa'}}, fmt(fixed)),
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginTop:'.2rem'}}, fixedPct.toFixed(0)+'% of total spend'),
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text2)',marginTop:'.4rem',fontStyle:'italic'}}, 'Rent · utilities · insurance · phone')
      ),
      React.createElement('div', {style:{background:'var(--bg2)',border:'1px solid var(--border)',borderLeft:'3px solid var(--gold)',borderRadius:'var(--radius-sm)',padding:'.9rem'}},
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginBottom:'.3rem',textTransform:'uppercase',letterSpacing:'.05em'}}, '🎯 Variable Spending'),
        React.createElement('div', {style:{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1.8rem',color:'var(--gold)'}}, fmt(variable)),
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginTop:'.2rem'}}, (100-fixedPct).toFixed(0)+'% of total spend'),
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text2)',marginTop:'.4rem',fontStyle:'italic'}}, 'Groceries · eating out · shopping')
      )
    ),
    // Stacked ratio bar
    React.createElement('div', {style:{height:'18px',display:'flex',borderRadius:'9px',overflow:'hidden',marginBottom:'.75rem'}},
      React.createElement('div', {style:{width:fixedPct+'%',background:'#a78bfa',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'10px',fontWeight:700}}, fixedPct>=12?fixedPct.toFixed(0)+'%':''),
      React.createElement('div', {style:{width:(100-fixedPct)+'%',background:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',color:'#0b0e14',fontSize:'10px',fontWeight:700}}, (100-fixedPct)>=12?(100-fixedPct).toFixed(0)+'%':'')
    ),
    // Insight box
    income > 0 && React.createElement('div', {style:{padding:'.75rem 1rem',background:'var(--bg2)',borderLeft:'3px solid '+(ceiling<0?'var(--red)':'var(--green)'),borderRadius:'var(--radius-sm)',marginTop:'.5rem'}},
      React.createElement('div', {style:{fontSize:'var(--t-sm)',fontWeight:700,color:ceiling<0?'var(--red)':'var(--green)',marginBottom:'.25rem'}},
        ceiling < 0 ? '⚠ Fixed costs exceed your income' : '💡 Your savings ceiling'),
      React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text2)',lineHeight:1.5}},
        ceiling < 0
          ? 'Income ' + fmt(income) + ' < fixed costs ' + fmt(fixed) + '. Variable spending of ' + fmt(variable) + ' added to the shortfall. Long-term you need either higher income or to renegotiate fixed costs.'
          : 'Max possible savings = income (' + fmt(income) + ') − fixed (' + fmt(fixed) + ') = ' + fmt(ceiling) + '. If you cut variable spending by 20%, you save ' + fmt(realisticTarget) + '/month — that compounds to ' + fmt(realisticTarget*12) + '/year.'
      )
    )
  );
}

// ── 3. Recurring Subscription Detector ─────────────────────────
function normaliseMerchant(desc) {
  return desc.toUpperCase()
    .replace(/CARD XX\d+.*$/i, '')
    .replace(/VALUE DATE:.*$/i, '')
    .replace(/RECEIPT NUMBER:.*$/i, '')
    .replace(/\s+(NSW|VIC|AUS|QLD|WA|SA|TAS|ACT|NT)\b.*$/i, '')
    .replace(/\s+\d{4,}/g, '')         // strip long numbers
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 35);
}

function detectRecurring(allTxns) {
  const groups = {};
  allTxns.filter(t => !t.hidden && t.amount < 0 && t.category !== 'Transfers').forEach(t => {
    const key = normaliseMerchant(t.description);
    if (!key || key.length < 3) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  const recurring = [];
  for (const [merchant, txns] of Object.entries(groups)) {
    if (txns.length < 2) continue;
    const months = new Set(txns.map(t => t.date.slice(0,7)));
    if (months.size < 2) continue;
    const amts = txns.map(t => Math.abs(t.amount));
    const avg = amts.reduce((s,a)=>s+a,0) / amts.length;
    if (avg < 2) continue;  // ignore tiny noise
    const inRange = amts.filter(a => Math.abs(a-avg) < Math.max(2, avg*0.15)).length;
    if (inRange < amts.length * 0.7) continue;  // 70% must be consistent
    const perMonth = txns.length / months.size;
    const freqLabel = perMonth >= 3.5 ? 'weekly' : perMonth >= 1.7 ? 'fortnightly' : perMonth >= 0.85 ? 'monthly' : perMonth >= 0.3 ? 'quarterly' : 'irregular';
    const annual = avg * (freqLabel==='weekly'?52 : freqLabel==='fortnightly'?26 : freqLabel==='monthly'?12 : freqLabel==='quarterly'?4 : 12*perMonth/(months.size||1));
    const lastSeen = txns.sort((a,b)=>b.date.localeCompare(a.date))[0].date;
    const cat = txns[0].category;
    recurring.push({ merchant, freqLabel, occurrences:txns.length, monthsSeen:months.size, avgAmount:avg, annualEstimate:annual, lastSeen, category:cat });
  }
  return recurring.sort((a,b) => b.annualEstimate - a.annualEstimate);
}

function RecurringDetector({ allTxns }) {
  const { T, dismissRecurring, restoreRecurring, allCats } = useTxn();
  const dismissed = T.dismissedRecurring || [];
  const [showDismissed, setShowDismissed] = useState(false);
  const allRecurring = useMemo(() => detectRecurring(allTxns), [allTxns]);
  const recurring = useMemo(() => allRecurring.filter(r => !dismissed.includes(r.merchant)), [allRecurring, dismissed]);
  const dismissedItems = useMemo(() => allRecurring.filter(r => dismissed.includes(r.merchant)), [allRecurring, dismissed]);
  const monthsAvailable = new Set(allTxns.map(t => t.date.slice(0,7))).size;

  if (monthsAvailable < 2) {
    return React.createElement('div', {className:'chart-card'},
      React.createElement('div', {className:'chart-title'}, '🔁 Recurring Subscriptions'),
      React.createElement('div', {style:{padding:'1.5rem',textAlign:'center',color:'var(--text3)',fontSize:'var(--t-sm)'}},
        'Upload at least 2 months of data to detect recurring charges.')
    );
  }
  if (recurring.length === 0 && dismissedItems.length === 0) {
    return React.createElement('div', {className:'chart-card'},
      React.createElement('div', {className:'chart-title'}, '🔁 Recurring Subscriptions'),
      React.createElement('div', {style:{padding:'1.5rem',textAlign:'center',color:'var(--text3)',fontSize:'var(--t-sm)'}},
        'No clear recurring charges detected.')
    );
  }

  const totalAnnual = recurring.reduce((s,r) => s+r.annualEstimate, 0);
  const totalMonthly = totalAnnual / 12;

  const btnDelStyle = {background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:'1rem',padding:'0 .25rem',lineHeight:1,borderRadius:'var(--radius-sm)',transition:'color .15s'};
  const btnRestoreStyle = {background:'none',border:'1px solid var(--text3)',cursor:'pointer',color:'var(--text3)',fontSize:'var(--t-xs)',padding:'.1rem .4rem',borderRadius:'var(--radius-sm)'};

  const activeTable = React.createElement('div', {className:'table-wrap'},
    React.createElement('table', {className:'data-table'},
      React.createElement('thead', null, React.createElement('tr', null,
        React.createElement('th', {style:{textAlign:'left'}}, 'Merchant'),
        React.createElement('th', {style:{textAlign:'left'}}, 'Category'),
        React.createElement('th', null, 'Freq'),
        React.createElement('th', null, 'Avg'),
        React.createElement('th', null, 'Annual'),
        React.createElement('th', {style:{textAlign:'left'}}, 'Last seen'),
        React.createElement('th', null, ''),
      )),
      React.createElement('tbody', null,
        ...recurring.slice(0, 25).map((r,i) => {
          const c = allCats[r.category] || {color:'#94a3b8',icon:'•'};
          return React.createElement('tr', {key:i},
            React.createElement('td', {style:{textAlign:'left',fontSize:'var(--t-sm)',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}, r.merchant),
            React.createElement('td', {style:{textAlign:'left'}},
              React.createElement('span', {style:{fontSize:'var(--t-xs)',padding:'.1rem .4rem',borderRadius:'.5rem',background:c.color+'1a',color:c.color}}, c.icon+' '+r.category)
            ),
            React.createElement('td', {style:{fontSize:'var(--t-xs)',color:'var(--text2)'}}, r.freqLabel),
            React.createElement('td', {style:{fontFamily:"'Syne',sans-serif",fontWeight:600}}, fmt(r.avgAmount)),
            React.createElement('td', {style:{fontFamily:"'Syne',sans-serif",fontWeight:700,color:'var(--red)'}}, fmt(r.annualEstimate)),
            React.createElement('td', {style:{textAlign:'left',fontSize:'var(--t-xs)',color:'var(--text3)'}}, r.lastSeen),
            React.createElement('td', {style:{textAlign:'center'}},
              React.createElement('button', {
                style:btnDelStyle,
                title:'Dismiss from list',
                onClick:() => dismissRecurring(r.merchant)
              }, '✕')
            ),
          );
        })
      )
    )
  );

  const dismissedSection = dismissedItems.length > 0 && React.createElement('div', {style:{marginTop:'1rem'}},
    React.createElement('button', {
      onClick:() => setShowDismissed(v => !v),
      style:{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:'var(--t-xs)',padding:0,display:'flex',alignItems:'center',gap:'.3rem'}
    }, (showDismissed ? '▾' : '▸') + ' ' + dismissedItems.length + ' dismissed'),
    showDismissed && React.createElement('div', {className:'table-wrap',style:{marginTop:'.5rem',opacity:.7}},
      React.createElement('table', {className:'data-table'},
        React.createElement('tbody', null,
          ...dismissedItems.map((r,i) => {
            const c = allCats[r.category] || {color:'#94a3b8',icon:'•'};
            return React.createElement('tr', {key:i,style:{opacity:.6}},
              React.createElement('td', {style:{textAlign:'left',fontSize:'var(--t-sm)',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textDecoration:'line-through'}}, r.merchant),
              React.createElement('td', {style:{textAlign:'left'}},
                React.createElement('span', {style:{fontSize:'var(--t-xs)',padding:'.1rem .4rem',borderRadius:'.5rem',background:c.color+'1a',color:c.color}}, c.icon+' '+r.category)
              ),
              React.createElement('td', {style:{fontFamily:"'Syne',sans-serif",fontWeight:600,color:'var(--text3)'}}, fmt(r.avgAmount)),
              React.createElement('td', {style:{fontFamily:"'Syne',sans-serif",color:'var(--text3)'}}, fmt(r.annualEstimate)),
              React.createElement('td', null,
                React.createElement('button', {style:btnRestoreStyle, onClick:() => restoreRecurring(r.merchant)}, 'Restore')
              ),
            );
          })
        )
      )
    )
  );

  return React.createElement('div', {className:'chart-card'},
    React.createElement('div', {style:{display:'flex',justifyContent:'space-between',alignItems:'flex-end',flexWrap:'wrap',gap:'.5rem',marginBottom:'.75rem'}},
      React.createElement('div', null,
        React.createElement('div', {className:'chart-title',style:{margin:0}}, '🔁 Recurring Subscriptions & Bills'),
        React.createElement('p', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginTop:'.2rem'}}, 'Auto-detected from spending patterns across ' + monthsAvailable + ' months')
      ),
      React.createElement('div', {style:{textAlign:'right'}},
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)'}}, 'Annual locked-in'),
        React.createElement('div', {style:{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1.4rem',color:'var(--red)'}}, fmt(totalAnnual)),
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)'}}, '≈ ' + fmt(totalMonthly) + '/month')
      )
    ),
    recurring.length === 0
      ? React.createElement('div', {style:{padding:'1rem 0',textAlign:'center',color:'var(--text3)',fontSize:'var(--t-sm)'}}, 'All subscriptions dismissed.')
      : activeTable,
    recurring.length > 25 && React.createElement('div', {style:{textAlign:'center',color:'var(--text3)',fontSize:'var(--t-xs)',marginTop:'.5rem'}}, '+ ' + (recurring.length-25) + ' more'),
    dismissedSection
  );
}

// ── 4. BNPL Exposure Tracker ───────────────────────────────────
function BNPLExposure({ allTxns, rec }) {
  // For each month, sum StepPay Repayments + Afterpay outflows
  const monthly = {};
  allTxns.filter(t => !t.hidden && t.amount < 0).forEach(t => {
    const d = (t.description||'').toUpperCase();
    let kind = null;
    if (d.includes('STEPPAY REPAYMENT')) kind = 'StepPay';
    else if (d.includes('AFTERPAY')) kind = 'Afterpay';
    else if (d.includes('ZIP PAY') || d.includes('HUMM ') || d.includes('KLARNA')) kind = 'Other BNPL';
    if (!kind) return;
    const ym = t.date.slice(0,7);
    if (!monthly[ym]) monthly[ym] = {StepPay:0, Afterpay:0, 'Other BNPL':0};
    monthly[ym][kind] += Math.abs(t.amount);
  });
  const months = Object.keys(monthly).sort();
  if (!months.length) {
    return React.createElement('div', {className:'chart-card'},
      React.createElement('div', {className:'chart-title'}, '📱 BNPL Exposure'),
      React.createElement('div', {style:{padding:'1.5rem',textAlign:'center',color:'var(--text3)',fontSize:'var(--t-sm)'}},
        'No BNPL repayments detected — good!')
    );
  }
  const monthlyIncome = {};
  allTxns.filter(t => !t.hidden && isIncomeTxn(t, rec)).forEach(t => {
    const ym = t.date.slice(0,7);
    monthlyIncome[ym] = (monthlyIncome[ym]||0) + t.amount;
  });
  const data = months.map(ym => {
    const total = monthly[ym].StepPay + monthly[ym].Afterpay + monthly[ym]['Other BNPL'];
    const inc = monthlyIncome[ym] || 0;
    return {
      month: new Date(ym+'-01').toLocaleDateString('en-AU',{month:'short',year:'2-digit'}),
      StepPay: Math.round(monthly[ym].StepPay),
      Afterpay: Math.round(monthly[ym].Afterpay),
      'Other BNPL': Math.round(monthly[ym]['Other BNPL']),
      pctOfIncome: inc > 0 ? (total/inc*100) : 0
    };
  });
  const lastMonth = data[data.length-1];
  const totalLast = lastMonth.StepPay + lastMonth.Afterpay + lastMonth['Other BNPL'];
  const avgPct = data.reduce((s,d) => s+d.pctOfIncome, 0) / data.length;

  return React.createElement('div', {className:'chart-card'},
    React.createElement('div', {style:{display:'flex',justifyContent:'space-between',alignItems:'flex-end',flexWrap:'wrap',gap:'.5rem',marginBottom:'.75rem'}},
      React.createElement('div', null,
        React.createElement('div', {className:'chart-title',style:{margin:0}}, '📱 BNPL Exposure Over Time'),
        React.createElement('p', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginTop:'.2rem'}}, 'Money going to past purchases instead of current spending')
      ),
      React.createElement('div', {style:{textAlign:'right'}},
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)'}}, 'Last month'),
        React.createElement('div', {style:{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1.4rem',color:'#f87171'}}, fmt(totalLast)),
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:lastMonth.pctOfIncome > 15 ? 'var(--red)' : 'var(--text3)'}}, lastMonth.pctOfIncome.toFixed(1) + '% of income')
      )
    ),
    React.createElement(ResponsiveContainer, {width:'100%',height:230},
      React.createElement(BarChart, {data,margin:{top:8,right:16,bottom:0,left:8}},
        React.createElement(CartesianGrid, {strokeDasharray:'3 3',stroke:'var(--border)'}),
        React.createElement(XAxis, {dataKey:'month',tick:{fill:'var(--chart-text)',fontSize:11}}),
        React.createElement(YAxis, {tickFormatter:v=>'$'+v,tick:{fill:'var(--chart-text)',fontSize:11},axisLine:false,tickLine:false}),
        React.createElement(Tooltip, {contentStyle:{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',fontSize:'var(--t-xs)',color:'#fff'},itemStyle:{color:'#fff'},labelStyle:{color:'#fff'}}),
        React.createElement(Legend, {wrapperStyle:{fontSize:'var(--t-xs)',color:'var(--chart-text)'}}),
        React.createElement(Bar, {dataKey:'StepPay',stackId:'a',fill:'#f87171'}),
        React.createElement(Bar, {dataKey:'Afterpay',stackId:'a',fill:'#fb923c'}),
        React.createElement(Bar, {dataKey:'Other BNPL',stackId:'a',fill:'#facc15'})
      )
    ),
    React.createElement('div', {style:{padding:'.75rem 1rem',background:'var(--bg2)',borderLeft:'3px solid '+(avgPct>15?'var(--red)':avgPct>8?'var(--gold)':'var(--green)'),borderRadius:'var(--radius-sm)',marginTop:'.75rem'}},
      React.createElement('div', {style:{fontSize:'var(--t-sm)',fontWeight:700,marginBottom:'.25rem',color:avgPct>15?'var(--red)':avgPct>8?'var(--gold)':'var(--green)'}},
        avgPct > 15 ? '⚠ High BNPL exposure — financial stress signal' : avgPct > 8 ? '⚡ Moderate BNPL usage' : '✓ BNPL well-controlled'),
      React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text2)',lineHeight:1.5}},
        avgPct > 15
          ? 'Average ' + avgPct.toFixed(1) + '% of monthly income goes to BNPL repayments. This means a chunk of every paycheck is already spoken for before the month starts. Consider freezing new BNPL purchases until the balance is paid down.'
          : avgPct > 8
          ? 'On average ' + avgPct.toFixed(1) + '% of monthly income services BNPL. Workable, but interest-free is only interest-free if you can comfortably afford the next-month repayment.'
          : 'BNPL repayments are a healthy ' + avgPct.toFixed(1) + '% of income. Keep tracking — it can creep up fast.'
      )
    )
  );
}

// ── 5. Cash Runway ─────────────────────────────────────────────
function CashRunway({ allTxns, rec }) {
  const months = useMemo(() => [...new Set(allTxns.map(t => t.date.slice(0,7)))].sort().reverse(), [allTxns]);
  const [mode, setMode] = useState('month');
  const [selMonth, setSelMonth] = useState(() => months[0] || '');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  useEffect(() => {
    if (months.length > 0 && !months.includes(selMonth)) setSelMonth(months[0]);
  }, [months.join(',')]);

  const { txns, days } = useMemo(() => {
    if (mode === 'all') {
      const dates = allTxns.map(t => t.date).sort();
      const d = dates.length >= 2 ? Math.max(1, Math.round((new Date(dates[dates.length-1]) - new Date(dates[0])) / 86400000) + 1) : 30;
      return { txns: allTxns, days: d };
    }
    if (mode === 'range') {
      const filtered = allTxns.filter(t => (!rangeFrom || t.date >= rangeFrom) && (!rangeTo || t.date <= rangeTo));
      const d = rangeFrom && rangeTo ? Math.max(1, Math.round((new Date(rangeTo) - new Date(rangeFrom)) / 86400000) + 1) : 30;
      return { txns: filtered, days: d };
    }
    return { txns: allTxns.filter(t => t.date.slice(0,7) === selMonth), days: 30 };
  }, [mode, selMonth, rangeFrom, rangeTo, allTxns]);

  const income = txns.filter(t => isIncomeTxn(t, rec)).reduce((s,t)=>s+t.amount, 0);
  const expenses = txns.filter(t => isExpenseTxn(t, rec)).reduce((s,t)=>s+Math.abs(t.amount), 0);
  const net = income - expenses;
  const dailyBurn = expenses > 0 ? expenses / days : 0;
  const deficit = net < 0 ? Math.abs(net) : 0;
  const periodLabel = mode === 'month' ? 'month' : 'period';
  const monthlyAvgNet = mode !== 'month' ? net / Math.max(1, days / 30) : net;

  const modeBtnStyle = active => ({
    padding:'.3rem .7rem', fontSize:'var(--t-xs)', borderRadius:'var(--radius-sm)', cursor:'pointer', border:'1px solid var(--border)',
    background: active ? 'var(--accent)' : 'var(--bg2)', color: active ? '#fff' : 'var(--text2)', fontWeight: active ? 600 : 400,
    transition:'background .15s,color .15s'
  });

  const periodSelector = React.createElement('div', {style:{marginBottom:'1rem'}},
    React.createElement('div', {style:{display:'flex',gap:'.4rem',flexWrap:'wrap',alignItems:'center',marginBottom:'.6rem'}},
      React.createElement('span', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginRight:'.2rem'}}, 'Period:'),
      React.createElement('button', {style:modeBtnStyle(mode==='month'), onClick:()=>setMode('month')}, 'Month'),
      React.createElement('button', {style:modeBtnStyle(mode==='range'), onClick:()=>setMode('range')}, 'Date Range'),
      React.createElement('button', {style:modeBtnStyle(mode==='all'), onClick:()=>setMode('all')}, 'All Time'),
    ),
    mode === 'month' && React.createElement('select', {
      className:'input-field',
      style:{width:'auto',minWidth:'170px',padding:'.3rem .5rem',fontSize:'var(--t-xs)'},
      value:selMonth, onChange:e=>setSelMonth(e.target.value)
    }, ...months.map(m => React.createElement('option', {key:m,value:m},
      new Date(m+'-01').toLocaleDateString('en-AU',{month:'long',year:'numeric'})))),
    mode === 'range' && React.createElement('div', {style:{display:'flex',gap:'.5rem',alignItems:'center',flexWrap:'wrap'}},
      React.createElement('input', {type:'date',className:'input-field',style:{width:'auto',padding:'.3rem .5rem',fontSize:'var(--t-xs)'},value:rangeFrom,onChange:e=>setRangeFrom(e.target.value)}),
      React.createElement('span', {style:{color:'var(--text3)',fontSize:'var(--t-xs)'}}, '→'),
      React.createElement('input', {type:'date',className:'input-field',style:{width:'auto',padding:'.3rem .5rem',fontSize:'var(--t-xs)'},value:rangeTo,onChange:e=>setRangeTo(e.target.value)}),
    ),
    mode === 'all' && React.createElement('span', {style:{fontSize:'var(--t-xs)',color:'var(--text3)'}},
      days + ' days · ' + months.length + ' months of data')
  );

  return React.createElement('div', {className:'chart-card'},
    React.createElement('div', {className:'chart-title'}, '⏱ Cash Burn Rate'),
    React.createElement('p', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginBottom:'1rem',marginTop:'-.5rem'}},
      'How fast money is leaving your accounts'),
    periodSelector,
    React.createElement('div', {style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(180px,100%),1fr))',gap:'.75rem',marginBottom:'1rem'}},
      React.createElement('div', {style:{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'.8rem'}},
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.25rem'}}, 'Daily spending'),
        React.createElement('div', {style:{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1.6rem',color:'var(--red)'}}, fmt(dailyBurn)),
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginTop:'.2rem'}}, 'avg burn per day')
      ),
      React.createElement('div', {style:{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'.8rem'}},
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.25rem'}}, 'Weekly spend'),
        React.createElement('div', {style:{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1.6rem',color:'var(--text)'}}, fmt(dailyBurn*7)),
        React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginTop:'.2rem'}}, '7-day equivalent')
      ),
      net >= 0
        ? React.createElement('div', {style:{background:'rgba(74,222,128,.1)',border:'1px solid var(--green)',borderRadius:'var(--radius-sm)',padding:'.8rem'}},
            React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--green)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.25rem'}}, mode==='month'?'Monthly surplus':'Period surplus'),
            React.createElement('div', {style:{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1.6rem',color:'var(--green)'}}, '+'+fmt(net)),
            React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginTop:'.2rem'}},
              mode !== 'month' ? '≈ '+fmt(monthlyAvgNet)+'/month avg' : 'leftover after expenses')
          )
        : React.createElement('div', {style:{background:'rgba(224,85,85,.1)',border:'1px solid var(--red)',borderRadius:'var(--radius-sm)',padding:'.8rem'}},
            React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--red)',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.25rem'}}, mode==='month'?'Monthly deficit':'Period deficit'),
            React.createElement('div', {style:{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:'1.6rem',color:'var(--red)'}}, '-'+fmt(deficit)),
            React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginTop:'.2rem'}},
              mode !== 'month' ? '≈ '+fmt(Math.abs(monthlyAvgNet))+'/month avg' : 'short every month')
          )
    ),
    net < 0 && React.createElement('div', {style:{padding:'.75rem 1rem',background:'var(--bg2)',borderLeft:'3px solid var(--red)',borderRadius:'var(--radius-sm)'}},
      React.createElement('div', {style:{fontSize:'var(--t-sm)',fontWeight:700,color:'var(--red)',marginBottom:'.25rem'}}, '⚠ Cashflow alert'),
      React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text2)',lineHeight:1.6}},
        'You spent ' + fmt(deficit) + ' more than you earned this ' + periodLabel + '. ' +
        (mode === 'month' ? 'If this pattern continues for 12 months, that\'s ' + fmt(deficit*12) + ' coming from savings or borrowing. ' : '') +
        'To break even, either earn ' + fmt(deficit) + ' more or cut ' + fmt(deficit) + ' from spending.')
    ),
    net >= 0 && income > 0 && net < income * 0.1 && React.createElement('div', {style:{padding:'.75rem 1rem',background:'var(--bg2)',borderLeft:'3px solid var(--gold)',borderRadius:'var(--radius-sm)'}},
      React.createElement('div', {style:{fontSize:'var(--t-sm)',fontWeight:700,color:'var(--gold)',marginBottom:'.25rem'}}, '⚡ Tight margins'),
      React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text2)',lineHeight:1.6}},
        'Only saving ' + (net/income*100).toFixed(1) + '% of income this ' + periodLabel + ' — any unexpected expense would push you negative. Healthy buffer is 10-20% surplus.')
    ),
    net >= 0 && income > 0 && net >= income * 0.1 && React.createElement('div', {style:{padding:'.75rem 1rem',background:'var(--bg2)',borderLeft:'3px solid var(--green)',borderRadius:'var(--radius-sm)'}},
      React.createElement('div', {style:{fontSize:'var(--t-sm)',fontWeight:700,color:'var(--green)',marginBottom:'.25rem'}}, '✓ Healthy surplus'),
      React.createElement('div', {style:{fontSize:'var(--t-xs)',color:'var(--text2)',lineHeight:1.6}},
        'Saving ' + fmt(net) + ' at ' + (net/income*100).toFixed(1) + '% of income this ' + periodLabel +
        (mode === 'month' ? '. Over a year that\'s ' + fmt(net*12) + ' — direct that to your house deposit, emergency fund, or Nepal goals.' : '.'))
    )
  );
}

// ── 6. Category Month Trend ────────────────────────────────────
function CategoryMonthChart({ allTxns, rec }) {
  const { allCats, allExpenseCats } = useTxn();
  const [selected, setSelected] = useState(() => new Set(allExpenseCats));

  useEffect(() => {
    setSelected(prev => {
      const next = new Set([...prev].filter(c => allExpenseCats.includes(c)));
      allExpenseCats.forEach(c => { if (!prev.has(c) && !prev.size) next.add(c); });
      return next.size ? next : new Set(allExpenseCats);
    });
  }, [allExpenseCats.join(',')]);

  const months = useMemo(() => [...new Set(allTxns.map(t => t.date.slice(0,7)))].sort(), [allTxns]);

  const data = useMemo(() => months.map(ym => {
    const row = { month: new Date(ym+'-01').toLocaleDateString('en-AU',{month:'short',year:'2-digit'}) };
    const txns = allTxns.filter(t => t.date.slice(0,7) === ym);
    allExpenseCats.forEach(cat => {
      row[cat] = parseFloat(txns.filter(t => isExpenseTxn(t,rec) && t.category===cat).reduce((s,t)=>s+Math.abs(t.amount),0).toFixed(2));
    });
    return row;
  }), [months, allTxns, allExpenseCats, rec]);

  const activeCats = allExpenseCats.filter(c => selected.has(c));

  function toggle(cat) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  if (months.length < 2) return null;

  return React.createElement('div', {className:'chart-card'},
    React.createElement('div', {style:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'.5rem',marginBottom:'.75rem'}},
      React.createElement('div', null,
        React.createElement('div', {className:'chart-title',style:{margin:0}}, '📅 Spending by Category — Monthly'),
        React.createElement('p', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginTop:'.2rem'}}, 'Toggle categories to compare month-over-month trends')
      ),
      React.createElement('div', {style:{display:'flex',gap:'.4rem'}},
        React.createElement('button', {onClick:()=>setSelected(new Set(allExpenseCats)),style:{background:'none',border:'1px solid var(--border)',color:'var(--text3)',cursor:'pointer',fontSize:'var(--t-xs)',padding:'.2rem .5rem',borderRadius:'var(--radius-sm)'}}, 'All'),
        React.createElement('button', {onClick:()=>setSelected(new Set()),style:{background:'none',border:'1px solid var(--border)',color:'var(--text3)',cursor:'pointer',fontSize:'var(--t-xs)',padding:'.2rem .5rem',borderRadius:'var(--radius-sm)'}}, 'None'),
      )
    ),
    React.createElement('div', {style:{display:'flex',flexWrap:'wrap',gap:'.35rem',marginBottom:'1rem'}},
      ...allExpenseCats.map(cat => {
        const c = allCats[cat] || {color:'#94a3b8',icon:'•'};
        const on = selected.has(cat);
        return React.createElement('button', {
          key:cat, onClick:()=>toggle(cat),
          style:{padding:'.25rem .55rem',borderRadius:'1rem',border:'1px solid '+(on?c.color:'var(--border)'),
            background:on?c.color+'22':'transparent',color:on?c.color:'var(--text3)',
            cursor:'pointer',fontSize:'var(--t-xs)',fontWeight:on?600:400,transition:'all .15s'}
        }, c.icon+' '+cat);
      })
    ),
    activeCats.length === 0
      ? React.createElement('div', {style:{textAlign:'center',color:'var(--text3)',fontSize:'var(--t-sm)',padding:'2rem'}}, 'Select at least one category.')
      : React.createElement(ResponsiveContainer, {width:'100%',height:280},
          React.createElement(LineChart, {data, margin:{top:4,right:16,bottom:40,left:8}},
            React.createElement(CartesianGrid, {strokeDasharray:'3 3',stroke:'var(--border)'}),
            React.createElement(XAxis, {dataKey:'month',tick:{fill:'var(--chart-text)',fontSize:11},angle:-35,textAnchor:'end',interval:0,height:50}),
            React.createElement(YAxis, {tickFormatter:v=>'$'+(v>=1000?(v/1000).toFixed(1)+'k':v.toFixed(0)),tick:{fill:'var(--chart-text)',fontSize:11},axisLine:false,tickLine:false}),
            React.createElement(Tooltip, {
              formatter:(v,name)=>v>0?['$'+v.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2}),name]:null,
              contentStyle:{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',fontSize:'var(--t-xs)',color:'#fff'},
              itemStyle:{color:'#fff'},labelStyle:{color:'#fff',fontWeight:700}
            }),
            ...activeCats.map(cat => {
              const c = allCats[cat] || {color:'#94a3b8'};
              return React.createElement(Line, {key:cat,type:'monotone',dataKey:cat,stroke:c.color,strokeWidth:2,dot:{r:3,fill:c.color},activeDot:{r:5}});
            })
          )
        )
  );
}

// ── Main Analysis Tab ──────────────────────────────────────────
function AnalysisTab({ txns, rec, allTxns }) {
  return React.createElement('div', null,
    React.createElement(CashRunway, {allTxns, rec}),
    React.createElement(CategoryMonthChart, {allTxns, rec}),
    React.createElement(WaterfallChart, {txns, rec}),
    React.createElement(FixedVsVariable, {txns, rec}),

    React.createElement(BNPLExposure, {allTxns, rec}),
    React.createElement(RecurringDetector, {allTxns})
  );
}

function CashflowDashboard() {
  const { T, rec, updateBudget, deleteMonth } = useTxn();
  const allTxns = T.transactions || [];
  const months = useMemo(() => [...new Set(allTxns.map(t => t.date.slice(0,7)))].sort().reverse(), [allTxns]);
  const [selMonth, setSelMonth] = useState(() => months[0]||'');
  const [tab, setTab] = useState(() => { try { return localStorage.getItem('FP_CF_Tab') || 'overview'; } catch (e) { return 'overview'; }});
  const [filterCat, setFilterCat] = useState('All');
  useEffect(() => { try { localStorage.setItem('FP_CF_Tab', tab); } catch (e) {}}, [tab]);
  useEffect(() => { if (months.length > 0 && !months.includes(selMonth)) setSelMonth(months[0]); }, [months.join(',')]);

  const monthTxns = useMemo(() => allTxns.filter(t => t.date.slice(0,7) === selMonth), [allTxns, selMonth]);
  const monthLabel = selMonth ? new Date(selMonth+'-01').toLocaleDateString('en-AU',{month:'long',year:'numeric'}) : '';
  if (!months.length) return null;

  function drillCategory(cat) {
    setFilterCat(cat);
    setTab('transactions');
    setTimeout(() => window.scrollTo({top:0,behavior:'smooth'}), 50);
  }

  const CF_TABS = [{id:'overview',label:'📊 Overview'},{id:'analysis',label:'🔬 Analysis'},{id:'transactions',label:'🧾 Transactions'},{id:'audit',label:'🔍 Audit'},{id:'budget',label:'🎯 Budget'}];
  const fmtMonth = ym => new Date(ym+'-01').toLocaleDateString('en-AU',{month:'short',year:'numeric'});

  return React.createElement('div', null,
    React.createElement('div', {style:{display:'flex',gap:'.5rem',flexWrap:'wrap',marginBottom:'1.25rem',alignItems:'center'}},
      React.createElement('span', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em',marginRight:'.25rem'}}, 'Month:'),
      months.length <= 8
        ? React.createElement(React.Fragment, null, ...months.map(m => React.createElement('button', {key:m,className:'subnav-btn'+(m===selMonth?' active':''),onClick:()=>setSelMonth(m)}, fmtMonth(m))))
        : React.createElement('select', {className:'input-field',style:{flex:'0 1 auto',width:'auto',minWidth:'180px',padding:'.35rem .55rem'},value:selMonth,onChange:e=>setSelMonth(e.target.value)},
            ...months.map(m => React.createElement('option', {key:m,value:m}, fmtMonth(m)+' ('+allTxns.filter(t=>t.date.slice(0,7)===m).length+' txns)'))
          ),
      React.createElement('button', {onClick:()=>{if(confirm('Delete all '+monthLabel+' transactions?')) deleteMonth(selMonth);},style:{marginLeft:'auto',background:'none',border:'1px solid var(--border)',color:'var(--text3)',cursor:'pointer',fontSize:'var(--t-xs)',padding:'.3rem .6rem',borderRadius:'var(--radius-sm)',whiteSpace:'nowrap'}}, '🗑️ Delete month')
    ),
    React.createElement(CfSummaryCards, {txns:monthTxns, rec}),
    React.createElement('nav', {className:'subnav'},
      ...CF_TABS.map(t => React.createElement('button', {key:t.id,className:'subnav-btn'+(tab===t.id?' active':''),onClick:()=>setTab(t.id)}, t.label))
    ),
    tab==='overview' && React.createElement('div', null,
      React.createElement(SpendByCategory, {txns:monthTxns, rec, budgets:T.budgets||{}, onDrillCategory:drillCategory}),
      React.createElement(MonthTrend, {allTxns, rec}),
      React.createElement(InsightsPanel, {txns:monthTxns, rec, selectedMonth:monthLabel})
    ),
    tab==='analysis' && React.createElement(AnalysisTab, {txns:monthTxns, rec, allTxns}),
    tab==='transactions' && React.createElement(TransactionTable, {txns:monthTxns, rec, filterCat, setFilterCat, allTxnsForAcct:allTxns}),
    tab==='audit' && React.createElement(ReconciliationAudit, {txns:monthTxns, rec}),
    tab==='budget' && React.createElement(BudgetTab, {txns:monthTxns, rec, budgets:T.budgets||{}, onUpdate:updateBudget})
  );
}

function CashflowTracker() {
  const { T, clearAll } = useTxn();
  const [showUpload, setShowUpload] = useState(false);
  const hasTxns = (T.transactions||[]).length > 0;
  return React.createElement('div', null,
    React.createElement('div', {style:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem'}},
      React.createElement('div', null,
        React.createElement('h1', {className:'page-title'}, 'Monthly Cash Flow'),
        React.createElement('p', {className:'page-subtitle'}, 'CommBank · Macquarie · Westpac · Auto-reconciled · No double-counting')
      ),
      hasTxns && React.createElement('div', {style:{display:'flex',gap:'.5rem',flexWrap:'wrap'}},
        React.createElement('button', {className:'subnav-btn'+(showUpload?' active':''),onClick:()=>setShowUpload(o=>!o)}, showUpload?'✕ Close':'📂 Upload More Files'),
        React.createElement('button', {onClick:()=>{if(confirm('Delete ALL transaction data? This cannot be undone.')) clearAll();},style:{background:'none',border:'1px solid var(--border)',color:'var(--text3)',cursor:'pointer',fontSize:'var(--t-xs)',padding:'.4rem .75rem',borderRadius:'var(--radius-sm)'}}, 'Clear All')
      )
    ),
    (!hasTxns || showUpload) && React.createElement('div', {style:{marginBottom:'1.5rem'}}, React.createElement(UploadZone, {onDone:()=>setShowUpload(false)})),
    !hasTxns && React.createElement('div', {style:{textAlign:'center',padding:'3rem 2rem',color:'var(--text3)'}},
      React.createElement('div', {style:{fontSize:'3rem',marginBottom:'1rem'}}, '📊'),
      React.createElement('div', {style:{fontFamily:"'Syne',sans-serif",fontSize:'var(--t-xl)',fontWeight:700,marginBottom:'.5rem',color:'var(--text)'}}, 'No transactions yet'),
      React.createElement('div', {style:{fontSize:'var(--t-sm)'}}, 'Upload your CommBank, Macquarie or Westpac CSV exports to get started')
    ),
    hasTxns && React.createElement(CashflowDashboard, null)
  );
}

function CashflowTrackerConnected() {
  return React.createElement(TxnProvider, null, React.createElement(CashflowTracker, null));
}

