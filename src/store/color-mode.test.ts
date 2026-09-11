import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../lib/storage-keys';

describe('深浅色单一持久化来源', () => {
  const values = new Map<string, string>();
  let isSystemDark = false;
  const localStorage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    values.clear();
    isSystemDark = false;
    vi.stubGlobal('indexedDB', new IDBFactory());
    vi.stubGlobal('window', {
      localStorage,
      matchMedia: () => ({ matches: isSystemDark }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['light', true, false],
    ['dark', false, true],
    [undefined, true, true],
    [undefined, false, false],
    ['invalid', true, true],
    ['invalid', false, false],
  ])('首次初始化：保存值 %s，系统深色 %s，结果 %s', async (saved, system, expected) => {
    isSystemDark = system;
    if (saved !== undefined) values.set(STORAGE_KEYS.colorMode, saved);
    const { useStore } = await import('./use-store');
    expect(useStore.getState().isDark).toBe(expected);
  });

  it('存储读写被禁用时回退系统配色且不抛错', async () => {
    vi.stubGlobal('window', {
      get localStorage() {
        throw new Error('Storage disabled');
      },
      matchMedia: () => ({ matches: true }),
    });
    const { readColorMode, writeColorMode, getInitialIsDark } = await import('../lib/storage');
    expect(readColorMode()).toBeNull();
    expect(writeColorMode(false)).toBe(false);
    expect(getInitialIsDark()).toBe(true);
  });

  it.each([
    [undefined, true, 'dark'],
    [undefined, false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['invalid', true, 'dark'],
  ])('迁移旧值：localStorage %s、IndexedDB %s → %s', async (saved, legacy, expected) => {
    if (saved !== undefined) values.set(STORAGE_KEYS.colorMode, saved);
    const { putIndexedDbValue, getIndexedDbValue, INDEXED_DB_STORES } =
      await import('../lib/indexed-db-storage');
    const preserved = {
      tabs: [{ id: 'saved-tab', title: '保留内容', input: '{"saved":true}' }],
      activeTabId: 'saved-tab',
      codeFont: 'space-mono',
      treeTheme: 'catppuccin',
      isCodeBold: true,
      isCodeItalic: true,
      indentSize: 4,
      shouldShowFullLongStrings: false,
    };
    await putIndexedDbValue(INDEXED_DB_STORES.appState, STORAGE_KEYS.appState, {
      ...preserved,
      persistVersion: 1,
      isDark: legacy,
    });
    await putIndexedDbValue(INDEXED_DB_STORES.tabScroll, 'saved-tab', { top: 160 });
    await putIndexedDbValue(INDEXED_DB_STORES.panelLayout, 'layout', { sizes: [35, 65] });
    const { useStore } = await import('./use-store');
    await useStore.persist.rehydrate();
    expect(useStore.persist.hasHydrated()).toBe(true);
    expect(values.get(STORAGE_KEYS.colorMode)).toBe(expected);
    expect(useStore.getState()).toMatchObject({ ...preserved, isDark: expected === 'dark' });
    const stored = await getIndexedDbValue(INDEXED_DB_STORES.appState, STORAGE_KEYS.appState);
    expect(stored).toMatchObject({ ...preserved, persistVersion: 2 });
    expect(stored).not.toHaveProperty('isDark');
    expect(await getIndexedDbValue(INDEXED_DB_STORES.tabScroll, 'saved-tab')).toEqual({ top: 160 });
    expect(await getIndexedDbValue(INDEXED_DB_STORES.panelLayout, 'layout')).toEqual({
      sizes: [35, 65],
    });
  });

  it('切换、重置、撤销只更新 localStorage 明暗值，刷新不被旧字段覆盖', async () => {
    const { useStore } = await import('./use-store');
    vi.stubGlobal('document', {
      documentElement: { dataset: {}, classList: { toggle: vi.fn() } },
    });
    const { getIndexedDbValue, INDEXED_DB_STORES } = await import('../lib/indexed-db-storage');
    const storage = useStore.persist.getOptions().storage;
    if (!storage || !('flush' in storage) || typeof storage.flush !== 'function') {
      throw new Error('缺少持久化完成屏障');
    }
    const flush = storage.flush;
    const verify = async (expected: 'light' | 'dark') => {
      await flush();
      expect(useStore.getState().isDark).toBe(expected === 'dark');
      expect(document.documentElement.dataset.theme).toBe(expected);
      expect(values.get(STORAGE_KEYS.colorMode)).toBe(expected);
      expect(
        await getIndexedDbValue(INDEXED_DB_STORES.appState, STORAGE_KEYS.appState),
      ).not.toHaveProperty('isDark');
    };
    useStore.getState().toggleTheme();
    await verify('dark');
    const snapshot = { ...useStore.getState(), scroll: new Map(), splitLayout: null };
    await useStore.getState().resetAll();
    await verify('light');
    await useStore.getState().restoreResetSnapshot(snapshot);
    await verify('dark');
    await useStore.persist.rehydrate();
    await verify('dark');
  });
});
