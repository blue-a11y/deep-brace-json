import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SHORTCUT_MODIFIERS } from '../lib/shortcuts';

describe('shortcut preference hydration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('indexedDB', new IDBFactory());
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    undefined,
    null,
    {},
    { ctrl: false, alt: false, meta: false, shift: true },
    { ctrl: 'yes', alt: true, meta: false, shift: true },
  ])(
    'falls back to default modifiers for missing or invalid stored data: %j',
    async shortcutModifiers => {
      const { putIndexedDbValue, INDEXED_DB_STORES } = await import('../lib/indexed-db-storage');
      await putIndexedDbValue(INDEXED_DB_STORES.appState, 'current', { shortcutModifiers });
      const { useStore } = await import('./use-store');
      await useStore.persist.rehydrate();
      expect(useStore.getState().shortcutModifiers).toEqual(DEFAULT_SHORTCUT_MODIFIERS);
    },
  );

  it('restores a structured shared modifier preference', async () => {
    const { putIndexedDbValue, INDEXED_DB_STORES } = await import('../lib/indexed-db-storage');
    const shortcutModifiers = { ctrl: false, alt: false, meta: true, shift: true };
    await putIndexedDbValue(INDEXED_DB_STORES.appState, 'current', { shortcutModifiers });
    const { useStore } = await import('./use-store');
    await useStore.persist.rehydrate();
    expect(useStore.getState().shortcutModifiers).toEqual(shortcutModifiers);
  });
});
