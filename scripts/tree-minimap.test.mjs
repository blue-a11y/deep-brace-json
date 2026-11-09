import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getMinimapContentHeight,
  getMinimapScrollTop,
  getMinimapViewport,
} from '../src/lib/tree/tree-minimap-geometry.ts';
import { getMinimapTokens } from '../src/lib/tree/tree-minimap-text.ts';

test('minimap viewport maps the scroll range to the available track', () => {
  assert.deepEqual(getMinimapViewport(400, 200, 1000, 100), {
    height: 20,
    maxScroll: 800,
    top: 40,
  });
  assert.deepEqual(getMinimapViewport(800, 200, 1000, 100), {
    height: 20,
    maxScroll: 800,
    top: 80,
  });
});

test('minimap keeps a grabbable viewport and reaches both edges of a long tree', () => {
  assert.deepEqual(getMinimapViewport(990, 10, 1000, 100), {
    height: 16,
    maxScroll: 990,
    top: 84,
  });
  assert.equal(getMinimapScrollTop(0, 8, 100, 16, 990), 0);
  assert.equal(getMinimapScrollTop(100, 8, 100, 16, 990), 990);
});

test('minimap does not navigate when the tree fits the viewport', () => {
  assert.deepEqual(getMinimapViewport(30, 300, 200, 100), {
    height: 100,
    maxScroll: 0,
    top: 0,
  });
  assert.equal(getMinimapScrollTop(50, 50, 100, 100, 0), 0);
});

test('short documents keep compact text lines while long documents fill the track', () => {
  assert.equal(getMinimapContentHeight(800, 1056), 176);
  assert.equal(getMinimapContentHeight(800, 100_000), 800);
  const contentHeight = getMinimapContentHeight(800, 1056);
  assert.deepEqual(getMinimapViewport(261, 795, 1056, contentHeight), {
    height: 132.5,
    maxScroll: 261,
    top: 43.5,
  });
  assert.equal(getMinimapScrollTop(800, 0, contentHeight, 132.5, 261), 261);
});

const makeRow = overrides => ({
  key: '$',
  path: [],
  value: null,
  label: null,
  depth: 0,
  lineNumber: 1,
  isClosing: false,
  hasTrailingComma: false,
  ...overrides,
});

test('minimap text uses the actual escaped key and value', () => {
  assert.deepEqual(
    getMinimapTokens(makeRow({ label: 'say', value: 'Hi "blue"', hasTrailingComma: true })),
    [
      { kind: 'key', text: '"say"' },
      { kind: 'punctuation', text: ': ' },
      { kind: 'string', text: '"Hi \\"blue\\""' },
      { kind: 'punctuation', text: ',' },
    ],
  );
});

test('minimap text reflects expanded, folded and closing containers', () => {
  const parent = makeRow({ value: { child: 1 } });
  const child = makeRow({ depth: 1, label: 'child', value: 1 });
  assert.deepEqual(getMinimapTokens(parent, child), [{ kind: 'punctuation', text: '{' }]);
  assert.deepEqual(getMinimapTokens(parent), [{ kind: 'punctuation', text: '{…}' }]);
  assert.deepEqual(getMinimapTokens(makeRow({ value: {}, label: 'empty' })), [
    { kind: 'key', text: '"empty"' },
    { kind: 'punctuation', text: ': ' },
    { kind: 'punctuation', text: '{}' },
  ]);
  assert.deepEqual(
    getMinimapTokens(makeRow({ value: [1], isClosing: true, hasTrailingComma: true })),
    [{ kind: 'punctuation', text: '],' }],
  );
});
