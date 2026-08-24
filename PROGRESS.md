# json-lens 进展记录

## 背景

blue 需要一个日常使用的 **JSON / JSON5 解析工具**：左侧编辑器输入、右侧树形预览，支持解析、压缩、格式化，解析结果可折叠展开。市面工具大多只支持标准 JSON，JSON5（注释、无引号 key、单引号、尾逗号、十六进制）场景缺失，且纯文本预览不方便核对深层结构——因此自建一个"给 JSON 配放大镜"的小工具，定名 json-lens。

**技术选型**（2026-08-23 启动）：Vite + React 19 + HeroUI v3 + Tailwind CSS v4 + zustand（persist 持久化）+ CodeMirror 6。UI 走 Soft UI 风格（圆角卡片、无边框、填充式按钮）。

## 功能进展

### 已完成

- **编辑器**：CodeMirror 6 + JSON 语法高亮 + 自定义亮暗主题（与树预览同色系）；行号、折叠槽；输入 **300ms 防抖自动解析**（无手动按钮）
- **树形预览**：
  - JSON 文本形态：key 带引号、尾逗号、数组项无索引标签
  - **大纲式稳定行号**（CSS counter）：折叠只隐藏号段、不重排（1 2 3 4 5 折叠 2-4 显示 1 5）；未挂载子树用 counter-increment 占位补号
  - 折叠/展开：整行点击热区（拖选守卫）、grid 0fr→1fr 高度动画、首次展开双 rAF 过渡、内容淡出收拢感
  - 换行/不换行切换（不换行时水平滚动）；key/冒号 shrink-0 不折行
  - 每行 hover 复制按钮：叶子复制原始值、容器复制格式化 JSON（icon 过渡动画）
  - 闭合括号与开括号列对齐（15.5px 固定补偿）
- **工具栏**：logo + 特性 Chip 组（JSON5/自动解析/树形预览）+ 示例按钮 + 浅/深主题 Tabs（Indicator 滑块动画、26px 小尺寸）
- **Toast**：HeroUI 官方用法（bottom start），格式化/压缩/复制/示例/清空反馈；自动解析静默不扰
- **纯文本降级**：解析失败且非 JSON 意图时，整段输入按字符串字面量处理
- **其他**：面板拖拽分栏（比例持久化）、⌘/Ctrl+Enter 历史遗留已随自动解析移除、编辑器滚动修复（cm-theme 高度链）、默认浅色主题、状态栏统计

### 已回退的尝试（记录备查）

- **全局缩进选择器**（2/4/8 空格 Select）：作用于格式化输出可行，但树形预览几何接入后引发一串对齐问题（竖线/行号/括号联动），最终整体回退，树恢复固定几何
- **HeroUI Toast 复刻实现**：因官方 View Transitions 动画在本机不生效做过一版纯 CSS 复刻（平移入退场），后按"保持官方代码零改动"原则移除，存档于 git 历史 `6cb6a1a`

### 已知问题

- **HeroUI Toast 入场动画在本机环境缺失**（退场正常）：官方 View Transitions + `flushSync` 时序问题，与官方文档站在本机表现一致；完整调研报告见 `docs/HEROUI-TOAST-ISSUE.md`（10 组环境实验矩阵 + 根因链，可交 HeroUI 团队）

## 排查实录（关键结论存档）

- HeroUI v3 Toast：Provider 必须自闭合不包 children（否则白屏）；动画依赖 `tw-animate-css`；pnpm 下需手动补 5 个 peer + `client-only`
- ButtonGroup 内不要包 Tooltip（官方 issue #6516 variant 断链）；Separator 官方用法是放在后一个 Button 内部
- Tabs 选中态背景/动画来自 `<Tabs.Indicator />`；无 size 变体需自定义
- `.ts` 改名 `.tsx` 后必须整页 reload，HMR 断链会让旧模块"看似正常"

## 环境

- Vite 8 + React 19 + HeroUI v3（@heroui/react 3.2.4）+ Tailwind v4 + zustand + CodeMirror 6
- HeroUI agent skill 已全局安装（`~/.zcode/skills/heroui-react`，脚本可查组件文档）

---

*2026-08-24 整理；详细提交历史见 git log。*
