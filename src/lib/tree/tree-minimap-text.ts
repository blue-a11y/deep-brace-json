import type { TreeRow } from './tree-rows';

export type MinimapTokenKind = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation';

export type MinimapToken = {
  kind: MinimapTokenKind;
  text: string;
};

const TEXT_PREVIEW_LENGTH = 96;
const quotePreview = (text: string) =>
  `${JSON.stringify(text.slice(0, TEXT_PREVIEW_LENGTH))}${text.length > TEXT_PREVIEW_LENGTH ? '…' : ''}`;

/** 缩略图绘制真实树行的微缩文本；长文本只保留画布可能显示的开头。 */
export const getMinimapTokens = (row: TreeRow, nextRow?: TreeRow): MinimapToken[] => {
  if (row.isClosing) {
    return [
      {
        kind: 'punctuation',
        text: `${Array.isArray(row.value) ? ']' : '}'}${row.hasTrailingComma ? ',' : ''}`,
      },
    ];
  }

  const tokens: MinimapToken[] = [];
  if (row.label !== null) {
    tokens.push({ kind: 'key', text: quotePreview(row.label) });
  } else if (row.arrayIndex !== undefined) {
    tokens.push({ kind: 'punctuation', text: String(row.arrayIndex) });
  }
  if (tokens.length) tokens.push({ kind: 'punctuation', text: ': ' });

  const value = row.value;
  if (value !== null && typeof value === 'object') {
    const isArray = Array.isArray(value);
    const opening = isArray ? '[' : '{';
    const closing = isArray ? ']' : '}';
    const hasChildren = isArray ? value.length > 0 : Object.keys(value).length > 0;
    const isExpanded = hasChildren && nextRow !== undefined && nextRow.depth > row.depth;
    tokens.push({
      kind: 'punctuation',
      text: !hasChildren ? `${opening}${closing}` : isExpanded ? opening : `${opening}…${closing}`,
    });
  } else {
    tokens.push({
      kind:
        value === null
          ? 'null'
          : typeof value === 'string'
            ? 'string'
            : typeof value === 'number'
              ? 'number'
              : typeof value === 'boolean'
                ? 'boolean'
                : 'punctuation',
      text: typeof value === 'string' ? quotePreview(value) : String(value),
    });
  }
  if (row.hasTrailingComma) tokens.push({ kind: 'punctuation', text: ',' });
  return tokens;
};
