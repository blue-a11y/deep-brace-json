import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DEFAULT_INDENT_SIZE, INDENT_OPTIONS, type IndentSize } from '../lib/indent'
import { SAMPLE } from '../lib/sample'
import {
  DEFAULT_TREE_THEME,
  TREE_THEME_OPTIONS,
  type TreeTheme,
} from '../lib/tree-theme'
import { createTabSlice } from './tab-slice'
import {
  createInitialTab,
  getActiveTab,
  prepareTabForStorage,
  restoreJsonTab,
} from './tab-state'
import type { JsonLensState } from './types'

const LS_KEY = 'json-lens:store'

export const applyTheme = (dark: boolean) => {
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

const isIndentSize = (value: unknown): value is IndentSize =>
  INDENT_OPTIONS.includes(value as IndentSize)

const isTreeTheme = (value: unknown): value is TreeTheme =>
  TREE_THEME_OPTIONS.some(option => option.value === value)

const mergePersistedState = (persistedState: unknown, currentState: JsonLensState) => {
  const persisted = persistedState && typeof persistedState === 'object'
    ? persistedState as Partial<JsonLensState> & { input?: unknown }
    : {}
  const legacyInput = typeof persisted.input === 'string' ? persisted.input : SAMPLE
  const tabs = Array.isArray(persisted.tabs) && persisted.tabs.length > 0
    ? persisted.tabs.map(restoreJsonTab)
    : [createInitialTab(legacyInput)]
  const activeTabId = typeof persisted.activeTabId === 'string'
    && tabs.some(tab => tab.id === persisted.activeTabId)
    ? persisted.activeTabId
    : tabs[0].id

  return {
    ...currentState,
    tabs,
    activeTabId,
    dark: typeof persisted.dark === 'boolean' ? persisted.dark : currentState.dark,
    indentSize: isIndentSize(persisted.indentSize)
      ? persisted.indentSize
      : currentState.indentSize,
    treeTheme: isTreeTheme(persisted.treeTheme)
      ? persisted.treeTheme
      : currentState.treeTheme,
  }
}

export const useStore = create<JsonLensState>()(
  persist(
    (set, get, store) => ({
      ...createTabSlice(set, get, store),
      dark: false,
      indentSize: DEFAULT_INDENT_SIZE,
      treeTheme: DEFAULT_TREE_THEME,
      toggleTheme: () => {
        const dark = !get().dark
        set({ dark })
        applyTheme(dark)
      },
      setIndentSize: indentSize => set({ indentSize }),
      setTreeTheme: treeTheme => set({ treeTheme }),
    }),
    {
      name: LS_KEY,
      storage: createJSONStorage(() => localStorage),
      merge: mergePersistedState,
      partialize: state => ({
        tabs: state.tabs.map(prepareTabForStorage),
        activeTabId: state.activeTabId,
        dark: state.dark,
        indentSize: state.indentSize,
        treeTheme: state.treeTheme,
      }),
    },
  ),
)

export const selectActiveTab = (state: JsonLensState) => getActiveTab(state)

export type { JsonLensState, JsonTab } from './types'
