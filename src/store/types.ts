import type { IndentSize } from '../lib/indent';
import type { ParseResult } from '../lib/parse';
import type { TabScrollSnapshot } from '../lib/tab-scroll';
import type { TreeTheme } from '../lib/tree-theme';

export type JsonTab = {
  id: string;
  title: string;
  input: string;
  result: ParseResult | null;
  isDirty: boolean;
  collapsed: Set<string>;
  touched: Set<string>;
  shouldWrap: boolean;
};

export type JsonTabRestoreTarget = {
  index: number;
  previousTabId?: string;
  nextTabId?: string;
};

export type JsonTabsSlice = {
  tabs: JsonTab[];
  activeTabId: string;
  bootstrap: () => void;
  setActiveTab: (id: string) => void;
  openTab: (input?: string, title?: string) => void;
  closeTab: (id: string) => void;
  restoreTab: (tab: JsonTab, target: JsonTabRestoreTarget) => void;
  editInput: (value: string) => void;
  parse: (isQuiet?: boolean) => void;
  /** 以下变换类 action 返回是否成功（用于触发图标反馈动画） */
  format: () => boolean;
  minify: () => boolean;
  escape: () => boolean;
  unescape: () => boolean;
  loadSample: () => void;
  clear: () => void;
  toggleWrap: () => void;
  toggleCollapse: (key: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
};

export type PreferencesSlice = {
  isDark: boolean;
  indentSize: IndentSize;
  treeTheme: TreeTheme;
  shouldShowFullLongStrings: boolean;
  toggleTheme: () => void;
  setIndentSize: (value: IndentSize) => void;
  setTreeTheme: (value: TreeTheme) => void;
  setShouldShowFullLongStrings: (value: boolean) => void;
};

/** 重置前状态的完整快照,用于 Toast 撤销恢复 */
export type ResetSnapshot = {
  tabs: JsonTab[];
  activeTabId: string;
  isDark: boolean;
  indentSize: IndentSize;
  treeTheme: TreeTheme;
  shouldShowFullLongStrings: boolean;
  scroll: TabScrollSnapshot;
  /** 分栏面板宽度的原始持久化值,撤销时还原;重置前不存在则为 null */
  splitLayout: string | null;
};

export type AppResetSlice = {
  /** 重置代数:每次重置/撤销自增,作为工作区容器 key 驱动整棵子树重挂载 */
  resetEpoch: number;
  /** 清空全部数据恢复出厂默认:仅保留示例标签页,偏好回到默认值,滚动/分栏记忆一并清除 */
  resetAll: () => Promise<void>;
  /** 撤销重置:恢复快照里的标签页、偏好、滚动与分栏布局 */
  restoreResetSnapshot: (snapshot: ResetSnapshot) => Promise<void>;
};

export type DeepBraceState = JsonTabsSlice & PreferencesSlice & AppResetSlice;
