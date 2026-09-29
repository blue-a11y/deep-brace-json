import { useEffect, useEffectEvent } from 'react';
import { subscribeWorkspaceCommand, type WorkspaceCommand } from './workspace-commands';

export const useWorkspaceCommand = (command: WorkspaceCommand, handler: () => void) => {
  const handleCommand = useEffectEvent(handler);
  useEffect(() => subscribeWorkspaceCommand(command, () => handleCommand()), [command]);
};
