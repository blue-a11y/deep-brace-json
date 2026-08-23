import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { json } from '@codemirror/lang-json'
import { FileJson } from 'lucide-react'
import { cmDark, cmLight } from '../lib/cmTheme'
import { useStore } from '../store/useStore'

export function EditorPane() {
  const input = useStore(s => s.input)
  const dark = useStore(s => s.dark)
  const editInput = useStore(s => s.editInput)

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 px-4 text-xs text-foreground/55">
        <FileJson size={13} />
        <span className="font-medium">编辑器</span>
        <span className="ml-auto font-mono text-[11px] text-foreground/40">JSON5 语法</span>
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
