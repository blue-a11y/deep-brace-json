import type { Key } from 'react'
import { Dropdown, useOverlayState } from '@heroui/react'
import {
  AlignLeft,
  Check,
  Keyboard,
  Menu,
  Moon,
  Palette,
  Settings,
  Sparkles,
  Sun,
} from 'lucide-react'

import { INDENT_OPTIONS, type IndentSize } from '../lib/indent'
import { TREE_THEME_OPTIONS, type TreeTheme } from '../lib/tree-theme'
import { useStore } from '../store/use-store'
import { AppSettings } from './app-settings'
import { GithubMark } from './github-mark'
import { ShortcutHelp } from './shortcut-help'
import type { ToolbarActionVisibility } from './use-toolbar-action-visibility'

const REPOSITORY_URL = 'https://github.com/blue-a11y/deep-brace-json'

type ToolbarMenuProps = {
  actionVisibility: ToolbarActionVisibility
}

export const ToolbarMenu = ({ actionVisibility }: ToolbarMenuProps) => {
  const handleLoadSample = useStore(state => state.loadSample)
  const handleToggleTheme = useStore(state => state.toggleTheme)
  const isDark = useStore(state => state.isDark)
  const indentSize = useStore(state => state.indentSize)
  const handleIndentSizeChange = useStore(state => state.setIndentSize)
  const treeTheme = useStore(state => state.treeTheme)
  const handleTreeThemeChange = useStore(state => state.setTreeTheme)
  const shortcutOverlayState = useOverlayState()
  const settingsOverlayState = useOverlayState()

  const handleMenuAction = (key: Key) => {
    if (key === 'sample') handleLoadSample()
    if (key === 'shortcuts') shortcutOverlayState.open()
    if (key === 'settings') settingsOverlayState.open()
    if (key === 'theme') handleToggleTheme()
    if (key === 'github') {
      window.open(REPOSITORY_URL, '_blank', 'noopener,noreferrer')
    }
  }

  const handleIndentAction = (key: Key) => {
    if (typeof key === 'number' && INDENT_OPTIONS.includes(key as IndentSize)) {
      handleIndentSizeChange(key as IndentSize)
    }
  }

  const handleTreeThemeAction = (key: Key) => {
    if (
      typeof key === 'string'
      && TREE_THEME_OPTIONS.some(option => option.value === key)
    ) {
      handleTreeThemeChange(key as TreeTheme)
    }
  }

  return (
    <>
      <Dropdown>
        <Dropdown.Trigger
          aria-label="打开工具菜单"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-foreground outline-none transition-colors hover:bg-default focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Menu className="shrink-0" size={18} />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu
            aria-label="工具菜单"
            className="min-w-60"
            onAction={handleMenuAction}
          >
            {!actionVisibility.shouldShowSample && (
              <Dropdown.Item id="sample" textValue="载入示例">
                <Sparkles size={16} />
                <span>载入示例</span>
              </Dropdown.Item>
            )}

            {!actionVisibility.shouldShowIndent && (
              <Dropdown.SubmenuTrigger>
                <Dropdown.Item id="indent" textValue={`缩进：${indentSize} 空格`}>
                  <AlignLeft size={16} />
                  <span>缩进</span>
                  <span className="ml-auto text-xs text-muted">{indentSize} 空格</span>
                  <Dropdown.SubmenuIndicator />
                </Dropdown.Item>
                <Dropdown.Popover placement="left top">
                  <Dropdown.Menu aria-label="缩进" onAction={handleIndentAction}>
                    {INDENT_OPTIONS.map(option => (
                      <Dropdown.Item key={option} id={option} textValue={`${option} 空格`}>
                        {indentSize === option
                          ? <Check className="text-primary" size={16} />
                          : <span className="size-4" />}
                        <span>{option} 空格</span>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown.SubmenuTrigger>
            )}

            {!actionVisibility.shouldShowTreeTheme && (
              <Dropdown.SubmenuTrigger>
                <Dropdown.Item id="tree-theme" textValue={`树形主题：${treeTheme}`}>
                  <Palette size={16} />
                  <span>树形主题</span>
                  <span className="ml-auto max-w-24 truncate text-xs text-muted">
                    {TREE_THEME_OPTIONS.find(option => option.value === treeTheme)?.label}
                  </span>
                  <Dropdown.SubmenuIndicator />
                </Dropdown.Item>
                <Dropdown.Popover placement="left top">
                  <Dropdown.Menu aria-label="树形主题" onAction={handleTreeThemeAction}>
                    {TREE_THEME_OPTIONS.map(option => (
                      <Dropdown.Item
                        key={option.value}
                        id={option.value}
                        textValue={option.label}
                      >
                        {treeTheme === option.value
                          ? <Check className="text-primary" size={16} />
                          : <span className="size-4" />}
                        <span>{option.label}</span>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown.SubmenuTrigger>
            )}

            {!actionVisibility.shouldShowShortcuts && (
              <Dropdown.Item id="shortcuts" textValue="快捷键">
                <Keyboard size={16} />
                <span>快捷键</span>
              </Dropdown.Item>
            )}
            {!actionVisibility.shouldShowSettings && (
              <Dropdown.Item id="settings" textValue="设置">
                <Settings size={16} />
                <span>设置</span>
              </Dropdown.Item>
            )}
            {!actionVisibility.shouldShowTheme && (
              <Dropdown.Item
                id="theme"
                textValue={isDark ? '切换至浅色主题' : '切换至深色主题'}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                <span>{isDark ? '切换至浅色主题' : '切换至深色主题'}</span>
              </Dropdown.Item>
            )}
            {!actionVisibility.shouldShowGithub && (
              <Dropdown.Item id="github" textValue="打开 GitHub 仓库">
                <GithubMark />
                <span>GitHub</span>
              </Dropdown.Item>
            )}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      {!actionVisibility.shouldShowShortcuts && (
        <ShortcutHelp
          overlayState={shortcutOverlayState}
          shouldHideTrigger
        />
      )}
      {!actionVisibility.shouldShowSettings && (
        <AppSettings
          overlayState={settingsOverlayState}
          shouldHideTrigger
        />
      )}
    </>
  )
}
