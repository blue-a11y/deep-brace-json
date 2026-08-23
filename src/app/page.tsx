'use client'

import { useEffect } from 'react'
import { ToastRegion } from '../components/toast'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Toolbar } from '../components/Toolbar'
import { EditorPane } from '../components/EditorPane'
import { EmptyPane, ErrorPane, TreeView } from '../components/TreeView'
import { StatusBar } from '../components/StatusBar'
import { useMediaQuery } from '../lib/useMediaQuery'
import { useStore } from '../store/useStore'

export default function Home() {
  const input = useStore(s => s.input)
  const result = useStore(s => s.result)
  const dark = useStore(s => s.dark)
  const bootstrap = useStore(s => s.bootstrap)
  const parse = useStore(s => s.parse)

  // persist 跳过 SSR 水合，客户端手动恢复后再补一次解析
  useEffect(() => {
    const rehydrate = useStore.persist.rehydrate()
    Promise.resolve(rehydrate).then(() => useStore.getState().bootstrap())
  }, [bootstrap])

  // 主题同步到 <html>（切换时 store 已即时应用，这里兜底首帧与恢复）
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])

  // ⌘/Ctrl + Enter 解析
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        parse()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [parse])

  const isDesktop = useMediaQuery('(min-width: 768px)')

  const paneClass =
    'h-full overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-foreground/5'
  const editorPane = (
    <div className={paneClass}>
      <EditorPane />
    </div>
  )
  const previewPane = (
    <div className={paneClass}>
      {!input.trim() ? (
        <EmptyPane hint="输入内容后按 ⌘↵ 解析，结果在这里展开成一棵树" />
      ) : !result ? (
        <EmptyPane hint="按 ⌘↵ 开始解析" />
      ) : !result.ok ? (
        <ErrorPane message={result.message} line={result.line} column={result.column} />
      ) : (
        <TreeView />
      )}
    </div>
  )

  return (
    <div className="flex h-screen flex-col gap-3 bg-background p-3">
      <Toolbar />

      {isDesktop ? (
        <PanelGroup direction="horizontal" className="min-h-0 flex-1" autoSaveId="json-lens-split">
          <Panel defaultSize={50} minSize={20} className="p-1">
            {editorPane}
          </Panel>
          <PanelResizeHandle className="group flex w-2 items-center justify-center outline-none">
            <div className="h-14 w-1 rounded-full bg-foreground/15 transition-colors group-hover:bg-primary/70 group-data-[resize-handle-state=drag]:bg-primary" />
          </PanelResizeHandle>
          <Panel defaultSize={50} minSize={20} className="p-1">
            {previewPane}
          </Panel>
        </PanelGroup>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="min-h-[240px] flex-1">{editorPane}</div>
          <div className="min-h-[240px] flex-1">{previewPane}</div>
        </main>
      )}

      <StatusBar />

      {/* 复刻版 Toast：对照官方源码实现，挂载一次 */}
      <ToastRegion />
    </div>
  )
}
