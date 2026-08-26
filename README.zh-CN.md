# DeepBrace JSON

[English](README.md) | **简体中文**

深入解析每一层 JSON 的解析工作台——左侧编辑与转换原始内容,右侧实时生成可折叠的树形预览。

**在线使用:** [json.blueblog.me](https://json.blueblog.me/)

## 为什么需要 DeepBrace JSON

大多数 JSON 工具只看第一层。当值本身还嵌套着 JSON 对象或数组时——日志、接口响应、字符串化的 payload 里很常见——DeepBrace JSON 可以把它一键解析到独立标签,继续往深处看。

## 核心能力

- **JSON / JSON5 解析** + 语法高亮——注释、无引号 key、单引号、尾逗号、十六进制数字全都支持
- **内容转换**:格式化、压缩、转义与反转义(可反复点击,层层叠加或逐层剥开)
- **可折叠树形预览**:大纲式稳定行号、整行 hover、逐行复制
- **嵌套 JSON 提取**:能解析为对象/数组的字符串值提供一键 `Parse`,在新标签中打开
- **多标签工作区**:滚动位置与状态按标签持久化
- **一键重置**:设置中的「重置全部数据」经二次确认后恢复出厂状态(示例标签页 + 默认偏好 + 滚动与分栏布局);误触可在 8 秒内通过 Toast 撤销,完整还原重置前状态
- **7 套同步语法配色**(默认 / Dracula / Monokai / One Dark / Nord / Solarized / Tokyo Night),均含亮暗两套
- **完全本地处理**——输入内容不会离开浏览器

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

生产构建与代码检查:

```bash
pnpm build
pnpm lint
pnpm format
```

`pnpm lint` 依次校验文件命名、代码命名规范、oxlint 与 Prettier 格式;`pnpm format` 一键格式化。

## 技术栈

React 19 · Vite 8 · HeroUI v3 · Tailwind CSS v4 · zustand · CodeMirror 6

## 代码规范

- `src` 内文件和目录统一使用 kebab-case,例如 `tree-view.tsx`、`use-store.ts`。
- React 组件和类型等导出使用 PascalCase,Hook、函数和变量使用 camelCase。
- React 组件声明统一使用 `const Component = () =>`,默认导出在声明后单独书写。
- Props、Options 等类型直接使用 PascalCase,不添加 `I` 前缀。
- Boolean 标识符使用 `is`、`has`、`can`、`should`、`does` 等语义前缀。
- 组件内事件处理函数使用 `handleXxx`,回调 Props 使用 `onXxx`。
- 避免 `s`、`v`、`cls`、`len` 等含义不清的缩写,使用完整语义名称。
- 测试、类型声明等职责后缀使用点号分隔,例如 `tree-view.test.tsx`、`vite-env.d.ts`。
- 代码格式化统一由 Prettier 处理(分号、单引号、100 列、import 排序),`pnpm format` 一键执行。
- `pnpm lint` 依次校验文件命名、命名规范、oxlint 与 Prettier 格式。
