import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_INDENT_SIZE, INDENT_OPTIONS, type IndentSize } from '../lib/indent';
import { parseInput } from '../lib/parse';
import { SAMPLE } from '../lib/sample';
import { getSplitLayoutStorageKey, STORAGE_KEYS } from '../lib/storage';
import {
  captureActiveTabScrollPositions,
  clearTabScrollPositions,
  restoreTabScrollSnapshot,
} from '../lib/tab-scroll';
import { DEFAULT_TREE_THEME, TREE_THEME_OPTIONS, type TreeTheme } from '../lib/tree-theme';
import { createTabSlice } from './tab-slice';
import {
  applyParseResult,
  createInitialTab,
  getActiveTab,
  prepareTabForStorage,
  restoreJsonTab,
} from './tab-state';
import type { DeepBraceState } from './types';

export const applyTheme = (isDark: boolean) => {
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
};

const isIndentSize = (value: unknown): value is IndentSize =>
  INDENT_OPTIONS.includes(value as IndentSize);

const isTreeTheme = (value: unknown): value is TreeTheme =>
  TREE_THEME_OPTIONS.some(option => option.value === value);

const mergePersistedState = (persistedState: unknown, currentState: DeepBraceState) => {
  const persisted =
    persistedState && typeof persistedState === 'object'
      ? (persistedState as Partial<DeepBraceState> & {
          dark?: unknown;
          input?: unknown;
          showFullLongStrings?: unknown;
        })
      : {};
  const legacyInput = typeof persisted.input === 'string' ? persisted.input : SAMPLE;
  const tabs =
    Array.isArray(persisted.tabs) && persisted.tabs.length > 0
      ? persisted.tabs.map(restoreJsonTab)
      : [createInitialTab(legacyInput)];
  const activeTabId =
    typeof persisted.activeTabId === 'string' && tabs.some(tab => tab.id === persisted.activeTabId)
      ? persisted.activeTabId
      : tabs[0].id;

  return {
    ...currentState,
    tabs,
    activeTabId,
    isDark:
      typeof persisted.isDark === 'boolean'
        ? persisted.isDark
        : typeof persisted.dark === 'boolean'
          ? persisted.dark
          : currentState.isDark,
    indentSize: isIndentSize(persisted.indentSize) ? persisted.indentSize : currentState.indentSize,
    treeTheme: isTreeTheme(persisted.treeTheme) ? persisted.treeTheme : currentState.treeTheme,
    shouldShowFullLongStrings:
      typeof persisted.shouldShowFullLongStrings === 'boolean'
        ? persisted.shouldShowFullLongStrings
        : typeof persisted.showFullLongStrings === 'boolean'
          ? persisted.showFullLongStrings
          : currentState.shouldShowFullLongStrings,
  };
};

export const useStore = create<DeepBraceState>()(
  persist(
    (set, get, store) => ({
      ...createTabSlice(set, get, store),
      isDark: false,
      indentSize: DEFAULT_INDENT_SIZE,
      treeTheme: DEFAULT_TREE_THEME,
      shouldShowFullLongStrings: true,
      toggleTheme: () => {
        const isDark = !get().isDark;
        set({ isDark });
        applyTheme(isDark);
      },
      setIndentSize: indentSize => set({ indentSize }),
      setTreeTheme: treeTheme => set({ treeTheme }),
      setShouldShowFullLongStrings: shouldShowFullLongStrings => {
        set({ shouldShowFullLongStrings });
      },

      resetEpoch: 0,

      resetAll: () => {
        // 先冻结当前滚动元素:重挂载卸载旧编辑器时,清理回调不得把旧位置写回存储
        captureActiveTabScrollPositions();
        clearTabScrollPositions();
        try {
          localStorage.removeItem(getSplitLayoutStorageKey());
        } catch {
          // 本地存储不可用时跳过,分栏宽度随重挂载回到默认值。
        }
        applyTheme(false);
        set(state => ({
          // bootstrap 只在启动时解析一次,重置发生在运行时,须立即解析示例供树形预览展示
          tabs: [applyParseResult(createInitialTab(SAMPLE), parseInput(SAMPLE))],
          activeTabId: 'json-tab-1',
          isDark: false,
          indentSize: DEFAULT_INDENT_SIZE,
          treeTheme: DEFAULT_TREE_THEME,
          shouldShowFullLongStrings: true,
          resetEpoch: state.resetEpoch + 1,
        }));
      },

      restoreResetSnapshot: snapshot => {
        // 冻结当前编辑器:被换下的标签页卸载时,清理回调不得覆盖恢复的滚动快照
        captureActiveTabScrollPositions();
        restoreTabScrollSnapshot(snapshot.scroll);
        try {
          if (snapshot.splitLayout == null) {
            localStorage.removeItem(getSplitLayoutStorageKey());
          } else {
            localStorage.setItem(getSplitLayoutStorageKey(), snapshot.splitLayout);
          }
        } catch {
          // 本地存储不可用时跳过,分栏宽度维持当前值。
        }
        applyTheme(snapshot.isDark);
        set(state => ({
          tabs: snapshot.tabs,
          activeTabId: snapshot.activeTabId,
          isDark: snapshot.isDark,
          indentSize: snapshot.indentSize,
          treeTheme: snapshot.treeTheme,
          shouldShowFullLongStrings: snapshot.shouldShowFullLongStrings,
          resetEpoch: state.resetEpoch + 1,
        }));
      },
    }),
    {
      name: STORAGE_KEYS.store,
      storage: createJSONStorage(() => localStorage),
      merge: mergePersistedState,
      partialize: state => ({
        tabs: state.tabs.map(prepareTabForStorage),
        activeTabId: state.activeTabId,
        isDark: state.isDark,
        indentSize: state.indentSize,
        treeTheme: state.treeTheme,
        shouldShowFullLongStrings: state.shouldShowFullLongStrings,
      }),
    },
  ),
);

export const selectActiveTab = (state: DeepBraceState) => getActiveTab(state);

export type { DeepBraceState, JsonTab } from './types';
