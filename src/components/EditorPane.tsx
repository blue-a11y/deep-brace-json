import { useEffect, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { foldGutter } from '@codemirror/language'
import { json } from '@codemirror/lang-json'
import { Braces, FileJson, Minimize2, Package, PackageOpen } from 'lucide-react'
import { Button } from '@heroui/react'
import { getCodeMirrorTheme } from '../lib/cmTheme'
import { bindTabScrollPosition } from '../lib/tab-scroll'
import { selectActiveTab, useStore } from '../store/useStore'
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
    editorScrollCleanupRef.current = bindTabScrollPosition(
      activeTab.id,
      'editor',
      view.scrollDOM,
    )
  }

  useEffect(() => () => editorScrollCleanupRef.current?.(), [])

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-4 py-1 text-xs text-foreground/55">
        <FileJson size={13} />
        <span className="font-medium">编辑器</span>
        <div className="ml-auto flex items-center gap-0.5">
          <Tip label="格式化 · JSON5 → 标准 JSON">
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                if (format()) setFormatPulse(pulse => pulse + 1)
              }}
            >
              <Braces
                size={14}
                key={formatPulse}
                className={formatPulse > 0 ? 'icon-feedback-format' : undefined}
              />
              <span className="hidden md:inline">格式化</span>
            </Button>
          </Tip>
          <Tip label="压缩为单行">
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                if (minify()) setMinifyPulse(pulse => pulse + 1)
              }}
            >
              <Minimize2
                size={14}
                key={minifyPulse}
                className={minifyPulse > 0 ? 'icon-feedback-minify' : undefined}
              />
              <span className="hidden md:inline">压缩</span>
            </Button>
          </Tip>
          <Tip label="转义 · 包成 JSON 字符串字面量，可反复叠加">
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                if (escape()) setEscapePulse(pulse => pulse + 1)
              }}
            >
              <Package
                size={14}
                key={escapePulse}
                className={escapePulse > 0 ? 'icon-feedback-wrap' : undefined}
              />
              <span className="hidden md:inline">转义</span>
            </Button>
          </Tip>
          <Tip label="反转义 · 剥开一层转义，可反复点击">
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                if (unescape()) setUnescapePulse(pulse => pulse + 1)
              }}
            >
              <PackageOpen
                size={14}
                key={unescapePulse}
                className={unescapePulse > 0 ? 'icon-feedback-unwrap' : undefined}
              />
              <span className="hidden md:inline">反转义</span>
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
