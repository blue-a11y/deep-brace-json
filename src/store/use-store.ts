import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CODE_FONT, isCodeFont, type CodeFont } from '../lib/code-font';
import { DEFAULT_INDENT_SIZE, INDENT_OPTIONS, type IndentSize } from '../lib/indent';
import { createIndexedDbPersistStorage, INDEXED_DB_STORES } from '../lib/indexed-db-storage';
import { clearPanelLayoutStorage, restorePanelLayoutSnapshot } from '../lib/panel-layout-storage';
import { parseInput } from '../lib/parse';
import { SAMPLE } from '../lib/sample';
import { DEFAULT_SHORTCUT_MODIFIERS, isShortcutModifiers } from '../lib/shortcuts';
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
  createDefaultTabs,
  getActiveTab,
  INITIAL_TAB_ID,
  prepareTabForStorage,
  restoreJsonTab,
} from './tab-state';
import type { DeepBraceState } from './types';

type PersistedDeepBraceState = Pick<
  DeepBraceState,
  | 'tabs'
  | 'activeTabId'
  | 'isDark'
  | 'codeFont'
  | 'indentSize'
  | 'treeTheme'
  | 'shouldShowFullLongStrings'
  | 'shortcutModifiers'
>;

const appStateStorage = createIndexedDbPersistStorage<PersistedDeepBraceState>(
  INDEXED_DB_STORES.appState,
);

export const applyTheme = (isDark: boolean) => {
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
};

export const applyCodeFont = (codeFont: CodeFont) => {
  document.documentElement.dataset.codeFont = codeFont;
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
      : createDefaultTabs(SAMPLE);
  const activeTabId =
    typeof persisted.activeTabId === 'string' && tabs.some(tab => tab.id === persisted.activeTabId)
      ? persisted.activeTabId
      : tabs[0].id;

  return {
    ...currentState,
    shortcutModifiers: isShortcutModifiers(persisted.shortcutModifiers)
      ? persisted.shortcutModifiers
      : DEFAULT_SHORTCUT_MODIFIERS,
    tabs,
    activeTabId,
    isDark: typeof persisted.isDark === 'boolean' ? persisted.isDark : currentState.isDark,
    codeFont: isCodeFont(persisted.codeFont) ? persisted.codeFont : currentState.codeFont,
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
      shortcutModifiers: DEFAULT_SHORTCUT_MODIFIERS,
      setShortcutModifiers: shortcutModifiers => {
        if (isShortcutModifiers(shortcutModifiers)) set({ shortcutModifiers });
      },
      isDark: false,
      codeFont: DEFAULT_CODE_FONT,
      indentSize: DEFAULT_INDENT_SIZE,
      treeTheme: DEFAULT_TREE_THEME,
      shouldShowFullLongStrings: true,
      toggleTheme: () => {
        const isDark = !get().isDark;
        set({ isDark });
        applyTheme(isDark);
      },
      setCodeFont: codeFont => {
        set({ codeFont });
        applyCodeFont(codeFont);
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
        get().cancelPendingParses();
        // 先冻结当前滚动元素；重挂载卸载旧编辑器时，清理回调不得写回旧位置。
        void captureActiveTabScrollPositions();
        // 内存缓存必须在 set 触发重挂载前同步清空；方法内部会等待旧数据落盘后再清库。
        const clearPersistence = Promise.all([
          clearTabScrollPositions(),
          clearPanelLayoutStorage(),
        ]);
        applyTheme(false);
        applyCodeFont(DEFAULT_CODE_FONT);
        const tabs = createDefaultTabs(SAMPLE).map(tab =>
          tab.input.trim() ? applyParseResult(tab, parseInput(tab.input)) : tab,
        );
        set(state => ({
          tabs,
          activeTabId: INITIAL_TAB_ID,
          shortcutModifiers: DEFAULT_SHORTCUT_MODIFIERS,
          isDark: false,
          codeFont: DEFAULT_CODE_FONT,
          indentSize: DEFAULT_INDENT_SIZE,
          treeTheme: DEFAULT_TREE_THEME,
          shouldShowFullLongStrings: true,
          resetEpoch: state.resetEpoch + 1,
        }));
        await Promise.all([clearPersistence, appStateStorage.flush()]);
      },

      restoreResetSnapshot: async snapshot => {
        get().cancelPendingParses();
        // 先冻结重置后的工作区，再按顺序恢复快照，避免异步清理覆盖撤销数据。
        void captureActiveTabScrollPositions();
        // 先同步恢复内存缓存，再重挂载工作区；IndexedDB 写入沿同一队列异步完成。
        const restorePersistence = Promise.all([
          restoreTabScrollSnapshot(snapshot.scroll),
          restorePanelLayoutSnapshot(snapshot.splitLayout),
        ]);
        applyTheme(snapshot.isDark);
        applyCodeFont(snapshot.codeFont);
        set(state => ({
          tabs: snapshot.tabs,
          shortcutModifiers: snapshot.shortcutModifiers,
          activeTabId: snapshot.activeTabId,
          isDark: snapshot.isDark,
          codeFont: snapshot.codeFont,
          indentSize: snapshot.indentSize,
          treeTheme: snapshot.treeTheme,
          shouldShowFullLongStrings: snapshot.shouldShowFullLongStrings,
          resetEpoch: state.resetEpoch + 1,
        }));
        if (snapshot.tabs.some(tab => tab.isDirty || tab.isParsing)) get().bootstrap();
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
        shortcutModifiers: state.shortcutModifiers,
        tabs: state.tabs.map(prepareTabForStorage),
        activeTabId: state.activeTabId,
        isDark: state.isDark,
        codeFont: state.codeFont,
        indentSize: state.indentSize,
        treeTheme: state.treeTheme,
        shouldShowFullLongStrings: state.shouldShowFullLongStrings,
      }),
    },
  ),
);

export const selectActiveTab = (state: DeepBraceState) => getActiveTab(state);

export type { JsonTab } from './types';
