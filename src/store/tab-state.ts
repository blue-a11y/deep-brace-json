import type { ParseResult } from '../lib/parse'
import type { JsonTab } from './types'

const INITIAL_TAB_ID = 'json-tab-1'
let tabIdSequence = 0

export const createTabId = (): string =>
  `json-tab-${Date.now().toString(36)}-${++tabIdSequence}`

export const createJsonTab = (
  input = '',
  title = 'JSON 1',
  id = createTabId(),
  shouldWrap = true,
): JsonTab => ({
  id,
  title,
  input,
  result: null,
  isDirty: false,
  collapsed: new Set<string>(),
  touched: new Set<string>(),
  shouldWrap,
})

export const createInitialTab = (input: string): JsonTab =>
  createJsonTab(input, 'JSON 1', INITIAL_TAB_ID)

export const getActiveTab = (state: { tabs: JsonTab[]; activeTabId: string }): JsonTab =>
  state.tabs.find(tab => tab.id === state.activeTabId) ?? state.tabs[0]

export const updateJsonTab = (
  tabs: JsonTab[],
  id: string,
  updater: (tab: JsonTab) => JsonTab,
): JsonTab[] => tabs.map(tab => (tab.id === id ? updater(tab) : tab))

export const applyParseResult = (tab: JsonTab, result: ParseResult): JsonTab =>
  result.ok
    ? {
        ...tab,
        result,
        isDirty: false,
        collapsed: new Set<string>(),
        touched: new Set<string>(),
      }
    : { ...tab, result, isDirty: false }

export const getNextTabTitle = (tabs: JsonTab[]): string => {
  const maxIndex = tabs.reduce((max, tab) => {
    const match = tab.title.match(/^JSON (\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `JSON ${maxIndex + 1}`
}

export const restoreJsonTab = (value: unknown, index: number): JsonTab => {
  const stored = value && typeof value === 'object'
    ? value as Partial<JsonTab> & { wrap?: unknown }
    : {}
  const input = typeof stored.input === 'string' ? stored.input : ''
  const title = typeof stored.title === 'string' ? stored.title : `JSON ${index + 1}`
  const id = typeof stored.id === 'string' ? stored.id : createTabId()
  const shouldWrap = typeof stored.shouldWrap === 'boolean'
    ? stored.shouldWrap
    : stored.wrap !== false
  return createJsonTab(input, title, id, shouldWrap)
}

export const prepareTabForStorage = (tab: JsonTab): JsonTab => ({
  ...tab,
  result: null,
  isDirty: false,
  collapsed: new Set<string>(),
  touched: new Set<string>(),
})
