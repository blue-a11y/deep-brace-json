import { expect, test } from '@playwright/test';

for (const width of [375, 639, 640, 859, 860, 1280]) {
  test(`骨架与工作区品牌字形一致且不依赖外部字体 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('https://fonts.googleapis.com/**', route =>
      route.fulfill({ contentType: 'text/css', body: '' }),
    );
    let releaseEntry!: () => void;
    const entryGate = new Promise<void>(resolve => {
      releaseEntry = resolve;
    });
    await page.route(/\/(src\/main\.tsx|assets\/index-[^/]+\.js)(\?.*)?$/, async route => {
      await entryGate;
      await route.continue();
    });
    const brand = page.locator('.brand-wordmark');
    const readBrand = () =>
      brand.evaluate(element => {
        const style = getComputedStyle(element);
        const { x, y, width, height } = element.getBoundingClientRect();
        const symbol = document.querySelector('.brand-symbol')!;
        const symbolStyle = getComputedStyle(symbol);
        const symbolRect = symbol.getBoundingClientRect();
        return {
          x,
          y,
          width,
          height,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          color: style.color,
          symbol: {
            x: symbolRect.x,
            y: symbolRect.y,
            width: symbolRect.width,
            height: symbolRect.height,
            font: symbolStyle.font,
            color: symbolStyle.color,
            background: symbolStyle.backgroundColor,
          },
        };
      });
    try {
      await page.goto('/', { waitUntil: 'commit' });
      await expect(brand).toHaveText('DeepBrace JSON');
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() =>
          Array.from(document.fonts).some(
            font =>
              font.family.replaceAll('"', '') === 'DeepBrace Logo' && font.status === 'loaded',
          ),
        ),
      ).toBe(true);
      const skeletonBrand = await readBrand();
      await page.screenshot({ path: `/tmp/deepbrace-brand-skeleton-${width}.png` });
      releaseEntry();
      await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
      const workspaceBrand = await readBrand();
      expect(workspaceBrand).toEqual(skeletonBrand);
      await expect(page.locator('.shuffle-parent')).toHaveCount(0);
    } finally {
      releaseEntry();
    }
  });
}

test('字体样式慢加载不阻塞工作区，返回后异步应用', async ({ page }) => {
  let releaseFonts!: () => void;
  const fontGate = new Promise<void>(resolve => {
    releaseFonts = resolve;
  });
  await page.route('https://fonts.googleapis.com/**', async route => {
    await fontGate;
    await route.fulfill({ contentType: 'text/css', body: '' });
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
    const fontStyles = page.locator('link[href^="https://fonts.googleapis.com/css2"]');
    await expect(fontStyles).toHaveAttribute('media', 'print');
    releaseFonts();
    await expect(fontStyles).toHaveAttribute('media', 'all');
  } finally {
    releaseFonts();
  }
});

for (const { width, colorScheme } of [
  { width: 1280, colorScheme: 'light' },
  { width: 375, colorScheme: 'light' },
  { width: 320, colorScheme: 'light' },
  { width: 767, colorScheme: 'light' },
  { width: 768, colorScheme: 'light' },
  { width: 1280, colorScheme: 'dark' },
  { width: 375, colorScheme: 'dark' },
] as const) {
  test(`入口下载时显示响应式骨架，完成后恢复工作区 ${width}px ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    let releaseEntry!: () => void;
    const entryGate = new Promise<void>(resolve => {
      releaseEntry = resolve;
    });
    await page.route(/\/(src\/main\.tsx|assets\/index-[^/]+\.js)(\?.*)?$/, async route => {
      await entryGate;
      await route.continue();
    });
    const issues: string[] = [];
    page.on('pageerror', error => issues.push(error.message));
    page.on('console', message => {
      if (['error', 'warning'].includes(message.type())) issues.push(message.text());
    });
    try {
      await page.goto('/', { waitUntil: 'commit' });
      await expect(page.getByRole('status')).toHaveText('正在加载工作区…');
      await expect(page.getByRole('link', { name: '等待过久？重新加载' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toHaveCount(0);
      const skeleton = page.getByLabel('工作区加载状态');
      await expect(skeleton.locator('.startup-pane')).toHaveCount(2);
      await expect(skeleton).toHaveCSS(
        'background-color',
        colorScheme === 'dark' ? 'rgb(24, 24, 27)' : 'rgb(245, 245, 245)',
      );
      const panes = await skeleton.locator('.startup-pane').evaluateAll(elements =>
        elements.map(element => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return { x, y, width, height };
        }),
      );
      if (width >= 768) {
        expect(panes[0].y).toBe(panes[1].y);
        expect(panes[0].x + panes[0].width).toBeLessThan(panes[1].x);
      } else {
        expect(panes[0].x).toBe(panes[1].x);
        expect(panes[0].y + panes[0].height).toBeLessThan(panes[1].y);
      }
      expect(await skeleton.evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0);
      expect(await skeleton.evaluate(element => element.scrollHeight - element.clientHeight)).toBe(
        0,
      );
      await expect(skeleton.locator('.startup-lines').first()).toHaveCSS('animation-name', 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect(skeleton.locator('.startup-lines').first()).toHaveCSS(
        'animation-name',
        'startup-pulse',
      );
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.screenshot({ path: `/tmp/deepbrace-skeleton-${width}-${colorScheme}.png` });
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: '等待过久？重新加载' })).toBeFocused();
      releaseEntry();
      await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
      await expect(page.getByLabel('工作区加载状态')).toHaveCount(0);
      await expect(page).toHaveTitle(/DeepBrace JSON/);
      await expect(page.locator('vite-error-overlay')).toHaveCount(0);
      expect(issues).toEqual([]);
    } finally {
      releaseEntry();
    }
  });
}

for (const width of [375, 1280]) {
  for (const { name, triggerName, dialogName, closeName, contentText, key } of [
    {
      name: '主题',
      triggerName: '打开主题设置',
      dialogName: '主题',
      closeName: '关闭主题设置',
      contentText: '代码内容字形',
      key: 'T',
    },
    {
      name: '设置',
      triggerName: '打开全局设置',
      dialogName: '全局设置',
      closeName: '关闭设置',
      contentText: '完整展示长字符串',
      key: 'S',
    },
    {
      name: '快捷键',
      triggerName: '查看快捷键',
      dialogName: '快捷键',
      closeName: '关闭快捷键',
      contentText: '统一修饰键',
      key: 'H',
    },
  ]) {
    test(`${name}弹窗首次打开无需下载脚本，关闭和快捷键重开正常 ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript(() =>
        localStorage.setItem('deep-brace-json:tab-guide-dismissed', 'true'),
      );
      const issues: string[] = [];
      const blockedScripts: string[] = [];
      page.on('pageerror', error => issues.push(error.message));
      page.on('console', message => {
        if (['error', 'warning'].includes(message.type())) issues.push(message.text());
      });
      await page.goto('/');
      const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
      await expect(editor).toBeVisible();
      await page.route('**/*', route => {
        if (route.request().resourceType() === 'script') {
          blockedScripts.push(route.request().url());
          return route.abort('failed');
        }
        return route.continue();
      });

      const trigger = page.getByRole('button', { name: triggerName, exact: true });
      if (width === 1280) {
        await trigger.click();
      } else {
        await page.getByRole('button', { name: '打开工具菜单', exact: true }).click();
        await page.getByRole('menuitem', { name, exact: true }).click();
      }
      const dialog = page.getByRole('dialog', { name: dialogName, exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(contentText, { exact: true })).toBeVisible();
      await expect(dialog.getByRole('status')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      if (width === 1280) await expect(trigger).toBeFocused();

      await editor.focus();
      await page.keyboard.press(`Alt+Shift+${key}`);
      await expect(dialog.getByText(contentText, { exact: true })).toBeVisible();
      await dialog.getByRole('button', { name: closeName, exact: true }).click();
      await expect(dialog).toHaveCount(0);
      await expect(editor).toBeFocused();
      expect(blockedScripts).toEqual([]);
      expect(issues).toEqual([]);
    });
  }
}

test('品牌动效延迟或下载失败时保留静态品牌，不阻塞编辑器', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const issues: string[] = [];
  page.on('pageerror', error => issues.push(error.message));
  let releaseAnimation!: () => void;
  const animationGate = new Promise<void>(resolve => {
    releaseAnimation = resolve;
  });
  await page.route(/\/animated-brand[^/]*\.(tsx|js)(\?.*)?$/, async route => {
    await animationGate;
    await route.abort('failed');
  });
  try {
    const animationRequest = page.waitForRequest(/\/animated-brand[^/]*\.(tsx|js)(\?.*)?$/);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await animationRequest;
    await expect(page.locator('.font-logo')).toHaveText('DeepBrace JSON');
    await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
    const failedRequest = page.waitForEvent('requestfailed', {
      predicate: request => /animated-brand/.test(request.url()),
    });
    releaseAnimation();
    await failedRequest;
    await page.locator('button[aria-label="新建标签"]').click();
    await expect(page.getByRole('tab', { name: /Brace 3/ })).toBeVisible();
    await expect(page.locator('.font-logo')).toHaveText('DeepBrace JSON');
    expect(issues).toEqual([]);
  } finally {
    releaseAnimation();
  }
});

test('品牌动效正常加载，动态切换减少动态效果后恢复静态品牌', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('https://fonts.googleapis.com/**', route =>
    route.fulfill({ contentType: 'text/css', body: '' }),
  );
  const issues: string[] = [];
  page.on('pageerror', error => issues.push(error.message));
  await page.goto('/');
  await expect(page.locator('.shuffle-parent.is-ready')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.shuffle-parent')).toHaveCount(0);
  await expect(page.locator('.font-logo')).toHaveText('DeepBrace JSON');
  expect(issues).toEqual([]);
});

test('动效等待其他字体时不会隐藏已经显示的品牌', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let releaseFont!: () => void;
  const fontGate = new Promise<void>(resolve => {
    releaseFont = resolve;
  });
  await page.route('https://fonts.googleapis.com/**', route =>
    route.fulfill({
      contentType: 'text/css',
      body: '@font-face { font-family: Inter; src: url(https://fonts.gstatic.com/brand-test-font.woff2); font-display: swap; }',
    }),
  );
  await page.route('https://fonts.gstatic.com/brand-test-font.woff2', async route => {
    await fontGate;
    await route.abort('failed');
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.brand-wordmark.shuffle-parent')).toBeVisible();
    await expect(page.locator('.brand-wordmark')).toHaveText('DeepBrace JSON');
    await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
    releaseFont();
    await expect(page.locator('.shuffle-parent.is-ready')).toBeVisible();
  } finally {
    releaseFont();
  }
});
