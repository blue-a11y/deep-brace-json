import {
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
  Braces,
  Check,
  ChevronRight,
  Copy,
  Eye,
  FoldVertical,
  OctagonAlert,
  Trash2,
  UnfoldVertical,
  WrapText,
} from 'lucide-react';
import { serializeForCopy, TREE_INDENT_PIXEL_RATIO } from '../lib/indent';
import { isStrictJson, pathKey, type NodePath } from '../lib/parse';
import { getAriaShortcut } from '../lib/shortcuts';
import { bindTreeTabScrollPosition } from '../lib/tab-scroll';
import { toast } from '../lib/toast';
import { selectActiveTab, useStore } from '../store/use-store';
import { ShortcutHint } from './shortcut-hint';
import { Tip } from './tip';
import { TreeActionButton } from './tree-action-button';
import { TreeCopyButton } from './tree-copy-button';

const COPY_FEEDBACK_DURATION_MS = 1500;
const PUNCTUATION_CLASS_NAME = 'tree-token-punctuation';

/* ---------- 叶子值：类型语义色 ---------- */

const LeafValue = ({
  value,
  shouldShowFullLongStrings,
}: {
  value: unknown;
  shouldShowFullLongStrings: boolean;
}) => {
  if (value === null) {
    return <span className="tree-token-null italic">null</span>;
  }
  switch (typeof value) {
    case 'string': {
      const stringValue = value as string;
      // 转义显示：内嵌引号、换行等以 JSON 形式可见
      const escapedString = JSON.stringify(stringValue).slice(1, -1);
      const isLong = escapedString.length > 120;
      const displayedString =
        shouldShowFullLongStrings || !isLong ? escapedString : `${escapedString.slice(0, 120)}…`;
      const renderedValue = (
        <span className="tree-token-string break-all">"{displayedString}"</span>
      );
      if (shouldShowFullLongStrings || !isLong) return renderedValue;
      return (
        <Tip
          label={
            <span className="-mr-2 block max-h-[min(50dvh,24rem)] max-w-md overflow-y-auto overscroll-contain break-all pr-px text-justify [text-justify:inter-character]">
              {escapedString}
            </span>
          }
        >
          {renderedValue}
        </Tip>
      );
    }
    case 'number':
      return <span className="tree-token-number">{String(value)}</span>;
    case 'boolean':
      return <span className="tree-token-boolean">{String(value)}</span>;
    default:
      return <span className="text-foreground/60">{String(value)}</span>;
  }
};

/* ---------- key 标签：属性名 / 数组索引 ---------- */

const KeyLabel = ({ label }: { label: string }) => {
  return <span className="tree-token-key shrink-0">"{label}"</span>;
};

/** 尾逗号(非末位条目),呈现 JSON 文本形态 */
const Comma = () => <span className={PUNCTUATION_CLASS_NAME}>,</span>;

type ParseStringButtonProps = {
  value: string;
  title: string;
};

const ParseStringButton = ({ value, title }: ParseStringButtonProps) => {
  const handleParse = () => useStore.getState().openTab(value, title);

  return (
    <TreeActionButton onClick={handleParse}>
      Parse
      <Braces size={10} />
    </TreeActionButton>
  );
};

/* ---------- 树节点（递归） ---------- */

type TreeNodeProps = {
  label: string | null;
  value: unknown;
  path: NodePath;
  collapsed: Set<string>;
  touched: Set<string>;
  shouldShowFullLongStrings: boolean;
  /** 本条目之后还有兄弟条目时显示尾逗号 */
  hasTrailingComma?: boolean;
  onToggle: (key: string) => void;
  /** 嵌套深度(根 = 0),用于行盒外扩为整行 */
  depth?: number;
  /** 每层内容缩进像素值,与 tree-body 的 --tree-indent-size 同源 */
  indent?: number;
};

/** 行盒外扩为整行:负 margin 抵消 depth 层缩进、padding 原位补回内容位置,hover 背景即整行。
    每层缩进 = ml7 + pl12 + 竖线边框1 + 内容缩进;
    闭合括号行位于 tree-children-inner 内、未穿过内容缩进,比内容行少补一个 indent。
    像素值在 JS 侧算好,内联样式只保留最简 calc,避免跨内核兼容差异。 */
const fullRowStyle = (
  depth: number,
  indentPx: number,
  isClosingRow = false,
): CSSProperties | undefined => {
  if (depth === 0) return undefined;
  const shift = depth * (20 + indentPx) - (isClosingRow ? indentPx : 0);
  return {
    marginLeft: `${-shift}px`,
    paddingLeft: `calc(3.5ch + ${shift}px)`,
  };
};

export const TreeNode = ({
  label,
  value,
  path,
  collapsed,
  touched,
  shouldShowFullLongStrings,
  hasTrailingComma,
  onToggle,
  depth = 0,
  indent = 4,
}: TreeNodeProps): ReactNode => {
  const isArray = Array.isArray(value);
  const isObject = !isArray && value !== null && typeof value === 'object';

  if (!isArray && !isObject) {
    const embeddedJsonTitle =
      label ??
      (typeof path.at(-1) === 'number' ? `数组项 ${Number(path.at(-1)) + 1}` : '嵌套 JSON');
    const canParse = typeof value === 'string' && isStrictJson(value);
    return (
      <div
        style={fullRowStyle(depth, indent)}
        className="tree-line group flex items-baseline gap-1.5 rounded px-0.5 font-mono text-[13px] leading-6 hover:bg-foreground/5"
      >
        <span className="w-4 shrink-0" />
        {label !== null && (
          <>
            <KeyLabel label={label} />
            <span className={`shrink-0 ${PUNCTUATION_CLASS_NAME}`}>:</span>
          </>
        )}
        {canParse && <ParseStringButton value={value} title={embeddedJsonTitle} />}
        <LeafValue value={value} shouldShowFullLongStrings={shouldShowFullLongStrings} />
        {hasTrailingComma && <Comma />}
        <TreeCopyButton value={value} />
      </div>
    );
  }

  const entries: [string | number, unknown][] = isArray
    ? (value as unknown[]).map((item, index) => [index, item])
    : Object.entries(value as Record<string, unknown>);
  const openingBracket = isArray ? '[' : '{';
  const closingBracket = isArray ? ']' : '}';

  if (entries.length === 0) {
    return (
      <div
        style={fullRowStyle(depth, indent)}
        className="tree-line flex items-baseline gap-1.5 px-0.5 font-mono text-[13px] leading-6"
      >
        <span className="w-4 shrink-0" />
        {label !== null && (
          <>
            <KeyLabel label={label} />
            <span className={PUNCTUATION_CLASS_NAME}>:</span>
          </>
        )}
        <span className={PUNCTUATION_CLASS_NAME}>
          {openingBracket}
          {closingBracket}
        </span>
        {hasTrailingComma && <Comma />}
      </div>
    );
  }

  const nodeKey = pathKey(path);
  const isOpen = !collapsed.has(nodeKey);
  const lineCount = useMemo(() => countLines(value), [value]);
  const summary = isArray
    ? `${entries.length} 项`
    : `{ ${entries
        .slice(0, 3)
        .map(([entryKey]) => entryKey)
        .join(', ')}${entries.length > 3 ? ', …' : ''} }`;

  const handleToggleRow = () => {
    // 拖选文本时的 click 不是折叠意图
    if (window.getSelection()?.toString()) return;
    onToggle(nodeKey);
  };

  return (
    <div className="font-mono text-[13px] leading-6">
      <div
        style={fullRowStyle(depth, indent)}
        className="tree-line tree-line--toggle group flex items-baseline gap-1.5 rounded px-0.5 hover:bg-foreground/5"
        onClick={handleToggleRow}
      >
        {/* 箭头绝对定位固定在根节点箭头列(不随缩进漂移),行内 w-4 占位维持内容对齐 */}
        <span className="tree-chevron grid size-4 self-center place-items-center text-foreground/40">
          <ChevronRight
            size={12}
            className={`transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
          />
        </span>
        <span className="w-4 shrink-0" />
        {label !== null && (
          <>
            <KeyLabel label={label} />
            <span className={PUNCTUATION_CLASS_NAME}>:</span>
          </>
        )}
        <span className={PUNCTUATION_CLASS_NAME}>{openingBracket}</span>
        {!isOpen && (
          <>
            <span className="truncate text-left text-foreground/45">{summary}</span>
            <span className={PUNCTUATION_CLASS_NAME}>{closingBracket}</span>
            {hasTrailingComma && <Comma />}
          </>
        )}
        <TreeCopyButton value={value} />
      </div>
      {/* 未挂载的折叠子树:counter 占位补足行数,保证其后行号与展开时一致 */}
      {!isOpen && !touched.has(nodeKey) && (
        <span
          className="tree-line-holder"
          style={{ counterIncrement: `treeline ${lineCount - 1}` }}
        />
      )}
      {/* 展开过的子树保留 DOM 由 grid 0fr→1fr 做折叠动画;从未展开的保持懒渲染 */}
      {(isOpen || touched.has(nodeKey)) && (
        <TreeChildren
          isOpen={isOpen}
          hasTrailingComma={hasTrailingComma}
          closingBracket={closingBracket}
          depth={depth + 1}
          indent={indent}
        >
          {entries.map(([entryKey, entryValue], index) => (
            <TreeNode
              key={String(entryKey)}
              label={isArray ? null : String(entryKey)}
              value={entryValue}
              path={[...path, entryKey]}
              collapsed={collapsed}
              touched={touched}
              shouldShowFullLongStrings={shouldShowFullLongStrings}
              hasTrailingComma={index < entries.length - 1}
              onToggle={onToggle}
              depth={depth + 1}
              indent={indent}
            />
          ))}
        </TreeChildren>
      )}
    </div>
  );
};

/* ---------- 子树行数(用于折叠占位补号) ---------- */

/** 该值展开后占的行数:容器=头+子孙+闭合,叶子=1,空容器=1 */
function countLines(value: unknown): number {
  if (Array.isArray(value)) {
    return value.length === 0
      ? 1
      : 2 + value.reduce<number>((total, item) => total + countLines(item), 0);
  }
  if (value && typeof value === 'object') {
    const values = Object.values(value as Record<string, unknown>);
    return values.length === 0
      ? 1
      : 2 + values.reduce<number>((total, item) => total + countLines(item), 0);
  }
  return 1;
}

/* ---------- 子树容器:展开/收起动画 ---------- */

const TreeChildren = ({
  isOpen,
  hasTrailingComma,
  closingBracket,
  depth,
  indent,
  children,
}: {
  isOpen: boolean;
  hasTrailingComma?: boolean;
  closingBracket: string;
  depth: number;
  indent: number;
  children: ReactNode;
}) => {
  // 首次挂载直接呈现最终状态；保留 DOM 后的开闭变化继续使用 grid 过渡。
  const [hasEntered, setHasEntered] = useState(isOpen);
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    const animationFrame = requestAnimationFrame(() => setHasEntered(isOpen));
    return () => cancelAnimationFrame(animationFrame);
  }, [isOpen]);
  // 收起后保留 DOM(grid 0fr):行继续占 counter,后续行号保持原号不重排
  return (
    <div className="tree-children ml-[7px] pl-3" data-expanded={isOpen} data-open={hasEntered}>
      <div className="tree-children-inner border-l border-transparent">
        <div className="tree-children-content">{children}</div>
        <div
          style={fullRowStyle(depth, indent, true)}
          className={`tree-line ${PUNCTUATION_CLASS_NAME} rounded px-0.5 hover:bg-foreground/5`}
        >
          {closingBracket}
          {hasTrailingComma && <Comma />}
        </div>
      </div>
    </div>
  );
};

/* ---------- 面板头部 / 各状态面板 ---------- */

const PaneHeader = ({ title, extra }: { title: string; extra?: ReactNode }) => {
  return (
    <div className="flex min-h-10 shrink-0 items-center gap-2 px-4 py-1 text-xs text-foreground/55">
      <Eye size={13} />
      <span className="font-medium">{title}</span>
      <div className="panel-header-actions ml-auto flex items-center gap-0.5">{extra}</div>
    </div>
  );
};

export const TreeView = () => {
  const activeTab = useStore(selectActiveTab);
  const result = activeTab.result;
  const data = result?.ok ? result.data : null;
  const stats = result?.ok ? result.stats : null;
  const { collapsed, touched, shouldWrap } = activeTab;
  const indentSize = useStore(state => state.indentSize);
  const treeTheme = useStore(state => state.treeTheme);
  const shouldShowFullLongStrings = useStore(state => state.shouldShowFullLongStrings);
  const handleClear = useStore(state => state.clear);
  const handleToggleWrap = useStore(state => state.toggleWrap);
  const handleToggleNode = useStore(state => state.toggleCollapse);
  const handleExpandAll = useStore(state => state.expandAll);
  const handleCollapseAll = useStore(state => state.collapseAll);
  const [isCopied, setIsCopied] = useState(false);
  const copyFeedbackTimerRef = useRef<number | null>(null);
  const treeScrollRef = useRef<HTMLDivElement>(null);
  const treeStyle = {
    '--tree-indent-size': `${indentSize * TREE_INDENT_PIXEL_RATIO}px`,
  } as CSSProperties;

  useLayoutEffect(() => {
    const element = treeScrollRef.current;
    return element ? bindTreeTabScrollPosition(activeTab.id, element) : undefined;
  }, [activeTab.id]);

  useEffect(
    () => () => {
      if (copyFeedbackTimerRef.current !== null) {
        window.clearTimeout(copyFeedbackTimerRef.current);
      }
    },
    [],
  );

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
    <section aria-label="树形预览" className="pane-responsive-actions flex h-full min-h-0 flex-col">
      <PaneHeader
        title="树形预览"
        extra={
          <>
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
      <div
        ref={treeScrollRef}
        role="region"
        aria-label="树形预览内容"
        className={`tree-body min-h-0 flex-1 overflow-auto px-4 ${shouldWrap ? 'tree-wrap' : 'tree-nowrap'}`}
        data-tree-theme={treeTheme}
        style={treeStyle}
      >
        <TreeNode
          label={null}
          value={data}
          path={[]}
          collapsed={collapsed}
          touched={touched}
          shouldShowFullLongStrings={shouldShowFullLongStrings}
          onToggle={handleToggleNode}
          indent={indentSize * TREE_INDENT_PIXEL_RATIO}
        />
      </div>
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
          <p className="mt-2 break-all font-mono text-xs leading-5 text-red-500/90">{message}</p>
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
