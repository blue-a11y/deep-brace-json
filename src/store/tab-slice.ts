import type { StateCreator } from 'zustand';
import { startBackgroundParse, type ParseTask } from '../lib/background-parse';
import { isLargeResult, LARGE_INPUT_LENGTH } from '../lib/large-document';
import {
  collectContainerPaths,
  escapeText,
  parseInput,
  unescapeText,
  type ParseResult,
} from '../lib/parse';
import { isSampleId, SAMPLE, SAMPLE_OPTIONS } from '../lib/sample';
import { captureActiveTabScrollPositions } from '../lib/tab-scroll';
import { toast } from '../lib/toast';
import {
  applyParseResult,
  createDefaultTabs,
  createInitialTab,
  createJsonTab,
  createTabId,
  getActiveTab,
  getNextTabTitle,
  INITIAL_TAB_ID,
  updateJsonTab,
} from './tab-state';
import type { DeepBraceState, JsonTabsSlice } from './types';

const AUTO_PARSE_DELAY = 300;

const notifyResult = (result: ParseResult) => {
  if (result.ok && result.isDegraded) {
    toast.info(`已按纯文本字符串处理 · ${(result.data as string).length} 字符`);
  } else if (result.ok) {
    toast.success(`已解析 · ${result.stats.nodes} 节点 · 深度 ${result.stats.maxDepth}`);
  } else {
    toast.danger(`解析失败${result.line ? ` · ${result.line}:${result.column}` : ''}`, {
      description: result.message,
    });
  }
};

export const createTabSlice: StateCreator<DeepBraceState, [], [], JsonTabsSlice> = (set, get) => {
  const autoParseTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const parseTasks = new Map<string, ParseTask>();
  const cancelAutoParse = (id: string) => {
    clearTimeout(autoParseTimers.get(id));
    autoParseTimers.delete(id);
    parseTasks.get(id)?.cancel();
    parseTasks.delete(id);
  };

  const patchTab = (id: string, updater: Parameters<typeof updateJsonTab>[2]) =>
    set(state => ({ tabs: updateJsonTab(state.tabs, id, updater) }));

  const parseTab = (id: string, isQuiet = false, shouldPreserveView = false) => {
    cancelAutoParse(id);
    const tab = get().tabs.find(item => item.id === id);
    if (!tab) return;
    const apply = (result: ParseResult) => {
      patchTab(id, current => {
        const parsed = applyParseResult(current, result);
        return shouldPreserveView
          ? { ...parsed, collapsed: tab.collapsed, touched: tab.touched }
          : parsed;
      });
      if (!isQuiet) notifyResult(result);
    };
    if (tab.input.length < LARGE_INPUT_LENGTH) {
      apply(parseInput(tab.input));
      return;
    }
    const epoch = get().resetEpoch;
    patchTab(id, current => ({ ...current, isParsing: true }));
    const task = startBackgroundParse(tab.input, result => {
      if (parseTasks.get(id) !== task) return;
      parseTasks.delete(id);
      const current = get().tabs.find(item => item.id === id);
      if (!current || current.input !== tab.input || get().resetEpoch !== epoch) return;
      apply(result);
    });
    parseTasks.set(id, task);
  };

  const rewrite = (transform: (data: unknown) => string, successMessage: string) => {
    const tab = getActiveTab(get());
    cancelAutoParse(tab.id);
    const result = parseInput(tab.input);
    if (!result.ok) {
      patchTab(tab.id, current => ({ ...current, result, isDirty: false, isParsing: false }));
      notifyResult(result);
      return false;
    }
    patchTab(tab.id, current =>
      applyParseResult({ ...current, input: transform(result.data) }, result),
    );
    toast.success(successMessage);
    return true;
  };

  /** 直接把编辑器内容替换为给定文本并立即解析 */
  const rewriteInput = (nextInput: string, successMessage: string) => {
    const tab = getActiveTab(get());
    cancelAutoParse(tab.id);
    const result = parseInput(nextInput);
    patchTab(tab.id, current => applyParseResult({ ...current, input: nextInput }, result));
    toast.success(successMessage);
  };

  const closeTabs = (ids: string[]) => {
    const idsToClose = new Set(ids);
    const currentState = get();
    const existingTabs = currentState.tabs.filter(tab => idsToClose.has(tab.id));
    if (existingTabs.length === 0) return;
    if (idsToClose.has(currentState.activeTabId)) captureActiveTabScrollPositions();
    for (const tab of existingTabs) cancelAutoParse(tab.id);

    set(state => {
      const tabs = state.tabs.filter(tab => !idsToClose.has(tab.id));
      if (tabs.length === 0) {
        const tab = createInitialTab('');
        return { tabs: [tab], activeTabId: tab.id };
      }
      if (!idsToClose.has(state.activeTabId)) return { tabs };

      const activeIndex = state.tabs.findIndex(tab => tab.id === state.activeTabId);
      const nextActiveTab =
        state.tabs.slice(activeIndex + 1).find(tab => !idsToClose.has(tab.id)) ??
        state.tabs
          .slice(0, activeIndex)
          .toReversed()
          .find(tab => !idsToClose.has(tab.id));
      return { tabs, activeTabId: nextActiveTab?.id ?? tabs[0].id };
    });
  };

  return {
    tabs: createDefaultTabs(SAMPLE),
    activeTabId: INITIAL_TAB_ID,

    cancelPendingParses: () => {
      for (const id of new Set([...autoParseTimers.keys(), ...parseTasks.keys()]))
        cancelAutoParse(id);
    },

    bootstrap: () => {
      for (const tab of get().tabs) {
        if (tab.input.trim()) parseTab(tab.id, true, !tab.isDirty);
      }
    },

    setActiveTab: activeTabId => {
      if (activeTabId !== get().activeTabId && get().tabs.some(tab => tab.id === activeTabId)) {
        captureActiveTabScrollPositions();
        set({ activeTabId });
      }
    },

    openTab: (input = '', title, insertIndex) => {
      captureActiveTabScrollPositions();
      const id = createTabId();
      set(state => {
        const customTitle = title?.trim();
        const nextTitle = customTitle || getNextTabTitle(state.tabs);
        const baseTab = createJsonTab(input, nextTitle, id, true, Boolean(customTitle));
        const tab =
          input.trim() && input.length < LARGE_INPUT_LENGTH
            ? applyParseResult(baseTab, parseInput(input))
            : baseTab;
        const insertAt =
          typeof insertIndex === 'number'
            ? Math.min(Math.max(insertIndex, 0), state.tabs.length)
            : (() => {
                const activeIndex = state.tabs.findIndex(item => item.id === state.activeTabId);
                return activeIndex < 0 ? state.tabs.length : activeIndex + 1;
              })();
        const tabs = [...state.tabs.slice(0, insertAt), tab, ...state.tabs.slice(insertAt)];
        return { tabs, activeTabId: id };
      });
      if (input.length >= LARGE_INPUT_LENGTH) parseTab(id, true);
    },

    renameTab: (id, title) => {
      const nextTitle = title.trim();
      if (!nextTitle || !get().tabs.some(tab => tab.id === id)) return false;
      patchTab(id, tab =>
        tab.title === nextTitle && tab.hasCustomTitle
          ? tab
          : { ...tab, title: nextTitle, hasCustomTitle: true },
      );
      return true;
    },

    closeTab: id => closeTabs([id]),
    closeTabs,

    restoreTab: (tab, target, shouldActivate = true) => {
      if (shouldActivate && get().activeTabId !== tab.id) {
        void captureActiveTabScrollPositions();
      }
      const shouldRestore = !get().tabs.some(item => item.id === tab.id);
      set(state => {
        if (state.tabs.some(item => item.id === tab.id)) {
          return shouldActivate ? { activeTabId: tab.id } : state;
        }
        const nextIndex = target.nextTabId
          ? state.tabs.findIndex(item => item.id === target.nextTabId)
          : -1;
        const previousIndex = target.previousTabId
          ? state.tabs.findIndex(item => item.id === target.previousTabId)
          : -1;
        const insertAt =
          nextIndex >= 0
            ? nextIndex
            : previousIndex >= 0
              ? previousIndex + 1
              : Math.min(target.index, state.tabs.length);
        const tabs = [...state.tabs.slice(0, insertAt), tab, ...state.tabs.slice(insertAt)];
        return { tabs, activeTabId: shouldActivate ? tab.id : state.activeTabId };
      });
      if (shouldRestore && (tab.isDirty || tab.isParsing)) {
        autoParseTimers.set(
          tab.id,
          setTimeout(() => parseTab(tab.id, true, !tab.isDirty), AUTO_PARSE_DELAY),
        );
      }
    },

    editInput: input => {
      const id = get().activeTabId;
      cancelAutoParse(id);
      patchTab(id, tab => ({ ...tab, input, isDirty: true, isParsing: false }));
      autoParseTimers.set(
        id,
        setTimeout(() => parseTab(id, true), AUTO_PARSE_DELAY),
      );
    },

    parse: (isQuiet = false) => parseTab(get().activeTabId, isQuiet),
    format: () => rewrite(data => JSON.stringify(data, null, 2), '已格式化 · JSON5 → 标准 JSON'),
    minify: () => rewrite(data => JSON.stringify(data), '已压缩为单行'),

    escape: () => {
      rewriteInput(escapeText(getActiveTab(get()).input), '已转义 · 包成字符串字面量');
      return true;
    },
    unescape: () => {
      const nextInput = unescapeText(getActiveTab(get()).input);
      if (nextInput == null) {
        toast.warning('没有可反转义的内容', {
          description: '需要 JSON 字符串字面量，或保留转义的裸容器文本',
        });
        return false;
      }
      rewriteInput(nextInput, '已反转义 · 剥开一层');
      return true;
    },

    loadSample: (sampleId = 'default') => {
      if (!isSampleId(sampleId)) return;
      const id = get().activeTabId;
      cancelAutoParse(id);
      if (sampleId === 'default') {
        patchTab(id, tab => applyParseResult({ ...tab, input: SAMPLE }, parseInput(SAMPLE)));
        toast.info('已载入示例');
        return;
      }
      const originalInput = getActiveTab(get()).input;
      const epoch = get().resetEpoch;
      patchTab(id, tab => ({ ...tab, isParsing: true }));
      const task = startBackgroundParse({ sample: sampleId }, (result, sampleInput) => {
        if (parseTasks.get(id) !== task) return;
        parseTasks.delete(id);
        const current = get().tabs.find(tab => tab.id === id);
        if (!current || current.input !== originalInput || get().resetEpoch !== epoch) return;
        if (!result.ok || sampleInput === undefined) {
          patchTab(id, tab => ({ ...tab, isParsing: false }));
          toast.danger(result.ok ? '示例生成失败，请重试' : result.message);
          return;
        }
        patchTab(id, tab => applyParseResult({ ...tab, input: sampleInput }, result));
        toast.info(`已载入${SAMPLE_OPTIONS.find(option => option.id === sampleId)!.label}`);
      });
      parseTasks.set(id, task);
    },

    clear: () => {
      const id = get().activeTabId;
      cancelAutoParse(id);
      patchTab(id, tab => ({
        ...tab,
        input: '',
        result: null,
        isDirty: false,
        isParsing: false,
        collapsed: new Set<string>(),
        touched: new Set<string>(),
      }));
      toast('已清空');
    },

    toggleWrap: () => {
      const id = get().activeTabId;
      patchTab(id, tab => ({ ...tab, shouldWrap: !tab.shouldWrap }));
    },

    toggleCollapse: key => {
      const id = get().activeTabId;
      patchTab(id, tab => {
        const collapsed = new Set(tab.collapsed);
        if (collapsed.has(key)) collapsed.delete(key);
        else collapsed.add(key);
        const touched = new Set(tab.touched).add(key);
        return { ...tab, collapsed, touched };
      });
    },

    expandAll: () => {
      const id = get().activeTabId;
      patchTab(id, tab => ({ ...tab, collapsed: new Set<string>() }));
    },

    collapseAll: () => {
      const id = get().activeTabId;
      patchTab(id, tab => {
        if (!tab.result?.ok) return tab;
        const collapsed =
          tab.input.length >= LARGE_INPUT_LENGTH || isLargeResult(tab.result)
            ? new Set(['[]'])
            : collectContainerPaths(tab.result.data, 'all');
        const touched = new Set(tab.touched);
        for (const key of collapsed) touched.add(key);
        return { ...tab, collapsed, touched };
      });
    },
  };
};
