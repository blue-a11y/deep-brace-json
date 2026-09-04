export const STORAGE_KEYS = {
  appState: 'current',
  splitLayout: 'deep-brace-json-split',
  tabGuideDismissed: 'deep-brace-json:tab-guide-dismissed',
} as const;

/** react-resizable-panels 会给 autoSaveId 加前缀后再交给 storage */
export const getSplitLayoutStorageKey = () => `react-resizable-panels:${STORAGE_KEYS.splitLayout}`;

export const isTabGuideDismissed = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.tabGuideDismissed) === 'true';
  } catch {
    return false;
  }
};

export const dismissTabGuide = () => {
  try {
    window.localStorage.setItem(STORAGE_KEYS.tabGuideDismissed, 'true');
    return true;
  } catch {
    return false;
  }
};
