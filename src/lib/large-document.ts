import type { ParseResult } from './parse';

export const LARGE_INPUT_LENGTH = 256 * 1024;
export const LARGE_TREE_NODES = 5000;
export const TREE_PREVIEW_DEPTH = 40;
export const LARGE_VALUE_PREVIEW_LENGTH = 500;

export const isLargeResult = (result: ParseResult | null): boolean =>
  Boolean(
    result?.ok &&
    (result.stats.nodes > LARGE_TREE_NODES || result.stats.maxDepth > TREE_PREVIEW_DEPTH),
  );
