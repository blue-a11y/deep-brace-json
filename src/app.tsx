import { useEffect, useRef, useState } from 'react';
import { Toast } from '@heroui/react';
import {
  getPanelGroupElement,
  Panel,
  PanelGroup,
  PanelResizeHandle,
  type ImperativePanelGroupHandle,
} from 'react-resizable-panels';
import { EditorPane } from './components/editor/editor-pane';
import { StatusBar } from './components/shared/status-bar';
import { ShortcutManager } from './components/shortcuts/shortcut-manager';
import { JsonTabs } from './components/tabs/json-tabs';
import { Toolbar } from './components/toolbar/toolbar';
import { EmptyPane, ErrorPane, TreeView } from './components/tree/tree-view';
import {
  shouldSnapWorkspacePanelsToCenter,
  WORKSPACE_PANEL_CONSTRAINTS,
} from './lib/layout/panel-layout-config';
import { useMediaQuery } from './lib/layout/use-media-query';
import { panelLayoutStorage } from './lib/storage/panel-layout-storage';
import { STORAGE_KEYS } from './lib/storage/storage';
import { toastQueue } from './lib/workspace/toast';
import {
  applyCodeFont,
  applyCodeStyle,
  applyTheme,
  selectActiveTab,
  useStore,
} from './store/use-store';

const App = () => {
  const activeTab = useStore(selectActiveTab);
  const { id: activeTabId, input, result } = activeTab;
  const isDark = useStore(state => state.isDark);
  const codeFont = useStore(state => state.codeFont);
  const isCodeBold = useStore(state => state.isCodeBold);
  const isCodeItalic = useStore(state => state.isCodeItalic);
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
  useEffect(() => applyCodeStyle(isCodeBold, isCodeItalic), [isCodeBold, isCodeItalic]);

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const panelGroupRef = useRef<ImperativePanelGroupHandle>(null);
  const isPanelDraggingRef = useRef(false);
  const [isPanelCenterSnapGuideVisible, setIsPanelCenterSnapGuideVisible] = useState(false);

  const handlePanelLayout = (layout: number[]) => {
    if (!isPanelDraggingRef.current) return;

    const panelGroup = panelGroupRef.current;
    if (!panelGroup) return;

    const groupWidth = getPanelGroupElement(panelGroup.getId())?.getBoundingClientRect().width ?? 0;
    const shouldSnapToCenter = shouldSnapWorkspacePanelsToCenter(layout, groupWidth);
    setIsPanelCenterSnapGuideVisible(shouldSnapToCenter);

    if (shouldSnapToCenter && layout[0] !== 50) {
      panelGroup.setLayout([50, 50]);
    }
  };

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
              ref={panelGroupRef}
              direction="horizontal"
              className="relative min-h-0 flex-1"
              autoSaveId={STORAGE_KEYS.splitLayout}
              storage={panelLayoutStorage}
              onLayout={handlePanelLayout}
            >
              <Panel {...WORKSPACE_PANEL_CONSTRAINTS} className="p-1">
                {editorPane}
              </Panel>
              <PanelResizeHandle
                aria-label="调整编辑器与树形预览宽度"
                className="group flex w-2 items-center justify-center outline-none"
                onDragging={isDragging => {
                  isPanelDraggingRef.current = isDragging;
                  if (!isDragging) setIsPanelCenterSnapGuideVisible(false);
                }}
              >
                <div className="h-14 w-1 rounded-full bg-foreground/15 transition-colors group-hover:bg-primary/70 group-data-[resize-handle-state=drag]:bg-primary" />
              </PanelResizeHandle>
              <Panel {...WORKSPACE_PANEL_CONSTRAINTS} className="p-1">
                {previewPane}
              </Panel>
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute left-1/2 top-1/2 z-10 h-[90%] w-0.5 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-100 motion-reduce:transition-none ${
                  isPanelCenterSnapGuideVisible ? 'opacity-60' : 'opacity-0'
                }`}
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(to bottom, var(--color-accent) 0 6px, transparent 6px 10px)',
                }}
              />
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
