import { describe, expect, it } from 'vitest';
import { getTreeLineCount } from './tree-metrics';

describe('cached outline line counts', () => {
  it.each([null, true, 1, 'text', [], {}])(
    'counts a leaf or empty container as one line: %j',
    value => {
      expect(getTreeLineCount(value)).toBe(1);
    },
  );

  it('keeps expanded line numbers stable for nested arrays and empty containers', () => {
    const child = { items: [1, {}, []] };
    expect(getTreeLineCount(child)).toBe(7);
    expect(getTreeLineCount([child, child, null])).toBe(17);
  });

  it('fills descendant caches in one walk and reuses them without reading the subtree again', () => {
    let reads = 0;
    const item = { value: 1 };
    const child = {
      get item() {
        reads += 1;
        return item;
      },
    };
    const root = { child };
    expect(getTreeLineCount(root)).toBe(7);
    const initialReads = reads;
    expect(getTreeLineCount(root)).toBe(7);
    expect(getTreeLineCount(child)).toBe(5);
    expect(reads).toBe(initialReads);
    expect(getTreeLineCount({ child: { item: [1, 2] } })).toBe(8);
  });

  it('counts a deep immutable tree without recursive stack overflow', () => {
    let value: unknown = 1;
    for (let index = 0; index < 10000; index += 1) value = [value];
    expect(getTreeLineCount(value)).toBe(20001);
  });
});
