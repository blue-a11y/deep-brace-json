# DeepBrace JSON 项目开发规范

> 本文档是仓库的完整开发约定，适用于人工开发、代码审查和自动化代理。开始修改前先阅读根目录
> [AGENTS.md](../AGENTS.md)；其中的硬性约束优先级高于本文档。未完成工作以
> [docs/ROADMAP.md](ROADMAP.md) 为准。

## 1. 规则级别与文档职责

本文使用以下关键词：

- **必须**：合入前必须满足；只有用户或明确负责审核的人批准，才可在记录原因、影响和后续计划后
  偏离。开发者不得自行豁免。
- **应该**：默认做法；只有存在明确收益时才偏离，并保持改动范围最小。
- **禁止**：不得引入的新写法；发现既有例外时不得顺手扩大。

根目录只保留 README、本地化 README、许可证、贡献指南以及代理工具发现文件等需要固定入口的标准
文档；项目专属的完整规范、开发规划和专项资料统一放在 `docs/`。仓库文档按以下职责维护：

| 文档                            | 职责                                                     |
| ------------------------------- | -------------------------------------------------------- |
| `AGENTS.md`                     | 对所有开发者和自动化代理生效的仓库硬约束及文档联动规则。 |
| `docs/DEVELOPMENT.md`           | 完整开发规范、架构边界、质量门禁和交付检查表。           |
| `docs/ROADMAP.md`               | 未实现、进行中或待验收的开发规划。                       |
| `README.md` / `README.zh-CN.md` | 面向使用者和贡献者的当前顶层能力、启动方式和文档入口。   |
| `docs/` 中的其他文档            | 专项调研、问题证据和技术背景，不作为开发流水。           |

在不违反更高层安全与平台约束的前提下，当前任务中已经确认的明确需求优先。不同文档按职责裁决，
不使用一条通用排序互相覆盖：开发硬约束看 `AGENTS.md`，完整工程规则看 `docs/DEVELOPMENT.md`，
当前顶层能力摘要看双语 README，未完成计划看 `docs/ROADMAP.md`，专项证据看 `docs/` 中的对应专项
文档。具体产品行为由当前确认需求、源码和自动化测试共同验证，任何一项冲突时都必须先确认预期，
再在同一批改动中修正实现、测试或相关文档。

## 2. 项目事实与工具链

- 当前应用是 React 19 + TypeScript 6 + Vite 8 单页应用，不是 Next.js 应用。
- 根 `AGENTS.md` 顶部由外部工具维护的 Next.js 规则块必须保留，但不作为本项目目录或运行时架构
  的依据。
- 包管理器统一使用 `pnpm`；不得混用 npm、Yarn 或生成其他锁文件。
- `pnpm-workspace.yaml` 设置了 `autoInstallPeers: false`，依赖需要显式声明，不能依赖自动安装的
  peer dependency。
- 应用完全在浏览器本地运行；不得在没有明确产品需求、隐私说明和审查的情况下上传用户 JSON。

常用命令：

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm dev
pnpm test
pnpm test:unit
pnpm test:e2e
pnpm test:e2e:ui
pnpm lint
pnpm build
pnpm preview
pnpm format
git diff --check
```

- CI 或干净环境必须使用 `pnpm install --frozen-lockfile`。
- 依赖变更使用 `pnpm add`、`pnpm remove` 或 `pnpm update`，并同时提交 `package.json` 和
  `pnpm-lock.yaml`；禁止手工编辑锁文件。
- `pnpm format` 只格式化 Prettier 支持且未被 `.prettierignore` 排除的文件，不代表可以跳过
  `pnpm lint`。
- `pnpm preview` 预览已有生产产物，使用前先运行 `pnpm build`。
- 不提交 `node_modules/`、`dist/`、本地环境文件、临时截图、浏览器数据目录或编辑器缓存。

## 3. 目录职责与依赖方向

### 3.1 目录职责

| 路径                         | 允许职责                                                        | 不应承担                               |
| ---------------------------- | --------------------------------------------------------------- | -------------------------------------- |
| `src/main.tsx`               | 持久化 hydration、启动降级、React 挂载顺序                      | 页面布局、业务交互、组件实现           |
| `src/app.tsx`                | 应用 Shell、Provider、桌面 / 移动工作区组合                     | 解析算法、IndexedDB CRUD、具体控件逻辑 |
| `src/components/`            | 可见 UI、局部交互、组件临时视觉状态、组件专属 Hook              | 数据库 schema、散落的持久化读写        |
| `src/store/`                 | 跨组件状态、标签与偏好 action、默认值、持久化映射、重置原子状态 | React 组件、具体 DOM 操作              |
| `src/lib/`                   | 纯业务逻辑、浏览器 / 第三方适配器、跨组件命令服务               | 可见页面结构、局部组件                 |
| `src/components/react-bits/` | 保留上游 vendor 实现                                            | 产品状态、持久化或业务规则             |
| `src/index.css`              | 全局主题、共享结构、第三方覆盖、滚动条、关键帧和复杂选择器      | 可由组件 Tailwind 清楚表达的局部样式   |
| `scripts/`                   | 仓库级静态检查和开发工具                                        | 产品运行时代码                         |
| `e2e/`                       | Playwright 真实浏览器集成测试                                   | 纯逻辑单元测试、产品运行时代码         |
| `docs/`                      | 开发规范、开发规划和专项技术资料                                | 运行时代码、生成物、工具固定入口       |
| `public/`                    | 不经构建转换的静态资源                                          | 业务状态、密钥或敏感配置               |

Vitest 单元测试默认与被测模块同目录，命名为 `*.test.ts` 或 `*.test.tsx`；文件检查器也兼容已有或
上游约定的 `*.spec.ts(x)`。Playwright 用例统一放在根 `e2e/`，使用 `*.spec.ts`。只有需要跨模块
共享的测试夹具才建立 kebab-case 的 `test-fixtures/` 目录。

### 3.2 依赖方向

```text
main → app
main → store hydration / persistence adapters
app → components / store / UI adapters
components → store public API / lib public API
store → store 内部模块 / lib 纯逻辑与必要适配器
lib pure → 同层纯逻辑 / 无状态第三方库
lib *-actions → store + adapters + toast
```

必须遵守：

- `store` 和 `lib` 不得导入 `components`。
- 纯逻辑模块不得依赖 React、Zustand Store、Toast、存储适配器，也不得直接访问 `window`、
  `document`、`navigator` 等有状态浏览器 / DOM API。
- `*-actions.ts` 可以编排 Store、持久化和 Toast，但 Store 不得反向导入这些 action 文件，避免
  循环依赖。
- 组件通过 Store action 或窄 adapter API 改变持久状态，不直接设计或操作 IndexedDB schema。
- 不新增无必要的 barrel `index.ts`；直接导入具体模块，使依赖关系和循环依赖可见。
- 禁止新增含义宽泛的 `utils.ts`、`helpers.ts`。文件名必须表达单一职责，例如
  `panel-layout-storage.ts`、`reset-actions.ts`。

当前 `src/lib` 同时容纳纯逻辑、adapter、Hook 和命令服务，这是受控的现有结构。只有同类文件继续
增长、出现清晰迁移边界时，才统一建立子目录；不得只迁移一个文件造成新旧结构长期并存。

当前分类参考：`parse.ts`、`indent.ts`、`tree-theme.ts` 和 `sample.ts` 属于纯逻辑；
`shortcuts.ts` 因读取平台信息属于浏览器绑定模块，`cm-theme.ts`、`tab-scroll.ts`、
`panel-layout-storage.ts`、`indexed-db-storage.ts` 和 `use-media-query.ts` 属于浏览器或第三方
adapter；`tab-actions.ts`、`reset-actions.ts` 属于应用命令。新增模块按依赖和副作用判断职责，不能
只按文件名模仿分类。

## 4. 文件、类型与标识符命名

### 4.1 文件和目录

- `src` 下文件和目录必须使用 kebab-case，例如 `tree-view.tsx`、
  `use-toolbar-action-visibility.ts`。
- 职责后缀用点号分隔。当前文件检查允许最多一个职责后缀：`.d`、`.module`、`.spec`、
  `.stories` 或 `.test`，再接扩展名。
- React 组件文件使用 `.tsx`；不包含 JSX 的模块使用 `.ts`。
- 一个组件文件应该只有一个主要公开组件；仅递归辅助组件、紧密耦合的状态变体或仅服务该组件的
  Hook 可以共置。

### 4.2 TypeScript 与 React 命名

| 对象                 | 规则                                        | 示例                     |
| -------------------- | ------------------------------------------- | ------------------------ |
| React 组件           | PascalCase，使用 `const` 箭头函数声明       | `const TreeView = () =>` |
| 类型、Props、Options | PascalCase，不使用 `I` 前缀                 | `TreeViewProps`          |
| Hook                 | `use` + PascalCase 语义                     | `useMediaQuery`          |
| 函数、变量、参数     | camelCase，使用完整语义名                   | `activeTabId`            |
| Boolean              | `is`、`has`、`can`、`should`、`does` 等前缀 | `shouldWrap`             |
| 组件内事件函数       | `handleXxx`                                 | `handleReset`            |
| 回调 Props           | `onXxx`                                     | `onOpenChange`           |
| 模块级固定配置常量   | UPPER_SNAKE_CASE                            | `RESET_TOAST_TIMEOUT`    |

React 组件统一写法：

```tsx
type SettingsButtonProps = {
  isDisabled?: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

const SettingsButton = ({ isDisabled, onOpenChange }: SettingsButtonProps) => {
  // ...
};

export default SettingsButton;
```

- “组件统一使用 `const`”只约束 React 组件；纯函数可以根据可读性选择函数声明或 `const`。
- 禁止 `ISettingsProps`、`s`、`v`、`cls`、`len` 等缩写；循环、坐标等场景也优先使用
  `index`、`position`、`value` 等完整名称。
- 存在更准确的业务含义时，不使用类型充当语义，例如优先 `activeTabId`，而不是宽泛的
  `stringValue`；局部类型收窄场景不受此限制。
- 在可以共享同一运行时模块的边界内，相同概念必须复用既有常量、类型和命名；不能为同一默认值、
  断点或超时再建一份近义常量。跨 TypeScript / CSS / 用户文案无法直接共享时，必须同步相关测试和
  必要的双语 README 摘要，使用边界测试防止漂移。

## 5. TypeScript 与 React 实现规则

### 5.1 TypeScript

- 导入仅用于类型的符号时使用 `import type`，满足 `verbatimModuleSyntax`。
- 外部输入、IndexedDB 恢复值和 `JSON.parse` 结果先视为 `unknown`，通过类型守卫校验后使用。
- 禁止无说明的 `any`、双重类型断言或用 `as` 掩盖真实类型错误。
- 数组、`Set`、`Map` 和 Store 状态更新保持不可变；不得先修改旧引用再把同一引用交回 React。
- 可重建的派生值使用计算或 selector，不为避免一次计算而重复存入 Store。
- 异步调用必须有明确的等待、取消或错误处理策略。使用 `void` 忽略 Promise 时，Promise 自身必须在
  适配器边界捕获并报告错误。
- Playwright E2E 配置已启用 `strict`；应用与 Node 构建配置尚未启用。这不代表允许弱类型，新代码应按
  strict-safe 的方式编写，应用代码严格模式的整体启用按 `docs/ROADMAP.md` 规划逐步推进。

### 5.2 Effect 与资源生命周期

禁止让 Effect 回调返回 Promise：

```tsx
// 禁止
useEffect(async () => {
  await hydrateData();
}, []);

// 正确
useEffect(() => {
  let isCancelled = false;

  const hydrate = async () => {
    try {
      const value = await hydrateData();
      if (!isCancelled) applyValue(value);
    } catch (error) {
      if (!isCancelled) reportError(error);
    }
  };

  void hydrate();
  return () => {
    isCancelled = true;
  };
}, []);
```

- Effect 只能返回 cleanup 函数或 `undefined`。
- 全局事件、Timer、`requestAnimationFrame`、`ResizeObserver`、第三方实例和 Store 订阅必须在
  cleanup 中释放，并能承受 React Strict Mode 的重复挂载。
- 与标签页关联的异步任务、自动解析和滚动恢复必须使用 `tabId` 作为身份，而不是捕获可能已经变化
  的数组下标。自动解析可以在切换标签后按原 `tabId` 完成，但标签关闭、内容被替换或重置后必须
  使旧任务失效；绑定 DOM 的滚动恢复在元素卸载或身份变化时取消。
- DOM 操作只用于 CodeMirror、PanelGroup 等第三方集成或专门 adapter；普通组件不得用 DOM 作为
  跨刷新状态来源。

### 5.3 React 状态与 Zustand

- 只在当前组件生命周期内使用的动画、复制反馈、弹层开关和 Timer 句柄保留在
  `useState` / `useRef`。
- 普通业务状态需要跨组件共享或跨标签复用时进入 Zustand，并明确是否持久化；分栏和滚动因第三方
  同步接口与高频写入要求，刻意由专用 adapter 和内存缓存管理，不强行塞进 Zustand。
- 组件订阅最小状态切片，禁止无必要地订阅整个 Store：

```tsx
const isDark = useStore(state => state.isDark);
```

- `useStore.getState()` 只用于事件处理或 React 外的命令模块读取最新值；渲染阶段不得依赖它，否则
  状态变化不会触发重渲染。
- action 负责表达用户意图；组件不得复制同一业务状态变换。
- 解析结果、`isDirty`、动画状态、计时器和第三方实例等可重建或瞬时数据不得作为恢复来源。当前
  `prepareTabForStorage` 为保持 `JsonTab` 形状会写入 `null` / `false` / 空集合占位，hydration
  必须忽略并重建这些值；设计新 schema 时优先从持久化类型中彻底省略瞬时字段。

## 6. IndexedDB、布局与滚动持久化

### 6.1 启动与存储边界

- Zustand、分栏布局和滚动缓存必须在首次 React render 前完成 hydration；启动顺序集中在
  `src/main.tsx`，页面组件不得各自竞争恢复状态。
- Zustand persist 必须保持 `skipHydration: true`，避免模块加载时自动恢复与 `main.tsx` 的手动
  hydration 竞争。
- 当前 IndexedDB 使用 `app-state`、`panel-layout`、`tab-scroll` 三个 Object Store。Store 使用
  out-of-line key：`createObjectStore(name)`、`put(value, key)`；record root 不重复保存仅用于定位该
  记录的 primary key。`app-state` 内部的标签 `id` 和 `activeTabId` 属于必要业务关系，应当保留。
- value 使用 IndexedDB structured clone 保存对象、数组、`Set` 等结构。禁止重新退化为整份 JSON
  字符串；只有第三方同步接口明确要求字符串时，才在 adapter 边界转换。
- 修改 Object Store、`keyPath` 或键策略必须提升数据库版本，并明确迁移或清空策略；对应测试必须
  构造精确的上一 schema 和能证明保留 / 清空策略的数据，不能只测试全新数据库。
- 写入完成以 transaction 的 `oncomplete` 为准，不能把单个 request 成功当成事务已经提交。
- 同一批记录优先使用一个 transaction。业务正确性依赖先后顺序时，涉及的每个 adapter 都必须
  提供可等待的写入屏障或串行队列，调用方显式等待；不能因为某一个 adapter 有队列，就假定其他
  fire-and-forget 写入也已经完成。
- 每条存储错误路径必须有唯一、可定位的报告责任方，并降级为当前页面内存状态；组件不得各自弹出
  重复错误。当前 app-state hydration 在 adapter 内捕获，而 panel / scroll hydration 会冒泡到
  `main.tsx`，同一次底层失败仍可能产生两类日志，属于下文受控例外。
- 数据库收到 `versionchange` 时关闭连接；升级被其他页面阻塞时必须可诊断，不得永久等待。
- `persistVersion` 是 app-state adapter 的保留字段，业务状态不得使用同名字段。

### 6.2 新增持久化偏好检查表

新增或修改持久化偏好时，必须同时检查：

1. `PreferencesSlice` / `DeepBraceState` 类型。
2. 默认值和 setter / action。
3. `PersistedDeepBraceState`。
4. `partialize` 白名单。
5. hydration merge、非法值校验和降级默认值。
6. `ResetSnapshot`、快照捕获、重置默认值和撤销恢复。
7. IndexedDB schema / version 是否受影响。
8. 自动化测试和浏览器刷新、重置、撤销测试。
9. 顶层能力发生变化时同步双语 README；尚未完成或仍待验收时同步 `docs/ROADMAP.md`。

新增标签字段还必须同步检查 `createInitialTab` / `createJsonTab`、`restoreJsonTab` 和
`prepareTabForStorage`，明确该字段是持久状态还是可重建状态。

### 6.3 分栏与滚动

- `react-resizable-panels` 需要同步 storage API，因此布局 adapter 先同步更新内存 `Map`，再异步
  写入 IndexedDB；JSON 字符串只存在于第三方接口边界，IndexedDB 中保存结构化对象。
- 滚动位置使用 `[tabId, area]` 作为记录身份；新增滚动区域时必须定义稳定 `area`、缓存生命周期、
  hydration、清理和 reset / undo 行为。
- 恢复滚动时暂停旧元素写回，等待布局和内容稳定后 clamp 到有效范围；用户主动滚动应中断旧恢复。
- 禁止使用固定等待若干帧的方式假定动画结束。若布局有动画，应检查几何稳定性，并设置最大等待
  时间，防止恢复任务永久占用。
- 标签关闭后的孤立记录清理、撤销关闭和多页面并发策略属于产品行为；变更前先更新规划和测试，
  不能在 adapter 中静默改变。

### 6.4 重置与撤销顺序

涉及 React 重挂载的重置或相关代码变更，目标顺序必须满足：

1. 冻结并捕获当前活动标签的真实滚动位置。
2. 捕获 Zustand、滚动和分栏的完整重置前快照。
3. 在触发 React 重挂载前，同步清空内存滚动和布局缓存，阻止旧组件 cleanup 写回旧状态。
4. 设置默认状态并递增 `resetEpoch`。
5. 等待已经排队的旧写入结束，再清理对应 IndexedDB 数据。

撤销的目标顺序必须满足：

1. 等待正在执行的重置持久化任务完成，防止清理覆盖恢复数据。
2. 在 React 重挂载前同步恢复滚动和分栏内存缓存。
3. 恢复 Zustand 快照并递增 `resetEpoch`。
4. 把最终状态写回 IndexedDB；对后续步骤、刷新正确性或调用方完成语义有影响的事务必须纳入
   可等待的完成 Promise。

重置 / 撤销测试不能只断言最终 Promise 完成后的数据，还要断言 Promise 完成前内存缓存已经按正确
顺序切换，因为 React cleanup 和 layout effect 发生在中间阶段。当前 app-state 与滚动 adapter
使用串行队列，重置 / 撤销的完成 Promise 同时等待 app-state、滚动与布局的最终事务；普通分栏拖拽
写入仍是 fire-and-forget，其余失败、并发和迁移边界继续由 `PLAN-001` 验收。

## 7. UI、交互与样式

### 7.1 组件与弹层

- HeroUI 使用仓库当前 v3 compound API；不能根据旧版本记忆编写。需要确认 API 时以已安装包类型和
  源码为准。
- Modal 使用默认 Backdrop，不启用 blur；默认提供右上角 `Modal.CloseTrigger`。
- 内容即时生效、无需显式提交的 Modal 可以使用 Header 和 Body，但不添加“完成”按钮或仅用于
  关闭的 Footer。
- 只有一组修改在确认前尚未生效时，才使用 Modal Footer 放置提交 / 取消动作。
- 危险操作使用 AlertDialog 二次确认；标题、描述、取消和确认按钮必须准确表达真实后果，包括是否
  可以撤销。
- Tooltip 复用 `Tip`，快捷键展示复用 `ShortcutKbd`，Toast 统一通过项目 `toast` 封装。
- Popover、Dropdown、Modal 等 overlay 必须限制超长内容尺寸，复用全局滚动条，不得推动整个页面
  滚动或产生无意横向滚动。

### 7.2 可访问性

- 仅图标按钮必须提供准确的 `aria-label`；快捷键入口同步声明 `aria-keyshortcuts`。
- 对话框必须有可关联的 Heading / 描述，打开后焦点进入合理位置，关闭后焦点返回触发器。
- 可点击父节点中的行内按钮必须处理冒泡，避免同时触发折叠、选择或打开行为。
- 新增或修改的核心操作必须同时支持键盘；新增快捷键要处理 IME、重复按键、Ctrl / Meta 冲突和
  弹层聚焦。
- 新增或修改的非必要动效必须在 `prefers-reduced-motion: reduce` 下关闭或显著简化。
- 新窗口链接必须带 `noopener,noreferrer`。

### 7.3 响应式工具栏

工具栏按屏幕宽度逐项展示，隐藏动作必须同时出现在溢出菜单。当前直显阈值为：

| 动作     | 最小宽度 |
| -------- | -------: |
| GitHub   |    340px |
| 页面主题 |    480px |
| 设置     |    560px |
| 快捷键   |    600px |
| 语法主题 |    680px |
| 缩进     |    800px |
| 示例     |    860px |

新增或调整动作时：

- 在 `ToolbarActionVisibility` / `useToolbarActionVisibility` 中定义唯一可见性和优先级，不在多个
  组件复制断点。
- 同时实现直显入口与溢出菜单中的等价入口，复用同一 action 和 overlay state。
- 宽度变窄时逐项收纳低优先级动作，尽量保留右侧动作；禁止在单一断点突然隐藏全部工具。
- Logo 与产品名保持 `shrink-0` 且不换行，按钮与 Icon 不得被 Flex 压缩变形。
- 视口结构变化由统一 media query 控制；普通显隐、间距和文字收缩优先使用 Tailwind / CSS。
- 修改断点时覆盖断点前后 1px 的浏览器验收；顶层响应式规则变化时同步双语 README。

当前 `<768px` 使用上下工作区，`>=768px` 使用可拖拽左右分栏；单个面板内容宽度不超过 520px 时，
面板动作隐藏文字但保留图标和可访问名称。

### 7.4 样式边界

- 普通组件布局和状态样式优先 Tailwind utilities。
- `src/index.css` 只维护根主题和字体、HeroUI / CodeMirror 必要覆盖、共享结构、全局滚动条、动画、
  伪元素、container query 等不适合普通 utility 的规则。
- 动态主题优先 `data-*` 和 CSS 变量；不得在多个 JSX 文件复制成组颜色 class。
- 全局滚动条规则只维护一份，Popover / Dropdown 不创建另一套外观。
- 动态几何值可以使用行内 style；固定视觉值应使用 Tailwind 或 CSS 变量。
- 新增语法主题必须同步 CodeMirror token、Tree CSS token、亮暗两套表现、选项列表和验证用例。
- 不按文件行数机械拆分。只有出现可独立测试、可复用或变化原因不同的第二职责时才拆分。

`src/components/react-bits/` 是 vendor 例外并被 Prettier 忽略。修改它时必须说明原因，尽量保留
上游结构；产品状态和业务规则不得放入该目录。

## 8. 测试与验证

### 8.1 自动化测试

- 纯解析、转换、状态归一化和存储 adapter 使用 Vitest 单元测试。
- 测试名称描述用户行为和边界，不复述函数内部实现。
- 会修改 IndexedDB 或模块级缓存且可能互相影响的用例，必须通过独立数据库，或在用例前后显式清理
  数据并重置模块实现隔离；严格串行只能避免并发，不能替代隔离，也不能依赖用例执行顺序偶然正确。
- IndexedDB 升级测试从精确上一版本 schema 构造数据，校验 Object Store、`keyPath`、外部 key、
  value 结构和数据保留 / 清空策略。
- fake IndexedDB 只验证事务和 schema 逻辑，不能替代真实浏览器中的 CodeMirror、Tree、
  ResizeObserver、PanelGroup 和页面重载测试。
- 变更持久化、重置或延迟任务逻辑时，必须为涉及的失败、连续写入、重置与撤销交错、标签关闭等
  竞态补充针对性用例。
- 修复缺陷时先补能稳定复现问题的回归用例；若只能浏览器复现，在变更说明中记录步骤和预期。

### 8.2 浏览器验收

涉及以下能力时不能只依赖单元测试：

- CodeMirror 输入、selection、换行、编辑器滚动与聚焦。
- Tree 折叠、行号、复制、嵌套 `Parse`、超长字符串 Popover 和滚动条。
- Modal、AlertDialog、Dropdown、Select、Toast 和键盘焦点。
- 工具栏各关键断点、Logo / Icon 收缩、移动 / 桌面工作区切换。
- IndexedDB 刷新恢复、分栏、双区滚动、重置、8 秒撤销及撤销后再次刷新。

可自动化的真实浏览器流程统一使用 Playwright：

- 优先使用 `getByRole`、`getByLabel`、可见文本等语义定位器；只有第三方组件没有稳定语义时才使用
  局部 CSS locator，不绑定 Tailwind 视觉 class 或 DOM 层级。
- 使用 Playwright assertion 的自动等待，禁止用固定 `waitForTimeout` 掩盖 hydration、动画或写入
  竞态。
- 每个用例使用独立 BrowserContext；同一用例内通过 reload 验证 IndexedDB 时，先观察用户可见状态
  已稳定，不在测试之间共享 storage state。
- 默认测试服务由 `playwright.config.ts` 在 4173 端口启动；设置 `E2E_BASE_URL` 时测试指定环境且不
  启动本地服务。
- 桌面与移动断点使用显式 viewport；新增响应式规则时覆盖断点前后 1px，而不是依赖测试机器窗口。
- console warning / error、page error 和框架错误层属于失败，只有明确验证并记录的预期错误可以过滤。
- `test-results/`、`playwright-report/`、trace 和失败截图是临时诊断产物，不提交仓库。

浏览器验收至少记录：初始状态、操作步骤、预期、实际结果、视口宽度，以及是否刷新页面。记录放在
当前任务 / MR 的交付说明或对应规划项的验收证据中，不另建进展日志。
`docs/ROADMAP.md` 的 `PLAN-006` 计划建立完整回归矩阵；完成前按变更范围执行并记录手工验收。

### 8.3 每批变更的最低门禁

```bash
pnpm test
pnpm lint
pnpm build
git diff --check
```

- `pnpm test` 依次执行 Vitest 和 Playwright；只需快速验证一层时分别使用 `pnpm test:unit` 或
  `pnpm test:e2e`，完整交付不能只跑其中一层。
- 首次运行 E2E 或升级 Playwright 后执行 `pnpm exec playwright install chromium`，使框架版本与
  浏览器二进制匹配。
- 文档变更也至少运行 `pnpm lint` 和 `git diff --check`；若同一工作树包含代码变更，仍执行完整门禁。
- 测试和构建通过不代表浏览器交互已验证；根据变更范围补充验收。
- 生产构建出现包体警告时必须如实记录，不能通过调高阈值伪装改善。

## 9. 当前自动检查边界

| 检查                  | 当前实际覆盖                                                              | 仍需人工审查                                           |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| `pnpm lint:filenames` | `src` 下目录和文件 kebab-case、允许的单一职责后缀                         | 根目录、`docs`、语义是否准确                           |
| `pnpm lint:style`     | `I` 类型前缀、PascalCase 函数声明、部分 Boolean、部分事件回调、指定短变量 | 所有组件是否为 `const`、复杂推断 Boolean、完整语义命名 |
| `oxlint`              | 当前默认 correctness 扫描；warning 不阻断命令                             | React、Hooks、a11y 等尚未显式启用或提升为 error 的规则 |
| `prettier --check .`  | Prettier 支持且未忽略文件的格式和 import 顺序                             | 架构、命名语义、vendor 目录                            |
| `pnpm build`          | TypeScript project build 与 Vite 生产构建                                 | 应用配置尚未启用 `strict`、浏览器运行行为、性能预算    |
| `pnpm test:unit`      | 已编写的 Vitest 纯逻辑、状态与 adapter 用例                               | 真实 DOM、浏览器 API 和用户交互                        |
| `pnpm test:e2e`       | 已编写的 Playwright Chromium 页面、交互、刷新和响应式用例                 | 尚未编写的流程及 Firefox / WebKit 差异                 |
| `pnpm test`           | 依次运行上述两层测试                                                      | 尚未被任何测试覆盖的行为                               |

不得把工具没有报错表述为“全部规范已经自动验证”。缺失的自动化能力在 `docs/ROADMAP.md` 中规划，
实施前不以口头约定冒充门禁。

### 9.1 当前受控例外

以下是已知现状，不是新代码可以复制的通用模式：

- `src/components/react-bits/` 保持上游格式并仅被 Prettier 忽略；它仍接受文件名、style、Oxlint 和
  TypeScript 检查。除必要的兼容修复外不扩展业务代码。
- CodeMirror 与 Tree 使用不同渲染体系，语法主题 token 当前分别存在 TypeScript 和 CSS 中；修改
  主题时必须成对验证，后续再评估生成式单一来源。
- `src/lib` 当前混合纯逻辑、adapter、Hook 和命令服务；新增代码仍按依赖方向隔离，达到清晰迁移
  阈值后再整体分目录。
- `src/store/tab-slice.ts` 仍编排少量 Toast 和滚动副作用；不得继续堆叠新的跨层流程，复杂用户命令
  应放入 `*-actions.ts`。
- 自动解析 timer 当前没有在 reset 时统一清空；修改重置或解析调度时必须使旧任务按 `tabId` 失效，
  不得让重置前任务提交到新工作区。
- 设置 Modal 当前仍用 Footer 承载即时生效的重置入口，确认文案也与 8 秒撤销行为冲突；不得复制
  这一写法，统一调整由 `PLAN-002` 跟踪。
- app-state 与滚动持久化已有显式串行队列，reset / undo 的完成 Promise 也等待分栏的清理或恢复
  事务；普通分栏拖拽写入仍是 fire-and-forget。触碰该链路时必须按 6.4 节保持完成语义，其余边界
  由 `PLAN-001` 验收。
- 当前 IndexedDB 测试共享 fake factory 与模块缓存，并依赖串行执行；扩展用例时必须先显式隔离，
  避免测试数量或并发方式变化后互相污染。
- 当前 v2 fixture 还混入旧 `key-value` Store，且没有写入旧数据证明升级后的主动清空策略；
  `PLAN-001` 验收前必须用精确 v2 schema 和探针数据补齐。
- app-state hydration 与 panel / scroll hydration 当前分属 adapter 和 `main.tsx` 两条报告路径，
  IndexedDB 整体不可用时可能重复 warning；调整失败处理时应收敛为一次有上下文的启动报告。
- `ResetSnapshot` 当前直接引用滚动 adapter 类型，并用分栏库的字符串作为布局快照；继续新增基础设施
  状态前应先建立 Store 自有 DTO，避免扩大耦合。
- `JSON5.parse` 的一条路径仍继承第三方 `any` 返回类型；修改解析链路时收敛为 `unknown` 后再守卫。
- 少量滚动捕获调用依赖“同步更新内存、后台落库”语义但未用 `void` 明示返回 Promise；修改调用点时
  必须明确等待或显式忽略，并处理最终 rejection。
- 响应式阈值目前分布于 TypeScript media query、Tailwind 和 CSS container query；修改任何阈值都
  必须全局检索并同步边界测试，顶层规则变化时同时更新双语 README。
- `tree-view.tsx`、`tab-scroll.ts` 和 `index.css` 体量较大，但各自仍有集中职责；不能只因行数拆分，
  也不能把新的无关职责继续塞入。
- Tree 单节点整行目前依赖点击交互，品牌 Logo 动效也尚未完整响应 reduced motion；新改动不得复制
  这些缺口，整体收敛分别由 `CANDIDATE-03`、`CANDIDATE-04` 进入规划后处理。

## 10. 文档联动

代码变更完成前按下表检查文档：

| 变更                                                 | 必须同步                                                 |
| ---------------------------------------------------- | -------------------------------------------------------- |
| 新增、修改或移除用户可见行为                         | 对应自动化测试与浏览器验收                               |
| 默认值、入口、快捷键、持久化、响应式、重置或降级变化 | 对应测试；属于顶层能力时同步两版 README                  |
| 顶层能力、技术栈、脚本、启动 / 测试命令变化          | 两版 README，章节结构和内容保持一致                      |
| 未实现、进行中或待验收工作                           | `docs/ROADMAP.md` 中对应稳定规划 ID                      |
| 架构、编码、UI 或质量规则变化                        | `AGENTS.md` 的硬约束（如受影响）和 `docs/DEVELOPMENT.md` |
| 专项问题的证据或调查过程                             | `docs/`；同时确保当前状态没有与源码和测试冲突            |

- `README.md` 只写英文，`README.zh-CN.md` 只写简体中文；代码、命令和链接除外。
- 两版 README 章节顺序、能力范围和命令必须一一对应，不能只翻译其中一版。
- 不建立提交批次或排障进展日志；历史由 Git 保存。
- 完成的规划项从 `docs/ROADMAP.md` 当前规划移除；属于顶层能力时同步两版 README。

## 11. Git、依赖与变更范围

- 保持最小且聚焦的 diff；不得顺手格式化 vendor、大范围改名或清理与需求无关的既有代码。
- 工作树已有改动默认属于其他进行中工作，修改前先检查并避免覆盖；只提交确认属于本次任务的文件。
- 禁止用 `git reset --hard`、`git checkout --` 等破坏性命令丢弃未确认改动。
- 不自动绕过失败的 Git hook。应先报告失败命令、影响范围和 `--no-verify` 风险，获得明确授权后再
  决定。
- 新增依赖前确认已有依赖或平台 API 是否已覆盖需求；记录包的职责，不为一个简单工具函数引入大型
  依赖。
- 不在前端代码、日志、测试夹具或文档中提交 token、Cookie、真实用户数据和其他秘密。
- Commit message 应简洁说明用户结果或技术边界；功能、重构和文档尽量拆成可独立审查的提交，但
  不能把必须同步的代码、测试与文档拆散到不可用状态。

## 12. 完成定义

一项开发工作只有同时满足以下条件才算完成：

- [ ] 需求范围和受影响的用户行为已确认，没有扩大未授权范围。
- [ ] 目录职责、依赖方向、命名、类型和组件声明符合本规范。
- [ ] 新增状态已明确本地 / 全局、持久 / 瞬时边界。
- [ ] IndexedDB、布局或滚动变更已验证 hydration、失败、刷新、重置和撤销顺序。
- [ ] UI 变更已验证键盘、焦点、可访问名称、reduced motion 和关键响应式宽度。
- [ ] 已补充与风险相称的单元测试和浏览器验收。
- [ ] `pnpm test`、`pnpm lint`、`pnpm build`、`git diff --check` 通过；警告已如实说明。
- [ ] `docs/ROADMAP.md`、双语 README 和专项文档已按变更范围联动。
- [ ] 最终 diff 只包含预期文件，没有生成物、秘密、调试代码或无关格式化。
