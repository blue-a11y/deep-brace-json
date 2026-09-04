import { expect, test, type Locator, type Page } from '@playwright/test';
import { STORAGE_KEYS } from '../src/lib/storage.js';

const runtimeIssues = new WeakMap<Page, string[]>();
const TAB_GUIDE_DISMISSED_KEY = STORAGE_KEYS.tabGuideDismissed;
const TAB_GUIDE_TEST_TITLE = '标签新手引导仅在明确选择不再提示后永久关闭';

type PersistedAppState = {
  shortcutModifiers?: { ctrl: boolean; alt: boolean; meta: boolean; shift: boolean };
  activeTabId?: string;
  codeFont?: string;
  shouldShowFullLongStrings?: boolean;
  tabs?: Array<{ id?: string; input?: string; title?: string; hasCustomTitle?: boolean }>;
  treeTheme?: string;
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

const openThemeSettings = async (page: Page) => {
  const directTrigger = page.getByRole('button', { name: '打开主题设置', exact: true });
  if (await directTrigger.isVisible()) {
    await directTrigger.click();
  } else {
    await page.getByRole('button', { name: '打开工具菜单', exact: true }).click();
    await page.getByRole('menuitem', { name: '主题', exact: true }).click();
  }
  const dialog = page.getByRole('dialog', { name: '主题', exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
};

const setThemePreferences = async (
  page: Page,
  { codeFont, treeTheme }: { codeFont?: string; treeTheme?: string },
) => {
  const dialog = await openThemeSettings(page);
  if (treeTheme) {
    await dialog.getByRole('button', { name: /代码配色/ }).click();
    await page.getByRole('option', { name: treeTheme, exact: true }).click();
  }
  if (codeFont) {
    await dialog.getByRole('button', { name: /代码字体/ }).click();
    await page.getByRole('option', { name: codeFont, exact: true }).click();
  }
  await dialog.getByRole('button', { name: '关闭主题设置', exact: true }).click();
};

test.beforeEach(async ({ page }, testInfo) => {
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

  if (testInfo.title !== TAB_GUIDE_TEST_TITLE) {
    await page.addInitScript(
      key => window.localStorage.setItem(key, 'true'),
      TAB_GUIDE_DISMISSED_KEY,
    );
  }

  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

test.afterEach(({ page }) => {
  expect(runtimeIssues.get(page) ?? [], '页面不应产生未解释的 warning 或 error').toEqual([]);
});

test('原有快捷键继续支持编辑器转换、树形控制和标签切换', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
  const tree = page.getByRole('region', { name: '树形预览', exact: true });
  await editor.fill('{alpha: [1,2]}');
  await page.keyboard.press('Alt+Shift+f');
  await expect(editor).toContainText('"alpha": [');
  await page.keyboard.press('Alt+Shift+m');
  await expect(editor).toHaveText('{"alpha":[1,2]}');
  await page.keyboard.press('Alt+Shift+e');
  await expect(editor).toHaveText(JSON.stringify('{"alpha":[1,2]}'));
  await page.keyboard.press('Alt+Shift+u');
  await expect(editor).toHaveText('{"alpha":[1,2]}');
  await expect(tree.getByText('"alpha"', { exact: true })).toBeVisible();
  await page.keyboard.press('Alt+Shift+x');
  await expect(tree.getByText('展开', { exact: true })).toBeVisible();
  await page.keyboard.press('Alt+Shift+x');
  await expect(tree.getByText('折叠', { exact: true })).toBeVisible();
  await page.keyboard.press('Alt+Shift+l');
  await expect(tree.getByText('不换行', { exact: true })).toBeVisible();
  await page.keyboard.press('Alt+Shift+l');
  await expect(tree.getByText('换行', { exact: true })).toBeVisible();
  const tabs = page.getByRole('tablist', { name: '已打开的 JSON' }).getByRole('tab');
  await page.keyboard.press('Alt+Shift+]');
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Alt+Shift+[');
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Alt+Shift+w');
  await expect(tabs).toHaveCount(1);
  await page.keyboard.press('Alt+Shift+w');
  await expect(tabs).toHaveCount(1);
});

test('快捷键聚焦编辑器保留选区，支持重命名和左右添加标签', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
  const tabs = page.getByRole('tablist', { name: '已打开的 JSON' }).getByRole('tab');
  await editor.fill('{"keyboard": true}');
  await editor.press('Home');
  await editor.press('Shift+ArrowRight');
  const selection = await page.evaluate(() => window.getSelection()?.toString());
  await tabs.first().focus();
  await page.keyboard.press('Alt+Shift+i');
  await expect(editor).toBeFocused();
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(selection);
  await expect(editor).toHaveText('{"keyboard": true}');
  await page.keyboard.press('Alt+Shift+r');
  const renameInput = page.getByRole('textbox', { name: '标签名称' });
  await expect(renameInput).toBeFocused();
  await expect(renameInput).toHaveValue('Brace 1');
  await page.keyboard.press('Alt+Shift+n');
  await expect(tabs).toHaveCount(2);
  await renameInput.fill('键盘标签');
  await renameInput.press('Enter');
  await expect(renameInput).toBeHidden();
  await expect(tabs.first()).toContainText('键盘标签');
  await expect(tabs.first()).toBeFocused();
  await page.keyboard.press('Alt+Shift+a');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.nth(1)).toContainText('键盘标签');
  await page.keyboard.press('Alt+Shift+d');
  await expect(tabs).toHaveCount(4);
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.nth(2)).toContainText('键盘标签');
  await page.keyboard.press('Alt+Shift+i');
  await expect(editor).toBeFocused();
  await expect(editor.locator('.cm-placeholder')).toBeVisible();
});

for (const [key, count, message] of [
  ['j', 2, '已关闭左侧 1 个标签'],
  ['k', 2, '已关闭右侧 1 个标签'],
  ['o', 1, '已关闭其它 2 个标签'],
] as const) {
  test(`批量关闭快捷键 ${key} 作用于当前标签并支持撤销`, async ({ page }) => {
    const tabs = page.getByRole('tablist', { name: '已打开的 JSON' }).getByRole('tab');
    await page.getByLabel('新建标签', { exact: true }).click();
    await expect(tabs).toHaveCount(3);
    await tabs.nth(1).click();
    await page.keyboard.press(`Alt+Shift+${key}`);
    await expect(tabs).toHaveCount(count);
    await expect(page.getByRole('tab', { name: /JSON 3$/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '撤销', exact: true }).click();
    await expect(tabs).toHaveCount(3);
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  });
}

test('统一修饰键即时同步、刷新保存，并随重置和撤销恢复', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
  await expect(editor).toBeVisible();
  await editor.focus();
  await page.keyboard.press('Alt+Shift+h');
  const help = page.getByRole('dialog', { name: '快捷键', exact: true });
  await expect(help).toBeVisible();
  const alt = help.getByRole('button', { name: /^(Alt|Option)$/ });
  const meta = help.getByRole('button', { name: /^(Cmd|Win \/ Meta)$/ });
  await expect(alt).toBeDisabled();
  await meta.click();
  await alt.click();
  await expect(meta).toHaveAttribute('aria-pressed', 'true');
  await expect(alt).toHaveAttribute('aria-pressed', 'false');
  await expect(help.getByText('聚焦编辑器', { exact: true })).toHaveCSS('font-size', '12px');
  await help.getByRole('button', { name: '关闭快捷键', exact: true }).click();
  await expect(help).toBeHidden();
  const addTab = page.getByLabel('新建标签', { exact: true });
  await expect(addTab).toHaveAttribute('aria-keyshortcuts', 'Meta+Shift+N');
  await expect(editor).toHaveAttribute('aria-keyshortcuts', 'Meta+Shift+I');
  await expect(page.getByRole('button', { name: '打开主题设置', exact: true })).toHaveAttribute(
    'aria-keyshortcuts',
    'Meta+Shift+T',
  );
  await expect(page.getByRole('button', { name: '查看快捷键', exact: true })).toHaveAttribute(
    'aria-keyshortcuts',
    'Meta+Shift+H',
  );
  const tabs = page.getByRole('tablist', { name: '已打开的 JSON' }).getByRole('tab');
  await tabs.first().focus();
  await page.keyboard.press('Alt+Shift+n');
  await expect(tabs).toHaveCount(2);
  await page.keyboard.press('Meta+Shift+n');
  await expect(tabs).toHaveCount(3);
  const customModifiers = { ctrl: false, alt: false, meta: true, shift: true };
  await expect
    .poll(async () => (await readPersistedAppState(page))?.shortcutModifiers)
    .toEqual(customModifiers);
  await page.reload();
  await expect(addTab).toHaveAttribute('aria-keyshortcuts', 'Meta+Shift+N');
  await expect(tabs).toHaveCount(3);
  await page.keyboard.press('Meta+Shift+i');
  await expect(editor).toBeFocused();
  const settings = await openSettings(page);
  await settings.getByRole('button', { name: '重置所有数据', exact: true }).click();
  await page.getByRole('button', { name: '确认重置', exact: true }).click();
  await expect(addTab).toHaveAttribute('aria-keyshortcuts', 'Alt+Shift+N');
  const undo = page.getByRole('button', { name: '撤销', exact: true });
  await undo.click();
  await expect(undo).toBeHidden();
  await expect(addTab).toHaveAttribute('aria-keyshortcuts', 'Meta+Shift+N');
  await page.reload();
  await expect(addTab).toHaveAttribute('aria-keyshortcuts', 'Meta+Shift+N');
  await page.keyboard.press('Meta+Shift+h');
  await expect(help).toBeVisible();
  await help.getByRole('button', { name: '恢复默认', exact: true }).click();
  await expect(alt).toHaveAttribute('aria-pressed', 'true');
  await expect(meta).toHaveAttribute('aria-pressed', 'false');
});

for (const width of [1280, 375]) {
  test(`快捷键打开响应式弹层且不穿透菜单与对话框 ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
    const tabs = page.getByRole('tablist', { name: '已打开的 JSON' }).getByRole('tab');
    await expect(editor).toBeVisible();
    await editor.focus();
    await page.keyboard.press('Alt+Shift+t');
    const theme = page.getByRole('dialog', { name: '主题', exact: true });
    await expect(theme).toBeVisible();
    await page.keyboard.press('Alt+Shift+n');
    await expect(tabs).toHaveCount(2);
    await theme.getByRole('button', { name: /代码配色/ }).click();
    await page.keyboard.press('Alt+Shift+n');
    await expect(tabs).toHaveCount(2);
    await page.keyboard.press('Escape');
    await theme.getByRole('button', { name: '关闭主题设置', exact: true }).click();
    await expect(theme).toBeHidden();
    await editor.focus();
    await page.keyboard.press('Alt+Shift+s');
    const settings = page.getByRole('dialog', { name: '全局设置', exact: true });
    await expect(settings).toBeVisible();
    await settings.getByRole('button', { name: '关闭设置', exact: true }).click();
    await expect(settings).toBeHidden();
    await editor.focus();
    await page.keyboard.press('Alt+Shift+b');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.keyboard.press('Alt+Shift+h');
    const help = page.getByRole('dialog', { name: '快捷键', exact: true });
    await expect(help).toBeVisible();
    for (const name of ['编辑器', '标签', '外观与设置', '树形预览']) {
      const group = help.getByRole('region', { name: `${name}快捷键`, exact: true });
      await expect(group).toBeVisible();
      await expect(group).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(group).toHaveCSS('border-radius', '16px');
      // HeroUI Kbd 使用原生 kbd 元素；只约束面板内的尺寸，其他入口保持不变。
      await expect(group.locator('kbd').first()).toHaveCSS('height', '20px');
      await expect(group.locator('kbd').first()).toHaveCSS('font-size', '10px');
    }
    await expect(help.getByText('关闭其它全部', { exact: true })).toBeVisible();
    await help.getByText('折叠 / 展开全部', { exact: true }).scrollIntoViewIfNeeded();
    await expect(help.getByText('折叠 / 展开全部', { exact: true })).toBeInViewport();
    expect(await help.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await help.getByRole('button', { name: '关闭快捷键', exact: true }).click();
    await expect(help).toBeHidden();
    await tabs.first().click({ button: 'right' });
    const menu = page.getByRole('menu', { name: /标签菜单/ });
    await expect(menu).toBeVisible();
    await menu.getByRole('menuitem', { name: '重命名', exact: true }).focus();
    await page.keyboard.press('Alt+Shift+n');
    await expect(tabs).toHaveCount(2);
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
  });
}

test('大文档编辑期间不重复序列化旧树，解析后仍可折叠及查看末尾数据', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
  const tree = page.getByRole('region', { name: '树形预览内容', exact: true });
  const input = JSON.stringify(
    Array.from({ length: 500 }, (_, index) => ({
      id: index,
      name: `large-row-${index}`,
      message: 'plain message '.repeat(6),
    })),
  );
  await editor.fill(input);
  await expect(tree.getByText('"large-row-499"', { exact: true })).toHaveCount(1);
  const clockStart = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time: clockStart });
  await page.clock.pauseAt(new Date(clockStart.getTime() + 1000));
  // 记录旧树叶子的序列化次数，不用机器相关的毫秒阈值作为正确性断言。
  await page.evaluate(() => {
    let count = 0;
    JSON.stringify = new Proxy(JSON.stringify, {
      apply(target, receiver, args: unknown[]) {
        if (args[0] === 'large-row-499') count += 1;
        return Reflect.apply(target, receiver, args);
      },
    });
    (
      window as typeof window & { __treeSerializationCount?: () => number }
    ).__treeSerializationCount = () => count;
  });
  await editor.press('ControlOrMeta+End');
  await editor.press('Space');
  await expect(page.getByText('输入中 · 自动解析', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() =>
      (
        window as typeof window & { __treeSerializationCount?: () => number }
      ).__treeSerializationCount?.(),
    ),
  ).toBe(0);
  await page.clock.resume();
  await expect(page.getByText(/已解析 · array · 2001 节点/)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as typeof window & { __treeSerializationCount?: () => number }
        ).__treeSerializationCount?.(),
      ),
    )
    .toBeGreaterThan(0);
  await page.keyboard.press('Alt+Shift+x');
  await expect(tree.getByText('500 项', { exact: true })).toBeVisible();
  await page.keyboard.press('Alt+Shift+x');
  await expect(tree.getByText('500 项', { exact: true })).toHaveCount(0);
  await tree.getByText('"large-row-499"', { exact: true }).scrollIntoViewIfNeeded();
  await expect(tree.getByText('"large-row-499"', { exact: true })).toBeInViewport();
  expect(
    await tree.evaluate(element => element.style.getPropertyValue('--tree-line-number-width')),
  ).toBe('4ch');
  const lastLine = tree.locator('.tree-line').last();
  expect(await lastLine.evaluate(element => getComputedStyle(element, '::before').whiteSpace)).toBe(
    'nowrap',
  );
});

test('连续更换根节点类型不会破坏树形渲染', async ({ page }) => {
  const editor = page.getByRole('textbox', { name: 'JSON 编辑器', exact: true });
  for (const [input, type] of [
    ['{"value":[1,2]}', 'object'],
    ['42', 'number'],
    ['{}', 'object'],
    ['[null]', 'array'],
    ['"text"', 'string'],
  ] as const) {
    await editor.fill(input);
    await expect(page.getByText(new RegExp(`已解析 · ${type} ·`))).toBeVisible();
  }
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
  await expect(page.getByRole('tablist', { name: '已打开的 JSON' }).getByRole('tab')).toHaveCount(
    2,
  );
  await expect(page.getByRole('tab', { name: /Brace 2，JSON 2/ })).toBeVisible();
  await expect(page.getByText(/已解析 · object/)).toBeVisible();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
});

test(TAB_GUIDE_TEST_TITLE, async ({ page }) => {
  const tabGuide = page.getByRole('dialog', {
    name: '试试右键标签',
    exact: true,
  });

  await expect(tabGuide).toBeVisible();
  await expect(tabGuide).toBeFocused();
  await expect
    .poll(() => tabGuide.evaluate(element => getComputedStyle(element).boxShadow))
    .not.toContain('0px 0px 0px 2px');
  await expect(tabGuide.getByText('试试右键标签', { exact: true })).toBeVisible();
  await expect(tabGuide.getByText(/可以重命名或关闭当前标签/)).toBeVisible();
  await tabGuide.getByRole('button', { name: '知道了', exact: true }).click();
  await expect(tabGuide).toBeHidden();
  await expect(page.getByRole('tab', { name: /Brace 1，JSON 1/ })).toBeFocused();
  await expect
    .poll(() => page.evaluate(key => localStorage.getItem(key), TAB_GUIDE_DISMISSED_KEY))
    .toBeNull();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(tabGuide).toBeVisible();
  await expect(tabGuide).toBeFocused();
  await tabGuide.press('Escape');
  await expect(tabGuide).toBeHidden();
  await expect(page.getByRole('tab', { name: /Brace 1，JSON 1/ })).toBeFocused();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(tabGuide).toBeVisible();
  await page.getByRole('tab', { name: /Brace 1，JSON 1/ }).click({ button: 'right' });
  await expect(tabGuide).toBeHidden();
  await expect(page.getByRole('menu', { name: 'Brace 1 标签菜单', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(tabGuide).toBeVisible();
  await tabGuide.getByRole('button', { name: '不再提示', exact: true }).click();
  await expect(tabGuide).toBeHidden();
  await expect
    .poll(() => page.evaluate(key => localStorage.getItem(key), TAB_GUIDE_DISMISSED_KEY))
    .toBe('true');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(tabGuide).toBeHidden();
});

test('主题弹窗使用轻量蒙层并可正常关闭', async ({ page }) => {
  const dialog = await openThemeSettings(page);
  const backdrop = page.locator('[data-slot="modal-backdrop"]');

  const backdropOpacity = await backdrop.evaluate(element => {
    const backgroundColor = getComputedStyle(element).backgroundColor;
    const alphaMatch =
      backgroundColor.match(/\/\s*([\d.]+)\s*\)$/) ?? backgroundColor.match(/,\s*([\d.]+)\s*\)$/);
    return alphaMatch ? Number(alphaMatch[1]) : backgroundColor === 'transparent' ? 0 : 1;
  });
  expect(backdropOpacity).toBeCloseTo(0.2);
  await expect(backdrop).toHaveCSS('backdrop-filter', 'none');
  await dialog.getByRole('button', { name: '关闭主题设置', exact: true }).click();
  await expect(dialog).toBeHidden();
});

test('带撤销操作的 Toast 保留入场和退场动画', async ({ page }) => {
  await page.evaluate(() => {
    const originalStartViewTransition = document.startViewTransition.bind(document);
    const animationNames: string[] = [];
    Object.defineProperty(window, '__toastAnimationNames', {
      configurable: true,
      value: animationNames,
    });
    document.startViewTransition = update => {
      const transition = originalStartViewTransition(update);
      void transition.ready.then(() => {
        for (const animation of document.getAnimations()) {
          const pseudoElement =
            animation.effect instanceof KeyframeEffect ? animation.effect.pseudoElement : null;
          if (pseudoElement?.includes('toast') && animation instanceof CSSAnimation) {
            animationNames.push(animation.animationName);
          }
        }
      });
      return transition;
    };
  });

  const tabNavigation = page.getByRole('navigation', { name: 'JSON 标签', exact: true });
  await tabNavigation.getByRole('button', { name: '关闭 Brace 2', exact: true }).click();
  const undoButton = page.getByRole('button', { name: '撤销', exact: true });
  await expect(undoButton).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __toastAnimationNames?: string[] }).__toastAnimationNames ??
          [],
      ),
    )
    .toContain('toast-slide-bottom-in');
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !document.getAnimations().some(animation => {
            const pseudoElement =
              animation.effect instanceof KeyframeEffect ? animation.effect.pseudoElement : null;
            return pseudoElement?.includes('toast') && animation.playState === 'running';
          }),
      ),
    )
    .toBe(true);

  await undoButton.click();
  await expect(tabNavigation.getByRole('tab')).toHaveCount(2);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __toastAnimationNames?: string[] }).__toastAnimationNames ??
          [],
      ),
    )
    .toContain('toast-slide-bottom-out');
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

test('标签右键菜单支持单个与批量关闭并可撤销', async ({ page }) => {
  const tabList = page.getByRole('tablist', { name: '已打开的 JSON', exact: true });
  const newTabButton = page
    .getByRole('navigation', { name: 'JSON 标签', exact: true })
    .getByLabel('新建标签', { exact: true });
  const openContextMenu = async (tabName: RegExp) => {
    await tabList.getByRole('tab', { name: tabName }).click({ button: 'right' });
    const menu = page.getByRole('menu', { name: /Brace \d+ 标签菜单/ });
    await expect(menu).toBeVisible();
    return menu;
  };
  const undoClose = async () => {
    await page.getByRole('button', { name: '撤销', exact: true }).click();
    await expect(tabList.getByRole('tab')).toHaveCount(4);
  };
  const selectMenuAction = async (menu: Locator, name: string) => {
    await menu.getByRole('menuitem', { name, exact: true }).click();
    await expect(menu).toBeHidden();
  };

  await tabList.getByRole('tab', { name: /Brace 2，JSON 2/ }).click();
  await newTabButton.click();
  await newTabButton.click();
  await expect(tabList.getByRole('tab')).toHaveCount(4);

  await tabList.getByRole('tab', { name: /Brace 3，JSON 3/ }).press('Shift+F10');
  await expect(page.getByRole('menu', { name: 'Brace 3 标签菜单', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', { name: 'Brace 3 标签菜单', exact: true })).toBeHidden();

  let menu = await openContextMenu(/Brace 3，JSON 3/);
  await expect(menu.getByRole('menuitem', { name: '关闭', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: '关闭左侧全部', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: '关闭右侧全部', exact: true })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: '关闭其它全部', exact: true })).toBeEnabled();
  await selectMenuAction(menu, '关闭左侧全部');
  await expect(tabList.getByRole('tab')).toHaveCount(2);
  await expect(tabList.getByRole('tab', { name: /Brace 1，JSON 3/ })).toBeVisible();
  await expect(tabList.getByRole('tab', { name: /Brace 2，JSON 4/ })).toBeVisible();
  await undoClose();

  menu = await openContextMenu(/Brace 2，JSON 2/);
  await selectMenuAction(menu, '关闭右侧全部');
  await expect(tabList.getByRole('tab')).toHaveCount(2);
  await expect.poll(async () => (await readPersistedAppState(page))?.tabs?.length).toBe(2);
  await expect(tabList.getByRole('tab', { name: /Brace 2，JSON 2/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await undoClose();
  await expect.poll(async () => (await readPersistedAppState(page))?.tabs?.length).toBe(4);
  await expect(tabList.getByRole('tab', { name: /Brace 4，JSON 4/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  menu = await openContextMenu(/Brace 3，JSON 3/);
  await selectMenuAction(menu, '关闭其它全部');
  await expect(tabList.getByRole('tab')).toHaveCount(1);
  menu = await openContextMenu(/Brace 1，JSON 3/);
  await expect(menu.getByRole('menuitem', { name: '关闭', exact: true })).toBeDisabled();
  await expect(menu.getByRole('menuitem', { name: '关闭左侧全部', exact: true })).toBeDisabled();
  await expect(menu.getByRole('menuitem', { name: '关闭右侧全部', exact: true })).toBeDisabled();
  await expect(menu.getByRole('menuitem', { name: '关闭其它全部', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await undoClose();

  menu = await openContextMenu(/Brace 2，JSON 2/);
  await selectMenuAction(menu, '关闭');
  await expect(tabList.getByRole('tab')).toHaveCount(3);
  await undoClose();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(tabList.getByRole('tab')).toHaveCount(4);
});

for (const closeMode of ['非活动标签', '活动标签', '右侧全部标签'] as const) {
  test(`撤销关闭${closeMode}后双区滚动继续保存并跨刷新恢复`, async ({ page }) => {
    const tabNavigation = page.getByRole('navigation', { name: 'JSON 标签', exact: true });
    const tabList = tabNavigation.getByRole('tablist', { name: '已打开的 JSON', exact: true });
    const sampleTab = tabList.getByRole('tab', { name: 'Brace 1，JSON 1', exact: true });
    await page
      .getByRole('textbox', { name: 'JSON 编辑器', exact: true })
      .fill(
        JSON.stringify({ rows: Array.from({ length: 80 }, (_, index) => `row-${index}`) }, null, 2),
      );
    await expect(
      page
        .getByRole('region', { name: '树形预览内容', exact: true })
        .getByText('"row-79"', { exact: true }),
    ).toBeVisible();
    await tabNavigation.getByLabel('新建标签', { exact: true }).click();
    await sampleTab.click();
    await expect(tabList.getByRole('tab')).toHaveCount(3);

    const scrollers = [
      page.locator('.cm-scroller'),
      page.getByRole('region', { name: '树形预览内容', exact: true }),
    ];
    const scrollTo = async (top: number) => {
      for (const scroller of scrollers) {
        await scroller.evaluate((element, nextTop) => {
          element.dispatchEvent(new WheelEvent('wheel'));
          element.scrollTop = nextTop;
          element.dispatchEvent(new Event('scroll'));
        }, top);
        await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBe(top);
      }
      await expect.poll(() => readPersistedScrollTops(page)).toEqual({ editor: top, tree: top });
    };
    await scrollTo(200);

    if (closeMode === '右侧全部标签') {
      await sampleTab.click({ button: 'right' });
      await page.getByRole('menuitem', { name: '关闭右侧全部', exact: true }).click();
    } else {
      await tabNavigation
        .getByRole('button', {
          name: closeMode === '活动标签' ? '关闭 Brace 1' : '关闭 Brace 3',
          exact: true,
        })
        .click();
    }
    await page.getByRole('button', { name: '撤销', exact: true }).click();
    await expect(tabList.getByRole('tab')).toHaveCount(3);
    await expect(sampleTab).toHaveAttribute('aria-selected', 'true');
    await scrollTo(400);

    await page.reload({ waitUntil: 'domcontentloaded' });
    for (const scroller of scrollers) {
      await expect
        .poll(async () => Math.abs((await scroller.evaluate(element => element.scrollTop)) - 400))
        .toBeLessThan(24);
    }
  });
}

test('标签右键菜单支持向左与向右添加标签,再右键可关闭菜单', async ({ page }) => {
  const tabList = page.getByRole('tablist', { name: '已打开的 JSON', exact: true });
  const openContextMenu = async (tabName: RegExp) => {
    await tabList.getByRole('tab', { name: tabName }).click({ button: 'right' });
    const menu = page.getByRole('menu', { name: /Brace \d+ 标签菜单/ });
    await expect(menu).toBeVisible();
    return menu;
  };

  let menu = await openContextMenu(/Brace 2，JSON 2/);
  await menu.getByRole('menuitem', { name: '向左添加标签', exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(tabList.getByRole('tab')).toHaveCount(3);
  await expect(tabList.getByRole('tab', { name: /Brace 2，JSON 3/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(tabList.getByRole('tab', { name: /Brace 3，JSON 2/ })).toBeVisible();

  menu = await openContextMenu(/Brace 3，JSON 2/);
  await menu.getByRole('menuitem', { name: '向右添加标签', exact: true }).click();
  await expect(tabList.getByRole('tab')).toHaveCount(4);
  await expect(tabList.getByRole('tab', { name: /Brace 4，JSON 4/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect.poll(async () => (await readPersistedAppState(page))?.tabs?.length).toBe(4);

  menu = await openContextMenu(/Brace 1，JSON 1/);
  const rightClickTarget = await tabList
    .getByRole('tab', { name: /Brace 2，JSON 3/ })
    .boundingBox();
  if (!rightClickTarget) throw new Error('未找到右键目标标签');
  await page.mouse.click(
    rightClickTarget.x + rightClickTarget.width / 2,
    rightClickTarget.y + rightClickTarget.height / 2,
    { button: 'right' },
  );
  await expect(menu).toBeHidden();
  await page.waitForTimeout(200);
  await expect(page.getByRole('menu', { name: /标签菜单/ })).toHaveCount(0);
});

test('树节点文本点击不切换展开状态,箭头仍可折叠', async ({ page }) => {
  const tree = page.getByRole('region', { name: '树形预览内容', exact: true });
  const configKey = tree.getByText('"config"', { exact: true });
  const configRow = tree.locator('.tree-line--toggle', { hasText: '"config"' });
  const configSummary = configRow.getByText('{ indent, hex, unicode, … }', { exact: true });
  await expect(configKey).toBeVisible();
  await expect(tree.getByText('"indent"', { exact: true })).toBeVisible();

  // 冒号属结构标点:点击会切换折叠
  const colon = configRow.locator('.tree-token-punctuation').first();
  await colon.click();
  await expect(configSummary).toBeVisible();
  await page.waitForTimeout(600);
  await colon.click();
  await expect(configSummary).toBeHidden();

  // 双击 key 选中复制:文本不触发展开切换
  await configKey.dblclick();
  await expect(tree.getByText('"indent"', { exact: true })).toBeVisible();
  const selection = await page.evaluate(() => window.getSelection()?.toString());
  expect(selection).toContain('config');

  // 单击 key 同样不切换
  await page.waitForTimeout(600);
  await configKey.click();
  await expect(tree.getByText('"indent"', { exact: true })).toBeVisible();

  // 箭头仍可正常折叠与展开(折叠后行内出现摘要,子树 DOM 按设计保留)
  await configRow.locator('.tree-chevron').click();
  await expect(configSummary).toBeVisible();
  await page.waitForTimeout(600);
  await configRow.locator('.tree-chevron').click();
  await expect(configSummary).toBeHidden();
});

test('树节点折叠状态精确到节点并跨刷新持久化', async ({ page }) => {
  const tree = page.getByRole('region', { name: '树形预览内容', exact: true });
  const configRow = tree.locator('.tree-line--toggle', { hasText: '"config"' });
  const configSummary = configRow.getByText('{ indent, hex, unicode, … }', { exact: true });

  await configRow.locator('.tree-chevron').click();
  await expect(configSummary).toBeVisible();
  // Set 无法跨 Playwright 序列化边界保持实例类型,在页面内完成读取与判断
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const database = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('deep-brace-json');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error ?? new Error('打开 IndexedDB 失败'));
        });
        const value = await new Promise<{ tabs?: Array<{ collapsed?: unknown }> } | undefined>(
          (resolve, reject) => {
            const request = database
              .transaction('app-state', 'readonly')
              .objectStore('app-state')
              .get('current');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error('读取 IndexedDB 失败'));
          },
        );
        const collapsed = value?.tabs?.[0]?.collapsed;
        return collapsed instanceof Set ? collapsed.size : 0;
      }),
    )
    .toBeGreaterThan(0);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(configSummary).toBeVisible();
  // 兄弟节点不受影响,保持展开
  await expect(tree.getByText('"version"', { exact: true }).first()).toBeVisible();

  // 折叠子树随 touched 持久化以 grid 0fr 挂载,展开时保留过渡动画而非直接弹出
  const configChildren = configRow.locator('xpath=following-sibling::div[@data-expanded]');
  await expect(configChildren).toHaveCount(1);
  await expect(configChildren).toHaveAttribute('data-expanded', 'false');
  await configRow.locator('.tree-chevron').click();
  await expect(configChildren).toHaveAttribute('data-expanded', 'true');
  await expect(configChildren).toHaveAttribute('data-open', 'true');
  await expect(configSummary).toBeHidden();
});

test('编辑后在自动解析前刷新不会将旧折叠状态套到新内容', async ({ page }) => {
  const tree = page.getByRole('region', { name: '树形预览内容', exact: true });
  const configRow = tree.locator('.tree-line--toggle', { hasText: '"config"' });
  const oldSummary = configRow.getByText('{ indent, hex, unicode, … }', { exact: true });
  await configRow.locator('.tree-chevron').click();
  await expect(oldSummary).toBeVisible();

  // 暂停浏览器时钟以稳定覆盖 300ms 自动解析前的窗口,IndexedDB 事务仍正常运行。
  const clockStart = new Date('2026-01-01T00:00:00Z');
  await page.clock.install({ time: clockStart });
  await page.clock.pauseAt(new Date(clockStart.getTime() + 1000));
  const newInput = '{"config":{"replacement":true}}';
  await page.getByRole('textbox', { name: 'JSON 编辑器', exact: true }).fill(newInput);
  await expect
    .poll(async () => (await readPersistedAppState(page))?.tabs?.[0]?.input)
    .toBe(newInput);
  await expect(oldSummary).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.clock.resume();
  await expect(tree.getByText('"replacement"', { exact: true })).toBeVisible();
  await expect(configRow.getByText('{ replacement }', { exact: true })).toHaveCount(0);
  await expect(configRow.locator('xpath=following-sibling::div[@data-expanded]')).toHaveAttribute(
    'data-expanded',
    'true',
  );
});

test('标签右键菜单可以重命名并在刷新后恢复', async ({ page }) => {
  const tabList = page.getByRole('tablist', { name: '已打开的 JSON', exact: true });
  const tab = tabList.getByRole('tab', { name: /Brace 2，JSON 2/ });

  await tab.click({ button: 'right' });
  const menu = page.getByRole('menu', { name: 'Brace 2 标签菜单', exact: true });
  await menu.getByRole('menuitem', { name: '重命名', exact: true }).click();

  const renamePopover = page.getByRole('dialog', { name: '重命名标签', exact: true });
  const renameInput = renamePopover.getByRole('textbox', { name: '标签名称', exact: true });
  await expect(renamePopover).toBeVisible();
  await expect(tab.getByRole('textbox')).toHaveCount(0);
  await expect(renameInput).toBeFocused();
  await expect(renameInput).toHaveValue('Brace 2');
  await renameInput.fill('  JSON 2026  ');
  await renameInput.press('Enter');
  await expect(renamePopover).toBeHidden();
  await expect
    .poll(() =>
      tabList.getByRole('tab').evaluateAll(elements =>
        elements.every(element => {
          const style = getComputedStyle(element);
          return (
            style.boxShadow === 'none' &&
            style.outlineStyle === 'none' &&
            style.backgroundColor === 'rgba(0, 0, 0, 0)'
          );
        }),
      ),
    )
    .toBe(true);
  await expect(tabList.getByRole('tab', { name: /Brace 2，JSON 2026/ })).toContainText('JSON 2026');
  await expect
    .poll(
      async () =>
        (await readPersistedAppState(page))?.tabs?.find(item => item.id === 'json-tab-2')?.title,
    )
    .toBe('JSON 2026');

  const renamedTab = tabList.getByRole('tab', { name: /Brace 2，JSON 2026/ });
  await renamedTab.click();
  await renamedTab.press('Shift+F10');
  await menu.getByRole('menuitem', { name: '重命名', exact: true }).click();
  await expect(renameInput).toHaveValue('JSON 2026');
  await renameInput.fill('不应保存');
  await renameInput.press('Escape');
  await expect(renamePopover).toBeHidden();
  await expect(renamedTab).toBeFocused();
  await expect(renamedTab).toHaveCSS('box-shadow', 'none');
  await expect(renamedTab).toHaveCSS('outline-style', 'none');
  await expect(renamedTab).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  await tabList.getByRole('tab', { name: /Brace 2，JSON 2026/ }).click({ button: 'right' });
  await menu.getByRole('menuitem', { name: '重命名', exact: true }).click();
  await renameInput.fill('   ');
  await expect(renameInput).toBeFocused();
  await expect(renamePopover.getByText('标签名称不能为空', { exact: true })).toBeVisible();
  await expect(renamePopover.getByRole('button', { name: '保存', exact: true })).toBeDisabled();
  await expect
    .poll(
      async () =>
        (await readPersistedAppState(page))?.tabs?.find(item => item.id === 'json-tab-2')?.title,
    )
    .toBe('JSON 2026');
  await renameInput.press('Escape');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(tabList.getByRole('tab', { name: /Brace 2，JSON 2026/ })).toContainText('JSON 2026');
});

test('全局偏好通过 IndexedDB 在刷新后恢复', async ({ page }) => {
  await setThemePreferences(page, { codeFont: 'IBM Plex Mono', treeTheme: 'Dracula' });
  await expect
    .poll(async () => (await readPersistedAppState(page))?.codeFont)
    .toBe('ibm-plex-mono');
  await expect.poll(async () => (await readPersistedAppState(page))?.treeTheme).toBe('dracula');
  await expect(page.getByRole('region', { name: '树形预览内容', exact: true })).toHaveAttribute(
    'data-tree-theme',
    'dracula',
  );
  await expect
    .poll(() =>
      page.locator('.cm-scroller').evaluate(element => getComputedStyle(element).fontFamily),
    )
    .toContain('IBM Plex Mono');
  await expect
    .poll(() =>
      page
        .getByRole('region', { name: '树形预览内容', exact: true })
        .evaluate(element => getComputedStyle(element.querySelector('.tree-line')!).fontFamily),
    )
    .toContain('IBM Plex Mono');

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
  await expect(page.locator('html')).toHaveAttribute('data-code-font', 'ibm-plex-mono');
  const themeDialog = await openThemeSettings(page);
  await expect(
    themeDialog.getByRole('button', { name: 'Dracula 代码配色', exact: true }),
  ).toBeVisible();
  await expect(
    themeDialog.getByRole('button', { name: 'IBM Plex Mono 代码字体', exact: true }),
  ).toBeVisible();
  await themeDialog.getByRole('button', { name: '关闭主题设置', exact: true }).click();
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
  await expect(tabNavigation.getByRole('tab')).toHaveCount(3);
  await expect(tabNavigation.getByRole('tab', { name: /Brace 2/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await setThemePreferences(page, { codeFont: 'Source Code Pro', treeTheme: 'One Dark' });
  await expect(page.locator('html')).toHaveAttribute('data-code-font', 'source-code-pro');
  await expect(page.getByRole('region', { name: '树形预览内容', exact: true })).toHaveAttribute(
    'data-tree-theme',
    'one-dark',
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

  await expect(tabNavigation.getByRole('tab')).toHaveCount(2);
  await expect(page.locator('html')).toHaveAttribute('data-code-font', 'jetbrains-mono');
  await expect(treeScroller).toHaveAttribute('data-tree-theme', 'default');
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
  await expect(page.locator('html')).toHaveAttribute('data-code-font', 'source-code-pro');
  await expect(treeScroller).toHaveAttribute('data-tree-theme', 'one-dark');
  await expect(tabNavigation.getByRole('tab')).toHaveCount(3);
  await expect(tabNavigation.getByRole('tab', { name: /Brace 2/ })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(treeScroller.getByText('"restored"', { exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: '撤销', exact: true })).toBeHidden();

  // 撤销按钮关闭意味着 restoreResetSnapshot 的完成 Promise 已结束；此处立即刷新，
  // 直接验证该 Promise 已覆盖应用状态、滚动与分栏的最终 IndexedDB 事务。
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-code-font', 'source-code-pro');
  await expect(treeScroller).toHaveAttribute('data-tree-theme', 'one-dark');
  await expect(tabNavigation.getByRole('tab')).toHaveCount(3);
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
    await expect(page.getByRole('menuitem', { name: '主题', exact: true })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: '设置', exact: true })).toBeVisible();
    await page.getByRole('menuitem', { name: '设置', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '全局设置', exact: true })).toBeVisible();
  });

  test('工具菜单中的主题入口与直显入口等价', async ({ page }) => {
    await setThemePreferences(page, { codeFont: 'Source Code Pro', treeTheme: 'Nord' });
    await expect(page.locator('html')).toHaveAttribute('data-code-font', 'source-code-pro');
    await expect(page.getByRole('region', { name: '树形预览内容', exact: true })).toHaveAttribute(
      'data-tree-theme',
      'nord',
    );
    await expect
      .poll(async () => (await readPersistedAppState(page))?.codeFont)
      .toBe('source-code-pro');
  });
});

test('主题在 679/680px 边界逐项进入工具菜单', async ({ page }) => {
  await page.setViewportSize({ width: 679, height: 720 });
  const directTrigger = page.getByRole('button', { name: '打开主题设置', exact: true });
  await expect(directTrigger).toBeHidden();
  await page.getByRole('button', { name: '打开工具菜单', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: '主题', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 680, height: 720 });
  await expect(directTrigger).toBeVisible();
  await expect(page.locator('.font-logo')).toBeVisible();
  const headerOverflow = await page
    .locator('header')
    .evaluate(element => Math.max(0, element.scrollWidth - element.clientWidth));
  expect(headerOverflow).toBeLessThanOrEqual(1);
});
