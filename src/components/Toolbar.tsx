import { Button, Chip, Tabs } from '@heroui/react'

import {
  Check,
  Eye,
  Moon,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react'
import { Tip } from './Tip'
import { useStore } from '../store/useStore'

const iconBtn = 'size-7 min-w-7'

export function Toolbar() {
  const loadSample = useStore(s => s.loadSample)
  const toggleTheme = useStore(s => s.toggleTheme)
  const dark = useStore(s => s.dark)

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
          <Chip size="sm" color="success">
            <Check width={12} />
            <Chip.Label>JSON5</Chip.Label>
          </Chip>
          <Chip size="sm" color="accent">
            <Zap width={12} />
            <Chip.Label>自动解析</Chip.Label>
          </Chip>
          <Chip size="sm" color="default">
            <Eye width={12} />
            <Chip.Label>树形预览</Chip.Label>
          </Chip>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Tip label="载入示例">
          <Button isIconOnly size="sm" variant="ghost" className={iconBtn} onPress={loadSample}>
            <Sparkles size={15} />
          </Button>
        </Tip>

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
