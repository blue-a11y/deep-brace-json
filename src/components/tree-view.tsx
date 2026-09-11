import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Button } from '@heroui/react';
import {
  ArrowLeftRight,
  Check,
  Copy,
  Eye,
  FoldVertical,
  OctagonAlert,
  Search,
  Trash2,
  UnfoldVertical,
  WrapText,
} from 'lucide-react';
import { serializeForCopy, TREE_INDENT_PIXEL_RATIO } from '../lib/indent';
import {
  isLargeResult,
  LARGE_INPUT_LENGTH,
  LARGE_VALUE_PREVIEW_LENGTH,
} from '../lib/large-document';
import { bindTreeTabScrollPosition } from '../lib/tab-scroll';
import { toast } from '../lib/toast';
import { getTreeLineCount } from '../lib/tree-metrics';
import { useShortcutLabels } from '../lib/use-shortcut-labels';
import { useWorkspaceCommand } from '../lib/use-workspace-command';
import { selectActiveTab, useStore } from '../store/use-store';
import { ShortcutHint, ShortcutKbd } from './shortcut-hint';
import { Tip } from './tip';
import { TreeNode } from './tree-node';
import { TreePathMenu, type TreePathMenuTarget } from './tree-path-menu';
import { TreeSearchBar } from './tree-search-bar';
import { useTreeSearch } from './use-tree-search';
import { VirtualTree } from './virtual-tree';

const COPY_FEEDBACK_DURATION_MS = 1500;
const LARGE_DOCUMENT_NOTICE = `大文档预览 · 按需渲染，长值仅预览前 ${LARGE_VALUE_PREVIEW_LENGTH} 字符；复制保留完整内容`;
/* ---------- 面板头部 / 各状态面板 ---------- */

const PaneHeader = ({
  title,
  notice,
  extra,
}: {
  title: string;
  notice?: string;
  extra?: ReactNode;
}) => {
  return (
    <div className="flex min-h-10 min-w-0 shrink-0 items-center gap-2 px-4 py-1 text-xs text-foreground/55">
      <Eye size={13} className="shrink-0" />
      <span className="shrink-0 whitespace-nowrap font-medium">{title}</span>
      {notice && (
        <Tip label={notice} triggerClassName="min-w-0 flex-1 text-left text-foreground/50">
          <span className="block truncate">{notice}</span>
        </Tip>
      )}
      <div className="panel-header-actions ml-auto flex shrink-0 items-center gap-0.5">{extra}</div>
    </div>
  );
};

export const TreeView = () => {
  const { getAriaShortcut, getShortcutRef } = useShortcutLabels();
  const activeTab = useStore(selectActiveTab);
  const result = activeTab.result;
  const data = result?.ok ? result.data : null;
  const stats = result?.ok ? result.stats : null;
  const { collapsed, touched, shouldWrap } = activeTab;
  const indentSize = useStore(state => state.indentSize);
  const treeTheme = useStore(state => state.treeTheme);
  const shouldShowFullLongStrings = useStore(state => state.shouldShowFullLongStrings);
  const treeSearchPosition = useStore(state => state.treeSearchPosition);
  const handleTreeSearchPositionChange = useStore(state => state.setTreeSearchPosition);
  const handleClear = useStore(state => state.clear);
  const handleToggleWrap = useStore(state => state.toggleWrap);
  const handleToggleNode = useStore(state => state.toggleCollapse);
  const handleExpandAll = useStore(state => state.expandAll);
  const handleCollapseAll = useStore(state => state.collapseAll);
  const isLargeDocument = activeTab.input.length >= LARGE_INPUT_LENGTH || isLargeResult(result);
  const [pathMenuTarget, setPathMenuTarget] = useState<TreePathMenuTarget | null>(null);
  const handleOpenPathMenu = useCallback((target: TreePathMenuTarget) => {
    setPathMenuTarget(target);
  }, []);
  const handlePathMenuOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) setPathMenuTarget(null);
  }, []);
  const treeSearch = useTreeSearch({
    tabId: activeTab.id,
    input: activeTab.input,
    data,
    collapsed,
    isLargeDocument,
  });
  const treePaneRef = useRef<HTMLElement>(null);
  const handleCloseSearch = () => {
    treeSearch.handleClose();
    treePaneRef.current?.focus({ preventScroll: true });
  };
  const handleToggleSearch = () => {
    if (treeSearch.isOpen) handleCloseSearch();
    else treeSearch.handleOpen();
  };
  useWorkspaceCommand('toggleTreeSearch', handleToggleSearch);
  // 输入去抖期间仍展示同一份解析结果，不让旧树随每次击键、Toast 或主题开关重渲染。
  const treeContent = useMemo(
    () => (
      <TreeNode
        label={null}
        value={data}
        path={[]}
        collapsed={treeSearch.effectiveCollapsed}
        touched={touched}
        shouldShowFullLongStrings={shouldShowFullLongStrings}
        onToggle={handleToggleNode}
        indent={indentSize * TREE_INDENT_PIXEL_RATIO}
        forcedOpenPaths={treeSearch.forcedOpenPaths}
        searchMatchKeys={treeSearch.searchMatchKeys}
        activeSearchKey={treeSearch.activeEntry?.key}
        searchOptions={treeSearch.searchOptions}
        onOpenPathMenu={handleOpenPathMenu}
      />
    ),
    [
      data,
      treeSearch.effectiveCollapsed,
      treeSearch.forcedOpenPaths,
      treeSearch.searchMatchKeys,
      treeSearch.activeEntry?.key,
      treeSearch.searchOptions,
      touched,
      shouldShowFullLongStrings,
      handleToggleNode,
      handleOpenPathMenu,
      indentSize,
    ],
  );
  const [isCopied, setIsCopied] = useState(false);
  const copyFeedbackTimerRef = useRef<number | null>(null);
  const treeScrollRef = useRef<HTMLDivElement>(null);
  const treeStyle = {
    '--tree-indent-size': `${indentSize * TREE_INDENT_PIXEL_RATIO}px`,
    '--tree-line-number-width': `${Math.max(3, String(getTreeLineCount(data)).length)}ch`,
  } as CSSProperties;

  useLayoutEffect(() => {
    const element = treeScrollRef.current;
    return element ? bindTreeTabScrollPosition(activeTab.id, element) : undefined;
  }, [activeTab.id, isLargeDocument]);

  useLayoutEffect(() => {
    if (isLargeDocument || !treeSearch.activeEntry) return;
    const element = treeScrollRef.current;
    const activeRow = Array.from(
      element?.querySelectorAll<HTMLElement>('[data-node-key]') ?? [],
    ).find(row => row.dataset.nodeKey === treeSearch.activeEntry?.key);
    activeRow?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [isLargeDocument, treeSearch.activeEntry, treeSearch.effectiveCollapsed]);

  useEffect(
    () => () => {
      if (copyFeedbackTimerRef.current !== null) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => setPathMenuTarget(null), [activeTab.id, data]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(serializeForCopy(data, indentSize));
      setIsCopied(true);
      toast.success('已复制到剪贴板');
      if (copyFeedbackTimerRef.current !== null) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
      copyFeedbackTimerRef.current = window.setTimeout(() => {
        setIsCopied(false);
        copyFeedbackTimerRef.current = null;
      }, COPY_FEEDBACK_DURATION_MS);
    } catch {
      /* 剪贴板不可用时静默 */
    }
  };

  const handleToggleAll = collapsed.size > 0 ? handleExpandAll : handleCollapseAll;

  if (!result?.ok || !stats) return null;

  return (
    <section
      ref={treePaneRef}
      tabIndex={-1}
      aria-label="树形预览"
      className="pane-responsive-actions relative flex h-full min-h-0 flex-col outline-none"
    >
      <PaneHeader
        title="树形预览"
        notice={isLargeDocument ? LARGE_DOCUMENT_NOTICE : undefined}
        extra={
          <>
            <Tip
              ariaKeyShortcuts={getAriaShortcut('searchTree')}
              label={<ShortcutHint shortcut="searchTree">搜索键、值或路径</ShortcutHint>}
            >
              <Button
                size="sm"
                variant="ghost"
                aria-label="搜索树节点"
                aria-keyshortcuts={getAriaShortcut('searchTree')}
                ref={element => {
                  getShortcutRef('searchTree')(element);
                }}
                aria-pressed={treeSearch.isOpen}
                onPress={handleToggleSearch}
              >
                <Search size={14} />
                <span className="pane-action-label">搜索</span>
                <ShortcutKbd shortcut="searchTree" variant="light" className="pane-action-label" />
              </Button>
            </Tip>
            <Tip label={isCopied ? '已复制' : '复制内容'}>
              <Button size="sm" variant="ghost" onPress={handleCopy}>
                <span className="relative inline-grid place-items-center">
                  <Copy
                    size={14}
                    className={`col-start-1 row-start-1 transition-all duration-200 ${!isCopied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
                  />
                  <Check
                    size={14}
                    className={`col-start-1 row-start-1 text-emerald-500 transition-all duration-200 ${isCopied ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`}
                  />
                </span>
                <span className="pane-action-label">{isCopied ? '已复制' : '复制'}</span>
              </Button>
            </Tip>
            <Tip label="清空">
              <Button size="sm" variant="ghost" onPress={handleClear}>
                <Trash2 size={14} />
                <span className="pane-action-label">清空</span>
              </Button>
            </Tip>
            <Tip
              ariaKeyShortcuts={getAriaShortcut('toggleWrap')}
              label={
                <ShortcutHint shortcut="toggleWrap">
                  {shouldWrap ? '不换行(左右滚动)' : '自动换行'}
                </ShortcutHint>
              }
            >
              <Button
                size="sm"
                variant="ghost"
                aria-keyshortcuts={getAriaShortcut('toggleWrap')}
                ref={getShortcutRef('toggleWrap')}
                onPress={handleToggleWrap}
              >
                <span className="relative inline-grid place-items-center">
                  <WrapText
                    size={14}
                    className={`col-start-1 row-start-1 transition-all duration-200 ${shouldWrap ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0'}`}
                  />
                  <ArrowLeftRight
                    size={14}
                    className={`col-start-1 row-start-1 transition-all duration-200 ${!shouldWrap ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`}
                  />
                </span>
                <span className="pane-action-label">{shouldWrap ? '换行' : '不换行'}</span>
              </Button>
            </Tip>
            <Tip
              ariaKeyShortcuts={getAriaShortcut('toggleCollapse')}
              label={
                <ShortcutHint shortcut="toggleCollapse">
                  {collapsed.size > 0 ? '展开全部' : '折叠全部'}
                </ShortcutHint>
              }
            >
              <Button
                size="sm"
                variant="ghost"
                aria-keyshortcuts={getAriaShortcut('toggleCollapse')}
                ref={getShortcutRef('toggleCollapse')}
                onPress={handleToggleAll}
              >
                <span className="relative inline-grid place-items-center">
                  <UnfoldVertical
                    size={14}
                    className={`col-start-1 row-start-1 transition-all duration-200 ${collapsed.size > 0 ? 'rotate-0 opacity-100' : 'rotate-180 opacity-0'}`}
                  />
                  <FoldVertical
                    size={14}
                    className={`col-start-1 row-start-1 transition-all duration-200 ${collapsed.size === 0 ? 'rotate-0 opacity-100' : '-rotate-180 opacity-0'}`}
                  />
                </span>
                <span className="pane-action-label">{collapsed.size > 0 ? '展开' : '折叠'}</span>
              </Button>
            </Tip>
          </>
        }
      />
      <TreeSearchBar
        anchorRef={treePaneRef}
        isOpen={treeSearch.isOpen}
        focusRequest={treeSearch.focusRequest}
        query={treeSearch.query}
        scope={treeSearch.scope}
        isCaseSensitive={treeSearch.isCaseSensitive}
        status={treeSearch.status}
        total={treeSearch.result.total}
        currentIndex={treeSearch.currentIndex}
        navigableCount={treeSearch.result.matches.length}
        position={treeSearchPosition}
        onQueryChange={treeSearch.setQuery}
        onScopeChange={treeSearch.setScope}
        onCaseSensitiveChange={treeSearch.setIsCaseSensitive}
        onPrevious={treeSearch.handlePrevious}
        onNext={treeSearch.handleNext}
        onClose={handleCloseSearch}
        onPositionChange={handleTreeSearchPositionChange}
      />
      {isLargeDocument ? (
        <VirtualTree
          key={activeTab.id}
          tabId={activeTab.id}
          data={data}
          collapsed={treeSearch.effectiveCollapsed}
          touched={touched}
          shouldWrap={shouldWrap}
          shouldShowFullLongStrings={shouldShowFullLongStrings}
          indent={indentSize * TREE_INDENT_PIXEL_RATIO}
          theme={treeTheme}
          style={treeStyle}
          onToggle={handleToggleNode}
          forcedOpenPaths={treeSearch.forcedOpenPaths}
          searchMatchKeys={treeSearch.searchMatchKeys}
          activeSearchKey={treeSearch.activeEntry?.key}
          searchOptions={treeSearch.searchOptions}
          onOpenPathMenu={handleOpenPathMenu}
        />
      ) : (
        <div
          ref={treeScrollRef}
          role="region"
          aria-label="树形预览内容"
          className={`tree-body min-h-0 flex-1 overflow-auto px-4 ${shouldWrap ? 'tree-wrap' : 'tree-nowrap'}`}
          data-tree-theme={treeTheme}
          style={treeStyle}
        >
          {treeContent}
        </div>
      )}
      <TreePathMenu target={pathMenuTarget} onOpenChange={handlePathMenuOpenChange} />
    </section>
  );
};

export const EmptyPane = ({ hint }: { hint: string }) => {
  return (
    <section aria-label="树形预览" className="flex h-full min-h-0 flex-col">
      <PaneHeader title="树形预览" />
      <div className="grid flex-1 place-items-center">
        <div className="flex flex-col items-center gap-2 text-foreground/35">
          <Eye size={22} />
          <p className="text-xs">{hint}</p>
        </div>
      </div>
    </section>
  );
};

export const ErrorPane = ({
  message,
  line,
  column,
}: {
  message: string;
  line?: number;
  column?: number;
}) => {
  return (
    <section aria-label="树形预览" className="flex h-full min-h-0 flex-col">
      <PaneHeader title="树形预览" />
      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-xl bg-red-500/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-red-500">
            <OctagonAlert size={15} />
            解析失败
          </div>
          <p className="code-text-style mt-2 break-all font-mono text-xs leading-5 text-red-500/90">
            {message}
          </p>
          {line !== undefined && column !== undefined && (
            <p className="mt-2 text-xs text-foreground/60">
              位置：第 {line} 行 · 第 {column} 列
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
