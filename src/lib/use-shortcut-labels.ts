import { useStore } from '../store/use-store';
import { getAriaShortcut, getShortcutLabel, type ShortcutId } from './shortcuts';

/** 提示与实际按键共用偏好，修改后同步更新无障碍属性。 */
export const useShortcutLabels = () => {
  const modifiers = useStore(state => state.shortcutModifiers);
  return {
    getAriaShortcut: (id: ShortcutId) => getAriaShortcut(id, modifiers),
    getShortcutLabel: (id: ShortcutId) => getShortcutLabel(id, modifiers),
    // 当前 React Aria 会过滤 aria-keyshortcuts，必须在真实元素挂载后补齐。
    getShortcutRef: (id: ShortcutId | undefined) => (element: HTMLElement | null) => {
      if (!element) return;
      if (id) element.setAttribute('aria-keyshortcuts', getAriaShortcut(id, modifiers));
      else element.removeAttribute('aria-keyshortcuts');
    },
  };
};
