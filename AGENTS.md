# Autolub - Livro Caixa

Single-page app (HTML/CSS/JS). Backend is a Google Apps Script Web App — **do not modify it**.

## Files

- `index.html` — markup
- `style.css` — Apple-style design system, CSS custom properties, dark/light themes
- `script.js` — all front-end logic; API calls to Google Apps Script
- `vercel.json` — static deploy (no rewrite rules needed, can be simplified)
- `alterações.md` — pending changes from the owner

## Pending Changes (from alterações.md)

1. Single password "ricardo26" replacing two-password system
2. Remove password requirement for edit/delete operations
3. Remove password requirement for reports access
4. Add 5-second "Salvando..." → "Salvo" popup on save
5. All changes must be front-end only (no Google Apps Script changes)
6. Refactor CSS: premium buttons, mobile-first

## No CI/Lint/Tests

No test suite, no linting config, no build step. Changes are applied directly to source files.

## Key Architecture Notes

- API calls go to `https://script.google.com/macros/s/.../exec` (defined in `script.js:8`)
- Session stored in `sessionStorage` (`autolub_nivel`, `autolub_financeiro`)
- Theme stored in `localStorage` (`autolub_theme`)
- Reports require `autolub_financeiro_senha` in sessionStorage (current implementation detail)