import { describe, expect, it } from 'vitest';
import { createDefaultTabs, prepareTabForStorage, restoreJsonTab } from './tab-state';

describe('默认标签', () => {
  it('为新用户创建一个示例标签和一个空白标签', () => {
    const tabs = createDefaultTabs('{"ready":true}');

    expect(tabs).toHaveLength(2);
    expect(
      tabs.map(({ id, input, title, hasCustomTitle }) => ({ id, input, title, hasCustomTitle })),
    ).toEqual([
      { id: 'json-tab-1', input: '{"ready":true}', title: 'JSON 1', hasCustomTitle: false },
      { id: 'json-tab-2', input: '', title: 'JSON 2', hasCustomTitle: false },
    ]);
    expect(tabs[0].collapsed).not.toBe(tabs[1].collapsed);
    expect(tabs[0].touched).not.toBe(tabs[1].touched);
  });

  it('忽略已经废弃的 wrap 字段', () => {
    const restoredTab = restoreJsonTab(
      { id: 'legacy-tab', input: '{}', title: 'Legacy', wrap: false },
      0,
    );

    expect(restoredTab.shouldWrap).toBe(true);
  });

  it('恢复旧标签时保留非默认标题的自定义展示语义', () => {
    expect(restoreJsonTab({ title: '订单详情' }, 0).hasCustomTitle).toBe(true);
    expect(restoreJsonTab({ title: 'JSON 2' }, 1).hasCustomTitle).toBe(false);
  });

  it('持久化保留折叠与触碰键,恢复时还原为字符串集合', () => {
    const tab = createDefaultTabs('{}')[0];
    tab.collapsed = new Set(['$', '$["config"]']);
    tab.touched = new Set(['$["config"]']);

    const prepared = prepareTabForStorage(tab);
    expect(prepared.collapsed).toEqual(new Set(['$', '$["config"]']));
    expect(prepared.touched).toEqual(new Set(['$["config"]']));

    const restored = restoreJsonTab(
      JSON.parse(JSON.stringify({ collapsed: [...tab.collapsed], touched: [...tab.touched] })),
      0,
    );
    expect(restored.collapsed).toEqual(new Set(['$', '$["config"]']));
    expect(restored.touched).toEqual(new Set(['$["config"]']));

    const fromSet = restoreJsonTab({ collapsed: tab.collapsed, touched: tab.touched }, 0);
    expect(fromSet.collapsed).toEqual(new Set(['$', '$["config"]']));
    expect(fromSet.touched).toEqual(new Set(['$["config"]']));

    expect(restoreJsonTab({ collapsed: 'bad' }, 0).collapsed).toEqual(new Set());
    expect(restoreJsonTab({ touched: 'bad' }, 0).touched).toEqual(new Set());
    expect(restoreJsonTab({}, 0).collapsed).toEqual(new Set());
    expect(restoreJsonTab({}, 0).touched).toEqual(new Set());
  });

  it('未完成解析的新输入不携带旧树的折叠状态,也不修改当前页面的集合', () => {
    const tab = {
      ...createDefaultTabs('{"config":{"replacement":true}}')[0],
      isDirty: true,
      collapsed: new Set(['["config"]']),
      touched: new Set(['["config"]']),
    };

    const prepared = prepareTabForStorage(tab);
    const restored = restoreJsonTab(structuredClone(prepared), 0);
    expect(prepared.input).toBe(tab.input);
    expect(prepared.collapsed.size).toBe(0);
    expect(prepared.touched.size).toBe(0);
    expect(restored.collapsed.size).toBe(0);
    expect(restored.touched.size).toBe(0);
    expect(tab.isDirty).toBe(true);
    expect(tab.collapsed).toEqual(new Set(['["config"]']));
    expect(tab.touched).toEqual(new Set(['["config"]']));
  });
});
