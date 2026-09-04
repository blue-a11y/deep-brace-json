import type { ParseResult } from '../lib/parse';
import type { JsonTab } from './types';

export const INITIAL_TAB_ID = 'json-tab-1';
const SECOND_INITIAL_TAB_ID = 'json-tab-2';
let tabIdSequence = 0;

export const createTabId = (): string => `json-tab-${Date.now().toString(36)}-${++tabIdSequence}`;

export const createJsonTab = (
  input = '',
  title = 'JSON 1',
  id = createTabId(),
  shouldWrap = true,
  hasCustomTitle = false,
): JsonTab => ({
  id,
  title,
  hasCustomTitle,
  input,
  result: null,
  isDirty: false,
  isParsing: false,
  collapsed: new Set<string>(),
  touched: new Set<string>(),
  shouldWrap,
});

export const createInitialTab = (input: string): JsonTab =>
  createJsonTab(input, 'JSON 1', INITIAL_TAB_ID);

export const createDefaultTabs = (sampleInput: string): JsonTab[] => [
  createInitialTab(sampleInput),
  createJsonTab('', 'JSON 2', SECOND_INITIAL_TAB_ID),
];

export const getActiveTab = (state: { tabs: JsonTab[]; activeTabId: string }): JsonTab =>
  state.tabs.find(tab => tab.id === state.activeTabId) ?? state.tabs[0];

export const updateJsonTab = (
  tabs: JsonTab[],
  id: string,
  updater: (tab: JsonTab) => JsonTab,
): JsonTab[] => tabs.map(tab => (tab.id === id ? updater(tab) : tab));

export const applyParseResult = (tab: JsonTab, result: ParseResult): JsonTab =>
  result.ok
    ? {
        ...tab,
        result,
        isDirty: false,
        isParsing: false,
        collapsed: new Set<string>(),
        touched: new Set<string>(),
      }
    : { ...tab, result, isDirty: false, isParsing: false };

export const getNextTabTitle = (tabs: JsonTab[]): string => {
  const maxIndex = tabs.reduce((max, tab) => {
    const match = tab.title.match(/^JSON (\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `JSON ${maxIndex + 1}`;
};

/** 折叠/触碰键持久化为节点路径,同一份内容刷新后键不变,可精确还原到节点;
    touched 一并持久化让折叠子树刷新后以 grid 0fr 挂载,展开时保留过渡动画 */
const restoreStringKeySet = (value: unknown): Set<string> => {
  const keys = value instanceof Set ? value : Array.isArray(value) ? value : [];
  return new Set([...keys].filter((key): key is string => typeof key === 'string'));
};

export const restoreJsonTab = (value: unknown, index: number): JsonTab => {
  const stored = value && typeof value === 'object' ? (value as Partial<JsonTab>) : {};
  const input = typeof stored.input === 'string' ? stored.input : '';
  const title = typeof stored.title === 'string' ? stored.title : `JSON ${index + 1}`;
  const id = typeof stored.id === 'string' ? stored.id : createTabId();
  const shouldWrap = typeof stored.shouldWrap === 'boolean' ? stored.shouldWrap : true;
  const hasCustomTitle =
    typeof stored.hasCustomTitle === 'boolean' ? stored.hasCustomTitle : !/^JSON \d+$/.test(title);
  return {
    ...createJsonTab(input, title, id, shouldWrap, hasCustomTitle),
    collapsed: restoreStringKeySet(stored.collapsed),
    touched: restoreStringKeySet(stored.touched),
  };
};

export const prepareTabForStorage = (tab: JsonTab): JsonTab => ({
  ...tab,
  result: null,
  isDirty: false,
  isParsing: false,
  // 编辑后到自动解析前仍显示旧树,但旧树的节点状态不能随新输入落库。
  collapsed: tab.isDirty ? new Set<string>() : tab.collapsed,
  touched: tab.isDirty ? new Set<string>() : tab.touched,
});
