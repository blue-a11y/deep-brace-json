export const TREE_THEME_OPTIONS = [
  { value: 'default', label: '默认配色' },
  { value: 'dracula', label: 'Dracula' },
  { value: 'monokai', label: 'Monokai' },
  { value: 'one-dark', label: 'One Dark' },
  { value: 'nord', label: 'Nord' },
  { value: 'solarized', label: 'Solarized' },
  { value: 'tokyo-night', label: 'Tokyo Night' },
  { value: 'github', label: 'GitHub' },
  { value: 'catppuccin', label: 'Catppuccin' },
  { value: 'ayu', label: 'Ayu' },
  { value: 'gruvbox', label: 'Gruvbox' },
] as const;

export type TreeTheme = (typeof TREE_THEME_OPTIONS)[number]['value'];

export const DEFAULT_TREE_THEME: TreeTheme = 'default';
