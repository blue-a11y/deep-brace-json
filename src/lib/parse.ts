import JSON5 from 'json5'

export type RootType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'

export interface TreeStats {
  nodes: number
  maxDepth: number
  rootType: RootType
}

export interface ParseOk {
  ok: true
  data: unknown
  stats: TreeStats
  /** 解析失败后降级为纯文本字符串时为 true */
  degraded?: boolean
}

export interface ParseError {
  ok: false
  message: string
  line?: number
  column?: number
}

export type ParseResult = ParseOk | ParseError

export function rootTypeOf(value: unknown): RootType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  switch (typeof value) {
    case 'object':
      return 'object'
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    default:
      return 'null'
  }
}

function statsOf(data: unknown): TreeStats {
  let nodes = 0
  let maxDepth = 0
  const walk = (value: unknown, depth: number) => {
    nodes += 1
    if (depth > maxDepth) maxDepth = depth
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1)
    } else if (value && typeof value === 'object') {
      for (const item of Object.values(value)) walk(item, depth + 1)
    }
  }
  walk(data, 1)
  return { nodes, maxDepth, rootType: rootTypeOf(data) }
}

/** 首个非空字符像 JSON 的结构/数字开头时，视为「意图输入 JSON」，失败应报错而非降级 */
function intendsJson(text: string): boolean {
  const first = text.trimStart()[0]
  return !!first && /[{["\-+.\d]/.test(first)
}

type JsonContainer = unknown[] | Record<string, unknown>
type ContainerParser = (value: string) => unknown

const FIRST_PRINTABLE_CHARACTER_CODE = 0x20

const isJsonContainer = (value: unknown): value is JsonContainer =>
  value !== null && typeof value === 'object'

const escapeControlCharacters = (text: string): string =>
  Array.from(text, character =>
    character.charCodeAt(0) < FIRST_PRINTABLE_CHARACTER_CODE
      ? `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
      : character,
  ).join('')

/** 解开缺少外层引号的 JSON 字符串转义，仅接受解码后以对象或数组开头的输入 */
const decodeEscapedContainerText = (text: string): string | null => {
  if (!text.includes('\\')) return null

  try {
    const escapedControlCharacters = escapeControlCharacters(text)
    const decoded: unknown = JSON.parse(`"${escapedControlCharacters}"`)
    if (typeof decoded !== 'string' || decoded === text) return null
    const firstCharacter = decoded.trimStart()[0]
    return firstCharacter === '{' || firstCharacter === '[' ? decoded : null
  } catch {
    return null
  }
}

const parseContainer = (text: string, parser: ContainerParser): JsonContainer | null => {
  try {
    const data = parser(text)
    return isJsonContainer(data) ? data : null
  } catch {
    return null
  }
}

const parseEscapedContainer = (text: string, parser: ContainerParser): JsonContainer | null => {
  const decoded = decodeEscapedContainerText(text)
  return decoded ? parseContainer(decoded, parser) : null
}

/** 转义：把输入原文包成 JSON 字符串字面量（换行、缩进保留为 \n 等转义），可反复点击层层叠加 */
export const escapeText = (text: string): string => JSON.stringify(text)

/**
 * 反转义：剥开一层——
 * 1. JSON 字符串字面量（可含转义）→ 返回其内容
 * 2. 缺少外层引号但保留转义的裸容器文本，如 `{\"a\":1}` → 返回解码结果
 * 其余（普通容器 JSON、无转义纯文本等）返回 null
 */
export const unescapeText = (text: string): string | null => {
  try {
    const data: unknown = JSON5.parse(text)
    if (typeof data === 'string') return data
  } catch {
    // 落入裸转义兜底
  }
  return decodeEscapedContainerText(text)
}

/** 解析 JSON5 输入；普通文本自动降级为字符串字面量，坏 JSON 仍报错（带行列号）。转义输入需显式点「反转义」 */
export function parseInput(text: string): ParseResult {
  if (!text.trim()) {
    return { ok: false, message: '输入为空' }
  }
  try {
    const data = JSON5.parse(text)
    return { ok: true, data, stats: statsOf(data) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (!intendsJson(text)) {
      // 纯文本：作为不带引号的字符串字面量处理
      return { ok: true, data: text, stats: statsOf(text), degraded: true }
    }
    // json5 错误形如 "JSON5: xxx at 3:5"，提取行列
    const m = message.match(/at (\d+):(\d+)\s*$/)
    return {
      ok: false,
      message,
      line: m ? Number(m[1]) : undefined,
      column: m ? Number(m[2]) : undefined,
    }
  }
}

/** string value 只有能被原生 JSON 严格解析为对象或数组时才允许打开为新标签 */
export const isStrictJson = (text: string): boolean => {
  try {
    const value: unknown = JSON.parse(text)
    return isJsonContainer(value) || (
      typeof value === 'string' && parseContainer(value, item => JSON.parse(item)) !== null
    )
  } catch {
    return parseEscapedContainer(text, value => JSON.parse(value)) !== null
  }
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export type NodePath = (string | number)[]

export const pathKey = (path: NodePath): string => JSON.stringify(path)

/**
 * 收集所有容器节点路径。
 * mode = 'deep' 只收 depth >= minDepth 的（默认展开浅层）；
 * mode = 'all' 收全部（用于一键折叠）。
 */
export function collectContainerPaths(
  data: unknown,
  mode: 'deep' | 'all',
  minDepth = 2,
  path: NodePath = [],
  depth = 1,
  out: Set<string> = new Set(),
): Set<string> {
  if (Array.isArray(data)) {
    if (mode === 'all' || depth >= minDepth) out.add(pathKey(path))
    data.forEach((item, i) =>
      collectContainerPaths(item, mode, minDepth, [...path, i], depth + 1, out),
    )
  } else if (data && typeof data === 'object') {
    if (mode === 'all' || depth >= minDepth) out.add(pathKey(path))
    for (const [k, v] of Object.entries(data)) {
      collectContainerPaths(v, mode, minDepth, [...path, k], depth + 1, out)
    }
  }
  return out
}
