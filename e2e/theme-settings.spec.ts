import { expect, test, type Locator, type Page } from '@playwright/test';
import { CODE_FONT_OPTIONS } from '../src/lib/code-font.js';
import { STORAGE_KEYS } from '../src/lib/storage.js';

const issues = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  issues.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) errors.push(message.text());
  });
  await page.addInitScript(
    key => localStorage.setItem(key, 'true'),
    STORAGE_KEYS.tabGuideDismissed,
  );
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'JSON 编辑器', exact: true })).toBeVisible();
});
test.afterEach(({ page }) => expect(issues.get(page)).toEqual([]));

const openTheme = async (page: Page) => {
  await page.keyboard.press('Alt+Shift+t');
  const dialog = page.getByRole('dialog', { name: '主题', exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
};
const closeTheme = async (dialog: Locator) => {
  await dialog.getByRole('button', { name: '关闭主题设置', exact: true }).click();
  await expect(dialog).toBeHidden();
};
const selectOption = async (page: Page, dialog: Locator, label: string, option: string) => {
  await dialog.getByRole('button', { name: new RegExp(label) }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
};
const readPreferences = (page: Page) =>
  page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('deep-brace-json');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<{
        codeFont: string;
        treeTheme: string;
        isCodeBold: boolean;
        isCodeItalic: boolean;
      }>((resolve, reject) => {
        const request = db.transaction('app-state').objectStore('app-state').get('current');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });

const expectCodeStyle = async (page: Page, bold: boolean, italic: boolean) => {
  for (const selector of [
    '.cm-content',
    '.tree-token-key',
    '.tree-token-string',
    '.tree-token-number',
    '.tree-token-boolean',
    '.tree-token-null',
  ]) {
    const token = page.locator(selector).first();
    await expect(token).toHaveCSS('font-weight', bold ? '700' : '400');
    await expect(token).toHaveCSS('font-style', italic ? 'italic' : 'normal');
  }
};
const SAMPLE_INPUT = JSON.stringify(
  { message: 'hello', count: 42, enabled: true, empty: null },
  null,
  2,
);

for (const width of [375, 1280]) {
  test(`粗体斜体独立切换，刷新、重置和撤销完整恢复 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.getByRole('textbox', { name: 'JSON 编辑器' }).fill(SAMPLE_INPUT);
    await expectCodeStyle(page, false, false);
    let dialog = await openTheme(page);
    await selectOption(page, dialog, '代码配色', 'Catppuccin');
    await selectOption(page, dialog, '代码字体', 'Space Mono');
    const boldSwitch = dialog.getByRole('switch', { name: '代码粗体' });
    const italicSwitch = dialog.getByRole('switch', { name: '代码斜体' });
    await expect(boldSwitch).not.toBeChecked();
    await expect(italicSwitch).not.toBeChecked();
    await boldSwitch.focus();
    await boldSwitch.press('Space');
    await expectCodeStyle(page, true, false);
    await dialog.getByText('斜体', { exact: true }).click();
    await expectCodeStyle(page, true, true);
    await dialog.getByText('粗体', { exact: true }).click();
    await expectCodeStyle(page, false, true);
    await dialog.getByText('粗体', { exact: true }).click();
    await expectCodeStyle(page, true, true);
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect(dialog.getByRole('heading', { name: '主题', exact: true })).toHaveCSS(
      'font-style',
      'normal',
    );
    await closeTheme(dialog);
    await expect
      .poll(() => readPreferences(page))
      .toMatchObject({
        codeFont: 'space-mono',
        treeTheme: 'catppuccin',
        isCodeBold: true,
        isCodeItalic: true,
      });
    await page.reload();
    await expectCodeStyle(page, true, true);
    await expect(page.locator('.brand-wordmark')).toHaveCSS('font-style', 'normal');
    await expect(page.locator('.brand-wordmark')).toHaveCSS('font-weight', '400');
    dialog = await openTheme(page);
    await expect(dialog.getByRole('switch', { name: '代码粗体' })).toBeChecked();
    await expect(dialog.getByRole('switch', { name: '代码斜体' })).toBeChecked();
    await expect(
      dialog.getByRole('button', { name: 'Space Mono 代码字体', exact: true }),
    ).toBeVisible();
    await closeTheme(dialog);
    await page.keyboard.press('Alt+Shift+s');
    const settings = page.getByRole('dialog', { name: '全局设置', exact: true });
    await settings.getByRole('button', { name: '重置所有数据', exact: true }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: '确认重置', exact: true })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-code-bold', 'false');
    await expect(page.locator('html')).toHaveAttribute('data-code-italic', 'false');
    await expect(page.locator('html')).toHaveAttribute('data-code-font', 'jetbrains-mono');
    await page.getByRole('button', { name: '撤销', exact: true }).click();
    await expectCodeStyle(page, true, true);
    await expect
      .poll(() => readPreferences(page))
      .toMatchObject({
        codeFont: 'space-mono',
        treeTheme: 'catppuccin',
        isCodeBold: true,
        isCodeItalic: true,
      });
    await page.reload();
    await expectCodeStyle(page, true, true);
    await expect
      .poll(async () => (await page.locator('.cm-line').allTextContents()).join('\n'))
      .toBe(SAMPLE_INPUT);
  });
}

for (const theme of ['GitHub', 'Catppuccin', 'Ayu', 'Gruvbox']) {
  for (const dark of [false, true]) {
    test(`${theme} 配色在${dark ? '深色' : '浅色'}模式下编辑器与树的各类 token 一致`, async ({
      page,
    }) => {
      await page.getByRole('textbox', { name: 'JSON 编辑器' }).fill(SAMPLE_INPUT);
      if (dark) await page.keyboard.press('Alt+Shift+b');
      const dialog = await openTheme(page);
      await selectOption(page, dialog, '代码配色', theme);
      await closeTheme(dialog);
      const tree = page.getByRole('region', { name: '树形预览内容' });
      await expect(tree).toHaveAttribute('data-tree-theme', theme.toLowerCase());
      await expect(page.locator('html')).toHaveAttribute('data-theme', dark ? 'dark' : 'light');
      for (const [token, text] of [
        ['key', '"message"'],
        ['string', '"hello"'],
        ['number', '42'],
        ['boolean', 'true'],
        ['null', 'null'],
        ['punctuation', '{'],
      ]) {
        const editorToken = page.locator('.cm-content').getByText(text, { exact: true }).first();
        const color = await editorToken.evaluate(element => getComputedStyle(element).color);
        await expect(tree.locator(`.tree-token-${token}`).first()).toHaveCSS('color', color);
      }
    });
  }
}

test('全部字体可选，两种渲染器应用同一字体且菜单内容可滚动到末尾', async ({ page }) => {
  test.setTimeout(60000);
  const dialog = await openTheme(page);
  for (const option of CODE_FONT_OPTIONS) {
    await selectOption(page, dialog, '代码字体', option.label);
    await expect(page.locator('html')).toHaveAttribute('data-code-font', option.value);
    for (const selector of ['.cm-scroller', '.tree-line']) {
      await expect
        .poll(() =>
          page
            .locator(selector)
            .first()
            .evaluate(element => getComputedStyle(element).fontFamily),
        )
        .toContain(option.label);
    }
  }
  await closeTheme(dialog);
});

test('大文档改变字形后重测换行高度，末尾可达且刷新保持字形', async ({ page, context }) => {
  test.setTimeout(60000);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const input = JSON.stringify(
    Array.from({ length: 1500 }, (_, id) => ({
      id,
      message: 'wrapped value '.repeat(16),
      marker: `record-${id}`,
    })),
    null,
    2,
  );
  await page.evaluate(text => navigator.clipboard.writeText(text), input);
  await page.getByRole('textbox', { name: 'JSON 编辑器' }).focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+v');
  const tree = page.getByRole('region', { name: '树形预览内容' });
  await expect(tree).toHaveClass(/tree-virtual/);
  const dialog = await openTheme(page);
  await selectOption(page, dialog, '代码字体', 'Red Hat Mono');
  await dialog.getByText('粗体', { exact: true }).click();
  await dialog.getByText('斜体', { exact: true }).click();
  await closeTheme(dialog);
  await expect(tree.locator('.tree-token-string').first()).toHaveCSS('font-style', 'italic');
  await expect(tree.locator('.tree-token-string').first()).toHaveCSS('font-weight', '700');
  await tree.focus();
  await page.keyboard.press('End');
  await expect(tree.getByText('"record-1499"', { exact: true })).toBeVisible();
  await expect(tree.locator('[data-node-key="[]:close"]')).toBeInViewport();
  expect(await tree.locator('.virtual-tree-row').count()).toBeLessThan(100);
  await expect
    .poll(() =>
      tree.evaluate(element => {
        const rows = Array.from(element.querySelectorAll('.virtual-tree-row')).map(row =>
          row.getBoundingClientRect(),
        );
        return rows.slice(1).every((row, index) => Math.abs(row.top - rows[index].bottom) < 1);
      }),
    )
    .toBe(true);
  await expect
    .poll(() => readPreferences(page))
    .toMatchObject({ isCodeBold: true, isCodeItalic: true });
  const anchorKey = await tree.evaluate(element => {
    const top = element.getBoundingClientRect().top;
    return Array.from(element.querySelectorAll<HTMLElement>('.virtual-tree-row')).find(
      row => row.getBoundingClientRect().bottom > top + 0.5,
    )?.dataset.nodeKey;
  });
  expect(anchorKey).toBeTruthy();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('deep-brace-json');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const read = (store: string, key: IDBValidKey) =>
          new Promise<unknown>((resolve, reject) => {
            const request = db.transaction(store).objectStore(store).get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
        try {
          const state = (await read('app-state', 'current')) as { activeTabId: string };
          const scroll = (await read('tab-scroll', [state.activeTabId, 'tree'])) as
            { anchor?: { nodeKey?: string } } | undefined;
          return scroll?.anchor?.nodeKey;
        } finally {
          db.close();
        }
      }),
    )
    .toBe(anchorKey);
  await page.reload();
  await expect(tree.getByText('"record-1499"', { exact: true })).toBeVisible();
  await expect(tree.locator('.tree-token-string').first()).toHaveCSS('font-weight', '700');
  await expect(tree.locator('.tree-token-string').first()).toHaveCSS('font-style', 'italic');
  await tree.focus();
  await page.keyboard.press('Home');
  await expect(tree.getByText('"record-0"', { exact: true })).toBeVisible();
});
