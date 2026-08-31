# DeepBrace JSON

**English** | [简体中文](README.zh-CN.md)

A JSON / JSON5 workbench that dives into every layer of your data — edit and transform on the left, explore a live collapsible tree on the right.

**Live at:** [json.blueblog.me](https://json.blueblog.me/)

## Why DeepBrace JSON

Most JSON viewers stop at the surface. When a value itself contains a nested JSON object or array — common in logs, API responses and stringified payloads — DeepBrace JSON lets you parse it into its own tab and keep digging.

## Features

- **Live JSON / JSON5 parsing** after a 300ms debounce, with syntax highlighting, plain-text fallback and line/column errors
- **Transform**: format, minify, escape and unescape (repeatable — stack or peel escape layers one at a time)
- **Collapsible tree preview** with outline-style stable line numbers, full-row hover, per-line copy
- **Nested JSON extraction**: string values that parse as objects/arrays get a one-click `Parse` button to open in a new tab
- **Multi-tab workspace** with tab input, wrapping, active tab, editor scroll and tree scroll persisted in structured IndexedDB
- **Global long-string preference**: show values in full by default, or truncate escaped strings over 120 characters with a bounded, scrollable full-text tooltip
- **Responsive workspace** with a draggable desktop split, stacked mobile panes and progressive toolbar overflow
- **Reset to defaults**: "Reset all data" in Settings restores factory state (sample tab + default preferences + scroll & split layout) behind a confirm dialog; a toast offers full undo for 8 seconds
- **7 synced syntax themes** (Default, Dracula, Monokai, One Dark, Nord, Solarized, Tokyo Night) with light & dark variants
- **Live status bar** with line, character and UTF-8 size metrics plus parse type, node count, depth and errors
- **100% client-side** — your data never leaves the browser

## Documentation

- [Development guide](docs/DEVELOPMENT.md) — architecture, naming, React, persistence, UI, testing and delivery conventions
- [Development roadmap](docs/ROADMAP.md) — work in progress, planned validation and quality gates

## Keyboard Shortcuts

Press the keyboard button in the header to view all shortcuts at any time.

| Action                 | Shortcut                      |
| ---------------------- | ----------------------------- |
| Format / Minify        | `Shift+Alt+F` / `Shift+Alt+M` |
| Escape / Unescape      | `Shift+Alt+E` / `Shift+Alt+U` |
| New / Close tab        | `Shift+Alt+N` / `Shift+Alt+W` |
| Previous / Next tab    | `Shift+Alt+[` / `Shift+Alt+]` |
| Toggle wrap / Fold all | `Shift+Alt+L` / `Shift+Alt+X` |

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

React 19 · Vite 8 · HeroUI v3 · Tailwind CSS v4 · zustand · CodeMirror 6 · IndexedDB · Vitest · Playwright

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
