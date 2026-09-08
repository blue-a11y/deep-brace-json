import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type Key,
  type KeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Button, ButtonGroup, ListBox, SearchField, Select, ToggleButton } from '@heroui/react';
import { CaseSensitive, ChevronDown, ChevronUp, GripHorizontal, X } from 'lucide-react';
import type { TreeSearchScope } from '../lib/tree-search';
import { clampTreeSearchPosition, type TreeSearchPosition } from '../lib/tree-search-position';

const SCOPE_OPTIONS: { value: TreeSearchScope; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'key', label: '键名' },
  { value: 'value', label: '值' },
  { value: 'path', label: '路径' },
];

const SCOPE_SHORT_LABELS: Record<TreeSearchScope, string> = {
  all: '全部',
  key: '键',
  value: '值',
  path: '路径',
};

type TreeSearchBarProps = {
  anchorRef: RefObject<HTMLElement | null>;
  isOpen: boolean;
  focusRequest: number;
  query: string;
  scope: TreeSearchScope;
  isCaseSensitive: boolean;
  status: 'idle' | 'indexing' | 'ready' | 'error';
  total: number;
  currentIndex: number;
  navigableCount: number;
  position: TreeSearchPosition | null;
  onQueryChange: (query: string) => void;
  onScopeChange: (scope: TreeSearchScope) => void;
  onCaseSensitiveChange: (isCaseSensitive: boolean) => void;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  onPositionChange: (position: TreeSearchPosition) => void;
};

const SearchOptionButton = ({
  label,
  isSelected,
  onPress,
  children,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  children: ReactNode;
}) => (
  <ToggleButton
    aria-label={label}
    size="sm"
    variant="ghost"
    isIconOnly
    isSelected={isSelected}
    className="tree-search-option-button size-7 min-w-7 shrink-0 rounded-md"
    onChange={onPress}
  >
    {children}
  </ToggleButton>
);

const SearchNavigation = ({
  className,
  isDisabled,
  onPrevious,
  onNext,
}: {
  className: string;
  isDisabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) => (
  <ButtonGroup size="sm" variant="ghost" className={`shrink-0 ${className}`}>
    <Button
      aria-label="上一个匹配"
      isDisabled={isDisabled}
      isIconOnly
      className="tree-search-navigation-button size-7 min-w-7"
      onPress={onPrevious}
    >
      <ChevronUp size={13} />
    </Button>
    <Button
      aria-label="下一个匹配"
      isDisabled={isDisabled}
      isIconOnly
      className="tree-search-navigation-button size-7 min-w-7"
      onPress={onNext}
    >
      <ChevronDown size={13} />
    </Button>
  </ButtonGroup>
);

export const TreeSearchBar = ({
  anchorRef,
  isOpen,
  focusRequest,
  query,
  scope,
  isCaseSensitive,
  status,
  total,
  currentIndex,
  navigableCount,
  position,
  onQueryChange,
  onScopeChange,
  onCaseSensitiveChange,
  onPrevious,
  onNext,
  onClose,
  onPositionChange,
}: TreeSearchBarProps) => {
  const scopeLabelId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    position: TreeSearchPosition;
  } | null>(null);
  const [draftPosition, setDraftPosition] = useState(position);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [focusRequest, isOpen]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || !globalThis.ResizeObserver) return;
    const getDefaultPosition = () => {
      const anchorBounds = anchorRef.current?.getBoundingClientRect();
      return anchorBounds
        ? {
            x: anchorBounds.right - panel.offsetWidth - 12,
            y: anchorBounds.top + 44,
          }
        : { x: window.innerWidth - panel.offsetWidth - 12, y: 44 };
    };
    const clampPosition = (nextPosition: TreeSearchPosition) =>
      clampTreeSearchPosition(
        nextPosition,
        window.innerWidth,
        window.innerHeight,
        panel.offsetWidth,
        panel.offsetHeight,
      );
    const clampCurrentPosition = () => {
      setDraftPosition(currentPosition => {
        const shouldFollowAnchor = position === null && dragStateRef.current === null;
        return clampPosition(
          shouldFollowAnchor ? getDefaultPosition() : (currentPosition ?? getDefaultPosition()),
        );
      });
    };
    setDraftPosition(clampPosition(position ?? getDefaultPosition()));
    const observer = new ResizeObserver(clampCurrentPosition);
    observer.observe(panel);
    if (anchorRef.current) observer.observe(anchorRef.current);
    window.addEventListener('resize', clampCurrentPosition);
    clampCurrentPosition();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', clampCurrentPosition);
    };
  }, [anchorRef, position]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      const panel = panelRef.current;
      if (!dragState || !panel || dragState.pointerId !== event.pointerId) return;
      const nextPosition = clampTreeSearchPosition(
        {
          x: event.clientX - dragState.offsetX,
          y: event.clientY - dragState.offsetY,
        },
        window.innerWidth,
        window.innerHeight,
        panel.offsetWidth,
        panel.offsetHeight,
      );
      dragState.position = nextPosition;
      setDraftPosition(nextPosition);
    };
    const handlePointerEnd = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      dragStateRef.current = null;
      onPositionChange(dragState.position);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [onPositionChange]);

  const getCurrentPosition = () => {
    const panel = panelRef.current;
    if (!panel) return null;
    const panelBounds = panel.getBoundingClientRect();
    return {
      position: {
        x: panelBounds.left,
        y: panelBounds.top,
      },
      panel,
    };
  };

  const updateDragPosition = (nextPosition: TreeSearchPosition) => {
    const current = getCurrentPosition();
    if (!current) return nextPosition;
    return clampTreeSearchPosition(
      nextPosition,
      window.innerWidth,
      window.innerHeight,
      current.panel.offsetWidth,
      current.panel.offsetHeight,
    );
  };

  const handleDragStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const current = getCurrentPosition();
    if (!current) return;
    const panelBounds = current.panel.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - panelBounds.left,
      offsetY: event.clientY - panelBounds.top,
      position: current.position,
    };
    setDraftPosition(current.position);
    event.preventDefault();
  };

  const handleDragKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const offsets: Record<string, TreeSearchPosition> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const offset = offsets[event.key];
    if (!offset) return;
    const current = getCurrentPosition();
    if (!current) return;
    event.preventDefault();
    const distance = event.shiftKey ? 24 : 8;
    const nextPosition = updateDragPosition({
      x: current.position.x + offset.x * distance,
      y: current.position.y + offset.y * distance,
    });
    setDraftPosition(nextPosition);
    onPositionChange(nextPosition);
  };

  const resultText =
    status === 'error'
      ? '搜索索引失败'
      : !query
        ? ''
        : status === 'indexing'
          ? '正在建立索引…'
          : total > 0
            ? total > navigableCount
              ? `${Math.min(currentIndex + 1, navigableCount)} / ${navigableCount} · 共 ${total}`
              : `${Math.min(currentIndex + 1, navigableCount)} / ${total}`
            : '无匹配';

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Enter' || navigableCount === 0) return;
    event.preventDefault();
    if (event.shiftKey) onPrevious();
    else onNext();
  };

  const handleScopeChange = (nextScope: Key | Key[] | null) => {
    if (typeof nextScope === 'string') onScopeChange(nextScope as TreeSearchScope);
  };

  return createPortal(
    <div
      ref={panelRef}
      role="search"
      aria-label="搜索树节点"
      aria-hidden={isOpen ? undefined : true}
      inert={isOpen ? undefined : true}
      data-open={isOpen}
      style={
        draftPosition ? { left: draftPosition.x, right: 'auto', top: draftPosition.y } : undefined
      }
      className="tree-search-popover fixed top-11 right-3 left-3 z-50 w-[calc(100%-1.5rem)] min-w-0 sm:left-auto sm:w-[min(30rem,calc(100%-1.5rem))]"
    >
      <SearchField
        aria-label="搜索键、值或路径"
        value={query}
        fullWidth
        variant="secondary"
        className="min-w-0"
        onChange={onQueryChange}
      >
        <SearchField.Group className="tree-search-input-group h-9 min-h-9 gap-0.5 rounded-[14px] bg-white px-2 text-zinc-900 shadow-md ring-1 ring-black/10 dark:ring-white/10">
          <SearchField.SearchIcon className="mr-0.5 shrink-0" />
          <SearchField.Input
            ref={inputRef}
            placeholder="搜索键、值或路径"
            className="min-w-0 text-xs"
            onKeyDown={handleInputKeyDown}
          />
          {query ? (
            <SearchField.ClearButton
              aria-label="清空搜索"
              className="tree-search-clear-button size-7 min-w-7"
            />
          ) : null}
          <span
            aria-hidden="true"
            className="mx-0.5 h-4 w-px shrink-0 bg-black/10 dark:bg-white/10"
          />
          <span id={scopeLabelId} className="sr-only">
            搜索范围：{SCOPE_OPTIONS.find(option => option.value === scope)?.label ?? '全部'}
          </span>
          <Select
            aria-labelledby={scopeLabelId}
            value={scope}
            variant="primary"
            className="tree-search-scope w-14 shrink-0"
            onChange={handleScopeChange}
          >
            <Select.Trigger
              aria-labelledby={scopeLabelId}
              className="h-7 min-h-7 gap-0.5 rounded-md border-0 bg-transparent px-1.5 text-[11px] shadow-none outline-none hover:bg-foreground/5"
            >
              <Select.Value aria-hidden="true">{SCOPE_SHORT_LABELS[scope]}</Select.Value>
              <Select.Indicator className="size-3" />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {SCOPE_OPTIONS.map(option => (
                  <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                    {option.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <SearchOptionButton
            label="区分大小写"
            isSelected={isCaseSensitive}
            onPress={() => onCaseSensitiveChange(!isCaseSensitive)}
          >
            <CaseSensitive size={14} />
          </SearchOptionButton>
          <div className="tree-search-result-controls">
            <span
              role="status"
              title={
                total > navigableCount
                  ? `结果过多，仅导航前 ${navigableCount} 项`
                  : resultText || undefined
              }
              className={`tree-search-status max-w-16 min-w-0 shrink-0 truncate text-[10px] tabular-nums ${status === 'error' ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'}`}
            >
              {resultText}
            </span>
            <SearchNavigation
              className="tree-search-mobile-navigation"
              isDisabled={navigableCount === 0}
              onPrevious={onPrevious}
              onNext={onNext}
            />
          </div>
          <SearchNavigation
            className="tree-search-desktop-navigation"
            isDisabled={navigableCount === 0}
            onPrevious={onPrevious}
            onNext={onNext}
          />
          <Button
            aria-label="关闭树搜索"
            size="sm"
            variant="ghost"
            isIconOnly
            className="tree-search-close-button size-7 min-w-7 shrink-0 rounded-md"
            onPress={onClose}
          >
            <X size={13} />
          </Button>
          <Button
            aria-label="拖动搜索面板"
            aria-description="拖动或使用方向键移动搜索面板"
            size="sm"
            variant="ghost"
            isIconOnly
            className="tree-search-drag-handle size-7 min-w-7 shrink-0 touch-none cursor-grab rounded-md active:cursor-grabbing"
            onPointerDown={handleDragStart}
            onKeyDown={handleDragKeyDown}
          >
            <GripHorizontal size={13} />
          </Button>
        </SearchField.Group>
      </SearchField>
    </div>,
    document.body,
  );
};
