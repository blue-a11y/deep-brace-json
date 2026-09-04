import { flushSync } from 'react-dom';
import type { JsonTabRestoreTarget } from '../store/types';
import { useStore } from '../store/use-store';
import { toast } from './toast';

export const getTabDisplayTitle = (index: number) => `Brace ${index + 1}`;

export type TabCloseMenuAction = 'close' | 'close-left' | 'close-right' | 'close-others';

export const openNewTab = () => {
  useStore.getState().openTab();
  toast.info('已新建标签');
};

export type TabInsertDirection = 'left' | 'right';

/** 在指定标签的左侧或右侧插入新标签并激活它 */
export const openTabRelative = (tabId: string, direction: TabInsertDirection) => {
  const index = useStore.getState().tabs.findIndex(tab => tab.id === tabId);
  if (index < 0) return false;
  useStore.getState().openTab('', undefined, direction === 'left' ? index : index + 1);
  toast.info('已新建标签');
  return true;
};

const getRestoreTarget = (tabIds: string[], index: number): JsonTabRestoreTarget => ({
  index,
  previousTabId: tabIds[index - 1],
  nextTabId: tabIds[index + 1],
});

const closeTabsWithUndo = (tabIds: string[], successMessage: string) => {
  const { tabs, activeTabId, closeTabs } = useStore.getState();
  const idsToClose = new Set(tabIds);
  const originalTabIds = tabs.map(tab => tab.id);
  const closedTabs = tabs.flatMap((tab, index) =>
    idsToClose.has(tab.id) ? [{ tab, target: getRestoreTarget(originalTabIds, index) }] : [],
  );
  if (closedTabs.length === 0 || closedTabs.length >= tabs.length) return false;

  flushSync(() => closeTabs(closedTabs.map(({ tab }) => tab.id)));
  let toastKey = '';
  const handleUndo = () => {
    flushSync(() => {
      for (const { tab, target } of closedTabs) {
        // 不逐项切换活动标签,避免最终标签未变时留下无法解除的滚动冻结。
        useStore.getState().restoreTab(tab, target, false);
      }
      const restoredState = useStore.getState();
      if (restoredState.tabs.some(tab => tab.id === activeTabId)) {
        restoredState.setActiveTab(activeTabId);
      }
    });
    toast.close(toastKey);
  };
  toastKey = toast(successMessage, {
    actionProps: {
      children: '撤销',
      className: 'tab-close-toast-action h-7 rounded-lg px-3 text-xs',
      onClick: handleUndo,
      size: 'sm',
      variant: 'tertiary',
    },
  });
  return true;
};

export const closeTabWithUndo = (tabId: string) => {
  const tabs = useStore.getState().tabs;
  const index = tabs.findIndex(tab => tab.id === tabId);
  if (index < 0) return false;
  return closeTabsWithUndo([tabId], `已关闭 ${getTabDisplayTitle(index)}`);
};

export const handleTabCloseMenuAction = (tabId: string, action: TabCloseMenuAction) => {
  if (action === 'close') return closeTabWithUndo(tabId);

  const tabs = useStore.getState().tabs;
  const targetIndex = tabs.findIndex(tab => tab.id === tabId);
  if (targetIndex < 0) return false;
  const tabIds = tabs.map(tab => tab.id);
  const idsToClose =
    action === 'close-left'
      ? tabIds.slice(0, targetIndex)
      : action === 'close-right'
        ? tabIds.slice(targetIndex + 1)
        : tabIds.filter(id => id !== tabId);
  const successMessage =
    action === 'close-left'
      ? `已关闭左侧 ${idsToClose.length} 个标签`
      : action === 'close-right'
        ? `已关闭右侧 ${idsToClose.length} 个标签`
        : `已关闭其它 ${idsToClose.length} 个标签`;
  return closeTabsWithUndo(idsToClose, successMessage);
};
