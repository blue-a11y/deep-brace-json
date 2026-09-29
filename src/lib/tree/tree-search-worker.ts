import { parseInput } from '../parse/parse';
import {
  buildTreeSearchIndex,
  searchTreeIndex,
  type TreeSearchOptions,
  type TreeSearchResult,
} from './tree-search';

export type TreeSearchWorkerRequest =
  | { type: 'index'; documentId: string; input: string }
  | { type: 'search'; documentId: string; requestId: number; options: TreeSearchOptions };

export type TreeSearchWorkerResponse =
  | { type: 'ready'; documentId: string }
  | { type: 'error'; documentId: string; message: string }
  | {
      type: 'result';
      documentId: string;
      requestId: number;
      result: TreeSearchResult;
    };

let activeDocumentId = '';
let activeIndex: ReturnType<typeof buildTreeSearchIndex> = [];

self.onmessage = (event: MessageEvent<TreeSearchWorkerRequest>) => {
  const request = event.data;
  if (request.type === 'index') {
    const parsed = parseInput(request.input);
    if (!parsed.ok) {
      self.postMessage({
        type: 'error',
        documentId: request.documentId,
        message: '无法为当前内容建立搜索索引',
      } satisfies TreeSearchWorkerResponse);
      return;
    }
    activeDocumentId = request.documentId;
    activeIndex = buildTreeSearchIndex(parsed.data);
    self.postMessage({
      type: 'ready',
      documentId: request.documentId,
    } satisfies TreeSearchWorkerResponse);
    return;
  }

  if (request.documentId !== activeDocumentId) return;
  self.postMessage({
    type: 'result',
    documentId: request.documentId,
    requestId: request.requestId,
    result: searchTreeIndex(activeIndex, request.options),
  } satisfies TreeSearchWorkerResponse);
};
