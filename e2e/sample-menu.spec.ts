import { expect, test, type Page } from '@playwright/test';

const openSamples = async (page: Page) => {
  const trigger = page.getByRole('button', { name: '选择示例', exact: true });
  if (await trigger.isVisible()) {
    await trigger.focus();
    await page.keyboard.press('Enter');
  } else {
    await page.getByRole('button', { name: '打开工具菜单', exact: true }).click();
  }
  const menu = page.getByRole('menu', { name: /^(选择示例|打开工具菜单)$/ });
  await expect(menu).toBeVisible();
  return menu;
};

for (const width of [1280, 375]) {
  test(`鼠标选择示例后没有残留焦点框，键盘焦点仍可见 ${width}px`, async ({ page }) => {
    const issues: string[] = [];
    page.on('pageerror', error => issues.push(error.message));
    page.on('console', message => {
      if (['error', 'warning'].includes(message.type())) issues.push(message.text());
    });
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() =>
      localStorage.setItem('deep-brace-json:tab-guide-dismissed', 'true'),
    );
    await page.goto('/');
    await expect(page).toHaveTitle(/DeepBrace JSON/);
    await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
    const trigger = page.getByRole('button', {
      name: width === 1280 ? '选择示例' : '打开工具菜单',
      exact: true,
    });
    for (const mode of ['light', 'dark']) {
      if (mode === 'dark') {
        if (width === 1280) await page.getByRole('tab', { name: '深色', exact: true }).click();
        else {
          await trigger.click();
          await page.getByRole('menuitem', { name: '切换至深色主题', exact: true }).click();
        }
        await expect(page.locator('html')).toHaveClass(/dark/);
      }
      for (const label of ['普通示例', '大文档 · 约 1 MB', '大文档 · 约 10 MB']) {
        await trigger.click();
        await page.getByRole('menuitem', { name: label, exact: true }).click();
        await expect(page.getByRole('menu')).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await page.mouse.move(0, 0);
        if (label === '普通示例') {
          await page.screenshot({
            path: `/tmp/deepbrace-sample-focus-${width}-${mode}.png`,
            clip: { x: 0, y: 0, width, height: 110 },
          });
        }
        await expect(trigger).toHaveCSS('box-shadow', 'none');
        await expect(trigger).toHaveCSS('outline-style', 'none');
        await expect(page.getByText(/已解析 · (object|array) ·/)).toBeVisible({ timeout: 15000 });
      }
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute('data-focus-visible', 'true');
      await expect(trigger).not.toHaveCSS('box-shadow', 'none');
      await page.screenshot({
        path: `/tmp/deepbrace-sample-keyboard-focus-${width}-${mode}.png`,
        clip: { x: 0, y: 0, width, height: 110 },
      });
      await page.keyboard.press('Enter');
      await page.getByRole('menuitem', { name: '普通示例', exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('menu')).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute('data-focus-visible', 'true');
      await expect(trigger).not.toHaveCSS('box-shadow', 'none');
      await page.keyboard.press('Enter');
      await expect(page.getByRole('menu')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('menu')).toHaveCount(0);
      await expect(trigger).toBeFocused();
    }
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    expect(issues).toEqual([]);
  });
}

for (const width of [1280, 375]) {
  test(`示例菜单支持普通和大文档数据 ${width}px`, async ({ page }) => {
    const issues: string[] = [];
    let isRestoring = false;
    page.on('pageerror', error => issues.push(error.message));
    page.on('console', message => {
      // PLAN-006：仅在刷新阶段容许已记录的 CodeMirror 大文档测量警告。
      if (
        isRestoring &&
        message.type() === 'warning' &&
        message.text() === 'Measure loop restarted more than 5 times'
      )
        return;
      if (['error', 'warning'].includes(message.type())) issues.push(message.text());
    });
    await page.setViewportSize({ width, height: 800 });
    await page.addInitScript(() =>
      localStorage.setItem('deep-brace-json:tab-guide-dismissed', 'true'),
    );
    await page.goto('/');
    await expect(page).toHaveTitle(/DeepBrace JSON/);
    const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
    await expect(editor).toBeVisible();
    let menu = await openSamples(page);
    for (const label of ['普通示例', '大文档 · 约 1 MB', '大文档 · 约 10 MB']) {
      await expect(menu.getByRole('menuitem', { name: label, exact: true })).toBeVisible();
    }
    const bounds = (await menu.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await expect(editor).toContainText('deep-brace-json');
    await page.screenshot({ path: `/tmp/deepbrace-sample-menu-${width}.png` });
    let workerCount = 0;
    page.on('worker', () => {
      workerCount += 1;
    });
    for (const count of width === 1280 ? [2000, 20000] : [2000]) {
      const label = count === 2000 ? '大文档 · 约 1 MB' : '大文档 · 约 10 MB';
      await menu.getByRole('menuitem', { name: label, exact: true }).focus();
      await page.keyboard.press('Enter');
      await expect(menu).toHaveCount(0);
      await expect(
        page.getByText(new RegExp(`已解析 · array · ${count * 5 + 1} 节点`)),
      ).toBeVisible({ timeout: 15000 });
      expect(workerCount).toBeGreaterThan(0);
      const pane = page.getByRole('region', { name: '树形预览', exact: true });
      const noticeText = '大文档预览 · 按需渲染，长值仅预览前 500 字符；复制保留完整内容';
      const notice = pane.getByRole('button', { name: noticeText, exact: true });
      await expect(notice).toBeVisible();
      const titleBounds = (await pane.getByText('树形预览', { exact: true }).boundingBox())!;
      const noticeBounds = (await notice.boundingBox())!;
      expect(Math.abs(titleBounds.y - noticeBounds.y)).toBeLessThan(2);
      expect(noticeBounds.x).toBeGreaterThan(titleBounds.x + titleBounds.width);
      const noticeLabel = notice.getByText(noticeText, { exact: true });
      await expect(noticeLabel).toHaveCSS('text-overflow', 'ellipsis');
      expect(await noticeLabel.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(
        true,
      );
      // 菜单由键盘选择后，先模拟鼠标移动，再进入提示触发区。
      await page.mouse.move(0, 0);
      await notice.hover();
      const tooltip = page.getByRole('tooltip', { name: noticeText, exact: true });
      await expect(tooltip).toHaveText(noticeText);
      const tooltipBounds = (await tooltip.boundingBox())!;
      expect(tooltipBounds.x).toBeGreaterThanOrEqual(0);
      expect(tooltipBounds.x + tooltipBounds.width).toBeLessThanOrEqual(width);
      if (count === 2000) {
        await page.screenshot({ path: `/tmp/deepbrace-inline-notice-${width}.png` });
      }
      await page.keyboard.press('Escape');
      await expect(tooltip).toHaveCount(0);
      await page.mouse.move(0, 0);
      await page.keyboard.press('Tab');
      await notice.focus();
      await expect(tooltip).toHaveText(noticeText);
      await page.keyboard.press('Escape');
      await expect(tooltip).toHaveCount(0);
      const tree = page.getByRole('region', { name: '树形预览内容', exact: true });
      await expect(tree.locator('.virtual-tree-row')).not.toHaveCount(0);
      expect(await tree.locator('*').count()).toBeLessThan(3000);
      await tree.focus();
      await page.keyboard.press('Home');
      const firstRow = tree.locator('[data-node-key="[0]"]');
      const chevron = firstRow.getByRole('button', { name: '折叠节点 [0]', exact: true });
      await expect(chevron).toBeVisible();
      const expectGuideSpacing = async () => {
        const arrowBounds = (await firstRow.locator('.tree-chevron').boundingBox())!;
        const guideBounds = (await firstRow.locator('.virtual-tree-guides').boundingBox())!;
        expect(guideBounds.x - arrowBounds.x - arrowBounds.width).toBeGreaterThanOrEqual(8);
      };
      await expectGuideSpacing();
      await chevron.click();
      const expand = firstRow.getByRole('button', { name: '展开节点 [0]', exact: true });
      await expect(expand).toHaveAttribute('aria-expanded', 'false');
      await expectGuideSpacing();
      await expand.focus();
      await page.keyboard.press('Enter');
      await expect(chevron).toHaveAttribute('aria-expanded', 'true');
      await expectGuideSpacing();
      if (count === 2000) {
        await tree.screenshot({ path: `/tmp/deepbrace-tree-guide-${width}.png` });
      }
      await tree.focus();
      await page.keyboard.press('End');
      await expect(tree.locator('[data-node-key="[]:close"]')).toBeInViewport();
      await expect(tree.getByText(`"sample-row-${count - 1}"`, { exact: true })).toHaveCount(1);
      menu = await openSamples(page);
    }
    await page.keyboard.press('Escape');
    // 等待真实落库后刷新，不以固定等待时间猜测持久化完成。
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
            }>((resolve, reject) => {
              const request = database
                .transaction('app-state')
                .objectStore('app-state')
                .get('current');
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
            return state.tabs.find(tab => tab.id === state.activeTabId)?.input.length ?? 0;
          } finally {
            database.close();
          }
        }),
      )
      .toBeGreaterThan(width === 1280 ? 10000000 : 1000000);
    isRestoring = true;
    await page.reload();
    await expect(page.getByText(/已解析 · array ·/)).toBeVisible({ timeout: 15000 });
    menu = await openSamples(page);
    await menu.getByRole('menuitem', { name: '普通示例', exact: true }).click();
    await expect(page.getByText(/已解析 · object ·/)).toBeVisible();
    await expect(editor).toContainText('deep-brace-json');
    await expect(page.locator('.virtual-tree-row')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^大文档预览 ·/ })).toHaveCount(0);
    await expect(page.getByRole('tab')).toHaveCount(width === 1280 ? 4 : 2);
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
    expect(issues).toEqual([]);
  });
}
