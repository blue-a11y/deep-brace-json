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

Build and lint:

```bash
pnpm build
pnpm lint
```

## Tech Stack

React 19 · Vite 8 · HeroUI v3 · Tailwind CSS v4 · zustand · CodeMirror 6

## 代码规范

- `src` 内文件和目录统一使用 kebab-case，例如 `tree-view.tsx`、`use-store.ts`。
- React 组件和类型等导出仍使用 PascalCase，Hook、函数和变量仍使用 camelCase。
- React 组件声明统一使用 `const Component = () =>`，默认导出在声明后单独书写。
- Props、Options 等类型直接使用 PascalCase，不添加 `I` 前缀。
- Boolean 标识符使用 `is`、`has`、`can`、`should`、`does` 等语义前缀。
- 组件内事件处理函数使用 `handleXxx`，回调 Props 使用 `onXxx`。
- 避免 `s`、`v`、`cls`、`len` 等含义不清的缩写，使用完整语义名称。
- 测试、类型声明等职责后缀使用点号分隔，例如 `tree-view.test.tsx`、`vite-env.d.ts`。
- `pnpm lint` 会先校验文件名，再运行代码检查。
