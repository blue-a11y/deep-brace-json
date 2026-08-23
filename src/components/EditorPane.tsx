import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { json } from '@codemirror/lang-json'
import { Braces, FileJson, Minimize2 } from 'lucide-react'
import { Button } from '@heroui/react'
import { cmDark, cmLight } from '../lib/cmTheme'
import { useStore } from '../store/useStore'
import { Tip } from './Tip'

export function EditorPane() {
  const input = useStore(s => s.input)
  const dark = useStore(s => s.dark)
  const editInput = useStore(s => s.editInput)
  const format = useStore(s => s.format)
  const minify = useStore(s => s.minify)

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
          value={input}
          height="100%"
          theme={dark ? cmDark : cmLight}
          extensions={[json(), EditorView.lineWrapping]}
          basicSetup={{
            foldGutter: true,
            autocompletion: false,
            highlightSelectionMatches: false,
          }}
          onChange={editInput}
          placeholder="粘贴 JSON / JSON5，输入即自动解析…"
        />
      </div>
    </section>
  )
}
