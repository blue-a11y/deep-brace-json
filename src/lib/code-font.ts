export const CODE_FONT_OPTIONS = [
  { value: 'jetbrains-mono', label: 'JetBrains Mono' },
  { value: 'fira-code', label: 'Fira Code' },
  { value: 'source-code-pro', label: 'Source Code Pro' },
  { value: 'ibm-plex-mono', label: 'IBM Plex Mono' },
  { value: 'roboto-mono', label: 'Roboto Mono' },
  { value: 'ubuntu-mono', label: 'Ubuntu Mono' },
  { value: 'inconsolata', label: 'Inconsolata' },
] as const;

export type CodeFont = (typeof CODE_FONT_OPTIONS)[number]['value'];

export const DEFAULT_CODE_FONT: CodeFont = 'jetbrains-mono';

export const isCodeFont = (value: unknown): value is CodeFont =>
  CODE_FONT_OPTIONS.some(option => option.value === value);
