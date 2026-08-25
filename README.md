# DeepBrace JSON

深入解析每一层 JSON。

DeepBrace JSON 是一个本地运行的 JSON / JSON5 解析工作台：左侧编辑和转换原始内容，右侧以可折叠树形结构实时预览。遇到值中嵌套的 JSON 对象或数组时，可以一键解析到独立标签继续查看。

## 核心能力

- JSON / JSON5 自动解析与语法高亮
- 格式化、压缩、转义与反转义
- 可折叠 TreeView、7 套同步语法配色和自定义缩进
- 嵌套 JSON 子节点一键解析
- 多标签隔离与滚动位置持久化
- 完全在浏览器本地处理输入内容

## 快捷键

可以通过 Header 右侧的键盘按钮随时查看完整快捷键；所有组合键均使用 HeroUI `Kbd` 展示。

| 操作 | 快捷键 |
| --- | --- |
| 格式化 / 压缩 | `Shift+Alt+F` / `Shift+Alt+M` |
| 转义 / 反转义 | `Shift+Alt+E` / `Shift+Alt+U` |
| 新建 / 关闭标签 | `Shift+Alt+N` / `Shift+Alt+W` |
| 上一个 / 下一个标签 | `Shift+Alt+[` / `Shift+Alt+]` |
| 切换换行 / 折叠展开 | `Shift+Alt+L` / `Shift+Alt+X` |

## 本地启动

```bash
pnpm install
pnpm dev
```

生产构建与代码检查：

```bash
pnpm build
pnpm lint
```
