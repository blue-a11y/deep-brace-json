import { tags as highlightTags } from '@lezer/highlight';
import { createTheme } from '@uiw/codemirror-themes';
import { TREE_THEME_OPTIONS, type TreeTheme } from './tree-theme';

type EditorThemeMode = 'dark' | 'light';

type SyntaxColors = {
  key: string;
  string: string;
  number: string;
  boolean: string;
  null: string;
  punctuation: string;
};

const TOKEN_COLORS: Record<TreeTheme, Record<EditorThemeMode, SyntaxColors>> = {
  github: {
    light: {
      key: '#0550ae',
      string: '#116329',
      number: '#953800',
      boolean: '#8250df',
      null: '#57606a',
      punctuation: '#6e7781',
    },
    dark: {
      key: '#79c0ff',
      string: '#a5d6ff',
      number: '#ffa657',
      boolean: '#d2a8ff',
      null: '#8b949e',
      punctuation: '#8b949e',
    },
  },
  catppuccin: {
    light: {
      key: '#8839ef',
      string: '#407226',
      number: '#a64e05',
      boolean: '#1e66f5',
      null: '#6c6f85',
      punctuation: '#7c7f93',
    },
    dark: {
      key: '#cba6f7',
      string: '#a6e3a1',
      number: '#fab387',
      boolean: '#89b4fa',
      null: '#a6adc8',
      punctuation: '#9399b2',
    },
  },
  ayu: {
    light: {
      key: '#00749e',
      string: '#587900',
      number: '#a85c00',
      boolean: '#8056bd',
      null: '#6b727b',
      punctuation: '#787b80',
    },
    dark: {
      key: '#73d0ff',
      string: '#bae67e',
      number: '#ffad66',
      boolean: '#d4bfff',
      null: '#a6abb5',
      punctuation: '#8a9199',
    },
  },
  gruvbox: {
    light: {
      key: '#076678',
      string: '#79740e',
      number: '#8f3f71',
      boolean: '#9d0006',
      null: '#665c54',
      punctuation: '#7c6f64',
    },
    dark: {
      key: '#83a598',
      string: '#b8bb26',
      number: '#d3869b',
      boolean: '#fb4934',
      null: '#bdae93',
      punctuation: '#a89984',
    },
  },
  default: {
    light: {
      key: '#0369a1',
      string: '#059669',
      number: '#d97706',
      boolean: '#7c3aed',
      null: '#71717a',
      punctuation: '#52525b',
    },
    dark: {
      key: '#7dd3fc',
      string: '#6ee7b7',
      number: '#fcd34d',
      boolean: '#c4b5fd',
      null: '#a1a1aa',
      punctuation: '#71717a',
    },
  },
  dracula: {
    light: {
      key: '#7c3aed',
      string: '#15803d',
      number: '#c2410c',
      boolean: '#be185d',
      null: '#6b7280',
      punctuation: 'rgb(75 85 99 / 55%)',
    },
    dark: {
      key: '#bd93f9',
      string: '#50fa7b',
      number: '#f1fa8c',
      boolean: '#ff79c6',
      null: '#6272a4',
      punctuation: 'rgb(248 248 242 / 48%)',
    },
  },
  monokai: {
    light: {
      key: '#c026d3',
      string: '#15803d',
      number: '#b45309',
      boolean: '#dc2626',
      null: '#6b7280',
      punctuation: 'rgb(63 63 70 / 55%)',
    },
    dark: {
      key: '#f92672',
      string: '#a6e22e',
      number: '#ae81ff',
      boolean: '#66d9ef',
      null: '#75715e',
      punctuation: 'rgb(248 248 242 / 48%)',
    },
  },
  'one-dark': {
    light: {
      key: '#a626a4',
      string: '#50a14f',
      number: '#986801',
      boolean: '#0184bc',
      null: '#c18401',
      punctuation: 'rgb(56 58 66 / 55%)',
    },
    dark: {
      key: '#c678dd',
      string: '#98c379',
      number: '#d19a66',
      boolean: '#56b6c2',
      null: '#e06c75',
      punctuation: 'rgb(171 178 191 / 48%)',
    },
  },
  nord: {
    light: {
      key: '#5e81ac',
      string: '#2e7d32',
      number: '#b48ead',
      boolean: '#d08770',
      null: '#4c566a',
      punctuation: 'rgb(76 86 106 / 55%)',
    },
    dark: {
      key: '#81a1c1',
      string: '#a3be8c',
      number: '#b48ead',
      boolean: '#d08770',
      null: '#616e88',
      punctuation: 'rgb(216 222 233 / 48%)',
    },
  },
  solarized: {
    light: {
      key: '#268bd2',
      string: '#859900',
      number: '#b58900',
      boolean: '#6c71c4',
      null: '#93a1a1',
      punctuation: 'rgb(88 110 117 / 55%)',
    },
    dark: {
      key: '#268bd2',
      string: '#859900',
      number: '#b58900',
      boolean: '#6c71c4',
      null: '#657b83',
      punctuation: 'rgb(131 148 150 / 55%)',
    },
  },
  'tokyo-night': {
    light: {
      key: '#34548a',
      string: '#485e30',
      number: '#965027',
      boolean: '#5a4a78',
      null: '#6c6e75',
      punctuation: 'rgb(52 59 88 / 55%)',
    },
    dark: {
      key: '#7aa2f7',
      string: '#9ece6a',
      number: '#ff9e64',
      boolean: '#bb9af7',
      null: '#565f89',
      punctuation: 'rgb(169 177 214 / 50%)',
    },
  },
};

const createEditorTheme = (theme: EditorThemeMode, colors: SyntaxColors) => {
  const isDark = theme === 'dark';

  return createTheme({
    theme,
    settings: {
      background: 'transparent',
      foreground: isDark ? '#d4d4d8' : '#27272a',
      caret: 'var(--color-accent)',
      selection: isDark ? '#7dd3fc22' : '#0369a122',
      selectionMatch: isDark ? '#7dd3fc33' : '#0369a133',
      lineHighlight: isDark ? '#ffffff08' : '#00000006',
      gutterBackground: 'transparent',
      gutterForeground: isDark ? '#52525b' : '#a1a1aa',
      gutterBorder: 'transparent',
    },
    styles: [
      { tag: highlightTags.comment, color: isDark ? '#52525b' : '#a1a1aa' },
      { tag: highlightTags.propertyName, color: colors.key },
      { tag: highlightTags.string, color: colors.string },
      { tag: highlightTags.number, color: colors.number },
      { tag: highlightTags.bool, color: colors.boolean },
      { tag: highlightTags.null, color: colors.null },
      { tag: highlightTags.bracket, color: colors.punctuation },
      { tag: highlightTags.operator, color: colors.punctuation },
      { tag: highlightTags.invalid, color: isDark ? '#f87171' : '#dc2626' },
    ],
  });
};

type CodeMirrorTheme = ReturnType<typeof createEditorTheme>;

const CODE_MIRROR_THEMES = Object.fromEntries(
  TREE_THEME_OPTIONS.map(({ value }) => {
    const colors = TOKEN_COLORS[value];
    return [
      value,
      {
        light: createEditorTheme('light', colors.light),
        dark: createEditorTheme('dark', colors.dark),
      },
    ];
  }),
) as Record<TreeTheme, Record<EditorThemeMode, CodeMirrorTheme>>;

export const getCodeMirrorTheme = (isDark: boolean, treeTheme: TreeTheme) => {
  const theme = isDark ? 'dark' : 'light';

  return CODE_MIRROR_THEMES[treeTheme][theme];
};
