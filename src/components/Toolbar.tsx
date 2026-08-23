import { useState } from 'react'
import { Button, ButtonGroup, Chip } from '@heroui/react'
import { toast } from './toast'

import {
  Braces,
  Check,
  Copy,
  Minimize2,
  Moon,
  Play,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react'
import { Tip } from './Tip'
import { useStore } from '../store/useStore'

const iconBtn = 'size-7 min-w-7'

export function Toolbar() {
  const parse = useStore(s => s.parse)
  const format = useStore(s => s.format)
  const minify = useStore(s => s.minify)
  const loadSample = useStore(s => s.loadSample)
  const clear = useStore(s => s.clear)
  const toggleTheme = useStore(s => s.toggleTheme)
  const dark = useStore(s => s.dark)
  const input = useStore(s => s.input)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(input)
      setCopied(true)
      toast.success('已复制到剪贴板')
      setTimeout(() => setCopied(false), 1500)    } catch {
      /* 剪贴板不可用时静默 */
    }
  }

  return (
    <header className="flex shrink-0 items-center gap-2 px-1 py-1.5 md:px-2">
      <div className="mr-1 flex items-center gap-2.5 md:mr-3">
        <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-foreground font-mono text-xs font-bold text-background">
          {'{ }'}
        </div>
        <span className="hidden font-mono text-[15px] font-bold tracking-tight sm:inline">
          json-lens
        </span>
        <Chip size="sm" variant="soft" color="accent" className="hidden sm:inline-flex">
          JSON5
        </Chip>
      </div>

      <ButtonGroup size="sm" variant="secondary">
        <Button variant="primary" onPress={() => parse()}>
          <Play size={14} />
          解析
        </Button>
        <Button onPress={format}>
          <Braces size={14} />
          <span className="hidden sm:inline">格式化</span>
        </Button>
        <Button onPress={minify}>
          <Minimize2 size={14} />
          <span className="hidden sm:inline">压缩</span>
        </Button>
      </ButtonGroup>

      <div className="ml-auto flex items-center gap-0.5">
        <Tip label="载入示例">
          <Button isIconOnly size="sm" variant="ghost" className={iconBtn} onPress={loadSample}>
            <Sparkles size={15} />
          </Button>
        </Tip>
        <Tip label={copied ? '已复制' : '复制内容'}>
          <Button isIconOnly size="sm" variant="ghost" className={iconBtn} onPress={copy}>
            {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
          </Button>
        </Tip>
        <Tip label="清空">
          <Button isIconOnly size="sm" variant="ghost" className={iconBtn} onPress={clear}>
            <Trash2 size={15} />
          </Button>
        </Tip>
        <Tip label={dark ? '切换亮色' : '切换暗色'}>
          <Button isIconOnly size="sm" variant="ghost" className={iconBtn} onPress={toggleTheme}>
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </Button>
        </Tip>
      </div>
    </header>
  )
}
