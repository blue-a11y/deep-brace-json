import type { PanelGroupStorage } from 'react-resizable-panels';
import {
  deleteIndexedDbValue,
  getIndexedDbValue,
  INDEXED_DB_STORES,
  reportIndexedDbFailure,
} from './indexed-db-storage';
import { getSplitLayoutStorageKey, readPanelLayout, writePanelLayout } from './storage';

const PANEL_GROUP_STORAGE_KEY = getSplitLayoutStorageKey();
const panelLayoutValues = new Map<string, string>();
let hasReportedStorageFailure = false;

const savePanelLayout = (value: string | null) => {
  const didSave = writePanelLayout(value);
  if (!didSave && !hasReportedStorageFailure && typeof window !== 'undefined') {
    hasReportedStorageFailure = true;
    console.warn('分栏宽度保存不可用，当前页面仅临时记忆。');
  }
  return didSave;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const hydratePanelLayoutStorage = async () => {
  const saved = readPanelLayout();
  if (saved !== null) {
    try {
      if (isRecord(JSON.parse(saved))) {
        panelLayoutValues.set(PANEL_GROUP_STORAGE_KEY, saved);
        return;
      }
    } catch {
      /* 非法记录使用旧布局或默认布局。 */
    }
  }
  // 旧版本仅在 IndexedDB 保存布局；写入新来源成功后再移除旧记录。
  const layouts = await getIndexedDbValue<Record<string, unknown>>(
    INDEXED_DB_STORES.panelLayout,
    PANEL_GROUP_STORAGE_KEY,
  );
  if (isRecord(layouts)) {
    const serialized = JSON.stringify(layouts);
    panelLayoutValues.set(PANEL_GROUP_STORAGE_KEY, serialized);
    if (savePanelLayout(serialized)) {
      await deleteIndexedDbValue(INDEXED_DB_STORES.panelLayout, PANEL_GROUP_STORAGE_KEY);
    }
  }
};

export const panelLayoutStorage: PanelGroupStorage = {
  getItem: name => panelLayoutValues.get(name) ?? null,
  setItem: (name, value) => {
    panelLayoutValues.set(name, value);
    try {
      const layouts = JSON.parse(value);
      if (!isRecord(layouts)) throw new Error('分栏布局不是有效对象');
      savePanelLayout(value);
    } catch (error) {
      reportIndexedDbFailure(error);
    }
  },
};

export const capturePanelLayoutSnapshot = () =>
  panelLayoutValues.get(PANEL_GROUP_STORAGE_KEY) ?? null;

export const clearPanelLayoutStorage = async () => {
  panelLayoutValues.delete(PANEL_GROUP_STORAGE_KEY);
  savePanelLayout(null);
  try {
    await deleteIndexedDbValue(INDEXED_DB_STORES.panelLayout, PANEL_GROUP_STORAGE_KEY);
  } catch (error) {
    reportIndexedDbFailure(error);
  }
};

export const restorePanelLayoutSnapshot = async (snapshot: string | null) => {
  if (snapshot === null) {
    await clearPanelLayoutStorage();
    return;
  }

  panelLayoutValues.set(PANEL_GROUP_STORAGE_KEY, snapshot);
  try {
    const layouts = JSON.parse(snapshot);
    if (!isRecord(layouts)) throw new Error('分栏布局不是有效对象');
    savePanelLayout(snapshot);
  } catch (error) {
    reportIndexedDbFailure(error);
  }
};
