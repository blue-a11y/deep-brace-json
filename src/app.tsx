import { useEffect } from 'react';
import { Toast } from '@heroui/react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { EditorPane } from './components/editor-pane';
import { JsonTabs } from './components/json-tabs';
import { ShortcutManager } from './components/shortcut-manager';
import { StatusBar } from './components/status-bar';
import { Toolbar } from './components/toolbar';
import { EmptyPane, ErrorPane, TreeView } from './components/tree-view';
import { panelLayoutStorage } from './lib/panel-layout-storage';
import { STORAGE_KEYS } from './lib/storage';
import { toastQueue } from './lib/toast';
import { useMediaQuery } from './lib/use-media-query';
import { applyCodeFont, applyTheme, selectActiveTab, useStore } from './store/use-store';

const App = () => {
  const activeTab = useStore(selectActiveTab);
  const { id: activeTabId, input, result } = activeTab;
  const isDark = useStore(state => state.isDark);
  const codeFont = useStore(state => state.codeFont);
  const bootstrap = useStore(state => state.bootstrap);
  const resetEpoch = useStore(state => state.resetEpoch);

  // 对 persist 恢复的输入补一次解析
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // 主题同步到 <html>（切换时 store 已即时应用，这里兜底首帧与恢复）
  useEffect(() => applyTheme(isDark), [isDark]);

  // 代码字体同步到 <html>，供 CodeMirror、树形预览和错误内容共享。
  useEffect(() => applyCodeFont(codeFont), [codeFont]);

  const isDesktop = useMediaQuery('(min-width: 768px)');

  const paneClass = 'h-full overflow-hidden rounded-2xl bg-white dark:bg-foreground/5';
  const editorPane = (
    <div key={`${activeTabId}-editor`} data-workspace-pane="editor" className={paneClass}>
      <EditorPane />
    </div>
  );
  const previewPane = (
    <div key={`${activeTabId}-preview`} data-workspace-pane="preview" className={paneClass}>
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
  );

  return (
    <div className="flex h-full flex-col gap-2 bg-background px-3 pt-2 pb-1">
      <ShortcutManager />
      <Toolbar />
      {/* 重置/撤销时变更 key,一次性重挂载标签栏以下的全部工作区
          (编辑器、树形预览、分栏面板),清除 DOM 层残留的滚动与布局 */}
      <div key={resetEpoch} className="flex min-h-0 flex-1 flex-col">
        <JsonTabs />
        <div className="flex min-h-0 flex-1 flex-col">
          {isDesktop ? (
            <PanelGroup
              direction="horizontal"
              className="min-h-0 flex-1"
              autoSaveId={STORAGE_KEYS.splitLayout}
              storage={panelLayoutStorage}
            >
              <Panel defaultSize={50} minSize={20} className="p-1">
                {editorPane}
              </Panel>
              <PanelResizeHandle
                aria-label="调整编辑器与树形预览宽度"
                className="group flex w-2 items-center justify-center outline-none"
              >
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
      </div>

      {/* 自定义队列保证 HeroUI View Transition 在队列更新边界内执行 */}
      <Toast.Provider placement="bottom start" queue={toastQueue} />
    </div>
  );
};

export default App;
