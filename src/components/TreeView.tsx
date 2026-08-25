import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Button } from '@heroui/react'
import { ArrowLeftRight, Braces, Check, ChevronRight, Copy, Eye, FoldVertical, OctagonAlert, Trash2, UnfoldVertical, WrapText } from 'lucide-react'
import { serializeForCopy, TREE_INDENT_PIXEL_RATIO } from '../lib/indent'
import { isStrictJson, type NodePath, pathKey } from '../lib/parse'
import { getAriaShortcut } from '../lib/shortcuts'
import { bindTreeTabScrollPosition } from '../lib/tab-scroll'
import { toast } from '../lib/toast'
import { selectActiveTab, useStore } from '../store/useStore'
import { Tip } from './Tip'
import { ShortcutHint } from './shortcut-hint'
import { TreeActionButton } from './tree-action-button'
import { TreeCopyButton } from './tree-copy-button'

const PUNCT = 'tree-token-punctuation'

/* ---------- 叶子值：类型语义色 ---------- */

function LeafValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="tree-token-null italic">null</span>
  }
  switch (typeof value) {
    case 'string': {
      const s = value as string
      // 转义显示：内嵌引号、换行等以 JSON 形式可见
      const escaped = JSON.stringify(s).slice(1, -1)
      const display = escaped.length > 120 ? `${escaped.slice(0, 120)}…` : escaped
      const body = (
        <span className="tree-token-string break-all">"{display}"</span>
      )
      if (escaped.length <= 120) return body
      return (
        <Tip label={<span className="block max-w-md break-all">{escaped}</span>}>{body}</Tip>
      )
    }
    case 'number':
      return <span className="tree-token-number">{String(value)}</span>
    case 'boolean':
      return <span className="tree-token-boolean">{String(value)}</span>
    default:
      return <span className="text-foreground/60">{String(value)}</span>
  }
}

/* ---------- key 标签：属性名 / 数组索引 ---------- */

function KeyLabel({ label }: { label: string }) {
  return <span className="tree-token-key shrink-0">"{label}"</span>
}

/** 尾逗号(非末位条目),呈现 JSON 文本形态 */
const Comma = () => <span className={PUNCT}>,</span>

type IParseStringButtonProps = {
  value: string
  title: string
}

const ParseStringButton = ({ value, title }: IParseStringButtonProps) => {
  const handleParse = () => useStore.getState().openTab(value, title)

  return (
    <TreeActionButton onClick={handleParse}>
      Parse
      <Braces size={10} />
    </TreeActionButton>
  )
}

/* ---------- 树节点（递归） ---------- */

type ITreeNodeProps = {
  label: string | null
  value: unknown
  path: NodePath
  collapsed: Set<string>
  touched: Set<string>
  /** 本条目之后还有兄弟条目时显示尾逗号 */
  comma?: boolean
  onToggle: (key: string) => void
  /** 嵌套深度(根 = 0),用于行盒外扩为整行 */
  depth?: number
  /** 每层内容缩进像素值,与 tree-body 的 --tree-indent-size 同源 */
  indent?: number
}

/** 行盒外扩为整行:负 margin 抵消 depth 层缩进、padding 原位补回内容位置,hover 背景即整行。
    每层缩进 = ml7 + pl12 + 竖线边框1 + 内容缩进;
    闭合括号行位于 tree-children-inner 内、未穿过内容缩进,比内容行少补一个 indent。
    像素值在 JS 侧算好,内联样式只保留最简 calc,避免跨内核兼容差异。 */
const fullRowStyle = (
  depth: number,
  indentPx: number,
  closeRow = false,
): CSSProperties | undefined => {
  if (depth === 0) return undefined
  const shift = depth * (20 + indentPx) - (closeRow ? indentPx : 0)
  return {
    marginLeft: `${-shift}px`,
    paddingLeft: `calc(3.5ch + ${shift}px)`,
  }
}

export function TreeNode({
  label,
  value,
  path,
  collapsed,
  touched,
  comma,
  onToggle,
  depth = 0,
  indent = 4,
}: ITreeNodeProps) {
  const isArray = Array.isArray(value)
  const isObject = !isArray && value !== null && typeof value === 'object'

  if (!isArray && !isObject) {
    const embeddedJsonTitle = label ?? (
      typeof path.at(-1) === 'number' ? `数组项 ${Number(path.at(-1)) + 1}` : '嵌套 JSON'
    )
    const canParse = typeof value === 'string' && isStrictJson(value)
    return (
      <div
        style={fullRowStyle(depth, indent)}
        className="tree-line group flex items-baseline gap-1.5 rounded px-0.5 font-mono text-[13px] leading-6 hover:bg-foreground/5"
      >
        <span className="w-4 shrink-0" />
        {label !== null && (
          <>
            <KeyLabel label={label} />
            <span className={`shrink-0 ${PUNCT}`}>:</span>
          </>
        )}
        {canParse && <ParseStringButton value={value} title={embeddedJsonTitle} />}
        <LeafValue value={value} />
        {comma && <Comma />}
        <TreeCopyButton value={value} />
      </div>
    )
  }

  const entries: [string | number, unknown][] = isArray
    ? (value as unknown[]).map((v, i) => [i, v])
    : Object.entries(value as Record<string, unknown>)
  const openB = isArray ? '[' : '{'
  const closeB = isArray ? ']' : '}'

  if (entries.length === 0) {
    return (
      <div
        style={fullRowStyle(depth, indent)}
        className="tree-line flex items-baseline gap-1.5 px-0.5 font-mono text-[13px] leading-6"
      >
        <span className="w-4 shrink-0" />
        {label !== null && (
          <>
            <KeyLabel label={label} />
            <span className={PUNCT}>:</span>
          </>
        )}
        <span className={PUNCT}>
          {openB}
          {closeB}
        </span>
        {comma && <Comma />}
      </div>
    )
  }

  const key = pathKey(path)
  const open = !collapsed.has(key)
  const linesCount = useMemo(() => countLines(value), [value])
  const summary = isArray
    ? `${entries.length} 项`
    : `{ ${entries
        .slice(0, 3)
        .map(([k]) => k)
        .join(', ')}${entries.length > 3 ? ', …' : ''} }`

  const toggleRow = () => {
    // 拖选文本时的 click 不是折叠意图
    if (window.getSelection()?.toString()) return
    onToggle(key)
  }

  return (
    <div className="font-mono text-[13px] leading-6">
      <div
        style={fullRowStyle(depth, indent)}
        className="tree-line tree-line--toggle group flex items-baseline gap-1.5 rounded px-0.5 hover:bg-foreground/5"
        onClick={toggleRow}
      >
        {/* 箭头绝对定位固定在根节点箭头列(不随缩进漂移),行内 w-4 占位维持内容对齐 */}
        <span className="tree-chevron grid size-4 self-center place-items-center text-foreground/40">
          <ChevronRight
            size={12}
            className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
          />
        </span>
        <span className="w-4 shrink-0" />
        {label !== null && (
          <>
            <KeyLabel label={label} />
            <span className={PUNCT}>:</span>
          </>
        )}
        <span className={PUNCT}>{openB}</span>
        {!open && (
          <>
            <span className="truncate text-left text-foreground/45">{summary}</span>
            <span className={PUNCT}>{closeB}</span>
            {comma && <Comma />}
          </>
        )}
        <TreeCopyButton value={value} />
      </div>
      {/* 未挂载的折叠子树:counter 占位补足行数,保证其后行号与展开时一致 */}
      {!open && !touched.has(key) && (
        <span
          className="tree-line-holder"
          style={{ counterIncrement: `treeline ${linesCount - 1}` }}
        />
      )}
      {/* 展开过的子树保留 DOM 由 grid 0fr→1fr 做折叠动画;从未展开的保持懒渲染 */}
      {(open || touched.has(key)) && (
        <TreeChildren open={open} comma={comma} closeB={closeB} depth={depth + 1} indent={indent}>
          {entries.map(([k, v], i) => (
            <TreeNode
              key={String(k)}
              label={isArray ? null : String(k)}
              value={v}
              path={[...path, k]}
              collapsed={collapsed}
              touched={touched}
              comma={i < entries.length - 1}
              onToggle={onToggle}
              depth={depth + 1}
              indent={indent}
            />
          ))}
        </TreeChildren>
      )}
    </div>
  )
}

/* ---------- 子树行数(用于折叠占位补号) ---------- */

/** 该值展开后占的行数:容器=头+子孙+闭合,叶子=1,空容器=1 */
function countLines(v: unknown): number {
  if (Array.isArray(v)) {
    return v.length === 0 ? 1 : 2 + v.reduce<number>((s, i) => s + countLines(i), 0)
  }
  if (v && typeof v === 'object') {
    const vals = Object.values(v as Record<string, unknown>)
    return vals.length === 0 ? 1 : 2 + vals.reduce<number>((s, i) => s + countLines(i), 0)
  }
  return 1
}

/* ---------- 子树容器:展开/收起动画 ---------- */

function TreeChildren({
  open,
  comma,
  closeB,
  depth,
  indent,
  children,
}: {
  open: boolean
  comma?: boolean
  closeB: string
  depth: number
  indent: number
  children: ReactNode
}) {
  // 首次挂载直接呈现最终状态；保留 DOM 后的开闭变化继续使用 grid 过渡。
  const [entered, setEntered] = useState(open)
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    const frame = requestAnimationFrame(() => setEntered(open))
    return () => cancelAnimationFrame(frame)
  }, [open])
  // 收起后保留 DOM(grid 0fr):行继续占 counter,后续行号保持原号不重排
  return (
    <div
      className="tree-children ml-[7px] pl-3"
      data-expanded={open}
      data-open={entered}
    >
      <div className="tree-children-inner border-l border-transparent">
        <div className="tree-children-content">{children}</div>
        <div
          style={fullRowStyle(depth, indent, true)}
          className={`tree-line ${PUNCT} rounded px-0.5 hover:bg-foreground/5`}
        >
          {closeB}
          {comma && <Comma />}
        </div>
      </div>
    </div>
  )
}

/* ---------- 面板头部 / 各状态面板 ---------- */

function PaneHeader({ title, extra }: { title: string; extra?: ReactNode }) {
  return (
    <div className="flex min-h-10 shrink-0 items-center gap-2 px-4 py-1 text-xs text-foreground/55">
      <Eye size={13} />
      <span className="font-medium">{title}</span>
      <div className="panel-header-actions ml-auto flex items-center gap-0.5">{extra}</div>
    </div>
  )
}

export function TreeView() {
  const activeTab = useStore(selectActiveTab)
  const result = activeTab.result
  const data = result?.ok ? result.data : null
  const stats = result?.ok ? result.stats : null
  const { collapsed, touched, wrap } = activeTab
  const indentSize = useStore(s => s.indentSize)
  const treeTheme = useStore(s => s.treeTheme)
  const clear = useStore(s => s.clear)
  const toggleWrap = useStore(s => s.toggleWrap)
  const onToggle = useStore(s => s.toggleCollapse)
  const onExpandAll = useStore(s => s.expandAll)
  const onCollapseAll = useStore(s => s.collapseAll)
  const [copied, setCopied] = useState(false)
  const treeScrollRef = useRef<HTMLDivElement>(null)
  const treeStyle = {
    '--tree-indent-size': `${indentSize * TREE_INDENT_PIXEL_RATIO}px`,
  } as CSSProperties

  useLayoutEffect(() => {
    const element = treeScrollRef.current
    return element
      ? bindTreeTabScrollPosition(activeTab.id, element)
      : undefined
  }, [activeTab.id])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(serializeForCopy(data, indentSize))
      setCopied(true)
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* 剪贴板不可用时静默 */
    }
  }

  if (!result?.ok || !stats) return null

  return (
    <section className="pane-responsive-actions flex h-full min-h-0 flex-col">
      <PaneHeader
        title="树形预览"
        extra={
          <>
            <Tip label={copied ? '已复制' : '复制内容'}>
              <Button size="sm" variant="ghost" onPress={copy}>
                <span className="relative inline-grid place-items-center">
                  <Copy
                    size={14}
                    className={`col-start-1 row-start-1 transition-all duration-200 ${!copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
                  />
                  <Check
                    size={14}
                    className={`col-start-1 row-start-1 text-emerald-500 transition-all duration-200 ${copied ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`}
                  />
                </span>
                <span className="pane-action-label">{copied ? '已复制' : '复制'}</span>
              </Button>
            </Tip>
            <Tip label="清空">
              <Button size="sm" variant="ghost" onPress={clear}>
                <Trash2 size={14} />
                <span className="pane-action-label">清空</span>
              </Button>
            </Tip>
            <Tip
              ariaKeyShortcuts={getAriaShortcut('toggleWrap')}
              label={
                <ShortcutHint shortcut="toggleWrap">
                  {wrap ? '不换行(左右滚动)' : '自动换行'}
                </ShortcutHint>
              }
            >
              <Button
                size="sm"
                variant="ghost"
                aria-keyshortcuts={getAriaShortcut('toggleWrap')}
                onPress={toggleWrap}
              >
                <span className="relative inline-grid place-items-center">
                  <WrapText
                    size={14}
                    className={`col-start-1 row-start-1 transition-all duration-200 ${wrap ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'}`}
                  />
                  <ArrowLeftRight
                    size={14}
                    className={`col-start-1 row-start-1 transition-all duration-200 ${!wrap ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`}
                  />
                </span>
                <span className="pane-action-label">{wrap ? '换行' : '不换行'}</span>
              </Button>
            </Tip>
            <Tip
              ariaKeyShortcuts={getAriaShortcut('toggleCollapse')}
              label={
                <ShortcutHint shortcut="toggleCollapse">
                  {collapsed.size > 0 ? '展开全部' : '折叠全部'}
                </ShortcutHint>
              }
            >
              <Button
                size="sm"
                variant="ghost"
                aria-keyshortcuts={getAriaShortcut('toggleCollapse')}
                onPress={collapsed.size > 0 ? onExpandAll : onCollapseAll}
              >
                <span className="relative inline-grid place-items-center">
                  <UnfoldVertical
                    size={14}
                    className={`col-start-1 row-start-1 transition-all duration-200 ${collapsed.size > 0 ? 'rotate-0 opacity-100' : 'rotate-180 opacity-0'}`}
                  />
                  <FoldVertical
                    size={14}
                    className={`col-start-1 row-start-1 transition-all duration-200 ${collapsed.size === 0 ? 'rotate-0 opacity-100' : '-rotate-180 opacity-0'}`}
                  />
                </span>
                <span className="pane-action-label">
                  {collapsed.size > 0 ? '展开' : '折叠'}
                </span>
              </Button>
            </Tip>
          </>
        }
      />
      <div
        ref={treeScrollRef}
        className={`tree-body tree-scroll min-h-0 flex-1 overflow-auto px-4 ${wrap ? 'tree-wrap' : 'tree-nowrap'}`}
        data-tree-theme={treeTheme}
        style={treeStyle}
      >
        <TreeNode
          label={null}
          value={data}
          path={[]}
          collapsed={collapsed}
          touched={touched}
          onToggle={onToggle}
          indent={indentSize * TREE_INDENT_PIXEL_RATIO}
        />
      </div>
    </section>
  )
}

export function EmptyPane({ hint }: { hint: string }) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <PaneHeader title="树形预览" />
      <div className="grid flex-1 place-items-center">
        <div className="flex flex-col items-center gap-2 text-foreground/35">
          <Eye size={22} />
          <p className="text-xs">{hint}</p>
        </div>
      </div>
    </section>
  )
}

export function ErrorPane({
  message,
  line,
  column,
}: {
  message: string
  line?: number
  column?: number
}) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <PaneHeader title="树形预览" />
      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-xl bg-red-500/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-red-500">
            <OctagonAlert size={15} />
            解析失败
          </div>
          <p className="mt-2 break-all font-mono text-xs leading-5 text-red-500/90">{message}</p>
          {line !== undefined && column !== undefined && (
            <p className="mt-2 text-xs text-foreground/60">
              位置：第 {line} 行 · 第 {column} 列
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
