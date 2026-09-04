import { describe, expect, it } from 'vitest';
import { TREE_PREVIEW_DEPTH } from './large-document';
import { buildTreeRows, findTreeRowIndex, getTreeEntries } from './tree-rows';

describe('virtual tree rows', () => {
  it('preserves JSON order, stable keys, commas and full line numbers', () => {
    const data = { items: [1, {}, [2]], last: null };
    const rows = buildTreeRows(data, new Set());
    expect(rows.map(row => row.lineNumber)).toEqual(
      Array.from({ length: 10 }, (_, index) => index + 1),
    );
    expect(rows.map(row => row.key)).toEqual([
      '[]',
      '["items"]',
      '["items",0]',
      '["items",1]',
      '["items",2]',
      '["items",2,0]',
      '["items",2]:close',
      '["items"]:close',
      '["last"]',
      '[]:close',
    ]);
  });
  it('omits collapsed descendants without renumbering later lines', () => {
    const data = { hidden: [1, 2, 3], visible: 4 };
    const rows = buildTreeRows(data, new Set(['["hidden"]']));
    expect(rows.map(row => row.lineNumber)).toEqual([1, 2, 7, 8]);
    expect(findTreeRowIndex(rows, 5)).toBe(1);
    expect(findTreeRowIndex(rows, 7)).toBe(2);
    expect(findTreeRowIndex(rows, 100)).toBe(3);
    expect(findTreeRowIndex(rows, -1)).toBe(0);
  });
  it('models wide arrays without a render budget or recursive stack', () => {
    const data = Array.from({ length: 100000 }, (_, index) => index);
    const rows = buildTreeRows(data, new Set());
    expect(rows).toHaveLength(100002);
    expect(rows[100000]).toMatchObject({
      arrayIndex: 99999,
      value: 99999,
      hasTrailingComma: false,
    });
    expect(rows[1].hasTrailingComma).toBe(true);
    expect(getTreeEntries(data)).toBe(getTreeEntries(data));
    expect(buildTreeRows(data, new Set(['[]']))).toHaveLength(1);
  });
  it('caps pathological depth while retaining stable closing line numbers', () => {
    let data: unknown = 1;
    for (let index = 0; index < 10000; index += 1) data = [data];
    const rows = buildTreeRows(data, new Set());
    expect(Math.max(...rows.map(row => row.depth))).toBe(TREE_PREVIEW_DEPTH);
    expect(rows).toHaveLength(TREE_PREVIEW_DEPTH * 2 + 1);
    expect(rows.at(-1)?.lineNumber).toBe(20001);
  });
  it.each([null, false, 42, 'hello', [], {}])('handles a one-line root %j', data => {
    expect(buildTreeRows(data, new Set())).toHaveLength(1);
  });
});
