import { useMemo } from 'react'
import { byteLength, formatBytes } from '../lib/parse'
import { selectActiveTab, useStore } from '../store/useStore'

export function StatusBar() {
  const { input, result, dirty } = useStore(selectActiveTab)

  const lines = useMemo(() => (input ? input.split('\n').length : 0), [input])
  const bytes = useMemo(() => byteLength(input), [input])

  let text: string
  let cls: string
  if (!result) {
    text = '就绪'
    cls = 'text-foreground/50'
  } else if (!result.ok) {
    const pos = result.line ? ` · ${result.line}:${result.column}` : ''
    text = `解析失败${pos} — ${result.message}`
    cls = 'text-red-500'
  } else if (dirty) {
    text = '输入中 · 自动解析'
    cls = 'text-amber-500'
  } else if (result.degraded) {
    const len = (result.data as string).length
    text = `纯文本 · 已按字符串处理 · ${len} 字符`
    cls = 'text-sky-500'
  } else {
    const { rootType, nodes, maxDepth } = result.stats
    text = `已解析 · ${rootType} · ${nodes} 节点 · 最大深度 ${maxDepth}`
    cls = 'text-emerald-500'
  }

  return (
    <footer className="flex shrink-0 items-center justify-between gap-4 px-2 py-1 font-mono text-[12.5px]">
      <div className="shrink-0 text-foreground/50">
        {lines} 行 · {input.length} 字符 · {formatBytes(bytes)}
      </div>
      <div className={`min-w-0 truncate ${cls}`}>
        <span className="mr-1.5 inline-block size-1.5 rounded-full bg-current align-middle" />
        {text}
      </div>
    </footer>
  )
}
