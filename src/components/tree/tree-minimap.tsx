import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import {
  getMinimapContentHeight,
  getMinimapScrollTop,
  getMinimapViewport,
} from '../../lib/tree/tree-minimap-geometry';
import { getMinimapTokens, type MinimapTokenKind } from '../../lib/tree/tree-minimap-text';
import type { TreeRow } from '../../lib/tree/tree-rows';

type TreeMinimapProps = {
  rows: TreeRow[];
  scrollRef: RefObject<HTMLDivElement | null>;
  paletteKey: string;
  onNavigateStart: () => void;
  getRowOffset?: (index: number) => number;
};

type MinimapColors = Record<MinimapTokenKind, string>;

const drawRow = (
  context: CanvasRenderingContext2D,
  row: TreeRow,
  nextRow: TreeRow | undefined,
  y: number,
  width: number,
  colors: MinimapColors,
) => {
  let position = Math.min(width * 0.45, 4 + row.depth * 3);
  for (const token of getMinimapTokens(row, nextRow)) {
    if (position >= width - 2) break;
    context.fillStyle = colors[token.kind];
    context.fillText(token.text, position, y);
    position += context.measureText(token.text).width;
  }
};

export const TreeMinimap = ({
  rows,
  scrollRef,
  paletteKey,
  onNavigateStart,
  getRowOffset,
}: TreeMinimapProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<number | null>(null);
  const [isScrollable, setIsScrollable] = useState(false);
  const [progress, setProgress] = useState(0);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    const track = trackRef.current;
    const canvas = canvasRef.current;
    const viewportElement = viewportRef.current;
    if (!element || !track || !canvas || !viewportElement) return;

    const syncViewport = () => {
      const contentHeight = getMinimapContentHeight(track.clientHeight, element.scrollHeight);
      const viewport = getMinimapViewport(
        element.scrollTop,
        element.clientHeight,
        element.scrollHeight,
        contentHeight,
      );
      const visible = viewport.maxScroll > 1 && track.clientHeight > 0;
      setIsScrollable(previous => (previous === visible ? previous : visible));
      viewportElement.style.height = `${viewport.height}px`;
      viewportElement.style.transform = `translateY(${viewport.top}px)`;
      const nextProgress = visible ? Math.round((element.scrollTop / viewport.maxScroll) * 100) : 0;
      setProgress(previous => (previous === nextProgress ? previous : nextProgress));
    };

    const draw = () => {
      const width = track.clientWidth;
      const height = track.clientHeight;
      if (width === 0 || height === 0) return;
      const contentHeight = getMinimapContentHeight(height, element.scrollHeight);
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.font = '500 3.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      context.textBaseline = 'top';
      const style = getComputedStyle(element);
      const colors = {
        key: style.getPropertyValue('--tree-token-key'),
        string: style.getPropertyValue('--tree-token-string'),
        number: style.getPropertyValue('--tree-token-number'),
        boolean: style.getPropertyValue('--tree-token-boolean'),
        null: style.getPropertyValue('--tree-token-null'),
        punctuation: style.getPropertyValue('--tree-token-punctuation'),
      };
      const visibleLines = getRowOffset
        ? null
        : Array.from(element.querySelectorAll<HTMLElement>('.tree-line')).filter(
            line => !line.closest('.tree-children:not([data-open="true"])'),
          );
      const canUseDomOffsets = visibleLines?.length === rows.length;
      const elementTop = element.getBoundingClientRect().top;
      const scrollHeight = Math.max(1, element.scrollHeight);
      const stride = Math.max(1, Math.ceil(rows.length / Math.max(1, contentHeight / 4)));
      context.globalAlpha = 0.95;
      for (let index = 0; index < rows.length; index += stride) {
        // 避免固定间隔恰好只命中每条记录的同一种行（例如全是闭合括号）。
        const sampleIndex = Math.min(rows.length - 1, index + ((index / stride) % stride));
        const offset = getRowOffset
          ? getRowOffset(sampleIndex)
          : canUseDomOffsets
            ? visibleLines[sampleIndex].getBoundingClientRect().top - elementTop + element.scrollTop
            : (sampleIndex / rows.length) * scrollHeight;
        const y = Math.min(contentHeight - 4, Math.max(0, (offset / scrollHeight) * contentHeight));
        drawRow(context, rows[sampleIndex], rows[sampleIndex + 1], y, width, colors);
      }
    };

    let frame: number | null = null;
    let shouldDraw = true;
    const schedule = (shouldPaint: boolean) => {
      shouldDraw ||= shouldPaint;
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        syncViewport();
        if (shouldDraw) draw();
        shouldDraw = false;
      });
    };
    const handleScroll = () => schedule(Boolean(getRowOffset));
    const resizeObserver = new ResizeObserver(() => schedule(true));
    resizeObserver.observe(element);
    resizeObserver.observe(track);
    if (element.firstElementChild) resizeObserver.observe(element.firstElementChild);
    element.addEventListener('scroll', handleScroll, { passive: true });
    // 在首帧绘制前确定是否占宽，避免切换标签时树内容先铺满再被缩略图挤窄。
    syncViewport();
    schedule(true);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      element.removeEventListener('scroll', handleScroll);
    };
  }, [rows, scrollRef, paletteKey, getRowOffset]);

  const navigate = (pointerY: number, grabOffset: number) => {
    const element = scrollRef.current;
    const track = trackRef.current;
    if (!element || !track) return;
    const contentHeight = getMinimapContentHeight(track.clientHeight, element.scrollHeight);
    const viewport = getMinimapViewport(
      element.scrollTop,
      element.clientHeight,
      element.scrollHeight,
      contentHeight,
    );
    element.scrollTop = getMinimapScrollTop(
      pointerY,
      grabOffset,
      contentHeight,
      viewport.height,
      viewport.maxScroll,
    );
    // 后台标签可能不会立即派发原生 scroll；虚拟行仍需同步当前视口。
    element.dispatchEvent(new Event('scroll'));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const track = trackRef.current;
    const element = scrollRef.current;
    if (!track || !element) return;
    const y = event.clientY - track.getBoundingClientRect().top;
    const contentHeight = getMinimapContentHeight(track.clientHeight, element.scrollHeight);
    const viewport = getMinimapViewport(
      element.scrollTop,
      element.clientHeight,
      element.scrollHeight,
      contentHeight,
    );
    const isInsideViewport = y >= viewport.top && y <= viewport.top + viewport.height;
    const grabOffset = isInsideViewport ? y - viewport.top : viewport.height / 2;
    dragOffsetRef.current = grabOffset;
    onNavigateStart();
    track.setPointerCapture(event.pointerId);
    navigate(y, grabOffset);
    event.preventDefault();
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragOffsetRef.current === null) return;
    navigate(
      event.clientY - event.currentTarget.getBoundingClientRect().top,
      dragOffsetRef.current,
    );
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    dragOffsetRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const element = scrollRef.current;
    if (!element) return;
    const page = element.clientHeight;
    const step = Math.max(24, page * 0.1);
    let nextTop: number;
    switch (event.key) {
      case 'ArrowUp':
        nextTop = element.scrollTop - step;
        break;
      case 'ArrowDown':
        nextTop = element.scrollTop + step;
        break;
      case 'PageUp':
        nextTop = element.scrollTop - page;
        break;
      case 'PageDown':
        nextTop = element.scrollTop + page;
        break;
      case 'Home':
        nextTop = 0;
        break;
      case 'End':
        nextTop = element.scrollHeight;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    onNavigateStart();
    element.scrollTop = nextTop;
    element.dispatchEvent(new Event('scroll'));
  };

  return (
    <div
      ref={trackRef}
      className="tree-minimap"
      data-visible={isScrollable}
      role="slider"
      aria-label="树形缩略导航"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-valuetext={`已滚动 ${progress}%`}
      aria-hidden={!isScrollable}
      tabIndex={isScrollable ? 0 : -1}
      title="点击或拖动缩略图跳转"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <div ref={viewportRef} className="tree-minimap-viewport" aria-hidden="true" />
    </div>
  );
};
