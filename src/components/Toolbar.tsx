import { CircleFill } from '@gravity-ui/icons'
import { Button, Tabs } from '@heroui/react'
import { Moon, Sparkles, Sun } from 'lucide-react'
import { IndentSelect } from './indent-select'
import { ShortcutHelp } from './shortcut-help'
import { TreeThemeSelect } from './tree-theme-select'
import { Tip } from './Tip'
import AnimatedContent from './react-bits/AnimatedContent'
import Shuffle from './react-bits/Shuffle'
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
        <AnimatedContent
          distance={0}
          scale={0}
          duration={0.65}
          ease="back.out(2)"
          className="flex self-center"
        >
          <div className="grid size-7 shrink-0 place-items-center self-center rounded-lg bg-foreground font-mono text-xs font-bold text-background">
            {'{ }'}
          </div>
        </AnimatedContent>
        <Shuffle
          text="DeepBrace JSON"
          tag="span"
          triggerOnHover={false}
          loop
          loopDelay={5}
          duration={0.65}
          textAlign="left"
          className="hidden whitespace-nowrap font-logo text-[20px] tracking-tight sm:inline"
        />
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
            <Tabs.List aria-label="主题" className="h-8 p-0.5">
              <Tabs.Tab
                id="light"
                aria-label="浅色"
                className="h-7 min-h-7 w-[45px] min-w-[45px] rounded-full p-0"
              >
                <Sun size={16} strokeWidth={2.5} />
                <Tabs.Indicator className="rounded-full" />
              </Tabs.Tab>
              <Tabs.Tab
                id="dark"
                aria-label="深色"
                className="h-7 min-h-7 w-[45px] min-w-[45px] rounded-full p-0"
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
            size="sm"
            variant="tertiary"
            onPress={() =>
              window.open(
                'https://github.com/blue-a11y/deep-brace-json',
                '_blank',
                'noopener,noreferrer',
              )
            }
          >
            {/* GitHub 官方 mark(Octicons mark-github 16px) */}
            <svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </Button>
        </Tip>
      </div>
    </header>
  )
}
