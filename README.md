# DeepBrace JSON

**English** | [简体中文](README.zh-CN.md)

A JSON / JSON5 workbench that dives into every layer of your data — edit and transform on the left, explore a live collapsible tree on the right.

**Live at:** [json.blueblog.me](https://json.blueblog.me/)

## Why DeepBrace JSON

Most JSON viewers stop at the surface. When a value itself contains a nested JSON object or array — common in logs, API responses and stringified payloads — DeepBrace JSON lets you parse it into its own tab and keep digging.

## Features

- **JSON / JSON5 parsing** with syntax highlighting — comments, unquoted keys, single quotes, trailing commas and hex numbers all work
- **Transform**: format, minify, escape and unescape (repeatable — stack or peel escape layers one at a time)
- **Collapsible tree preview** with outline-style stable line numbers, full-row hover, per-line copy
- **Nested JSON extraction**: string values that parse as objects/arrays get a one-click `Parse` button to open in a new tab
- **Multi-tab workspace** with per-tab scroll position and state persistence
- **Reset to defaults**: "Reset all data" in Settings restores factory state (sample tab + default preferences + scroll & split layout) behind a confirm dialog; a toast offers full undo for 8 seconds
- **7 synced syntax themes** (Default, Dracula, Monokai, One Dark, Nord, Solarized, Tokyo Night) with light & dark variants
- **100% client-side** — your data never leaves the browser

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

Build, lint and format:

```bash
pnpm build
pnpm lint
pnpm format
```

`pnpm lint` validates file naming, naming conventions, oxlint rules and Prettier formatting; `pnpm format` formats everything in one shot.

## Tech Stack

React 19 · Vite 8 · HeroUI v3 · Tailwind CSS v4 · zustand · CodeMirror 6

## Code Style

- Files and directories under `src` use kebab-case, e.g. `tree-view.tsx`, `use-store.ts`.
- Exported React components and types use PascalCase; hooks, functions and variables use camelCase.
- React components are declared as `const Component = () =>`, with the default export on its own line below.
- Props, options and other types use PascalCase without an `I` prefix.
- Boolean identifiers use semantic prefixes: `is`, `has`, `can`, `should`, `does`.
- Event handlers inside components use `handleXxx`; callback props use `onXxx`.
- Avoid unclear abbreviations such as `s`, `v`, `cls`, `len` — use full semantic names.
- Responsibility suffixes are dot-separated, e.g. `tree-view.test.tsx`, `vite-env.d.ts`.
- Formatting is handled by Prettier (semicolons, single quotes, 100 columns, import sorting) — run `pnpm format`.
- `pnpm lint` validates file naming, naming conventions, oxlint rules and Prettier formatting.
