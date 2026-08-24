import type { StateCreator } from 'zustand'
import {
  collectContainerPaths,
  escapeText,
  parseInput,
  unescapeText,
  type ParseResult,
} from '../lib/parse'
import { SAMPLE } from '../lib/sample'
import { captureActiveTabScrollPositions } from '../lib/tab-scroll'
import { toast } from '../lib/toast'
import {
  applyParseResult,
  createInitialTab,
  createJsonTab,
  createTabId,
  getActiveTab,
  getNextTabTitle,
  updateJsonTab,
} from './tab-state'
import type { JsonLensState, JsonTabsSlice } from './types'

const AUTO_PARSE_DELAY = 300
const autoParseTimers = new Map<string, ReturnType<typeof setTimeout>>()

const notifyResult = (result: ParseResult) => {
  if (result.ok && result.degraded) {
    toast.info(`已按纯文本字符串处理 · ${(result.data as string).length} 字符`)
  } else if (result.ok) {
    toast.success(`已解析 · ${result.stats.nodes} 节点 · 深度 ${result.stats.maxDepth}`)
  } else {
    toast.danger(`解析失败${result.line ? ` · ${result.line}:${result.column}` : ''}`, {
      description: result.message,
    })
  }
}

export const createTabSlice: StateCreator<JsonLensState, [], [], JsonTabsSlice> = (set, get) => {
  const cancelAutoParse = (id: string) => {
    clearTimeout(autoParseTimers.get(id))
    autoParseTimers.delete(id)
  }

  const patchTab = (id: string, updater: Parameters<typeof updateJsonTab>[2]) =>
    set(state => ({ tabs: updateJsonTab(state.tabs, id, updater) }))

  const parseTab = (id: string, quiet = false) => {
    const tab = get().tabs.find(item => item.id === id)
    if (!tab) return
    const result = parseInput(tab.input)
    patchTab(id, current => applyParseResult(current, result))
    if (!quiet) notifyResult(result)
  }

  const rewrite = (transform: (data: unknown) => string, successMessage: string) => {
    const tab = getActiveTab(get())
    cancelAutoParse(tab.id)
    const result = parseInput(tab.input)
    if (!result.ok) {
      patchTab(tab.id, current => ({ ...current, result, dirty: false }))
      notifyResult(result)
      return false
    }
    patchTab(tab.id, current =>
      applyParseResult({ ...current, input: transform(result.data) }, result),
    )
    toast.success(successMessage)
    return true
  }

  /** 直接把编辑器内容替换为给定文本并立即解析 */
  const rewriteInput = (nextInput: string, successMessage: string) => {
    const tab = getActiveTab(get())
    cancelAutoParse(tab.id)
    const result = parseInput(nextInput)
    patchTab(tab.id, current => applyParseResult({ ...current, input: nextInput }, result))
    toast.success(successMessage)
  }

  return {
    tabs: [createInitialTab(SAMPLE)],
    activeTabId: 'json-tab-1',

    bootstrap: () =>
      set(state => ({
        tabs: state.tabs.map(tab =>
          tab.input.trim() ? applyParseResult(tab, parseInput(tab.input)) : tab,
        ),
      })),

    setActiveTab: activeTabId => {
      if (
        activeTabId !== get().activeTabId
        && get().tabs.some(tab => tab.id === activeTabId)
      ) {
        captureActiveTabScrollPositions()
        set({ activeTabId })
      }
    },

    openTab: (input = '', title) => {
      captureActiveTabScrollPositions()
      const id = createTabId()
      set(state => {
        const nextTitle = title?.trim() || getNextTabTitle(state.tabs)
        const baseTab = createJsonTab(input, nextTitle, id)
        const tab = input.trim() ? applyParseResult(baseTab, parseInput(input)) : baseTab
        const activeIndex = state.tabs.findIndex(item => item.id === state.activeTabId)
        const insertAt = activeIndex < 0 ? state.tabs.length : activeIndex + 1
        const tabs = [...state.tabs.slice(0, insertAt), tab, ...state.tabs.slice(insertAt)]
        return { tabs, activeTabId: id }
      })
    },

    closeTab: id => {
      const currentState = get()
      if (!currentState.tabs.some(tab => tab.id === id)) return
      if (currentState.activeTabId === id) captureActiveTabScrollPositions()
      cancelAutoParse(id)
      set(state => {
        const index = state.tabs.findIndex(tab => tab.id === id)
        if (index < 0) return state
        if (state.tabs.length === 1) {
          const tab = createInitialTab('')
          return { tabs: [tab], activeTabId: tab.id }
        }
        const tabs = state.tabs.filter(tab => tab.id !== id)
        const activeTabId = state.activeTabId === id
          ? tabs[Math.min(index, tabs.length - 1)].id
          : state.activeTabId
        return { tabs, activeTabId }
      })
    },

    restoreTab: (tab, target) => {
      captureActiveTabScrollPositions()
      const shouldRestore = !get().tabs.some(item => item.id === tab.id)
      set(state => {
        if (state.tabs.some(item => item.id === tab.id)) {
          return { activeTabId: tab.id }
        }
        const nextIndex = target.nextTabId
          ? state.tabs.findIndex(item => item.id === target.nextTabId)
          : -1
        const previousIndex = target.previousTabId
          ? state.tabs.findIndex(item => item.id === target.previousTabId)
          : -1
        const insertAt = nextIndex >= 0
          ? nextIndex
          : previousIndex >= 0
            ? previousIndex + 1
            : Math.min(target.index, state.tabs.length)
        const tabs = [
          ...state.tabs.slice(0, insertAt),
          tab,
          ...state.tabs.slice(insertAt),
        ]
        return { tabs, activeTabId: tab.id }
      })
      if (shouldRestore && tab.dirty) {
        autoParseTimers.set(tab.id, setTimeout(() => parseTab(tab.id, true), AUTO_PARSE_DELAY))
      }
    },

    editInput: input => {
      const id = get().activeTabId
      patchTab(id, tab => ({ ...tab, input, dirty: true }))
      clearTimeout(autoParseTimers.get(id))
      autoParseTimers.set(id, setTimeout(() => parseTab(id, true), AUTO_PARSE_DELAY))
    },

    parse: (quiet = false) => parseTab(get().activeTabId, quiet),
    format: () => rewrite(data => JSON.stringify(data, null, 2), '已格式化 · JSON5 → 标准 JSON'),
    minify: () => rewrite(data => JSON.stringify(data), '已压缩为单行'),

    escape: () => {
      rewriteInput(
        escapeText(getActiveTab(get()).input),
        '已转义 · 包成字符串字面量',
      )
      return true
    },
    unescape: () => {
      const nextInput = unescapeText(getActiveTab(get()).input)
      if (nextInput == null) {
        toast.warning('没有可反转义的内容', {
          description: '需要 JSON 字符串字面量，或保留转义的裸容器文本',
        })
        return false
      }
      rewriteInput(nextInput, '已反转义 · 剥开一层')
      return true
    },

    loadSample: () => {
      const id = get().activeTabId
      cancelAutoParse(id)
      patchTab(id, tab => applyParseResult({ ...tab, input: SAMPLE }, parseInput(SAMPLE)))
      toast.info('已载入示例')
    },

    clear: () => {
      const id = get().activeTabId
      cancelAutoParse(id)
      patchTab(id, tab => ({
        ...tab,
        input: '',
        result: null,
        dirty: false,
        collapsed: new Set<string>(),
        touched: new Set<string>(),
      }))
      toast('已清空')
    },

    toggleWrap: () => {
      const id = get().activeTabId
      patchTab(id, tab => ({ ...tab, wrap: !tab.wrap }))
    },

    toggleCollapse: key => {
      const id = get().activeTabId
      patchTab(id, tab => {
        const collapsed = new Set(tab.collapsed)
        if (collapsed.has(key)) collapsed.delete(key)
        else collapsed.add(key)
        const touched = new Set(tab.touched).add(key)
        return { ...tab, collapsed, touched }
      })
    },

    expandAll: () => {
      const id = get().activeTabId
      patchTab(id, tab => ({ ...tab, collapsed: new Set<string>() }))
    },

    collapseAll: () => {
      const id = get().activeTabId
      patchTab(id, tab => {
        if (!tab.result?.ok) return tab
        const collapsed = collectContainerPaths(tab.result.data, 'all')
        const touched = new Set(tab.touched)
        for (const key of collapsed) touched.add(key)
        return { ...tab, collapsed, touched }
      })
    },
  }
}
