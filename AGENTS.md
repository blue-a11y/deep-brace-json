<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 项目开发规范

- 当前项目为 React 19 + TypeScript 6 + Vite 8 单页应用。顶部自动生成的 Next.js 规则块必须保留，
  但只在 `package.json` 实际包含 Next.js 时适用；当前仓库没有 `next` 依赖和对应文档路径，不执行
  该块中的 Next.js 开发流程，也不把它作为本项目运行时与目录架构的依据。
- 开始开发、重构或评审前必须完整阅读并遵守 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。该文档是命名、
  架构、React、状态、IndexedDB、UI、测试与交付门禁的完整规范。
- React 组件统一使用 `const PascalCase = () =>` 声明；该约束不要求普通工具函数全部改成
  `const`。
- 真实浏览器集成测试统一使用 Playwright；交互、响应式、持久化和刷新恢复变更必须补充或执行对应
  E2E 用例，不能以 Vitest、lint 或 build 代替。
- 大文档粘贴性能必须验证真实剪贴板路径；后台解析按标签和请求身份提交，编辑、关闭、重置时取消
  旧任务，不允许旧结果覆盖新输入或失败后回退为主线程同步大解析。
- 大文档树只挂载视口附近的行，原始内容与复制不得截断；滚动恢复统一使用节点锚点适配器，
  必须覆盖动态行高、末尾可达、折叠及标签切换 / 刷新，小文档保留既有交互与动画。
- 工作区快捷键集中在 `src/lib/shortcuts.ts` 定义，通过同一修饰键偏好驱动匹配、提示和无障碍
  属性；新快捷键必须覆盖编辑器与弹层聚焦行为，新增偏好必须覆盖刷新、重置与撤销恢复。
- 自动化检查只代表其已覆盖的规则通过，不得将 `pnpm lint` 表述为架构、Hooks、a11y 或浏览器
  行为已经完整验证；交付前按开发规范执行自动化与浏览器验收。

## Modal usage conventions

- Modal 的 Backdrop 使用默认效果，不启用 blur。
- Modal 默认提供右上角 `Modal.CloseTrigger`。
- 内容即时生效、无需显式提交时，不添加底部“完成”按钮或仅用于关闭弹窗的 Footer。
- 仅当用户需要确认、提交或取消一组尚未生效的更改时，才使用 Modal Footer 操作区。

## 文档维护与联动约束

- README 分语言版本：`README.md` 只写英文，`README.zh-CN.md` 只写简体中文；两版章节结构与内容保持一致，更新时必须同步双语。
- 禁止在 `README.md` 中出现中文段落，或在 `README.zh-CN.md` 中出现英文段落（代码、命令、链接除外）。
- 根目录只保留仓库平台或工具约定需要固定入口的标准文档；完整开发规范、开发规划和专项资料统一放在 `docs/`。
- `docs/ROADMAP.md` 只记录未实现、进行中或待验收的开发规划，每个工作项使用稳定规划 ID；规划完成后必须更新或移出对应规划项，交付历史由 Git 保存。
- `docs/DEVELOPMENT.md` 是完整项目开发规范。架构、命名、React、状态、持久化、UI、测试或质量门禁
  变化时，必须同步该文档；若变化属于代理必须无条件遵守的硬约束，同时更新本文件。
- `README.md` 与 `README.zh-CN.md` 保留面向使用者和贡献者的当前顶层能力、启动、技术栈与开发规则摘要；顶层能力、技术栈、脚本或启动/测试命令变化时，必须同步更新两版 README。
- 专项调研文档可以保留背景、证据与排障过程，但不能替代源码、自动化测试和当前需求对实际行为的验证；历史提交与批次进展交由 Git 保存。
- 完成功能开发前必须检查：双语 README 是否需要同步、开发规划状态是否准确，以及自动化测试与浏览器验收是否覆盖变更范围。
