# DeepBrace JSON

**English** | [简体中文](README.zh-CN.md)

A JSON / JSON5 workbench that dives into every layer of your data — edit and transform on the left, explore a live collapsible tree on the right.

**Live at:** [json.blueblog.me](https://json.blueblog.me/)

## Why DeepBrace JSON

Most JSON viewers stop at the surface. When a value itself contains a nested JSON object or array — common in logs, API responses and stringified payloads — DeepBrace JSON lets you parse it into its own tab and keep digging.

## Features

- **Live JSON / JSON5 parsing** after a 300ms debounce, with syntax highlighting, plain-text fallback and line/column errors
- **Sample picker**: keep the ordinary JSON5 example or load large documents of about 1 MB (2,000 records) and 10 MB (20,000 records). The desktop button and overflow menu offer the same choices. Large samples are generated and parsed on demand in a cancellable Worker, replace only the current tab, and persist like normal input; generation failures keep the existing content
- **Transform**: format, minify, escape and unescape (repeatable — stack or peel escape layers one at a time)
- **Collapsible tree preview** with outline-style stable line numbers, an adaptive line-number column, full-row hover, per-line copy
- **Large-paste protection**: inputs of at least 262,144 characters parse in a cancellable Worker. Large previews (that input size, over 5,000 nodes, or depth over 40) use dynamic-height tree virtualization: scroll directly through the document while only nearby rows are mounted. Node anchors restore position across tabs and reloads; wrapping, fonts and folding retain stable outline numbers. Small documents keep their existing fold animations. Strings and keys preview up to 500 characters, while the editor and copy retain complete data. Preview depth is capped at 40; deeper data remains in the editor. Native selection and browser Find only cover mounted tree rows; use the editor or copy buttons for the complete content
- **Nested JSON extraction**: string values that parse as objects/arrays get a one-click `Parse` button to open in a new tab
- **Multi-tab workspace** starts new users with a sample and a blank tab, with right-click rename, close and bulk-close actions; tab titles, input, wrapping, active tab, editor scroll and tree scroll are persisted in structured IndexedDB
- **Global long-string preference**: show values in full by default, or truncate escaped strings over 120 characters with a bounded, scrollable full-text tooltip
- **Unified code theme settings**: one Theme dialog configures 7 synchronized syntax color schemes and 7 code fonts for the editor and tree preview, persisted across reloads
- **Contextual tab guide** introduces right-click tab actions on every reload until the user explicitly chooses "Don't show again"
- **Responsive workspace** with a draggable desktop split, stacked mobile panes and progressive toolbar overflow
- **Feature highlights** beside the logo use matching icon tags with hover and keyboard-focus descriptions. The large-document tag appears from 1,280px, with the remaining capabilities from 1,536px; narrower screens prioritize the product name and tools
- **Reset to defaults**: "Reset all data" in Settings restores factory state (sample tab + blank tab + default preferences + scroll & split layout) behind a confirm dialog; a toast offers full undo for 8 seconds
- **Live status bar** with line, character and UTF-8 size metrics plus parse type, node count, depth and errors
- **Progressive startup**: show a lightweight workspace skeleton before JavaScript is ready, with responsive panes, system light/dark styling and reduced-motion support; load settings, theme and shortcut dialogs with the workspace so opening them requires no additional script download. Shared layout dimensions and an inline brand-font subset align the skeleton with the default workspace without an external font request. Main styles download without blocking the skeleton; the workspace mounts once styles are ready, with a retry entry on failure. Other fonts do not block rendering; wordmark animation loads after the workspace mounts without resizing the logo, with a static fallback for reduced motion or download failures
- **100% client-side** — your data never leaves the browser

## Documentation

- [Development guide](docs/DEVELOPMENT.md) — architecture, naming, React, persistence, UI, testing and delivery conventions
- [Development roadmap](docs/ROADMAP.md) — work in progress, planned validation and quality gates

## Keyboard Shortcuts

Press the keyboard button in the header (or its overflow menu) to view the compact shortcut panel and configure a shared combination of Ctrl, Alt/Option, Cmd/Meta and Shift. At least one of Ctrl, Alt/Option or Cmd/Meta is required. Changes apply immediately to all shortcuts and hints, persist in IndexedDB, and participate in reset/undo. These are simultaneous modifier combinations, not sequential leader keys.

Defaults are listed below. Tab commands act on the active tab; bulk closes retain undo. Shortcuts also work in the editor, but are suspended in dialogs and menus to protect input. System/browser-reserved combinations may take priority; keep the default combination or use the buttons if a custom combination conflicts.

| Action                               | Shortcut                      |
| ------------------------------------ | ----------------------------- |
| Format / Minify                      | `Shift+Alt+F` / `Shift+Alt+M` |
| Escape / Unescape                    | `Shift+Alt+E` / `Shift+Alt+U` |
| New / Close tab                      | `Shift+Alt+N` / `Shift+Alt+W` |
| Previous / Next tab                  | `Shift+Alt+[` / `Shift+Alt+]` |
| Toggle wrap / Fold all               | `Shift+Alt+L` / `Shift+Alt+X` |
| Focus editor (keep selection)        | `Shift+Alt+I`                 |
| Rename active tab                    | `Shift+Alt+R`                 |
| Add tab to left / right              | `Shift+Alt+A` / `Shift+Alt+D` |
| Close all to left / right            | `Shift+Alt+J` / `Shift+Alt+K` |
| Close other tabs                     | `Shift+Alt+O`                 |
| Code theme & fonts / Light-dark mode | `Shift+Alt+T` / `Shift+Alt+B` |
| Settings / Shortcut panel            | `Shift+Alt+S` / `Shift+Alt+H` |

## Getting Started

```bash
pnpm install
pnpm dev
```

Test, build, lint and format:

```bash
pnpm test
pnpm test:unit
pnpm test:e2e
pnpm test:e2e:ui
pnpm build
pnpm lint
pnpm format
```

Before the first browser test run, install the matching Chromium binary:

```bash
pnpm exec playwright install chromium
```

`pnpm test` runs both the Vitest unit suite and Playwright browser integration suite; use `pnpm test:unit` or `pnpm test:e2e` for one layer, and `pnpm test:e2e:ui` for Playwright's interactive runner. `pnpm lint` checks file and identifier naming, runs oxlint, and validates Prettier formatting; current oxlint warnings do not fail the command. `pnpm format` formats supported, non-ignored files in one shot.

## Tech Stack

React 19 · Vite 8 · HeroUI v3 · Tailwind CSS v4 · zustand · CodeMirror 6 · TanStack Virtual · IndexedDB · Vitest · Playwright

## Code Style

- Files and directories under `src` use kebab-case, e.g. `tree-view.tsx`, `use-store.ts`.
- Exported React components and types use PascalCase; hooks, functions and variables use camelCase.
- React components are declared as `const Component = () =>`, with the default export on its own line below.
- Props, options and other types use PascalCase without an `I` prefix.
- Boolean identifiers use semantic prefixes: `is`, `has`, `can`, `should`, `does`.
- Event handlers inside components use `handleXxx`; callback props use `onXxx`.
- Avoid unclear abbreviations such as `s`, `v`, `cls`, `len` — use full semantic names.
- Responsibility suffixes are dot-separated, e.g. `tree-view.test.tsx`, `vite-env.d.ts`.
- Vitest unit tests stay beside source files; Playwright browser integration tests live under `e2e/`.
- Formatting is handled by Prettier (semicolons, single quotes, 100 columns, import sorting) — run `pnpm format`.
- `pnpm lint` checks file and identifier naming, runs oxlint, and validates Prettier formatting; see `docs/DEVELOPMENT.md` for its exact enforcement boundaries.
- User-visible top-level capability changes must update both README language versions; unfinished work belongs in `docs/ROADMAP.md`.
- The complete repository development conventions are documented in `docs/DEVELOPMENT.md`; mandatory agent, documentation and Modal rules are defined in the root `AGENTS.md`.
