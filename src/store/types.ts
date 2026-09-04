import type { CodeFont } from '../lib/code-font';
import type { IndentSize } from '../lib/indent';
import type { ParseResult } from '../lib/parse';
import type { SampleId } from '../lib/sample';
import type { ShortcutModifiers } from '../lib/shortcuts';
import type { TabScrollSnapshot } from '../lib/tab-scroll';
import type { TreeTheme } from '../lib/tree-theme';

export type JsonTab = {
  id: string;
  title: string;
  hasCustomTitle: boolean;
  input: string;
  result: ParseResult | null;
  isDirty: boolean;
  isParsing: boolean;
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
  cancelPendingParses: () => void;
  setActiveTab: (id: string) => void;
  /** insertIndex 指定时插入到该下标(越界时收敛到首尾),未指定时插入到当前激活标签之后 */
  openTab: (input?: string, title?: string, insertIndex?: number) => void;
  renameTab: (id: string, title: string) => boolean;
  closeTab: (id: string) => void;
  closeTabs: (ids: string[]) => void;
  /** 批量恢复时可禁用逐项激活,全部恢复后再统一选择活动标签。 */
  restoreTab: (tab: JsonTab, target: JsonTabRestoreTarget, shouldActivate?: boolean) => void;
  editInput: (value: string) => void;
  parse: (isQuiet?: boolean) => void;
  /** 以下变换类 action 返回是否成功（用于触发图标反馈动画） */
  format: () => boolean;
  minify: () => boolean;
  escape: () => boolean;
  unescape: () => boolean;
  loadSample: (sampleId?: SampleId) => void;
  clear: () => void;
  toggleWrap: () => void;
  toggleCollapse: (key: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
};

type PreferencesSlice = {
  shortcutModifiers: ShortcutModifiers;
  setShortcutModifiers: (value: ShortcutModifiers) => void;
  isDark: boolean;
  codeFont: CodeFont;
  indentSize: IndentSize;
  treeTheme: TreeTheme;
  shouldShowFullLongStrings: boolean;
  toggleTheme: () => void;
  setCodeFont: (value: CodeFont) => void;
  setIndentSize: (value: IndentSize) => void;
  setTreeTheme: (value: TreeTheme) => void;
  setShouldShowFullLongStrings: (value: boolean) => void;
};

/** 重置前状态的完整快照,用于 Toast 撤销恢复 */
export type ResetSnapshot = {
  shortcutModifiers: ShortcutModifiers;
  tabs: JsonTab[];
  activeTabId: string;
  isDark: boolean;
  codeFont: CodeFont;
  indentSize: IndentSize;
  treeTheme: TreeTheme;
  shouldShowFullLongStrings: boolean;
  scroll: TabScrollSnapshot;
  /** 分栏面板宽度的原始持久化值,撤销时还原;重置前不存在则为 null */
  splitLayout: string | null;
};

type AppResetSlice = {
  /** 重置代数:每次重置/撤销自增,作为工作区容器 key 驱动整棵子树重挂载 */
  resetEpoch: number;
  /** 清空全部数据恢复出厂默认:恢复示例和空白标签,偏好回到默认值,滚动/分栏记忆一并清除 */
  resetAll: () => Promise<void>;
  /** 撤销重置:恢复快照里的标签页、偏好、滚动与分栏布局 */
  restoreResetSnapshot: (snapshot: ResetSnapshot) => Promise<void>;
};

export type DeepBraceState = JsonTabsSlice & PreferencesSlice & AppResetSlice;
