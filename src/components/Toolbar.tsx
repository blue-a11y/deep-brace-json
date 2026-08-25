import { CircleFill } from '@gravity-ui/icons'
import { Button, Chip, Tabs } from '@heroui/react'
import { Moon, Sparkles, Sun } from 'lucide-react'
import { IndentSelect } from './indent-select'
import { TreeThemeSelect } from './tree-theme-select'
import { Tip } from './Tip'
import { useStore } from '../store/useStore'

const CHIP_DOT_SIZE = 4

export function Toolbar() {
  const loadSample = useStore(s => s.loadSample)
  const toggleTheme = useStore(s => s.toggleTheme)
  const dark = useStore(s => s.dark)
  const indentSize = useStore(s => s.indentSize)
  const setIndentSize = useStore(s => s.setIndentSize)
  const treeTheme = useStore(s => s.treeTheme)
  const setTreeTheme = useStore(s => s.setTreeTheme)

  return (
    <header className="flex shrink-0 items-center gap-2 px-1 py-1.5 md:px-2">
      <div className="mr-1 flex items-baseline gap-2.5 md:mr-3">
        <div className="grid size-7 shrink-0 place-items-center self-center rounded-lg bg-foreground font-mono text-xs font-bold text-background">
          {'{ }'}
        </div>
        <span className="hidden whitespace-nowrap font-logo text-[20px] tracking-tight sm:inline">
          DeepBrace JSON
        </span>
        {/* 工具特性 */}
        <div className="hidden translate-y-0.5 items-center gap-1 font-sans tracking-normal lg:flex">
          <Chip color="success" size="sm">
            <CircleFill className="opacity-40" width={CHIP_DOT_SIZE} />
            <Chip.Label>JSON5 支持</Chip.Label>
          </Chip>
          <Chip color="success" size="sm">
            <CircleFill className="opacity-40" width={CHIP_DOT_SIZE} />
            <Chip.Label>嵌套解析</Chip.Label>
          </Chip>
          <Chip color="success" size="sm">
            <CircleFill className="opacity-40" width={CHIP_DOT_SIZE} />
            <Chip.Label>多标签工作区</Chip.Label>
          </Chip>
          <Chip color="success" size="sm" className="hidden xl:inline-flex">
            <CircleFill className="opacity-40" width={CHIP_DOT_SIZE} />
            <Chip.Label>数据持久化</Chip.Label>
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

        <IndentSelect value={indentSize} onChange={setIndentSize} />
        <TreeThemeSelect value={treeTheme} onChange={setTreeTheme} />

        <Tabs
          aria-label="主题"
          selectedKey={dark ? 'dark' : 'light'}
          onSelectionChange={k => {
            if ((k === 'dark') !== dark) toggleTheme()
          }}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="主题" className="h-9 p-0.5">
              <Tabs.Tab
                id="light"
                aria-label="浅色"
                className="h-8 min-h-8 w-[45px] min-w-[45px] rounded-full p-0"
              >
                <Sun size={16} strokeWidth={2.5} />
                <Tabs.Indicator className="rounded-full" />
              </Tabs.Tab>
              <Tabs.Tab
                id="dark"
                aria-label="深色"
                className="h-8 min-h-8 w-[45px] min-w-[45px] rounded-full p-0"
              >
                <Moon size={16} strokeWidth={2.5} />
                <Tabs.Indicator className="rounded-full" />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>
    </header>
  )
}
