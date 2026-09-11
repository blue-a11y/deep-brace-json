import { expect, test, type Page } from '@playwright/test';
import { STORAGE_KEYS } from '../src/lib/storage-keys.js';

const issues = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  issues.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) errors.push(message.text());
  });
  await page.route('https://fonts.googleapis.com/**', route =>
    route.fulfill({ contentType: 'text/css', body: '' }),
  );
});
test.afterEach(({ page }) => expect(issues.get(page)).toEqual([]));

const readStored = (page: Page) =>
  page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('deep-brace-json');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Record<string, unknown>>((resolve, reject) => {
        const request = database.transaction('app-state').objectStore('app-state').get('current');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  });

const expectSkeletonMatchesWorkspace = async (page: Page, mode: 'light' | 'dark') => {
  let releaseEntry!: () => void;
  const gate = new Promise<void>(resolve => {
    releaseEntry = resolve;
  });
  const entryPattern = /\/(src\/main\.tsx|assets\/index-[^/]+\.js)(\?.*)?$/;
  await page.route(entryPattern, async route => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'commit' });
    const skeleton = page.getByLabel('工作区加载状态');
    await expect(skeleton).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toHaveCount(0);
    await expect(skeleton).toHaveCSS(
      'background-color',
      mode === 'dark' ? 'oklch(0.12 0.005 285.823)' : 'oklch(0.9702 0 0)',
    );
    const colors = await skeleton.evaluate(element => {
      const style = (selector: string) => getComputedStyle(element.querySelector(selector)!);
      return {
        background: getComputedStyle(element).backgroundColor,
        pane: style('.startup-pane').backgroundColor,
        brand: style('.brand-wordmark').color,
        icon: style('.brand-symbol').color,
        iconBackground: style('.brand-symbol').backgroundColor,
      };
    });
    releaseEntry();
    await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
    await expect(page.getByLabel('工作区加载状态')).toHaveCount(0);
    await expect(page.locator('#root > div')).toHaveCSS('background-color', colors.background);
    await expect(page.locator('[data-workspace-pane="editor"]')).toHaveCSS(
      'background-color',
      colors.pane,
    );
    await expect(page.locator('.brand-wordmark')).toHaveCSS('color', colors.brand);
    await expect(page.locator('.brand-symbol')).toHaveCSS('color', colors.icon);
    await expect(page.locator('.brand-symbol')).toHaveCSS(
      'background-color',
      colors.iconBackground,
    );
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    await expect(page).toHaveTitle(/DeepBrace JSON/);
  } finally {
    releaseEntry();
    await page.unroute(entryPattern);
  }
};

for (const width of [375, 1536]) {
  for (const mode of ['light', 'dark'] as const) {
    test(`已保存 ${mode} 优先于相反系统配色，骨架到工作区无明暗跳变 ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme: mode === 'light' ? 'dark' : 'light' });
      await page.addInitScript(({ key, mode }) => localStorage.setItem(key, mode), {
        key: STORAGE_KEYS.colorMode,
        mode,
      });
      await expectSkeletonMatchesWorkspace(page, mode);
      await expect.poll(() => readStored(page)).toMatchObject({ persistVersion: 2 });
      expect(await readStored(page)).not.toHaveProperty('isDark');
    });
  }
}

for (const mode of ['light', 'dark'] as const) {
  for (const condition of ['unset', 'invalid', 'blocked'] as const) {
    test(`明暗存储 ${condition} 时骨架和工作区均回退系统 ${mode}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: mode });
      await page.addInitScript(
        ({ key, condition }) => {
          if (condition === 'invalid') localStorage.setItem(key, 'invalid');
          if (condition === 'blocked')
            Object.defineProperty(window, 'localStorage', {
              get() {
                throw new DOMException('Storage disabled', 'SecurityError');
              },
            });
        },
        { key: STORAGE_KEYS.colorMode, condition },
      );
      await expectSkeletonMatchesWorkspace(page, mode);
      if (condition === 'blocked') {
        // 禁用 localStorage 时引导也不能记忆；先关闭引导，避免弹层焦点拦截工作区快捷键。
        await page.getByRole('button', { name: '关闭标签新手引导' }).click();
        await expect(page.getByRole('dialog', { name: '试试右键标签' })).toBeHidden();
        await page.getByRole('textbox', { name: 'JSON 编辑器' }).focus();
        await page.keyboard.press('Alt+Shift+b');
        await expect(page.locator('html')).toHaveAttribute(
          'data-theme',
          mode === 'light' ? 'dark' : 'light',
        );
      }
    });
  }
}

test('明暗切换、刷新首帧、重置和撤销均使用 localStorage，IndexedDB 不再保存明暗', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(
    key => localStorage.setItem(key, 'true'),
    STORAGE_KEYS.tabGuideDismissed,
  );
  await page.goto('/');
  const editor = page.getByRole('textbox', { name: 'JSON 编辑器' });
  await expect(editor).toBeVisible();
  await editor.fill('{"preserved":"after undo"}');
  await page.keyboard.press('Alt+Shift+b');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const readMode = () => page.evaluate(key => localStorage.getItem(key), STORAGE_KEYS.colorMode);
  await expect.poll(readMode).toBe('dark');
  await expect
    .poll(() => readStored(page))
    .toMatchObject({ tabs: [{ input: '{"preserved":"after undo"}' }, {}] });
  await expectSkeletonMatchesWorkspace(page, 'dark');
  await page.keyboard.press('Alt+Shift+s');
  await page
    .getByRole('dialog', { name: '全局设置', exact: true })
    .getByRole('button', { name: '重置所有数据', exact: true })
    .click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '确认重置', exact: true })
    .click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect.poll(readMode).toBe('light');
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect.poll(readMode).toBe('dark');
  await expect
    .poll(() => readStored(page))
    .toMatchObject({ tabs: [{ input: '{"preserved":"after undo"}' }, {}] });
  expect(await readStored(page)).not.toHaveProperty('isDark');
  await expectSkeletonMatchesWorkspace(page, 'dark');
  await expect
    .poll(() => page.locator('.cm-line').allTextContents())
    .toEqual(['{"preserved":"after undo"}']);
});

for (const legacy of [true, false]) {
  test(`旧 IndexedDB 明暗值 ${legacy} 迁出后删除字段，保留字体和标签`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: legacy ? 'light' : 'dark' });
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
    await expect.poll(() => readStored(page)).toMatchObject({ persistVersion: 2 });
    await page.evaluate(
      async ({ key, legacy }) => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('deep-brace-json');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          await new Promise<void>((resolve, reject) => {
            const transaction = database.transaction('app-state', 'readwrite');
            const store = transaction.objectStore('app-state');
            const request = store.get('current');
            request.onsuccess = () =>
              store.put(
                { ...request.result, isDark: legacy, persistVersion: 1, codeFont: 'space-mono' },
                'current',
              );
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
          });
          localStorage.removeItem(key);
        } finally {
          database.close();
        }
      },
      { key: STORAGE_KEYS.colorMode, legacy },
    );
    const original = await readStored(page);
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
    const mode = legacy ? 'dark' : 'light';
    await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
    await expect
      .poll(() => readStored(page))
      .toMatchObject({ persistVersion: 2, codeFont: 'space-mono', tabs: original.tabs });
    expect(await readStored(page)).not.toHaveProperty('isDark');
    expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEYS.colorMode)).toBe(
      mode,
    );
    await expectSkeletonMatchesWorkspace(page, mode);
  });
}
