import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORKSPACE_PANEL_LAYOUT_KEY } from './panel-layout-config';
import { PANEL_LAYOUT_STORAGE_KEY } from './storage-keys';

const layouts = { [WORKSPACE_PANEL_LAYOUT_KEY]: { expandToSizes: {}, layout: [30, 70] } };
const snapshot = JSON.stringify(layouts);

const setup = async () => {
  const values = new Map<string, string>();
  const localStorage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
  const factory = new IDBFactory();
  vi.stubGlobal('indexedDB', factory);
  vi.stubGlobal('window', { localStorage });
  const adapter = await import('./panel-layout-storage');
  const database = await import('./indexed-db-storage');
  return { values, localStorage, factory, adapter, database };
};

beforeEach(() => vi.resetModules());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('panel layout persistence', () => {
  it('hydrates localStorage without opening IndexedDB', async () => {
    const { values, factory, adapter } = await setup();
    values.set(PANEL_LAYOUT_STORAGE_KEY, snapshot);
    await adapter.hydratePanelLayoutStorage();
    expect(adapter.capturePanelLayoutSnapshot()).toBe(snapshot);
    expect(await factory.databases()).toEqual([]);
  });

  it('migrates an existing layout and deletes it only after localStorage is saved', async () => {
    const { values, adapter, database } = await setup();
    await database.putIndexedDbValue(
      database.INDEXED_DB_STORES.panelLayout,
      PANEL_LAYOUT_STORAGE_KEY,
      layouts,
    );
    await adapter.hydratePanelLayoutStorage();
    expect(values.get(PANEL_LAYOUT_STORAGE_KEY)).toBe(snapshot);
    expect(adapter.capturePanelLayoutSnapshot()).toBe(snapshot);
    expect(
      await database.getIndexedDbValue(
        database.INDEXED_DB_STORES.panelLayout,
        PANEL_LAYOUT_STORAGE_KEY,
      ),
    ).toBeNull();
  });

  it('prefers the current localStorage layout over an old IndexedDB record', async () => {
    const { values, adapter, database } = await setup();
    const current = JSON.stringify({ [WORKSPACE_PANEL_LAYOUT_KEY]: { layout: [65, 35] } });
    values.set(PANEL_LAYOUT_STORAGE_KEY, current);
    await database.putIndexedDbValue(
      database.INDEXED_DB_STORES.panelLayout,
      PANEL_LAYOUT_STORAGE_KEY,
      layouts,
    );
    await adapter.hydratePanelLayoutStorage();
    expect(adapter.capturePanelLayoutSnapshot()).toBe(current);
    expect(values.get(PANEL_LAYOUT_STORAGE_KEY)).toBe(current);
  });

  it('persists the latest resize synchronously without writing IndexedDB', async () => {
    const { values, factory, adapter } = await setup();
    adapter.panelLayoutStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, snapshot);
    const latest = JSON.stringify({ [WORKSPACE_PANEL_LAYOUT_KEY]: { layout: [60, 40] } });
    adapter.panelLayoutStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, latest);
    expect(values.get(PANEL_LAYOUT_STORAGE_KEY)).toBe(latest);
    expect(adapter.capturePanelLayoutSnapshot()).toBe(latest);
    expect(await factory.databases()).toEqual([]);
  });

  it('updates the cache and localStorage before reset and undo promises settle', async () => {
    const { values, adapter, database } = await setup();
    adapter.panelLayoutStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, snapshot);
    await database.putIndexedDbValue(
      database.INDEXED_DB_STORES.panelLayout,
      PANEL_LAYOUT_STORAGE_KEY,
      layouts,
    );
    const cleared = adapter.clearPanelLayoutStorage();
    expect(adapter.capturePanelLayoutSnapshot()).toBeNull();
    expect(values.has(PANEL_LAYOUT_STORAGE_KEY)).toBe(false);
    await cleared;
    expect(
      await database.getIndexedDbValue(
        database.INDEXED_DB_STORES.panelLayout,
        PANEL_LAYOUT_STORAGE_KEY,
      ),
    ).toBeNull();
    const restored = adapter.restorePanelLayoutSnapshot(snapshot);
    expect(adapter.capturePanelLayoutSnapshot()).toBe(snapshot);
    expect(values.get(PANEL_LAYOUT_STORAGE_KEY)).toBe(snapshot);
    await restored;
    expect(
      await database.getIndexedDbValue(
        database.INDEXED_DB_STORES.panelLayout,
        PANEL_LAYOUT_STORAGE_KEY,
      ),
    ).toBeNull();
  });

  it('preserves the legacy layout when localStorage writes fail', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { localStorage, adapter, database } = await setup();
    localStorage.setItem.mockImplementation(() => {
      throw new Error('storage disabled');
    });
    await database.putIndexedDbValue(
      database.INDEXED_DB_STORES.panelLayout,
      PANEL_LAYOUT_STORAGE_KEY,
      layouts,
    );
    await adapter.hydratePanelLayoutStorage();
    expect(adapter.capturePanelLayoutSnapshot()).toBe(snapshot);
    expect(
      await database.getIndexedDbValue(
        database.INDEXED_DB_STORES.panelLayout,
        PANEL_LAYOUT_STORAGE_KEY,
      ),
    ).toEqual(layouts);
    adapter.panelLayoutStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, snapshot);
    expect(warning).toHaveBeenCalledOnce();
  });

  it('replaces malformed localStorage with the recoverable legacy layout', async () => {
    const { values, adapter, database } = await setup();
    values.set(PANEL_LAYOUT_STORAGE_KEY, '{broken');
    await database.putIndexedDbValue(
      database.INDEXED_DB_STORES.panelLayout,
      PANEL_LAYOUT_STORAGE_KEY,
      layouts,
    );
    await adapter.hydratePanelLayoutStorage();
    expect(values.get(PANEL_LAYOUT_STORAGE_KEY)).toBe(snapshot);
  });
});
