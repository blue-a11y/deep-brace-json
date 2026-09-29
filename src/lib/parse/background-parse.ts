import type { ParseResult } from './parse';
import type { LargeSampleId } from './sample';

export type ParseRequest = string | { sample: LargeSampleId };
export type ParseResponse = ParseResult | { result: ParseResult; sampleInput: string };

export type ParseTask = { cancel: () => void };

/** 失败不回退到主线程同步解析大输入，避免降级路径再次卡住页面。 */
export const startBackgroundParse = (
  input: ParseRequest,
  onResult: (result: ParseResult, sampleInput?: string) => void,
): ParseTask => {
  let worker: Worker | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let isFinished = false;
  const cancel = () => {
    isFinished = true;
    clearTimeout(timeout);
    worker?.terminate();
  };
  const finish = (result: ParseResult, sampleInput?: string) => {
    if (isFinished) return;
    cancel();
    if (sampleInput === undefined) onResult(result);
    else onResult(result, sampleInput);
  };
  try {
    worker = new Worker(new URL('./parse-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<ParseResponse>) => {
      if ('sampleInput' in event.data) finish(event.data.result, event.data.sampleInput);
      else finish(event.data);
    };
    worker.onerror = event => {
      event.preventDefault();
      finish({ ok: false, message: '后台解析失败，请重试或减少输入大小' });
    };
    worker.onmessageerror = () => finish({ ok: false, message: '无法读取后台解析结果' });
    timeout = setTimeout(
      () => finish({ ok: false, message: '后台解析超时，请减少输入大小后重试' }),
      30000,
    );
    worker.postMessage(input);
  } catch {
    // 异步交付，保证调用者先登记当前任务身份。
    queueMicrotask(() =>
      finish({ ok: false, message: '无法启动后台解析，请检查浏览器是否支持 Worker' }),
    );
  }
  return { cancel };
};
