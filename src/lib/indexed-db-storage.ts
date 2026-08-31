import type { PersistStorage } from 'zustand/middleware';

export const INDEXED_DB_NAME = 'deep-brace-json';

export const INDEXED_DB_STORES = {
  appState: 'app-state',
  panelLayout: 'panel-layout',
  tabScroll: 'tab-scroll',
} as const;

export type IndexedDbStoreName = (typeof INDEXED_DB_STORES)[keyof typeof INDEXED_DB_STORES];

const DATABASE_VERSION = 3;
const LEGACY_OBJECT_STORE_NAME = 'key-value';
const PERSIST_VERSION_FIELD = 'persistVersion';

let databasePromise: Promise<IDBDatabase> | null = null;
let hasReportedFailure = false;

export const reportIndexedDbFailure = (error: unknown) => {
  if (hasReportedFailure) return;
  hasReportedFailure = true;
  console.warn('IndexedDB 持久化不可用，当前页面将退化为临时状态。', error);
};

const openDatabase = () => {
  if (databasePromise) return databasePromise;

  const pendingDatabase = new Promise<IDBDatabase>((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('当前环境不支持 IndexedDB'));
      return;
    }

    const request = globalThis.indexedDB.open(INDEXED_DB_NAME, DATABASE_VERSION);
    request.onupgradeneeded = event => {
      const database = request.result;
      if (database.objectStoreNames.contains(LEGACY_OBJECT_STORE_NAME)) {
        database.deleteObjectStore(LEGACY_OBJECT_STORE_NAME);
      }
      // v3 改用 out-of-line key。IndexedDB 不支持修改既有 Store 的 keyPath，
      // 且当前无需兼容未发布的 v2 数据，因此升级时直接重建三个 Store。
      if (event.oldVersion > 0 && event.oldVersion < DATABASE_VERSION) {
        for (const storeName of Object.values(INDEXED_DB_STORES)) {
          if (database.objectStoreNames.contains(storeName)) {
            database.deleteObjectStore(storeName);
          }
        }
      }
      if (!database.objectStoreNames.contains(INDEXED_DB_STORES.appState)) {
        database.createObjectStore(INDEXED_DB_STORES.appState);
      }
      if (!database.objectStoreNames.contains(INDEXED_DB_STORES.panelLayout)) {
        database.createObjectStore(INDEXED_DB_STORES.panelLayout);
      }
      if (!database.objectStoreNames.contains(INDEXED_DB_STORES.tabScroll)) {
        database.createObjectStore(INDEXED_DB_STORES.tabScroll);
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error('打开 IndexedDB 失败'));
    request.onblocked = () => reject(new Error('IndexedDB 升级被其他页面阻塞'));
  });

  databasePromise = pendingDatabase;
  void pendingDatabase.catch(() => {
    if (databasePromise === pendingDatabase) databasePromise = null;
  });
  return pendingDatabase;
};

export const getIndexedDbValue = async <Value>(storeName: IndexedDbStoreName, key: IDBValidKey) => {
  const database = await openDatabase();
  return new Promise<Value | null>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve((request.result as Value | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('读取 IndexedDB 失败'));
  });
};

export type IndexedDbEntry<Value> = {
  key: IDBValidKey;
  value: Value;
};

export const getAllIndexedDbEntries = async <Value>(storeName: IndexedDbStoreName) => {
  const database = await openDatabase();
  return new Promise<IndexedDbEntry<Value>[]>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).openCursor();
    const entries: IndexedDbEntry<Value>[] = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(entries);
        return;
      }
      entries.push({ key: cursor.primaryKey, value: cursor.value as Value });
      cursor.continue();
    };
    request.onerror = () => reject(request.error ?? new Error('读取 IndexedDB 列表失败'));
  });
};

export const putIndexedDbEntries = async <Value>(
  storeName: IndexedDbStoreName,
  entries: IndexedDbEntry<Value>[],
) => {
  if (entries.length === 0) return;
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const objectStore = transaction.objectStore(storeName);
    for (const { key, value } of entries) objectStore.put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('写入 IndexedDB 失败'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB 写入已中止'));
  });
};

export const putIndexedDbValue = async <Value>(
  storeName: IndexedDbStoreName,
  key: IDBValidKey,
  value: Value,
) => putIndexedDbEntries(storeName, [{ key, value }]);

export const deleteIndexedDbValue = async (storeName: IndexedDbStoreName, key: IDBValidKey) => {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('删除 IndexedDB 数据失败'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB 删除已中止'));
  });
};

export const clearIndexedDbStore = async (storeName: IndexedDbStoreName) => {
  const database = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('清空 IndexedDB 数据失败'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB 清空已中止'));
  });
};

type PersistedValue<State extends object> = State & {
  [PERSIST_VERSION_FIELD]?: number;
};

export type IndexedDbPersistStorage<State extends object> = PersistStorage<State, Promise<void>> & {
  flush: () => Promise<void>;
};

export const createIndexedDbPersistStorage = <State extends object>(
  storeName: IndexedDbStoreName,
): IndexedDbPersistStorage<State> => {
  let persistenceQueue = Promise.resolve();

  const enqueue = (operation: () => Promise<void>) => {
    persistenceQueue = persistenceQueue.then(operation).catch(reportIndexedDbFailure);
    return persistenceQueue;
  };

  return {
    getItem: async name => {
      await persistenceQueue;
      try {
        const value = await getIndexedDbValue<PersistedValue<State>>(storeName, name);
        if (!value) return null;
        const state = { ...value } as Record<string, unknown>;
        delete state[PERSIST_VERSION_FIELD];
        return {
          state: state as State,
          version: value[PERSIST_VERSION_FIELD],
        };
      } catch (error) {
        reportIndexedDbFailure(error);
        return null;
      }
    },
    setItem: (name, value) =>
      enqueue(() =>
        putIndexedDbValue(storeName, name, {
          ...value.state,
          ...(value.version === undefined ? {} : { [PERSIST_VERSION_FIELD]: value.version }),
        }),
      ),
    removeItem: name => enqueue(() => deleteIndexedDbValue(storeName, name)),
    flush: () => persistenceQueue,
  };
};
