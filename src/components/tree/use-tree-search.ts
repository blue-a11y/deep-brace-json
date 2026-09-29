import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { getAncestorPathKeys } from '../../lib/parse/json-path';
import {
  startBackgroundTreeSearch,
  type BackgroundTreeSearch,
} from '../../lib/tree/background-tree-search';
import {
  buildTreeSearchIndex,
  searchTreeIndex,
  type TreeSearchResult,
  type TreeSearchScope,
} from '../../lib/tree/tree-search';

type UseTreeSearchOptions = {
  tabId: string;
  input: string;
  data: unknown;
  collapsed: Set<string>;
  isLargeDocument: boolean;
};

const EMPTY_RESULT: TreeSearchResult = { matches: [], total: 0 };

export const useTreeSearch = ({
  tabId,
  input,
  data,
  collapsed,
  isLargeDocument,
}: UseTreeSearchOptions) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<TreeSearchScope>('all');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [status, setStatus] = useState<'idle' | 'indexing' | 'ready' | 'error'>('idle');
  const [result, setResult] = useState<TreeSearchResult>(EMPTY_RESULT);
  const [currentIndex, setCurrentIndex] = useState(0);
  const backgroundSearchRef = useRef<BackgroundTreeSearch | null>(null);
  const deferredQuery = useDeferredValue(query);
  const shouldUseWorker = isLargeDocument;
  const searchOptions = useMemo(
    () => (deferredQuery ? { query: deferredQuery, scope, isCaseSensitive } : undefined),
    [deferredQuery, scope, isCaseSensitive],
  );

  const smallDocumentIndex = useMemo(
    () => (isOpen && !shouldUseWorker ? buildTreeSearchIndex(data) : []),
    [data, isOpen, shouldUseWorker],
  );

  useEffect(() => {
    backgroundSearchRef.current?.cancel();
    backgroundSearchRef.current = null;
    if (!isOpen || !shouldUseWorker) {
      setStatus(isOpen ? 'ready' : 'idle');
      return;
    }
    setResult(EMPTY_RESULT);
    setCurrentIndex(0);
    backgroundSearchRef.current = startBackgroundTreeSearch(
      tabId,
      input,
      nextResult => {
        setResult(nextResult);
        setCurrentIndex(0);
      },
      setStatus,
    );
    return () => {
      backgroundSearchRef.current?.cancel();
      backgroundSearchRef.current = null;
    };
  }, [input, isOpen, shouldUseWorker, tabId]);

  useEffect(() => {
    if (!isOpen || !deferredQuery) {
      if (isOpen && shouldUseWorker) {
        backgroundSearchRef.current?.search({
          query: '',
          scope,
          isCaseSensitive,
        });
      }
      setResult(EMPTY_RESULT);
      setCurrentIndex(0);
      return;
    }
    const options = searchOptions!;
    if (shouldUseWorker) {
      backgroundSearchRef.current?.search(options);
      return;
    }
    setResult(searchTreeIndex(smallDocumentIndex, options));
    setCurrentIndex(0);
  }, [
    deferredQuery,
    isCaseSensitive,
    isOpen,
    scope,
    shouldUseWorker,
    smallDocumentIndex,
    searchOptions,
  ]);

  useEffect(() => {
    setIsOpen(false);
    setQuery('');
    setResult(EMPTY_RESULT);
    setCurrentIndex(0);
  }, [tabId]);

  const activeEntry = result.matches[currentIndex];
  const forcedOpenPaths = useMemo(
    () => (activeEntry ? getAncestorPathKeys(activeEntry.path) : new Set<string>()),
    [activeEntry],
  );
  const effectiveCollapsed = useMemo(() => {
    if (forcedOpenPaths.size === 0) return collapsed;
    const nextCollapsed = new Set(collapsed);
    for (const key of forcedOpenPaths) nextCollapsed.delete(key);
    return nextCollapsed;
  }, [collapsed, forcedOpenPaths]);
  const searchMatchKeys = useMemo(
    () => new Set(result.matches.map(match => match.key)),
    [result.matches],
  );

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setFocusRequest(request => request + 1);
  }, []);

  const handlePrevious = () => {
    if (result.matches.length === 0) return;
    setCurrentIndex(index => (index - 1 + result.matches.length) % result.matches.length);
  };
  const handleNext = () => {
    if (result.matches.length === 0) return;
    setCurrentIndex(index => (index + 1) % result.matches.length);
  };
  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResult(EMPTY_RESULT);
    setCurrentIndex(0);
  };

  return {
    isOpen,
    focusRequest,
    query,
    setQuery,
    scope,
    setScope,
    isCaseSensitive,
    setIsCaseSensitive,
    status,
    result,
    currentIndex,
    activeEntry,
    forcedOpenPaths,
    effectiveCollapsed,
    searchMatchKeys,
    searchOptions,
    handleOpen,
    handlePrevious,
    handleNext,
    handleClose,
  };
};
