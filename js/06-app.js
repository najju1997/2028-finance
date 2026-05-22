const NAV = [{id:'projection',label:'🇦🇺 Family Plan'},{id:'life',label:'🏠 Life Plan'},{id:'cashflow',label:'💳 Monthly Cash'}];

function AppInner() {
  const [page,setPage] = useState(() => localStorage.getItem('FP_Main_Page') || 'projection');
  useEffect(() => localStorage.setItem('FP_Main_Page', page), [page]);
  const [menuOpen,setMenuOpen] = useState(false);
  const [theme,setTheme] = useState(() => localStorage.getItem('FP_Theme') || 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('FP_Theme', theme);
  }, [theme]);
  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark'); }

  async function doLogout() {
    try { await window._sb.auth.signOut(); } catch(e){}
    localStorage.removeItem('FP_Main_Page');
    localStorage.removeItem('FP_Proj_Tab');
    localStorage.removeItem('FP_Proj_Res_Tab');
    localStorage.removeItem('FP_Life_Tab');
    localStorage.removeItem('FP_Life_Assump_Tab');
    localStorage.removeItem('FP_Life_Res_Tab');
    localStorage.removeItem('FinancePlan_A');
    localStorage.removeItem('FinancePlan_D');
    localStorage.removeItem('FinancePlan_T');
    window.location.reload();
  }

  return React.createElement('div', {className:'app'},
    React.createElement('header', {className:'topbar'},
      React.createElement('div', {className:'topbar-inner'},
        React.createElement('div', {className:'brand'},
          React.createElement('span', {className:'brand-icon'}, '₳'),
          React.createElement('span', {className:'brand-name'}, 'FinancePlan ', React.createElement('span', {className:'brand-year'}, '2028'))
        ),
        React.createElement('nav', {className:'desktop-nav'},
          ...NAV.map(n => React.createElement('button', {key:n.id, className:'nav-btn'+(page===n.id?' active':''), onClick:()=>setPage(n.id)}, n.label))
        ),
        React.createElement('div', {style:{display:'flex',gap:'.5rem',alignItems:'center',flexWrap:'wrap'}},
          React.createElement(SyncBadge, null),
          React.createElement('button', {className:'theme-toggle', onClick:toggleTheme, title:(theme==='dark'?'Switch to light mode':'Switch to dark mode')},
            theme === 'dark' ? '☀️' : '🌙'
          ),
          React.createElement('button', {className:'hamburger', onClick:()=>setMenuOpen(o=>!o)},
            React.createElement('span', {className:'ham-line', style:menuOpen?{transform:'translateY(7px) rotate(45deg)'}:{}}),
            React.createElement('span', {className:'ham-line', style:menuOpen?{opacity:0}:{}}),
            React.createElement('span', {className:'ham-line', style:menuOpen?{transform:'translateY(-7px) rotate(-45deg)'}:{}})
          ),
          React.createElement('button', {onClick:doLogout, className:'desktop-logout',
            style:{background:'none',border:'1px solid var(--border)',color:'var(--text3)',cursor:'pointer',fontSize:'var(--t-xs)',padding:'.3rem .6rem',borderRadius:'var(--radius-sm)'}},
            'Logout')
        )
      ),
      menuOpen && React.createElement('div', {className:'mobile-menu'},
        ...NAV.map(n => React.createElement('button', {key:n.id, className:'mobile-nav-btn'+(page===n.id?' active':''), onClick:()=>{setPage(n.id);setMenuOpen(false);}}, n.label)),
        React.createElement('button', {key:'logout', className:'mobile-nav-btn', onClick:()=>{setMenuOpen(false);doLogout();},
          style:{borderTop:'1px solid var(--border)',marginTop:'.25rem',paddingTop:'.75rem',color:'var(--red)'}},
          '↪ Logout')
      )
    ),
    React.createElement('main', {className:'main-content'},
      page==='projection' && React.createElement(Projection2028, null),
      page==='life' && React.createElement(LifePlannerConnected, null),
      page==='cashflow' && React.createElement(CashflowTrackerConnected, null)
    )
  );
}

function App() {
  return React.createElement(SyncProvider, null,
    React.createElement(FinanceProvider, null,
      React.createElement(AppInner, null)
    )
  );
}


// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════


window._appMounted = false;
function initApp() {
  window._appMounted = true;
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
}
