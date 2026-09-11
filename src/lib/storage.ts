import { STORAGE_KEYS } from './storage-keys.js';

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
