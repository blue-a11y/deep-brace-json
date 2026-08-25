import { useEffect, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { foldGutter } from '@codemirror/language'
import { json } from '@codemirror/lang-json'
import { Braces, FileJson, Minimize2, Package, PackageOpen } from 'lucide-react'
import { Button } from '@heroui/react'
import { getCodeMirrorTheme } from '../lib/cmTheme'
import { getAriaShortcut } from '../lib/shortcuts'
import { bindEditorTabScrollPosition } from '../lib/tab-scroll'
import { selectActiveTab, useStore } from '../store/useStore'
import { ShortcutHint } from './shortcut-hint'
import { Tip } from './Tip'

/** 与 TreeView 同款 chevron:默认 ⌄/› 字形墨迹偏行底,换 SVG 在 24px 行内精确居中 */
const FOLD_MARKER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="{d}"/></svg>'
const chevronDown = FOLD_MARKER_SVG.replace('{d}', 'm6 9 6 6 6-6')
const chevronRight = FOLD_MARKER_SVG.replace('{d}', 'm9 18 6-6-6-6')

const jsonFoldGutter = foldGutter({
  markerDOM: open => {
    const marker = document.createElement('span')
    marker.className = 'cm-fold-marker'
    marker.title = open ? '折叠' : '展开'
    marker.innerHTML = open ? chevronDown : chevronRight
    return marker
  },
})

export const EditorPane = () => {
  const activeTab = useStore(selectActiveTab)
  const input = activeTab.input
  const dark = useStore(s => s.dark)
  const treeTheme = useStore(s => s.treeTheme)
  const editInput = useStore(s => s.editInput)
  const format = useStore(s => s.format)
  const minify = useStore(s => s.minify)
  const escape = useStore(s => s.escape)
  const unescape = useStore(s => s.unescape)
  const [formatPulse, setFormatPulse] = useState(0)
  const [minifyPulse, setMinifyPulse] = useState(0)
  const [escapePulse, setEscapePulse] = useState(0)
  const [unescapePulse, setUnescapePulse] = useState(0)
  const editorScrollCleanupRef = useRef<(() => void) | null>(null)

  const handleCreateEditor = (view: EditorView) => {
    editorScrollCleanupRef.current?.()
    editorScrollCleanupRef.current = bindEditorTabScrollPosition(activeTab.id, view)
  }

  useEffect(() => () => editorScrollCleanupRef.current?.(), [])

  return (
    <section className="pane-responsive-actions flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-4 py-1 text-xs text-foreground/55">
        <FileJson size={13} />
        <span className="font-medium">编辑器</span>
        <div className="panel-header-actions ml-auto flex items-center gap-0.5">
          <Tip
            ariaKeyShortcuts={getAriaShortcut('format')}
            label={
              <ShortcutHint shortcut="format">格式化 · JSON5 → 标准 JSON</ShortcutHint>
            }
          >
            <Button
              size="sm"
              variant="ghost"
              aria-keyshortcuts={getAriaShortcut('format')}
              onPress={() => {
                if (format()) setFormatPulse(pulse => pulse + 1)
              }}
            >
              <Braces
                size={14}
                key={formatPulse}
                className={formatPulse > 0 ? 'icon-feedback-format' : undefined}
              />
              <span className="pane-action-label">格式化</span>
            </Button>
          </Tip>
          <Tip
            ariaKeyShortcuts={getAriaShortcut('minify')}
            label={<ShortcutHint shortcut="minify">压缩为单行</ShortcutHint>}
          >
            <Button
              size="sm"
              variant="ghost"
              aria-keyshortcuts={getAriaShortcut('minify')}
              onPress={() => {
                if (minify()) setMinifyPulse(pulse => pulse + 1)
              }}
            >
              <Minimize2
                size={14}
                key={minifyPulse}
                className={minifyPulse > 0 ? 'icon-feedback-minify' : undefined}
              />
              <span className="pane-action-label">压缩</span>
            </Button>
          </Tip>
          <Tip
            ariaKeyShortcuts={getAriaShortcut('escape')}
            label={
              <ShortcutHint shortcut="escape">
                转义 · 包成 JSON 字符串字面量，可反复叠加
              </ShortcutHint>
            }
          >
            <Button
              size="sm"
              variant="ghost"
              aria-keyshortcuts={getAriaShortcut('escape')}
              onPress={() => {
                if (escape()) setEscapePulse(pulse => pulse + 1)
              }}
            >
              <Package
                size={14}
                key={escapePulse}
                className={escapePulse > 0 ? 'icon-feedback-wrap' : undefined}
              />
              <span className="pane-action-label">转义</span>
            </Button>
          </Tip>
          <Tip
            ariaKeyShortcuts={getAriaShortcut('unescape')}
            label={
              <ShortcutHint shortcut="unescape">
                反转义 · 剥开一层转义，可反复点击
              </ShortcutHint>
            }
          >
            <Button
              size="sm"
              variant="ghost"
              aria-keyshortcuts={getAriaShortcut('unescape')}
              onPress={() => {
                if (unescape()) setUnescapePulse(pulse => pulse + 1)
              }}
            >
              <PackageOpen
                size={14}
                key={unescapePulse}
                className={unescapePulse > 0 ? 'icon-feedback-unwrap' : undefined}
              />
              <span className="pane-action-label">反转义</span>
            </Button>
          </Tip>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <CodeMirror
          key={activeTab.id}
          value={input}
          height="100%"
          theme={getCodeMirrorTheme(dark, treeTheme)}
          extensions={[json(), jsonFoldGutter, EditorView.lineWrapping]}
          basicSetup={{
            foldGutter: false,
            autocompletion: false,
            highlightSelectionMatches: false,
          }}
          onCreateEditor={handleCreateEditor}
          onChange={editInput}
          placeholder="粘贴 JSON / JSON5，输入即自动解析…"
        />
      </div>
    </section>
  )
}
