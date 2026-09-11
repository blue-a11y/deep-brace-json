import { expect, test, type Page } from '@playwright/test';

const issues = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page, context }) => {
  const runtimeIssues: string[] = [];
  issues.set(page, runtimeIssues);
  page.on('pageerror', error => runtimeIssues.push(error.message));
  page.on('console', message => {
    if (message.type() === 'warning' || message.type() === 'error') {
      runtimeIssues.push(`${message.type()}: ${message.text()}`);
    }
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() =>
    localStorage.setItem('deep-brace-json:tab-guide-dismissed', 'true'),
  );
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'JSON 编辑器', exact: true })).toBeVisible();
});

test.afterEach(({ page }) => {
  expect(issues.get(page) ?? [], '页面不应产生未解释的 warning 或 error').toEqual([]);
});

test('快捷键和 Escape 关闭搜索时不触发按钮焦点环和提示', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const tree = page.getByRole('region', { name: '树形预览内容', exact: true });
  const searchButton = page.locator('button[aria-label="搜索树节点"]');
  const search = page.locator('[role="search"][aria-label="搜索树节点"]');
  const treeBoundsBefore = await tree.boundingBox();
  await search.evaluate(element => {
    const searchElement = element as HTMLElement;
    searchElement.dataset.transitionRuns = '0';
    searchElement.addEventListener('transitionrun', () => {
      searchElement.dataset.transitionRuns = String(
        Number(searchElement.dataset.transitionRuns) + 1,
      );
    });
  });
  await expect(searchButton).toHaveAttribute('aria-keyshortcuts', 'Alt+Shift+G');
  await page.keyboard.press('Alt+Shift+g');
  const searchInput = search.getByRole('searchbox', {
    name: '搜索键、值或路径',
    exact: true,
  });
  await expect(searchInput).toBeFocused();
  await expect(search).toHaveAttribute('data-open', 'true');
  const searchFieldGroup = search.locator('[data-slot="search-field-group"]');
  await expect(searchFieldGroup).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(searchFieldGroup).toHaveCSS('border-radius', '14px');
  await expect(
    searchFieldGroup.getByRole('button', { name: '使用正则表达式', exact: true }),
  ).toHaveCount(0);
  await expect(searchFieldGroup.getByRole('button', { name: /^搜索范围/ })).toBeVisible();
  await expect(
    searchFieldGroup.getByRole('button', { name: '区分大小写', exact: true }),
  ).toBeVisible();
  await expect(
    searchFieldGroup.getByRole('button', { name: '上一个匹配', exact: true }),
  ).toBeVisible();
  await expect(
    searchFieldGroup.getByRole('button', { name: '关闭树搜索', exact: true }),
  ).toBeVisible();
  await expect(
    searchFieldGroup.getByRole('button', { name: '拖动搜索面板', exact: true }),
  ).toBeVisible();
  await expect(searchFieldGroup.getByRole('status')).toHaveCount(1);
  await expect
    .poll(async () => Number(await search.getAttribute('data-transition-runs')))
    .toBeGreaterThan(0);
  const entranceTransitionRuns = Number(await search.getAttribute('data-transition-runs'));

  const treeBoundsAfter = await tree.boundingBox();
  expect(treeBoundsAfter).toEqual(treeBoundsBefore);
  const searchBounds = await search.boundingBox();
  expect(searchBounds).not.toBeNull();
  expect(searchBounds!.width).toBeLessThanOrEqual(480);
  expect(searchBounds!.height).toBeLessThanOrEqual(40);
  expect(searchBounds!.y).toBeGreaterThanOrEqual(treeBoundsAfter!.y);
  expect(searchBounds!.y).toBeLessThan(treeBoundsAfter!.y + treeBoundsAfter!.height);

  await page.keyboard.press('Alt+Shift+g');
  await expect(search).toHaveAttribute('data-open', 'false');
  await expect
    .poll(async () => Number(await search.getAttribute('data-transition-runs')))
    .toBeGreaterThan(entranceTransitionRuns);
  await expect(search).toBeHidden();
  await expect(page.getByRole('region', { name: '树形预览', exact: true })).toBeFocused();
  await expect(searchButton).not.toBeFocused();
  await expect(searchButton).not.toHaveAttribute('data-focus-visible', 'true');
  await expect(page.getByRole('tooltip')).toHaveCount(0);

  await page.keyboard.press('Alt+Shift+g');
  await expect(search).toHaveAttribute('data-open', 'true');
  await expect(searchInput).toBeFocused();
  await searchInput.press('Escape');
  await expect(search).toBeHidden();
  await expect(page.getByRole('region', { name: '树形预览', exact: true })).toBeFocused();
  await expect(searchButton).not.toBeFocused();
  await expect(searchButton).not.toHaveAttribute('data-focus-visible', 'true');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
});

test('拖拽搜索面板并在刷新后恢复位置', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.locator('button[aria-label="搜索树节点"]').click();
  const search = page.getByRole('search', { name: '搜索树节点', exact: true });
  const tree = page.getByRole('region', { name: '树形预览内容', exact: true });
  const dragHandle = search.getByRole('button', { name: '拖动搜索面板', exact: true });
  const before = await search.boundingBox();
  const treeBounds = await tree.boundingBox();
  const handleBounds = await dragHandle.boundingBox();
  expect(before).not.toBeNull();
  expect(treeBounds).not.toBeNull();
  expect(handleBounds).not.toBeNull();

  const targetPosition = {
    x: treeBounds!.x - before!.width - 32,
    y: before!.y + 110,
  };
  const handleOffset = {
    x: handleBounds!.x + handleBounds!.width / 2 - before!.x,
    y: handleBounds!.y + handleBounds!.height / 2 - before!.y,
  };

  await page.mouse.move(
    handleBounds!.x + handleBounds!.width / 2,
    handleBounds!.y + handleBounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(targetPosition.x + handleOffset.x, targetPosition.y + handleOffset.y, {
    steps: 8,
  });
  await page.mouse.up();

  const moved = await search.boundingBox();
  expect(moved!.x + moved!.width).toBeLessThan(treeBounds!.x);
  expect(moved!.y).toBeGreaterThan(before!.y + 70);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('deep-brace-json');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        const value = await new Promise<{ treeSearchPosition?: unknown } | undefined>(
          (resolve, reject) => {
            const request = database
              .transaction('app-state', 'readonly')
              .objectStore('app-state')
              .get('current');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          },
        );
        database.close();
        return value?.treeSearchPosition;
      }),
    )
    .toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));

  await page.reload();
  await page.locator('button[aria-label="搜索树节点"]').click();
  const restored = await search.boundingBox();
  expect(restored!.x).toBeCloseTo(moved!.x, 0);
  expect(restored!.y).toBeCloseTo(moved!.y, 0);

  await dragHandle.focus();
  await dragHandle.press('ArrowLeft');
  const keyboardMoved = await search.boundingBox();
  expect(keyboardMoved!.x).toBeCloseTo(restored!.x - 8, 0);

  await page.setViewportSize({ width: 375, height: 812 });
  const mobileSearch = page.locator('[role="search"][aria-label="搜索树节点"]');
  await expect
    .poll(async () => {
      const mobileBounds = await mobileSearch.boundingBox();
      return Boolean(
        mobileBounds &&
        mobileBounds.x >= 0 &&
        mobileBounds.y >= 0 &&
        mobileBounds.x + mobileBounds.width <= 375 &&
        mobileBounds.y + mobileBounds.height <= 812,
      );
    })
    .toBe(true);
});

test('减少动态效果时搜索面板即时显隐', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const searchButton = page.locator('button[aria-label="搜索树节点"]');
  await searchButton.click();
  const search = page.locator('[role="search"][aria-label="搜索树节点"]');
  await expect(search).toBeVisible();
  const scopeTrigger = search.locator('.tree-search-scope [data-slot="select-trigger"]');
  await expect(scopeTrigger).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  expect((await scopeTrigger.boundingBox())!.height).toBeLessThanOrEqual(28);
  const [scopeValueBox, scopeIndicatorBox] = await Promise.all([
    scopeTrigger.locator('[data-slot="select-value"]').boundingBox(),
    scopeTrigger.locator('[data-slot="select-default-indicator"]').boundingBox(),
  ]);
  expect(scopeValueBox).not.toBeNull();
  expect(scopeIndicatorBox).not.toBeNull();
  expect(
    Math.abs(
      scopeValueBox!.y +
        scopeValueBox!.height / 2 -
        (scopeIndicatorBox!.y + scopeIndicatorBox!.height / 2),
    ),
  ).toBeLessThanOrEqual(1);
  await expect(search).toHaveCSS('transition-duration', '0s');
  await search.getByRole('button', { name: '关闭树搜索', exact: true }).click();
  await expect(search).toBeHidden();
});

test('搜索框颜色跟随明暗主题', async ({ page }) => {
  await page.locator('button[aria-label="搜索树节点"]').click();
  const search = page.locator('[role="search"][aria-label="搜索树节点"]');
  const searchFieldGroup = search.locator('[data-slot="search-field-group"]');
  const searchInput = search.getByRole('searchbox', {
    name: '搜索键、值或路径',
    exact: true,
  });
  await expect(searchFieldGroup).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(searchFieldGroup).toHaveCSS('border-radius', '14px');

  await page.getByRole('tab', { name: '深色', exact: true }).click();
  await expect(searchFieldGroup).toHaveCSS('background-color', 'rgb(39, 39, 42)');
  await expect(searchInput).toHaveCSS('color', 'rgb(244, 244, 245)');
});

test('搜索折叠节点并在关闭后恢复折叠状态', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
  const tree = page.getByRole('region', { name: '树形预览内容', exact: true });
  await editor.fill(
    '{"nested":{"deep":{"needle":"hidden-target","again":"hidden-target"}},"visible":true}',
  );
  await expect(tree.getByText('"nested"', { exact: true })).toBeVisible();
  const nestedRow = tree
    .getByText('"nested"', { exact: true })
    .locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " tree-line ")][1]');
  await nestedRow.locator('.tree-chevron').click();
  await expect(nestedRow).toContainText('{ deep }');

  await page.locator('button[aria-label="搜索树节点"]').click();
  const search = page.getByRole('search', { name: '搜索树节点', exact: true });
  await search.getByRole('button', { name: /搜索范围/ }).click();
  await page.getByRole('option', { name: '值', exact: true }).click();
  await search.getByRole('searchbox', { name: '搜索键、值或路径', exact: true }).fill('hidden');
  await expect(search.getByRole('status')).toHaveText('1 / 2');
  await expect(tree.locator('.tree-search-highlight').first()).toHaveText('hidden');
  const activeRow = tree.locator('.tree-line--search-active');
  await expect(activeRow).toContainText('hidden-target');
  await expect(activeRow).toBeInViewport();
  await search.getByRole('searchbox', { name: '搜索键、值或路径', exact: true }).press('Enter');
  await expect(search.getByRole('status')).toHaveText('2 / 2');
  await search
    .getByRole('searchbox', { name: '搜索键、值或路径', exact: true })
    .press('Shift+Enter');
  await expect(search.getByRole('status')).toHaveText('1 / 2');

  await search.getByRole('button', { name: '关闭树搜索', exact: true }).click();
  await expect(nestedRow).toContainText('{ deep }');
});

test('支持路径搜索和标准路径复制', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
  const tree = page.getByRole('region', { name: '树形预览内容', exact: true });
  await editor.fill('{"users":[{"display name":"Blue"}],"a/b":{"~key":1}}');
  await page.locator('button[aria-label="搜索树节点"]').click();
  const search = page.getByRole('search', { name: '搜索树节点', exact: true });
  await search.getByRole('button', { name: /搜索范围/ }).click();
  await page.getByRole('option', { name: '路径', exact: true }).click();
  await search
    .getByRole('searchbox', { name: '搜索键、值或路径', exact: true })
    .fill('$["a/b"]["~key"]');
  await expect(search.getByRole('status')).toHaveText('1 / 1');

  const activeRow = tree.locator('.tree-line--search-active');
  await activeRow.hover();
  await activeRow.getByRole('button', { name: '节点复制选项', exact: true }).click();
  await page.getByRole('menuitem', { name: '复制 JSONPath', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('$["a/b"]["~key"]');

  await activeRow.hover();
  await activeRow.getByRole('button', { name: '节点复制选项', exact: true }).click();
  await page.getByRole('menuitem', { name: '复制 JSON Pointer', exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('/a~1b/~0key');
});

for (const isLargeDocument of [false, true]) {
  test(`节点菜单打开时保留原行 hover，关闭后清理（${isLargeDocument ? '虚拟树' : '普通树'}）`, async ({
    page,
  }) => {
    const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
    const tree = page.getByRole('region', { name: '树形预览内容', exact: true });
    await editor.fill(
      JSON.stringify({
        target: { child: 1 },
        other: 'value',
        padding: isLargeDocument ? 'x'.repeat(262144) : '',
      }),
    );
    await expect(tree.locator('.tree-token-key').filter({ hasText: 'target' })).toBeVisible();
    if (isLargeDocument) await expect(tree).toHaveClass(/tree-virtual/);
    const row = tree
      .locator('.tree-line')
      .filter({ has: page.locator('.tree-token-key', { hasText: 'target' }) })
      .first();
    const button = row.getByRole('button', { name: '节点复制选项', exact: true });
    await row.hover();
    const hoverBackground = await row.evaluate(
      element => getComputedStyle(element).backgroundColor,
    );
    expect(hoverBackground).not.toBe('rgba(0, 0, 0, 0)');
    await button.click();
    const menu = page.getByRole('menu', { name: '节点复制选项', exact: true });
    await menu.getByRole('menuitem', { name: '复制 JSONPath', exact: true }).hover();
    await expect(row).toHaveCSS('background-color', hoverBackground);
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(tree.locator('[data-menu-open="true"]')).toHaveCount(1);
    await expect(button).toHaveCSS('opacity', '1');
    await expect(row.getByRole('button', { name: '复制', exact: true })).toHaveCSS('opacity', '1');
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await page.mouse.move(2, 2);
    await expect(row).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    // Escape 恢复的键盘焦点仍应保留焦点反馈；移走焦点后才恢复隐藏按钮。
    await editor.focus();
    await expect(button).toHaveCSS('opacity', '0');
    await row.hover();
    await button.click();
    await menu.getByRole('menuitem', { name: '复制 JSONPath', exact: true }).click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('$.target');
    await page.mouse.move(2, 2);
    await expect(row).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(tree.locator('[data-menu-open="true"]')).toHaveCount(0);
  });
}

test('大文档 Worker 搜索可定位未挂载节点并临时展开祖先', async ({ page }) => {
  test.setTimeout(30000);
  const workerUrls: string[] = [];
  page.on('worker', worker => workerUrls.push(worker.url()));
  await page.getByRole('button', { name: '选择示例', exact: true }).click();
  await page.getByRole('menuitem', { name: '大文档 · 约 1 MB', exact: true }).click();
  await expect(page.getByText(/已解析 · array · 10001 节点/)).toBeVisible({ timeout: 20000 });

  const tree = page.getByRole('region', { name: '树形预览内容', exact: true });
  await page.keyboard.press('Alt+Shift+x');
  await expect(tree.getByText('2000 项', { exact: true })).toBeVisible();
  await page.locator('button[aria-label="搜索树节点"]').click();
  const search = page.getByRole('search', { name: '搜索树节点', exact: true });
  expect(await search.getByRole('status').textContent()).toBe('');
  await search
    .getByRole('searchbox', { name: '搜索键、值或路径', exact: true })
    .fill('sample-row-1999');
  await expect(search.getByRole('status')).toHaveText('1 / 1', { timeout: 10000 });
  const activeRow = tree.locator('.tree-line--search-active');
  await expect(activeRow).toContainText('sample-row-1999');
  await expect(activeRow).toBeInViewport();
  expect(await tree.locator('*').count()).toBeLessThan(3000);
  expect(workerUrls.some(url => url.includes('tree-search-worker'))).toBe(true);

  await search.getByRole('button', { name: '关闭树搜索', exact: true }).click();
  await expect(tree.getByText('2000 项', { exact: true })).toBeVisible();
  await expect(tree.getByText('"sample-row-1999"', { exact: true })).toHaveCount(0);
});

test('窄屏搜索控件不产生横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator('button[aria-label="搜索树节点"]').click();
  const search = page.getByRole('search', { name: '搜索树节点', exact: true });
  await expect(search).toBeVisible();
  expect(
    await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth })),
  ).toEqual({ body: 375, viewport: 375 });
  const bounds = await search.boundingBox();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(375);
  const mobileInputBounds = await search
    .getByRole('searchbox', { name: '搜索键、值或路径', exact: true })
    .boundingBox();
  expect(mobileInputBounds!.width).toBeGreaterThanOrEqual(110);
  await expect(search.locator('.tree-search-desktop-navigation')).toBeHidden();
  await expect(search.locator('.tree-search-mobile-navigation')).toBeVisible();
});
