import type { IndentSize } from '../lib/indent'
import type { ParseResult } from '../lib/parse'
import type { TreeTheme } from '../lib/tree-theme'

export type JsonTab = {
  id: string
  title: string
  input: string
  result: ParseResult | null
  dirty: boolean
  collapsed: Set<string>
  touched: Set<string>
  wrap: boolean
}

export type JsonTabRestoreTarget = {
  index: number
  previousTabId?: string
  nextTabId?: string
}

export type JsonTabsSlice = {
  tabs: JsonTab[]
  activeTabId: string
  bootstrap: () => void
  setActiveTab: (id: string) => void
  openTab: (input?: string, title?: string) => void
  closeTab: (id: string) => void
  restoreTab: (tab: JsonTab, target: JsonTabRestoreTarget) => void
  editInput: (value: string) => void
  parse: (quiet?: boolean) => void
  /** 以下变换类 action 返回是否成功（用于触发图标反馈动画） */
  format: () => boolean
  minify: () => boolean
  escape: () => boolean
  unescape: () => boolean
  loadSample: () => void
  clear: () => void
  toggleWrap: () => void
  toggleCollapse: (key: string) => void
  expandAll: () => void
  collapseAll: () => void
}

export type PreferencesSlice = {
  dark: boolean
  indentSize: IndentSize
  treeTheme: TreeTheme
  toggleTheme: () => void
  setIndentSize: (value: IndentSize) => void
  setTreeTheme: (value: TreeTheme) => void
}

export type DeepBraceState = JsonTabsSlice & PreferencesSlice
