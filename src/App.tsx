import { useEffect } from 'react'
import { Toast } from '@heroui/react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { Toolbar } from './components/Toolbar'
import { EditorPane } from './components/EditorPane'
import { JsonTabs } from './components/json-tabs'
import { EmptyPane, ErrorPane, TreeView } from './components/TreeView'
import { StatusBar } from './components/StatusBar'
import { toastQueue } from './lib/toast'
import { useMediaQuery } from './lib/useMediaQuery'
import { applyTheme, selectActiveTab, useStore } from './store/useStore'

const SPLIT_LAYOUT_STORAGE_ID = 'json-lens-split'

export default function App() {
  const activeTab = useStore(selectActiveTab)
  const { id: activeTabId, input, result } = activeTab
  const dark = useStore(s => s.dark)
  const bootstrap = useStore(s => s.bootstrap)

  // 对 persist 恢复的输入补一次解析
  useEffect(bootstrap, [bootstrap])

  // 主题同步到 <html>（切换时 store 已即时应用，这里兜底首帧与恢复）
  useEffect(() => applyTheme(dark), [dark])


  const isDesktop = useMediaQuery('(min-width: 768px)')

  const paneClass =
    'h-full overflow-hidden rounded-2xl bg-white dark:bg-foreground/5'
  const editorPane = (
    <div key={`${activeTabId}-editor`} className={paneClass}>
      <EditorPane />
    </div>
  )
  const previewPane = (
    <div key={`${activeTabId}-preview`} className={paneClass}>
      {!input.trim() ? (
        <EmptyPane hint="在左侧输入内容，这里实时展开成树" />
      ) : !result ? (
        <EmptyPane hint="等待输入…" />
      ) : !result.ok ? (
        <ErrorPane message={result.message} line={result.line} column={result.column} />
      ) : (
        <TreeView />
      )}
    </div>
  )

  return (
    <div className="flex h-full flex-col gap-2 bg-background px-3 py-2">
      <Toolbar />
      <JsonTabs />
      <div className="flex min-h-0 flex-1 flex-col">
        {isDesktop ? (
          <PanelGroup
            direction="horizontal"
            className="min-h-0 flex-1"
            autoSaveId={SPLIT_LAYOUT_STORAGE_ID}
          >
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
          <main key={activeTabId} className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="min-h-[240px] flex-1">{editorPane}</div>
            <div className="min-h-[240px] flex-1">{previewPane}</div>
          </main>
        )}
        <StatusBar />
      </div>

      {/* 自定义队列保证 HeroUI View Transition 在队列更新边界内执行 */}
      <Toast.Provider placement="bottom start" queue={toastQueue} />
    </div>
  )
}
