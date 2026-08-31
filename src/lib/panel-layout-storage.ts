import type { PanelGroupStorage } from 'react-resizable-panels';
import {
  deleteIndexedDbValue,
  getIndexedDbValue,
  INDEXED_DB_STORES,
  putIndexedDbValue,
  reportIndexedDbFailure,
} from './indexed-db-storage';
import { getSplitLayoutStorageKey } from './storage';

const PANEL_GROUP_STORAGE_KEY = getSplitLayoutStorageKey();
const panelLayoutValues = new Map<string, string>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const hydratePanelLayoutStorage = async () => {
  const layouts = await getIndexedDbValue<Record<string, unknown>>(
    INDEXED_DB_STORES.panelLayout,
    PANEL_GROUP_STORAGE_KEY,
  );
  if (isRecord(layouts)) {
    panelLayoutValues.set(PANEL_GROUP_STORAGE_KEY, JSON.stringify(layouts));
  }
};

export const panelLayoutStorage: PanelGroupStorage = {
  getItem: name => panelLayoutValues.get(name) ?? null,
  setItem: (name, value) => {
    panelLayoutValues.set(name, value);
    try {
      const layouts = JSON.parse(value);
      if (!isRecord(layouts)) throw new Error('分栏布局不是有效对象');
      void putIndexedDbValue(INDEXED_DB_STORES.panelLayout, name, layouts).catch(
        reportIndexedDbFailure,
      );
    } catch (error) {
      reportIndexedDbFailure(error);
    }
  },
};

export const capturePanelLayoutSnapshot = () =>
  panelLayoutValues.get(PANEL_GROUP_STORAGE_KEY) ?? null;

export const clearPanelLayoutStorage = async () => {
  panelLayoutValues.delete(PANEL_GROUP_STORAGE_KEY);
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
    await putIndexedDbValue(INDEXED_DB_STORES.panelLayout, PANEL_GROUP_STORAGE_KEY, layouts);
  } catch (error) {
    reportIndexedDbFailure(error);
  }
};
