import { expect, test, type Page } from '@playwright/test';

type LayoutFrame = {
  stage: 'skeleton' | 'app';
  rectangles: Array<{ x: number; y: number; width: number; height: number }>;
};

declare global {
  interface Window {
    stopStartupLayoutCapture: () => LayoutFrame[];
  }
}

const startLayoutCapture = (page: Page) =>
  page.evaluate(() => {
    const frames: LayoutFrame[] = [];
    const selectors = [
      '.workspace-toolbar',
      '.brand-symbol',
      '.brand-wordmark',
      '.workspace-tabs',
      '[data-workspace-pane="editor"]',
      '[data-workspace-pane="preview"]',
      '.workspace-status',
    ];
    const capture = () => {
      const elements = selectors.map(selector => document.querySelector(selector));
      if (elements.some(element => !element)) return;
      const frame: LayoutFrame = {
        stage: document.querySelector('.startup-shell') ? 'skeleton' : 'app',
        rectangles: elements.map(element => {
          const { x, y, width, height } = element!.getBoundingClientRect();
          return { x, y, width, height };
        }),
      };
      if (JSON.stringify(frame) !== JSON.stringify(frames.at(-1))) frames.push(frame);
    };
    capture();
    const observer = new MutationObserver(capture);
    observer.observe(document.getElementById('root')!, {
      subtree: true,
      childList: true,
      attributes: true,
    });
    let animationFrame = 0;
    const captureFrame = () => {
      capture();
      animationFrame = requestAnimationFrame(captureFrame);
    };
    animationFrame = requestAnimationFrame(captureFrame);
    window.stopStartupLayoutCapture = () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
      capture();
      return frames;
    };
  });

for (const width of [375, 767, 768, 859, 860, 1280, 1536]) {
  test(`骨架到首帧及稳定页面的结构位置不跳变 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.route('https://fonts.googleapis.com/**', route =>
      route.fulfill({ contentType: 'text/css', body: '' }),
    );
    await page.addInitScript(() =>
      localStorage.setItem('deep-brace-json:tab-guide-dismissed', 'true'),
    );
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
    try {
      await page.goto('/', { waitUntil: 'commit' });
      await expect(page.getByRole('status')).toHaveText('正在加载工作区…');
      await page.evaluate(() => document.fonts.ready);
      await startLayoutCapture(page);
      await page.screenshot({ path: `/tmp/deepbrace-aligned-skeleton-${width}.png` });
      releaseEntry();
      await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
      await expect(page.getByLabel('树形预览内容')).toBeVisible();
      const frames = await page.evaluate(() => window.stopStartupLayoutCapture());
      expect(frames[0].stage).toBe('skeleton');
      expect(frames.some(frame => frame.stage === 'app')).toBe(true);
      for (const frame of frames) expect(frame.rectangles).toEqual(frames[0].rectangles);
      await page.screenshot({ path: `/tmp/deepbrace-aligned-loaded-${width}.png` });
      await page.locator('button[aria-label="新建标签"]').click();
      await expect(page.getByRole('tab', { name: /Brace 3/ })).toBeVisible();
      expect(issues).toEqual([]);
    } finally {
      releaseEntry();
    }
  });
}

for (const width of [375, 1280]) {
  test(`品牌动效接入不重新挂载或缩放已显示图标 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.route('https://fonts.googleapis.com/**', route =>
      route.fulfill({ contentType: 'text/css', body: '' }),
    );
    let releaseAnimation!: () => void;
    const animationGate = new Promise<void>(resolve => {
      releaseAnimation = resolve;
    });
    await page.route(/\/animated-brand[^/]*\.(tsx|js)(\?.*)?$/, async route => {
      await animationGate;
      await route.continue();
    });
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('textbox', { name: 'JSON 编辑器' })).toBeVisible();
      await startLayoutCapture(page);
      const icon = await page.locator('.brand-symbol').elementHandle();
      releaseAnimation();
      await expect(page.locator('.shuffle-parent.is-ready')).toBeVisible();
      // 等第一轮文字滚动到终点，采样覆盖动效执行过程，不只检查模块挂载时。
      await expect
        .poll(() =>
          page.locator('.brand-wordmark [data-final-x]').evaluateAll(
            strips =>
              strips.length > 0 &&
              strips.every(strip => {
                const actual = new DOMMatrixReadOnly(getComputedStyle(strip).transform).m41;
                const target = Number(strip.getAttribute('data-final-x'));
                return Math.abs(actual - target) < 0.05;
              }),
          ),
        )
        .toBe(true);
      expect(
        await icon!.evaluate(element => element === document.querySelector('.brand-symbol')),
      ).toBe(true);
      const frames = await page.evaluate(() => window.stopStartupLayoutCapture());
      for (const frame of frames) expect(frame.rectangles).toEqual(frames[0].rectangles);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('.shuffle-parent')).toHaveCount(0);
      expect(
        await icon!.evaluate(element => element === document.querySelector('.brand-symbol')),
      ).toBe(true);
    } finally {
      releaseAnimation();
    }
  });
}
