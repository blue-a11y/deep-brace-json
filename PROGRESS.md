# json-lens 进展记录

## 背景

blue 需要一个日常使用的 **JSON / JSON5 解析工具**：左侧编辑器输入、右侧树形预览，支持解析、压缩、格式化，解析结果可折叠展开。市面工具大多只支持标准 JSON，JSON5（注释、无引号 key、单引号、尾逗号、十六进制）场景缺失，且纯文本预览不方便核对深层结构——因此自建一个"给 JSON 配放大镜"的小工具，定名 json-lens。

**技术选型**（2026-08-23 启动）：Vite + React 19 + HeroUI v3 + Tailwind CSS v4 + zustand（persist 持久化）+ CodeMirror 6。UI 走 Soft UI 风格（圆角卡片、无边框、填充式按钮）。

## 功能进展

### 已完成

- **编辑器**：CodeMirror 6 + JSON 语法高亮；行号、折叠槽；输入 **300ms 防抖自动解析**（无手动按钮）
  - TreeView 配色主题同步应用到编辑器，默认 / Dracula / Monokai 均提供亮暗两套 token 色
  - 支持直接解析被整体引号包裹的 JSON 字符串，以及缺少外层引号但保留 `\"`、`\n` 等转义的对象/数组文本
- **树形预览**：
  - JSON 文本形态：key 带引号、尾逗号、数组项无索引标签
  - **大纲式稳定行号**（CSS counter）：折叠只隐藏号段、不重排（1 2 3 4 5 折叠 2-4 显示 1 5）；未挂载子树用 counter-increment 占位补号
  - 折叠/展开：整行点击热区（拖选守卫）、grid 0fr→1fr 高度动画、首次展开双 rAF 过渡、内容淡出收拢感
  - 换行/不换行切换（不换行时水平滚动）；key/冒号 shrink-0 不折行
  - 每行尾部 hover 复制按钮：单行与文本对齐，多行贴底；叶子复制原始值、容器按全局缩进格式化，Copy / Check 状态过渡
  - string value 仅在能严格解析为对象或数组时展示椭圆 `Parse` 按钮；点击后一键在新标签打开子节点
  - 竖线、行号、开闭括号拆分定位：行号固定在左侧列，竖线与括号对齐，内容缩进变化不再破坏连线几何
- **多标签工作区**：
  - Header 下方使用 HeroUI secondary Tabs，标签以 `Lens x` 展示，支持新建、切换、关闭与撤销关闭
  - 除 Header 全局偏好外，输入、解析结果、折叠状态、换行状态均按标签隔离
  - 编辑器与 TreeView 分别记忆每个标签的横纵滚动位置；左右面板比例使用同一份全局持久化配置
  - 示例数据补充对象、数组与普通文本三类 JSON string，用于验证一键解析子节点
- **工具栏**：logo + 特性 Chip 组（JSON5/自动解析/树形预览/一键解析子节点）+ 示例按钮 + 全局缩进 Select + TreeView 配色 Select + 浅/深主题 Tabs
- **全局缩进**：2 / 4 / 8 空格，按 `1 空格 = 2px` 同步作用于树内容缩进、格式化与复制输出
- **Toast**：基于 HeroUI `ToastQueue` 的统一封装，队列更新与 View Transition 同步；覆盖格式化、压缩、复制、示例、清空、新建标签和关闭标签，关闭标签提供撤销操作；自动解析保持静默
- **纯文本降级**：解析失败且非 JSON 意图时，整段输入按字符串字面量处理
- **其他**：根容器使用 `px-3 py-2` / `gap-2`；面板拖拽分栏（比例持久化）、⌘/Ctrl+Enter 历史遗留已随自动解析移除、编辑器滚动修复（cm-theme 高度链）、默认浅色主题、状态栏统计

### 已回退的尝试（记录备查）

- **第一版全局缩进选择器**（2/4/8 空格 Select）：直接把缩进值接入整棵树的几何，导致竖线、行号、开闭括号互相影响，曾整体回退；现已通过“固定行号/连线列 + 独立内容缩进”重新实现
- **HeroUI Toast 复刻实现**：因官方 View Transitions 动画在本机不生效做过一版纯 CSS 复刻（平移入退场），后按"保持官方代码零改动"原则移除，存档于 git 历史 `6cb6a1a`
- **TreeView value Popover 复制**：尝试把复制操作移到 hover Popover，因快速扫过多行时干扰较强且布局收益有限，最终恢复为行尾 hover Icon

### 当前状态

- HeroUI Toast 的原始入场问题已改由自定义 `ToastQueue` 在队列更新边界统一衔接 View Transition，没有补充一套 CSS 动画；历史环境实验与根因链仍保留在 `docs/HEROUI-TOAST-ISSUE.md`
- 本轮代码已通过 `pnpm lint`、`pnpm exec tsc -b` 与 `git diff --check`，并完成 TreeView 复制按钮、多行对齐、标签切换与滚动恢复的浏览器交互检查
- 功能提交：`75272af feat: enhance JSON parsing workspace`，已推送到 `origin/main`

## 排查实录（关键结论存档）

- HeroUI v3 Toast：Provider 必须自闭合不包 children（否则白屏）；动画依赖 `tw-animate-css`；pnpm 下需手动补 5 个 peer + `client-only`
- ButtonGroup 内不要包 Tooltip（官方 issue #6516 variant 断链）；Separator 官方用法是放在后一个 Button 内部
- Tabs 选中态背景/动画来自 `<Tabs.Indicator />`；无 size 变体需自定义
- `.ts` 改名 `.tsx` 后必须整页 reload，HMR 断链会让旧模块"看似正常"

## 环境

- Vite 8 + React 19 + HeroUI v3（@heroui/react 3.2.4）+ Tailwind v4 + zustand + CodeMirror 6
- HeroUI agent skill 已全局安装（`~/.zcode/skills/heroui-react`，脚本可查组件文档）

---

*2026-08-24 更新；详细提交历史见 git log。*
