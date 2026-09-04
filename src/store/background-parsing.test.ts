import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParseRequest } from '../lib/background-parse';
import { LARGE_INPUT_LENGTH } from '../lib/large-document';

const pending = vi.hoisted(
  () =>
    [] as Array<{
      input: ParseRequest;
      complete: (result: unknown, sampleInput?: string) => void;
      cancel: ReturnType<typeof vi.fn>;
    }>,
);
vi.mock('../lib/background-parse', () => ({
  startBackgroundParse: (
    input: ParseRequest,
    complete: (result: unknown, sampleInput?: string) => void,
  ) => {
    const task = { input, complete, cancel: vi.fn() };
    pending.push(task);
    return task;
  },
}));

const largeInput = JSON.stringify({ value: 'x'.repeat(LARGE_INPUT_LENGTH) });
const result = {
  ok: true,
  data: { value: 'old' },
  stats: { nodes: 2, maxDepth: 2, rootType: 'object' },
};

describe('background parsing request identity', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    pending.length = 0;
    vi.stubGlobal('indexedDB', new IDBFactory());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('cancels the previous parse and ignores even a late callback with the same input', async () => {
    const { useStore } = await import('./use-store');
    useStore.getState().editInput(largeInput);
    vi.advanceTimersByTime(300);
    const first = pending[0];
    useStore.getState().editInput(largeInput);
    vi.advanceTimersByTime(300);
    expect(first.cancel).toHaveBeenCalledOnce();
    first.complete(result);
    expect(useStore.getState().tabs[0].result).toBeNull();
    expect(useStore.getState().tabs[0].isParsing).toBe(true);
    pending[1].complete(result);
    expect(useStore.getState().tabs[0].result).toEqual(result);
    expect(useStore.getState().tabs[0].isParsing).toBe(false);
  });
  it('replaces only the requesting tab when sample generation finishes after a tab switch', async () => {
    const { useStore } = await import('./use-store');
    const id = useStore.getState().activeTabId;
    useStore.getState().loadSample('large-1mb');
    expect(pending[0].input).toEqual({ sample: 'large-1mb' });
    expect(useStore.getState().tabs[0].isParsing).toBe(true);
    useStore.getState().setActiveTab(useStore.getState().tabs[1].id);
    pending[0].complete(result, largeInput);
    expect(useStore.getState().tabs.find(tab => tab.id === id)).toMatchObject({
      input: largeInput,
      result,
      isParsing: false,
    });
    expect(useStore.getState().tabs[1].input).toBe('');
  });
  it('cancels sample generation on replacement, edits and close', async () => {
    const { useStore } = await import('./use-store');
    useStore.getState().loadSample('large-10mb');
    useStore.getState().loadSample();
    const ordinary = useStore.getState().tabs[0].input;
    pending[0].complete(result, largeInput);
    expect(pending[0].cancel).toHaveBeenCalledOnce();
    expect(useStore.getState().tabs[0].input).toBe(ordinary);
    useStore.getState().loadSample('large-1mb');
    useStore.getState().editInput('user edit');
    pending[1].complete(result, largeInput);
    expect(pending[1].cancel).toHaveBeenCalledOnce();
    expect(useStore.getState().tabs[0].input).toBe('user edit');
    useStore.getState().loadSample('large-10mb');
    const id = useStore.getState().activeTabId;
    useStore.getState().closeTab(id);
    pending[2].complete(result, largeInput);
    expect(pending[2].cancel).toHaveBeenCalledOnce();
    expect(useStore.getState().tabs.some(tab => tab.id === id)).toBe(false);
  });
  it('preserves the existing input and result when sample generation fails', async () => {
    const { useStore } = await import('./use-store');
    useStore.getState().loadSample();
    const original = useStore.getState().tabs[0];
    useStore.getState().loadSample('large-1mb');
    pending[0].complete({ ok: false, message: 'worker unavailable' });
    expect(useStore.getState().tabs[0]).toEqual(original);
  });

  it('commits to the original tab after switching and ignores closed tabs', async () => {
    const { useStore } = await import('./use-store');
    const firstId = useStore.getState().activeTabId;
    useStore.getState().editInput(largeInput);
    vi.advanceTimersByTime(300);
    useStore.getState().setActiveTab(useStore.getState().tabs[1].id);
    pending[0].complete(result);
    expect(useStore.getState().tabs.find(tab => tab.id === firstId)?.result).toEqual(result);
    useStore.getState().editInput(largeInput);
    vi.advanceTimersByTime(300);
    const closingId = useStore.getState().activeTabId;
    useStore.getState().closeTab(closingId);
    pending[1].complete(result);
    expect(pending[1].cancel).toHaveBeenCalledOnce();
    expect(useStore.getState().tabs.some(tab => tab.id === closingId)).toBe(false);
  });

  it('does not clear restored view state merely because background hydration is running', async () => {
    const { useStore } = await import('./use-store');
    const { prepareTabForStorage } = await import('./tab-state');
    useStore.setState(state => ({
      tabs: state.tabs.map((tab, index) =>
        index ? tab : { ...tab, input: largeInput, collapsed: new Set(['[]']) },
      ),
    }));
    useStore.getState().bootstrap();
    expect(prepareTabForStorage(useStore.getState().tabs[0]).collapsed).toEqual(new Set(['[]']));
    expect(prepareTabForStorage(useStore.getState().tabs[0]).isParsing).toBe(false);
    pending[0].complete(result);
    expect(useStore.getState().tabs[0].collapsed).toEqual(new Set(['[]']));
  });

  it('cancels timers and workers before a new workspace generation', async () => {
    const { useStore } = await import('./use-store');
    useStore.getState().editInput(largeInput);
    vi.advanceTimersByTime(300);
    useStore.getState().cancelPendingParses();
    useStore.setState(state => ({ resetEpoch: state.resetEpoch + 1 }));
    pending[0].complete(result);
    expect(pending[0].cancel).toHaveBeenCalledOnce();
    expect(useStore.getState().tabs[0].result).toBeNull();
    useStore.getState().editInput(largeInput);
    useStore.getState().cancelPendingParses();
    vi.advanceTimersByTime(300);
    expect(pending).toHaveLength(1);
  });

  it('reset cancels an in-flight parse and undo restarts only the restored input', async () => {
    const { useStore } = await import('./use-store');
    vi.stubGlobal('document', { documentElement: { classList: { toggle: vi.fn() }, dataset: {} } });
    useStore.getState().editInput(largeInput);
    vi.advanceTimersByTime(300);
    const snapshot = { ...useStore.getState(), scroll: new Map(), splitLayout: null };
    const reset = useStore.getState().resetAll();
    expect(pending[0].cancel).toHaveBeenCalledOnce();
    pending[0].complete(result);
    expect(useStore.getState().tabs[0].input).not.toBe(largeInput);
    await vi.runAllTimersAsync();
    await reset;
    const restore = useStore.getState().restoreResetSnapshot(snapshot);
    expect(pending).toHaveLength(2);
    pending[0].complete(result);
    expect(useStore.getState().tabs[0].isParsing).toBe(true);
    pending[1].complete(result);
    expect(useStore.getState().tabs[0].input).toBe(largeInput);
    expect(useStore.getState().tabs[0].isParsing).toBe(false);
    await vi.runAllTimersAsync();
    await restore;
  });
});
