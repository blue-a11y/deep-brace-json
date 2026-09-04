import { expect, test } from '@playwright/test';

for (const width of [375, 1280]) {
  test(`生产样式慢加载时骨架已绘制，样式就绪后再显示工作区 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    let releaseStyles!: () => void;
    const stylesGate = new Promise<void>(resolve => {
      releaseStyles = resolve;
    });
    await page.route(/\/assets\/index-[^/]+\.css$/, async route => {
      await stylesGate;
      await route.continue();
    });
    try {
      await page.goto('/', { waitUntil: 'commit' });
      await expect(page.getByRole('status')).toBeVisible();
      test.skip(
        (await page.locator('script[src="/src/main.tsx"]').count()) > 0,
        '仅生产构建输出独立 CSS；必须另外对 preview / 线上运行本用例。',
      );
      await expect(page.locator('link[data-workspace-styles]')).toHaveCount(1);
      await expect(page.getByRole('status')).toHaveText('正在加载工作区…');
      await expect
        .poll(() =>
          page.evaluate(() => performance.getEntriesByName('first-contentful-paint').length),
        )
        .toBe(1);
      await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toHaveCount(0);
      await expect(page.locator('link[data-workspace-styles]')).toHaveAttribute('media', 'print');
      await page.screenshot({ path: `/tmp/deepbrace-css-pending-${width}.png` });
      releaseStyles();
      await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
      await expect(page.locator('link[data-workspace-styles]')).toHaveAttribute('media', 'all');
      await expect(page.locator('[data-workspace-pane="editor"]')).toHaveCSS(
        'border-top-left-radius',
        '16px',
      );
      await expect(page.getByLabel('工作区加载状态')).toHaveCount(0);
    } finally {
      releaseStyles();
    }
  });
}

test('生产样式下载失败保留骨架和重试入口，刷新后可恢复', async ({ page }) => {
  await page.route(/\/assets\/index-[^/]+\.css$/, route => route.abort('failed'));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.getByRole('status')).toBeVisible();
  test.skip(
    (await page.locator('script[src="/src/main.tsx"]').count()) > 0,
    '仅生产构建输出独立 CSS；必须另外对 preview / 线上运行本用例。',
  );
  await expect(page.locator('link[data-workspace-styles]')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveText('工作区样式加载失败，请重新加载。');
  await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toHaveCount(0);
  await page.unroute(/\/assets\/index-[^/]+\.css$/);
  await page.getByRole('link', { name: '等待过久？重新加载' }).click();
  await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
  expect(errors).toEqual([]);
});
