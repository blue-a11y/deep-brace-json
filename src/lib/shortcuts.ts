const SHORTCUTS = {
  format: { code: 'KeyF', key: 'F' },
  minify: { code: 'KeyM', key: 'M' },
  escape: { code: 'KeyE', key: 'E' },
  unescape: { code: 'KeyU', key: 'U' },
  focusEditor: { code: 'KeyI', key: 'I' },
  newTab: { code: 'KeyN', key: 'N' },
  closeTab: { code: 'KeyW', key: 'W' },
  previousTab: { code: 'BracketLeft', key: '[' },
  nextTab: { code: 'BracketRight', key: ']' },
  renameTab: { code: 'KeyR', key: 'R' },
  insertTabLeft: { code: 'KeyA', key: 'A' },
  insertTabRight: { code: 'KeyD', key: 'D' },
  closeTabsLeft: { code: 'KeyJ', key: 'J' },
  closeTabsRight: { code: 'KeyK', key: 'K' },
  closeOtherTabs: { code: 'KeyO', key: 'O' },
  toggleWrap: { code: 'KeyL', key: 'L' },
  toggleCollapse: { code: 'KeyX', key: 'X' },
  openTheme: { code: 'KeyT', key: 'T' },
  openSettings: { code: 'KeyS', key: 'S' },
  openShortcuts: { code: 'KeyH', key: 'H' },
  toggleTheme: { code: 'KeyB', key: 'B' },
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
      { id: 'focusEditor', label: '聚焦编辑器' },
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
      { id: 'renameTab', label: '重命名当前标签' },
      { id: 'insertTabLeft', label: '向左添加标签' },
      { id: 'insertTabRight', label: '向右添加标签' },
      { id: 'closeTabsLeft', label: '关闭左侧全部' },
      { id: 'closeTabsRight', label: '关闭右侧全部' },
      { id: 'closeOtherTabs', label: '关闭其它全部' },
    ],
  },
  {
    title: '外观与设置',
    items: [
      { id: 'openTheme', label: '配色与字体' },
      { id: 'toggleTheme', label: '切换明暗模式' },
      { id: 'openSettings', label: '全局设置' },
      { id: 'openShortcuts', label: '快捷键设置' },
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

export const MODIFIER_OPTIONS = [
  { id: 'ctrl', label: 'Ctrl', aria: 'Control', kbd: 'ctrl' },
  { id: 'alt', label: isMac ? 'Option' : 'Alt', aria: 'Alt', kbd: isMac ? 'option' : 'alt' },
  { id: 'meta', label: isMac ? 'Cmd' : 'Win / Meta', aria: 'Meta', kbd: isMac ? 'command' : 'win' },
  { id: 'shift', label: 'Shift', aria: 'Shift', kbd: 'shift' },
] as const;

export type ShortcutModifiers = Readonly<Record<(typeof MODIFIER_OPTIONS)[number]['id'], boolean>>;
export const DEFAULT_SHORTCUT_MODIFIERS: ShortcutModifiers = {
  ctrl: false,
  alt: true,
  meta: false,
  shift: true,
};

export const isShortcutModifiers = (value: unknown): value is ShortcutModifiers => {
  if (!value || typeof value !== 'object') return false;
  const modifiers = value as Partial<ShortcutModifiers>;
  return (
    MODIFIER_OPTIONS.every(option => typeof modifiers[option.id] === 'boolean') &&
    Boolean(modifiers.ctrl || modifiers.alt || modifiers.meta)
  );
};

export const getShortcutKey = (id: ShortcutId) => SHORTCUTS[id].key;

export const getShortcutLabel = (id: ShortcutId, modifiers = DEFAULT_SHORTCUT_MODIFIERS) =>
  [
    ...MODIFIER_OPTIONS.filter(option => modifiers[option.id]).map(option => option.label),
    SHORTCUTS[id].key,
  ].join('+');

export const getAriaShortcut = (id: ShortcutId, modifiers = DEFAULT_SHORTCUT_MODIFIERS) =>
  [
    ...MODIFIER_OPTIONS.filter(option => modifiers[option.id]).map(option => option.aria),
    SHORTCUTS[id].key,
  ].join('+');

export const findShortcut = (
  event: KeyboardEvent,
  modifiers = DEFAULT_SHORTCUT_MODIFIERS,
): ShortcutId | null => {
  if (event.defaultPrevented || event.repeat || event.isComposing) return null;
  if (event.getModifierState?.('AltGraph')) return null;
  if (
    !isShortcutModifiers(modifiers) ||
    MODIFIER_OPTIONS.some(option => event[`${option.id}Key`] !== modifiers[option.id])
  )
    return null;
  return shortcutIds.find(id => SHORTCUTS[id].code === event.code) ?? null;
};
