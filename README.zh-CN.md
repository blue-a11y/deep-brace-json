# DeepBrace JSON

[English](README.md) | **简体中文**

深入解析每一层 JSON 的解析工作台——左侧编辑与转换原始内容,右侧实时生成可折叠的树形预览。

**在线使用:** [json.blueblog.me](https://json.blueblog.me/)

## 为什么需要 DeepBrace JSON

大多数 JSON 工具只看第一层。当值本身还嵌套着 JSON 对象或数组时——日志、接口响应、字符串化的 payload 里很常见——DeepBrace JSON 可以把它一键解析到独立标签,继续往深处看。

## 核心能力

- **JSON / JSON5 实时解析**:输入后 300ms 自动解析,提供语法高亮、纯文本降级与错误行列定位
- **示例选择**:保留普通 JSON5 示例,新增约 1 MB（2,000 条记录）和 10 MB（20,000 条记录）大文档。桌面按钮与窄屏工具菜单提供相同选项。大示例在可取消的后台线程中按需生成并解析,只替换当前标签,与普通输入一样自动保存;生成失败保留原内容
- **内容转换**:格式化、压缩、转义与反转义(可反复点击,层层叠加或逐层剥开)
- **可折叠树形预览**:大纲式稳定行号、行号列随位数扩展、整行 hover、逐行复制
- **大段粘贴保护**:达到 262,144 字符的输入使用可取消的后台线程解析。达到该字符数、超过 5,000 个节点或深度超过 40 时,树使用动态行高虚拟化:直接滚动浏览文档,只挂载视口附近的行。通过节点锚点恢复标签切换和刷新位置,支持换行、字体变化与折叠后的稳定大纲行号。小文档保留原有折叠动画。字符串和键名仅预览前 500 字符,编辑器与复制保留完整数据。树预览深度上限为 40,更深内容在编辑器查看。原生选区和浏览器查找只覆盖已挂载的树行,完整内容请使用编辑器或复制按钮
- **嵌套 JSON 提取**:能解析为对象/数组的字符串值提供一键 `Parse`,在新标签中打开
- **多标签工作区**:新用户默认打开示例与空白两个标签,支持右键重命名、关闭与批量关闭;标签标题、输入、换行、活动标签、编辑器滚动与树滚动通过结构化 IndexedDB 持久化
- **全局长字符串偏好**:默认完整展示;也可将转义后超过 120 字符的值截断,通过限制高度且可滚动的悬浮提示查看全文
- **统一代码主题设置**:在一个「主题」弹窗中配置编辑器与树形预览共用的 7 套语法配色和 7 种代码字体,刷新后保持选择
- **标签新手引导**:依附标签介绍右键关闭能力,每次刷新出现,直到用户明确选择「不再提示」
- **响应式工作区**:桌面可拖拽分栏、移动端上下布局,工具栏随宽度逐项收进溢出菜单
- **产品亮点介绍**:Logo 右侧使用统一的图标标签,悬停或键盘聚焦可查看说明。大文档标签从 1,280px 起显示,其他能力从 1,536px 起显示;窄屏优先保留产品名和工具
- **一键重置**:设置中的「重置全部数据」经二次确认后恢复出厂状态(示例标签页 + 空白标签页 + 默认偏好 + 滚动与分栏布局);误触可在 8 秒内通过 Toast 撤销,完整还原重置前状态
- **实时状态栏**:显示行数、字符数、UTF-8 大小、解析类型、节点数、深度和错误
- **渐进式启动**:脚本就绪前显示轻量工作区骨架屏,支持响应式面板、系统明暗配色和减少动态效果;设置、主题和快捷键弹窗随工作区同步加载,打开时无需额外下载脚本。共用布局尺寸和内嵌品牌字体子集让骨架与默认工作区对齐,不依赖外部字体请求。主样式下载不阻塞骨架,样式就绪后才挂载工作区,失败时保留重试入口。其他字体不阻塞页面渲染;文字动效在工作区挂载后加载,不改变 Logo 尺寸,减少动态效果或下载失败时保留静态品牌
- **完全本地处理**——输入内容不会离开浏览器

## 文档

- [项目开发规范](docs/DEVELOPMENT.md):记录架构、命名、React、持久化、UI、测试与交付约定
- [开发规划](docs/ROADMAP.md):记录进行中工作、待验证事项与质量门禁

## 快捷键

顶部键盘按钮（或溢出菜单中的入口）打开紧凑的快捷键面板，可统一组合 Ctrl、Alt/Option、Cmd/Meta 和 Shift 修饰键，至少保留 Ctrl、Alt/Option 或 Cmd/Meta 中的一项。修改立即同步到全部快捷键及提示，保存到 IndexedDB，并参与重置和撤销。这是同时按下的组合键，不是依次按下的前导键。

默认组合如下。标签操作作用于当前标签，批量关闭仍可撤销。编辑器聚焦时同样可用；对话框和菜单内暂停全局快捷键以保护输入。系统或浏览器保留组合可能优先执行；自定义组合发生冲突时，请保留默认组合或使用按钮。

| 操作                   | 快捷键                        |
| ---------------------- | ----------------------------- |
| 格式化 / 压缩          | `Shift+Alt+F` / `Shift+Alt+M` |
| 转义 / 反转义          | `Shift+Alt+E` / `Shift+Alt+U` |
| 新建 / 关闭标签        | `Shift+Alt+N` / `Shift+Alt+W` |
| 上一个 / 下一个标签    | `Shift+Alt+[` / `Shift+Alt+]` |
| 切换换行 / 折叠展开    | `Shift+Alt+L` / `Shift+Alt+X` |
| 聚焦编辑器（保留选区） | `Shift+Alt+I`                 |
| 重命名当前标签         | `Shift+Alt+R`                 |
| 向左 / 向右添加标签    | `Shift+Alt+A` / `Shift+Alt+D` |
| 关闭左侧 / 右侧全部    | `Shift+Alt+J` / `Shift+Alt+K` |
| 关闭其它全部           | `Shift+Alt+O`                 |
| 配色与字体 / 切换明暗  | `Shift+Alt+T` / `Shift+Alt+B` |
| 全局设置 / 快捷键面板  | `Shift+Alt+S` / `Shift+Alt+H` |

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

React 19 · Vite 8 · HeroUI v3 · Tailwind CSS v4 · zustand · CodeMirror 6 · TanStack Virtual · IndexedDB · Vitest · Playwright

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
