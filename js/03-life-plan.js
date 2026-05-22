// ═══════════════════════════════════════════════════════════════
// LIFE PLAN
// ═══════════════════════════════════════════════════════════════
const LIFE_DEFAULTS = {
  strategy:1, startAge:31, startDate:'2028-07-01',
  totalCash:250000, pporPrice:750000, depositPct:0.20, legal:2000,
  mortgageRate:0.06, mortgageTerm:30, pporGrowth:0.045,
  sal31:90000, sal32:100000, sal33:110000, sal34:120000, salGrowth:0.03,
  wifeSal31:90000, wifeSal32:100000, wifeSal33:110000, wifeSal34:120000, wifeSalGrowth:0.03,
  sideIncome:500, sgcRate:0.12,
  workDedYou:1500, workDedPartner:1500, bracketIndex:0, ipOwner:'you',
  groceries:1200, utilities:280, phone:200, streaming:50, clothing:100, eatOut:500, gifts:100,
  council:220, water:80, buildingIns:150, maintenance:100, strata:0, garden:83, otherHouse:150,
  carFuel:300, carIns:140, carRego:85, carService:150, carReplace:500, car2:550,
  healthIns:380, lifeIns:0, incomeProtect:0, trauma:0,
  travel:800, healthcare:200, christmas:150,
  childcare:1200, primary:400, highSchool:700, kidsActivities:400, uzielETF:250, uzielBirthYear:2023,
  superYou:18000, superPartner:12000,
  superReturnAccum:0.06, superReturnPension:0.07,
  preservationAge:60, superSWR:0.035,
  etfGross:0.09, etfFees:0.002, etfDividendYield:0.025, frankingPortion:0.40, etfSWR:0.035,
  cpiRate:0.03,
  ipPurchaseAge:37, ipPrice:650000, ipDepositPct:0.20,
  ipLegal:2500, ipLoanRate:0.063, ipGrowth:0.04,
  ipGrossYield:0.035, ipExpenses:8500,
  lifeEvents:[
    {id:1,age:31,date:'2028-07-01',label:'APICS Certification',amount:5000,cpiLinked:true},
    {id:2,age:33,date:'2030-07-01',label:'Wills & POA',amount:3000,cpiLinked:true},
    {id:3,age:35,date:'2032-07-01',label:'Overseas Family Trip',amount:12000,cpiLinked:true},
    {id:4,age:38,date:'2035-07-01',label:'Overseas Family Trip',amount:12000,cpiLinked:true},
    {id:5,age:40,date:'2037-07-01',label:'Home Renovation + Wills',amount:63000,cpiLinked:true},
    {id:6,age:41,date:'2038-07-01',label:'Overseas Family Trip',amount:12000,cpiLinked:true},
    {id:7,age:44,date:'2041-07-01',label:'Overseas Family Trip',amount:12000,cpiLinked:true},
    {id:8,age:45,date:'2042-07-01',label:'Parents Health Emergency',amount:25000,cpiLinked:true},
    {id:9,age:46,date:'2043-07-01',label:'Uziel Uni Support',amount:20000,cpiLinked:true},
    {id:10,age:47,date:'2044-07-01',label:'Overseas Trip',amount:12000,cpiLinked:true},
    {id:11,age:49,date:'2046-07-01',label:'Uziel 21st Gift',amount:10000,cpiLinked:true},
    {id:12,age:50,date:'2047-07-01',label:'Overseas Family Trip',amount:12000,cpiLinked:true},
    {id:13,age:52,date:'2049-07-01',label:'Estate Planning Review',amount:3000,cpiLinked:true},
    {id:14,age:53,date:'2050-07-01',label:'Overseas Trip',amount:12000,cpiLinked:true},
    {id:15,age:56,date:'2053-07-01',label:'Overseas Trip',amount:12000,cpiLinked:true},
    {id:16,age:65,date:'2062-07-01',label:'Aged Care Reserve',amount:150000,cpiLinked:true},
  ],
  extraIncome:[], extraExpense:[],
};

function pmt(rate, nper, pv) {
  if(rate===0) return pv/nper;
  return pv*rate*Math.pow(1+rate,nper) / (Math.pow(1+rate,nper)-1);
}

function computeLife(D) {
  const rows = [];
  const stamp = vicStampDuty(D.pporPrice);
  const deposit = D.pporPrice * D.depositPct;
  const loan = D.pporPrice - deposit;
  const totalCosts = deposit + stamp + D.legal;
  const startOffset = D.totalCash - totalCosts;
  const annualRepay = pmt(D.mortgageRate/12, D.mortgageTerm*12, loan) * 12;
  const etfNet = D.etfGross - D.etfFees;
  const cpi = (base, yrs) => base * Math.pow(1+D.cpiRate, yrs);
  const taxOpts = yrs => ({bracketIndex:D.bracketIndex, yearsFromBase:yrs});

  function salaryGross(age) {
    if(age===31) return D.sal31;
    if(age===32) return D.sal32;
    if(age===33) return D.sal33;
    if(age===34) return D.sal34;
    return D.sal34 * Math.pow(1+D.salGrowth, age-34);
  }
  function wifeSalaryGross(age) {
    if(age===31) return D.wifeSal31 ?? D.sal31;
    if(age===32) return D.wifeSal32 ?? D.sal32;
    if(age===33) return D.wifeSal33 ?? D.sal33;
    if(age===34) return D.wifeSal34 ?? D.sal34;
    return (D.wifeSal34 ?? D.sal34) * Math.pow(1+(D.wifeSalGrowth ?? D.salGrowth), age-34);
  }
  function childMonthly(age, yrs) {
    const ua = 2028 + (age - 31) - D.uzielBirthYear;
    if(ua < 4) return cpi(D.kidsActivities, yrs)*12;
    if(ua <= 5) return cpi(D.childcare + D.kidsActivities, yrs)*12;
    if(ua <= 12) return cpi(D.primary + D.kidsActivities, yrs)*12;
    if(ua <= 17) return cpi(D.highSchool + D.kidsActivities, yrs)*12;
    return D.uzielETF*12;
  }

  const coreMonthly = D.groceries+D.utilities+D.phone+D.streaming+D.clothing+D.eatOut+D.gifts;
  const propMonthly = D.council+D.water+D.buildingIns+D.maintenance+D.strata+D.garden+D.otherHouse;
  const veh1Monthly = D.carFuel+D.carIns+D.carRego+D.carService+D.carReplace;
  const insMonthly = D.healthIns+D.lifeIns+D.incomeProtect+D.trauma;
  const savMonthly = D.travel+D.healthcare+D.christmas;

  const lecMap = {};
  (D.lifeEvents||[]).forEach(e => {
    const yrs = e.age - D.startAge;
    const amt = e.cpiLinked === false ? e.amount : e.amount * Math.pow(1+D.cpiRate, yrs);
    lecMap[e.age] = (lecMap[e.age]||0) + amt;
  });
  const extraIncMap = {}, extraExpMap = {};
  (D.extraIncome||[]).forEach(r => { for(let a=r.ageFrom; a<=r.ageTo; a++) extraIncMap[a] = (extraIncMap[a]||0)+r.monthlyAmount*12; });
  (D.extraExpense||[]).forEach(r => { for(let a=r.ageFrom; a<=r.ageTo; a++) extraExpMap[a] = (extraExpMap[a]||0)+r.monthlyAmount*12; });

  let offset = startOffset, etf = 0;
  let superBal = D.superYou + D.superPartner;
  let ipVal = 0, ipLoan = 0, ipEquity = 0;
  let pporVal = D.pporPrice;
  let remainLoan = loan;

  for(let age = D.startAge; age <= 65; age++) {
    const year = 2028 + (age - D.startAge);
    const yrs = age - D.startAge;
    const opts = taxOpts(yrs);
    const grossSal = salaryGross(age);
    const wifeGrossSal = wifeSalaryGross(age);

    // IP cashflow (Strategy 3)
    let ipNetCF = 0, ipRent = 0, ipInt = 0, ipExpInfl = 0;
    if(D.strategy===3 && age >= D.ipPurchaseAge) {
      if(ipLoan===0 && age === D.ipPurchaseAge) {
        const ipDep = D.ipPrice * D.ipDepositPct;
        const ipStamp = vicStampDuty(D.ipPrice);
        ipLoan = D.ipPrice - ipDep;
        ipVal = D.ipPrice;
        offset -= (ipDep + ipStamp + D.ipLegal);
      }
      ipRent = ipVal * D.ipGrossYield;
      ipInt = ipLoan * D.ipLoanRate;
      ipExpInfl = D.ipExpenses * Math.pow(1+D.cpiRate, age - D.ipPurchaseAge);
      ipNetCF = ipRent - ipInt - ipExpInfl;
    }

    // ETF dividends (taxable each year)
    const etfDiv = Math.max(0, etf) * D.etfDividendYield;
    const frankingCredits = etfDiv * D.frankingPortion * (0.30/0.70);

    const sideGross = D.sideIncome * 12;
    const extraIncGross = extraIncMap[age] || 0;

    // Split investment income/loss by IP owner
    const split = D.ipOwner==='joint' ? 0.5 : (D.ipOwner==='partner' ? 0 : 1);
    const youInv = ipNetCF*split + etfDiv*split + frankingCredits*split;
    const wifeInv = ipNetCF*(1-split) + etfDiv*(1-split) + frankingCredits*(1-split);

    const youTaxable = Math.max(0, grossSal + sideGross + extraIncGross + youInv - D.workDedYou);
    const wifeTaxable = Math.max(0, wifeGrossSal + wifeInv - D.workDedPartner);
    const youTax = calcTax(youTaxable, opts);
    const wifeTax = calcTax(wifeTaxable, opts);
    const youFrankRefund = frankingCredits * split;
    const wifeFrankRefund = frankingCredits * (1-split);
    const youNetTax = Math.max(0, youTax - youFrankRefund);
    const wifeNetTax = Math.max(0, wifeTax - wifeFrankRefund);

    const totalGross = grossSal + wifeGrossSal + sideGross + extraIncGross + ipNetCF + etfDiv;
    const totalNetIncome = totalGross - youNetTax - wifeNetTax;

    const sgcYou = grossSal * D.sgcRate;
    const sgcWife = wifeGrossSal * D.sgcRate;

    // Expenses (all CPI-inflated)
    const core = cpi(coreMonthly, yrs)*12;
    const prop = cpi(propMonthly, yrs)*12;
    const veh = age>=33 ? cpi(veh1Monthly+D.car2, yrs)*12 : cpi(veh1Monthly, yrs)*12;
    const ins = cpi(insMonthly, yrs)*12;
    const sav = cpi(savMonthly, yrs)*12;
    const child = childMonthly(age, yrs);
    const extraExp = extraExpMap[age] || 0;
    const mort = remainLoan>0 ? annualRepay : 0;
    const livingExpenses = core+prop+veh+ins+sav+child+extraExp;
    const grossSurplus = totalNetIncome - livingExpenses;
    const lec = lecMap[age] || 0;
    const preMortgageCash = grossSurplus - lec;
    const netCash = preMortgageCash - mort;

    let interestPaid = 0, principalPaid = 0;

    if(D.strategy===1) {
      if(remainLoan > 0) {
        const netDebt = Math.max(0, remainLoan - Math.max(0,offset));
        interestPaid = netDebt * D.mortgageRate;
        principalPaid = mort - interestPaid;
        remainLoan = Math.max(0, remainLoan - principalPaid);
        offset += netCash;
        if(offset > remainLoan) { etf += (offset - remainLoan); offset = remainLoan; }
      } else { etf += netCash; }
    } else if(D.strategy===2) {
      const half = netCash / 2;
      offset += half;
      etf = (etf + half) * (1+etfNet);
      const netDebt = Math.max(0, remainLoan - Math.max(0,offset));
      interestPaid = netDebt * D.mortgageRate;
      principalPaid = mort - interestPaid;
      remainLoan = Math.max(0, remainLoan - principalPaid);
      if(offset > remainLoan) { etf += (offset - remainLoan); offset = remainLoan; }
    } else {
      offset += netCash;
      const netDebt = Math.max(0, remainLoan - Math.max(0,offset));
      interestPaid = netDebt * D.mortgageRate;
      principalPaid = mort - interestPaid;
      remainLoan = Math.max(0, remainLoan - principalPaid);
      if(offset > remainLoan) { etf += (offset - remainLoan); offset = remainLoan; }
    }
    if(D.strategy !== 2) etf = etf * (1+etfNet);

    // Super: 15% contributions tax + pension-phase return post-60
    const netSGC = (sgcYou + sgcWife) * 0.85;
    const superRet = age >= D.preservationAge ? D.superReturnPension : D.superReturnAccum;
    superBal = (superBal + netSGC) * (1+superRet);

    pporVal *= (1+D.pporGrowth);
    if(D.strategy===3 && age >= D.ipPurchaseAge) {
      ipVal *= (1+D.ipGrowth);
      ipEquity = ipVal - ipLoan;
    }

    const nw = offset + etf + (age>=D.preservationAge ? superBal : 0) + ipEquity;
    const nwTotal = offset + etf + superBal + pporVal - remainLoan + ipEquity;
    const passiveIncome = Math.max(0,etf)*D.etfSWR
      + (age>=D.preservationAge ? superBal*D.superSWR : 0)
      + (D.strategy===3 ? Math.max(0, ipNetCF) : 0);

    rows.push({age,year,grossSal:grossSal+wifeGrossSal,netEach:totalNetIncome,
      totalIncome:totalNetIncome,core,prop,veh,ins,sav,child,extraExp,
      mort,interestPaid,principalPaid,ipNetCF,ipRent,ipInt,ipExpInfl,
      ipTopup: ipNetCF<0 ? -ipNetCF : 0,
      totalOut:livingExpenses,grossSurplus,lec,netCash,
      offset, remainLoan,etf,superBal,pporVal,ipVal,ipLoan,ipEquity,
      nw,nwTotal,passiveIncome,livingExpenses,preMortgageCash,
      youTax:youNetTax,wifeTax:wifeNetTax,etfDiv,frankingCredits});
  }
  return rows;
}

const LC = createContext(null);
function LifeProvider({children, startingCash}) {
  const { schedulePush, hydrated } = useSync();
  const [D,setD] = useState(() => {
    let saved = {};
    try { const s = localStorage.getItem('FinancePlan_D'); if(s) saved = JSON.parse(s); } catch(e){}
    return {...LIFE_DEFAULTS, ...saved, totalCash: startingCash ?? LIFE_DEFAULTS.totalCash};
  });

  useEffect(() => {
    if(!hydrated) return;
    try { const s = localStorage.getItem('FinancePlan_D'); if(s) {
      const saved = JSON.parse(s);
      setD({...LIFE_DEFAULTS, ...saved, totalCash: startingCash ?? LIFE_DEFAULTS.totalCash});
    }} catch(e){}
  }, [hydrated, startingCash]);

  useEffect(() => {
    setD(p => p.totalCash === startingCash ? p : {...p, totalCash:startingCash});
  }, [startingCash]);

  useEffect(() => {
    const toSave = {...D};
    delete toSave.totalCash;
    localStorage.setItem('FinancePlan_D', JSON.stringify(toSave));
    schedulePush();
  }, [D, schedulePush]);

  const update = useCallback((k,v) => setD(p => ({...p,[k]:v})), []);
  const rows = useMemo(() => computeLife(D), [D]);
  return React.createElement(LC.Provider, {value:{D,setD,update,rows}}, children);
}
const useLife = () => useContext(LC);

function LField({label,hint,k,pct=false,prefix=false}) {
  const {D,update} = useLife();
  const value = D[k];
  const [raw,setRaw] = useState('');
  const [focus,setFocus] = useState(false);
  const disp = focus ? raw : (pct ? (value*100).toFixed(2) : String(value));
  const inp = React.createElement('input', {type:'text', inputMode:'decimal',
    className:'input-field'+(prefix?' has-prefix':''), value:disp,
    onFocus: e => { setRaw(pct?(value*100).toFixed(2):String(value)); setFocus(true); setTimeout(()=>e.target.select(),0); },
    onChange: e => setRaw(e.target.value),
    onBlur: () => { const v = parseFloat(raw.replace(/[^0-9.\-]/g,'')); if(!isNaN(v)) update(k, pct?v/100:v); setFocus(false); }
  });
  return React.createElement('div', {className:'input-group'},
    React.createElement('label', {className:'input-label'}, label),
    prefix ? React.createElement('div', {className:'input-wrap'}, React.createElement('span',{className:'input-prefix'},'$'), inp) : inp,
    hint && React.createElement('span', {className:'input-hint'}, hint)
  );
}

function LDate({label,hint,k}) {
  const {D,update} = useLife();
  return React.createElement('div', {className:'input-group'},
    React.createElement('label', {className:'input-label'}, label),
    React.createElement('input', {type:'date', className:'input-field', value:D[k]||'', onChange: e => update(k, e.target.value)}),
    hint && React.createElement('span', {className:'input-hint'}, hint)
  );
}

function LSelect({label,hint,k,options}) {
  const {D,update} = useLife();
  return React.createElement('div', {className:'input-group'},
    React.createElement('label', {className:'input-label'}, label),
    React.createElement('select', {className:'input-field', value:D[k]||'', onChange: e => update(k, e.target.value)},
      ...options.map(o => React.createElement('option', {key:o.v,value:o.v}, o.l))
    ),
    hint && React.createElement('span', {className:'input-hint'}, hint)
  );
}

function LifeEventRow({ev,onUpdate,onRemove}) {
  return React.createElement('div', {className:'dyn-row', style:{gridTemplateColumns:'1fr 1.2fr auto auto auto auto'}},
    React.createElement('div', {className:'input-group'},
      React.createElement('label', {className:'input-label'}, 'Description'),
      React.createElement('input', {type:'text', className:'input-field', value:ev.label, onChange: e => onUpdate('label', e.target.value)})
    ),
    React.createElement('div', {className:'input-group'},
      React.createElement('label', {className:'input-label'}, 'Date'),
      React.createElement('input', {type:'date', className:'input-field', value:ev.date||'',
        onChange: e => {
          onUpdate('date', e.target.value);
          const yr = parseInt((e.target.value||'').slice(0,4));
          if(!isNaN(yr)) onUpdate('age', 31+(yr-2028));
        }})
    ),
    React.createElement(DynFieldCell, {label:'Age', value:ev.age, onCommit: v => onUpdate('age', v)}),
    React.createElement(DynFieldCell, {label:'Amount ($, today)', value:ev.amount, prefix:true, onCommit: v => onUpdate('amount', v)}),
    React.createElement('div', {className:'input-group'},
      React.createElement('label', {className:'input-label'}, 'CPI?'),
      React.createElement('select', {className:'input-field', value:String(ev.cpiLinked!==false),
        onChange: e => onUpdate('cpiLinked', e.target.value==='true')},
        React.createElement('option', {value:'true'}, 'Yes'),
        React.createElement('option', {value:'false'}, 'No')
      )
    ),
    React.createElement('div', {className:'input-group', style:{justifyContent:'flex-end'}},
      React.createElement('label', {className:'input-label'}, '\u00a0'),
      React.createElement('button', {className:'btn-remove', onClick:onRemove}, '✕')
    )
  );
}

function ExtraRecRow({row,onUpdate,onRemove,cpiOption}) {
  return React.createElement('div', {className:'dyn-row'},
    React.createElement('div', {className:'input-group'},
      React.createElement('label', {className:'input-label'}, 'Label'),
      React.createElement('input', {type:'text', className:'input-field', value:row.label||'', onChange: e => onUpdate('label', e.target.value)})
    ),
    React.createElement(DynFieldCell, {label:'Monthly $', value:row.monthlyAmount||0, prefix:true, onCommit: v => onUpdate('monthlyAmount', v)}),
    React.createElement(DynFieldCell, {label:'Age From', value:row.ageFrom||31, onCommit: v => onUpdate('ageFrom', v)}),
    React.createElement(DynFieldCell, {label:'Age To', value:row.ageTo||65, onCommit: v => onUpdate('ageTo', v)}),
    cpiOption && React.createElement('div', {className:'input-group'},
      React.createElement('label', {className:'input-label'}, 'CPI?'),
      React.createElement('select', {className:'input-field', value:String(row.cpiLinked||false),
        onChange: e => onUpdate('cpiLinked', e.target.value==='true')},
        React.createElement('option', {value:'false'}, 'No'),
        React.createElement('option', {value:'true'}, 'Yes')
      )
    ),
    React.createElement('div', {className:'input-group', style:{justifyContent:'flex-end'}},
      React.createElement('label', {className:'input-label'}, '\u00a0'),
      React.createElement('button', {className:'btn-remove', onClick:onRemove}, '✕')
    )
  );
}

function LifeAssumptions() {
  const {D,setD,update,rows} = useLife();
  const [sub,setSub] = useState(() => localStorage.getItem('FP_Life_Assump_Tab') || 'position');
  useEffect(() => localStorage.setItem('FP_Life_Assump_Tab', sub), [sub]);
  const SUBS = [
    {id:'position',label:'🏠 Position'},
    {id:'income',label:'💰 Income & Tax'},
    {id:'expenses',label:'🛒 Expenses'},
    {id:'super',label:'🏦 Super & ETF'},
    {id:'ip',label:'🏗️ Inv. Property'},
    {id:'events',label:'📅 Life Events'},
    {id:'extras',label:'➕ Custom Fields'},
  ];
  return React.createElement('div', null,
    React.createElement('div', {style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem'}},
      React.createElement('div', null,
        React.createElement('h1',{className:'page-title'},'Life Financial Planner'),
        React.createElement('p',{className:'page-subtitle'},'35-year model: Age 31→65. Saved automatically and synced.')
      )
    ),
    React.createElement('nav', {className:'subnav', style:{marginBottom:'1.5rem'}},
      ...SUBS.map(s => React.createElement('button', {key:s.id,
        className:'subnav-btn'+(sub===s.id?' active':''), onClick:()=>setSub(s.id)}, s.label))
    ),

    sub==='position' && React.createElement(Section, {icon:'📊',title:'Starting Position (July 2028)'},
      React.createElement('div', {className:'input-grid'},
        React.createElement(LDate, {label:'Start Date',k:'startDate'}),
        React.createElement(LField, {label:'Start Age',k:'startAge'}),
        React.createElement(LField, {label:'Total Cash Available',k:'totalCash',prefix:true}),
        React.createElement(LField, {label:'PPOR Purchase Price',k:'pporPrice',prefix:true}),
        React.createElement(LField, {label:'Deposit %',k:'depositPct',pct:true}),
        React.createElement(LField, {label:'Legal & Conveyancing',k:'legal',prefix:true}),
        React.createElement(LField, {label:'Mortgage Rate',k:'mortgageRate',pct:true,hint:'Variable P&I'}),
        React.createElement(LField, {label:'Mortgage Term (years)',k:'mortgageTerm'}),
        React.createElement(LField, {label:'PPOR Annual Growth',k:'pporGrowth',pct:true}),
      ),
      React.createElement('div', {className:'info-box',style:{marginTop:'.75rem'}},
        React.createElement('p', null,
          'Stamp duty (VIC): ', React.createElement('strong',{style:{color:'var(--text)'}}, '$'+Math.round(vicStampDuty(D.pporPrice)).toLocaleString()),
          '  ·  Loan: ', React.createElement('strong',{style:{color:'var(--gold)'}}, '$'+Math.round(D.pporPrice*(1-D.depositPct)).toLocaleString()),
          '  ·  Starting offset: ', React.createElement('strong',{style:{color:'var(--green)'}}, '$'+Math.round(D.totalCash-(D.pporPrice*D.depositPct+vicStampDuty(D.pporPrice)+D.legal)).toLocaleString())
        )
      )
    ),

    sub==='income' && React.createElement('div', null,
      React.createElement(Section, {icon:'💰',title:'Your Salary'},
        React.createElement('div',{className:'input-grid'},
          React.createElement(LField,{label:'Salary at Age 31',k:'sal31',prefix:true}),
          React.createElement(LField,{label:'Salary at Age 32',k:'sal32',prefix:true}),
          React.createElement(LField,{label:'Salary at Age 33',k:'sal33',prefix:true}),
          React.createElement(LField,{label:'Salary at Age 34 (target)',k:'sal34',prefix:true}),
          React.createElement(LField,{label:'Growth Rate from Age 34',k:'salGrowth',pct:true,hint:'compounding'}),
        )
      ),
      React.createElement(Section, {icon:'👩‍💼',title:'Wife Salary'},
        React.createElement('div',{className:'input-grid'},
          React.createElement(LField,{label:'Salary at Age 31',k:'wifeSal31',prefix:true}),
          React.createElement(LField,{label:'Salary at Age 32',k:'wifeSal32',prefix:true}),
          React.createElement(LField,{label:'Salary at Age 33',k:'wifeSal33',prefix:true}),
          React.createElement(LField,{label:'Salary at Age 34 (target)',k:'wifeSal34',prefix:true}),
          React.createElement(LField,{label:'Growth Rate from Age 34',k:'wifeSalGrowth',pct:true}),
        )
      ),
      React.createElement(Section, {icon:'💵',title:'Other Income'},
        React.createElement('div',{className:'input-grid'},
          React.createElement(LField,{label:'Side Income ($/month, gross)',k:'sideIncome',prefix:true,hint:'Taxed at marginal rate'}),
          React.createElement(LField,{label:'SGC Rate',k:'sgcRate',pct:true,hint:'12% employer super'}),
        )
      ),
      React.createElement(Section, {icon:'📊',title:'Tax Engine (Stage 3 ATO)'},
        React.createElement('div',{className:'info-box',style:{marginBottom:'.75rem'}},
          React.createElement('p',null,'Brackets: 0% / 16% / 30% / 37% / 45%. LITO + Medicare automatic. Deductions reduce taxable income. IP losses (neg gearing) and ETF dividends/franking handled automatically.')
        ),
        React.createElement('div',{className:'input-grid'},
          React.createElement(LField,{label:'Your Work Deductions ($/yr)',k:'workDedYou',prefix:true}),
          React.createElement(LField,{label:'Partner Work Deductions ($/yr)',k:'workDedPartner',prefix:true}),
          React.createElement(LField,{label:'Bracket Indexation /yr',k:'bracketIndex',pct:true,hint:'0% = brackets frozen'}),
          React.createElement(LSelect,{label:'IP Owned By',k:'ipOwner',hint:'Affects neg gearing',
            options:[{v:'you',l:'You'},{v:'partner',l:'Wife/Partner'},{v:'joint',l:'Joint (50/50)'}]}),
        )
      )
    ),

    sub==='expenses' && React.createElement('div', null,
      React.createElement(Section, {icon:'🛒',title:'Core Living (monthly, +CPI/yr)'},
        React.createElement('div',{className:'input-grid'},
          React.createElement(LField,{label:'Groceries & Household',k:'groceries',prefix:true}),
          React.createElement(LField,{label:'Utilities',k:'utilities',prefix:true}),
          React.createElement(LField,{label:'Phone + Internet',k:'phone',prefix:true}),
          React.createElement(LField,{label:'Streaming & Subscriptions',k:'streaming',prefix:true}),
          React.createElement(LField,{label:'Clothing & Personal Care',k:'clothing',prefix:true}),
          React.createElement(LField,{label:'Eating Out & Entertainment',k:'eatOut',prefix:true}),
          React.createElement(LField,{label:'Gifts',k:'gifts',prefix:true}),
          React.createElement(LField,{label:'CPI Rate',k:'cpiRate',pct:true}),
        )
      ),
      React.createElement(Section, {icon:'🏡',title:'Property Running (monthly, +CPI)'},
        React.createElement('div',{className:'input-grid'},
          React.createElement(LField,{label:'Council Rates',k:'council',prefix:true}),
          React.createElement(LField,{label:'Water',k:'water',prefix:true}),
          React.createElement(LField,{label:'Building Insurance',k:'buildingIns',prefix:true}),
          React.createElement(LField,{label:'Maintenance Fund',k:'maintenance',prefix:true}),
          React.createElement(LField,{label:'Strata / Body Corp',k:'strata',prefix:true}),
          React.createElement(LField,{label:'Garden / Cleaning',k:'garden',prefix:true}),
          React.createElement(LField,{label:'Other Household',k:'otherHouse',prefix:true}),
        )
      ),
      React.createElement(Section, {icon:'🚗',title:'Vehicles (monthly, +CPI)'},
        React.createElement('div',{className:'input-grid'},
          React.createElement(LField,{label:'Car 1 Fuel',k:'carFuel',prefix:true}),
          React.createElement(LField,{label:'Car 1 Insurance',k:'carIns',prefix:true}),
          React.createElement(LField,{label:'Car 1 Rego',k:'carRego',prefix:true}),
          React.createElement(LField,{label:'Car 1 Service/Tyres',k:'carService',prefix:true}),
          React.createElement(LField,{label:'Car 1 Replacement Fund',k:'carReplace',prefix:true}),
          React.createElement(LField,{label:'Car 2 All-in (age 33+)',k:'car2',prefix:true}),
        )
      ),
      React.createElement(Section, {icon:'🛡️',title:'Insurance (monthly, +CPI)'},
        React.createElement('div',{className:'input-grid'},
          React.createElement(LField,{label:'Private Health (family)',k:'healthIns',prefix:true}),
          React.createElement(LField,{label:'Life Insurance',k:'lifeIns',prefix:true}),
          React.createElement(LField,{label:'Income Protection',k:'incomeProtect',prefix:true}),
          React.createElement(LField,{label:'Trauma / Critical Illness',k:'trauma',prefix:true}),
        )
      ),
      React.createElement(Section, {icon:'🎯',title:'Savings Goals (monthly, +CPI)'},
        React.createElement('div',{className:'input-grid'},
          React.createElement(LField,{label:'International Travel Fund',k:'travel',prefix:true}),
          React.createElement(LField,{label:'Healthcare Gap / Dental',k:'healthcare',prefix:true}),
          React.createElement(LField,{label:'Christmas / Domestic',k:'christmas',prefix:true}),
        )
      ),
      React.createElement(Section, {icon:'👶',title:'Children & Education (monthly)'},
        React.createElement('div',{className:'input-grid'},
          React.createElement(LField,{label:'Childcare (age 4-5)',k:'childcare',prefix:true}),
          React.createElement(LField,{label:'Primary School era (age 6-12)',k:'primary',prefix:true}),
          React.createElement(LField,{label:'High School era (age 13-17)',k:'highSchool',prefix:true}),
          React.createElement(LField,{label:'Kids Sports & Activities',k:'kidsActivities',prefix:true}),
          React.createElement(LField,{label:"Uziel's ETF (age 18+, flat)",k:'uzielETF',prefix:true}),
          React.createElement(LField,{label:'Uziel Birth Year',k:'uzielBirthYear'}),
        )
      )
    ),

    sub==='super' && React.createElement('div', null,
      React.createElement(Section, {icon:'🏦',title:'Superannuation'},
        React.createElement('div',{className:'info-box',style:{marginBottom:'.75rem'}},
          React.createElement('p',null,'Contributions taxed at 15% on entry (auto). Accumulation return is net of 15% earnings tax (~6%). Pension phase post-60 is tax-free (~7%).')
        ),
        React.createElement('div',{className:'input-grid'},
          React.createElement(LField,{label:'Your Starting Super',k:'superYou',prefix:true}),
          React.createElement(LField,{label:'Partner Starting Super',k:'superPartner',prefix:true}),
          React.createElement(LField,{label:'Accumulation Return (net)',k:'superReturnAccum',pct:true,hint:'After 15% earnings tax'}),
          React.createElement(LField,{label:'Pension Phase Return',k:'superReturnPension',pct:true,hint:'Tax-free post-60'}),
          React.createElement(LField,{label:'Preservation Age',k:'preservationAge'}),
          React.createElement(LField,{label:'Super SWR',k:'superSWR',pct:true,hint:'Safe withdrawal rate'}),
        )
      ),
      React.createElement(Section, {icon:'📈',title:'ETF Portfolio'},
        React.createElement('div',{className:'info-box',style:{marginBottom:'.75rem'}},
          React.createElement('p',null,'Dividend yield is taxed each year at marginal rate (with franking credit refund). Capital growth grows tax-deferred.')
        ),
        React.createElement('div',{className:'input-grid'},
          React.createElement(LField,{label:'Total Return (gross)',k:'etfGross',pct:true,hint:'incl. dividends'}),
          React.createElement(LField,{label:'MER Fees',k:'etfFees',pct:true}),
          React.createElement(LField,{label:'Dividend Yield',k:'etfDividendYield',pct:true,hint:'taxable component'}),
          React.createElement(LField,{label:'Franking Portion',k:'frankingPortion',pct:true,hint:'% of divs that are franked'}),
          React.createElement(LField,{label:'ETF SWR',k:'etfSWR',pct:true}),
        )
      )
    ),

    sub==='ip' && React.createElement(Section, {icon:'🏗️',title:'Investment Property (Strategy 3 only)'},
      React.createElement('div',{className:'info-box',style:{marginBottom:'.75rem'}},
        React.createElement('p',null,'Negative gearing loss is deducted from owner\'s taxable income (refund flows back). Positive cashflow is added to taxable income. Set the IP owner in the Income & Tax tab.')
      ),
      React.createElement('div',{className:'input-grid'},
        React.createElement(LField,{label:'IP Purchase Age',k:'ipPurchaseAge'}),
        React.createElement(LField,{label:'IP Purchase Price',k:'ipPrice',prefix:true}),
        React.createElement(LField,{label:'IP Deposit %',k:'ipDepositPct',pct:true}),
        React.createElement(LField,{label:'IP Legal & Conveyancing',k:'ipLegal',prefix:true}),
        React.createElement(LField,{label:'IP Loan Rate',k:'ipLoanRate',pct:true}),
        React.createElement(LField,{label:'IP Capital Growth Rate',k:'ipGrowth',pct:true}),
        React.createElement(LField,{label:'IP Gross Rental Yield',k:'ipGrossYield',pct:true}),
        React.createElement(LField,{label:'IP Annual Expenses (Yr1)',k:'ipExpenses',prefix:true,hint:'CPI-inflated thereafter'}),
      ),
      React.createElement('div',{className:'info-box',style:{marginTop:'.75rem'}},
        React.createElement('p',null,
          'IP Stamp Duty (VIC): ', React.createElement('strong',{style:{color:'var(--text)'}}, '$'+Math.round(vicStampDuty(D.ipPrice)).toLocaleString()),
          '  ·  IP Loan: ', React.createElement('strong',{style:{color:'var(--gold)'}}, '$'+Math.round(D.ipPrice*(1-D.ipDepositPct)).toLocaleString())
        )
      )
    ),

    sub==='events' && React.createElement(Section, {icon:'📅',title:'Life Events (one-off costs)'},
      React.createElement('div',{className:'info-box',style:{marginBottom:'1rem'}},
        React.createElement('p',null,"Amount is in today's dollars. Toggle CPI to inflate to year-of-spend dollars.")
      ),
      ...(D.lifeEvents||[]).map(ev => React.createElement(LifeEventRow, {key:ev.id, ev,
        onUpdate:(k,v) => setD(p => ({...p, lifeEvents:p.lifeEvents.map(e=>e.id===ev.id?{...e,[k]:v}:e)})),
        onRemove: () => setD(p => ({...p, lifeEvents:p.lifeEvents.filter(e=>e.id!==ev.id)}))
      })),
      React.createElement('button', {className:'btn-add', onClick:()=>setD(p=>({...p,
        lifeEvents:[...p.lifeEvents,{id:Date.now(),age:40,date:'2037-07-01',label:'New Event',amount:5000,cpiLinked:true}]
      }))}, '+ Add Life Event')
    ),

    sub==='extras' && React.createElement('div', null,
      React.createElement(Section, {icon:'💵',title:'Extra Income Streams (gross, taxed)'},
        ...(D.extraIncome||[]).map(row => React.createElement(ExtraRecRow, {key:row.id, row, cpiOption:false,
          onUpdate:(k,v) => setD(p=>({...p, extraIncome:p.extraIncome.map(r=>r.id===row.id?{...r,[k]:v}:r)})),
          onRemove: () => setD(p=>({...p, extraIncome:p.extraIncome.filter(r=>r.id!==row.id)}))
        })),
        React.createElement('button', {className:'btn-add', onClick:()=>setD(p=>({...p,
          extraIncome:[...p.extraIncome,{id:Date.now(),label:'',monthlyAmount:0,ageFrom:31,ageTo:65}]
        }))}, '+ Add Income Stream')
      ),
      React.createElement(Section, {icon:'💸',title:'Extra Recurring Expenses'},
        ...(D.extraExpense||[]).map(row => React.createElement(ExtraRecRow, {key:row.id, row, cpiOption:true,
          onUpdate:(k,v) => setD(p=>({...p, extraExpense:p.extraExpense.map(r=>r.id===row.id?{...r,[k]:v}:r)})),
          onRemove: () => setD(p=>({...p, extraExpense:p.extraExpense.filter(r=>r.id!==row.id)}))
        })),
        React.createElement('button', {className:'btn-add', onClick:()=>setD(p=>({...p,
          extraExpense:[...p.extraExpense,{id:Date.now(),label:'',monthlyAmount:0,ageFrom:31,ageTo:65,cpiLinked:false}]
        }))}, '+ Add Expense')
      )
    )
  );
}

function buildWarnings(rows, D) {
  const w = [];
  const negOffsetYrs = rows.filter(r => r.offset < 0).map(r => r.age);
  if(negOffsetYrs.length > 0) w.push('Offset goes negative at age '+negOffsetYrs[0]+(negOffsetYrs.length>1?' (and '+(negOffsetYrs.length-1)+' other years)':'')+'. Cashflow squeeze.');
  const negEtfYrs = rows.filter(r => r.etf < 0).map(r => r.age);
  if(negEtfYrs.length > 0) w.push('ETF goes negative at age '+negEtfYrs[0]+'. Model is drawing down assets it doesn\'t have.');
  const sgcYou = D.sal34 * D.sgcRate;
  const sgcWife = D.wifeSal34 * D.sgcRate;
  if(sgcYou > 30000 || sgcWife > 30000) w.push('Super SGC exceeds $30k concessional cap. Excess incurs additional tax.');
  let streak = 0, maxStreak = 0, startAge = 0;
  rows.forEach(r => {
    if(r.netCash < 0) { streak++; if(streak>maxStreak){ maxStreak=streak; startAge=r.age-streak+1; } }
    else streak = 0;
  });
  if(maxStreak >= 3) w.push(maxStreak+' consecutive years of overspend starting age '+startAge+'. Sustained deficit.');
  return w;
}

function WarnBanner({rows, D}) {
  const warnings = useMemo(()=>buildWarnings(rows, D), [rows, D]);
  if(warnings.length === 0) return null;
  return React.createElement('div', {className:'warn-banner'},
    React.createElement('h4', null, '⚠ Sanity Checks'),
    React.createElement('ul', null, ...warnings.map((w,i)=>React.createElement('li',{key:i},w)))
  );
}

function LifeResults() {
  const {rows,D,update} = useLife();
  const [sub,setSub] = useState(() => localStorage.getItem('FP_Life_Res_Tab') || 'summary');
  const [cfTab,setCfTab] = useState('flow');
  const [selectedAge,setSelectedAge] = useState(60);
  useEffect(() => localStorage.setItem('FP_Life_Res_Tab', sub), [sub]);

  const SUBS = [
    {id:'summary',label:'📊 Milestones'},
    {id:'cashflow',label:'💵 Cashflow'},
    {id:'wealth',label:'📈 Wealth Growth'},
    {id:'passive',label:'🎯 Passive Income'},
  ];
  const at = age => rows.find(r => r.age===age) || {};
  const currentAgeData = at(selectedAge);

  const rowsS1 = useMemo(() => computeLife({...D,strategy:1}), [D]);
  const rowsS2 = useMemo(() => computeLife({...D,strategy:2}), [D]);
  const rowsS3 = useMemo(() => computeLife({...D,strategy:3}), [D]);
  const comparisonData = useMemo(() => rows.map((r,idx) => ({
    age:r.age,
    'S1 · 100% Offset':rowsS1[idx]?.passiveIncome,
    'S2 · 50/50 ETF':rowsS2[idx]?.passiveIncome,
    'S3 · Inv. Property':rowsS3[idx]?.passiveIncome,
  })), [rows,rowsS1,rowsS2,rowsS3]);

  return React.createElement('div', null,
    React.createElement(WarnBanner, {rows,D}),
    React.createElement('div', {style:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem'}},
      React.createElement('div', null,
        React.createElement('h1',{className:'page-title'},'Life Plan Results'),
        React.createElement('p',{className:'page-subtitle'},'Strategy '+(D.strategy===1?'1: 100% Offset':D.strategy===2?'2: 50/50 ETF':'3: Investment Property')+' · Age 31→65 · Real tax engine active')
      ),
      React.createElement('div', {style:{display:'flex',gap:'.5rem',alignItems:'center',flexWrap:'wrap'}},
        React.createElement('span', {style:{fontSize:'var(--t-xs)',color:'var(--text2)'}}, 'Strategy:'),
        ...[{v:1,l:'1 · 100% Offset'},{v:2,l:'2 · 50/50 ETF'},{v:3,l:'3 · Inv. Property'}].map(s =>
          React.createElement('button', {key:s.v,
            style:{padding:'.35rem .8rem',borderRadius:'var(--radius-sm)',border:'1px solid',
              borderColor:D.strategy===s.v?'var(--gold-dim)':'var(--border)',
              background:D.strategy===s.v?'var(--gold-glow)':'transparent',
              color:D.strategy===s.v?'var(--gold)':'var(--text2)',
              cursor:'pointer',fontSize:'var(--t-xs)',fontFamily:"'Syne',sans-serif",fontWeight:600},
            onClick:()=>update('strategy',s.v)}, s.l)
        )
      )
    ),
    React.createElement('nav', {className:'subnav'},
      ...SUBS.map(s => React.createElement('button', {key:s.id, className:'subnav-btn'+(sub===s.id?' active':''), onClick:()=>setSub(s.id)}, s.label))
    ),

    sub==='summary' && React.createElement('div', null,
      React.createElement('div', {className:'subnav', style:{borderBottom:'none',marginBottom:'1rem'}},
        [40,45,50,55,60,65].map(a => React.createElement('button', {key:a,
          className:'subnav-btn'+(selectedAge===a?' active':''), onClick:()=>setSelectedAge(a)}, 'Age '+a))
      ),
      React.createElement('div', {className:'stat-grid'},
        React.createElement('div',{className:'stat-card highlight'},
          React.createElement('div',{className:'stat-label'},'NW (Excl. Super & Offset) at Age '+selectedAge),
          React.createElement('div',{className:'stat-value'},fmtA(currentAgeData.nwTotal - currentAgeData.superBal - currentAgeData.offset)),
          React.createElement('div',{className:'stat-sub'},'PPOR Equity + ETF'+(D.strategy===3?' + IP Equity':''))),
        React.createElement('div',{className:'stat-card'},
          React.createElement('div',{className:'stat-label'},'PPOR Value'),
          React.createElement('div',{className:'stat-value'},fmtA(currentAgeData.pporVal))),
        React.createElement('div',{className:'stat-card'},
          React.createElement('div',{className:'stat-label'},'ETF Balance'),
          React.createElement('div',{className:'stat-value'},fmtA(currentAgeData.etf))),
        React.createElement('div',{className:'stat-card'},
          React.createElement('div',{className:'stat-label'},'Super Balance'),
          React.createElement('div',{className:'stat-value'},fmtA(currentAgeData.superBal))),
      ),
      React.createElement('div', {className:'chart-card'},
        React.createElement('div',{className:'chart-title'},'Net Worth Growth (Age 31→65)'),
        React.createElement(ResponsiveContainer, {width:'100%',height:300},
          React.createElement(LineChart, {data:rows,margin:{top:8,right:16,bottom:0,left:8}},
            React.createElement(CartesianGrid,{strokeDasharray:'3 3',stroke:'var(--border)'}),
            React.createElement(XAxis,{dataKey:'age',tick:{fill:'var(--text3)',fontSize:11},tickLine:false}),
            React.createElement(YAxis,{tickFormatter:v=>'$'+(v/1e6).toFixed(1)+'M',tick:{fill:'var(--text3)',fontSize:11},tickLine:false,axisLine:false}),
            React.createElement(Tooltip,{formatter:(v,n)=>[fmtA(v),n],contentStyle:{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',fontSize:'var(--t-xs)'}}),
            React.createElement(Line,{type:'monotone',dataKey:'pporVal',name:'PPOR Value',stroke:'var(--green)',strokeWidth:2,dot:false}),
            React.createElement(Line,{type:'monotone',dataKey:'etf',name:'ETF',stroke:'var(--gold)',strokeWidth:2,dot:false}),
            React.createElement(Line,{type:'monotone',dataKey:'nw',name:'NW (Excl. PPOR)',stroke:'var(--blue)',strokeWidth:2.5,dot:false}),
            React.createElement(Legend,{wrapperStyle:{fontSize:'var(--t-xs)',color:'var(--text2)'}})
          )
        )
      )
    ),

    sub==='cashflow' && React.createElement('div', null,
      React.createElement('div', {className:'chart-card'},
        React.createElement('div',{className:'chart-title'},'Annual Net Cash (after life events & tax)'),
        React.createElement(ResponsiveContainer, {width:'100%',height:240},
          React.createElement(BarChart, {data:rows,margin:{top:8,right:16,bottom:0,left:8}},
            React.createElement(CartesianGrid,{strokeDasharray:'3 3',stroke:'var(--border)'}),
            React.createElement(XAxis,{dataKey:'age',tick:{fill:'var(--text3)',fontSize:11},tickLine:false}),
            React.createElement(YAxis,{tickFormatter:v=>'$'+(v/1000).toFixed(0)+'k',tick:{fill:'var(--text3)',fontSize:11},tickLine:false,axisLine:false}),
            React.createElement(Tooltip,{formatter:(v,n)=>[fmtA(v),n],contentStyle:{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',fontSize:'var(--t-xs)'}}),
            React.createElement(ReferenceLine,{y:0,stroke:'var(--red)',strokeDasharray:'4 2'}),
            React.createElement(Bar,{dataKey:'netCash',name:'Net Cash',radius:[2,2,0,0]},
              ...rows.map((r,i)=>React.createElement(Cell,{key:i,fill:r.netCash>=0?'var(--green)':'var(--red)'}))
            )
          )
        )
      ),
      React.createElement('div', {className:'subnav', style:{borderBottom:'none',marginBottom:'1rem',marginTop:'1.5rem'}},
        React.createElement('button', {className:'subnav-btn'+(cfTab==='flow'?' active':''), onClick:()=>setCfTab('flow')}, '💰 Operating Cash Flow'),
        React.createElement('button', {className:'subnav-btn'+(cfTab==='tax'?' active':''), onClick:()=>setCfTab('tax')}, '📊 Tax Detail'),
        React.createElement('button', {className:'subnav-btn'+(cfTab==='loan'?' active':''), onClick:()=>setCfTab('loan')}, '🏦 Mortgage & Wealth'),
        D.strategy===3 && React.createElement('button', {className:'subnav-btn'+(cfTab==='ip'?' active':''), onClick:()=>setCfTab('ip')}, '🏗️ Investment Property')
      ),
      React.createElement('div', {className:'chart-card'},
        React.createElement('div',{className:'chart-title'},
          cfTab==='flow'?'Operating Cash Flow Detail':
          cfTab==='tax'?'Tax Detail (per person)':
          cfTab==='loan'?'Mortgage & Wealth Detail':'Investment Property Detail'),
        React.createElement('div', {className:'table-wrap'},
          React.createElement('table', {className:'data-table'},
            cfTab==='flow' && React.createElement(React.Fragment, null,
              React.createElement('thead', null, React.createElement('tr', null,
                ...['Age','Year','Net Income (after tax)','Core','Prop','Veh','Ins','Sav','Child','Extra Exp','Life Event','Pre-Mortgage Cash'].map(h=>React.createElement('th',{key:h},h))
              )),
              React.createElement('tbody', null,
                ...rows.map(r => React.createElement('tr', {key:r.age},
                  React.createElement('td',{style:{fontWeight:700,color:'var(--gold)'}},r.age),
                  React.createElement('td',null,r.year),
                  React.createElement('td',{className:'gold-t'},fmtA(r.totalIncome)),
                  React.createElement('td',null,fmtA(r.core)),
                  React.createElement('td',null,fmtA(r.prop)),
                  React.createElement('td',null,fmtA(r.veh)),
                  React.createElement('td',null,fmtA(r.ins)),
                  React.createElement('td',null,fmtA(r.sav)),
                  React.createElement('td',null,fmtA(r.child)),
                  React.createElement('td',null,fmtA(r.extraExp)),
                  React.createElement('td',{className:r.lec>0?'neg':''},r.lec>0?fmtA(-r.lec):'—'),
                  React.createElement('td',{className:r.preMortgageCash>=0?'pos':'neg'},fmtA(r.preMortgageCash))
                ))
              )
            ),
            cfTab==='tax' && React.createElement(React.Fragment, null,
              React.createElement('thead', null, React.createElement('tr', null,
                ...['Age','Year','Your Tax','Wife Tax','ETF Dividends','Franking Credits','IP Net CF'].map(h=>React.createElement('th',{key:h},h))
              )),
              React.createElement('tbody', null,
                ...rows.map(r => React.createElement('tr', {key:r.age},
                  React.createElement('td',{style:{fontWeight:700,color:'var(--gold)'}},r.age),
                  React.createElement('td',null,r.year),
                  React.createElement('td',{style:{color:'var(--red)'}},fmtA(r.youTax)),
                  React.createElement('td',{style:{color:'var(--red)'}},fmtA(r.wifeTax)),
                  React.createElement('td',null,fmtA(r.etfDiv)),
                  React.createElement('td',{style:{color:'var(--green)'}},fmtA(r.frankingCredits)),
                  React.createElement('td',{className:r.ipNetCF>=0?'pos':'neg'},r.ipNetCF!==0?fmtA(r.ipNetCF):'—')
                ))
              )
            ),
            cfTab==='loan' && React.createElement(React.Fragment, null,
              React.createElement('thead', null, React.createElement('tr', null,
                ...['Age','Year','Available Cash','Repayment','Interest','Principal','Net Cash','Offset','Loan Bal','ETF','Super'].map(h=>React.createElement('th',{key:h},h))
              )),
              React.createElement('tbody', null,
                ...rows.map(r => React.createElement('tr', {key:r.age},
                  React.createElement('td',{style:{fontWeight:700,color:'var(--gold)'}},r.age),
                  React.createElement('td',null,r.year),
                  React.createElement('td',null,fmtA(r.preMortgageCash)),
                  React.createElement('td',null,fmtA(r.mort)),
                  React.createElement('td',{style:{color:'var(--red)'}},fmtA(r.interestPaid)),
                  React.createElement('td',{style:{color:'var(--green)'}},fmtA(r.principalPaid)),
                  React.createElement('td',{className:r.netCash>=0?'pos':'neg'},fmtA(r.netCash)),
                  React.createElement('td',{className:r.offset>=0?'gold-t':'neg'},fmtA(r.offset)),
                  React.createElement('td',{style:{color:'var(--red)',fontWeight:600}},fmtA(r.remainLoan)),
                  React.createElement('td',null,fmtA(r.etf)),
                  React.createElement('td',null,fmtA(r.superBal))
                ))
              )
            ),
            cfTab==='ip' && React.createElement(React.Fragment, null,
              React.createElement('thead', null, React.createElement('tr', null,
                ...['Age','Year','IP Value','IP Loan','IP Equity','Net Cashflow','Topup Required'].map(h=>React.createElement('th',{key:h},h))
              )),
              React.createElement('tbody', null,
                ...rows.map(r => React.createElement('tr', {key:r.age},
                  React.createElement('td',{style:{fontWeight:700,color:'var(--gold)'}},r.age),
                  React.createElement('td',null,r.year),
                  React.createElement('td',null,fmtA(r.ipVal)),
                  React.createElement('td',{style:{color:'var(--red)'}},fmtA(r.ipLoan)),
                  React.createElement('td',{style:{color:'var(--green)'}},fmtA(r.ipEquity)),
                  React.createElement('td',{className:r.ipNetCF>=0?'pos':'neg'},r.ipVal>0?fmtA(r.ipNetCF):'—'),
                  React.createElement('td',{className:r.ipTopup>0?'neg':''},r.ipTopup>0?fmtA(-r.ipTopup):'—')
                ))
              )
            )
          )
        )
      )
    ),

    sub==='wealth' && React.createElement('div', {className:'chart-card'},
      React.createElement('div',{className:'chart-title'},'Wealth Components Stacked'),
      React.createElement(ResponsiveContainer, {width:'100%',height:320},
        React.createElement(BarChart, {data:rows,margin:{top:8,right:16,bottom:0,left:8}},
          React.createElement(CartesianGrid,{strokeDasharray:'3 3',stroke:'var(--border)'}),
          React.createElement(XAxis,{dataKey:'age',tick:{fill:'var(--text3)',fontSize:11},tickLine:false}),
          React.createElement(YAxis,{tickFormatter:v=>'$'+(v/1e6).toFixed(1)+'M',tick:{fill:'var(--text3)',fontSize:11},tickLine:false,axisLine:false}),
          React.createElement(Tooltip, {content:({active,payload,label})=>{
            if(!active||!payload?.length) return null;
            const row = payload[0].payload;
            const totalIncl = row.nwTotal;
            const totalExcl = row.nwTotal - row.superBal;
            return React.createElement('div',{style:{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',padding:'.6rem .9rem',fontSize:'var(--t-xs)'}},
              React.createElement('p',{style:{color:'var(--gold)',fontFamily:"'Syne',sans-serif",fontWeight:700,marginBottom:'.3rem'}},'Age '+label),
              ...payload.map(p=>React.createElement('p',{key:p.dataKey,style:{color:p.color}},p.name+': '+fmtA(p.value))),
              React.createElement('div',{style:{marginTop:'.4rem',paddingTop:'.4rem',borderTop:'1px solid var(--border2)'}},
                React.createElement('p',{style:{color:'var(--text)',fontWeight:600}},'Total (excl. Super): '+fmtA(totalExcl)),
                React.createElement('p',{style:{color:'var(--text)',fontWeight:600}},'Total (incl. Super): '+fmtA(totalIncl))
              )
            );
          }}),
          React.createElement(Bar,{dataKey:'pporVal',name:'PPOR Value',stackId:'a',fill:'var(--blue)'}),
          React.createElement(Bar,{dataKey:'etf',name:'ETF',stackId:'a',fill:'var(--gold)'}),
          React.createElement(Bar,{dataKey:'superBal',name:'Super',stackId:'a',fill:'var(--green)'}),
          D.strategy===3 && React.createElement(Bar,{dataKey:'ipEquity',name:'IP Equity',stackId:'a',fill:'#a78bfa'}),
          React.createElement(Legend,{wrapperStyle:{fontSize:'var(--t-xs)',color:'var(--text2)'}})
        )
      )
    ),

    sub==='passive' && React.createElement('div', null,
      React.createElement('div', {className:'chart-card'},
        React.createElement('div',{className:'chart-title'},'Passive Income Potential Comparison (3.5% SWR)'),
        React.createElement(ResponsiveContainer, {width:'100%',height:260},
          React.createElement(LineChart, {data:comparisonData,margin:{top:8,right:16,bottom:0,left:8}},
            React.createElement(CartesianGrid,{strokeDasharray:'3 3',stroke:'var(--border)'}),
            React.createElement(XAxis,{dataKey:'age',tick:{fill:'var(--text3)',fontSize:11},tickLine:false}),
            React.createElement(YAxis,{tickFormatter:v=>'$'+(v/1000).toFixed(0)+'k',tick:{fill:'var(--text3)',fontSize:11},tickLine:false,axisLine:false}),
            React.createElement(Tooltip,{formatter:(v,n)=>[fmtA(v),n],contentStyle:{background:'var(--surface2)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',fontSize:'var(--t-xs)'}}),
            React.createElement(Line,{type:'monotone',dataKey:'S1 · 100% Offset',name:'1 · 100% Offset',stroke:'var(--blue)',strokeWidth:2.5,dot:false}),
            React.createElement(Line,{type:'monotone',dataKey:'S2 · 50/50 ETF',name:'2 · 50/50 ETF',stroke:'var(--gold)',strokeWidth:2.5,dot:false}),
            React.createElement(Line,{type:'monotone',dataKey:'S3 · Inv. Property',name:'3 · Inv. Property',stroke:'var(--green)',strokeWidth:2.5,dot:false}),
            React.createElement(ReferenceLine,{x:60,stroke:'var(--red)',strokeDasharray:'4 2',label:{value:'Age 60',fill:'var(--red)',fontSize:11}}),
            React.createElement(Legend,{wrapperStyle:{fontSize:'var(--t-xs)',color:'var(--text2)',marginTop:'.5rem'}})
          )
        )
      ),
      React.createElement('div', {className:'stat-grid'},
        ...[35,40,45,50,55,60,65].map(age => React.createElement('div', {key:age, className:'stat-card'+(age===60?' highlight':'')},
          React.createElement('div',{className:'stat-label'},'Age '+age),
          React.createElement('div',{className:'stat-value',style:{fontSize:'var(--t-lg)'}},fmtA(at(age).passiveIncome)),
          React.createElement('div',{className:'stat-sub'},'NW: '+fmtA(at(age).nwTotal))
        ))
      )
    )
  );
}

function LifePlanner({startingCash}) {
  const [page,setPage] = useState(() => localStorage.getItem('FP_Life_Tab') || 'assumptions');
  useEffect(() => localStorage.setItem('FP_Life_Tab', page), [page]);
  return React.createElement(LifeProvider, {startingCash},
    React.createElement('div', null,
      React.createElement('nav', {className:'subnav subnav-primary', style:{marginBottom:'0'}},
        React.createElement('button', {className:'subnav-btn'+(page==='assumptions'?' active':''), onClick:()=>setPage('assumptions')}, '⚙️ Assumptions'),
        React.createElement('button', {className:'subnav-btn'+(page==='results'?' active':''), onClick:()=>setPage('results')}, '📊 Results')
      ),
      React.createElement('div', {style:{marginTop:'1.5rem'}},
        page==='assumptions' && React.createElement(LifeAssumptions, null),
        page==='results' && React.createElement(LifeResults, null)
      )
    )
  );
}

function LifePlannerConnected() {
  const {compute,nepalCalc} = useFinance();
  const rows = useMemo(() => compute(), [compute]);
  const nepal = useMemo(() => nepalCalc(), [nepalCalc]);
  const last = rows[rows.length-1];
  const startingCash = Math.round((last.balA||0) + (last.balB||0) + (nepal.totalAUD||0));
  return React.createElement(LifePlanner, {startingCash});
}

