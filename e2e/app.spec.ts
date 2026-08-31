import { expect, test, type Page } from '@playwright/test';

const runtimeIssues = new WeakMap<Page, string[]>();

type PersistedAppState = {
  activeTabId?: string;
  shouldShowFullLongStrings?: boolean;
  tabs?: Array<{ id?: string; input?: string }>;
};

const readPersistedAppState = (page: Page) =>
  page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('deep-brace-json');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('打开 IndexedDB 失败'));
    });

    return new Promise<PersistedAppState | undefined>((resolve, reject) => {
      const request = database
        .transaction('app-state', 'readonly')
        .objectStore('app-state')
        .get('current');
      request.onsuccess = () => {
        const value = request.result as PersistedAppState | undefined;
        database.close();
        resolve(value);
      };
      request.onerror = () => {
        database.close();
        reject(request.error ?? new Error('读取 IndexedDB 失败'));
      };
    });
  });

const readPersistedScrollTops = (page: Page) =>
  page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('deep-brace-json');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('打开 IndexedDB 失败'));
    });

    const readValue = (storeName: string, key: IDBValidKey) =>
      new Promise<unknown>((resolve, reject) => {
        const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result as unknown);
        request.onerror = () => reject(request.error ?? new Error('读取 IndexedDB 失败'));
      });

    try {
      const state = (await readValue('app-state', 'current')) as PersistedAppState | undefined;
      if (!state?.activeTabId) return { editor: 0, tree: 0 };
      const [editorValue, treeValue] = (await Promise.all([
        readValue('tab-scroll', [state.activeTabId, 'editor']),
        readValue('tab-scroll', [state.activeTabId, 'tree']),
      ])) as Array<{ top?: unknown } | undefined>;
      return {
        editor: typeof editorValue?.top === 'number' ? editorValue.top : 0,
        tree: typeof treeValue?.top === 'number' ? treeValue.top : 0,
      };
    } finally {
      database.close();
    }
  });

const openSettings = async (page: Page) => {
  const directTrigger = page.getByRole('button', { name: '打开全局设置', exact: true });
  await expect(page.getByRole('textbox', { name: 'JSON 编辑器', exact: true })).toBeVisible();
  if (await directTrigger.isVisible()) {
    await directTrigger.click();
  } else {
    await page.getByRole('button', { name: '打开工具菜单', exact: true }).click();
    await page.getByRole('menuitem', { name: '设置', exact: true }).click();
  }
  const dialog = page.getByRole('dialog', { name: '全局设置', exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
};

test.beforeEach(async ({ page }) => {
  const issues: string[] = [];
  runtimeIssues.set(page, issues);
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') {
      issues.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', error => {
    issues.push(`pageerror: ${error.message}`);
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

test.afterEach(({ page }) => {
  expect(runtimeIssues.get(page) ?? [], '页面不应产生未解释的 warning 或 error').toEqual([]);
});

test('首屏渲染完整应用且没有框架错误层', async ({ page }) => {
  await expect(page).toHaveTitle('DeepBrace JSON · 深入解析每一层 JSON');
  await expect(page.getByText('编辑器', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '树形预览', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'JSON 编辑器', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Brace 1，JSON 1/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText(/已解析 · object/)).toBeVisible();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
});

test('废弃的 localStorage 主题不会影响首帧', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'deep-brace-json:store',
      JSON.stringify({ state: { dark: true }, version: 0 }),
    );
  });

  let releaseMainModule = () => {};
  const mainModuleGate = new Promise<void>(resolve => {
    releaseMainModule = resolve;
  });
  let markMainModuleRequested = () => {};
  const mainModuleRequested = new Promise<void>(resolve => {
    markMainModuleRequested = resolve;
  });
  await page.route('**/src/main.tsx', async route => {
    markMainModuleRequested();
    await mainModuleGate;
    await route.continue();
  });

  try {
    await page.reload({ waitUntil: 'commit' });
    await mainModuleRequested;
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(false);
  } finally {
    releaseMainModule();
  }

  await expect(page.getByRole('textbox', { name: 'JSON 编辑器', exact: true })).toBeVisible();
  await page.unroute('**/src/main.tsx');
});

test('编辑 JSON5 后可以继续解析嵌套对象', async ({ page }) => {
  await page
    .getByRole('textbox', { name: 'JSON 编辑器', exact: true })
    .fill("{ unquoted: 'value', nested: '{\"ok\":true}', trailing: [1, 2,], }");

  await expect(page.getByText(/已解析 · object/)).toBeVisible();
  await expect(page.getByText('"unquoted"', { exact: true })).toBeVisible();
  const parseButton = page.getByRole('button', { name: 'Parse', exact: true });
  await expect(parseButton).toHaveCount(1);
  await parseButton.click();

  await expect(page.getByRole('tab', { name: /Brace 2/ })).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('region', { name: '树形预览内容', exact: true }).getByText('"ok"', {
      exact: true,
    }),
  ).toBeVisible();
});

test('全局偏好通过 IndexedDB 在刷新后恢复', async ({ page }) => {
  let dialog = await openSettings(page);
  let longStringSwitch = dialog.getByRole('switch', { name: /完整展示长字符串/ });
  await expect(longStringSwitch).toBeChecked();
  await dialog.getByText('完整展示长字符串', { exact: true }).click();
  await expect(longStringSwitch).not.toBeChecked();
  await expect
    .poll(async () => (await readPersistedAppState(page))?.shouldShowFullLongStrings)
    .toBe(false);
  await dialog.getByRole('button', { name: '关闭设置', exact: true }).click();

  await page.reload({ waitUntil: 'domcontentloaded' });
  dialog = await openSettings(page);
  longStringSwitch = dialog.getByRole('switch', { name: /完整展示长字符串/ });
  await expect(longStringSwitch).not.toBeChecked();
});

test('编辑器和树滚动位置通过 IndexedDB 在刷新后恢复', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
  const longInput = JSON.stringify(
    {
      rows: Array.from({ length: 40 }, (_, index) => ({
        id: index + 1,
        label: `row-${String(index + 1).padStart(3, '0')}`,
      })),
    },
    null,
    2,
  );
  await editor.fill(longInput);
  await expect(page.getByText(/已解析 · object/)).toBeVisible();

  const editorScroller = page.locator('.cm-scroller');
  const treeScroller = page.getByRole('region', { name: '树形预览内容', exact: true });
  const [editorTop, treeTop] = await Promise.all(
    [editorScroller, treeScroller].map(scroller =>
      scroller.evaluate(element => {
        const maximumTop = element.scrollHeight - element.clientHeight;
        element.scrollTop = Math.round(maximumTop * 0.6);
        element.dispatchEvent(new Event('scroll', { bubbles: true }));
        return element.scrollTop;
      }),
    ),
  );
  expect(editorTop).toBeGreaterThan(0);
  expect(treeTop).toBeGreaterThan(0);
  await expect
    .poll(async () => Math.abs((await readPersistedScrollTops(page)).editor - editorTop))
    .toBeLessThan(2);
  await expect
    .poll(async () => Math.abs((await readPersistedScrollTops(page)).tree - treeTop))
    .toBeLessThan(2);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('textbox', { name: 'JSON 编辑器', exact: true })).toBeVisible();
  await expect
    .poll(async () =>
      Math.abs((await editorScroller.evaluate(element => element.scrollTop)) - editorTop),
    )
    .toBeLessThan(24);
  await expect
    .poll(async () =>
      Math.abs((await treeScroller.evaluate(element => element.scrollTop)) - treeTop),
    )
    .toBeLessThan(24);
});

test('重置后可撤销并恢复标签、偏好和分栏布局', async ({ page }) => {
  const tabNavigation = page.getByRole('navigation', { name: 'JSON 标签', exact: true });
  await tabNavigation.getByLabel('新建标签', { exact: true }).click();
  const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
  const markerInput = JSON.stringify(
    {
      restored: 'from-reset-snapshot',
      rows: Array.from({ length: 30 }, (_, index) => ({ index, value: `snapshot-${index}` })),
    },
    null,
    2,
  );
  await editor.fill(markerInput);
  await expect(page.getByText(/已解析 · object/)).toBeVisible();
  await expect(tabNavigation.getByRole('tab')).toHaveCount(2);
  await expect(tabNavigation.getByRole('tab', { name: /Brace 2/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  let dialog = await openSettings(page);
  const longStringSwitch = dialog.getByRole('switch', { name: /完整展示长字符串/ });
  await dialog.getByText('完整展示长字符串', { exact: true }).click();
  await expect(longStringSwitch).not.toBeChecked();
  await dialog.getByRole('button', { name: '关闭设置', exact: true }).click();

  const editorScroller = page.locator('.cm-scroller');
  const treeScroller = page.getByRole('region', { name: '树形预览内容', exact: true });
  const [editorTop, treeTop] = await Promise.all(
    [editorScroller, treeScroller].map(scroller =>
      scroller.evaluate(element => {
        const maximumTop = element.scrollHeight - element.clientHeight;
        element.scrollTop = Math.round(maximumTop * 0.5);
        element.dispatchEvent(new Event('scroll', { bubbles: true }));
        return element.scrollTop;
      }),
    ),
  );
  expect(editorTop).toBeGreaterThan(0);
  expect(treeTop).toBeGreaterThan(0);
  await expect
    .poll(async () => Math.abs((await readPersistedScrollTops(page)).editor - editorTop))
    .toBeLessThan(2);
  await expect
    .poll(async () => Math.abs((await readPersistedScrollTops(page)).tree - treeTop))
    .toBeLessThan(2);

  const resizeHandle = page.getByRole('separator', {
    name: '调整编辑器与树形预览宽度',
    exact: true,
  });
  const initialHandleBox = await resizeHandle.boundingBox();
  expect(initialHandleBox).not.toBeNull();
  if (!initialHandleBox) throw new Error('未找到桌面分栏拖拽手柄');
  await page.mouse.move(
    initialHandleBox.x + initialHandleBox.width / 2,
    initialHandleBox.y + initialHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    initialHandleBox.x - 180,
    initialHandleBox.y + initialHandleBox.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  const movedHandleBox = await resizeHandle.boundingBox();
  expect(movedHandleBox).not.toBeNull();
  if (!movedHandleBox) throw new Error('拖拽后桌面分栏手柄不可见');
  expect(Math.abs(movedHandleBox.x - initialHandleBox.x)).toBeGreaterThan(100);

  dialog = await openSettings(page);
  await dialog.getByRole('button', { name: '重置所有数据', exact: true }).click();
  const confirmation = page.getByRole('alertdialog', { name: '重置所有数据?', exact: true });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: '确认重置', exact: true }).click();

  await expect(tabNavigation.getByRole('tab')).toHaveCount(1);
  await expect(treeScroller.getByText('"restored"', { exact: true })).toHaveCount(0);
  await Promise.all([
    expect
      .poll(() => editorScroller.evaluate(element => element.scrollTop), { timeout: 2_000 })
      .toBe(0),
    expect
      .poll(() => treeScroller.evaluate(element => element.scrollTop), { timeout: 2_000 })
      .toBe(0),
    expect
      .poll(
        async () => {
          const currentBox = await resizeHandle.boundingBox();
          return currentBox
            ? Math.abs(currentBox.x - initialHandleBox.x)
            : Number.POSITIVE_INFINITY;
        },
        { timeout: 2_000 },
      )
      .toBeLessThan(12),
  ]);

  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await expect(tabNavigation.getByRole('tab')).toHaveCount(2);
  await expect(tabNavigation.getByRole('tab', { name: /Brace 2/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(treeScroller.getByText('"restored"', { exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeHidden();

  // 撤销按钮关闭意味着 restoreResetSnapshot 的完成 Promise 已结束；此处立即刷新，
  // 直接验证该 Promise 已覆盖应用状态、滚动与分栏的最终 IndexedDB 事务。
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(tabNavigation.getByRole('tab')).toHaveCount(2);
  await expect(treeScroller.getByText('"restored"', { exact: true })).toHaveCount(1);
  await expect
    .poll(async () =>
      Math.abs((await editorScroller.evaluate(element => element.scrollTop)) - editorTop),
    )
    .toBeLessThan(24);
  await expect
    .poll(async () =>
      Math.abs((await treeScroller.evaluate(element => element.scrollTop)) - treeTop),
    )
    .toBeLessThan(24);
  await expect
    .poll(async () => {
      const currentBox = await resizeHandle.boundingBox();
      return currentBox ? Math.abs(currentBox.x - movedHandleBox.x) : Number.POSITIVE_INFINITY;
    })
    .toBeLessThan(12);
  dialog = await openSettings(page);
  await expect(dialog.getByRole('switch', { name: /完整展示长字符串/ })).not.toBeChecked();
});

test.describe('窄屏工具栏', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('只把放不下的动作收进工具菜单', async ({ page }) => {
    const directSettings = page.getByRole('button', { name: '打开全局设置', exact: true });
    const menuTrigger = page.getByRole('button', { name: '打开工具菜单', exact: true });

    await expect(menuTrigger).toBeVisible();
    await expect(directSettings).toBeHidden();
    await menuTrigger.click();
    await expect(page.getByRole('menuitem', { name: '设置', exact: true })).toBeVisible();
    await page.getByRole('menuitem', { name: '设置', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '全局设置', exact: true })).toBeVisible();
  });
});
