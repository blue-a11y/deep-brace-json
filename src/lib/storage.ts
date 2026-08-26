export const STORAGE_KEYS = {
  splitLayout: 'deep-brace-json-split',
  store: 'deep-brace-json:store',
  tabScroll: 'deep-brace-json:tab-scroll',
} as const;

/** react-resizable-panels 会给 autoSaveId 加前缀后落盘,这是它实际读写的键 */
export const getSplitLayoutStorageKey = () => `react-resizable-panels:${STORAGE_KEYS.splitLayout}`;
