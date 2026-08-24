import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button, toast } from '@heroui/react'
import { Check, ChevronRight, Copy, Eye, FoldVertical, OctagonAlert, Trash2, UnfoldVertical, WrapText, ArrowLeftRight } from 'lucide-react'
import { type NodePath, pathKey } from '../lib/parse'
import { useStore } from '../store/useStore'
import { Tip } from './Tip'

const PUNCT = 'text-foreground/40'

/* ---------- 叶子值：类型语义色 ---------- */

function LeafValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="italic text-zinc-500 dark:text-zinc-400">null</span>
  }
  switch (typeof value) {
    case 'string': {
      const s = value as string
      // 转义显示：内嵌引号、换行等以 JSON 形式可见
      const escaped = JSON.stringify(s).slice(1, -1)
      const display = escaped.length > 120 ? `${escaped.slice(0, 120)}…` : escaped
      const body = (
        <span className="break-all text-emerald-700 dark:text-emerald-300">"{display}"</span>
      )
      if (escaped.length <= 120) return body
      return (
        <Tip label={<span className="block max-w-md break-all">{escaped}</span>}>{body}</Tip>
      )
    }
    case 'number':
      return <span className="text-amber-700 dark:text-amber-300">{String(value)}</span>
    case 'boolean':
      return <span className="text-violet-700 dark:text-violet-300">{String(value)}</span>
    default:
      return <span className="text-foreground/60">{String(value)}</span>
  }
}

/* ---------- key 标签：属性名 / 数组索引 ---------- */

function KeyLabel({ label }: { label: string }) {
  return <span className="shrink-0 text-sky-700 dark:text-sky-300">"{label}"</span>
}

/** 尾逗号(非末位条目),呈现 JSON 文本形态 */
const Comma = () => <span className={PUNCT}>,</span>

/* ---------- 行内复制按钮(hover 显示) ---------- */

function CopyValueButton({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false)
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(typeof value === 'string' ? '已复制值' : '已复制节点')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* 剪贴板不可用时静默 */
    }
  }
  return (
    <button
      type="button"
      aria-label="复制"
      className="ml-1.5 inline-grid size-5 shrink-0 translate-y-[3px] cursor-pointer place-items-center rounded text-foreground/35 opacity-0 transition-all hover:text-foreground group-hover:opacity-100"
      onClick={copy}
    >
      <span className="relative col-start-1 row-start-1 inline-grid place-items-center">
        <Copy
          size={11}
          className={`col-start-1 row-start-1 transition-all duration-200 ${!copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
        />
        <Check
          size={11}
          className={`col-start-1 row-start-1 text-emerald-500 transition-all duration-200 ${copied ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`}
        />
      </span>
    </button>
  )
}

/* ---------- 树节点（递归） ---------- */

interface TreeNodeProps {
  label: string | null
  value: unknown
  path: NodePath
  collapsed: Set<string>
  touched: Set<string>
  /** 本条目之后还有兄弟条目时显示尾逗号 */
  comma?: boolean
  onToggle: (key: string) => void
}

export function TreeNode({
  label,
  value,
  path,
  collapsed,
  touched,
  comma,
  onToggle,
}: TreeNodeProps) {
  const isArray = Array.isArray(value)
  const isObject = !isArray && value !== null && typeof value === 'object'

  if (!isArray && !isObject) {
    return (
      <div className="tree-line group flex items-baseline gap-1.5 rounded px-0.5 py-px font-mono text-[13px] leading-6 hover:bg-foreground/5">
        <span className="w-4 shrink-0" />
        {label !== null && (
          <>
            <KeyLabel label={label} />
            <span className={`shrink-0 ${PUNCT}`}>:</span>
          </>
        )}
        <LeafValue value={value} />
        {comma && <Comma />}
        <CopyValueButton value={value} />
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
      <div className="tree-line flex items-baseline gap-1.5 px-0.5 py-px font-mono text-[13px] leading-6">
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
        className="tree-line tree-line--toggle group flex items-baseline gap-1 rounded px-0.5 hover:bg-foreground/5"
        onClick={toggleRow}
      >
        <span className="grid size-4 shrink-0 self-center place-items-center text-foreground/40">
          <ChevronRight
            size={12}
            className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
          />
        </span>
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
        <CopyValueButton value={value} />
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
        <TreeChildren open={open} comma={comma} closeB={closeB}>
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
  children,
}: {
  open: boolean
  comma?: boolean
  closeB: string
  children: ReactNode
}) {
  // entered: 首次渲染从 0fr 起始,双 rAF 后切 1fr 获得展开动画
  const [entered, setEntered] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (open) {
      // 稳定编号下展开不产生行号跳变(占位与真实行号数一致),无需遮罩
      let raf2 = 0
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setEntered(true))
      })
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    }
    setEntered(false)
  }, [open])
  // 收起后保留 DOM(grid 0fr):行继续占 counter,后续行号保持原号不重排
  return (
    <div
      ref={wrapRef}
      className="tree-children ml-[7px] pl-3"
      data-open={entered}
    >
      <div className="tree-children-inner border-l border-foreground/10 pl-3">
        {children}
        {/* 闭合括号对齐头部行开括号列:实测补偿 15px 对齐开括号列 */}
        <div className={`tree-line ${PUNCT} py-px`} style={{ paddingLeft: '15.5px' }}>
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
    <div className="flex h-11 shrink-0 items-center gap-2 px-4 text-xs text-foreground/55">
      <Eye size={13} />
      <span className="font-medium">{title}</span>
      <div className="ml-auto flex items-center gap-0.5">{extra}</div>
    </div>
  )
}

export function TreeView() {
  const data = useStore(s => s.result?.ok ? s.result.data : null)
  const stats = useStore(s => (s.result?.ok ? s.result.stats : null))
  const collapsed = useStore(s => s.collapsed)
  const touched = useStore(s => s.touched)
  const input = useStore(s => s.input)
  const clear = useStore(s => s.clear)
  const onToggle = useStore(s => s.toggleCollapse)
  const onExpandAll = useStore(s => s.expandAll)
  const onCollapseAll = useStore(s => s.collapseAll)
  const [copied, setCopied] = useState(false)
  const [wrap, setWrap] = useState(true)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(input)
      setCopied(true)
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* 剪贴板不可用时静默 */
    }
  }

  if (!data || !stats) return null

  return (
    <section className="flex h-full min-h-0 flex-col">
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
                <span className="hidden md:inline">{copied ? '已复制' : '复制'}</span>
              </Button>
            </Tip>
            <Tip label="清空">
              <Button size="sm" variant="ghost" onPress={clear}>
                <Trash2 size={14} />
                <span className="hidden md:inline">清空</span>
              </Button>
            </Tip>
            <Tip label={wrap ? '不换行(左右滚动)' : '自动换行'}>
              <Button
                size="sm"
                variant="ghost"
                onPress={() => setWrap(w => !w)}
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
                <span className="hidden md:inline">{wrap ? '换行' : '不换行'}</span>
              </Button>
            </Tip>
            <Tip label={collapsed.size > 0 ? '展开全部' : '折叠全部'}>
              <Button
                size="sm"
                variant="ghost"
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
                <span className="hidden md:inline">
                  {collapsed.size > 0 ? '展开' : '折叠'}
                </span>
              </Button>
            </Tip>
          </>
        }
      />
      <div
        className={`tree-body tree-scroll min-h-0 flex-1 overflow-auto px-4 py-1.5 ${wrap ? 'tree-wrap' : 'tree-nowrap'}`}
      >
        <TreeNode label={null} value={data} path={[]} collapsed={collapsed} touched={touched} onToggle={onToggle} />
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
