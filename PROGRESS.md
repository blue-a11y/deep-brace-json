# json-lens 进展记录

## 背景

blue 需要一个日常使用的 **JSON / JSON5 解析工具**：左侧编辑器输入、右侧树形预览，支持解析、压缩、格式化，解析结果可折叠展开。市面工具大多只支持标准 JSON，JSON5（注释、无引号 key、单引号、尾逗号、十六进制）场景缺失，且纯文本预览不方便核对深层结构——因此自建一个"给 JSON 配放大镜"的小工具，定名 json-lens。

**技术选型**（2026-08-23 启动）：Vite + React 19 + HeroUI v3 + Tailwind CSS v4 + zustand（persist 持久化）+ CodeMirror 6。UI 走 Soft UI 风格（圆角卡片、无边框、填充式按钮）。

## 功能进展

### 已完成

- **编辑器**：CodeMirror 6 + JSON 语法高亮；行号、折叠槽；输入 **300ms 防抖自动解析**（无手动按钮）
  - 折叠标记定制：默认 `⌄`/`›` 字形在 JetBrains Mono 中墨迹偏行底（视觉不齐），改为与 TreeView 同款 SVG chevron（`markerDOM`），24px 行内 flex 垂直居中，标记中心与行中心实测差 0px；新增 `@codemirror/language` 显式依赖
  - TreeView 配色主题同步应用到编辑器，默认 / Dracula / Monokai 均提供亮暗两套 token 色
  - **转义 / 反转义两个独立按钮**（编辑器头部，Package / PackageOpen 图标，不做方向互斥、不按内容禁用）：转义 = 把输入原文包成 JSON 字符串字面量（保留原格式，换行转 `\n`），可反复点击层层叠加；反转义 = 剥开一层（字符串字面量 → 内容，或日志里复制的裸转义文本 `{\"a\":1}` → 解码），可反复点击逐层剥开；无内容可剥时 toast 提示且内容不变
  - 视觉基线统一：编辑器 `.cm-scroller` 行高改 24px 与树 `leading-6` 一致；两侧内容区 padding-y 归零（`.cm-content` 覆盖 CodeMirror 默认 4px）；树行删 `py-px`（叶子行原比容器行高 2px）；面板头部去掉固定 `h-11`，改为内容自适应 + `py-1`（实测 40px，两侧等高）
  - 闭合括号行补齐 hover 整行背景（`rounded px-0.5 hover:bg-foreground/5`），与叶子/容器行一致；空容器单行 `{}` 保持无 hover（无交互不暗示可点）
  - 转义/反转义图标反馈动画：操作成功后播放一次性 keyframe（wrap 收拢封装 / unwrap 弹开拆封，380ms），通过 icon `key` 重挂载重放、连点每次都触发；action 返回布尔值做成功门控，失败不播；`prefers-reduced-motion` 下禁用
  - 格式化/压缩图标同样接入反馈动画（format 横向铺开 / minify 收拢），成功门控与重放机制同上
  - 叶子行与容器行对齐修复：容器行（带折叠箭头）间隔由 `gap-1` 改为 `gap-1.5`，与叶子行的 16px 前缀 + 6px 间隔一致，兄弟节点 key 起始位置完全对齐（此前容器行偏左 2px）
  - 解析不再自动反转义：整体引号包裹的 JSON 字符串按普通字符串节点展示（可用树内 Parse 按钮显式打开），裸转义文本直接报解析错误，由用户显式点「反转义」
- **树形预览**：
  - JSON 文本形态：key 带引号、尾逗号、数组项无索引标签
  - **大纲式稳定行号**（CSS counter）：折叠只隐藏号段、不重排（1 2 3 4 5 折叠 2-4 显示 1 5）；未挂载子树用 counter-increment 占位补号
  - 折叠/展开：整行点击热区（拖选守卫）、grid 0fr→1fr 高度动画、首次展开双 rAF 过渡、内容淡出收拢感
  - 换行/不换行切换（不换行时水平滚动）；key/冒号 shrink-0 不折行
  - 每行尾部 hover 复制按钮：单行与文本对齐，多行贴底；叶子复制原始值、容器按全局缩进格式化，Copy / Check 状态过渡
  - string value 仅在能严格解析为对象或数组时展示椭圆 `Parse` 按钮；点击后一键在新标签打开子节点
  - 竖线、行号、开闭括号拆分定位：行号固定在左侧列，竖线与括号对齐，内容缩进变化不再破坏连线几何
  - 折叠箭头固定列：`.tree-chevron` 绝对定位锚到 tree-body（与行号同模式），所有层级的箭头与根节点箭头同列、不随缩进漂移；行内以 `w-4` 占位补回缩进，key 位置不变（`self-center` 参与绝对定位静态位置计算保持垂直居中）
  - 整行 hover：`fullRowStyle(depth)` 按嵌套深度给行盒做负 margin 外扩 + padding 原位补回（内容行每层 20px+indent；闭合括号行在 tree-children-inner 内少一层内容缩进，少补一个 indent），所有层级行的 hover 背景与根行同为整行；缩进量在 JS 侧算好（避免复杂 calc 跨内核差异）。**关键坑**：`.tree-children-inner` 的 `overflow: hidden`（折叠动画需要）会把外扩的行背景在横向裁掉——`getBoundingClientRect` 只能量到布局盒、量不到绘制裁剪，曾据此误判已修复；改为 `overflow: visible clip`（规范允许的组合、不产生滚动容器），纵向裁剪保留给折叠动画、横向放开。CSS 变量自引用累计（`--x: calc(var(--x)+…)`)在 Chrome 判循环无效，故 depth 由 React 递归传递
- **多标签工作区**：
  - Header 下方使用 HeroUI secondary Tabs，标签以 `Lens x` 展示，支持新建、切换、关闭与撤销关闭
  - 除 Header 全局偏好外，输入、解析结果、折叠状态、换行状态均按标签隔离
  - 编辑器与 TreeView 分别记忆每个标签的横纵滚动位置；左右面板比例使用同一份全局持久化配置
  - 示例数据补充对象、数组与普通文本三类 JSON string，用于验证一键解析子节点
- **工具栏**：logo + 特性 Chip 组（JSON5/自动解析/树形预览/一键解析子节点）+ 示例按钮 + 全局缩进 Select + TreeView 配色 Select + 浅/深主题 Tabs
- **全局缩进**：2 / 4 / 8 空格，按 `1 空格 = 2px` 同步作用于树内容缩进、格式化与复制输出
- **Toast**：基于 HeroUI `ToastQueue` 的统一封装，队列更新与 View Transition 同步；覆盖格式化、压缩、转义/反转义、复制、示例、清空、新建标签和关闭标签，关闭标签提供撤销操作；自动解析保持静默
- **纯文本降级**：解析失败且非 JSON 意图时，整段输入按字符串字面量处理
- **其他**：根容器使用 `px-3 py-2` / `gap-2`；面板拖拽分栏（比例持久化）、⌘/Ctrl+Enter 历史遗留已随自动解析移除、编辑器滚动修复（cm-theme 高度链）、默认浅色主题、状态栏统计

### 已回退的尝试（记录备查）

- **第一版全局缩进选择器**（2/4/8 空格 Select）：直接把缩进值接入整棵树的几何，导致竖线、行号、开闭括号互相影响，曾整体回退；现已通过“固定行号/连线列 + 独立内容缩进”重新实现
- **HeroUI Toast 复刻实现**：因官方 View Transitions 动画在本机不生效做过一版纯 CSS 复刻（平移入退场），后按"保持官方代码零改动"原则移除，存档于 git 历史 `6cb6a1a`
- **TreeView value Popover 复制**：尝试把复制操作移到 hover Popover，因快速扫过多行时干扰较强且布局收益有限，最终恢复为行尾 hover Icon

### 当前状态

- HeroUI Toast 的原始入场问题已改由自定义 `ToastQueue` 在队列更新边界统一衔接 View Transition，没有补充一套 CSS 动画；历史环境实验与根因链仍保留在 `docs/HEROUI-TOAST-ISSUE.md`
- 本轮（2026-08-25）通过 `tsc -b`、`oxlint`，并完成转义/反转义往返、图标动画、折叠箭头对齐/固定列、整行 hover（绘制层面验证）的浏览器交互检查
- 功能提交：`cd9b6f2 feat: escape/unescape buttons and tree interaction polish`，已推送到 `origin/main`

## 排查实录（关键结论存档）

- HeroUI v3 Toast：Provider 必须自闭合不包 children（否则白屏）；动画依赖 `tw-animate-css`；pnpm 下需手动补 5 个 peer + `client-only`
- ButtonGroup 内不要包 Tooltip（官方 issue #6516 variant 断链）；Separator 官方用法是放在后一个 Button 内部
- Tabs 选中态背景/动画来自 `<Tabs.Indicator />`；无 size 变体需自定义
- `.ts` 改名 `.tsx` 后必须整页 reload，HMR 断链会让旧模块"看似正常"

## 环境

- Vite 8 + React 19 + HeroUI v3（@heroui/react 3.2.4）+ Tailwind v4 + zustand + CodeMirror 6
- HeroUI agent skill 已全局安装（`~/.zcode/skills/heroui-react`，脚本可查组件文档）

---

*2026-08-25 更新；详细提交历史见 git log。*
