import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startBackgroundParse } from './background-parse';

class TestWorker {
  static instances: TestWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: (event: { preventDefault: () => void }) => void;
  onmessageerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    TestWorker.instances.push(this);
  }
}

describe('background parse lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestWorker.instances = [];
    vi.stubGlobal('Worker', TestWorker);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it('delivers a result once and releases the Worker', () => {
    const complete = vi.fn();
    startBackgroundParse('{"ready":true}', complete);
    const worker = TestWorker.instances[0];
    const result = { ok: true, data: { ready: true } };
    expect(worker.postMessage).toHaveBeenCalledWith('{"ready":true}');
    worker.onmessage?.({ data: result });
    worker.onmessage?.({ data: result });
    expect(complete).toHaveBeenCalledExactlyOnceWith(result);
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels without delivering a stale result', () => {
    const complete = vi.fn();
    const task = startBackgroundParse('[]', complete);
    const worker = TestWorker.instances[0];
    task.cancel();
    worker.onmessage?.({ data: { ok: true, data: [] } });
    expect(complete).not.toHaveBeenCalled();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('generates samples in the Worker and returns both input and parsed data', () => {
    const complete = vi.fn();
    startBackgroundParse({ sample: 'large-1mb' }, complete);
    const worker = TestWorker.instances[0];
    expect(worker.postMessage).toHaveBeenCalledWith({ sample: 'large-1mb' });
    const result = { ok: true, data: [1] };
    worker.onmessage?.({ data: { result, sampleInput: '[1]' } });
    expect(complete).toHaveBeenCalledExactlyOnceWith(result, '[1]');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('reports errors and timeouts without blocking fallback parsing', () => {
    const complete = vi.fn();
    startBackgroundParse('[]', complete);
    const preventDefault = vi.fn();
    TestWorker.instances[0].onerror?.({ preventDefault });
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
    expect(preventDefault).toHaveBeenCalledOnce();
    startBackgroundParse('[]', complete);
    vi.advanceTimersByTime(30000);
    expect(complete).toHaveBeenLastCalledWith(
      expect.objectContaining({ ok: false, message: expect.stringContaining('超时') }),
    );
    expect(TestWorker.instances[1].terminate).toHaveBeenCalledOnce();
  });
  it('handles unsupported Workers asynchronously and allows cancellation', async () => {
    vi.stubGlobal('Worker', undefined);
    const complete = vi.fn();
    startBackgroundParse('[]', complete);
    await vi.runAllTimersAsync();
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });
});
