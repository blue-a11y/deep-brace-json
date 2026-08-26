const SHORTCUTS = {
  format: { code: 'KeyF', key: 'F' },
  minify: { code: 'KeyM', key: 'M' },
  escape: { code: 'KeyE', key: 'E' },
  unescape: { code: 'KeyU', key: 'U' },
  newTab: { code: 'KeyN', key: 'N' },
  closeTab: { code: 'KeyW', key: 'W' },
  previousTab: { code: 'BracketLeft', key: '[' },
  nextTab: { code: 'BracketRight', key: ']' },
  toggleWrap: { code: 'KeyL', key: 'L' },
  toggleCollapse: { code: 'KeyX', key: 'X' },
} as const;

export type ShortcutId = keyof typeof SHORTCUTS;

type ShortcutGroup = {
  title: string;
  items: ReadonlyArray<{
    id: ShortcutId;
    label: string;
  }>;
};

export const SHORTCUT_GROUPS = [
  {
    title: '编辑器',
    items: [
      { id: 'format', label: '格式化 JSON' },
      { id: 'minify', label: '压缩为单行' },
      { id: 'escape', label: '转义输入' },
      { id: 'unescape', label: '反转义输入' },
    ],
  },
  {
    title: '标签',
    items: [
      { id: 'newTab', label: '新建标签' },
      { id: 'closeTab', label: '关闭当前标签' },
      { id: 'previousTab', label: '上一个标签' },
      { id: 'nextTab', label: '下一个标签' },
    ],
  },
  {
    title: '树形预览',
    items: [
      { id: 'toggleWrap', label: '切换自动换行' },
      { id: 'toggleCollapse', label: '折叠 / 展开全部' },
    ],
  },
] as const satisfies ReadonlyArray<ShortcutGroup>;

const shortcutIds = Object.keys(SHORTCUTS) as ShortcutId[];
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export const getShortcutKey = (id: ShortcutId) => SHORTCUTS[id].key;

export const getShortcutAltKey = (): 'option' | 'alt' => (isMac ? 'option' : 'alt');

export const getShortcutLabel = (id: ShortcutId) => {
  const key = SHORTCUTS[id].key;
  return isMac ? `⌥⇧${key}` : `Alt+Shift+${key}`;
};

export const getAriaShortcut = (id: ShortcutId) => `Alt+Shift+${SHORTCUTS[id].key}`;

export const findShortcut = (event: KeyboardEvent): ShortcutId | null => {
  if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return null;
  return shortcutIds.find(id => SHORTCUTS[id].code === event.code) ?? null;
};
