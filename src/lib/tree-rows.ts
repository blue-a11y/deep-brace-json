import { TREE_PREVIEW_DEPTH } from './large-document';
import { pathKey, type NodePath } from './parse';
import { getTreeLineCount } from './tree-metrics';

const entryCache = new WeakMap<object, [string | number, unknown][]>();
export const getTreeEntries = (value: unknown): [string | number, unknown][] => {
  if (!value || typeof value !== 'object') return [];
  const cached = entryCache.get(value);
  if (cached) return cached;
  const entries: [string | number, unknown][] = Array.isArray(value)
    ? value.map((item, index) => [index, item])
    : Object.entries(value);
  entryCache.set(value, entries);
  return entries;
};

export type TreeRow = {
  key: string;
  path: NodePath;
  value: unknown;
  label: string | null;
  arrayIndex?: number;
  depth: number;
  lineNumber: number;
  isClosing: boolean;
  hasTrailingComma: boolean;
};

/** 扁平化当前展开的节点，不为折叠后代创建行；行号按完整文档计算。 */
export const buildTreeRows = (data: unknown, collapsed: Set<string>): TreeRow[] => {
  const rows: TreeRow[] = [];
  const stack: TreeRow[] = [
    {
      key: pathKey([]),
      path: [],
      value: data,
      label: null,
      depth: 0,
      lineNumber: 1,
      isClosing: false,
      hasTrailingComma: false,
    },
  ];
  while (stack.length) {
    const row = stack.pop()!;
    rows.push(row);
    if (row.isClosing || collapsed.has(row.key) || row.depth >= TREE_PREVIEW_DEPTH) continue;
    const entries = getTreeEntries(row.value);
    if (!entries.length) continue;
    let lineNumber = row.lineNumber + getTreeLineCount(row.value) - 1;
    stack.push({ ...row, key: row.key + ':close', lineNumber, isClosing: true });
    const isArray = Array.isArray(row.value);
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [key, value] = entries[index];
      const path = [...row.path, key];
      lineNumber -= getTreeLineCount(value);
      stack.push({
        key: pathKey(path),
        path,
        value,
        label: isArray ? null : String(key),
        arrayIndex: isArray ? index : undefined,
        depth: row.depth + 1,
        lineNumber,
        isClosing: false,
        hasTrailingComma: index < entries.length - 1,
      });
    }
  }
  return rows;
};

/** 锚点节点已折叠时，回退到之前最近的可见行（通常是它的父节点）。 */
export const findTreeRowIndex = (rows: TreeRow[], lineNumber: number): number => {
  let low = 0;
  let high = rows.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (rows[middle].lineNumber <= lineNumber) low = middle;
    else high = middle - 1;
  }
  return low;
};
