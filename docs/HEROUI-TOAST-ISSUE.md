# HeroUI v3 Toast 动画失效问题调研报告

> 日期：2026-08-23 · 项目：DeepBrace JSON（Vite + React 19 + HeroUI v3）
> 本文档自包含，可直接转交 HeroUI 团队或接手人。

## 1. 现象

使用官方文档的标准用法（`<Toast.Provider />` 自闭合挂载 + 模块级 `toast()` 调用），Toast 功能正常（弹出、堆叠、超时消失、关闭按钮）。动画表现：

- **入场：无动画**（toast 瞬间出现）——单条、多条均如此
- **退场：动画正常**（自然超时关闭、手动点击关闭，单条与多条堆叠均正常）——肉眼可见滑出效果

官方源码中定义的平移入退场动画（`@heroui/styles/dist/components/toast.css`）：

```css
::view-transition-new(.toast-bottom):only-child {
  animation: toast-slide-bottom-in 350ms;
}
::view-transition-old(.toast-bottom):only-child {
  animation: toast-slide-bottom-out 350ms;
  animation-fill-mode: forwards;
}
@keyframes toast-slide-bottom-in {
  from {
    translate: 0 100%;
    opacity: 0;
  }
}
@keyframes toast-slide-bottom-out {
  to {
    translate: 0 100%;
    opacity: 0;
  }
}
```

注意 `:only-child` 伪类——**平移 keyframes 只在 new/old 伪元素"单独存在"时应用**（即快照中该元素只出现在一侧）。这是理解本问题的关键，见 §5。

## 2. 环境

| 项                             | 版本                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| @heroui/react / @heroui/styles | 3.2.4（npm latest）                                                                             |
| react / react-dom              | 19.2.8 与 19.2.6 均测试                                                                         |
| react-aria-components          | 1.20.0（peer 要求 ^1.20.0）                                                                     |
| 构建工具                       | Vite 7 / Vite 8（rolldown）、Next.js 16.3（dev 与生产构建）                                     |
| 浏览器                         | Chrome（macOS 14，arm64），`document.startViewTransition` 可用，`prefers-reduced-motion: false` |
| 已安装依赖                     | tw-animate-css、client-only、全部 5 个 peer（react-aria 系）                                    |

## 3. 官方文档站实测

在官方站 https://heroui.com/en/docs/react/components/toast 的 demo 中点击 "Show toast"：

- **入场**：toast 元素 `getBoundingClientRect().bottom` 与 `computedStyle.opacity` 从第一帧起即为终值（`y=-16, op=1.00`），无任何过渡——**瞬现**（与本项目环境一致）
- **退场**：元素本体的 rect/opacity 同样静止后移除——**但肉眼可见滑出动画**。原因：退场动画渲染在 VT 的 `::view-transition-old` **伪元素快照层**（元素本体不参与），元素级采样天然看不到。前期调研曾据此误判"退场也无动画"，实际退场正常。

> 检测方法论：VT 动画不能用元素级 rect/opacity 采样判定，需用 `document.getAnimations()` 枚举 `::view-transition-*` 伪元素动画，或直接肉眼确认。

## 4. 测试矩阵（全部实验与证据）

以下每种组合均验证"官方用法 + 依赖齐全"，动画均未出现：

| #   | 组合                                                 | 结果           |
| --- | ---------------------------------------------------- | -------------- |
| 1   | Vite 8 dev，React 19.2.8                             | 无动画         |
| 2   | Vite 8 生产构建（vite preview）                      | 无动画         |
| 3   | Vite 7（esbuild），React 19.2.8                      | 无动画         |
| 4   | 最小复现项目（Vite + 官方示例原样，零多余依赖）      | 无动画         |
| 5   | #4 + babel-plugin-react-compiler                     | 无动画         |
| 6   | Next.js 16.3 dev，React 19.2.8                       | 无动画         |
| 7   | Next.js 16.3 dev，React **19.2.6**（对齐官方站版本） | 无动画         |
| 8   | #7 + reactCompiler: true                             | 无动画         |
| 9   | **Next.js 16.3 生产构建**（next start）              | 无动画         |
| 10  | 官方文档站线上 demo                                  | 无动画（本机） |

关键中间证据（Next dev 下，最接近"几乎工作"的组合）：

- `document.getAnimations()` 能看到 `::view-transition-group/new/old(toast--xxxx)` 伪元素动画对象被创建，UA 动画名（`-ua-view-transition-fade-in` 等）存在
- 但 **`getComputedStyle(documentElement, '::view-transition-new(...)')` 的实际 opacity 无渐变**（快照无差异），且连续帧采样 rect/opacity 均为终值——动画对象在跑，画面没在动

## 5. 机制分析（源码级，含根因链）

HeroUI Toast 动画链路（`@heroui/react/dist/components/toast/`）：

```
toast() → ToastQueue.add
  → wrapUpdate(fn)                                    // toast-queue.js
  → document.startViewTransition(() => flushSync(fn)) // 关键:flushSync 强制 React 同步写入 DOM
  → VT 捕获新旧快照 → ::view-transition-* 伪元素动画（CSS keyframes 在 @heroui/styles 的 toast.css）
```

**根因链（为什么只有入场失效）**：

1. `flushSync(fn)` 未能将新 toast 的 DOM 写入稳定限制在 VT update 回调窗口内（React 19 渲染调度在部分环境下与 `startViewTransition` 回调的时序错位）——**实测证据**：入场瞬间 `document.getAnimations()` 中 `::view-transition-new(toast--xxx)` 与 `::view-transition-old(toast--xxx)` **同时出现且都在推进**（Next dev 下曾采样到 5 个伪元素动画对象各 @25ms），说明**旧快照捕获时 DOM 里已经存在新 toast**——新旧快照内容相同。
2. 官方 CSS 的平移 keyframes 带 `:only-child` 条件（见 §1）：new/old **成对**时不命中 → 入场退到 UA 默认 cross-fade；而 cross-fade 的新旧快照内容相同 → **视觉零变化**（瞬现）。
3. **退场方向相反**（元素从"有"到"无"）：old 快照必然包含元素、new 快照必然不含（无论 flushSync 时序如何，元素终将被移除且不在新快照）→ `:only-child` 命中 `toast-slide-bottom-out` → 滑出动画正常。
4. 已排除的假设：非 React 事件上下文调用（evaluate 直调 `toast()`）入场同样无动画 → 不是"事件内 flushSync"专属问题；React 19.2.6 / 19.2.8、React Compiler、Vite/Next、dev/生产均不影响 → 时序错位在更底层的 React DOM 更新调度。

**一句话结论**：入场动画失效 = flushSync 时序错位（新 DOM 提前落入旧快照）× `:only-child` 选择器条件（成对即不应用平移）× 快照相同（cross-fade 无视觉）三者叠加；退场不受影响。

## 6. 待确认项（建议接手人优先做）

1. 在**入场动画可见的环境**中，于 toast 出现瞬间枚举 `document.getAnimations()`：若只出现 `::view-transition-new` 而无 `::view-transition-old`（伪元素单独存在、`:only-child` 命中），则证实 §5 根因链
2. 对比入场有/无动画的环境的 React DOM 更新时序（可在 `startViewTransition` 回调内打 `MutationObserver` 断点，验证新 toast 节点插入是否发生在回调内）
3. 向 HeroUI 提 issue 附本报告：建议官方在 `wrapUpdate` 的 update 回调内显式确保 DOM 落位（或去掉 `:only-child` 条件、为 new/old 成对时也提供平移动画）

## 7. 临时替代方案（已验证，存于本仓库 git 历史）

commit `6cb6a1a`（"Next.js 16 版(含 Toast 复刻实现)"）包含一个**行为复刻实现**（`src/components/toast/index.tsx`，后被移除）：

- DOM 结构与类名完全对齐官方渲染产物，视觉由 `@heroui/styles` 官方 CSS 直接命中
- 动画不依赖 View Transitions：入场用 keyframes 平移滑入（`from { translate: 0 100% }`），退场/堆叠/溢出用 CSS transition（inline `translate/scale` 变化天然可过渡）
- 在 Vite / Next、dev / 生产下均稳定生效（帧采样验证：入场 y=31→-15 平移渐入、退场 y=-16→28 平移渐出）
- 若官方修复落地，可直接切回官方组件（API 兼容 `toast.success/danger/info/warning/clear`）

## 8. 当前项目状态

架构为 **Vite 8 + React 19**，渲染继续使用 HeroUI 的 `<Toast.Provider />` 与 `ToastQueue`，但队列更新已不再是“官方代码零改动”：项目在 `src/lib/toast.ts` 中提供统一封装，将新增、关闭和清空操作串行接入 `document.startViewTransition`，并在更新回调中使用 `flushSync`；浏览器不支持 View Transition 时退化为同步更新。

当前队列最多同时显示 3 条 Toast，统一承载转换、复制、标签关闭撤销和重置撤销等反馈。§1–§7 保留为历史环境、根因链与替代方案记录；当前实际行为以源码和测试为准，当前开发计划见 [docs/ROADMAP.md](ROADMAP.md)。

带撤销按钮的 Toast 与普通 Toast 共用同一套 View Transition，不再通过
`view-transition-name: none` 跳过动画；Playwright 同时验证底部 Toast 的
`toast-slide-bottom-in`、`toast-slide-bottom-out` 以及撤销后的标签恢复。
