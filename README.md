# FinancePlan 2028 — Split Repo

This is the same app you had as a single `financeplan.html`, now split into separate JS files for easier maintenance.

## File structure

```
financeplan.html          ← Shell: HTML, CSS, login screen, script tags
js/
├── 01-engine.js          ← React hooks, tax engine, Supabase sync, helpers
├── 02-family-plan.js     ← Family Plan tab (Projection 2028)
├── 03-life-plan.js       ← Life Plan tab (35-year model)
├── 04-cashflow.js        ← Monthly Cash tab — CSV import, reconciliation
├── 05-analysis.js        ← Analysis sub-tab — waterfall, BNPL, recurring
└── 06-app.js             ← NAV, AppInner, mount handler
```

## How to deploy to GitHub Pages

1. Drag the whole folder (`financeplan.html` + `js/`) into your repo
2. Commit
3. Wait ~30 sec for Pages to redeploy
4. Hard-refresh your browser (Cmd/Ctrl+Shift+R)

## No build step needed

These are plain `.js` files. The browser loads them in order via `<script>` tags. No npm, no node, no compilation.

## When updating files

If you change a JS file and the browser is still showing old content, bump the cache-buster version in `financeplan.html`:

```html
<script src="js/01-engine.js?v=1"></script>  →  <script src="js/01-engine.js?v=2"></script>
```

That forces the browser to fetch the new version.

## Script load order matters

The files MUST load in this order (which they already do):
1. `01-engine.js` defines React hooks, helpers (`fmt`, `useSync`, etc.)
2. `02-family-plan.js`, `03-life-plan.js`, `04-cashflow.js`, `05-analysis.js` use those helpers
3. `06-app.js` mounts the app — must load last

Don't reorder the script tags.

## Recovering a single-file version

If anything breaks, you can always reassemble by concatenating the 6 JS files and pasting them back into a `<script>` block in the HTML. Or roll back via Git.
