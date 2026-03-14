# public/ — Frontend

## Structure

```
*.html             # All HTML pages
assets/css/        # Single stylesheet with page-specific sections
assets/js/         # ES6 modules (no build step)
```

## Module System

ES6 modules with no build step. Shared modules in `assets/js/`:

- `api.js` — fetch wrapper with Bearer token injection, CSRF handling, `escapeHTML()`, `postFormData()`
- `utils.js` — shared UI helpers: `announce()`, `statusBadge()`, `populateSelect()`
- `auth.js` — session check, role helpers, OAuth result handling
- `theme.js` — dark/light/auto cycling via CSS custom properties + `data-theme` attribute
- `geolocation.js` — browser → IP fallback → localStorage cache → world view
- Page-specific modules: `map.js`, `report-form.js`, `moderation.js`, `user_profile.js`, `user_directory.js`

## CSS Theming

All colors are CSS custom properties in `:root`. Dark mode has two triggers:
- `[data-theme="dark"]` — explicit user choice
- `@media (prefers-color-scheme: dark)` with `:root:not([data-theme="light"])` — system auto

Map tiles swap between OSM standard (light) and CartoDB Dark Matter (dark) via `themechange` custom event. Page-specific styles are at the end of `style.css` under section headers.
