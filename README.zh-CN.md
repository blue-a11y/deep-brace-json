# DeepBrace JSON

[English](README.md) | **简体中文**

深入解析每一层 JSON 的解析工作台——左侧编辑与转换原始内容,右侧实时生成可折叠的树形预览。

**在线使用:** [json.blueblog.me](https://json.blueblog.me/)

## 为什么需要 DeepBrace JSON

大多数 JSON 工具只看第一层。当值本身还嵌套着 JSON 对象或数组时——日志、接口响应、字符串化的 payload 里很常见——DeepBrace JSON 可以把它一键解析到独立标签,继续往深处看。

## 核心能力

- **JSON / JSON5 实时解析**:输入后 300ms 自动解析,提供语法高亮、纯文本降级与错误行列定位
- **内容转换**:格式化、压缩、转义与反转义(可反复点击,层层叠加或逐层剥开)
- **可折叠树形预览**:大纲式稳定行号、整行 hover、逐行复制
- **嵌套 JSON 提取**:能解析为对象/数组的字符串值提供一键 `Parse`,在新标签中打开
- **多标签工作区**:标签输入、换行、活动标签、编辑器滚动与树滚动通过结构化 IndexedDB 持久化
- **全局长字符串偏好**:默认完整展示;也可将转义后超过 120 字符的值截断,通过限制高度且可滚动的悬浮提示查看全文
- **响应式工作区**:桌面可拖拽分栏、移动端上下布局,工具栏随宽度逐项收进溢出菜单
- **一键重置**:设置中的「重置全部数据」经二次确认后恢复出厂状态(示例标签页 + 默认偏好 + 滚动与分栏布局);误触可在 8 秒内通过 Toast 撤销,完整还原重置前状态
- **7 套同步语法配色**(默认 / Dracula / Monokai / One Dark / Nord / Solarized / Tokyo Night),均含亮暗两套
- **实时状态栏**:显示行数、字符数、UTF-8 大小、解析类型、节点数、深度和错误
- **完全本地处理**——输入内容不会离开浏览器

## 文档

- [项目开发规范](docs/DEVELOPMENT.md):记录架构、命名、React、持久化、UI、测试与交付约定
- [开发规划](docs/ROADMAP.md):记录进行中工作、待验证事项与质量门禁

## 快捷键

Header 右侧的键盘按钮可随时查看完整列表。

| 操作                | 快捷键                        |
| ------------------- | ----------------------------- |
| 格式化 / 压缩       | `Shift+Alt+F` / `Shift+Alt+M` |
| 转义 / 反转义       | `Shift+Alt+E` / `Shift+Alt+U` |
| 新建 / 关闭标签     | `Shift+Alt+N` / `Shift+Alt+W` |
| 上一个 / 下一个标签 | `Shift+Alt+[` / `Shift+Alt+]` |
| 切换换行 / 折叠展开 | `Shift+Alt+L` / `Shift+Alt+X` |

## 本地启动

```bash
pnpm install
pnpm dev
```

测试、生产构建与代码检查:

```bash
pnpm test
pnpm test:unit
pnpm test:e2e
pnpm test:e2e:ui
pnpm build
pnpm lint
pnpm format
```

首次运行浏览器测试前,安装与框架版本匹配的 Chromium:

```bash
pnpm exec playwright install chromium
```

`pnpm test` 会同时运行 Vitest 单元测试和 Playwright 浏览器集成测试;只验证其中一层时使用 `pnpm test:unit` 或 `pnpm test:e2e`,`pnpm test:e2e:ui` 用于打开 Playwright 交互调试界面。`pnpm lint` 检查文件与标识符命名、运行 oxlint 并校验 Prettier 格式;当前 oxlint warning 不会让命令失败。`pnpm format` 一键格式化支持且未忽略的文件。

## 技术栈

React 19 · Vite 8 · HeroUI v3 · Tailwind CSS v4 · zustand · CodeMirror 6 · IndexedDB · Vitest · Playwright

## 代码规范

- `src` 内文件和目录统一使用 kebab-case,例如 `tree-view.tsx`、`use-store.ts`。
- React 组件和类型等导出使用 PascalCase,Hook、函数和变量使用 camelCase。
- React 组件声明统一使用 `const Component = () =>`,默认导出在声明后单独书写。
- Props、Options 等类型直接使用 PascalCase,不添加 `I` 前缀。
- Boolean 标识符使用 `is`、`has`、`can`、`should`、`does` 等语义前缀。
- 组件内事件处理函数使用 `handleXxx`,回调 Props 使用 `onXxx`。
- 避免 `s`、`v`、`cls`、`len` 等含义不清的缩写,使用完整语义名称。
- 测试、类型声明等职责后缀使用点号分隔,例如 `tree-view.test.tsx`、`vite-env.d.ts`。
- Vitest 单元测试与源码共置;Playwright 浏览器集成测试统一放在 `e2e/`。
- 代码格式化统一由 Prettier 处理(分号、单引号、100 列、import 排序),`pnpm format` 一键执行。
- `pnpm lint` 检查文件与标识符命名、运行 oxlint 并校验 Prettier 格式;准确门禁边界见 `docs/DEVELOPMENT.md`。
- 修改用户可见的顶层能力时,必须同步两版 README;未完成工作只记录在 `docs/ROADMAP.md`。
- 完整项目开发约定记录在 `docs/DEVELOPMENT.md`;代理必须遵守的硬约束、文档与 Modal 规则由根目录 `AGENTS.md` 定义。
