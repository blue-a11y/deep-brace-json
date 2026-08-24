import { useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { json } from '@codemirror/lang-json'
import { Braces, FileJson, Minimize2 } from 'lucide-react'
import { Button } from '@heroui/react'
import { getCodeMirrorTheme } from '../lib/cmTheme'
import { bindTabScrollPosition } from '../lib/tab-scroll'
import { selectActiveTab, useStore } from '../store/useStore'
import { Tip } from './Tip'

export const EditorPane = () => {
  const activeTab = useStore(selectActiveTab)
  const input = activeTab.input
  const dark = useStore(s => s.dark)
  const treeTheme = useStore(s => s.treeTheme)
  const editInput = useStore(s => s.editInput)
  const format = useStore(s => s.format)
  const minify = useStore(s => s.minify)
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
      <div className="flex h-11 shrink-0 items-center gap-2 px-4 text-xs text-foreground/55">
        <FileJson size={13} />
        <span className="font-medium">编辑器</span>
        <div className="ml-auto flex items-center gap-0.5">
          <Tip label="格式化 · JSON5 → 标准 JSON">
            <Button size="sm" variant="ghost" onPress={format}>
              <Braces size={14} />
              <span className="hidden md:inline">格式化</span>
            </Button>
          </Tip>
          <Tip label="压缩为单行">
            <Button size="sm" variant="ghost" onPress={minify}>
              <Minimize2 size={14} />
              <span className="hidden md:inline">压缩</span>
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
          extensions={[json(), EditorView.lineWrapping]}
          basicSetup={{
            foldGutter: true,
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
