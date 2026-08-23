import { createTheme } from '@uiw/codemirror-themes'
import { tags as t } from '@lezer/highlight'

/**
 * 编辑器配色与右侧树形预览的语义色保持一致：
 * key=sky string=emerald number=amber boolean=violet null=灰
 */

export const cmDark = createTheme({
  theme: 'dark',
  settings: {
    background: 'transparent',
    foreground: '#d4d4d8',
    caret: '#7dd3fc',
    selection: '#7dd3fc22',
    selectionMatch: '#7dd3fc33',
    lineHighlight: '#ffffff08',
    gutterBackground: 'transparent',
    gutterForeground: '#52525b',
    gutterBorder: 'transparent',
  },
  styles: [
    { tag: t.comment, color: '#52525b' },
    { tag: t.propertyName, color: '#7dd3fc' },
    { tag: t.string, color: '#6ee7b7' },
    { tag: t.number, color: '#fcd34d' },
    { tag: t.bool, color: '#c4b5fd' },
    { tag: t.null, color: '#a1a1aa' },
    { tag: t.bracket, color: '#71717a' },
    { tag: t.operator, color: '#71717a' },
    { tag: t.invalid, color: '#f87171' },
  ],
})

export const cmLight = createTheme({
  theme: 'light',
  settings: {
    background: 'transparent',
    foreground: '#27272a',
    caret: '#0369a1',
    selection: '#0369a122',
    selectionMatch: '#0369a133',
    lineHighlight: '#00000006',
    gutterBackground: 'transparent',
    gutterForeground: '#a1a1aa',
    gutterBorder: 'transparent',
  },
  styles: [
    { tag: t.comment, color: '#a1a1aa' },
    { tag: t.propertyName, color: '#0369a1' },
    { tag: t.string, color: '#059669' },
    { tag: t.number, color: '#d97706' },
    { tag: t.bool, color: '#7c3aed' },
    { tag: t.null, color: '#71717a' },
    { tag: t.bracket, color: '#52525b' },
    { tag: t.operator, color: '#52525b' },
    { tag: t.invalid, color: '#dc2626' },
  ],
})
