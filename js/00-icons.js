// ═══════════════════════════════════════════════════════════════
// Inline SVG icon set — replaces emoji glyphs across the app.
// Self-contained (no external icon font/CDN); stroke-based, 24x24 grid.
// ═══════════════════════════════════════════════════════════════
const ICON_PATHS = {
  'bar-chart': 'M4 20V10 M10 20V4 M16 20V13 M22 20V8',
  'trending-up': 'M3 17l6-6 4 4 8-8 M15 6h6v6',
  'trending-down': 'M3 7l6 6 4-4 8 8 M15 18h6v-6',
  'dollar-sign': 'M12 2v20 M17 6.5c0-1.5-2-2.5-5-2.5s-5 1.2-5 3 2 2.5 5 3 5 1.5 5 3-2 3-5 3-5-1-5-2.5',
  'target': 'M12 12 M12 21a9 9 0 100-18 9 9 0 000 18z M12 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z M12 13a1 1 0 100-2 1 1 0 000 2z',
  'home': 'M3 11.5L12 4l9 7.5 M5 10v10h14V10',
  'credit-card': 'M2 6h20a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V7a1 1 0 011-1z M1 10h22 M5 15h4',
  'sun': 'M12 17a5 5 0 100-10 5 5 0 000 10z M12 1v3 M12 20v3 M4.2 4.2l2.1 2.1 M17.7 17.7l2.1 2.1 M1 12h3 M20 12h3 M4.2 19.8l2.1-2.1 M17.7 6.3l2.1-2.1',
  'moon': 'M20 14.5A8.5 8.5 0 0110.5 4 8.5 8.5 0 1020 14.5z',
  'log-out': 'M15 17l5-5-5-5 M20 12H8 M8 21H4a1 1 0 01-1-1V4a1 1 0 011-1h4',
  'x': 'M5 5l14 14 M19 5L5 19',
  'check': 'M4 12l6 6L20 6',
  'check-circle': 'M12 21a9 9 0 100-18 9 9 0 000 18z M8 12l3 3 6-6',
  'calendar': 'M4 5h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z M3 9h18 M8 2v6 M16 2v6',
  'chevron-right': 'M9 5l7 7-7 7',
  'chevron-left': 'M15 5l-7 7 7 7',
  'arrows-h': 'M17 8l4 4-4 4 M7 8l-4 4 4 4 M3 12h18',
  'arrow-up': 'M12 20V4 M5 11l7-7 7 7',
  'arrow-down': 'M12 4v16 M19 13l-7 7-7-7',
  'corner-down-right': 'M5 3v9a2 2 0 002 2h12 M14 9l5 5-5 5',
  'user': 'M12 13a4.5 4.5 0 100-9 4.5 4.5 0 000 9z M4 21c0-4 3.5-7 8-7s8 3 8 7',
  'bank': 'M3 21h18 M4 21V10 M20 21V10 M2 10l10-6 10 6 M8 21v-6 M12 21v-6 M16 21v-6',
  'shopping-cart': 'M2 3h2l2.6 12.4a2 2 0 002 1.6h8.8a2 2 0 002-1.7l1.1-7.3H5.2 M9 21a1 1 0 100-2 1 1 0 000 2z M18 21a1 1 0 100-2 1 1 0 000 2z',
  'baby': 'M9 12a3 3 0 106 0 M12 3a2 2 0 100 4 2 2 0 000-4z M4 20c0-4 3-6 8-6s8 2 8 6',
  'mountain': 'M2 20L9 8l4 6 3-4 6 10H2z',
  'refresh': 'M21 8a9 9 0 00-15.5-4.9L3 5.5 M3 4v4h4 M3 16a9 9 0 0015.5 4.9l2.5-2.4 M21 20v-4h-4',
  'clipboard': 'M9 3h6a1 1 0 011 1v1H8V4a1 1 0 011-1z M6 5h12a1 1 0 011 1v14a1 1 0 01-1 1H6a1 1 0 01-1-1V6a1 1 0 011-1z M9 11h6 M9 15h6',
  'alert-triangle': 'M12 3l10 18H2L12 3z M12 10v4 M12 17.5h.01',
  'award': 'M12 15a6 6 0 100-12 6 6 0 000 12z M8.2 13.5L7 21l5-2.5 5 2.5-1.2-7.5',
  'settings': 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 13a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.6V19a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.6-1H5a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3h0a1.7 1.7 0 001-1.6V5a2 2 0 114 0v.1a1.7 1.7 0 001 1.6 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9v0a1.7 1.7 0 001.6 1H19a2 2 0 010 4h-.1a1.7 1.7 0 00-1.6 1z',
  'lock': 'M5 11h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z M8 11V7a4 4 0 118 0v4',
  'lightbulb': 'M9 18h6 M10 21h4 M12 3a6 6 0 00-3.5 10.9 3.2 3.2 0 011.3 2.1h4.4a3.2 3.2 0 011.3-2.1A6 6 0 0012 3z',
  'smartphone': 'M6 2h12a1 1 0 011 1v18a1 1 0 01-1 1H6a1 1 0 01-1-1V3a1 1 0 011-1z M10 18h4',
  'zap': 'M13 2L4 14h6l-1 8 9-12h-6l1-8z',
  'trash': 'M4 7h16 M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13 M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3 M10 11v6 M14 11v6',
  'folder': 'M3 6a1 1 0 011-1h5l2 2h9a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V6z',
  'inbox': 'M4 4h16l-1 12H5L4 4z M8 12l4 4 4-4 M12 16V8',
  'file-text': 'M14 2H6a1 1 0 00-1 1v18a1 1 0 001 1h12a1 1 0 001-1V8l-6-6z M14 2v6h6 M8 13h8 M8 17h8',
  'search': 'M11 18a7 7 0 100-14 7 7 0 000 14z M21 21l-4.3-4.3',
  'utensils': 'M6 2v9a2 2 0 004 0V2 M8 11v11 M18 2c-2 0-4 2-4 5v3h4 M16 10v9',
  'fuel': 'M3 22V6a2 2 0 012-2h6a2 2 0 012 2v16 M3 22h10 M13 10h2l3 3v6a1.5 1.5 0 003 0v-8l-3-4 M6 6h4',
  'shield': 'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z',
  'graduation-cap': 'M12 3L2 8l10 5 10-5-10-5z M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5',
  'pill': 'M4.5 12.5l7-7a4.2 4.2 0 116 6l-7 7a4.2 4.2 0 11-6-6z M8.5 8.5l7 7',
  'shopping-bag': 'M6 8h12l1 13a1 1 0 01-1 1H6a1 1 0 01-1-1L6 8z M9 8V6a3 3 0 016 0v2',
  'gamepad': 'M8 9v3 M6.5 10.5h3 M15 9.5h.01 M17.5 12h.01 M6 6h12a4 4 0 014 4v4a4 4 0 01-4 4H6a4 4 0 01-4-4v-4a4 4 0 014-4z',
  'laptop': 'M4 5h16a1 1 0 011 1v10H3V6a1 1 0 011-1z M2 19h20 M9 16h6',
  'help-circle': 'M12 21a9 9 0 100-18 9 9 0 000 18z M9.5 9a2.5 2.5 0 115 .5c0 1.5-2.5 1.5-2.5 3.5 M12 17h.01',
  'info': 'M12 21a9 9 0 100-18 9 9 0 000 18z M12 11v6 M12 7.5h.01',
  'circle': 'M12 21a9 9 0 100-18 9 9 0 000 18z',
  'plus': 'M12 5v14 M5 12h14',
  'sparkles': 'M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z',
  'eye': 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z M12 15a3 3 0 100-6 3 3 0 000 6z',
  'eye-off': 'M2 2l20 20 M9.5 9.5a3 3 0 004.2 4.2 M6.7 6.7C4 8.3 1 12 1 12s4 7 11 7c1.6 0 3-.3 4.3-.9 M14.1 5.2A11.8 11.8 0 0112 5c7 0 11 7 11 7-.5.9-1.6 2.4-3.1 3.7',
  'edit': 'M12 20h9 M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  'link': 'M9 17H7a5 5 0 010-10h2 M15 7h2a5 5 0 010 10h-2 M8 12h8',
  'tag': 'M20.6 12.4L12.7 20.3a1.9 1.9 0 01-2.7 0l-6.3-6.3a1.9 1.9 0 010-2.7L11.6 3.3a1.9 1.9 0 011.3-.6l6 .2a1.9 1.9 0 011.8 1.8l.2 6a1.9 1.9 0 01-.3 1.7z M15 8h.01',
  'car': 'M5 17h14 M5 17a2 2 0 11-4 0 M19 17a2 2 0 104 0 M3 17v-4l2-5a2 2 0 012-1h10a2 2 0 012 1l2 5v4 M5 12h14',
  'flag': 'M4 22V3 M4 3h13l-2.5 4L17 11H4',
  'building': 'M4 22h16 M6 22V4a1 1 0 011-1h10a1 1 0 011 1v18 M9 8h1 M9 12h1 M14 8h1 M14 12h1 M10 22v-4h4v4',
  'landmark': 'M3 22h18 M4 22V11 M20 22V11 M2 11l10-7 10 7 M9 22v-7 M15 22v-7',
  'reconcile': 'M17 3l4 4-4 4 M21 7H9 M7 21l-4-4 4-4 M3 17h12',
};

function Icon({name, size=16, style, title, className}) {
  const d = ICON_PATHS[name];
  if (!d) return null;
  return React.createElement('svg', {
    viewBox:'0 0 24 24', width:size, height:size, fill:'none', stroke:'currentColor',
    strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', className,
    style:{display:'inline-block',verticalAlign:'-0.2em',flexShrink:0, ...style}
  },
    title && React.createElement('title', null, title),
    React.createElement('path', {d})
  );
}

// Convenience: icon + text, matching the old "emoji + label" string pattern.
function IconLabel({icon, size=14, gap='.4em', style, children}) {
  return React.createElement('span', {style:{display:'inline-flex',alignItems:'center',gap,...style}},
    React.createElement(Icon, {name:icon, size}),
    React.createElement('span', null, children)
  );
}
