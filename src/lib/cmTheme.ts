import { createTheme } from '@uiw/codemirror-themes'
import { tags as t } from '@lezer/highlight'
import type { TreeTheme } from './tree-theme'

type EditorThemeMode = 'dark' | 'light'

type SyntaxColors = {
  key: string
  string: string
  number: string
  boolean: string
  null: string
  punctuation: string
}

const TOKEN_COLORS: Record<TreeTheme, Record<EditorThemeMode, SyntaxColors>> = {
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
}

const createEditorTheme = (theme: EditorThemeMode, colors: SyntaxColors) => {
  const dark = theme === 'dark'

  return createTheme({
    theme,
    settings: {
      background: 'transparent',
      foreground: dark ? '#d4d4d8' : '#27272a',
      caret: colors.key,
      selection: dark ? '#7dd3fc22' : '#0369a122',
      selectionMatch: dark ? '#7dd3fc33' : '#0369a133',
      lineHighlight: dark ? '#ffffff08' : '#00000006',
      gutterBackground: 'transparent',
      gutterForeground: dark ? '#52525b' : '#a1a1aa',
      gutterBorder: 'transparent',
    },
    styles: [
      { tag: t.comment, color: dark ? '#52525b' : '#a1a1aa' },
      { tag: t.propertyName, color: colors.key },
      { tag: t.string, color: colors.string },
      { tag: t.number, color: colors.number },
      { tag: t.bool, color: colors.boolean },
      { tag: t.null, color: colors.null },
      { tag: t.bracket, color: colors.punctuation },
      { tag: t.operator, color: colors.punctuation },
      { tag: t.invalid, color: dark ? '#f87171' : '#dc2626' },
    ],
  })
}

const CODE_MIRROR_THEMES = {
  default: {
    light: createEditorTheme('light', TOKEN_COLORS.default.light),
    dark: createEditorTheme('dark', TOKEN_COLORS.default.dark),
  },
  dracula: {
    light: createEditorTheme('light', TOKEN_COLORS.dracula.light),
    dark: createEditorTheme('dark', TOKEN_COLORS.dracula.dark),
  },
  monokai: {
    light: createEditorTheme('light', TOKEN_COLORS.monokai.light),
    dark: createEditorTheme('dark', TOKEN_COLORS.monokai.dark),
  },
}

export const getCodeMirrorTheme = (dark: boolean, treeTheme: TreeTheme) => {
  const theme = dark ? 'dark' : 'light'

  return CODE_MIRROR_THEMES[treeTheme][theme]
}
