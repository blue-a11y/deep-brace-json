import { Button, Chip, ListBox, Select, Tabs } from '@heroui/react'

import {
  Check,
  Eye,
  Indent,
  Moon,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react'
import { Tip } from './Tip'
import { useStore } from '../store/useStore'

const INDENT_OPTIONS = [2, 4, 8]

export function Toolbar() {
  const loadSample = useStore(s => s.loadSample)
  const toggleTheme = useStore(s => s.toggleTheme)
  const dark = useStore(s => s.dark)
  const indent = useStore(s => s.indent)
  const setIndent = useStore(s => s.setIndent)

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
          <Button size="sm" variant="ghost" onPress={loadSample}>
            <Sparkles size={15} />
            <span className="hidden md:inline">示例</span>
          </Button>
        </Tip>

        {/* 全局缩进 */}
        <Select
          className="indent-select w-[110px]"
          aria-label="缩进"
          selectedKey={String(indent)}
          onSelectionChange={k => setIndent(Number(k))}
        >
          <Select.Trigger>
            <Indent size={13} className="shrink-0 text-foreground/50" />
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox aria-label="缩进宽度">
              {INDENT_OPTIONS.map(n => (
                <ListBox.Item key={String(n)} id={String(n)} textValue={`${n} 空格`}>
                  {n} 空格
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

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
