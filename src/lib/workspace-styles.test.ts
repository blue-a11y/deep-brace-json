import { afterEach, expect, test, vi } from 'vitest';
import { waitForWorkspaceStyles } from './workspace-styles';

const stubStyles = (state?: string) => {
  const link = Object.assign(new EventTarget(), { dataset: { workspaceStyles: state } });
  vi.stubGlobal('document', { querySelectorAll: () => (state ? [link] : []) });
  vi.stubGlobal('window', { setTimeout, clearTimeout });
  return link;
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test('开发模式没有独立样式屏障时直接继续启动', async () => {
  stubStyles();
  await expect(waitForWorkspaceStyles()).resolves.toEqual([]);
});

test('脚本执行前已加载的样式不会再次等待', async () => {
  stubStyles('ready');
  await expect(waitForWorkspaceStyles()).resolves.toEqual([undefined]);
});

test('样式后加载时等待 load 并释放监听和超时', async () => {
  vi.useFakeTimers();
  const link = stubStyles('pending');
  const removeListener = vi.spyOn(link, 'removeEventListener');
  const result = waitForWorkspaceStyles();
  link.dispatchEvent(new Event('load'));
  await expect(result).resolves.toEqual([undefined]);
  expect(removeListener).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});

test('脚本执行前已失败的样式进入可重试降级', async () => {
  stubStyles('error');
  await expect(waitForWorkspaceStyles()).rejects.toThrow('工作区样式加载失败');
});

test('样式请求失败时拒绝启动且不遗留计时器', async () => {
  vi.useFakeTimers();
  const link = stubStyles('pending');
  const assertion = expect(waitForWorkspaceStyles()).rejects.toThrow('工作区样式加载失败');
  link.dispatchEvent(new Event('error'));
  await assertion;
  expect(vi.getTimerCount()).toBe(0);
});

test('样式长时间无响应会超时并清理资源', async () => {
  vi.useFakeTimers();
  const link = stubStyles('pending');
  const removeListener = vi.spyOn(link, 'removeEventListener');
  const assertion = expect(waitForWorkspaceStyles()).rejects.toThrow('工作区样式加载失败');
  await vi.advanceTimersByTimeAsync(30_000);
  await assertion;
  expect(removeListener).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
});
