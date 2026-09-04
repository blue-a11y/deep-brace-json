import { describe, expect, it } from 'vitest';
import { isLargeResult, LARGE_INPUT_LENGTH } from './large-document';

describe('large document boundaries', () => {
  it('keeps the input limit at 262144 JavaScript characters', () => {
    expect(LARGE_INPUT_LENGTH).toBe(262144);
  });
  it.each([
    [5000, 40, false],
    [5001, 40, true],
    [5000, 41, true],
    [1, 1, false],
  ])('classifies %i nodes at depth %i', (nodes, maxDepth, expected) => {
    expect(
      isLargeResult({ ok: true, data: null, stats: { nodes, maxDepth, rootType: 'null' } }),
    ).toBe(expected);
  });
  it('does not classify missing or failed results as large trees', () => {
    expect(isLargeResult(null)).toBe(false);
    expect(isLargeResult({ ok: false, message: 'invalid' })).toBe(false);
  });
});
