import { toJsonPath, toJsonPointer } from '../parse/json-path';
import { pathKey, type NodePath } from '../parse/parse';
import { getTreeEntries } from './tree-rows';

export const MAX_TREE_SEARCH_RESULTS = 2000;

export type TreeSearchScope = 'all' | 'key' | 'value' | 'path';

export type TreeSearchOptions = {
  query: string;
  scope: TreeSearchScope;
  isCaseSensitive: boolean;
};

export type TreeSearchEntry = {
  key: string;
  path: NodePath;
  jsonPath: string;
  jsonPointer: string;
  keyText: string;
  valueText: string;
};

export type TreeSearchResult = {
  matches: TreeSearchEntry[];
  total: number;
};

export type TextMatchRange = {
  start: number;
  end: number;
};

/** 返回可见文本中的非重叠命中范围，供树 token 做字符级高亮。 */
export const findTextMatchRanges = (
  value: string,
  options: TreeSearchOptions,
): TextMatchRange[] => {
  if (!options.query || !value) return [];
  const source = options.isCaseSensitive ? value : value.toLocaleLowerCase();
  const query = options.isCaseSensitive ? options.query : options.query.toLocaleLowerCase();
  const ranges: TextMatchRange[] = [];
  let start = 0;
  while (start <= source.length - query.length) {
    const index = source.indexOf(query, start);
    if (index < 0) break;
    ranges.push({ start: index, end: index + query.length });
    start = index + Math.max(query.length, 1);
  }
  return ranges;
};

const toSearchableValue = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

/** 为完整解析结果构建与折叠、虚拟挂载无关的轻量搜索索引。 */
export const buildTreeSearchIndex = (data: unknown): TreeSearchEntry[] => {
  const entries: TreeSearchEntry[] = [];
  const stack: { path: NodePath; value: unknown; keyText: string }[] = [
    { path: [], value: data, keyText: '' },
  ];
  while (stack.length > 0) {
    const current = stack.pop()!;
    entries.push({
      key: pathKey(current.path),
      path: current.path,
      jsonPath: toJsonPath(current.path),
      jsonPointer: toJsonPointer(current.path),
      keyText: current.keyText,
      valueText: toSearchableValue(current.value),
    });
    const children = getTreeEntries(current.value);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const [childKey, childValue] = children[index];
      stack.push({
        path: [...current.path, childKey],
        value: childValue,
        keyText: String(childKey),
      });
    }
  }
  return entries;
};

const createMatcher = (options: TreeSearchOptions) => {
  const query = options.isCaseSensitive ? options.query : options.query.toLocaleLowerCase();
  return (value: string) =>
    (options.isCaseSensitive ? value : value.toLocaleLowerCase()).includes(query);
};

export const searchTreeIndex = (
  index: TreeSearchEntry[],
  options: TreeSearchOptions,
  maximumResults = MAX_TREE_SEARCH_RESULTS,
): TreeSearchResult => {
  if (!options.query) return { matches: [], total: 0 };
  const matchesValue = createMatcher(options);

  const matches: TreeSearchEntry[] = [];
  let total = 0;
  for (const entry of index) {
    const fields =
      options.scope === 'key'
        ? [entry.keyText]
        : options.scope === 'value'
          ? [entry.valueText]
          : options.scope === 'path'
            ? [entry.jsonPath, entry.jsonPointer]
            : [entry.keyText, entry.valueText, entry.jsonPath, entry.jsonPointer];
    if (!fields.some(field => field && matchesValue(field))) continue;
    total += 1;
    if (matches.length < maximumResults) matches.push(entry);
  }
  return { matches, total };
};
