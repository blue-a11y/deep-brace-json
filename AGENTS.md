<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 适用范围与工程硬约束

- 当前项目为 React 19 + TypeScript 6 + Vite 8 单页应用。顶部自动生成的 Next.js 规则块必须保留，
  但只在 `package.json` 实际包含 Next.js 时适用；当前仓库没有 `next` 依赖和对应文档路径，不执行
  该块中的 Next.js 开发流程，也不把它作为本项目运行时与目录架构的依据。
- 开始开发、重构或评审前先阅读 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) 中与任务相关的章节；
  只有修改架构、跨模块契约或仓库规范时才需要通读全文。该文档是命名、架构、React、状态、
  IndexedDB、UI、测试与交付标准的完整规范。
- React 组件统一使用 `const PascalCase = () =>` 声明；该约束不要求普通工具函数全部改成
  `const`。
- 真实浏览器集成测试统一使用 Playwright；交互、响应式、持久化和刷新恢复变更执行与影响范围对应
  的 E2E 用例，不能以 Vitest、lint 或 build 代替。局部变更不默认要求运行全部 E2E。
- 修改大文档粘贴或后台解析时验证真实剪贴板路径，并按标签和请求身份提交；编辑、关闭、重置时取消
  旧任务，不允许旧结果覆盖新输入或失败后回退为主线程同步大解析。
- 修改大文档树或滚动恢复时保持只挂载视口附近行、原文与复制不截断，并覆盖受影响的动态行高、
  末尾可达、折叠、标签切换或刷新路径；小文档保留既有交互与动画。
- 修改工作区快捷键时集中在 `src/lib/shortcuts.ts` 定义，通过同一修饰键偏好驱动匹配、提示和无障碍
  属性；按影响覆盖编辑器、弹层聚焦，以及偏好刷新、重置或撤销恢复。
- 自动化检查只代表其已覆盖的规则通过，不得将 `pnpm lint` 表述为架构、Hooks、a11y 或浏览器
  行为已经完整验证；交付前按开发规范选择与风险相称的自动化和浏览器验收。

## 规则执行原则

- 在不违反平台安全边界的前提下，当前用户明确提出的任务范围和验收结果优先于仓库默认做法；
  默认做法不得被解释成扩大产品、数据或交付范围的授权。
- `AGENTS.md` 只保留不可无条件绕过的仓库边界；具体工程做法见 `docs/DEVELOPMENT.md`，未来计划见
  `docs/ROADMAP.md`。历史实现过程和一次性排障结论不升级为全局约束。
- 规则冲突时优先遵循与当前改动更直接、更具体的领域规则。只有冲突会显著改变产品行为、用户数据、
  外部状态或交付范围时才暂停确认；其余冲突采用最小、可逆方案解决并在结果中说明。
- “必须”用于数据安全、架构契约、用户可见正确性和明确交付条件；偏好性做法使用“应该”。
  不用“必须”强制与风险无关的工具、全库扫描、全量测试或文档改写。

## 本地工作流与授权

- 默认只读取、搜索和修改当前任务直接相关的文件。不得把无差别全库扫描作为开始工作或完成工作的
  固定步骤；只有共享契约、公共常量、构建配置或迁移边界确实可能存在跨目录引用时，才逐步扩大搜索范围。
- 对任务范围内安全、可逆的本地操作直接执行，无需逐步请示：读取文件和 Git 状态、针对性搜索、
  编辑源码 / 测试 / 文档、格式化受影响文件、运行本地服务和相关检查、使用本地浏览器验收，以及清理
  本次任务创建的临时文件。
- 工作树中的既有改动默认属于用户。不得覆盖、丢弃或顺手提交无关改动；遇到重叠时先缩小改动范围，
  只有无法安全绕开且会改变结果时才向用户确认。
- 创建本地任务分支属于可逆本地操作，可以直接执行。提交、推送、创建或合并 PR、部署等交付动作
  只在当前请求已包含该动作或用户明确授权后执行；
  明确授权后不重复询问同一动作。绕过 Hook、覆盖远端、删除非本次创建的数据及其他难以恢复的操作
  仍需单独确认。
- 信息不足但可以在任务范围内作出低风险、易回退的合理假设时继续推进，并在交付说明中写明；
  只有选择会显著改变产品行为、数据或交付范围时才暂停询问。

## Modal 使用约定

- Modal 的 Backdrop 使用默认效果，不启用 blur。
- Modal 默认提供右上角 `Modal.CloseTrigger`。
- 内容即时生效、无需显式提交时，不添加底部“完成”按钮或仅用于关闭弹窗的 Footer。
- 仅当用户需要确认、提交或取消一组尚未生效的更改时，才使用 Modal Footer 操作区。

## 文档职责与联动

- README 分语言版本：`README.md` 只写英文，`README.zh-CN.md` 只写简体中文（代码、命令和链接除外）；
  顶层能力、技术栈、脚本或启动 / 测试命令变化时同步两版结构和内容。
- 根目录只保留仓库平台或工具约定需要固定入口的标准文档；完整开发规范、开发规划和专项资料统一放在 `docs/`。
- `docs/ROADMAP.md` 只记录未实现、进行中或待验收的开发规划，每个工作项使用稳定规划 ID；
  规划完成后移出对应规划项，交付历史由 Git 保存。
- `docs/DEVELOPMENT.md` 是完整项目开发规范。架构、命名、React、状态、持久化、UI、测试或质量门禁
  变化时，必须同步该文档；若变化属于代理必须无条件遵守的硬约束，同时更新本文件。
- 专项调研文档可以保留背景、证据与排障过程，但不能替代源码、自动化测试和当前需求对实际行为的验证；历史提交与批次进展交由 Git 保存。
- 只联动确实受当前改动影响的文档；没有变化的 README、规划或专项文档不做机械更新。
