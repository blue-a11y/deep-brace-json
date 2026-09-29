import type { NodePath } from './parse';

const JSON_PATH_IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

export const toJsonPointer = (path: NodePath): string =>
  path.map(segment => `/${String(segment).replaceAll('~', '~0').replaceAll('/', '~1')}`).join('');

export const toJsonPath = (path: NodePath): string =>
  path.reduce<string>((result, segment) => {
    if (typeof segment === 'number') return `${result}[${segment}]`;
    return JSON_PATH_IDENTIFIER.test(segment)
      ? `${result}.${segment}`
      : `${result}[${JSON.stringify(segment)}]`;
  }, '$');

export const getAncestorPathKeys = (path: NodePath): Set<string> => {
  const keys = new Set<string>();
  for (let depth = 0; depth < path.length; depth += 1) {
    keys.add(JSON.stringify(path.slice(0, depth)));
  }
  return keys;
};
