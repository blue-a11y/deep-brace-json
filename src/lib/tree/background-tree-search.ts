import type { TreeSearchOptions, TreeSearchResult } from './tree-search';
import type { TreeSearchWorkerRequest, TreeSearchWorkerResponse } from './tree-search-worker';

const INDEX_TIMEOUT_MS = 30000;
const SEARCH_TIMEOUT_MS = 5000;

export type BackgroundTreeSearch = {
  search: (options: TreeSearchOptions) => void;
  cancel: () => void;
};

export const startBackgroundTreeSearch = (
  documentId: string,
  input: string,
  onResult: (result: TreeSearchResult) => void,
  onStatusChange: (status: 'indexing' | 'ready' | 'error') => void,
): BackgroundTreeSearch => {
  let worker: Worker | undefined;
  let isReady = false;
  let isCancelled = false;
  let latestRequestId = 0;
  let pendingOptions: TreeSearchOptions | null = null;
  let indexTimeout: ReturnType<typeof setTimeout> | undefined;
  let searchTimeout: ReturnType<typeof setTimeout> | undefined;

  const postSearch = (options: TreeSearchOptions) => {
    latestRequestId += 1;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      cancel();
      onStatusChange('error');
    }, SEARCH_TIMEOUT_MS);
    worker?.postMessage({
      type: 'search',
      documentId,
      requestId: latestRequestId,
      options,
    } satisfies TreeSearchWorkerRequest);
  };

  const cancel = () => {
    isCancelled = true;
    clearTimeout(indexTimeout);
    clearTimeout(searchTimeout);
    worker?.terminate();
    worker = undefined;
  };

  onStatusChange('indexing');
  try {
    worker = new Worker(new URL('./tree-search-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<TreeSearchWorkerResponse>) => {
      if (isCancelled || event.data.documentId !== documentId) return;
      if (event.data.type === 'ready') {
        clearTimeout(indexTimeout);
        isReady = true;
        onStatusChange('ready');
        if (pendingOptions) {
          postSearch(pendingOptions);
          pendingOptions = null;
        }
        return;
      }
      if (event.data.type === 'error') {
        clearTimeout(indexTimeout);
        clearTimeout(searchTimeout);
        cancel();
        onStatusChange('error');
        return;
      }
      if (event.data.requestId === latestRequestId) {
        clearTimeout(searchTimeout);
        onResult(event.data.result);
      }
    };
    worker.onerror = event => {
      event.preventDefault();
      if (!isCancelled) {
        cancel();
        onStatusChange('error');
      }
    };
    worker.onmessageerror = () => {
      if (!isCancelled) {
        cancel();
        onStatusChange('error');
      }
    };
    worker.postMessage({ type: 'index', documentId, input } satisfies TreeSearchWorkerRequest);
    indexTimeout = setTimeout(() => {
      cancel();
      onStatusChange('error');
    }, INDEX_TIMEOUT_MS);
  } catch {
    queueMicrotask(() => {
      if (!isCancelled) onStatusChange('error');
    });
  }

  return {
    search: options => {
      if (!isReady) {
        pendingOptions = options;
        return;
      }
      postSearch(options);
    },
    cancel,
  };
};
