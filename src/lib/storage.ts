export const STORAGE_KEYS = {
  appState: 'current',
  splitLayout: 'deep-brace-json-split',
} as const;

/** react-resizable-panels 会给 autoSaveId 加前缀后再交给 storage */
export const getSplitLayoutStorageKey = () => `react-resizable-panels:${STORAGE_KEYS.splitLayout}`;
