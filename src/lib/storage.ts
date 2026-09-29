import { PANEL_LAYOUT_STORAGE_KEY, STORAGE_KEYS } from './storage-keys.js';

export { STORAGE_KEYS } from './storage-keys.js';

export const readColorMode = (): 'light' | 'dark' | null => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEYS.colorMode);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
};

export const writeColorMode = (isDark: boolean) => {
  try {
    window.localStorage.setItem(STORAGE_KEYS.colorMode, isDark ? 'dark' : 'light');
    return true;
  } catch {
    // 禁用存储时继续使用内存主题，不影响骨架和工作区启动。
    return false;
  }
};

export const getInitialIsDark = () => {
  const colorMode = readColorMode();
  if (colorMode) return colorMode === 'dark';
  return (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  );
};

/** react-resizable-panels 会给 autoSaveId 加前缀后再交给 storage */
export const getSplitLayoutStorageKey = () => PANEL_LAYOUT_STORAGE_KEY;

export const readPanelLayout = () => {
  try {
    return window.localStorage.getItem(PANEL_LAYOUT_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const writePanelLayout = (layout: string | null) => {
  try {
    if (layout === null) window.localStorage.removeItem(PANEL_LAYOUT_STORAGE_KEY);
    else window.localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, layout);
    return true;
  } catch {
    return false;
  }
};

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
