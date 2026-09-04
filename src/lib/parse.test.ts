import JSON5 from 'json5';
import { describe, expect, it, vi } from 'vitest';
import { isStrictJson, parseInput } from './parse';

describe('native JSON fast path', () => {
  it('parses a large standard JSON document without invoking JSON5', () => {
    const data = Array.from({ length: 10000 }, (_, index) => ({
      id: index,
      message: 'plain text'.repeat(10),
    }));
    const spy = vi.spyOn(JSON5, 'parse');
    try {
      const result = parseInput(JSON.stringify(data));
      expect(result).toEqual({
        ok: true,
        data,
        stats: { nodes: 30001, maxDepth: 3, rootType: 'array' },
      });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it.each([
    '{foo: 0xff, /* comment */ list: [1,2,],}',
    "{'text':'你好', value: NaN}",
    'Infinity',
    '-0',
    'null',
    '"text"',
    '{"__proto__":{"safe":true}}',
  ])('preserves JSON5-compatible values: %s', input => {
    const result = parseInput(input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(JSON5.parse(input));
  });

  it('retains JSON5 errors and locations for malformed JSON', () => {
    const input = '{\n "broken":\n}';
    let message = '';
    try {
      JSON5.parse(input);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(parseInput(input)).toMatchObject({ ok: false, message, line: 3, column: 1 });
    expect(parseInput('plain text')).toMatchObject({
      ok: true,
      data: 'plain text',
      isDegraded: true,
    });
    expect(parseInput('   ')).toEqual({ ok: false, message: '输入为空' });
  });
});

describe('nested JSON detection', () => {
  it.each(['plain text', '', '123', 'true', 'null', 'NaN'])(
    'does not parse impossible container strings: %s',
    input => {
      const spy = vi.spyOn(JSON, 'parse');
      try {
        expect(isStrictJson(input)).toBe(false);
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    },
  );
  it.each([' {} ', '[1]', '"[1]"', '{\\"a\\":1}', '\\u007b\\"a\\":1}'])(
    'keeps direct, nested and escaped containers available: %s',
    input => {
      expect(isStrictJson(input)).toBe(true);
    },
  );
});
