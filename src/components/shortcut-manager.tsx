import { useEffect } from 'react';
import { findShortcut, type ShortcutId } from '../lib/shortcuts';
import {
  closeTabWithUndo,
  handleTabCloseMenuAction,
  openNewTab,
  openTabRelative,
} from '../lib/tab-actions';
import { dispatchWorkspaceCommand } from '../lib/workspace-commands';
import { selectActiveTab, useStore } from '../store/use-store';

const activateSiblingTab = (offset: number) => {
  const { tabs, activeTabId, setActiveTab } = useStore.getState();
  const index = tabs.findIndex(tab => tab.id === activeTabId);
  if (index < 0 || tabs.length < 2) return;
  setActiveTab(tabs[(index + offset + tabs.length) % tabs.length].id);
};

const toggleCollapse = () => {
  const state = useStore.getState();
  const activeTab = selectActiveTab(state);
  if (!activeTab.result?.ok) return;
  if (activeTab.collapsed.size > 0) state.expandAll();
  else state.collapseAll();
};

const shortcutHandlers: Record<ShortcutId, () => void> = {
  focusEditor: () => dispatchWorkspaceCommand('focusEditor'),
  renameTab: () => dispatchWorkspaceCommand('renameTab'),
  openTheme: () => dispatchWorkspaceCommand('openTheme'),
  openSettings: () => dispatchWorkspaceCommand('openSettings'),
  openShortcuts: () => dispatchWorkspaceCommand('openShortcuts'),
  toggleTheme: () => useStore.getState().toggleTheme(),
  insertTabLeft: () => openTabRelative(useStore.getState().activeTabId, 'left'),
  insertTabRight: () => openTabRelative(useStore.getState().activeTabId, 'right'),
  closeTabsLeft: () => handleTabCloseMenuAction(useStore.getState().activeTabId, 'close-left'),
  closeTabsRight: () => handleTabCloseMenuAction(useStore.getState().activeTabId, 'close-right'),
  closeOtherTabs: () => handleTabCloseMenuAction(useStore.getState().activeTabId, 'close-others'),
  format: () => useStore.getState().format(),
  minify: () => useStore.getState().minify(),
  escape: () => useStore.getState().escape(),
  unescape: () => useStore.getState().unescape(),
  newTab: openNewTab,
  closeTab: () => closeTabWithUndo(useStore.getState().activeTabId),
  previousTab: () => activateSiblingTab(-1),
  nextTab: () => activateSiblingTab(1),
  toggleWrap: () => useStore.getState().toggleWrap(),
  toggleCollapse,
};

const isOverlayTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  Boolean(target.closest('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]'));

export const ShortcutManager = () => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing) return;
      if (isOverlayTarget(event.target)) return;
      const shortcut = findShortcut(event, useStore.getState().shortcutModifiers);
      if (!shortcut) return;
      event.preventDefault();
      event.stopPropagation();
      shortcutHandlers[shortcut]();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  return null;
};
