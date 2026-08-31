import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_INDENT_SIZE, INDENT_OPTIONS, type IndentSize } from '../lib/indent';
import { createIndexedDbPersistStorage, INDEXED_DB_STORES } from '../lib/indexed-db-storage';
import { clearPanelLayoutStorage, restorePanelLayoutSnapshot } from '../lib/panel-layout-storage';
import { parseInput } from '../lib/parse';
import { SAMPLE } from '../lib/sample';
import { STORAGE_KEYS } from '../lib/storage';
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

type PersistedDeepBraceState = Pick<
  DeepBraceState,
  'tabs' | 'activeTabId' | 'isDark' | 'indentSize' | 'treeTheme' | 'shouldShowFullLongStrings'
>;

const appStateStorage = createIndexedDbPersistStorage<PersistedDeepBraceState>(
  INDEXED_DB_STORES.appState,
);

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
      ? (persistedState as Partial<PersistedDeepBraceState>)
      : {};
  const tabs =
    Array.isArray(persisted.tabs) && persisted.tabs.length > 0
      ? persisted.tabs.map(restoreJsonTab)
      : [createInitialTab(SAMPLE)];
  const activeTabId =
    typeof persisted.activeTabId === 'string' && tabs.some(tab => tab.id === persisted.activeTabId)
      ? persisted.activeTabId
      : tabs[0].id;

  return {
    ...currentState,
    tabs,
    activeTabId,
    isDark: typeof persisted.isDark === 'boolean' ? persisted.isDark : currentState.isDark,
    indentSize: isIndentSize(persisted.indentSize) ? persisted.indentSize : currentState.indentSize,
    treeTheme: isTreeTheme(persisted.treeTheme) ? persisted.treeTheme : currentState.treeTheme,
    shouldShowFullLongStrings:
      typeof persisted.shouldShowFullLongStrings === 'boolean'
        ? persisted.shouldShowFullLongStrings
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
      setIndentSize: indentSize => {
        set({ indentSize });
      },
      setTreeTheme: treeTheme => {
        set({ treeTheme });
      },
      setShouldShowFullLongStrings: shouldShowFullLongStrings => {
        set({ shouldShowFullLongStrings });
      },

      resetEpoch: 0,

      resetAll: async () => {
        // 先冻结当前滚动元素；重挂载卸载旧编辑器时，清理回调不得写回旧位置。
        void captureActiveTabScrollPositions();
        // 内存缓存必须在 set 触发重挂载前同步清空；方法内部会等待旧数据落盘后再清库。
        const clearPersistence = Promise.all([
          clearTabScrollPositions(),
          clearPanelLayoutStorage(),
        ]);
        applyTheme(false);
        set(state => ({
          tabs: [applyParseResult(createInitialTab(SAMPLE), parseInput(SAMPLE))],
          activeTabId: 'json-tab-1',
          isDark: false,
          indentSize: DEFAULT_INDENT_SIZE,
          treeTheme: DEFAULT_TREE_THEME,
          shouldShowFullLongStrings: true,
          resetEpoch: state.resetEpoch + 1,
        }));
        await Promise.all([clearPersistence, appStateStorage.flush()]);
      },

      restoreResetSnapshot: async snapshot => {
        // 先冻结重置后的工作区，再按顺序恢复快照，避免异步清理覆盖撤销数据。
        void captureActiveTabScrollPositions();
        // 先同步恢复内存缓存，再重挂载工作区；IndexedDB 写入沿同一队列异步完成。
        const restorePersistence = Promise.all([
          restoreTabScrollSnapshot(snapshot.scroll),
          restorePanelLayoutSnapshot(snapshot.splitLayout),
        ]);
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
        await Promise.all([restorePersistence, appStateStorage.flush()]);
      },
    }),
    {
      name: STORAGE_KEYS.appState,
      storage: appStateStorage,
      skipHydration: true,
      version: 1,
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
