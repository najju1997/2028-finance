const DEFAULTS = {
  dates:{yourSalRise:202607,wifeP2:202607,wifeP3:202707,extraEnd:202611,expDrop:202707,
    childcareStart:202707,ccsStart:202711,lodge485:202707,agentPay:202708,carMonth:202706,
    prGrant:202711,tuit1:202607,tuit2:202701,tax1:202607,tax2:202707,tax3:202807},
  income:{yourSalLow:800,yourSalHigh:1323,wifeP1:736,wifeP2:944,wifeP3:1500,extraYou:630,freelance:100},
  savings:{acctA:5500,acctB:11500,macRate:0.045},
  expenses:{expWk:1300,expWkPost:950,carCost:10000,carRun:175},
  childcare:{dailyRate:180,discount:0.30,ccsRate:0.72,days:5},
  tax:{workDedYou:1500,workDedWife:1500,bracketIndex:0},
  nepal:{noInt:40,fixed12:20,mktYou:30,mktWife:10,nrsRate:0.04,exchange:95,exchangeAuto:false,exchangeLoading:false},
  oneoff:{tuit1:9500,tuit2:9500,v485pri:4770,v485sec:2385,v485adm:500,oshc:1200,
    skills:600,english:400,police:200,medicals:600,agent:3000,skills2:300,prPri:4640,prSec:2330,stateNom:300},
  extraIncomes:[],extraExpenses:[],extraOneoffs:[]
};

const FC = createContext(null);
function FinanceProvider({children}) {
  const { schedulePush, hydrated } = useSync();
  const [A, setA] = useState(() => {
    try { const s = localStorage.getItem('FinancePlan_A'); if(s) {
      const parsed = JSON.parse(s);
      if(!parsed.tax) parsed.tax = DEFAULTS.tax;
      if(parsed.tax.workDedYou === undefined) parsed.tax = {...DEFAULTS.tax, ...parsed.tax};
      return {...DEFAULTS, ...parsed, tax:{...DEFAULTS.tax, ...parsed.tax}};
    }} catch(e){}
    return DEFAULTS;
  });

  // Re-hydrate when sync layer pulls fresh data
  useEffect(() => {
    if(!hydrated) return;
    try { const s = localStorage.getItem('FinancePlan_A'); if(s) {
      const parsed = JSON.parse(s);
      if(!parsed.tax) parsed.tax = DEFAULTS.tax;
      if(parsed.tax.workDedYou === undefined) parsed.tax = {...DEFAULTS.tax, ...parsed.tax};
      setA({...DEFAULTS, ...parsed, tax:{...DEFAULTS.tax, ...parsed.tax}});
    }} catch(e){}
  }, [hydrated]);

  useEffect(() => {
    localStorage.setItem('FinancePlan_A', JSON.stringify(A));
    schedulePush();
  }, [A, schedulePush]);

  const update = useCallback((sec, key, val) => setA(p => ({...p, [sec]:{...p[sec], [key]:val}})), []);
  const WPM = 365.25/12/7;
  const actualByMonth = useActualByMonth();

  const fetchRate = useCallback(async () => {
    update('nepal','exchangeLoading',true);
    try {
      const r = await fetch('https://api.exchangerate-api.com/v4/latest/AUD');
      if(r.ok){ const d=await r.json(); if(d.rates&&d.rates.NPR){
        const rate=parseFloat(d.rates.NPR.toFixed(2));
        setA(p=>({...p,nepal:{...p.nepal,exchange:rate,exchangeAuto:true,exchangeLoading:false}}));
        return;
      }}
    } catch(e){}
    try {
      const r2 = await fetch('https://api.frankfurter.app/latest?from=AUD&to=NPR');
      if(r2.ok){ const d2=await r2.json(); if(d2.rates&&d2.rates.NPR){
        const rate=parseFloat(d2.rates.NPR.toFixed(2));
        setA(p=>({...p,nepal:{...p.nepal,exchange:rate,exchangeAuto:true,exchangeLoading:false}}));
        return;
      }}
    } catch(e){}
    update('nepal','exchangeLoading',false);
  }, [update]);

  const compute = useCallback(() => {
    const {dates,income,savings,expenses,childcare,tax,oneoff,extraIncomes,extraExpenses,extraOneoffs} = A;
    const ccNopr = childcare.dailyRate*(1-childcare.discount);
    const ccPr = childcare.dailyRate*(1-childcare.discount)*(1-childcare.ccsRate);
    const oo = {};
    const add = (ym,v) => { oo[ym] = (oo[ym]||0)+v; };
    add(dates.tuit1, oneoff.tuit1*1.1); add(dates.tuit2, oneoff.tuit2*1.1);
    const v485 = oneoff.v485pri+oneoff.v485sec+oneoff.v485adm+oneoff.oshc+oneoff.skills+oneoff.english+oneoff.police+oneoff.medicals;
    add(dates.lodge485, v485*1.1);
    add(dates.agentPay, (oneoff.agent+oneoff.skills2)*1.1);
    add(dates.carMonth, expenses.carCost*1.1);
    add(dates.prGrant, (oneoff.prPri+oneoff.prSec+oneoff.stateNom)*1.1);
    (extraOneoffs||[]).forEach(x => { if(x.ym && x.amount) add(x.ym, x.amount*(1+(x.buffer||10)/100)); });

    function fyRefund(youAnnual, wifeAnnual) {
      return tax.workDedYou * marginalRate(youAnnual) + tax.workDedWife * marginalRate(wifeAnnual);
    }
    const taxMap = {};
    taxMap[dates.tax1] = fyRefund(income.yourSalLow*52 + income.extraYou*26, income.wifeP1*52);
    taxMap[dates.tax2] = fyRefund(income.yourSalHigh*52, income.wifeP2*52 + income.freelance*52);
    taxMap[dates.tax3] = fyRefund(income.yourSalHigh*52, income.wifeP3*52 + income.freelance*52);

    const rows = []; let balA = savings.acctA, balB = savings.acctB; let y=2026, m=6;
    const ML = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    while(y*100+m <= 202807){
      const ym = y*100+m;
      const yourSal = (ym<dates.yourSalRise?income.yourSalLow:income.yourSalHigh)*WPM;
      const wifeSal = (ym<dates.wifeP2?income.wifeP1:ym<dates.wifeP3?income.wifeP2:income.wifeP3)*WPM;
      const extra = ym<=dates.extraEnd ? income.extraYou*WPM : 0;
      const freelance = income.freelance*WPM;
      const extraInc = (extraIncomes||[]).filter(r=>r.fromYm&&r.toYm&&ym>=r.fromYm&&ym<=r.toYm)
        .reduce((s,r)=>s+(r.weekly?r.amount*WPM:r.amount),0);
      const intA = Math.max(0,balA)*savings.macRate/12;
      const intB = Math.max(0,balB)*savings.macRate/12;
      const taxRet = taxMap[ym] || 0;
      const totalInc = yourSal+wifeSal+extra+freelance+extraInc+intA+intB+taxRet;
      const living = (ym<dates.expDrop?expenses.expWk:expenses.expWkPost)*WPM;
      const carRun = ym>=dates.carMonth ? expenses.carRun*WPM : 0;
      const cc = ym<dates.childcareStart ? 0 : ym<dates.ccsStart ? ccNopr*childcare.days*WPM : ccPr*childcare.days*WPM;
      const extraExp = (extraExpenses||[]).filter(r=>r.fromYm&&r.toYm&&ym>=r.fromYm&&ym<=r.toYm)
        .reduce((s,r)=>s+(r.weekly?r.amount*WPM:r.amount),0);
      const ooThis = oo[ym] || 0;
      const totalExp = living+carRun+cc+extraExp+ooThis;
      const netB = totalInc - totalExp - intA; // Account B net flow (intA stays in A)
      const ymStr = String(y)+'-'+String(m).padStart(2,'0');
      const actual = actualByMonth[ymStr];
      const netReal = actual ? actual.income - actual.expense : null;
      // Once a month has real Monthly Cash data, the running balance carries
      // forward what actually happened instead of the pure projection, so
      // every later month (and the final wealth total) reflects reality
      // where it's known, rather than assuming the plan was hit exactly.
      balA += intA;
      balB += (netReal !== null ? netReal : netB);
      rows.push({ym, label:ML[m-1]+'-'+String(y).slice(2), yourSal, wifeSal, extra, freelance, extraInc,
        intA, intB, taxRet, totalInc, living, carRun, cc, extraExp, ooThis, totalExp,
        net: netB+intA, netReal, balA, balB, total: balA+balB});
      m++; if(m>12){ m=1; y++; }
    }
    return rows;
  }, [A, actualByMonth]);

  const nepalCalc = useCallback(() => {
    const {nepal} = A;
    const yrs = (new Date('2028-07-19')-new Date('2026-05-19'))/(365.25*24*3600*1000);
    const noInt = nepal.noInt*1e5;
    const fixed = nepal.fixed12*1e5*Math.pow(1.12,yrs);
    const mktYou = nepal.mktYou*1e5*Math.pow(1+nepal.nrsRate,yrs);
    const mktWife = nepal.mktWife*1e5*Math.pow(1+nepal.nrsRate,yrs);
    const total = noInt+fixed+mktYou+mktWife;
    return {noInt,fixed,mktYou,mktWife,total,totalAUD:total/nepal.exchange,years:yrs};
  }, [A]);

  return React.createElement(FC.Provider, {value:{A,setA,update,compute,nepalCalc,fetchRate}}, children);
}
const useFinance = () => useContext(FC);

const TT = ({active,payload,label}) => {
  if(!active || !payload?.length) return null;
  return React.createElement('div', {style:{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',padding:'.6rem .9rem',fontSize:'var(--t-xs)'}},
    React.createElement('p', {style:{color:'var(--gold)',fontFamily:"'Syne',sans-serif",fontWeight:700,marginBottom:'.3rem'}}, label),
    ...payload.map(p => React.createElement('p', {key:p.dataKey, style:{color:p.color}}, p.name+': '+fmt(p.value)))
  );
};

function Section({icon,title,children,open:init=true}) {
  const [open,setOpen] = useState(init);
  return React.createElement('div', {className:'section-card'},
    React.createElement('div', {className:'section-header', onClick:()=>setOpen(o=>!o)},
      React.createElement('div', {className:'section-icon'}, React.createElement(Icon,{name:icon,size:18})),
      React.createElement('span', {className:'section-title'}, title),
      React.createElement('span', {className:'section-chevron', style:{display:'inline-flex',transform:open?'rotate(-90deg)':'rotate(90deg)',transition:'transform .2s'}}, React.createElement(Icon,{name:'chevron-right',size:14}))
    ),
    open && React.createElement('div', {className:'section-body'}, children)
  );
}

function Field({label,hint,value,onChange,prefix=false,pct=false}) {
  const [raw,setRaw] = useState('');
  const [focus,setFocus] = useState(false);
  const displayed = focus ? raw : (pct ? (value*100).toFixed(2) : String(value));
  const inp = React.createElement('input', {
    type:'text', inputMode:'decimal',
    className:'input-field'+(prefix?' has-prefix':''),
    value: displayed,
    onFocus: e => { const s = pct?(value*100).toFixed(2):String(value); setRaw(s); setFocus(true); setTimeout(()=>e.target.select(),0); },
    onChange: e => setRaw(e.target.value),
    onBlur: () => { const v = parseFloat(raw.replace(/[^0-9.\-]/g,'')); if(!isNaN(v)) onChange(pct?v/100:v); setFocus(false); }
  });
  return React.createElement('div', {className:'input-group'},
    React.createElement('label', {className:'input-label'}, label),
    prefix ? React.createElement('div', {className:'input-wrap'}, React.createElement('span',{className:'input-prefix'},'$'), inp) : inp,
    hint && React.createElement('span', {className:'input-hint'}, hint)
  );
}

function DateField({label,hint,value,onChange}) {
  return React.createElement('div', {className:'input-group'},
    React.createElement('label', {className:'input-label'}, label),
    React.createElement('input', {type:'month', className:'input-field', value:ymStr(value),
      onChange: e => { const v = strYm(e.target.value); if(v>0) onChange(v); }}),
    hint && React.createElement('span', {className:'input-hint'}, hint)
  );
}

const G = (...c) => React.createElement('div', {className:'input-grid'}, ...c);
const SL = t => React.createElement('p', {className:'input-sub-label'}, t);

function DynFieldCell({label,value,prefix,onCommit}) {
  const [raw,setRaw] = useState('');
  const [focus,setFocus] = useState(false);
  const disp = focus ? raw : String(value??'');
  const inp = React.createElement('input', {type:'text', inputMode:'decimal',
    className:'input-field'+(prefix?' has-prefix':''), value:disp,
    onFocus: e => { setRaw(String(value??'')); setFocus(true); setTimeout(()=>e.target.select(),0); },
    onChange: e => setRaw(e.target.value),
    onBlur: () => { const v = parseFloat(raw.replace(/[^0-9.\-]/g,'')); if(!isNaN(v)) onCommit(v); setFocus(false); }
  });
  return React.createElement('div', {className:'input-group'},
    React.createElement('label', {className:'input-label'}, label),
    prefix ? React.createElement('div', {className:'input-wrap'}, React.createElement('span',{className:'input-prefix'},'$'), inp) : inp
  );
}

function DynRowItem({row,onUpdate,onRemove,fields}) {
  return React.createElement('div', {className:'dyn-row'},
    ...fields.map(f => {
      if(f.type==='text') return React.createElement('div', {key:f.key, className:'input-group'},
        React.createElement('label', {className:'input-label'}, f.label),
        React.createElement('input', {type:'text', className:'input-field', value:row[f.key]||'', onChange: e=>onUpdate(f.key, e.target.value)})
      );
      if(f.type==='date') return React.createElement('div', {key:f.key, className:'input-group'},
        React.createElement('label', {className:'input-label'}, f.label),
        React.createElement('input', {type:'month', className:'input-field', value:ymStr(row[f.key]||202606),
          onChange: e => { const v = strYm(e.target.value); if(v>0) onUpdate(f.key, v); }})
      );
      if(f.type==='select') return React.createElement('div', {key:f.key, className:'input-group'},
        React.createElement('label', {className:'input-label'}, f.label),
        React.createElement('select', {className:'input-field', value:String(row[f.key]),
          onChange: e => onUpdate(f.key, e.target.value==='true')},
          React.createElement('option', {value:'true'}, 'Weekly'),
          React.createElement('option', {value:'false'}, 'Monthly')
        )
      );
      return React.createElement(DynFieldCell, {key:f.key, label:f.label, value:row[f.key], prefix:f.prefix, onCommit: v => onUpdate(f.key, v)});
    }),
    React.createElement('div', {className:'input-group', style:{justifyContent:'flex-end'}},
      React.createElement('label', {className:'input-label'}, '\u00a0'),
      React.createElement('button', {className:'btn-remove', onClick:onRemove}, React.createElement(Icon,{name:'x',size:14}))
    )
  );
}

function DynList({items,onChange,fields,addLabel,newItem}) {
  return React.createElement('div', null,
    ...(items||[]).map((row,i) => React.createElement(DynRowItem, {
      key:row.id||i, row, fields,
      onUpdate:(k,v) => onChange((items||[]).map(r => r.id===row.id ? {...r,[k]:v} : r)),
      onRemove: () => onChange((items||[]).filter(r => r.id !== row.id))
    })),
    React.createElement('button', {className:'btn-add', onClick:()=>onChange([...(items||[]),{...newItem,id:Date.now()}])}, '+ '+addLabel)
  );
}

function Assumptions({onGo}) {
  const {A,update,setA,fetchRate} = useFinance();
  const u = (s,k) => v => update(s,k,v);
  const {dates,income,savings,expenses,childcare,tax,nepal,oneoff,extraIncomes,extraExpenses,extraOneoffs} = A;
  return React.createElement('div', null,
    React.createElement('h1', {className:'page-title'}, 'Assumptions'),
    React.createElement('p', {className:'page-subtitle'}, 'Edit any value freely. Saved automatically and synced across devices.'),

    React.createElement(Section, {icon:'calendar', title:'Key Dates'}, G(
      React.createElement(DateField, {label:'Your Salary Rises', hint:'$800→$1,323/wk', value:dates.yourSalRise, onChange:u('dates','yourSalRise')}),
      React.createElement(DateField, {label:'Wife Salary Phase 2', hint:'$736→$944/wk', value:dates.wifeP2, onChange:u('dates','wifeP2')}),
      React.createElement(DateField, {label:'Wife Salary Phase 3', hint:'$944→$1,500/wk', value:dates.wifeP3, onChange:u('dates','wifeP3')}),
      React.createElement(DateField, {label:'Your Extra Income Ends', value:dates.extraEnd, onChange:u('dates','extraEnd')}),
      React.createElement(DateField, {label:'Expenses Drop', hint:'$1,300→$950/wk', value:dates.expDrop, onChange:u('dates','expDrop')}),
      React.createElement(DateField, {label:'Childcare Starts', value:dates.childcareStart, onChange:u('dates','childcareStart')}),
      React.createElement(DateField, {label:'CCS Starts (after PR)', value:dates.ccsStart, onChange:u('dates','ccsStart')}),
      React.createElement(DateField, {label:'485 Visa Lodgement', value:dates.lodge485, onChange:u('dates','lodge485')}),
      React.createElement(DateField, {label:'Agent Fees Paid', value:dates.agentPay, onChange:u('dates','agentPay')}),
      React.createElement(DateField, {label:'Car Purchase Month', value:dates.carMonth, onChange:u('dates','carMonth')}),
      React.createElement(DateField, {label:'PR Grant Month', value:dates.prGrant, onChange:u('dates','prGrant')}),
      React.createElement(DateField, {label:'Tuition Payment 1', value:dates.tuit1, onChange:u('dates','tuit1')}),
      React.createElement(DateField, {label:'Tuition Payment 2', value:dates.tuit2, onChange:u('dates','tuit2')}),
    )),

    React.createElement(Section, {icon:'dollar-sign', title:'Your Salary'},
      G(
        React.createElement(Field, {label:'Salary at Age 31', value:income.yourSalLow, onChange:u('income','yourSalLow'), prefix:true}),
        React.createElement(Field, {label:'Salary at Age 32', value:income.yourSalHigh, onChange:u('income','yourSalHigh'), prefix:true}),
        React.createElement(Field, {label:'Your Extra Income /wk', value:income.extraYou, onChange:u('income','extraYou'), prefix:true}),
      ),
      SL('ADDITIONAL INCOME STREAMS'),
      React.createElement(DynList, {items:extraIncomes,
        onChange: v => setA(p=>({...p,extraIncomes:v})),
        addLabel:'Add Income Stream',
        newItem:{label:'',amount:0,fromYm:202606,toYm:202807,weekly:true},
        fields:[
          {key:'label',label:'Label',type:'text'},
          {key:'amount',label:'Amount',prefix:true},
          {key:'fromYm',label:'From',type:'date'},
          {key:'toYm',label:'To',type:'date'},
          {key:'weekly',label:'Frequency',type:'select'},
        ]})
    ),

    React.createElement(Section, {icon:'user', title:'Wife Salary'},
      G(
        React.createElement(Field, {label:'Wife Salary Ph.1 /wk', value:income.wifeP1, onChange:u('income','wifeP1'), prefix:true}),
        React.createElement(Field, {label:'Wife Salary Ph.2 /wk', hint:'During masters', value:income.wifeP2, onChange:u('income','wifeP2'), prefix:true}),
        React.createElement(Field, {label:'Wife Salary Ph.3 /wk', hint:'After PR', value:income.wifeP3, onChange:u('income','wifeP3'), prefix:true}),
        React.createElement(Field, {label:'Wife Freelance /wk', value:income.freelance, onChange:u('income','freelance'), prefix:true}),
      )
    ),

    React.createElement(Section, {icon:'bank', title:'Savings Accounts (AUD)'}, G(
      React.createElement(Field, {label:'Account A – Term Savings', hint:'Compounds at 4.5%', value:savings.acctA, onChange:u('savings','acctA'), prefix:true}),
      React.createElement(Field, {label:'Account B – Spending Acct', hint:'All surplus + draws', value:savings.acctB, onChange:u('savings','acctB'), prefix:true}),
      React.createElement(Field, {label:'Macquarie Rate p.a.', value:savings.macRate, onChange:u('savings','macRate'), pct:true}),
    )),

    React.createElement(Section, {icon:'shopping-cart', title:'Living Expenses (weekly, all-in incl. rent)'},
      G(
        React.createElement(Field, {label:'Weekly Expenses Ph.1', hint:'Rent, food, transport', value:expenses.expWk, onChange:u('expenses','expWk'), prefix:true}),
        React.createElement(Field, {label:'Weekly Expenses Ph.2', value:expenses.expWkPost, onChange:u('expenses','expWkPost'), prefix:true}),
        React.createElement(Field, {label:'Car Purchase (one-off)', value:expenses.carCost, onChange:u('expenses','carCost'), prefix:true}),
        React.createElement(Field, {label:'Car Running /wk', value:expenses.carRun, onChange:u('expenses','carRun'), prefix:true}),
      ),
      SL('ADDITIONAL RECURRING EXPENSES'),
      React.createElement(DynList, {items:extraExpenses,
        onChange: v => setA(p=>({...p,extraExpenses:v})),
        addLabel:'Add Expense',
        newItem:{label:'',amount:0,fromYm:202606,toYm:202807,weekly:true},
        fields:[
          {key:'label',label:'Label',type:'text'},
          {key:'amount',label:'Amount',prefix:true},
          {key:'fromYm',label:'From',type:'date'},
          {key:'toYm',label:'To',type:'date'},
          {key:'weekly',label:'Frequency',type:'select'},
        ]})
    ),

    React.createElement(Section, {icon:'baby', title:'Childcare – Uziel'},
      G(
        React.createElement(Field, {label:'Centre Daily Rate', value:childcare.dailyRate, onChange:u('childcare','dailyRate'), prefix:true}),
        React.createElement(Field, {label:'ECT Discount %', value:childcare.discount, onChange:u('childcare','discount'), pct:true}),
        React.createElement(Field, {label:'Govt CCS % (after PR)', value:childcare.ccsRate, onChange:u('childcare','ccsRate'), pct:true}),
        React.createElement(Field, {label:'Days per Week', value:childcare.days, onChange:u('childcare','days')}),
      ),
      React.createElement('div', {className:'info-box', style:{marginTop:'.75rem'}},
        React.createElement('p', null,
          'Gap (no CCS): ', React.createElement('strong',{style:{color:'var(--text)'}}, '$'+(childcare.dailyRate*(1-childcare.discount)).toFixed(2)+'/day'),
          '  ·  Gap (with CCS): ', React.createElement('strong',{style:{color:'var(--gold)'}}, '$'+(childcare.dailyRate*(1-childcare.discount)*(1-childcare.ccsRate)).toFixed(2)+'/day')
        )
      )
    ),

    React.createElement(Section, {icon:'bar-chart', title:'Tax Settings (Stage 3 ATO)', open:false},
      React.createElement('div', {className:'info-box', style:{marginBottom:'.75rem'}},
        React.createElement('p', null, 'Refund = work deductions × marginal tax rate, applied each July. Stage 3 brackets (16%/30%/37%/45%), LITO and Medicare handled automatically.')
      ),
      G(
        React.createElement(Field, {label:'Your Work Deductions /yr', hint:'Avg work expenses claimed', value:tax.workDedYou, onChange:u('tax','workDedYou'), prefix:true}),
        React.createElement(Field, {label:'Wife Work Deductions /yr', value:tax.workDedWife, onChange:u('tax','workDedWife'), prefix:true}),
        React.createElement(Field, {label:'Bracket Indexation /yr', hint:'0% = no indexation', value:tax.bracketIndex, onChange:u('tax','bracketIndex'), pct:true}),
      )
    ),

    React.createElement(Section, {icon:'mountain', title:'Nepal Savings (NRS)'},
      G(
        React.createElement(Field, {label:'No Interest (Lakh)', value:nepal.noInt, onChange:u('nepal','noInt')}),
        React.createElement(Field, {label:'Fixed 12% p.a. (Lakh)', value:nepal.fixed12, onChange:u('nepal','fixed12')}),
        React.createElement(Field, {label:'Market Rate – You (Lakh)', value:nepal.mktYou, onChange:u('nepal','mktYou')}),
        React.createElement(Field, {label:'Market Rate – Wife (Lakh)', value:nepal.mktWife, onChange:u('nepal','mktWife')}),
        React.createElement(Field, {label:'Nepal Rate p.a.', value:nepal.nrsRate, onChange:u('nepal','nrsRate'), pct:true}),
      ),
      React.createElement('div', {style:{marginTop:'1rem'}},
        React.createElement('label', {className:'input-label'}, 'AUD / NRS Exchange Rate'),
        React.createElement('div', {style:{display:'flex',gap:'.5rem',alignItems:'center',marginTop:'.3rem',flexWrap:'wrap'}},
          React.createElement('div', {className:'input-wrap', style:{flex:'0 0 140px'}},
            React.createElement('span', {className:'input-prefix'}, '₨'),
            React.createElement('input', {type:'text', inputMode:'decimal', className:'input-field has-prefix',
              value:nepal.exchange,
              onChange: e => { const v = parseFloat(e.target.value); if(!isNaN(v)) update('nepal','exchange',v); }})
          ),
          React.createElement('button', {className:'btn-fetch', onClick:fetchRate, disabled:nepal.exchangeLoading},
            nepal.exchangeLoading ? 'Fetching…' : React.createElement(IconLabel,{icon:'refresh'},'Get Live Rate')),
          nepal.exchangeAuto && React.createElement('span', {style:{fontSize:'var(--t-xs)',color:'var(--green)',fontWeight:600}}, React.createElement(IconLabel,{icon:'check',size:11},'Live'))
        )
      )
    ),

    React.createElement(Section, {icon:'clipboard', title:'One-Off Costs (from Acct B + 10% buffer)', open:false},
      React.createElement('div', {className:'info-box', style:{marginBottom:'1rem'}},
        React.createElement('p', null, 'Set to $0 if not applicable. 10% buffer auto-added.')
      ),
      SL('TUITION'), G(
        React.createElement(Field, {label:'Masters Sem 1', value:oneoff.tuit1, onChange:u('oneoff','tuit1'), prefix:true}),
        React.createElement(Field, {label:'Masters Sem 2', value:oneoff.tuit2, onChange:u('oneoff','tuit2'), prefix:true}),
      ),
      SL('485 VISA'), G(
        React.createElement(Field, {label:'485 – Primary', value:oneoff.v485pri, onChange:u('oneoff','v485pri'), prefix:true}),
        React.createElement(Field, {label:'485 – Secondary', value:oneoff.v485sec, onChange:u('oneoff','v485sec'), prefix:true}),
        React.createElement(Field, {label:'Admin / VAC', value:oneoff.v485adm, onChange:u('oneoff','v485adm'), prefix:true}),
        React.createElement(Field, {label:'OSHC Extension', value:oneoff.oshc, onChange:u('oneoff','oshc'), prefix:true}),
        React.createElement(Field, {label:'Skills Assessment', value:oneoff.skills, onChange:u('oneoff','skills'), prefix:true}),
        React.createElement(Field, {label:'English Test', value:oneoff.english, onChange:u('oneoff','english'), prefix:true}),
        React.createElement(Field, {label:'Police Clearances', value:oneoff.police, onChange:u('oneoff','police'), prefix:true}),
        React.createElement(Field, {label:'Medicals', value:oneoff.medicals, onChange:u('oneoff','medicals'), prefix:true}),
      ),
      SL('AGENT & MISC'), G(
        React.createElement(Field, {label:'Migration Agent', value:oneoff.agent, onChange:u('oneoff','agent'), prefix:true}),
        React.createElement(Field, {label:'Additional Skills', value:oneoff.skills2, onChange:u('oneoff','skills2'), prefix:true}),
      ),
      SL('PR APPLICATION'), G(
        React.createElement(Field, {label:'PR – Primary', value:oneoff.prPri, onChange:u('oneoff','prPri'), prefix:true}),
        React.createElement(Field, {label:'PR – Secondary', value:oneoff.prSec, onChange:u('oneoff','prSec'), prefix:true}),
        React.createElement(Field, {label:'State Nomination', value:oneoff.stateNom, onChange:u('oneoff','stateNom'), prefix:true}),
      ),
      SL('EXTRA ONE-OFF COSTS'),
      React.createElement(DynList, {items:extraOneoffs,
        onChange: v => setA(p=>({...p,extraOneoffs:v})),
        addLabel:'Add One-Off Cost',
        newItem:{label:'',amount:0,ym:202607,buffer:10},
        fields:[
          {key:'label',label:'Description',type:'text'},
          {key:'amount',label:'Amount',prefix:true},
          {key:'ym',label:'Month',type:'date'},
          {key:'buffer',label:'Buffer %'},
        ]})
    ),

    React.createElement('div', {className:'cta-row'},
      React.createElement('button', {className:'btn-primary', onClick:onGo, style:{display:'inline-flex',alignItems:'center',gap:'.3em'}}, 'View Results', React.createElement(Icon,{name:'chevron-right',size:14}))
    )
  );
}

function Summary({rows,nepal}) {
  const last = rows[rows.length-1];
  const {A} = useFinance();
  const totalOO = (Object.values(A.oneoff).reduce((a,b)=>a+b,0)+A.expenses.carCost)*1.1
    + ((A.extraOneoffs||[]).reduce((s,r)=>s+r.amount*(1+(r.buffer||10)/100),0));
  return React.createElement('div', null,
    React.createElement('div', {className:'stat-grid'},
      React.createElement('div', {className:'stat-card highlight'},
        React.createElement('div',{className:'stat-label'},'Total Wealth – July 2028'),
        React.createElement('div',{className:'stat-value'},fmt(last.total+nepal.totalAUD)),
        React.createElement('div',{className:'stat-sub'},'AUD savings + Nepal converted')),
      React.createElement('div', {className:'stat-card'},
        React.createElement('div',{className:'stat-label'},'Account A'),
        React.createElement('div',{className:'stat-value'},fmt(last.balA)),
        React.createElement('div',{className:'stat-sub'},'Term savings + 4.5%')),
      React.createElement('div', {className:'stat-card'},
        React.createElement('div',{className:'stat-label'},'Account B'),
        React.createElement('div',{className:'stat-value',style:{color:last.balB<0?'var(--red)':'var(--text)'}},fmt(last.balB)),
        React.createElement('div',{className:'stat-sub'},'All surplus + big draws')),
      React.createElement('div', {className:'stat-card'},
        React.createElement('div',{className:'stat-label'},'Nepal (AUD equiv.)'),
        React.createElement('div',{className:'stat-value'},fmt(nepal.totalAUD)),
        React.createElement('div',{className:'stat-sub'},fmtL(nepal.total)+' NRS')),
      React.createElement('div', {className:'stat-card'},
        React.createElement('div',{className:'stat-label'},'One-Off Costs'),
        React.createElement('div',{className:'stat-value neg'},fmt(-totalOO)),
        React.createElement('div',{className:'stat-sub'},'Visa, tuition, car, PR +10%')),
      React.createElement('div', {className:'stat-card'},
        React.createElement('div',{className:'stat-label'},'AUD/NRS Rate'),
        React.createElement('div',{className:'stat-value',style:{fontSize:'var(--t-lg)'}},A.nepal.exchange),
        React.createElement('div',{className:'stat-sub'},A.nepal.exchangeAuto?React.createElement(IconLabel,{icon:'check',size:11},'Live rate'):'Manual')),
    ),
    React.createElement('div', {className:'chart-card'},
      React.createElement('div',{className:'chart-title'},'Account Balances Over Time'),
      React.createElement(ResponsiveContainer, {width:'100%',height:280},
        React.createElement(LineChart, {data:rows,margin:{top:8,right:16,bottom:0,left:8}},
          React.createElement(CartesianGrid, {strokeDasharray:'3 3',stroke:'var(--border)'}),
          React.createElement(XAxis, {dataKey:'label',tick:{fill:'var(--text3)',fontSize:11},tickLine:false}),
          React.createElement(YAxis, {tickFormatter:v=>'$'+(v/1000).toFixed(0)+'k',tick:{fill:'var(--text3)',fontSize:11},tickLine:false,axisLine:false}),
          React.createElement(Tooltip, {content:React.createElement(TT)}),
          React.createElement(ReferenceLine, {y:0,stroke:'var(--red)',strokeDasharray:'4 2'}),
          React.createElement(Line, {type:'monotone',dataKey:'balA',name:'Acct A',stroke:'var(--green)',strokeWidth:2,dot:false}),
          React.createElement(Line, {type:'monotone',dataKey:'balB',name:'Acct B',stroke:'var(--gold)',strokeWidth:2,dot:false}),
          React.createElement(Line, {type:'monotone',dataKey:'total',name:'Total AUD',stroke:'var(--blue)',strokeWidth:2.5,dot:false}),
          React.createElement(Legend, {wrapperStyle:{fontSize:'var(--t-xs)',color:'var(--text2)'}})
        )
      )
    ),
    React.createElement(Section, {icon:'target',title:'Milestone Timeline'},
      React.createElement('div', {className:'timeline'},
        ...[
          {m:'Jun-26',d:'warn',t:'Model starts. Your salary $800/wk. Wife $736/wk. Extra $630/wk active.'},
          {m:'Jul-26',d:'warn',t:'Your salary → $1,323/wk. Wife → $944/wk (masters starts). Tuition Sem 1 from Acct B.'},
          {m:'Nov-26',d:'warn',t:'Extra $630/wk stops.'},
          {m:'Jan-27',d:'warn',t:'Tuition Sem 2 ($9,500) from Account B.'},
          {m:'Jun-27',d:'warn',t:'Car $10,000 cash from Acct B. Wife finishes masters.'},
          {m:'Jul-27',d:'warn',icon:'alert-triangle',t:'BIGGEST HIT: 485 visa bundle. Childcare starts. Wife → $1,500/wk. Expenses → $950/wk.'},
          {m:'Aug-27',d:'',t:'Student visa expires → Bridging Visa A. Agent fees from Acct B.'},
          {m:'Nov-27',d:'ok',icon:'award',t:'PR GRANTED. PR fees from Acct B. CCS kicks in.'},
          {m:'Jul-28',d:'ok',icon:'target',t:'Target date. See total wealth above.'},
        ].map(({m,d,t,icon}) => React.createElement('div', {key:m,className:'tl-item'},
          React.createElement('div',{className:'tl-dot '+d}),
          React.createElement('div',{className:'tl-month'},m),
          React.createElement('div',{className:'tl-desc'}, icon ? React.createElement(IconLabel,{icon},t) : t)
        ))
      )
    )
  );
}

function Cashflow({rows}) {
  const { goToCashflowMonth } = useNav();
  return React.createElement('div', null,
    React.createElement('div', {className:'chart-card'},
      React.createElement('div',{className:'chart-title'},'Monthly Net Cashflow'),
      React.createElement(ResponsiveContainer, {width:'100%',height:240},
        React.createElement(BarChart, {data:rows,margin:{top:8,right:16,bottom:0,left:8}},
          React.createElement(CartesianGrid,{strokeDasharray:'3 3',stroke:'var(--border)'}),
          React.createElement(XAxis,{dataKey:'label',tick:{fill:'var(--text3)',fontSize:10},tickLine:false}),
          React.createElement(YAxis,{tickFormatter:v=>'$'+(v/1000).toFixed(0)+'k',tick:{fill:'var(--text3)',fontSize:11},tickLine:false,axisLine:false}),
          React.createElement(Tooltip,{content:React.createElement(TT)}),
          React.createElement(ReferenceLine,{y:0,stroke:'var(--text3)'}),
          React.createElement(Bar, {dataKey:'net',name:'Net',radius:[3,3,0,0]},
            ...rows.map((r,i)=>React.createElement(Cell,{key:i,fill:r.net>=0?'var(--green)':'var(--red)'}))
          )
        )
      )
    ),
    React.createElement('div', {className:'chart-card'},
      React.createElement('div',{className:'chart-title'},'Full Monthly Detail'),
      React.createElement('div', {className:'table-wrap'},
        React.createElement('table', {className:'data-table'},
          React.createElement('thead', null, React.createElement('tr', null,
            ...[
              {h:'Month'},{h:'Your Sal'},{h:'Wife Sal'},{h:'Extra'},{h:'Freelance'},{h:'Xtra Inc'},{h:'Interest'},{h:'Tax Ret'},{h:'Total In'},
              {h:'Living'},{h:'Car'},{h:'Childcare'},{h:'Xtra Exp'},{h:'One-offs'},{h:'Total Out'},
              {h:'Net', info:'Projected net cashflow for the month (Total In minus Total Out), based on your assumptions.'},
              {h:'Net Real', info:'Actual net cashflow for the month, from Monthly Cash: real income minus real expenses (reconciled internal transfers excluded). Shows "—" if you haven\'t imported Monthly Cash data for this month yet.'},
              {h:'Met?', info:'Green check if Net Real met or beat the projected Net; red cross if it fell short. "—" means no Monthly Cash data yet, so nothing to compare. Click the icon to jump to that month in Monthly Cash.'},
              {h:'Acct B'}
            ].map(({h,info}) => React.createElement('th',{key:h}, h,
              info && React.createElement(Icon,{name:'info',size:12,title:info,style:{marginLeft:'.3rem',cursor:'help',color:'var(--text3)'}})
            ))
          )),
          React.createElement('tbody', null,
            ...rows.map(r => {
              const ymStr = String(Math.floor(r.ym/100)) + '-' + String(r.ym%100).padStart(2,'0');
              const netReal = r.netReal;
              const met = netReal===null ? null : netReal >= r.net;
              return React.createElement('tr', {key:r.ym},
                React.createElement('td',null,r.label),
                React.createElement('td',null,fmt(r.yourSal)),
                React.createElement('td',null,fmt(r.wifeSal)),
                React.createElement('td',null,r.extra>0?fmt(r.extra):'—'),
                React.createElement('td',null,fmt(r.freelance)),
                React.createElement('td',{className:r.extraInc>0?'pos':''},r.extraInc>0?fmt(r.extraInc):'—'),
                React.createElement('td',null,fmt(r.intA+r.intB)),
                React.createElement('td',{className:r.taxRet>0?'pos':''},r.taxRet>0?fmt(r.taxRet):'—'),
                React.createElement('td',{className:'gold-t'},fmt(r.totalInc)),
                React.createElement('td',null,fmt(r.living)),
                React.createElement('td',null,r.carRun>0?fmt(r.carRun):'—'),
                React.createElement('td',null,r.cc>0?fmt(r.cc):'—'),
                React.createElement('td',{className:r.extraExp>0?'neg':''},r.extraExp>0?fmt(-r.extraExp):'—'),
                React.createElement('td',{className:r.ooThis>0?'neg':''},r.ooThis>0?fmt(-r.ooThis):'—'),
                React.createElement('td',{className:'neg'},fmt(-r.totalExp)),
                React.createElement('td',{className:r.net>=0?'pos':'neg'},fmt(r.net)),
                React.createElement('td',{className:netReal===null?'':(netReal>=0?'pos':'neg')}, netReal===null?'—':fmt(netReal)),
                React.createElement('td',{style:{textAlign:'center'}},
                  met===null
                    ? React.createElement('span',{title:'No Monthly Cash data yet for this month',style:{color:'var(--text3)'}},'—')
                    : React.createElement('button', {
                        onClick:()=>goToCashflowMonth(ymStr),
                        title:'View detail in Monthly Cash',
                        style:{background:'none',border:'none',cursor:'pointer',padding:'.1rem .3rem',color:met?'var(--green)':'var(--red)'}
                      }, React.createElement(Icon,{name:met?'check':'x',size:15}))
                ),
                React.createElement('td',{className:r.balB>=0?'gold-t':'neg'},fmt(r.balB))
              );
            })
          )
        )
      )
    )
  );
}

function IncomePage({rows}) {
  return React.createElement('div', null,
    React.createElement('div', {className:'chart-card'},
      React.createElement('div',{className:'chart-title'},'Income – Stacked'),
      React.createElement(ResponsiveContainer, {width:'100%',height:300},
        React.createElement(BarChart, {data:rows,margin:{top:8,right:16,bottom:0,left:8}},
          React.createElement(CartesianGrid,{strokeDasharray:'3 3',stroke:'var(--border)'}),
          React.createElement(XAxis,{dataKey:'label',tick:{fill:'var(--text3)',fontSize:10},tickLine:false}),
          React.createElement(YAxis,{tickFormatter:v=>'$'+(v/1000).toFixed(0)+'k',tick:{fill:'var(--text3)',fontSize:11},tickLine:false,axisLine:false}),
          React.createElement(Tooltip,{content:React.createElement(TT)}),
          React.createElement(Bar,{dataKey:'yourSal',name:'Your Salary',stackId:'a',fill:'var(--blue)'}),
          React.createElement(Bar,{dataKey:'wifeSal',name:'Wife Salary',stackId:'a',fill:'var(--green)'}),
          React.createElement(Bar,{dataKey:'extra',name:'Extra',stackId:'a',fill:'var(--gold)'}),
          React.createElement(Bar,{dataKey:'freelance',name:'Freelance',stackId:'a',fill:'#a78bfa'}),
          React.createElement(Bar,{dataKey:'extraInc',name:'Extra Streams',stackId:'a',fill:'#f9a8d4'}),
          React.createElement(Bar,{dataKey:'intA',name:'Int A',stackId:'a',fill:'#34d399'}),
          React.createElement(Bar,{dataKey:'intB',name:'Int B',stackId:'a',fill:'#6ee7b7'}),
          React.createElement(Bar,{dataKey:'taxRet',name:'Tax Return',stackId:'a',fill:'#fcd34d'}),
          React.createElement(Legend,{wrapperStyle:{fontSize:'var(--t-xs)',color:'var(--text2)'}})
        )
      )
    ),
    React.createElement('div', {className:'chart-card'},
      React.createElement('div',{className:'chart-title'},'Expenses – Stacked'),
      React.createElement(ResponsiveContainer, {width:'100%',height:260},
        React.createElement(BarChart, {data:rows,margin:{top:8,right:16,bottom:0,left:8}},
          React.createElement(CartesianGrid,{strokeDasharray:'3 3',stroke:'var(--border)'}),
          React.createElement(XAxis,{dataKey:'label',tick:{fill:'var(--text3)',fontSize:10},tickLine:false}),
          React.createElement(YAxis,{tickFormatter:v=>'$'+(v/1000).toFixed(0)+'k',tick:{fill:'var(--text3)',fontSize:11},tickLine:false,axisLine:false}),
          React.createElement(Tooltip,{content:React.createElement(TT)}),
          React.createElement(Bar,{dataKey:'living',name:'Living',stackId:'b',fill:'#64748b'}),
          React.createElement(Bar,{dataKey:'carRun',name:'Car Running',stackId:'b',fill:'#94a3b8'}),
          React.createElement(Bar,{dataKey:'cc',name:'Childcare',stackId:'b',fill:'#fbbf24'}),
          React.createElement(Bar,{dataKey:'extraExp',name:'Extra Expenses',stackId:'b',fill:'#fb7185'}),
          React.createElement(Bar,{dataKey:'ooThis',name:'One-offs',stackId:'b',fill:'var(--red)'}),
          React.createElement(Legend,{wrapperStyle:{fontSize:'var(--t-xs)',color:'var(--text2)'}})
        )
      )
    )
  );
}

function NepalPage({nepal}) {
  const {A} = useFinance();
  const {exchange,nrsRate} = A.nepal;
  const COLORS = ['var(--text3)','var(--gold)','var(--green)','var(--blue)'];
  const items = [
    {label:'No Interest – 40L',nrs:nepal.noInt,rate:'0%'},
    {label:'Fixed 12% – 20L',nrs:nepal.fixed,rate:'12%'},
    {label:'Market Rate – You',nrs:nepal.mktYou,rate:(nrsRate*100).toFixed(1)+'%'},
    {label:'Market Rate – Wife',nrs:nepal.mktWife,rate:(nrsRate*100).toFixed(1)+'%'},
  ];
  const barData = items.map((it,i) => ({name:['No Int','12% Fixed','Mkt You','Mkt Wife'][i],value:it.nrs/1e5}));
  return React.createElement('div', null,
    React.createElement('div', {className:'stat-grid'},
      React.createElement('div',{className:'stat-card highlight'},
        React.createElement('div',{className:'stat-label'},'Total Nepal (AUD)'),
        React.createElement('div',{className:'stat-value'},fmt(nepal.totalAUD)),
        React.createElement('div',{className:'stat-sub'},'@ '+exchange+' NRS/AUD'+(A.nepal.exchangeAuto?' · live':''))),
      React.createElement('div',{className:'stat-card'},
        React.createElement('div',{className:'stat-label'},'Total Nepal (NRS)'),
        React.createElement('div',{className:'stat-value',style:{fontSize:'var(--t-lg)'}},fmtL(nepal.total))),
      React.createElement('div',{className:'stat-card'},
        React.createElement('div',{className:'stat-label'},'Growth Period'),
        React.createElement('div',{className:'stat-value'},nepal.years.toFixed(2)+'y'),
        React.createElement('div',{className:'stat-sub'},'May 2026 → Jul 2028')),
    ),
    React.createElement('div', {className:'nepal-grid'},
      ...items.map(it => React.createElement('div',{key:it.label,className:'nepal-card'},
        React.createElement('div',{className:'nc-label'},it.label),
        React.createElement('div',{className:'nc-nrs'},fmtL(it.nrs)),
        React.createElement('div',{className:'nc-aud'},fmt(it.nrs/exchange)+' AUD · '+it.rate)
      ))
    ),
    React.createElement('div', {className:'chart-card'},
      React.createElement('div',{className:'chart-title'},'Nepal Breakdown (Lakh NRS)'),
      React.createElement(ResponsiveContainer, {width:'100%',height:220},
        React.createElement(BarChart, {data:barData,margin:{top:8,right:16,bottom:0,left:8}},
          React.createElement(CartesianGrid,{strokeDasharray:'3 3',stroke:'var(--border)'}),
          React.createElement(XAxis,{dataKey:'name',tick:{fill:'var(--text3)',fontSize:11},tickLine:false}),
          React.createElement(YAxis,{tickFormatter:v=>v+'L',tick:{fill:'var(--text3)',fontSize:11},tickLine:false,axisLine:false}),
          React.createElement(Tooltip,{formatter:v=>[v.toFixed(2)+'L','Lakh NRS'],contentStyle:{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',fontSize:'var(--t-xs)'}}),
          React.createElement(Bar,{dataKey:'value',radius:[4,4,0,0]},
            ...barData.map((_,i)=>React.createElement(Cell,{key:i,fill:COLORS[i]}))
          )
        )
      )
    )
  );
}

function ProjectionVsActual() {
  const { compute } = useFinance();
  const rows = useMemo(() => compute(), [compute]);
  const actualByMonth = useActualByMonth();

  const merged = useMemo(() => {
    let projCum = 0, actualCum = 0;
    return rows.map(r => {
      const ymStr = String(Math.floor(r.ym/100)) + '-' + String(r.ym%100).padStart(2,'0');
      const projSaving = r.totalInc - r.totalExp;
      const projUjjan = r.yourSal + r.extra;
      const projSaloni = r.wifeSal + r.freelance;
      projCum += projSaving;
      const actual = actualByMonth[ymStr];
      if (!actual) return { ...r, ymStr, hasActual:false, projSaving, projNet:projCum, projUjjan, projSaloni };
      const actualSaving = actual.income - actual.expense;
      actualCum += actualSaving;
      // >100% = beat plan, 100% = exactly met, <100% = fell short. When the
      // plan itself projects a loss, "meeting" it means losing no more than
      // planned, so the ratio is measured off the planned shortfall instead.
      let pct;
      if (projSaving > 0) pct = (actualSaving/projSaving)*100;
      else if (projSaving === 0) pct = actualSaving >= 0 ? 100 : 0;
      else pct = 100 + ((actualSaving-projSaving)/Math.abs(projSaving))*100;
      return {
        ...r, ymStr, hasActual:true, projSaving, projNet:projCum, projUjjan, projSaloni,
        actualIncome:actual.income, actualExpense:actual.expense, actualSaving, actualNet:actualCum,
        actualUjjan:actual.ujIncome, actualSaloni:actual.salIncome, pct
      };
    });
  }, [rows, actualByMonth]);

  const withActual = merged.filter(r => r.hasActual);

  if (!withActual.length) {
    return React.createElement('div', {className:'chart-card'},
      React.createElement('div', {style:{textAlign:'center',padding:'2rem',color:'var(--text3)'}},
        'No Monthly Cash data yet for the projected months. Upload bank CSVs to compare projection vs reality.')
    );
  }

  return React.createElement('div', null,
    React.createElement('div', {className:'chart-card'},
      React.createElement('div',{className:'chart-title'},'Projection vs Actual — Income, Expense & Saving'),
      React.createElement(ResponsiveContainer, {width:'100%',height:280},
        React.createElement(BarChart, {data:withActual,margin:{top:8,right:16,bottom:0,left:8}},
          React.createElement(CartesianGrid,{strokeDasharray:'3 3',stroke:'var(--border)'}),
          React.createElement(XAxis,{dataKey:'label',tick:{fill:'var(--text3)',fontSize:10},tickLine:false}),
          React.createElement(YAxis,{tickFormatter:v=>'$'+(v/1000).toFixed(0)+'k',tick:{fill:'var(--text3)',fontSize:11},tickLine:false,axisLine:false}),
          React.createElement(Tooltip,{content:React.createElement(TT)}),
          React.createElement(Legend,{wrapperStyle:{fontSize:'11px'}}),
          React.createElement(ReferenceLine,{y:0,stroke:'var(--text3)'}),
          React.createElement(Bar, {dataKey:'totalInc',name:'Proj. Income',fill:'#4ade80',fillOpacity:.35,radius:[3,3,0,0]}),
          React.createElement(Bar, {dataKey:'actualIncome',name:'Actual Income',fill:'var(--green)',radius:[3,3,0,0]}),
          React.createElement(Bar, {dataKey:'totalExp',name:'Proj. Expense',fill:'#f87171',fillOpacity:.35,radius:[3,3,0,0]}),
          React.createElement(Bar, {dataKey:'actualExpense',name:'Actual Expense',fill:'var(--red)',radius:[3,3,0,0]})
        )
      )
    ),
    React.createElement('div', {className:'chart-card'},
      React.createElement('div',{className:'chart-title'},'Cumulative Net — Plan vs Reality'),
      React.createElement('p', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginBottom:'.75rem',marginTop:'-.5rem'}},
        'Running total of monthly savings. Diverging lines show whether you\'re tracking ahead or behind the plan over time.'),
      React.createElement(ResponsiveContainer, {width:'100%',height:240},
        React.createElement(LineChart, {data:withActual,margin:{top:8,right:16,bottom:0,left:8}},
          React.createElement(CartesianGrid,{strokeDasharray:'3 3',stroke:'var(--border)'}),
          React.createElement(XAxis,{dataKey:'label',tick:{fill:'var(--text3)',fontSize:10},tickLine:false}),
          React.createElement(YAxis,{tickFormatter:v=>'$'+(v/1000).toFixed(0)+'k',tick:{fill:'var(--text3)',fontSize:11},tickLine:false,axisLine:false}),
          React.createElement(Tooltip,{content:React.createElement(TT)}),
          React.createElement(Legend,{wrapperStyle:{fontSize:'11px'}}),
          React.createElement(ReferenceLine,{y:0,stroke:'var(--text3)'}),
          React.createElement(Line, {type:'monotone',dataKey:'projNet',name:'Planned Net',stroke:'var(--text3)',strokeDasharray:'4 3',dot:false,strokeWidth:2}),
          React.createElement(Line, {type:'monotone',dataKey:'actualNet',name:'Actual Net',stroke:'var(--gold)',dot:{r:3},strokeWidth:2})
        )
      )
    ),
    React.createElement('div', {className:'chart-card'},
      React.createElement('div',{className:'chart-title'},'Monthly Reality Check'),
      React.createElement('div', {className:'table-wrap'},
        React.createElement('table', {className:'data-table'},
          React.createElement('thead', null, React.createElement('tr', null,
            ...['Month','Proj. Income','Actual Income','Proj. Expense','Actual Expense','Proj. Saving','Actual Saving','Planned Net','Actual Net','% of Plan Met']
              .map(h=>React.createElement('th',{key:h},h))
          )),
          React.createElement('tbody', null,
            ...withActual.map(r => React.createElement('tr', {key:r.ym},
              React.createElement('td',null,r.label),
              React.createElement('td',null,fmt(r.totalInc)),
              React.createElement('td',null,fmt(r.actualIncome)),
              React.createElement('td',null,fmt(r.totalExp)),
              React.createElement('td',null,fmt(r.actualExpense)),
              React.createElement('td',{className:r.projSaving>=0?'pos':'neg'},fmt(r.projSaving)),
              React.createElement('td',{className:r.actualSaving>=0?'pos':'neg'},fmt(r.actualSaving)),
              React.createElement('td',{className:r.projNet>=0?'gold-t':'neg'},fmt(r.projNet)),
              React.createElement('td',{className:r.actualNet>=0?'gold-t':'neg'},fmt(r.actualNet)),
              React.createElement('td',{className:r.pct>=100?'pos':(r.pct<70?'neg':''),style:{fontWeight:700}}, Math.round(r.pct)+'%')
            ))
          )
        )
      )
    ),
    React.createElement('div', {className:'chart-card'},
      React.createElement('div',{className:'chart-title'},'Per-Person Income — Planned Salary vs Actual (all sources)'),
      React.createElement('p', {style:{fontSize:'var(--t-xs)',color:'var(--text3)',marginBottom:'.75rem',marginTop:'-.5rem'}},
        'Planned columns are salary/freelance only; actual columns include every income transaction tagged to that person, so a gap can mean extra income too, not just a shortfall.'),
      React.createElement('div', {className:'table-wrap'},
        React.createElement('table', {className:'data-table'},
          React.createElement('thead', null, React.createElement('tr', null,
            ...['Month','Proj. Ujjan Salary','Actual Ujjan Income','Proj. Saloni Salary+Freelance','Actual Saloni Income']
              .map(h=>React.createElement('th',{key:h},h))
          )),
          React.createElement('tbody', null,
            ...withActual.map(r => React.createElement('tr', {key:r.ym},
              React.createElement('td',null,r.label),
              React.createElement('td',null,fmt(r.projUjjan)),
              React.createElement('td',{className:r.actualUjjan>=r.projUjjan?'pos':'neg'},fmt(r.actualUjjan)),
              React.createElement('td',null,fmt(r.projSaloni)),
              React.createElement('td',{className:r.actualSaloni>=r.projSaloni?'pos':'neg'},fmt(r.actualSaloni))
            ))
          )
        )
      )
    )
  );
}

const SUBNAV = [{id:'summary',icon:'bar-chart',label:'Summary'},{id:'cashflow',icon:'dollar-sign',label:'Cashflow'},{id:'income',icon:'trending-up',label:'Income & Expenses'},{id:'nepal',icon:'mountain',label:'Nepal'}];

function Results() {
  const {compute,nepalCalc} = useFinance();
  const [sub,setSub] = useState(() => localStorage.getItem('FP_Proj_Res_Tab') || 'summary');
  useEffect(() => localStorage.setItem('FP_Proj_Res_Tab', sub), [sub]);
  const rows = useMemo(() => compute(), [compute]);
  const nepal = useMemo(() => nepalCalc(), [nepalCalc]);
  return React.createElement('div', null,
    React.createElement('h1', {className:'page-title'}, 'Results'),
    React.createElement('p', {className:'page-subtitle'}, 'All figures reflect your current assumptions.'),
    React.createElement('nav', {className:'subnav'},
      ...SUBNAV.map(n => React.createElement('button', {key:n.id, className:'subnav-btn'+(sub===n.id?' active':''), onClick:()=>setSub(n.id)}, React.createElement(IconLabel,{icon:n.icon},n.label)))
    ),
    sub==='summary' && React.createElement(Summary, {rows,nepal}),
    sub==='cashflow' && React.createElement(Cashflow, {rows}),
    sub==='income' && React.createElement(IncomePage, {rows}),
    sub==='nepal' && React.createElement(NepalPage, {nepal}),
  );
}

function Projection2028() {
  const [subPage,setSubPage] = useState(() => localStorage.getItem('FP_Proj_Tab') || 'assumptions');
  useEffect(() => localStorage.setItem('FP_Proj_Tab', subPage), [subPage]);
  return React.createElement('div', null,
    React.createElement('nav', {className:'subnav subnav-primary', style:{marginBottom:'0'}},
      React.createElement('button', {className:'subnav-btn'+(subPage==='assumptions'?' active':''), onClick:()=>setSubPage('assumptions')}, React.createElement(IconLabel,{icon:'settings'},'Assumptions')),
      React.createElement('button', {className:'subnav-btn'+(subPage==='results'?' active':''), onClick:()=>setSubPage('results')}, React.createElement(IconLabel,{icon:'bar-chart'},'Results'))
    ),
    React.createElement('div', {style:{marginTop:'1.5rem'}},
      subPage === 'assumptions' && React.createElement(Assumptions, {onGo:()=>setSubPage('results')}),
      subPage === 'results' && React.createElement(Results, null)
    )
  );
}

