import { useEffect, useState, type ReactNode } from 'react'
import { Button, Chip } from '@heroui/react'
import { ChevronRight, Eye, FoldVertical, OctagonAlert, UnfoldVertical } from 'lucide-react'
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

function KeyLabel({ label }: { label: string | number }) {
  return typeof label === 'number' ? (
    <span className="text-zinc-500 dark:text-zinc-400">[{label}]</span>
  ) : (
    <span className="text-sky-700 dark:text-sky-300">{label}</span>
  )
}

/* ---------- 树节点（递归） ---------- */

interface TreeNodeProps {
  label: string | number | null
  value: unknown
  path: NodePath
  collapsed: Set<string>
  touched: Set<string>
  onToggle: (key: string) => void
}

export function TreeNode({ label, value, path, collapsed, touched, onToggle }: TreeNodeProps) {
  const isArray = Array.isArray(value)
  const isObject = !isArray && value !== null && typeof value === 'object'

  if (!isArray && !isObject) {
    return (
      <div className="tree-line flex items-baseline gap-1.5 rounded px-0.5 py-px font-mono text-[13px] leading-6 hover:bg-foreground/5">
        <span className="w-4 shrink-0" />
        {label !== null && (
          <>
            <KeyLabel label={label} />
            <span className={PUNCT}>:</span>
          </>
        )}
        <LeafValue value={value} />
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
      </div>
    )
  }

  const key = pathKey(path)
  const open = !collapsed.has(key)
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
        className="tree-line tree-line--toggle flex items-baseline gap-1 rounded px-0.5 hover:bg-foreground/5"
        onClick={toggleRow}
      >
        <span className="grid size-4 shrink-0 translate-y-1 place-items-center text-foreground/40">
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
          </>
        )}
      </div>
      {/* 展开过的子树保留 DOM 由 grid 0fr→1fr 做折叠动画;从未展开的保持懒渲染 */}
      {(open || touched.has(key)) && (
        <TreeChildren open={open}>
          {entries.map(([k, v]) => (
            <TreeNode
              key={String(k)}
              label={k}
              value={v}
              path={[...path, k]}
              collapsed={collapsed}
              touched={touched}
              onToggle={onToggle}
            />
          ))}
          <div className={`tree-line ${PUNCT} py-px`}>{closeB}</div>
        </TreeChildren>
      )}
    </div>
  )
}

/* ---------- 子树容器:首次挂载从 0fr 过渡展开 ---------- */

function TreeChildren({ open, children }: { open: boolean; children: ReactNode }) {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [])
  return (
    <div className="tree-children ml-[7px] pl-3" data-open={open && entered}>
      <div className="tree-children-inner border-l border-foreground/10 pl-3">{children}</div>
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
  const onToggle = useStore(s => s.toggleCollapse)
  const onExpandAll = useStore(s => s.expandAll)
  const onCollapseAll = useStore(s => s.collapseAll)
  if (!data || !stats) return null

  return (
    <section className="flex h-full min-h-0 flex-col">
      <PaneHeader
        title="树形预览"
        extra={
          <>
            <Chip size="sm" variant="soft" className="font-mono">
              {stats.rootType} · {stats.nodes} 节点 · 深度 {stats.maxDepth}
            </Chip>
            <Tip label="展开全部">
              <Button isIconOnly size="sm" variant="ghost" className="size-7 min-w-7" onPress={onExpandAll}>
                <UnfoldVertical size={14} />
              </Button>
            </Tip>
            <Tip label="折叠全部">
              <Button isIconOnly size="sm" variant="ghost" className="size-7 min-w-7" onPress={onCollapseAll}>
                <FoldVertical size={14} />
              </Button>
            </Tip>
          </>
        }
      />
      <div className="tree-body tree-scroll min-h-0 flex-1 overflow-auto px-4 py-3">
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
