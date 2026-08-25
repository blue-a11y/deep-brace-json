import { CircleFill, LogoGithub } from '@gravity-ui/icons'
import { Button, Tabs } from '@heroui/react'
import { Moon, Sparkles, Sun } from 'lucide-react'
import { IndentSelect } from './indent-select'
import { ShortcutHelp } from './shortcut-help'
import { TreeThemeSelect } from './tree-theme-select'
import { Tip } from './Tip'
import { useStore } from '../store/useStore'

const FEATURE_DOT_SIZE = 4

export function Toolbar() {
  const loadSample = useStore(s => s.loadSample)
  const toggleTheme = useStore(s => s.toggleTheme)
  const dark = useStore(s => s.dark)
  const indentSize = useStore(s => s.indentSize)
  const setIndentSize = useStore(s => s.setIndentSize)
  const treeTheme = useStore(s => s.treeTheme)
  const setTreeTheme = useStore(s => s.setTreeTheme)

  return (
    <header className="flex shrink-0 items-center gap-2 px-1 py-1.5">
      <div className="mr-1 flex items-baseline gap-2.5 md:mr-3">
        <div className="grid size-7 shrink-0 place-items-center self-center rounded-lg bg-foreground font-mono text-xs font-bold text-background">
          {'{ }'}
        </div>
        <span className="hidden whitespace-nowrap font-logo text-[20px] tracking-tight sm:inline">
          DeepBrace JSON
        </span>
        {/* 工具特性 */}
        <div className="hidden -translate-y-0.5 items-center gap-1 font-sans tracking-normal lg:flex">
          <span className="inline-flex h-5 shrink-0 items-center px-1.5 text-xs font-medium text-emerald-500">
            嵌套解析
          </span>
          <CircleFill
            aria-hidden="true"
            className="shrink-0 opacity-40"
            width={FEATURE_DOT_SIZE}
          />
          <span className="inline-flex h-5 shrink-0 items-center px-1.5 text-xs font-medium text-emerald-500">
            数据持久化
          </span>
          <CircleFill
            aria-hidden="true"
            className="shrink-0 opacity-40"
            width={FEATURE_DOT_SIZE}
          />
          <span className="inline-flex h-5 shrink-0 items-center px-1.5 text-xs font-medium text-emerald-500">
            多标签工作区
          </span>
          <CircleFill
            aria-hidden="true"
            className="hidden shrink-0 opacity-40 xl:block"
            width={FEATURE_DOT_SIZE}
          />
          <span className="hidden h-5 shrink-0 items-center px-1.5 text-xs font-medium text-emerald-500 xl:inline-flex">
            JSON5 支持
          </span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ShortcutHelp />
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

        <Tip label="查看 GitHub 仓库">
          <Button
            isIconOnly
            aria-label="打开 GitHub 仓库"
            size="md"
            variant="tertiary"
            onPress={() =>
              window.open(
                'https://github.com/blue-a11y/deep-brace-json',
                '_blank',
                'noopener,noreferrer',
              )
            }
          >
            <LogoGithub width={16} />
          </Button>
        </Tip>
      </div>
    </header>
  )
}
