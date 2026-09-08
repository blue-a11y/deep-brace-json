import { describe, expect, it } from 'vitest';
import {
  buildTreeSearchIndex,
  findTextMatchRanges,
  searchTreeIndex,
  type TreeSearchOptions,
} from './tree-search';

const search = (
  data: unknown,
  overrides: Partial<TreeSearchOptions> & Pick<TreeSearchOptions, 'query'>,
) =>
  searchTreeIndex(buildTreeSearchIndex(data), {
    scope: 'all',
    isCaseSensitive: false,
    ...overrides,
  });

describe('tree search', () => {
  const data = { users: [{ displayName: 'Blue', enabled: true }], 'a/b': null };

  it('searches keys, primitive values and paths without depending on mounted rows', () => {
    expect(search(data, { query: 'display' }).matches[0].jsonPath).toBe('$.users[0].displayName');
    expect(search(data, { query: 'blue', scope: 'value' }).matches[0].valueText).toBe('Blue');
    expect(search(data, { query: '/users/0', scope: 'path' }).total).toBeGreaterThan(0);
  });

  it('supports case-sensitive matching', () => {
    expect(search(data, { query: 'blue', scope: 'value', isCaseSensitive: true }).total).toBe(0);
  });

  it('keeps an accurate count while bounding navigation results', () => {
    const result = search({ values: ['hit', 'hit', 'hit'] }, { query: 'hit' });
    const limited = searchTreeIndex(
      buildTreeSearchIndex({ values: ['hit', 'hit', 'hit'] }),
      {
        query: 'hit',
        scope: 'value',
        isCaseSensitive: false,
      },
      2,
    );
    expect(result.total).toBe(3);
    expect(limited).toMatchObject({ total: 3 });
    expect(limited.matches).toHaveLength(2);
  });

  it('returns exact plain-text highlight ranges', () => {
    expect(
      findTextMatchRanges('Blue blue', {
        query: 'blue',
        scope: 'value',
        isCaseSensitive: false,
      }),
    ).toEqual([
      { start: 0, end: 4 },
      { start: 5, end: 9 },
    ]);
  });
});
