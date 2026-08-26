import { flushSync } from 'react-dom';
import { useStore } from '../store/use-store';
import { toast } from './toast';

export const getTabDisplayTitle = (index: number) => `Brace ${index + 1}`;

export const openNewTab = () => {
  useStore.getState().openTab();
  toast.info('已新建标签');
};

export const closeTabWithUndo = (tabId: string) => {
  const { tabs, closeTab, restoreTab } = useStore.getState();
  if (tabs.length === 1) return false;
  const index = tabs.findIndex(tab => tab.id === tabId);
  if (index < 0) return false;
  const tab = tabs[index];
  const target = {
    index,
    previousTabId: tabs[index - 1]?.id,
    nextTabId: tabs[index + 1]?.id,
  };

  flushSync(() => closeTab(tab.id));
  let toastKey = '';
  const handleUndo = () => {
    flushSync(() => restoreTab(tab, target));
    toast.close(toastKey);
  };
  toastKey = toast(`已关闭 ${getTabDisplayTitle(index)}`, {
    actionProps: {
      children: '撤销',
      className: 'tab-close-toast-action h-7 rounded-lg px-3 text-xs',
      onPress: handleUndo,
      size: 'sm',
      variant: 'tertiary',
    },
  });
  return true;
};
