import { expect, test } from '@playwright/test';

test('Logo 右侧大文档亮点支持提示并在窄屏让位于工具', async ({ page }) => {
  const issues: string[] = [];
  page.on('pageerror', error => issues.push(error.message));
  page.on('console', message => {
    if (['warning', 'error'].includes(message.type())) issues.push(message.text());
  });
  await page.addInitScript(() =>
    localStorage.setItem('deep-brace-json:tab-guide-dismissed', 'true'),
  );
  await page.goto('/');
  await expect(page).toHaveTitle(/DeepBrace JSON/);
  await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
  const header = page.getByRole('banner');
  const highlight = header.getByRole('button', { name: '大文档优化', exact: true });
  const description = '后台解析 · 按需渲染 · 完整复制。可在「示例」中体验约 1 MB / 10 MB 大文档。';
  const tooltip = page.getByRole('tooltip', { name: description, exact: true });
  for (const width of [375, 1279, 1280, 1535, 1536]) {
    await page.setViewportSize({ width, height: 800 });
    if (width < 1280) await expect(highlight).toBeHidden();
    else await expect(highlight).toBeVisible();
    await expect
      .poll(() => header.evaluate(element => element.scrollWidth - element.clientWidth))
      .toBeLessThanOrEqual(1);
    const actions = header.locator('.toolbar-actions');
    const actionBounds = (await actions.boundingBox())!;
    expect(actionBounds.x + actionBounds.width).toBeLessThanOrEqual(width);
    if (width >= 1280) {
      const highlightBounds = (await highlight.boundingBox())!;
      expect(highlightBounds.x + highlightBounds.width).toBeLessThan(actionBounds.x);
      await page.mouse.move(0, 0);
      await highlight.hover();
      await expect(tooltip).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(tooltip).toBeHidden();
    }
    const otherHighlight = header.getByText('嵌套解析', { exact: true });
    if (width >= 1536) await expect(otherHighlight).toBeVisible();
    else await expect(otherHighlight).toBeHidden();
    if (width === 375) {
      await page.screenshot({
        path: '/tmp/deepbrace-highlight-mobile.png',
        clip: { x: 0, y: 0, width, height: 110 },
      });
    }
  }
  const featureGroup = header.getByRole('group', { name: '产品亮点', exact: true });
  const featureTags = featureGroup.getByRole('button');
  await expect(featureTags).toHaveCount(5);
  for (const tag of await featureTags.all()) await expect(tag).toHaveCSS('border-width', '0px');
  await page.mouse.move(0, 0);
  const tagStyles = await featureTags.evaluateAll(elements =>
    elements.map(element => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return {
        color: style.color,
        background: style.backgroundColor,
        height: bounds.height,
        top: bounds.y,
      };
    }),
  );
  for (const style of tagStyles) expect(style).toEqual(tagStyles[0]);
  const actionsBounds = (await header.locator('.toolbar-actions').boundingBox())!;
  const groupBounds = (await featureGroup.boundingBox())!;
  expect(groupBounds.x + groupBounds.width).toBeLessThan(actionsBounds.x);
  for (const [label, detail] of [
    ['嵌套解析', '将字符串中的 JSON 对象或数组解析到新标签，继续逐层查看。'],
    ['数据持久化', '标签、内容和偏好自动保存在当前浏览器，刷新后继续工作。'],
    ['多标签工作区', '并排管理多份 JSON，支持重命名、左右添加和批量关闭。'],
    ['JSON5 支持', '支持注释、尾随逗号和未加引号的键，也可格式化为标准 JSON。'],
  ]) {
    await featureGroup.getByRole('button', { name: label, exact: true }).hover();
    const featureTooltip = page.getByRole('tooltip', { name: detail, exact: true });
    await expect(featureTooltip).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(featureTooltip).toBeHidden();
  }
  await page.screenshot({
    path: '/tmp/deepbrace-feature-tags-light.png',
    clip: { x: 0, y: 0, width: 900, height: 100 },
  });
  await page.mouse.move(0, 0);
  await page.keyboard.press('Tab');
  await highlight.focus();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).not.toHaveAttribute('data-entering', 'true');
  await page.screenshot({
    path: '/tmp/deepbrace-highlight-desktop.png',
    clip: { x: 0, y: 0, width: 1536, height: 135 },
  });
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: '深色', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: '/tmp/deepbrace-feature-tags-dark.png',
    clip: { x: 0, y: 0, width: 900, height: 100 },
  });
  await page.mouse.move(0, 0);
  await highlight.hover();
  await expect(tooltip).toBeVisible();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  expect(issues).toEqual([]);
});
