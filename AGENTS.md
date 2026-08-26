<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Modal usage conventions

- Modal 的 Backdrop 使用默认效果，不启用 blur。
- Modal 默认提供右上角 `Modal.CloseTrigger`。
- 内容即时生效、无需显式提交时，不添加底部“完成”按钮或仅用于关闭弹窗的 Footer。
- 仅当用户需要确认、提交或取消一组尚未生效的更改时，才使用 Modal Footer 操作区。
