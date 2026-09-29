# DeepBrace JSON 项目开发规范

> 本文档是仓库的完整开发约定，适用于人工开发、代码审查和自动化代理。开始修改前先阅读根目录
> [AGENTS.md](../AGENTS.md)；其中的硬性约束优先级高于本文档。未完成工作以
> [docs/ROADMAP.md](ROADMAP.md) 为准。

## 1. 规则级别与文档职责

本文使用以下关键词：

- **必须**：涉及数据安全、架构契约、用户可见正确性或明确交付条件，合入前需要满足；如需偏离，
  由用户或明确负责审核的人批准，并记录原因和影响。
- **应该**：推荐的默认做法；存在更适合当前任务且不破坏硬约束的方案时可以偏离，无需形式化批准，
  但应保持改动范围最小并能说明理由。
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
文档。

冲突和不确定性按以下顺序处理：

1. 先确认冲突是否真实影响当前任务，不为理论上的可能性扩大扫描或修改范围。
2. 与当前模块和行为直接相关的具体规则优先于宽泛默认规则；当前明确需求优先于历史说明。
3. 源码、浏览器行为和文档不一致时，以用户确认的行为和当前运行证据为依据，在任务范围内修正受影响项。
4. 低风险、可回退的实现细节采用合理假设继续推进；涉及产品语义、用户数据、外部状态或交付范围
   的选择再请求确认。
5. 规则描述稳定边界，不记录提交流水、一次性排障步骤或已完成计划；这些信息由 Git 或专项证据保存。

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
pnpm dev
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
| `docs/`                      | 开发规范、开发规划和专项技术资料                                | 运行时代码、生成物、工具固定入口       |
| `public/`                    | 不经构建转换的静态资源                                          | 业务状态、密钥或敏感配置               |

组件按页面区域归入 `components/editor/`、`tree/`、`tabs/`、`toolbar/`、`settings/`、`shortcuts/` 和
`shared/`；`components/react-bits/` 保持独立。纯逻辑与适配器按职责归入 `lib/parse/`、`tree/`、
`storage/`、`layout/`、`shortcuts/`、`workspace/` 和 `theme/`。Store 的标签模块位于 `store/tabs/`，
偏好模块位于 `store/preferences/`，`types.ts` 与 `use-store.ts` 保留在 Store 根目录。

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

`src/lib` 子目录用于按职责收敛文件，不代表新的依赖层：`parse/` 放解析、输入转换和示例，`tree/`
放树模型与搜索，`storage/` 放持久化及滚动适配器，`layout/` 放布局配置、断点和启动样式，`shortcuts/`
放快捷键定义与标签，`workspace/` 放工作区命令和 Toast，`theme/` 放代码主题与字体。分类仍以依赖和
副作用为准：`src/lib/parse/parse.ts`、`src/lib/parse/indent.ts`、`src/lib/tree/tree-theme.ts` 和
`src/lib/parse/sample.ts` 属于纯逻辑；`src/lib/shortcuts/shortcuts.ts` 因读取平台信息属于浏览器绑定
模块，`src/lib/theme/cm-theme.ts`、`src/lib/storage/tab-scroll.ts`、
`src/lib/storage/panel-layout-storage.ts`、`src/lib/storage/indexed-db-storage.ts` 和
`src/lib/layout/use-media-query.ts` 属于浏览器或第三方 adapter；`src/lib/workspace/tab-actions.ts`、
`src/lib/workspace/reset-actions.ts` 属于应用命令。新增模块按依赖和副作用判断职责，不能只按文件名模仿分类。

## 4. 文件、类型与标识符命名

### 4.1 文件和目录

- `src` 下文件和目录必须使用 kebab-case，例如 `tree-view.tsx`、
  `use-toolbar-action-visibility.ts`。
- 职责后缀用点号分隔。当前文件检查允许最多一个职责后缀：`.d`、`.module` 或 `.stories`，再接扩展名。
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
  断点或超时再建一份近义常量。跨 TypeScript / CSS / 用户文案无法直接共享时，必须同步必要的双语
  README 摘要，并按影响核对对应浏览器行为。

## 5. TypeScript 与 React 实现规则

### 5.1 TypeScript

- 导入仅用于类型的符号时使用 `import type`，满足 `verbatimModuleSyntax`。
- 外部输入、IndexedDB 恢复值和 `JSON.parse` 结果先视为 `unknown`，通过类型守卫校验后使用。
- 禁止无说明的 `any`、双重类型断言或用 `as` 掩盖真实类型错误。
- 数组、`Set`、`Map` 和 Store 状态更新保持不可变；不得先修改旧引用再把同一引用交回 React。
- 可重建的派生值使用计算或 selector，不为避免一次计算而重复存入 Store。
- 异步调用必须有明确的等待、取消或错误处理策略。使用 `void` 忽略 Promise 时，Promise 自身必须在
  适配器边界捕获并报告错误。
- 应用与 Node 构建配置尚未启用 `strict`。这不代表允许弱类型，新代码应按 strict-safe 的方式编写，
  应用代码严格模式的整体启用按 `docs/ROADMAP.md` 规划逐步推进。

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
- 性能缓存以真实依赖为边界：Tree 复用未变化的解析结果，CodeMirror 扩展仅在配置变化时重建。
  解析结果按不可变对象图使用；大纲行数使用对象身份的 WeakMap 缓存，不原地修改解析结果，
  不将派生缓存持久化，也不通过强引用长期保留旧文档。验证缓存时同时覆盖数据替换和配置更新。
  标准 JSON 优先使用原生解析，失败后由 JSON5 保留扩展语法与错误行列；性能优化不得缩减语法支持。
- 首屏加载边界：编辑器与设置、主题、快捷键弹窗使用静态导入，随工作区同步加载；
  弹窗首次打开不依赖额外脚本下载，触发器、快捷键订阅和 Modal 外壳保持稳定挂载。
  在工作区就绪后阻断新增脚本下载，验证桌面与窄屏首次打开、关闭、快捷键重开和焦点恢复。
  品牌先显示静态内容，再于浏览器空闲时加载动效；减少动态效果或下载失败时保留静态内容。
  HTML 提供无需应用脚本和外部字体的工作区骨架屏，分栏断点与真实工作区保持 768px 一致；
  Logo 文案使用内嵌 Silkscreen 产品名子集，骨架与真实品牌共用 `.brand-wordmark` 和 `.brand-symbol`
  样式，骨架品牌不执行动画。字体仅覆盖 `DeepBrace JSON`，修改产品名时需要重新生成子集；
  来源为 Google Fonts Silkscreen，许可随站点分发于 `public/licenses/silkscreen.txt`。
  字号在 640px 切换，骨架工具栏在 860px 跟随真实菜单收纳高度变化，验证切换前后字形及位置一致。
  骨架和真实工作区共用 HTML 中的 `.workspace-toolbar`、`.workspace-tabs`、`.workspace-status`
  布局尺寸，保持容器层级和间距一致；纯客户端媒体查询在初始化时读取真实匹配结果，避免先渲染错误断点。
  顶部操作骨架逐项对应真实按钮，包含溢出菜单、文字收缩与 sm 按钮尺寸变化；Vite 从
  `src/lib/layout/toolbar-breakpoints.ts` 生成内联可见性样式，与真实工具栏共用收纳断点，不依赖应用脚本或主 CSS。
  品牌图标保持挂载，不随延迟动效重新入场；文字用静态字形预留尺寸，避免拆字动效推动相邻元素。
  布局回归采集骨架、React 首帧及动效接入过程的元素矩形，覆盖移动端、桌面和断点两侧；
  骨架通过 head 内联脚本同步读取 localStorage 的分栏记录，与工作区共用面板约束和存储 key，
  不等待应用脚本或 IndexedDB；缺失、非法或存储不可用时降级为均分。
  移动端保持上下均分，切回桌面使用保存的比例。
  骨架桌面面板使用与工作区相同的 8px 分隔区及每侧 4px 内边距，非均分比例下也不能发生横向跳动。
  生产主 CSS 由 Vite HTML 后处理改为非阻塞下载，加载状态通过 `data-workspace-styles` 传递；
  `main.tsx` 并行等待样式与持久化恢复，二者都完成才替换骨架，避免无样式工作区闪现。
  样式失败或等待超过 30 秒保留骨架和重试入口；必须在生产构建上验证 CSS 慢加载期间已经发生
  首次内容绘制，以及加载失败后刷新可恢复，不能只在 Vite 开发模式验收。
  装饰占位对辅助技术隐藏且不可交互，保留加载状态和键盘可用的重试入口。Vite 在 HTML head 注入
  无外部依赖的同步明暗脚本，使用 `src/lib/storage/storage-keys.ts` 中的 key 读取 localStorage，并在首次绘制前设置
  `data-theme`；骨架优先使用保存的明暗模式，没有合法值或存储不可用时跟随系统，工作区采用同样默认值。
  骨架背景、面板与品牌的明暗颜色应与工作区一致，验证应用脚本及生产 CSS 慢加载期间不被系统主题覆盖。
  减少动态效果时关闭骨架动画。字体样式异步应用，不改变 hydration 顺序。
  性能对比使用生产构建、相同压缩方式、缓存状态和网络条件；首屏包体统计入口及全部静态依赖，
  不能只看入口 chunk。分别报告首次内容绘制和编辑器就绪，不能用加载提示替代可交互指标。
- 大输入自动解析与启动恢复使用 `src/lib/parse/background-parse.ts` 创建独占 Worker；任务完成、取消、失败或
  超时必须释放资源。按标签和请求身份提交结果，编辑、关闭、重置、撤销重置时取消旧任务；
  不允许失败后回退为主线程同步大解析。`isParsing` 为瞬时状态，不作为持久化恢复来源；它与
  `isDirty` 分开，后台恢复期间不能误清除已持久化的折叠状态。
- 示例选项集中在 `src/lib/parse/sample.ts`；`src/lib/parse/large-sample.ts` 的大数据仅由 Worker 按需生成、序列化并解析，
  不在模块初始化或组件渲染时构造，也不以大型静态 JSON 文件打包。示例生成复用解析任务的标签、
  请求身份与取消边界；成功后原子替换请求标签的输入和结果，失败保留原内容，不持久化生成请求。
- 大文档阈值、文本预览长度与深度上限集中在 `src/lib/parse/large-document.ts`。输入长度至少 262,144 个
  JavaScript 字符、解析节点超过 5,000 个或深度超过 40，任一条件满足即启用树虚拟化。
  `src/lib/tree/tree-rows.ts` 迭代生成当前展开的大纲行，`src/components/tree/virtual-tree.tsx` 使用 TanStack Virtual 只挂载
  视口附近的动态高度行；`src/components/tree/tree-node.tsx` 共享节点内容与交互，小文档仍使用递归树及折叠动画。
  虚拟列表的占位高度和行位移由库同步更新，React 不重复写入这两个样式；避免批处理期间旧高度
  截断末尾定位。Home / End 通过滚动适配器在测量稳定后定位，也作为树形预览的回到顶部 / 底部快捷键；
  用户滚动或卸载可中止恢复。
  原始输入与复制不截断；长值与键名预览上限为 500 字符，树深度上限为 40。
  虚拟行使用节点路径的稳定键，大纲行号按完整子树计算，不使用视口索引或 DOM counter 计数。
  滚动统一通过 `src/lib/storage/tab-scroll.ts` 适配器管理，以节点路径、大纲行号与行内偏移恢复；首次恢复先测量
  锚点行，再应用偏移，字体或换行变化后重新测量，卸载时清理监听与恢复帧。
  派生行、尺寸缓存不持久化。原生选区和浏览器查找无法覆盖未挂载树行，完整内容使用编辑器或复制。
  虚拟化只限制 DOM 数量，不意味着解析对象、展开行模型和尺寸元数据的内存为常数。
  性能验收必须使用真实剪贴板粘贴，并覆盖滚动到末尾、动态行高、折叠、标签切换及刷新定位，
  不以 `fill` 或 Store 更新耗时代替原生粘贴链路。
- 树搜索以节点路径为稳定身份，索引完整解析结果而不是当前已挂载 DOM；JSON Pointer 作为标准机器路径，
  JSONPath 作为用户可读路径，数组下标与特殊对象键必须分别正确转义。搜索条件、当前命中和临时展开祖先
  都是组件瞬时状态，不进入 Zustand 或 IndexedDB；关闭搜索后必须恢复原折叠集合。
  小文档的包含匹配复用当前解析对象在主线程建立轻量索引；大文档由 `tree-search-worker.ts`
  从原始输入独立解析并建立索引，避免索引构建阻塞主线程。同一 Worker 复用
  索引处理后续条件，新请求通过递增身份忽略旧结果，索引与查询分别设置超时；关闭搜索、切换标签或
  内容变化时终止 Worker。搜索定位虚拟节点时先中断滚动恢复，再同步新的节点锚点，避免恢复任务把
  目标位置覆盖回旧滚动位置。匹配高亮必须落在键名或值的实际命中文字上；当前导航项可以保留轻量
  行级定位标识，但普通匹配不得用整行背景代替字符级高亮。

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
  `prepareTabForStorage` 为保持 `JsonTab` 形状会为解析结果与脏标记写入 `null` / `false` 占位，
  hydration 必须重建这些值；设计新 schema 时优先从持久化类型中彻底省略瞬时字段。
- `collapsed` / `touched` 是与已解析内容绑定的节点路径集合，允许跨刷新保留折叠状态及展开动画。
  输入处于 `isDirty` 时，持久化快照必须清空两者，避免自动解析前刷新把旧树状态套到新内容；
  此过程不得修改仍供当前页面旧树渲染使用的集合。

## 6. IndexedDB、布局与滚动持久化

### 6.1 启动与存储边界

- Zustand、分栏布局和滚动缓存必须在首次 React render 前完成 hydration；启动顺序集中在
  `src/main.tsx`，页面组件不得各自竞争恢复状态。
- Zustand persist 必须保持 `skipHydration: true`，避免模块加载时自动恢复与 `main.tsx` 的手动
  hydration 竞争。
- 当前 IndexedDB 保留 `app-state`、`panel-layout`、`tab-scroll` 三个 Object Store，`panel-layout`
  仅用于旧布局迁移，当前布局以 localStorage 为唯一持久化来源。Store 使用
  out-of-line key：`createObjectStore(name)`、`put(value, key)`；record root 不重复保存仅用于定位该
  记录的 primary key。`app-state` 内部的标签 `id` 和 `activeTabId` 属于必要业务关系，应当保留。
- value 使用 IndexedDB structured clone 保存对象、数组、`Set` 等结构。禁止重新退化为整份 JSON
  字符串；只有第三方同步接口明确要求字符串时，才在 adapter 边界转换。
- 修改 Object Store、`keyPath` 或键策略必须提升数据库版本，并明确迁移或清空策略；浏览器验收要
  验证旧数据处理结果，不能只检查全新数据库。
- 写入完成以 transaction 的 `oncomplete` 为准，不能把单个 request 成功当成事务已经提交。
- 同一批记录优先使用一个 transaction。业务正确性依赖先后顺序时，涉及的每个 adapter 都必须
  提供可等待的写入屏障或串行队列，调用方显式等待；不能因为某一个 adapter 有队列，就假定其他
  fire-and-forget 写入也已经完成。
- 每条存储错误路径必须有唯一、可定位的报告责任方，并降级为当前页面内存状态；组件不得各自弹出
  重复错误。当前 app-state hydration 在 adapter 内捕获，而 panel / scroll hydration 会冒泡到
  `main.tsx`，同一次底层失败仍可能产生两类日志，属于下文受控例外。
- 数据库收到 `versionchange` 时关闭连接；升级被其他页面阻塞时必须可诊断，不得永久等待。
- `persistVersion` 是 app-state adapter 的保留字段，业务状态不得使用同名字段。
- `localStorage` 仅保存三个轻量状态：标签新手引导的“不再提示”标识、需要首帧同步读取的
  明暗模式 `colorMode`（仅接受 `light` / `dark`），以及独立的分栏布局。key 集中在纯常量模块
  `src/lib/storage/storage-keys.ts`，浏览器读写通过 `src/lib/storage/storage.ts`；禁止保存标签、输入、滚动或其他偏好。
  明暗模式以 localStorage 为唯一持久化来源，Zustand 的 `isDark` 仅为内存状态与撤销快照；
  切换、重置（浅色）及撤销同步写入，写入失败降级为当前页面状态。新手引导标识仍不参与重置及撤销。
  app-state `persistVersion: 3` 将旧 `isDark` 迁入 localStorage（已有合法值优先），并把旧内置
  Alt+Shift 默认快捷键更新为无修饰键；用户自定义组合保持不变。随后按白名单重写 IndexedDB，
  移除旧字段并保留其他偏好及标签；数据库 Object Store schema 不变。

### 6.2 新增持久化偏好检查表

新增或修改持久化偏好时，必须同时检查：

1. `PreferencesSlice` / `DeepBraceState` 类型。
2. 默认值和 setter / action。
3. `PersistedDeepBraceState`。
4. `partialize` 白名单。
5. hydration merge、非法值校验和降级默认值。
6. `ResetSnapshot`、快照捕获、重置默认值和撤销恢复。
7. IndexedDB schema / version 是否受影响。
8. 浏览器刷新、重置和撤销验收。
9. 顶层能力发生变化时同步双语 README；尚未完成或仍待验收时同步 `docs/ROADMAP.md`。

新增标签字段还必须同步检查 `createDefaultTabs` / `createInitialTab` / `createJsonTab`、
`restoreJsonTab` 和 `prepareTabForStorage`，明确该字段是持久状态还是可重建状态。首次启动、
持久化降级和“重置所有数据”必须复用 `createDefaultTabs`，关闭到最后一个标签时的保护状态由
`createInitialTab` 单独负责。

### 6.3 分栏与滚动

- 分栏布局 adapter 同步更新内存 `Map` 和 localStorage，供 `react-resizable-panels` 和骨架共用。
  hydration 优先读取 localStorage；缺失时从 IndexedDB 迁移，只有写入新来源成功才删除旧记录。
  重置同步清空两处内存及 localStorage，并等待旧 IndexedDB 布局清理；撤销同步恢复内存和 localStorage。
- 桌面分栏拖拽靠近中线 4px 内时以强调色 60% 不透明度显示居中的 90% 高度垂直虚线并吸附为 50/50，离开吸附范围后继续自由拖动；
  吸附后的布局沿用现有 localStorage 持久化。
- 滚动位置使用 `[tabId, area]` 作为记录身份；新增滚动区域时必须定义稳定 `area`、缓存生命周期、
  hydration、清理和 reset / undo 行为。
- 恢复滚动时暂停旧元素写回，等待布局和内容稳定后 clamp 到有效范围；用户主动滚动应中断旧恢复。
- 标签恢复命令仅在实际切换活动标签时冻结旧面板；批量恢复先还原标签，再统一选择活动标签，
  不得依赖批处理中未提交到 DOM 的中间激活状态解除冻结。
- 禁止使用固定等待若干帧的方式假定动画结束。若布局有动画，应检查几何稳定性，并设置最大等待
  时间，防止恢复任务永久占用。
- 标签关闭后的孤立记录清理、撤销关闭和多页面并发策略属于产品行为；变更前先更新规划并明确验收，
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
4. 分栏布局同步写回 localStorage，其余最终状态写回 IndexedDB；对后续步骤、刷新正确性或调用方完成语义有影响的事务必须纳入
   可等待的完成 Promise。

重置 / 撤销调用返回前，内存缓存必须在 React cleanup 和 layout effect 发生前按正确顺序切换。当前
app-state 与滚动 adapter 使用串行队列，重置 / 撤销的完成 Promise 等待 app-state、滚动的最终事务以及
旧布局记录的清理；分栏拖拽和撤销恢复同步写入 localStorage，其余失败、并发和迁移边界继续由
`PLAN-001` 验收。

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
- 快捷键定义集中在 `src/lib/shortcuts/shortcuts.ts`，使用物理 `event.code` 与全部修饰键精确匹配；默认
  不需要修饰键，用户可自定义组合。偏好必须经过校验、结构化持久化，
  并覆盖刷新、重置 / 撤销。
  `ShortcutKbd`、提示文字和 `aria-keyshortcuts` 必须响应同一偏好，禁止硬编码组合。
  当前 React Aria 过滤的 `aria-keyshortcuts` 通过 `useShortcutLabels` 返回的 callback ref
  补到真实元素；验收要检查浏览器 DOM，而不是只检查 JSX 属性。
  面板动作按钮内使用 Kbd 填充样式直接显示完整快捷键组合；复制使用 C，清空当前内容使用
  Backspace（Mac 显示为 ⌫），
  两者沿用统一修饰键偏好。复制命令复用树预览的复制逻辑和反馈，未成功解析时不复制。
- 全局快捷键在 dialog、alertdialog、listbox 和 menu 内暂停；不能以合成按键事件推断能拦截系统保留组合，
  按需用真实键盘确认。编辑器聚焦命令调用现有 EditorView 的 `focus()`，保留输入和选区。
  编辑器内容聚焦时，无修饰键的 Escape 调用现有 `contentDOM.blur()` 退出聚焦，保留输入和选区；
  该局部按键不受全局修饰键偏好影响，输入法组合期间不触发。
  编辑器面板初始 outline 颜色保持透明，仅在包含 CodeMirror 时设置宽度、线型和过渡，
  避免挂载时从默认文字颜色渐变到透明；骨架不得应用聚焦边框。根据 `.cm-focused`
  显示 2px 强调色 outline，向内偏移 2px，聚焦 / 失焦
  使用 180ms 颜色过渡，不能改变布局尺寸；减少动态效果时取消过渡。
  输入光标使用界面强调色、2px 圆角竖线和轻微光晕。
- 无 Ctrl、Alt/Option 或 Cmd/Meta 时，全局快捷键在 input、textarea、select、可编辑内容、
  textbox / searchbox 和 CodeMirror 编辑器内暂停，防止普通输入触发搜索、关闭标签等操作。
  含上述修饰键的组合仍可在编辑器和输入框内使用；搜索输入框中的 Escape 保留关闭行为。
- 跨组件弹层 / 焦点命令通过 `workspace-commands.ts` 瞬时分发，组件使用
  `useWorkspaceCommand` 订阅并清理；不把 DOM、弹层开关或焦点请求写入持久化 Store。
- 树搜索使用统一快捷键切换悬浮搜索面板；打开时聚焦搜索输入框，通过快捷键、Escape 或关闭按钮
  关闭时聚焦树预览容器，避免触发搜索按钮焦点环和 Tooltip。单键或仅 Shift 模式下，搜索输入框
  仅通过 Escape 或关闭按钮关闭，字母键继续作为搜索输入。面板
  不得改变树滚动区域的布局尺寸。搜索面板常驻挂载以完成显隐过渡，关闭时必须禁用焦点与点击，并在
  减少动态效果下取消位移和透明度动画。
- 树搜索面板支持鼠标 / 触控拖拽和方向键移动；拖动过程中使用组件局部状态，结束后才把全局位置偏好
  结构化写入 IndexedDB。面板通过全局浮层挂载，可在整个浏览器视口内移动；恢复的位置必须按当前
  视口尺寸收敛在可见范围，并参与全部数据的重置与撤销。
- 树搜索的范围选择、大小写开关、结果导航和关闭动作作为紧凑后缀集成在同一个 HeroUI SearchField
  内；范围触发器不得再呈现为与输入框割裂的大尺寸胶囊，窄屏下输入与后缀均不得横向溢出。
  导航、关闭与拖拽的自定义 Button 使用 `slot={null}`，避免继承 SearchField 的默认清空动作。
- 新增或修改的非必要动效必须在 `prefers-reduced-motion: reduce` 下关闭或显著简化。
- 新窗口链接必须带 `noopener,noreferrer`。

### 7.3 响应式工具栏

工具栏按屏幕宽度逐项展示，隐藏动作必须同时出现在溢出菜单。当前直显阈值为：

| 动作     | 最小宽度 |
| -------- | -------: |
| GitHub   |    340px |
| 明暗模式 |    480px |
| 设置     |    560px |
| 快捷键   |    600px |
| 主题     |    680px |
| 缩进     |    800px |
| 示例     |    860px |

新增或调整动作时：

- 在 `src/lib/layout/toolbar-breakpoints.ts` 中定义唯一收纳阈值，由 `useToolbarActionVisibility` 和启动骨架共享；
  不在多个组件复制断点。
- 同时实现直显入口与溢出菜单中的等价入口，复用同一 action 和 overlay state。
- 宽度变窄时逐项收纳低优先级动作，尽量保留右侧动作；禁止在单一断点突然隐藏全部工具。
- Logo 与产品名保持 `shrink-0` 且不换行，按钮与 Icon 不得被 Flex 压缩变形。
- 视口结构变化由统一 media query 控制；普通显隐、间距和文字收缩优先使用 Tailwind / CSS。
- 修改断点时覆盖断点前后 1px 的浏览器验收；顶层响应式规则变化时同步双语 README。

当前 `<768px` 使用上下工作区，`>=768px` 使用可拖拽左右分栏；单个面板内容宽度不超过 520px 时，
面板动作隐藏文字，保留图标、按钮内快捷键、可访问名称及 Tooltip。动作空间不足时换行，
不得产生横向溢出，也不能挤掉大文档说明。
Logo 右侧「大文档优化」亮点在 `>=1280px` 显示，悬停或键盘聚焦展示后台解析、按需渲染和完整
复制说明；既有其他亮点保持 `>=1536px` 显示。亮点优先让位于产品名与工具，不改变动作收纳阈值。
亮点统一使用同等强调的胶囊标签、小图标与间距，每项支持悬停或键盘聚焦查看说明；标签样式与文案
集中维护，不为各项添加独立状态或重复的 Tooltip 实现。

### 7.4 样式边界

- 普通组件布局和状态样式优先 Tailwind utilities。
- `src/index.css` 只维护根主题和字体、HeroUI / CodeMirror 必要覆盖、共享结构、全局滚动条、动画、
  伪元素、container query 等不适合普通 utility 的规则。
- 动态主题优先 `data-*` 和 CSS 变量；不得在多个 JSX 文件复制成组颜色 class。
- 全局滚动条规则只维护一份，Popover / Dropdown 不创建另一套外观。
- 动态几何值可以使用行内 style；固定视觉值应使用 Tailwind 或 CSS 变量。
- 新增语法主题必须同步 CodeMirror token、Tree CSS token、亮暗两套表现、选项列表和验证用例。
- 代码字体、粗体和斜体仅影响代码内容，不改变品牌、工具栏及菜单的字形；粗体和斜体独立存为
  `isCodeBold` / `isCodeItalic`，默认关闭，按偏好检查表覆盖刷新、重置与撤销。CodeMirror 和虚拟树
  在字体、字重或字形变化后重新测量，不能沿用旧的换行高度缓存。
  Web 字体保留异步样式与系统等宽回退；提供原生字形的字体加载 400 / 700 和对应斜体，
  Fira Code、Inconsolata、Noto Sans Mono 未提供的斜体由浏览器合成，不阻塞或禁用开关。
- 不按文件行数机械拆分。只有出现可独立验证、可复用或变化原因不同的第二职责时才拆分。

`src/components/react-bits/` 是 vendor 例外并被 Prettier 忽略。修改它时必须说明原因，尽量保留
上游结构；产品状态和业务规则不得放入该目录。

## 8. 验证

验证遵循“最小充分证据”：根据改动风险和受影响路径选择静态检查、构建或真实浏览器验收，失败后先
定位相关模块，只有证据表明影响跨域时才扩大检查范围。

### 8.1 浏览器验收

涉及以下能力时必须在真实浏览器验证实际行为：

- CodeMirror 输入、selection、换行、编辑器滚动与聚焦。
- Tree 折叠、行号、复制、嵌套 `Parse`、超长字符串 Popover 和滚动条。
- Modal、AlertDialog、Dropdown、Select、Toast 和键盘焦点。
- 工具栏各关键断点、Logo / Icon 收缩、移动 / 桌面工作区切换。
- IndexedDB 刷新恢复、分栏、双区滚动、重置、8 秒撤销及撤销后再次刷新。

真实浏览器验收按需手工执行：

- 按用户可见入口完成操作；先观察 hydration、动画和写入后的状态，再验证刷新恢复。
- 明确初始存储状态，避免不同验收场景的数据相互影响。
- 桌面与移动断点使用明确的视口尺寸；新增响应式规则时覆盖断点前后 1px。
- console warning / error、page error 和框架错误层属于失败，只有明确验证并记录的预期错误可以过滤。

浏览器验收至少记录：初始状态、操作步骤、预期、实际结果、视口宽度，以及是否刷新页面。记录放在
当前任务 / MR 的交付说明或对应规划项的验收证据中，不另建进展日志。
`docs/ROADMAP.md` 的 `PLAN-006` 计划建立浏览器手工验收矩阵；按变更范围执行并记录验收。

### 8.2 按风险选择验证

| 变更类型                         | 默认验证                                                                    |
| -------------------------------- | --------------------------------------------------------------------------- |
| 仅文档                           | 检查受影响文档的格式、链接和内容一致性；`git diff --check`                  |
| 局部纯逻辑、类型或 Store action  | 受影响文件的格式 / 静态检查；必要时 TypeScript 构建                         |
| UI、交互、响应式或浏览器 API     | 相关行为的手工浏览器验收和必要视口；受影响文件的格式 / 静态检查             |
| 持久化、启动、构建配置或依赖边界 | `pnpm build`；受影响文件的格式 / 静态检查；涉及浏览器行为时手工验收         |
| 跨领域重构、发布候选或明确要求   | `pnpm lint`、`pnpm build`、`git diff --check`，并补充功能范围内的浏览器验收 |

- 工作树中存在与当前任务无关的代码改动，不自动扩大本次验证范围；最终说明当前任务实际执行了哪些
  检查、哪些未执行及原因。
- 静态检查和构建通过不代表浏览器交互已验证；根据变更范围补充验收。
- 生产构建出现包体警告时必须如实记录，不能通过调高阈值伪装改善。

## 9. 当前自动检查边界

| 检查                  | 当前实际覆盖                                                              | 仍需人工审查                                           |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ |
| `pnpm lint:filenames` | `src` 下目录和文件 kebab-case、允许的单一职责后缀                         | 根目录、`docs`、语义是否准确                           |
| `pnpm lint:style`     | `I` 类型前缀、PascalCase 函数声明、部分 Boolean、部分事件回调、指定短变量 | 所有组件是否为 `const`、复杂推断 Boolean、完整语义命名 |
| `oxlint`              | 当前默认 correctness 扫描；warning 不阻断命令                             | React、Hooks、a11y 等尚未显式启用或提升为 error 的规则 |
| `prettier --check .`  | Prettier 支持且未忽略文件的格式和 import 顺序                             | 架构、命名语义、vendor 目录                            |
| `pnpm build`          | TypeScript project build 与 Vite 生产构建                                 | 应用配置尚未启用 `strict`、浏览器运行行为、性能预算    |

不得把工具没有报错表述为“全部规范已经自动验证”。交付时区分静态检查、构建和浏览器验收的实际证据。

### 9.1 当前受控例外

以下是已知现状，不是新代码可以复制的通用模式：

- `src/components/react-bits/` 保持上游格式并仅被 Prettier 忽略；它仍接受文件名、style、Oxlint 和
  TypeScript 检查。除必要的兼容修复外不扩展业务代码。
- CodeMirror 与 Tree 使用不同渲染体系，语法主题 token 当前分别存在 TypeScript 和 CSS 中；修改
  主题时必须成对验证，后续再评估生成式单一来源。
- `src/lib` 当前按职责分目录，但仍包含纯逻辑、adapter、Hook 和命令服务；新增代码仍按依赖方向隔离。
- `src/store/tabs/tab-slice.ts` 仍编排少量 Toast 和滚动副作用；不得继续堆叠新的跨层流程，复杂用户命令
  应放入 `*-actions.ts`。
- 设置 Modal 当前仍用 Footer 承载即时生效的重置入口，确认文案也与 8 秒撤销行为冲突；不得复制
  这一写法，统一调整由 `PLAN-002` 跟踪。
- app-state 与滚动持久化已有显式串行队列，reset / undo 的完成 Promise 也等待旧分栏记录的清理；
  分栏拖拽和撤销恢复同步写入 localStorage。触碰该链路时必须按 6.4 节保持完成语义，其余边界
  由 `PLAN-001` 验收。
- app-state hydration 与 panel / scroll hydration 当前分属 adapter 和 `main.tsx` 两条报告路径，
  IndexedDB 整体不可用时可能重复 warning；调整失败处理时应收敛为一次有上下文的启动报告。
- `ResetSnapshot` 当前直接引用滚动 adapter 类型，并用分栏库的字符串作为布局快照；继续新增基础设施
  状态前应先建立 Store 自有 DTO，避免扩大耦合。
- 少量滚动捕获调用依赖“同步更新内存、后台落库”语义但未用 `void` 明示返回 Promise；修改调用点时
  必须明确等待或显式忽略，并处理最终 rejection。
- 响应式阈值目前分布于 TypeScript media query、Tailwind 和 CSS container query；修改阈值时先
  搜索该阈值及对应可见性定义的引用，并核对受影响断点两侧的浏览器行为；只有证据显示存在更多来源时才扩大
  搜索范围。顶层规则变化时同时更新双语 README。
- `src/components/tree/tree-view.tsx`、`src/lib/storage/tab-scroll.ts` 和 `src/index.css` 体量较大，但各自仍有集中职责；不能只因行数拆分，
  也不能把新的无关职责继续塞入。
- Tree 单节点整行目前依赖点击交互；新改动不得复制该缺口，整体收敛由 `CANDIDATE-03` 进入规划后处理。

## 10. 文档联动

代码变更完成前按下表检查文档：

| 变更                                                 | 必须同步                                                 |
| ---------------------------------------------------- | -------------------------------------------------------- |
| 新增、修改或移除用户可见行为                         | 对应浏览器验收                                           |
| 默认值、入口、快捷键、持久化、响应式、重置或降级变化 | 按影响验收；属于顶层能力时同步两版 README                |
| 顶层能力、技术栈、脚本、启动 / 验证命令变化          | 两版 README，章节结构和内容保持一致                      |
| 未实现、进行中或待验收工作                           | `docs/ROADMAP.md` 中对应稳定规划 ID                      |
| 架构、编码、UI 或质量规则变化                        | `AGENTS.md` 的硬约束（如受影响）和 `docs/DEVELOPMENT.md` |
| 专项问题的证据或调查过程                             | `docs/`；同时确保当前状态没有与源码和浏览器行为冲突      |

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
- 不在前端代码、日志或文档中提交 token、Cookie、真实用户数据和其他秘密。
- Commit message 应简洁说明用户结果或技术边界；功能、重构和文档尽量拆成可独立审查的提交，但
  不能把必须同步的代码与文档拆散到不可用状态。

### 11.1 工作流权限边界

在不覆盖用户既有改动、不访问任务外敏感数据且操作可恢复的前提下，按下表推进：

| 动作                                                                 | 默认处理                             |
| -------------------------------------------------------------------- | ------------------------------------ |
| 读取相关文件 / Git 状态、针对性搜索、创建本地任务分支                | 直接执行                             |
| 修改任务内源码 / 文档、格式化受影响文件、删除本任务临时文件          | 直接执行                             |
| 运行相关静态检查、构建、本地服务、浏览器验收，并在失败后继续修复复验 | 直接执行                             |
| 暂存或创建本地提交                                                   | 当前请求包含提交或交付时执行         |
| 推送、创建 / 合并 PR、部署、发送外部消息                             | 当前请求明确包含或用户另行授权后执行 |
| 绕过 Hook、强制推送、覆盖远端、删除非本任务数据或其他难恢复操作      | 对确切目标、影响和恢复方式单独确认   |

用户已经明确授权具体交付动作后，不追加形式化确认。遇到失败先在已授权范围内诊断并尝试安全替代方案；
只有继续推进需要扩大范围、改变数据或执行未授权外部动作时才暂停。

## 12. 完成定义

一项开发工作满足以下条件即可称为“实现完成”；提交、推送、PR、合并和部署是独立的交付状态，
除非用户把它们纳入当前任务，否则不作为实现完成的前置条件：

- [ ] 请求的结果已经实现，可通过用户行为、接口结果或其他直接证据验证。
- [ ] 改动保持在授权范围内，最终 diff 只包含预期文件，没有秘密、调试代码、生成物或无关格式化。
- [ ] 实现遵守受影响领域的架构、类型、状态、生命周期和数据安全约束。
- [ ] 已运行与风险相称的最小充分检查；相关检查通过，未运行的全量检查及原因已如实说明。
- [ ] 用户可见交互已覆盖受影响的键盘、焦点、响应式、刷新或降级路径；未涉及的维度无需重复验收。
- [ ] 必要验证说明和文档已随行为或规则更新；没有变化的 README 或规划不做机械修改。
- [ ] 已报告已知警告、剩余风险、阻塞和当前交付状态，不把局部检查通过表述为全库无问题。

交付状态使用以下含义，报告时只陈述已有证据的状态：

| 状态         | 含义                                       |
| ------------ | ------------------------------------------ |
| 实现完成     | 满足上述完成条件，工作区中的预期结果可验证 |
| 已提交       | 预期改动已进入本地 Git commit              |
| 已推送       | 对应 commit 已存在于指定远端分支           |
| PR 已创建    | 已创建指向明确目标分支的 PR                |
| 已合并       | PR 或 commit 已进入目标分支                |
| 已部署       | 目标环境已经接收对应版本                   |
| 生产验证通过 | 在目标生产地址确认对应版本及关键用户行为   |

不得用前一状态推断后一状态；例如构建通过不等于已部署，PR 可合并不等于已合并，部署成功也不等于生产行为
已经验收。
