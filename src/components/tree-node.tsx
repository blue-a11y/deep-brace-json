import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Braces, ChevronRight } from 'lucide-react';
import { LARGE_VALUE_PREVIEW_LENGTH, TREE_PREVIEW_DEPTH } from '../lib/large-document';
import { isStrictJson, pathKey, type NodePath } from '../lib/parse';
import { getTreeLineCount } from '../lib/tree-metrics';
import { getTreeEntries } from '../lib/tree-rows';
import { useStore } from '../store/use-store';
import { Tip } from './tip';
import { TreeActionButton } from './tree-action-button';
import { TreeCopyButton } from './tree-copy-button';

const PUNCTUATION_CLASS_NAME = 'tree-token-punctuation';
/** 行内文本 token 的点击不冒泡到行容器:单击/双击选中复制都不应触发展开状态切换 */
const handleTokenClick = (event: MouseEvent<HTMLSpanElement>) => {
  event.stopPropagation();
};

/* ---------- 叶子值：类型语义色 ---------- */

const LeafValue = ({
  value,
  shouldShowFullLongStrings,
  isLargeDocument = false,
}: {
  value: unknown;
  shouldShowFullLongStrings: boolean;
  isLargeDocument?: boolean;
}) => {
  if (value === null) {
    return <span className="tree-token-null italic">null</span>;
  }
  switch (typeof value) {
    case 'string': {
      const stringValue = value as string;
      if (isLargeDocument && stringValue.length > LARGE_VALUE_PREVIEW_LENGTH) {
        return (
          <span
            className="tree-token-string break-all"
            title="大文档仅预览前 500 字符；编辑器与复制保留完整内容"
          >
            {JSON.stringify(stringValue.slice(0, LARGE_VALUE_PREVIEW_LENGTH))}…（共{' '}
            {stringValue.length} 字符）
          </span>
        );
      }
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

const KeyLabel = ({
  label,
  isLargeDocument = false,
}: {
  label: string;
  isLargeDocument?: boolean;
}) => {
  const displayed =
    isLargeDocument && label.length > LARGE_VALUE_PREVIEW_LENGTH
      ? `${label.slice(0, LARGE_VALUE_PREVIEW_LENGTH)}…`
      : label;
  return <span className="tree-token-key shrink-0">"{displayed}"</span>;
};

/** 数组条目索引:JSON 数组无键名,以弱化索引标记位置(0 基,与 JS 语义一致);冒号属结构标点,不在文本保护区内 */
const ArrayIndexLabel = ({ index }: { index: number }) => {
  return (
    <>
      <span className="contents" onClick={handleTokenClick}>
        <span className="tree-token-index shrink-0 tabular-nums">{index}</span>
      </span>
      <span className={`shrink-0 ${PUNCTUATION_CLASS_NAME}`}>:</span>
    </>
  );
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
  /** 数组条目的下标(对象条目与根节点不传),用于行首索引展示 */
  arrayIndex?: number;
  /** 本条目之后还有兄弟条目时显示尾逗号 */
  hasTrailingComma?: boolean;
  onToggle: (key: string) => void;
  /** 嵌套深度(根 = 0),用于行盒外扩为整行 */
  depth?: number;
  /** 每层内容缩进像素值,与 tree-body 的 --tree-indent-size 同源 */
  indent?: number;
  isVirtualRow?: boolean;
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
    paddingLeft: `calc(var(--tree-gutter-width) + ${shift}px)`,
  };
};

export const TreeNode = ({
  label,
  value,
  path,
  collapsed,
  touched,
  shouldShowFullLongStrings,
  arrayIndex,
  hasTrailingComma,
  onToggle,
  depth = 0,
  indent = 4,
  isVirtualRow = false,
}: TreeNodeProps): ReactNode => {
  const isArray = Array.isArray(value);
  const isObject = !isArray && value !== null && typeof value === 'object';
  const entries = getTreeEntries(value);
  const rowStyle = isVirtualRow
    ? { paddingLeft: `calc(var(--tree-gutter-width) + ${depth * (20 + indent)}px)` }
    : fullRowStyle(depth, indent);

  if (!isArray && !isObject) {
    const embeddedJsonTitle =
      label ??
      (typeof path.at(-1) === 'number' ? `数组项 ${Number(path.at(-1)) + 1}` : '嵌套 JSON');
    const canParse =
      typeof value === 'string' &&
      (!isVirtualRow || value.length <= LARGE_VALUE_PREVIEW_LENGTH) &&
      isStrictJson(value);
    return (
      <div
        style={rowStyle}
        className="tree-line group flex items-baseline gap-1.5 rounded px-0.5 font-mono text-[13px] leading-6 hover:bg-foreground/5"
      >
        <span className="w-4 shrink-0" />
        {label !== null && (
          <>
            <span className="contents" onClick={handleTokenClick}>
              <KeyLabel label={label} isLargeDocument={isVirtualRow} />
            </span>
            <span className={`shrink-0 ${PUNCTUATION_CLASS_NAME}`}>:</span>
          </>
        )}
        {arrayIndex !== undefined && <ArrayIndexLabel index={arrayIndex} />}
        {canParse && <ParseStringButton value={value} title={embeddedJsonTitle} />}
        <LeafValue
          value={value}
          shouldShowFullLongStrings={shouldShowFullLongStrings}
          isLargeDocument={isVirtualRow}
        />
        {hasTrailingComma && <Comma />}
        <TreeCopyButton value={value} />
      </div>
    );
  }

  const openingBracket = isArray ? '[' : '{';
  const closingBracket = isArray ? ']' : '}';

  if (entries.length === 0) {
    return (
      <div
        style={rowStyle}
        className="tree-line flex items-baseline gap-1.5 px-0.5 font-mono text-[13px] leading-6"
      >
        <span className="w-4 shrink-0" />
        {label !== null && (
          <>
            <span className="contents" onClick={handleTokenClick}>
              <KeyLabel label={label} isLargeDocument={isVirtualRow} />
            </span>
            <span className={PUNCTUATION_CLASS_NAME}>:</span>
          </>
        )}
        {arrayIndex !== undefined && <ArrayIndexLabel index={arrayIndex} />}
        <span className={PUNCTUATION_CLASS_NAME}>
          {openingBracket}
          {closingBracket}
        </span>
        {hasTrailingComma && <Comma />}
      </div>
    );
  }

  const nodeKey = pathKey(path);
  const isDepthLimited = isVirtualRow && depth >= TREE_PREVIEW_DEPTH;
  const isOpen = !collapsed.has(nodeKey) && !isDepthLimited;
  const lineCount = getTreeLineCount(value);
  const summary = isArray
    ? `${entries.length} 项`
    : `{ ${entries
        .slice(0, 3)
        .map(([entryKey]) =>
          isVirtualRow ? String(entryKey).slice(0, LARGE_VALUE_PREVIEW_LENGTH) : entryKey,
        )
        .join(', ')}${entries.length > 3 ? ', …' : ''} }`;

  const handleToggleRow = (event: MouseEvent<HTMLDivElement>) => {
    if (isDepthLimited) return;
    // 多击选词复制:偶数次点击撤销首次翻转,净展开状态不变
    if (event.detail > 1) {
      if (event.detail % 2 === 0) onToggle(nodeKey);
      return;
    }
    // 拖选文本时的 click 不是折叠意图
    if (window.getSelection()?.toString()) return;
    onToggle(nodeKey);
  };

  // 折叠箭头不是文本,点击即为明确的切换意图,不受选区守卫影响
  const handleToggleChevron = (event: MouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    if (!isDepthLimited) onToggle(nodeKey);
  };

  return (
    <div className="font-mono text-[13px] leading-6">
      <div
        style={rowStyle}
        className="tree-line tree-line--toggle group flex items-baseline gap-1.5 rounded px-0.5 hover:bg-foreground/5"
        onClick={handleToggleRow}
      >
        {/* 箭头绝对定位固定在根节点箭头列(不随缩进漂移),行内 w-4 占位维持内容对齐 */}
        <span
          className="tree-chevron grid size-4 self-center place-items-center text-foreground/40"
          onClick={handleToggleChevron}
          role={isVirtualRow ? 'button' : undefined}
          tabIndex={isVirtualRow && !isDepthLimited ? 0 : undefined}
          aria-expanded={isVirtualRow ? isOpen : undefined}
          aria-disabled={isDepthLimited || undefined}
          aria-label={
            isVirtualRow ? `${isOpen ? '折叠' : '展开'}节点 ${nodeKey.slice(0, 200)}` : undefined
          }
          title={isDepthLimited ? '更深层级请在编辑器查看；复制保留完整内容' : undefined}
          onKeyDown={
            isVirtualRow
              ? event => {
                  if (!isDepthLimited && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggle(nodeKey);
                  }
                }
              : undefined
          }
        >
          <ChevronRight
            size={12}
            className={`transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
          />
        </span>
        <span className="w-4 shrink-0" />
        {label !== null && (
          <>
            <span className="contents" onClick={handleTokenClick}>
              <KeyLabel label={label} isLargeDocument={isVirtualRow} />
            </span>
            <span className={PUNCTUATION_CLASS_NAME}>:</span>
          </>
        )}
        {arrayIndex !== undefined && <ArrayIndexLabel index={arrayIndex} />}
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
      {!isVirtualRow && !isOpen && !touched.has(nodeKey) && (
        <span
          className="tree-line-holder"
          style={{ counterIncrement: `treeline ${lineCount - 1}` }}
        />
      )}
      {/* 展开过的子树保留 DOM 由 grid 0fr→1fr 做折叠动画;从未展开的保持懒渲染 */}
      {!isVirtualRow && (isOpen || touched.has(nodeKey)) && (
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
              arrayIndex={isArray ? index : undefined}
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
