import { describe, expect, it } from 'vitest';
import { getAncestorPathKeys, toJsonPath, toJsonPointer } from './json-path';

describe('JSON node paths', () => {
  it('formats object keys and array indexes as JSONPath', () => {
    expect(toJsonPath([])).toBe('$');
    expect(toJsonPath(['users', 0, 'displayName'])).toBe('$.users[0].displayName');
    expect(toJsonPath(['space key', 'quote"key', '0'])).toBe('$["space key"]["quote\\"key"]["0"]');
  });

  it('escapes JSON Pointer segments according to RFC 6901', () => {
    expect(toJsonPointer([])).toBe('');
    expect(toJsonPointer(['a/b', '~value', 2])).toBe('/a~1b/~0value/2');
  });

  it('returns only ancestors so the selected node keeps its own fold state', () => {
    expect([...getAncestorPathKeys(['users', 2, 'name'])]).toEqual([
      '[]',
      '["users"]',
      '["users",2]',
    ]);
  });
});
