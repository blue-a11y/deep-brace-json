import { useCallback, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LARGE_VALUE_PREVIEW_LENGTH } from '../lib/large-document';
import { bindVirtualTreeTabScrollPosition } from '../lib/tab-scroll';
import { buildTreeRows, findTreeRowIndex } from '../lib/tree-rows';
import { useStore } from '../store/use-store';
import { TreeNode } from './tree-node';

type VirtualTreeProps = {
  tabId: string;
  data: unknown;
  collapsed: Set<string>;
  touched: Set<string>;
  shouldWrap: boolean;
  shouldShowFullLongStrings: boolean;
  indent: number;
  theme: string;
  style: CSSProperties;
  onToggle: (key: string) => void;
};

export const VirtualTree = ({
  tabId,
  data,
  collapsed,
  touched,
  shouldWrap,
  shouldShowFullLongStrings,
  indent,
  theme,
  style,
  onToggle,
}: VirtualTreeProps) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const bindingRef = useRef<ReturnType<typeof bindVirtualTreeTabScrollPosition> | null>(null);
  const shouldStickToEndRef = useRef(false);
  const endFrameRef = useRef<number | null>(null);
  const codeFont = useStore(state => state.codeFont);
  const rows = useMemo(() => buildTreeRows(data, collapsed), [data, collapsed]);
  const indices = useMemo(() => new Map(rows.map((row, index) => [row.key, index])), [rows]);
  const getItemKey = useCallback((index: number) => rows[index].key, [rows]);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => elementRef.current,
    estimateSize: () => 24,
    getItemKey,
    overscan: 8,
    anchorTo: 'end',
    // 动态测量和锚点恢复会在 layout effect 中通知；交由 React 批量更新，避免嵌套 flushSync。
    useFlushSync: false,
    // 滚动尺寸和位移由库同步更新，避免 React 批处理期间旧滚动高度截断末尾定位。
    directDomUpdates: true,
    onChange: () => {
      // 最后一条长行可能在 End 后才完成测量；直到用户再次操作，保持末尾意图。
      if (!shouldStickToEndRef.current || endFrameRef.current !== null) return;
      endFrameRef.current = requestAnimationFrame(() => {
        endFrameRef.current = null;
        if (shouldStickToEndRef.current) bindingRef.current?.scrollToEdge('end');
      });
    },
  });
  // 不换行时为完整逻辑列表保留宽度，避免横向滚动范围随纵向视口收缩。
  const contentWidth = useMemo(() => {
    if (shouldWrap) return undefined;
    let width = 0;
    for (const row of rows) {
      const valueLength =
        typeof row.value === 'string'
          ? JSON.stringify(row.value.slice(0, LARGE_VALUE_PREVIEW_LENGTH)).length + 24
          : 32;
      const characters = Math.min(row.label?.length ?? 0, LARGE_VALUE_PREVIEW_LENGTH) + valueLength;
      width = Math.max(width, row.depth * (20 + indent) + characters * 9 + 100);
    }
    return `max(100%, ${width}px)`;
  }, [rows, shouldWrap, indent]);
  const currentRef = useRef({ rows, indices, virtualizer });
  const pendingAnchorRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    currentRef.current = { rows, indices, virtualizer };
  }, [rows, indices, virtualizer]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const binding = bindVirtualTreeTabScrollPosition(tabId, {
      element,
      restoreTimeoutMs: 5000,
      isLayoutReady: () =>
        !pendingAnchorRef.current ||
        currentRef.current.virtualizer.itemSizeCache.has(pendingAnchorRef.current) ||
        currentRef.current.virtualizer.elementsCache.has(pendingAnchorRef.current),
      readAnchor: () => {
        const current = currentRef.current;
        const viewportTop = element.getBoundingClientRect().top;
        const visibleElement = Array.from(
          element.querySelectorAll<HTMLElement>('.virtual-tree-row'),
        ).find(row => {
          const rect = row.getBoundingClientRect();
          return rect.bottom > viewportTop + 0.5 && rect.top < viewportTop + element.clientHeight;
        });
        if (visibleElement) {
          const row = current.rows[Number(visibleElement.dataset.index)];
          return {
            kind: 'tree',
            nodeKey: row.key,
            value: row.lineNumber - 1,
            viewportOffset: visibleElement.getBoundingClientRect().top - viewportTop,
          };
        }
        const item = current.virtualizer.getVirtualItemForOffset(element.scrollTop);
        const row = item && current.rows[item.index];
        return item && row
          ? {
              kind: 'tree',
              nodeKey: row.key,
              value: row.lineNumber - 1,
              viewportOffset: item.start - element.scrollTop,
            }
          : undefined;
      },
      resolveAnchorTop: anchor => {
        if (anchor.kind !== 'tree') return null;
        const current = currentRef.current;
        const index =
          (anchor.nodeKey ? current.indices.get(anchor.nodeKey) : undefined) ??
          findTreeRowIndex(current.rows, anchor.value + 1);
        // 刷新后尺寸缓存为空。先让锚点行进入视口并测量，再恢复行内偏移；
        // 否则一条跨屏长行的偏移会跳过它，永远无法得到真实高度。
        current.virtualizer.getVirtualItems();
        const item = current.virtualizer.measurementsCache[index];
        if (!item) return null;
        pendingAnchorRef.current = current.rows[index].key;
        return current.virtualizer.itemSizeCache.has(item.key) ||
          current.virtualizer.elementsCache.has(item.key)
          ? item.start + anchor.viewportOffset - Math.max(anchor.viewportOffset, 1 - item.size)
          : item.start + anchor.viewportOffset;
      },
    });
    bindingRef.current = binding;
    return () => {
      if (endFrameRef.current !== null) cancelAnimationFrame(endFrameRef.current);
      endFrameRef.current = null;
      binding();
      bindingRef.current = null;
    };
  }, [tabId]);

  const measurementConfig = `${shouldWrap}:${codeFont}:${indent}:${shouldShowFullLongStrings}`;
  const previousMeasurementConfigRef = useRef(measurementConfig);
  useLayoutEffect(() => {
    if (previousMeasurementConfigRef.current === measurementConfig) return;
    previousMeasurementConfigRef.current = measurementConfig;
    virtualizer.measure();
    for (const element of virtualizer.elementsCache.values()) virtualizer.measureElement(element);
    bindingRef.current?.refresh();
  }, [virtualizer, measurementConfig]);
  useLayoutEffect(() => bindingRef.current?.refresh(), [rows]);
  // 虚拟尺寸通知与 DOM 提交不是同一时刻；提交后保存真实行位置，避免缓存领先 DOM。
  useLayoutEffect(() => bindingRef.current?.save());

  return (
    <div
      ref={elementRef}
      role="region"
      aria-label="树形预览内容"
      tabIndex={0}
      onWheel={() => {
        shouldStickToEndRef.current = false;
      }}
      onTouchStart={() => {
        shouldStickToEndRef.current = false;
      }}
      onPointerDown={() => {
        shouldStickToEndRef.current = false;
      }}
      onKeyDown={event => {
        shouldStickToEndRef.current = event.key === 'End' && event.target === event.currentTarget;
        if (event.target !== event.currentTarget) return;
        if (event.key === 'End' || event.key === 'Home') {
          event.preventDefault();
          pendingAnchorRef.current = null;
          bindingRef.current?.scrollToEdge(event.key === 'End' ? 'end' : 'start');
        }
      }}
      className={`tree-body tree-virtual min-h-0 flex-1 overflow-auto px-4 ${shouldWrap ? 'tree-wrap' : 'tree-nowrap'}`}
      data-tree-theme={theme}
      style={style}
    >
      <div ref={virtualizer.containerRef} style={{ position: 'relative', width: contentWidth }}>
        {virtualizer.getVirtualItems().map(item => {
          const row = rows[item.index];
          return (
            <div
              key={item.key}
              ref={virtualizer.measureElement}
              data-index={item.index}
              data-node-key={row.key}
              data-line-number={row.lineNumber}
              className="virtual-tree-row absolute left-0 top-0 w-full font-mono text-[13px] leading-6"
            >
              {row.depth > 0 && (
                <span
                  aria-hidden="true"
                  className="virtual-tree-guides"
                  style={{
                    width: row.depth * (20 + indent),
                    backgroundSize: `${20 + indent}px 100%`,
                  }}
                />
              )}
              {row.isClosing ? (
                <div
                  className="tree-line tree-token-punctuation rounded hover:bg-foreground/5"
                  style={{
                    paddingLeft: `calc(var(--tree-gutter-width) + ${(row.depth + 1) * (20 + indent) - indent}px)`,
                  }}
                >
                  {Array.isArray(row.value) ? ']' : '}'}
                  {row.hasTrailingComma && ','}
                </div>
              ) : (
                <TreeNode
                  label={row.label}
                  value={row.value}
                  path={row.path}
                  arrayIndex={row.arrayIndex}
                  depth={row.depth}
                  hasTrailingComma={row.hasTrailingComma}
                  collapsed={collapsed}
                  touched={touched}
                  onToggle={onToggle}
                  shouldShowFullLongStrings={shouldShowFullLongStrings}
                  indent={indent}
                  isVirtualRow
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
