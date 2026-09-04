import type { EditorView } from '@codemirror/view';
import {
  clearIndexedDbStore,
  getAllIndexedDbEntries,
  INDEXED_DB_STORES,
  putIndexedDbEntries,
  reportIndexedDbFailure,
  type IndexedDbEntry,
} from './indexed-db-storage';

type TabScrollArea = 'editor' | 'tree';

export type ScrollAnchor = {
  kind: TabScrollArea;
  value: number;
  viewportOffset: number;
  nodeKey?: string;
};

type ScrollPosition = {
  left: number;
  isPinnedToBottom: boolean;
  isPinnedToRight: boolean;
  top: number;
  anchor?: ScrollAnchor;
};

type TabScrollValue = ScrollPosition & {
  version: number;
};

type ScrollAdapter = {
  element: HTMLElement;
  restoreTimeoutMs?: number;
  isLayoutReady?: () => boolean;
  readAnchor: () => ScrollAnchor | undefined;
  resolveAnchorTop: (anchor: ScrollAnchor) => number | null;
};

type ActiveScrollElement = {
  adapter: ScrollAdapter;
  isRestoring: () => boolean;
  isFrozen: boolean;
  latest: ScrollPosition;
  tabId: string;
};

const EDGE_THRESHOLD = 1;
const MAX_RESTORE_DURATION = 1000;
const PERSIST_DELAY = 120;
const REQUIRED_STABLE_FRAMES = 2;
const SCROLL_STORAGE_VERSION = 1;
const TREE_CHILDREN_SELECTOR = '.tree-children';
const TREE_LINE_SELECTOR = '.tree-line';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const restoreAnchor = (value: unknown): ScrollAnchor | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const anchor = value as Partial<ScrollAnchor>;
  return (anchor.kind === 'editor' || anchor.kind === 'tree') &&
    isFiniteNumber(anchor.value) &&
    isFiniteNumber(anchor.viewportOffset)
    ? {
        kind: anchor.kind,
        value: anchor.value,
        viewportOffset: anchor.viewportOffset,
        ...(typeof anchor.nodeKey === 'string' ? { nodeKey: anchor.nodeKey } : {}),
      }
    : undefined;
};

const restorePosition = (value: unknown): ScrollPosition | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const position = value as Partial<ScrollPosition> & {
    pinnedBottom?: unknown;
    pinnedRight?: unknown;
  };
  const isPinnedToBottom =
    typeof position.isPinnedToBottom === 'boolean'
      ? position.isPinnedToBottom
      : position.pinnedBottom;
  const isPinnedToRight =
    typeof position.isPinnedToRight === 'boolean' ? position.isPinnedToRight : position.pinnedRight;
  return isFiniteNumber(position.left) &&
    typeof isPinnedToBottom === 'boolean' &&
    typeof isPinnedToRight === 'boolean' &&
    isFiniteNumber(position.top)
    ? {
        left: position.left,
        isPinnedToBottom,
        isPinnedToRight,
        top: position.top,
        anchor: restoreAnchor(position.anchor),
      }
    : undefined;
};

const scrollPositions = new Map<string, ScrollPosition>();
const pendingScrollKeys = new Set<string>();

const getScrollKey = (tabId: string, area: TabScrollArea) => `${tabId}:${area}`;

const rememberScrollPosition = (tabId: string, area: TabScrollArea, position: ScrollPosition) => {
  const key = getScrollKey(tabId, area);
  scrollPositions.set(key, position);
  pendingScrollKeys.add(key);
};

const createScrollEntry = (
  key: string,
  position: ScrollPosition,
): IndexedDbEntry<TabScrollValue> => {
  const separatorIndex = key.lastIndexOf(':');
  return {
    key: [key.slice(0, separatorIndex), key.slice(separatorIndex + 1)],
    value: {
      version: SCROLL_STORAGE_VERSION,
      ...position,
    },
  };
};

const parseScrollEntryKey = (key: IDBValidKey): { tabId: string; area: TabScrollArea } | null => {
  if (!Array.isArray(key) || key.length !== 2) return null;
  const [tabId, area] = key;
  return typeof tabId === 'string' && (area === 'editor' || area === 'tree')
    ? { tabId, area }
    : null;
};

export const hydrateTabScrollStorage = async () => {
  const entries = await getAllIndexedDbEntries<TabScrollValue>(INDEXED_DB_STORES.tabScroll);
  for (const { key, value } of entries) {
    const parsedKey = parseScrollEntryKey(key);
    if (!parsedKey || value.version !== SCROLL_STORAGE_VERSION) continue;
    const position = restorePosition(value);
    if (position) {
      scrollPositions.set(getScrollKey(parsedKey.tabId, parsedKey.area), position);
    }
  }
};

const activeScrollElements = new Map<TabScrollArea, ActiveScrollElement>();
let persistTimer: number | null = null;
let persistenceQueue = Promise.resolve();

const persistScrollPositions = () => {
  if (typeof window === 'undefined') return persistenceQueue;
  if (persistTimer !== null) window.clearTimeout(persistTimer);
  persistTimer = null;
  const keys = [...pendingScrollKeys];
  pendingScrollKeys.clear();
  const entries = keys.flatMap(key => {
    const position = scrollPositions.get(key);
    return position ? [createScrollEntry(key, position)] : [];
  });
  persistenceQueue = persistenceQueue
    .then(() => putIndexedDbEntries(INDEXED_DB_STORES.tabScroll, entries))
    .catch(error => {
      for (const key of keys) pendingScrollKeys.add(key);
      reportIndexedDbFailure(error);
    });
  return persistenceQueue;
};

const scheduleScrollPersistence = () => {
  if (typeof window === 'undefined') return;
  if (persistTimer !== null) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    void persistScrollPositions();
  }, PERSIST_DELAY);
};

if (typeof window !== 'undefined') {
  const handlePageHide = () => {
    void persistScrollPositions();
  };
  window.addEventListener('pagehide', handlePageHide);
  import.meta.hot?.dispose(() => {
    void persistScrollPositions();
    window.removeEventListener('pagehide', handlePageHide);
  });
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);
const isNear = (actual: number, expected: number) => Math.abs(actual - expected) < 1;
const getMaximumLeft = (element: HTMLElement) =>
  Math.max(0, element.scrollWidth - element.clientWidth);
const getMaximumTop = (element: HTMLElement) =>
  Math.max(0, element.scrollHeight - element.clientHeight);

const readPosition = (adapter: ScrollAdapter): ScrollPosition => {
  const { element } = adapter;
  const maximumLeft = getMaximumLeft(element);
  const maximumTop = getMaximumTop(element);
  return {
    left: element.scrollLeft,
    isPinnedToBottom:
      maximumTop > EDGE_THRESHOLD && maximumTop - element.scrollTop <= EDGE_THRESHOLD,
    isPinnedToRight:
      maximumLeft > EDGE_THRESHOLD && maximumLeft - element.scrollLeft <= EDGE_THRESHOLD,
    top: element.scrollTop,
    anchor: adapter.readAnchor(),
  };
};

const resolvePosition = (adapter: ScrollAdapter, position: ScrollPosition) => {
  const { element } = adapter;
  const maximumLeft = getMaximumLeft(element);
  const maximumTop = getMaximumTop(element);
  const anchorTop = position.anchor ? adapter.resolveAnchorTop(position.anchor) : null;
  const anchoredTop =
    anchorTop === null || !position.anchor
      ? position.top
      : anchorTop - position.anchor.viewportOffset;

  return {
    isAnchorPending: Boolean(!position.isPinnedToBottom && position.anchor && anchorTop === null),
    layoutKey: `${element.scrollHeight}:${anchorTop?.toFixed(2) ?? 'pending'}`,
    left: position.isPinnedToRight ? maximumLeft : clamp(position.left, 0, maximumLeft),
    top: position.isPinnedToBottom ? maximumTop : clamp(anchoredTop, 0, maximumTop),
  };
};

const bindScrollPosition = (tabId: string, area: TabScrollArea, adapter: ScrollAdapter) => {
  const key = getScrollKey(tabId, area);
  const saved = scrollPositions.get(key);
  let restoreFrame: number | null = null;
  let isRestoring = false;
  let isUserInteractionPending = false;
  let viewportWidth = adapter.element.clientWidth;
  let viewportHeight = adapter.element.clientHeight;
  const active: ActiveScrollElement = {
    adapter,
    isRestoring: () => isRestoring,
    isFrozen: false,
    latest: saved ?? readPosition(adapter),
    tabId,
  };
  activeScrollElements.set(area, active);

  const finishRestore = () => {
    isRestoring = false;
    restoreFrame = null;
    active.latest = readPosition(adapter);
    rememberScrollPosition(tabId, area, active.latest);
    scheduleScrollPersistence();
  };

  const interruptRestore = () => {
    if (!isRestoring) return;
    isUserInteractionPending = true;
    isRestoring = false;
    if (restoreFrame !== null) window.cancelAnimationFrame(restoreFrame);
    restoreFrame = null;
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.target === adapter.element) interruptRestore();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (
      [
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'End',
        'Home',
        'PageDown',
        'PageUp',
      ].includes(event.key)
    ) {
      interruptRestore();
    }
  };

  const startRestore = (position: ScrollPosition) => {
    if (restoreFrame !== null) window.cancelAnimationFrame(restoreFrame);
    isRestoring = true;
    active.latest = position;
    const startedAt = performance.now();
    let stableFrames = 0;
    let previousLayoutKey: string | null = null;

    const restoreWhenReady = () => {
      const target = resolvePosition(adapter, position);
      adapter.element.scrollLeft = target.left;
      adapter.element.scrollTop = target.top;

      const isRestored =
        (adapter.isLayoutReady?.() ?? true) &&
        !target.isAnchorPending &&
        isNear(adapter.element.scrollLeft, target.left) &&
        isNear(adapter.element.scrollTop, target.top);
      stableFrames = isRestored && target.layoutKey === previousLayoutKey ? stableFrames + 1 : 0;
      previousLayoutKey = target.layoutKey;

      if (
        stableFrames >= REQUIRED_STABLE_FRAMES ||
        performance.now() - startedAt >= (adapter.restoreTimeoutMs ?? MAX_RESTORE_DURATION)
      ) {
        finishRestore();
        return;
      }
      restoreFrame = window.requestAnimationFrame(restoreWhenReady);
    };

    restoreWhenReady();
  };

  const save = () => {
    if (isRestoring || active.isFrozen) return;
    active.latest = readPosition(adapter);
    rememberScrollPosition(tabId, area, active.latest);
    scheduleScrollPersistence();
    isUserInteractionPending = false;
  };

  const resizeObserver = new ResizeObserver(() => {
    const nextWidth = adapter.element.clientWidth;
    const nextHeight = adapter.element.clientHeight;
    if (nextWidth === viewportWidth && nextHeight === viewportHeight) return;
    viewportWidth = nextWidth;
    viewportHeight = nextHeight;
    if (!isRestoring && !active.isFrozen && !isUserInteractionPending) {
      startRestore(active.latest);
    }
  });

  if (saved) startRestore(saved);
  adapter.element.addEventListener('scroll', save, { passive: true });
  adapter.element.addEventListener('wheel', interruptRestore, { passive: true });
  adapter.element.addEventListener('touchstart', interruptRestore, { passive: true });
  adapter.element.addEventListener('pointerdown', handlePointerDown);
  adapter.element.addEventListener('keydown', handleKeyDown, true);
  resizeObserver.observe(adapter.element);

  const dispose = () => {
    if (!isRestoring && !active.isFrozen) {
      rememberScrollPosition(tabId, area, readPosition(adapter));
      scheduleScrollPersistence();
    }
    if (activeScrollElements.get(area)?.adapter.element === adapter.element) {
      activeScrollElements.delete(area);
    }
    if (restoreFrame !== null) window.cancelAnimationFrame(restoreFrame);
    resizeObserver.disconnect();
    adapter.element.removeEventListener('scroll', save);
    adapter.element.removeEventListener('wheel', interruptRestore);
    adapter.element.removeEventListener('touchstart', interruptRestore);
    adapter.element.removeEventListener('pointerdown', handlePointerDown);
    adapter.element.removeEventListener('keydown', handleKeyDown, true);
  };
  return Object.assign(dispose, {
    save,
    scrollToEdge: (edge: 'start' | 'end') =>
      startRestore({
        ...readPosition(adapter),
        top: edge === 'end' ? getMaximumTop(adapter.element) : 0,
        isPinnedToBottom: edge === 'end',
        anchor: undefined,
      }),
    refresh: () => {
      if (!active.isFrozen) startRestore(active.latest);
    },
  });
};

export const captureActiveTabScrollPositions = () => {
  for (const [area, active] of activeScrollElements) {
    // 测量恢复期间捕获目标锚点，不把暂时的估计布局当成用户的新位置。
    if (!active.isRestoring()) active.latest = readPosition(active.adapter);
    active.isFrozen = true;
    rememberScrollPosition(active.tabId, area, active.latest);
  }
  return persistScrollPositions();
};

/** 重置时清空内存与 IndexedDB 中的全部滚动记忆。 */
export const clearTabScrollPositions = async () => {
  if (persistTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(persistTimer);
  }
  persistTimer = null;
  scrollPositions.clear();
  pendingScrollKeys.clear();
  await persistenceQueue;
  try {
    await clearIndexedDbStore(INDEXED_DB_STORES.tabScroll);
  } catch (error) {
    reportIndexedDbFailure(error);
  }
};

export type TabScrollSnapshot = ReadonlyMap<string, ScrollPosition>;

/** 重置前拍快照，撤销时据此恢复各标签页滚动位置。 */
export const captureTabScrollSnapshot = (): TabScrollSnapshot => new Map(scrollPositions);

export const restoreTabScrollSnapshot = (snapshot: TabScrollSnapshot) => {
  for (const [key, position] of snapshot) {
    scrollPositions.set(key, position);
    pendingScrollKeys.add(key);
  }
  return persistScrollPositions();
};

export const bindEditorTabScrollPosition = (tabId: string, view: EditorView) =>
  bindScrollPosition(tabId, 'editor', {
    element: view.scrollDOM,
    readAnchor: () => {
      const line = view.lineBlockAtHeight(view.scrollDOM.scrollTop);
      return {
        kind: 'editor',
        value: line.from,
        viewportOffset: line.top - view.scrollDOM.scrollTop,
      };
    },
    resolveAnchorTop: anchor =>
      anchor.kind === 'editor'
        ? view.lineBlockAt(clamp(anchor.value, 0, view.state.doc.length)).top
        : null,
  });

const getTreeLines = (element: HTMLElement) =>
  Array.from(element.querySelectorAll<HTMLElement>(TREE_LINE_SELECTOR));

export const bindVirtualTreeTabScrollPosition = (tabId: string, adapter: ScrollAdapter) =>
  bindScrollPosition(tabId, 'tree', adapter);

export const bindTreeTabScrollPosition = (tabId: string, element: HTMLElement) =>
  bindScrollPosition(tabId, 'tree', {
    element,
    isLayoutReady: () =>
      Array.from(element.querySelectorAll<HTMLElement>(TREE_CHILDREN_SELECTOR)).every(children => {
        const isWaitingToExpand =
          children.dataset.expanded === 'true' && children.dataset.open !== 'true';
        const isTransitioning = children
          .getAnimations()
          .some(animation => animation.playState === 'running');
        return !isWaitingToExpand && !isTransitioning;
      }),
    readAnchor: () => {
      const viewportTop = element.getBoundingClientRect().top;
      const lines = getTreeLines(element);
      const index = lines.findIndex(line => {
        const rect = line.getBoundingClientRect();
        return rect.height > 0 && rect.bottom > viewportTop + 0.5;
      });
      if (index < 0) return undefined;
      return {
        kind: 'tree',
        value: index,
        viewportOffset: lines[index].getBoundingClientRect().top - viewportTop,
      };
    },
    resolveAnchorTop: anchor => {
      if (anchor.kind !== 'tree') return null;
      const line = getTreeLines(element)[anchor.value];
      const rect = line?.getBoundingClientRect();
      if (!rect || rect.height <= 0) return null;
      return rect.top - element.getBoundingClientRect().top + element.scrollTop;
    },
  });
