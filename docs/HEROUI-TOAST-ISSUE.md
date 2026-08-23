# HeroUI v3 Toast 动画失效问题调研报告

> 日期：2026-08-23 · 项目：json-lens（Vite + React 19 + HeroUI v3）
> 本文档自包含，可直接转交 HeroUI 团队或接手人。

## 1. 现象

使用官方文档的标准用法（`<Toast.Provider />` 自闭合挂载 + 模块级 `toast()` 调用），Toast 功能正常（弹出、堆叠、超时消失、关闭按钮），但 **toast 的进出场没有任何动画**——入场瞬间出现、退场瞬间消失。

官方源码中定义的平移入退场动画（`@heroui/styles/dist/components/toast.css`）：

```css
::view-transition-new(.toast-bottom):only-child {
  animation: toast-slide-bottom-in 350ms;
}
::view-transition-old(.toast-bottom):only-child {
  animation: toast-slide-bottom-out 350ms;
  animation-fill-mode: forwards;
}
@keyframes toast-slide-bottom-in  { from { translate: 0 100%; opacity: 0 } }
@keyframes toast-slide-bottom-out { to   { translate: 0 100%; opacity: 0 } }
```

在线上（https://heroui.com/en/docs/react/components/toast）部分环境下可见，但在下述测试环境中（包括**官方文档站本身**）均未生效。

## 2. 环境

| 项 | 版本 |
|---|---|
| @heroui/react / @heroui/styles | 3.2.4（npm latest） |
| react / react-dom | 19.2.8 与 19.2.6 均测试 |
| react-aria-components | 1.20.0（peer 要求 ^1.20.0） |
| 构建工具 | Vite 7 / Vite 8（rolldown）、Next.js 16.3（dev 与生产构建） |
| 浏览器 | Chrome（macOS 14，arm64），`document.startViewTransition` 可用，`prefers-reduced-motion: false` |
| 已安装依赖 | tw-animate-css、client-only、全部 5 个 peer（react-aria 系） |

## 3. 官方文档站实测（重要）

在官方站 https://heroui.com/en/docs/react/components/toast 的 demo 中点击 "Show toast"，用连续帧采样（55ms 间隔）检测：

- **单条入场**：toast 元素 `getBoundingClientRect().bottom` 与 `computedStyle.opacity` 从第一帧起即为终值（`y=-16, op=1.00`），无任何过渡——**瞬现**
- **退场（4s 超时）**：静止数帧后元素直接从 DOM 移除——**瞬消**
- `document.getAnimations()` 中 **view transition 动画数量为 0**

即：**在测试机的 Chrome 上，官方文档站自身的 Toast 也没有动画**。（有其他环境反馈能看到平移动画，疑似与浏览器版本/渲染条件相关，见 §5-6。）

## 4. 测试矩阵（全部实验与证据）

以下每种组合均验证"官方用法 + 依赖齐全"，动画均未出现：

| # | 组合 | 结果 |
|---|---|---|
| 1 | Vite 8 dev，React 19.2.8 | 无动画 |
| 2 | Vite 8 生产构建（vite preview） | 无动画 |
| 3 | Vite 7（esbuild），React 19.2.8 | 无动画 |
| 4 | 最小复现项目（Vite + 官方示例原样，零多余依赖） | 无动画 |
| 5 | #4 + babel-plugin-react-compiler | 无动画 |
| 6 | Next.js 16.3 dev，React 19.2.8 | 无动画 |
| 7 | Next.js 16.3 dev，React **19.2.6**（对齐官方站版本） | 无动画 |
| 8 | #7 + reactCompiler: true | 无动画 |
| 9 | **Next.js 16.3 生产构建**（next start） | 无动画 |
| 10 | 官方文档站线上 demo | 无动画（本机） |

关键中间证据（Next dev 下，最接近"几乎工作"的组合）：

- `document.getAnimations()` 能看到 `::view-transition-group/new/old(toast--xxxx)` 伪元素动画对象被创建，UA 动画名（`-ua-view-transition-fade-in` 等）存在
- 但 **`getComputedStyle(documentElement, '::view-transition-new(...)')` 的实际 opacity 无渐变**（快照无差异），且连续帧采样 rect/opacity 均为终值——动画对象在跑，画面没在动

## 5. 机制分析（源码级）

HeroUI Toast 动画链路（`@heroui/react/dist/components/toast/`）：

```
toast() → ToastQueue.add
  → wrapUpdate(fn)                                    // toast-queue.js
  → document.startViewTransition(() => flushSync(fn)) // 关键:flushSync 强制 React 同步写入 DOM
  → VT 捕获新旧快照 → ::view-transition-* 伪元素动画（CSS keyframes 在 @heroui/styles 的 toast.css）
```

- 每条 toast 有唯一 inline `view-transition-name`（toast.tsx 的 `viewTransitionName`），堆叠定位用 inline `translate/scale`，溢出/退场标记 `data-hidden`（opacity: 0）
- 官方源码大量处理 `"Transition was skipped"` 异常（tail-extending promise chain 串行化 VT），说明该链路对时序高度敏感

**推测根因**：`flushSync(fn)` 未将 React DOM 更新稳定地落在 VT 的 update 回调窗口内（新快照与旧快照相同 → 伪元素动画无视觉差异）。这与 React 渲染调度的微妙时序相关，可能随 React 补丁版本 / 渲染管线（dev runtime、编译产物）变化，解释了不同环境表现不一致的现象。

## 6. 待确认项（建议接手人优先做）

1. 在**能看到动画的浏览器环境**中复现官方站，dump `document.getAnimations()` 与 `::view-transition-new` 的 computed opacity 渐变，确认为 VT 伪元素动画
2. 对比能看到/不能看到动画的两台机器的 Chrome 版本、GPU 合成状态（`chrome://gpu`）、`--enable-features` 标志
3. 向 HeroUI 提 issue 附上本报告与最小复现（Vite + 官方示例原样 + 依赖齐全，约 10 行代码）

## 7. 临时替代方案（已验证，存于本仓库 git 历史）

commit `6cb6a1a`（"Next.js 16 版(含 Toast 复刻实现)"）包含一个**行为复刻实现**（`src/components/toast/index.tsx`，后被移除）：

- DOM 结构与类名完全对齐官方渲染产物，视觉由 `@heroui/styles` 官方 CSS 直接命中
- 动画不依赖 View Transitions：入场用 keyframes 平移滑入（`from { translate: 0 100% }`），退场/堆叠/溢出用 CSS transition（inline `translate/scale` 变化天然可过渡）
- 在 Vite / Next、dev / 生产下均稳定生效（帧采样验证：入场 y=31→-15 平移渐入、退场 y=-16→28 平移渐出）
- 若官方修复落地，可直接切回官方组件（API 兼容 `toast.success/danger/info/warning/clear`）

## 8. 当前项目状态

架构已回归 **Vite 8 + React 19**，Toast 使用**官方代码零改动**（`<Toast.Provider />` + `toast()`，无任何 CSS 补丁），功能完整；进出场动画在本机环境下缺失（与官方站在本机的表现一致），等待官方修复或按 §6 排查。
