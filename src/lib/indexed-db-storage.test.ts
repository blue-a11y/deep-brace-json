import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createIndexedDbPersistStorage,
  getAllIndexedDbEntries,
  getIndexedDbValue,
  INDEXED_DB_NAME,
  INDEXED_DB_STORES,
  putIndexedDbEntries,
  putIndexedDbValue,
} from './indexed-db-storage';
import {
  capturePanelLayoutSnapshot,
  clearPanelLayoutStorage,
  panelLayoutStorage,
  restorePanelLayoutSnapshot,
} from './panel-layout-storage';
import { STORAGE_KEYS } from './storage';
import {
  captureTabScrollSnapshot,
  clearTabScrollPositions,
  hydrateTabScrollStorage,
  restoreTabScrollSnapshot,
} from './tab-scroll';

type TestState = {
  activeTabId: string;
  isDark: boolean;
};

const createDeferred = () => {
  let resolve = () => {};
  const promise = new Promise<void>(resolvePromise => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const openRawDatabase = (version?: number) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request =
      version === undefined
        ? indexedDB.open(INDEXED_DB_NAME)
        : indexedDB.open(INDEXED_DB_NAME, version);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const createVersionTwoDatabase = async () => {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, 2);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('key-value');
      request.result.createObjectStore(INDEXED_DB_STORES.appState, { keyPath: 'id' });
      request.result.createObjectStore(INDEXED_DB_STORES.panelLayout, { keyPath: 'id' });
      request.result.createObjectStore(INDEXED_DB_STORES.tabScroll, {
        keyPath: ['tabId', 'area'],
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
};

describe('structured IndexedDB storage', () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: new IDBFactory(),
    });
    await createVersionTwoDatabase();
  });

  it('recreates v2 stores with out-of-line keys', async () => {
    await putIndexedDbValue(INDEXED_DB_STORES.appState, 'schema-probe', { isDark: false });

    const database = await openRawDatabase();
    expect(database.version).toBe(3);
    expect([...database.objectStoreNames]).toEqual([
      INDEXED_DB_STORES.appState,
      INDEXED_DB_STORES.panelLayout,
      INDEXED_DB_STORES.tabScroll,
    ]);
    expect(database.objectStoreNames.contains('key-value')).toBe(false);
    const transaction = database.transaction(Object.values(INDEXED_DB_STORES), 'readonly');
    for (const storeName of Object.values(INDEXED_DB_STORES)) {
      expect(transaction.objectStore(storeName).keyPath).toBeNull();
    }
    database.close();
  });

  it('preserves structured-clone values without JSON serialization', async () => {
    const value = {
      tabs: [
        {
          id: 'tab-a',
          collapsed: new Set(['/items/0']),
          input: '{"ok":true}',
        },
      ],
    };
    await putIndexedDbValue(INDEXED_DB_STORES.appState, 'structured-clone', value);

    const restored = await getIndexedDbValue<typeof value>(
      INDEXED_DB_STORES.appState,
      'structured-clone',
    );
    expect(restored).toStrictEqual(value);
    expect(restored).not.toHaveProperty('id');
    expect(restored?.tabs[0].collapsed).toBeInstanceOf(Set);
  });

  it('maps Zustand persist metadata while keeping state fields at the record root', async () => {
    const storage = createIndexedDbPersistStorage<TestState>(INDEXED_DB_STORES.appState);
    const state = { activeTabId: 'tab-a', isDark: true };
    await storage.setItem('current', { state, version: 3 });

    const rawValue = await getIndexedDbValue<Record<string, unknown>>(
      INDEXED_DB_STORES.appState,
      'current',
    );
    expect(rawValue).toEqual({ persistVersion: 3, ...state });
    expect(rawValue).not.toHaveProperty('id');
    expect(rawValue).not.toHaveProperty('state');
    await expect(storage.getItem('current')).resolves.toEqual({ state, version: 3 });
  });

  it('waits for queued Zustand writes through the explicit flush barrier', async () => {
    const storage = createIndexedDbPersistStorage<TestState>(INDEXED_DB_STORES.appState);
    const state = { activeTabId: 'flush-tab', isDark: false };

    void storage.setItem('flush-probe', { state, version: 4 });
    await storage.flush();

    await expect(
      getIndexedDbValue<Record<string, unknown>>(INDEXED_DB_STORES.appState, 'flush-probe'),
    ).resolves.toEqual({ persistVersion: 4, ...state });
  });

  it('stores scroll positions as independently addressable composite-key records', async () => {
    const entries = [
      {
        key: ['tab-a', 'editor'],
        value: { left: 0, top: 120, version: 1 },
      },
      {
        key: ['tab-a', 'tree'],
        value: { left: 4, top: 240, version: 1 },
      },
    ];
    await putIndexedDbEntries(INDEXED_DB_STORES.tabScroll, entries);

    const editorValue = await getIndexedDbValue<(typeof entries)[number]['value']>(
      INDEXED_DB_STORES.tabScroll,
      ['tab-a', 'editor'],
    );
    const storedEntries = await getAllIndexedDbEntries<(typeof entries)[number]['value']>(
      INDEXED_DB_STORES.tabScroll,
    );
    expect(editorValue).toStrictEqual(entries[0].value);
    expect(editorValue).not.toHaveProperty('tabId');
    expect(editorValue).not.toHaveProperty('area');
    expect(storedEntries).toHaveLength(2);
  });

  it('keeps panel layout JSON only at the component boundary', async () => {
    const id = `react-resizable-panels:${STORAGE_KEYS.splitLayout}`;
    const layouts = {
      'panel-key': {
        expandToSizes: {},
        layout: [80, 20],
      },
    };
    panelLayoutStorage.setItem(id, JSON.stringify(layouts));

    await vi.waitFor(async () => {
      const value = await getIndexedDbValue(INDEXED_DB_STORES.panelLayout, id);
      expect(value).toStrictEqual(layouts);
    });
  });

  it('switches the panel layout cache synchronously during reset and undo', async () => {
    const id = `react-resizable-panels:${STORAGE_KEYS.splitLayout}`;
    const snapshot = JSON.stringify({ workspace: { layout: [80, 20] } });
    panelLayoutStorage.setItem(id, snapshot);

    const clearPromise = clearPanelLayoutStorage();
    expect(capturePanelLayoutSnapshot()).toBeNull();
    expect(panelLayoutStorage.getItem(id)).toBeNull();
    await clearPromise;
    await expect(getIndexedDbValue(INDEXED_DB_STORES.panelLayout, id)).resolves.toBeNull();

    const restorePromise = restorePanelLayoutSnapshot(snapshot);
    expect(capturePanelLayoutSnapshot()).toBe(snapshot);
    expect(panelLayoutStorage.getItem(id)).toBe(snapshot);
    await restorePromise;
    await expect(getIndexedDbValue(INDEXED_DB_STORES.panelLayout, id)).resolves.toStrictEqual(
      JSON.parse(snapshot),
    );
  });

  it('switches the scroll cache synchronously during reset and undo', async () => {
    await putIndexedDbValue(INDEXED_DB_STORES.tabScroll, ['reset-tab', 'tree'], {
      left: 0,
      top: 640,
      isPinnedToBottom: false,
      isPinnedToRight: false,
      version: 1,
    });
    await hydrateTabScrollStorage();
    const snapshot = captureTabScrollSnapshot();
    expect([...snapshot.keys()]).toContain('reset-tab:tree');

    const clearPromise = clearTabScrollPositions();
    expect(captureTabScrollSnapshot().size).toBe(0);
    await clearPromise;

    const restorePromise = restoreTabScrollSnapshot(snapshot);
    expect([...captureTabScrollSnapshot()]).toStrictEqual([...snapshot]);
    await restorePromise;
  });

  it('waits for the app-state barrier before reset and undo action promises settle', async () => {
    const toastMock = Object.assign(vi.fn(), {
      close: vi.fn(),
      danger: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
      warning: vi.fn(),
    });
    vi.doMock('./toast', () => ({ toast: toastMock }));
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        documentElement: {
          classList: { toggle: vi.fn() },
          dataset: {},
        },
      },
    });

    const { useStore } = await import('../store/use-store');
    const storage = useStore.persist.getOptions().storage;
    if (!storage || !('flush' in storage) || typeof storage.flush !== 'function') {
      throw new Error('app-state storage 必须提供 flush 完成屏障');
    }

    const flushableStorage = storage as typeof storage & { flush: () => Promise<void> };
    const originalFlush = flushableStorage.flush.bind(flushableStorage);
    const resetGate = createDeferred();
    const restoreGate = createDeferred();
    const flushSpy = vi.spyOn(flushableStorage, 'flush').mockImplementation(async () => {
      await resetGate.promise;
      await originalFlush();
    });

    try {
      useStore.getState().setShouldShowFullLongStrings(false);
      await originalFlush();
      const stateBeforeReset = useStore.getState();
      const snapshot = {
        tabs: stateBeforeReset.tabs,
        activeTabId: stateBeforeReset.activeTabId,
        isDark: stateBeforeReset.isDark,
        indentSize: stateBeforeReset.indentSize,
        treeTheme: stateBeforeReset.treeTheme,
        shouldShowFullLongStrings: stateBeforeReset.shouldShowFullLongStrings,
        scroll: new Map(),
        splitLayout: null,
      };

      let hasResetSettled = false;
      const resetPromise = useStore
        .getState()
        .resetAll()
        .then(() => {
          hasResetSettled = true;
        });
      await vi.waitFor(() => expect(flushSpy).toHaveBeenCalledTimes(1));
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(hasResetSettled).toBe(false);
      resetGate.resolve();
      await resetPromise;
      await expect(
        getIndexedDbValue<Record<string, unknown>>(INDEXED_DB_STORES.appState, 'current'),
      ).resolves.toMatchObject({ shouldShowFullLongStrings: true });

      flushSpy.mockImplementation(async () => {
        await restoreGate.promise;
        await originalFlush();
      });
      let hasRestoreSettled = false;
      const restorePromise = useStore
        .getState()
        .restoreResetSnapshot(snapshot)
        .then(() => {
          hasRestoreSettled = true;
        });
      await vi.waitFor(() => expect(flushSpy).toHaveBeenCalledTimes(2));
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(hasRestoreSettled).toBe(false);
      restoreGate.resolve();
      await restorePromise;
      await expect(
        getIndexedDbValue<Record<string, unknown>>(INDEXED_DB_STORES.appState, 'current'),
      ).resolves.toMatchObject({ shouldShowFullLongStrings: false });
    } finally {
      resetGate.resolve();
      restoreGate.resolve();
      flushSpy.mockRestore();
      if (documentDescriptor) {
        Object.defineProperty(globalThis, 'document', documentDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'document');
      }
      vi.doUnmock('./toast');
    }
  });
});
