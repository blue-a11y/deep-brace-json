import type { ResetSnapshot } from '../store/types';
import { useStore } from '../store/use-store';
import { getSplitLayoutStorageKey } from './storage';
import { captureActiveTabScrollPositions, captureTabScrollSnapshot } from './tab-scroll';
import { toast } from './toast';

const RESET_TOAST_TIMEOUT = 8000;

const readSplitLayoutStorage = () => {
  try {
    return localStorage.getItem(getSplitLayoutStorageKey());
  } catch {
    return null;
  }
};

/** 重置全部数据并弹出可撤销的 Toast;撤销窗口内可完整恢复重置前的
   标签页、偏好、滚动位置与分栏布局(根容器 key 变化驱动整树重挂载) */
export const resetAllWithUndo = () => {
  const { tabs, activeTabId, isDark, indentSize, treeTheme, shouldShowFullLongStrings } =
    useStore.getState();
  // 冻结并把实时滚动位置写入记忆后拍快照,保证撤销时连滚动位置一起还原
  captureActiveTabScrollPositions();
  const snapshot: ResetSnapshot = {
    tabs,
    activeTabId,
    isDark,
    indentSize,
    treeTheme,
    shouldShowFullLongStrings,
    scroll: captureTabScrollSnapshot(),
    splitLayout: readSplitLayoutStorage(),
  };

  // 不用 flushSync:整树重挂载较重,同步渲染会卡住点击响应,交给 React 正常调度
  useStore.getState().resetAll();

  let toastKey = '';
  const handleUndo = () => {
    useStore.getState().restoreResetSnapshot(snapshot);
    toast.close(toastKey);
  };
  toastKey = toast('已重置全部数据', {
    actionProps: {
      children: '撤销',
      className: 'tab-close-toast-action h-7 rounded-lg px-3 text-xs',
      onPress: handleUndo,
      size: 'sm',
      variant: 'tertiary',
    },
    timeout: RESET_TOAST_TIMEOUT,
  });
};
