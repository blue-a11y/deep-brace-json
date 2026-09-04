import { describe, expect, it } from 'vitest';
import { createLargeSample } from './large-sample';
import { parseInput } from './parse';
import { isSampleId, SAMPLE_OPTIONS } from './sample';

describe('large sample presets', () => {
  it.each([
    ['large-1mb', 2000],
    ['large-10mb', 20000],
  ] as const)('%s generates a complete deterministic document', (id, count) => {
    const input = createLargeSample(id);
    expect(input.length).toBeGreaterThan(count * 500);
    expect(input.length).toBeLessThan(count * 600);
    const result = parseInput(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.stats.nodes).toBe(count * 5 + 1);
    const rows = result.data as Array<{ id: number; name: string; isEnabled: boolean }>;
    expect(rows).toHaveLength(count);
    expect(rows[0]).toMatchObject({ id: 0, name: 'sample-row-0', isEnabled: true });
    expect(rows.at(-1)).toMatchObject({
      id: count - 1,
      name: `sample-row-${count - 1}`,
      isEnabled: false,
    });
  });
  it('validates only supported menu identities', () => {
    for (const option of SAMPLE_OPTIONS) expect(isSampleId(option.id)).toBe(true);
    for (const value of ['large-100mb', null, 1, {}]) expect(isSampleId(value)).toBe(false);
  });
});
