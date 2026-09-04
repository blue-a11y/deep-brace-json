/** 瞬时 UI 命令，不进入持久化状态；组件负责本地弹层与编辑器焦点。 */
export type WorkspaceCommand =
  'focusEditor' | 'renameTab' | 'openTheme' | 'openSettings' | 'openShortcuts';

const commandTarget = new EventTarget();

export const dispatchWorkspaceCommand = (command: WorkspaceCommand) => {
  commandTarget.dispatchEvent(new Event(command));
};

export const subscribeWorkspaceCommand = (command: WorkspaceCommand, handler: () => void) => {
  commandTarget.addEventListener(command, handler);
  return () => commandTarget.removeEventListener(command, handler);
};
