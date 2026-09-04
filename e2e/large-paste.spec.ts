import { expect, test, type Locator, type Page } from '@playwright/test';

const readVisibleAnchor = (tree: Locator) =>
  tree.evaluate(element => {
    const top = element.getBoundingClientRect().top;
    const row = Array.from(element.querySelectorAll<HTMLElement>('.virtual-tree-row')).find(
      item => item.getBoundingClientRect().bottom > top + 0.5,
    );
    return row
      ? { key: row.dataset.nodeKey!, offset: row.getBoundingClientRect().top - top }
      : null;
  });

const readSavedAnchor = (page: Page) =>
  page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('deep-brace-json');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const read = (store: string, key: IDBValidKey) =>
        new Promise<unknown>((resolve, reject) => {
          const request = database.transaction(store).objectStore(store).get(key);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      const state = (await read('app-state', 'current')) as { activeTabId: string };
      const position = (await read('tab-scroll', [state.activeTabId, 'tree'])) as
        | {
            anchor?: { nodeKey?: string; viewportOffset: number };
          }
        | undefined;
      return position?.anchor;
    } finally {
      database.close();
    }
  });

const issues = new WeakMap<Page, string[]>();
const restoringPages = new WeakSet<Page>();
test.beforeEach(async ({ page, context }) => {
  const errors: string[] = [];
  issues.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    // PLAN-006 已复现并记录：CodeMirror 在大文档刷新/恢复滚动时会重新测量。
    if (
      restoringPages.has(page) &&
      message.type() === 'warning' &&
      message.text() === 'Measure loop restarted more than 5 times'
    )
      return;
    if (['warning', 'error'].includes(message.type())) errors.push(message.text());
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() =>
    localStorage.setItem('deep-brace-json:tab-guide-dismissed', 'true'),
  );
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'JSON 编辑器', exact: true })).toBeVisible();
});
test.afterEach(({ page }) => expect(issues.get(page)).toEqual([]));

for (const { rows, width, pretty } of [
  { rows: 2000, width: 1280, pretty: true },
  { rows: 20000, width: 1280, pretty: false },
  { rows: 20000, width: 1280, pretty: true },
  { rows: 2000, width: 375, pretty: true },
]) {
  test(`真实粘贴 ${rows} 条记录 ${width}px ${pretty ? '格式化' : '紧凑'}后虚拟滚动且原文完整`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 800 });
    const input = JSON.stringify(
      Array.from({ length: rows }, (_, index) => ({
        id: index,
        name: `paste-row-${index}`,
        message: 'plain text '.repeat(40),
        enabled: true,
      })),
      null,
      pretty ? 2 : undefined,
    );
    let workerCount = 0;
    page.on('worker', () => {
      workerCount += 1;
    });
    await page.evaluate(text => navigator.clipboard.writeText(text), input);
    const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
    await editor.focus();
    await page.keyboard.press('ControlOrMeta+a');
    // 原生剪贴板路径；fill 在多行 contenteditable 上不是一次真实粘贴。
    await page.keyboard.press('ControlOrMeta+v');
    await expect(page.getByText(new RegExp(`已解析 · array · ${rows * 5 + 1} 节点`))).toBeVisible({
      timeout: 20000,
    });
    expect(workerCount).toBeGreaterThan(0);
    await expect(page.getByText(/大文档预览 · 按需渲染/)).toBeVisible();
    const tree = page.getByRole('region', { name: '树形预览内容', exact: true });
    const before = await tree.locator('*').count();
    expect(before).toBeLessThan(3000);
    await expect(tree.getByText('"paste-row-0"', { exact: true })).toHaveCount(1);
    await expect(tree.getByText('"paste-row-100"', { exact: true })).toHaveCount(0);
    await tree.focus();
    await page.keyboard.press('End');
    await expect(
      tree.getByText(`"paste-row-${rows - 1}"`, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(tree.locator('[data-node-key="[]:close"]')).toBeInViewport();
    expect(await tree.locator('*').count()).toBeLessThan(3000);
    await page.keyboard.press('Home');
    await expect(tree.getByText('"paste-row-0"', { exact: true })).toBeVisible();
    // 聚焦与折叠不能丢失完整输入。
    await page.keyboard.press('Alt+Shift+i');
    await expect(editor).toBeFocused();
    await page.keyboard.press('Alt+Shift+x');
    await expect(tree.getByText(`${rows} 项`, { exact: true })).toBeVisible();
    expect(await tree.locator('*').count()).toBeLessThan(100);
    await page.keyboard.press('Alt+Shift+x');
    await expect(tree.getByText('"paste-row-0"', { exact: true })).toHaveCount(1);
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const database = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('deep-brace-json');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          try {
            const state = await new Promise<{
              activeTabId: string;
              tabs: Array<{ id: string; input: string }>;
            }>(resolve => {
              const request = database
                .transaction('app-state')
                .objectStore('app-state')
                .get('current');
              request.onsuccess = () => resolve(request.result);
            });
            return state?.tabs.find(tab => tab.id === state.activeTabId)?.input;
          } finally {
            database.close();
          }
        }),
      )
      .toBe(input);
    // 原生滚动事件结束恢复，再跳到文档中部；刷新必须按节点而非估计像素恢复。
    await tree.focus();
    await page.keyboard.press('PageDown');
    await tree.evaluate(element => {
      element.scrollTop = Math.floor(element.scrollHeight * 0.6);
    });
    await expect.poll(() => tree.evaluate(element => element.scrollTop)).toBeGreaterThan(10000);
    await expect
      .poll(
        async () => (await readSavedAnchor(page))?.nodeKey === (await readVisibleAnchor(tree))?.key,
      )
      .toBe(true);
    const anchor = (await readVisibleAnchor(tree))!;
    await page.screenshot({ path: `/tmp/deepbrace-virtual-${rows}-${width}.png` });
    restoringPages.add(page);
    await page.reload();
    await expect(page.getByText(new RegExp(`已解析 · array · ${rows * 5 + 1} 节点`))).toBeVisible({
      timeout: 20000,
    });
    expect(await tree.locator('*').count()).toBeLessThan(3000);
    await expect(tree.locator('.virtual-tree-row')).not.toHaveCount(0);
    await expect.poll(async () => (await readVisibleAnchor(tree))?.key).toBe(anchor.key);
    await expect
      .poll(async () => Math.abs((await readVisibleAnchor(tree))!.offset - anchor.offset))
      .toBeLessThan(8);
    // 标签切换重新挂载后仍定位到同一节点。
    await page.keyboard.press('Alt+Shift+]');
    await expect(tree.locator('.virtual-tree-row')).toHaveCount(0);
    await page.keyboard.press('Alt+Shift+[');
    await expect.poll(async () => (await readVisibleAnchor(tree))?.key).toBe(anchor.key);
    await page.keyboard.press('Alt+Shift+l');
    await expect(tree).toHaveClass(/tree-nowrap/);
    await expect.poll(async () => (await readVisibleAnchor(tree))?.key).toBe(anchor.key);
    await page.keyboard.press('Alt+Shift+l');
    await expect(tree).toHaveClass(/tree-wrap/);
    await expect.poll(async () => (await readVisibleAnchor(tree))?.key).toBe(anchor.key);
    // 配色、字体和视口宽度变更后，动态行之间不能重叠或留空。
    await page.keyboard.press('Alt+Shift+t');
    const dialog = page.getByRole('dialog', { name: '主题', exact: true });
    await dialog.getByRole('button', { name: /代码字体/ }).click();
    await page.getByRole('option', { name: 'Source Code Pro', exact: true }).click();
    await dialog.getByRole('button', { name: /代码配色/ }).click();
    await page.getByRole('option', { name: 'Dracula', exact: true }).click();
    await dialog.getByRole('button', { name: '关闭主题设置', exact: true }).click();
    await expect(tree).toHaveAttribute('data-tree-theme', 'dracula');
    await page.setViewportSize({ width: width === 1280 ? 1024 : 414, height: 800 });
    await expect
      .poll(() =>
        tree.evaluate(element => {
          const rows = Array.from(element.querySelectorAll('.virtual-tree-row'));
          return rows
            .slice(1)
            .every(
              (row, index) =>
                Math.abs(
                  row.getBoundingClientRect().top - rows[index].getBoundingClientRect().bottom,
                ) < 2,
            );
        }),
      )
      .toBe(true);
    await tree.focus();
    await page.keyboard.press('Home');
    const firstNode = tree.getByRole('button', { name: '折叠节点 [0]', exact: true });
    await expect(firstNode).toBeVisible();
    await firstNode.focus();
    await page.keyboard.press('Enter');
    await expect(tree.getByRole('button', { name: '展开节点 [0]', exact: true })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(tree.getByText('"paste-row-0"', { exact: true })).toHaveCount(0);
    await expect(tree.locator('[data-node-key="[1]"]')).toHaveAttribute('data-line-number', '8');
    await page.keyboard.press('Enter');
    await expect(tree.getByText('"paste-row-0"', { exact: true })).toHaveCount(1);
    await expect(tree.getByRole('button', { name: /继续展示/ })).toHaveCount(0);
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  });
}

test('长字符串只限制树预览，原文与复制保持完整', async ({ page }) => {
  const value = 'L'.repeat(400000);
  await page.evaluate(
    text => navigator.clipboard.writeText(JSON.stringify({ value: text })),
    value,
  );
  const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
  await editor.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+v');
  const tree = page.getByRole('region', { name: '树形预览内容', exact: true });
  await expect(tree.getByText(/共 400000 字符/)).toBeVisible();
  expect((await tree.textContent())!.length).toBeLessThan(2000);
  await tree
    .locator('.tree-line')
    .filter({ hasText: /共 400000 字符/ })
    .getByRole('button', { name: '复制', exact: true })
    .click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(value);
});
