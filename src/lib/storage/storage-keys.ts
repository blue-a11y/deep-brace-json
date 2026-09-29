/** 浏览器存储与 HTML 首屏脚本共用；保持纯常量，允许构建工具导入。 */
export const STORAGE_KEYS = {
  appState: 'current',
  splitLayout: 'deep-brace-json-split',
  tabGuideDismissed: 'deep-brace-json:tab-guide-dismissed',
  colorMode: 'deep-brace-json:color-mode',
} as const;

export const PANEL_LAYOUT_STORAGE_KEY = `react-resizable-panels:${STORAGE_KEYS.splitLayout}`;
