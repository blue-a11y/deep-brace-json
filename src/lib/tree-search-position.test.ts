import { describe, expect, it } from 'vitest';
import { clampTreeSearchPosition, isTreeSearchPosition } from './tree-search-position';

describe('tree search position', () => {
  it.each([null, {}, { x: -1, y: 2 }, { x: 1, y: Number.NaN }, { x: '1', y: 2 }])(
    'rejects an invalid persisted position: %j',
    value => {
      expect(isTreeSearchPosition(value)).toBe(false);
    },
  );

  it('accepts finite non-negative coordinates', () => {
    expect(isTreeSearchPosition({ x: 12.5, y: 48 })).toBe(true);
  });

  it('keeps the panel inside its boundary', () => {
    expect(clampTreeSearchPosition({ x: 900, y: -4 }, 800, 600, 320, 100)).toEqual({
      x: 472,
      y: 8,
    });
  });
});
