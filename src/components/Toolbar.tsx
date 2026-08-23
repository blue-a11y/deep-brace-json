import { useState } from 'react'
import { Button, ButtonGroup, Chip, Tabs, Toolbar as HeroToolbar, toast } from '@heroui/react'

import {
  Braces,
  Check,
  Copy,
  Eye,
  Minimize2,
  Moon,
  Sparkles,
  Sun,
  Trash2,
  Zap,
} from 'lucide-react'
import { Tip } from './Tip'
import { useStore } from '../store/useStore'

const iconBtn = 'size-7 min-w-7'

export function Toolbar() {
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
      setTimeout(() => setCopied(false), 1500)
    } catch {
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
        {/* 工具特性 */}
        <div className="hidden items-center gap-1.5 lg:flex">
          <Chip color="success" variant="soft">
            <Check width={12} />
            <Chip.Label>JSON5</Chip.Label>
          </Chip>
          <Chip color="accent" variant="soft">
            <Zap width={12} />
            <Chip.Label>自动解析</Chip.Label>
          </Chip>
          <Chip color="default" variant="soft">
            <Eye width={12} />
            <Chip.Label>树形预览</Chip.Label>
          </Chip>
        </div>
      </div>

      <HeroToolbar aria-label="格式化操作">
        <ButtonGroup size="sm" variant="secondary">
          <Button onPress={format}>
            <Braces size={14} />
            <span className="hidden sm:inline">格式化</span>
          </Button>
          <ButtonGroup.Separator />
          <Button onPress={minify}>
            <Minimize2 size={14} />
            <span className="hidden sm:inline">压缩</span>
          </Button>
        </ButtonGroup>
      </HeroToolbar>

      <div className="ml-auto flex items-center gap-2">
        <HeroToolbar aria-label="编辑操作">
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
        </HeroToolbar>

        <Tabs
          className="theme-tabs"
          aria-label="主题"
          selectedKey={dark ? 'dark' : 'light'}
          onSelectionChange={k => {
            if ((k === 'dark') !== dark) toggleTheme()
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="主题">
              <Tabs.Tab id="light" aria-label="浅色">
                <Sun size={14} />
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="dark" aria-label="深色">
                <Moon size={14} />
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>
    </header>
  )
}
