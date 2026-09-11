import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('代码主题偏好', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('indexedDB', new IDBFactory());
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([undefined, null, 'true', 'false', 0, 1, {}])(
    '旧记录或非法字形值回退到常规字形，并保留原标签和字体：%j',
    async invalidValue => {
      const { putIndexedDbValue, INDEXED_DB_STORES } = await import('../lib/indexed-db-storage');
      await putIndexedDbValue(INDEXED_DB_STORES.appState, 'current', {
        codeFont: 'source-code-pro',
        treeTheme: 'one-dark',
        isCodeBold: invalidValue,
        isCodeItalic: invalidValue,
        tabs: [{ id: 'saved-tab', input: '{"saved":true}', title: '保留内容' }],
        activeTabId: 'saved-tab',
      });
      const { useStore } = await import('./use-store');
      await useStore.persist.rehydrate();
      expect(useStore.getState()).toMatchObject({
        codeFont: 'source-code-pro',
        treeTheme: 'one-dark',
        isCodeBold: false,
        isCodeItalic: false,
        activeTabId: 'saved-tab',
        tabs: [{ id: 'saved-tab', input: '{"saved":true}' }],
      });
    },
  );

  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])('独立恢复粗体 %s 和斜体 %s', async (isCodeBold, isCodeItalic) => {
    const { putIndexedDbValue, INDEXED_DB_STORES } = await import('../lib/indexed-db-storage');
    await putIndexedDbValue(INDEXED_DB_STORES.appState, 'current', {
      isCodeBold,
      isCodeItalic,
      codeFont: 'red-hat-mono',
      treeTheme: 'catppuccin',
    });
    const { useStore } = await import('./use-store');
    await useStore.persist.rehydrate();
    expect(useStore.getState()).toMatchObject({
      isCodeBold,
      isCodeItalic,
      codeFont: 'red-hat-mono',
      treeTheme: 'catppuccin',
    });
  });

  it('开关写入结构化布尔值，重置与撤销同时恢复样式及持久化数据', async () => {
    const { useStore } = await import('./use-store');
    vi.stubGlobal('document', {
      documentElement: { dataset: {}, classList: { toggle: vi.fn() } },
    });
    const { getIndexedDbValue, INDEXED_DB_STORES } = await import('../lib/indexed-db-storage');
    const storage = useStore.persist.getOptions().storage;
    if (!storage || !('flush' in storage) || typeof storage.flush !== 'function') {
      throw new Error('缺少持久化完成屏障');
    }
    useStore.getState().setCodeFont('space-mono');
    useStore.getState().setTreeTheme('github');
    useStore.getState().setIsCodeBold(true);
    useStore.getState().setIsCodeItalic(true);
    await storage.flush();
    const expected = {
      codeFont: 'space-mono',
      treeTheme: 'github',
      isCodeBold: true,
      isCodeItalic: true,
    };
    const readStored = () => getIndexedDbValue(INDEXED_DB_STORES.appState, 'current');
    expect(await readStored()).toMatchObject(expected);
    expect(document.documentElement.dataset).toMatchObject({
      codeBold: 'true',
      codeItalic: 'true',
    });
    const snapshot = { ...useStore.getState(), scroll: new Map(), splitLayout: null };
    const resetting = useStore.getState().resetAll();
    expect(useStore.getState()).toMatchObject({ isCodeBold: false, isCodeItalic: false });
    expect(document.documentElement.dataset).toMatchObject({
      codeBold: 'false',
      codeItalic: 'false',
    });
    await resetting;
    expect(await readStored()).toMatchObject({ isCodeBold: false, isCodeItalic: false });
    const restoring = useStore.getState().restoreResetSnapshot(snapshot);
    expect(useStore.getState()).toMatchObject(expected);
    expect(document.documentElement.dataset).toMatchObject({
      codeBold: 'true',
      codeItalic: 'true',
    });
    await restoring;
    expect(await readStored()).toMatchObject(expected);
  });
});
