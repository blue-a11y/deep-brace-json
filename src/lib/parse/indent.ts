export const INDENT_OPTIONS = [2, 4, 8] as const;

export type IndentSize = (typeof INDENT_OPTIONS)[number];

export const DEFAULT_INDENT_SIZE: IndentSize = 2;
export const TREE_INDENT_PIXEL_RATIO = 2;

export const serializeForCopy = (value: unknown, indentSize: IndentSize): string =>
  typeof value === 'string' ? value : JSON.stringify(value, null, indentSize);
