import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type Key,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { Button, Dropdown, Popover, Tabs } from '@heroui/react';
import {
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  Braces,
  ChevronsLeft,
  ChevronsRight,
  CircleX,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import { isTabGuideDismissed } from '../lib/storage';
import {
  closeTabWithUndo,
  getTabDisplayTitle,
  handleTabCloseMenuAction,
  openNewTab,
  openTabRelative,
  type TabCloseMenuAction,
} from '../lib/tab-actions';
import { useShortcutLabels } from '../lib/use-shortcut-labels';
import { useWorkspaceCommand } from '../lib/use-workspace-command';
import { useStore, type JsonTab } from '../store/use-store';
import { ShortcutHint, ShortcutKbd } from './shortcut-hint';
import { TabOnboardingGuide } from './tab-onboarding-guide';
import { Tip } from './tip';

type JsonTabItemProps = {
  tab: JsonTab;
  index: number;
  isCloseDisabled: boolean;
  tabRef?: RefObject<HTMLDivElement | null>;
  onClose: (tab: JsonTab, index: number) => void;
  onOpenContextMenu: (tab: JsonTab, x: number, y: number) => void;
};

const JsonTabItem = ({
  tab,
  index,
  isCloseDisabled,
  tabRef,
  onClose,
  onOpenContextMenu,
}: JsonTabItemProps) => {
  const { getAriaShortcut, getShortcutLabel, getShortcutRef } = useShortcutLabels();
  const displayTitle = getTabDisplayTitle(index);
  const visibleTitle = tab.hasCustomTitle ? tab.title : displayTitle;
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };
  const handleClose = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClose(tab, index);
  };
  const handleContextMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    onOpenContextMenu(tab, event.clientX, event.clientY);
  };

  return (
    <Tabs.Tab
      ref={tabRef}
      id={tab.id}
      aria-label={`${displayTitle}，${tab.title}`}
      className="group gap-1"
      onContextMenu={handleContextMenu}
    >
      <span title={tab.title} className="flex min-w-0 items-center gap-1 overflow-hidden">
        <Braces size={14} className="shrink-0" />
        <span className="max-w-32 min-w-0 truncate text-sm">{visibleTitle}</span>
      </span>
      <button
        type="button"
        aria-label={`关闭 ${displayTitle}`}
        aria-keyshortcuts={getAriaShortcut('closeTab')}
        ref={getShortcutRef('closeTab')}
        disabled={isCloseDisabled}
        title={`关闭 ${displayTitle} · ${getShortcutLabel('closeTab')}`}
        className="grid size-6 shrink-0 place-items-center rounded-full text-foreground/45 outline-none transition-colors hover:bg-foreground/10 hover:text-foreground disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-foreground/45"
        onPointerDown={handlePointerDown}
        onClick={handleClose}
      >
        <X size={12} />
      </button>
      <Tabs.Indicator />
    </Tabs.Tab>
  );
};

type TabContextMenuState = {
  tabId: string;
  x: number;
  y: number;
};

type TabRenamePopoverState = TabContextMenuState;

export const JsonTabs = () => {
  const { getAriaShortcut, getShortcutRef } = useShortcutLabels();
  const tabs = useStore(state => state.tabs);
  const activeTabId = useStore(state => state.activeTabId);
  const setActiveTab = useStore(state => state.setActiveTab);
  const renameTab = useStore(state => state.renameTab);
  const handleSelectionChange = (key: Key) => setActiveTab(String(key));
  const handleCloseTab = (tab: JsonTab) => closeTabWithUndo(tab.id);
  const handleNewTab = () => openNewTab();
  const [contextMenu, setContextMenu] = useState<TabContextMenuState | null>(null);
  const contextMenuRef = useRef<TabContextMenuState | null>(null);
  const [renamePopover, setRenamePopover] = useState<TabRenamePopoverState | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const returnFocusFrameRef = useRef(0);
  const renameReturnFocusFrameRef = useRef(0);
  const [isTabGuideVisible, setIsTabGuideVisible] = useState(() => !isTabGuideDismissed());
  const handleStartRename = (target: TabRenamePopoverState) => {
    const tabIndex = tabs.findIndex(tab => tab.id === target.tabId);
    const tab = tabs[tabIndex];
    if (!tab) return;
    setIsTabGuideVisible(false);
    setRenamePopover(target);
    setRenameDraft(tab.hasCustomTitle ? tab.title : getTabDisplayTitle(tabIndex));
  };
  useWorkspaceCommand('renameTab', () => {
    const bounds = activeTabRef.current?.getBoundingClientRect();
    if (bounds) handleStartRename({ tabId: activeTabId, x: bounds.left, y: bounds.bottom });
  });
  useEffect(() => {
    if (!renamePopover) return;
    let frameId = 0;
    const focusInput = () => {
      if (document.querySelector('[data-slot="dropdown-popover"][data-exiting]')) {
        frameId = requestAnimationFrame(focusInput);
        return;
      }
      renameInputRef.current?.select();
    };
    frameId = requestAnimationFrame(focusInput);
    return () => cancelAnimationFrame(frameId);
  }, [renamePopover]);

  useEffect(
    () => () => {
      cancelAnimationFrame(returnFocusFrameRef.current);
      cancelAnimationFrame(renameReturnFocusFrameRef.current);
    },
    [],
  );

  // 菜单打开期间在捕获阶段接管全局右键:再右键一律关闭自定义菜单,并阻止唤出系统菜单。
  useEffect(() => {
    if (!contextMenu) return;
    const handleDocumentContextMenu = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      contextMenuRef.current = null;
      setContextMenu(null);
    };
    document.addEventListener('contextmenu', handleDocumentContextMenu, true);
    return () => document.removeEventListener('contextmenu', handleDocumentContextMenu, true);
  }, [contextMenu]);

  const handleCloseTabGuide = () => {
    setIsTabGuideVisible(false);
    cancelAnimationFrame(returnFocusFrameRef.current);
    returnFocusFrameRef.current = requestAnimationFrame(() => activeTabRef.current?.focus());
  };
  const handleOpenContextMenu = (tab: JsonTab, x: number, y: number) => {
    setIsTabGuideVisible(false);
    const nextContextMenu = { tabId: tab.id, x, y };
    contextMenuRef.current = nextContextMenu;
    setContextMenu(nextContextMenu);
  };
  const handleContextMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) return;
    const targetElement = event.target instanceof HTMLElement ? event.target : null;
    const tabElement = targetElement?.closest<HTMLElement>('[role="tab"]');
    if (!tabElement || !event.currentTarget.contains(tabElement)) return;
    const tabElements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'),
    );
    const tab = tabs[tabElements.indexOf(tabElement)];
    if (!tab) return;

    event.preventDefault();
    const bounds = tabElement.getBoundingClientRect();
    handleOpenContextMenu(tab, bounds.left + bounds.width / 2, bounds.bottom);
  };
  const handleContextMenuOpenChange = (isOpen: boolean) => {
    if (!isOpen) setContextMenu(null);
  };
  const handleContextMenuAction = (key: Key) => {
    const currentContextMenu = contextMenuRef.current;
    if (!currentContextMenu) return;
    const action = String(key);
    if (action === 'rename') {
      setContextMenu(null);
      handleStartRename(currentContextMenu);
      contextMenuRef.current = null;
      return;
    }
    if (action === 'insert-left' || action === 'insert-right') {
      openTabRelative(currentContextMenu.tabId, action === 'insert-left' ? 'left' : 'right');
      contextMenuRef.current = null;
      setContextMenu(null);
      return;
    }
    handleTabCloseMenuAction(currentContextMenu.tabId, action as TabCloseMenuAction);
    contextMenuRef.current = null;
    setContextMenu(null);
  };
  const handleRenameCancel = () => {
    setRenamePopover(null);
    setRenameDraft('');
    cancelAnimationFrame(renameReturnFocusFrameRef.current);
    const settleRenameFocus = () => {
      if (document.querySelector('[data-slot="popover-dialog"]')) {
        renameReturnFocusFrameRef.current = requestAnimationFrame(settleRenameFocus);
        return;
      }
      activeTabRef.current?.focus();
    };
    renameReturnFocusFrameRef.current = requestAnimationFrame(settleRenameFocus);
  };
  const handleRenameChange = (title: string) => setRenameDraft(title);
  const handleRenameSubmit = () => {
    if (!renamePopover || !renameTab(renamePopover.tabId, renameDraft)) return;
    handleRenameCancel();
  };
  const handleRenamePopoverOpenChange = (isOpen: boolean) => {
    if (!isOpen) handleRenameCancel();
  };
  const handleRenameFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleRenameSubmit();
  };
  const isRenameInvalid = renameDraft.trim().length === 0;
  const tabCollectionKey = tabs.map(tab => tab.id).join(':');
  const contextMenuTabIndex = contextMenu
    ? tabs.findIndex(tab => tab.id === contextMenu.tabId)
    : -1;
  const contextMenuTitle = getTabDisplayTitle(Math.max(contextMenuTabIndex, 0));

  return (
    <nav
      aria-label="JSON 标签"
      className="workspace-tabs relative flex min-w-0 items-center gap-5 px-1"
      onKeyDownCapture={handleContextMenuKeyDown}
    >
      <Tabs
        key={tabCollectionKey}
        variant="secondary"
        selectedKey={activeTabId}
        className="json-tabs min-w-0 flex-1 [&_[data-slot=tabs-tab]]:w-auto [&_[data-slot=tabs-tab]]:flex-none [&_[data-slot=tabs-tab]]:px-0"
        onSelectionChange={handleSelectionChange}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="已打开的 JSON" className="gap-4">
            {tabs.map((tab, index) => (
              <JsonTabItem
                key={tab.id}
                tab={tab}
                index={index}
                isCloseDisabled={tabs.length === 1}
                tabRef={activeTabId === tab.id ? activeTabRef : undefined}
                onClose={handleCloseTab}
                onOpenContextMenu={handleOpenContextMenu}
              />
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      <TabOnboardingGuide isVisible={isTabGuideVisible} onClose={handleCloseTabGuide} />
      <Dropdown isOpen={contextMenu !== null} onOpenChange={handleContextMenuOpenChange}>
        <Dropdown.Trigger
          aria-hidden="true"
          excludeFromTabOrder
          className="pointer-events-none fixed size-px opacity-0"
          style={{ left: contextMenu?.x ?? 0, top: contextMenu?.y ?? 0 }}
        />
        <Dropdown.Popover placement="bottom start">
          <Dropdown.Menu
            aria-label={`${contextMenuTitle} 标签菜单`}
            className="min-w-52"
            onAction={handleContextMenuAction}
          >
            <Dropdown.Item
              id="rename"
              textValue="重命名"
              aria-label="重命名"
              aria-keyshortcuts={
                contextMenu?.tabId === activeTabId ? getAriaShortcut('renameTab') : undefined
              }
              ref={getShortcutRef(contextMenu?.tabId === activeTabId ? 'renameTab' : undefined)}
            >
              <Pencil size={16} />
              <span>重命名</span>
              {contextMenu?.tabId === activeTabId && (
                <ShortcutKbd shortcut="renameTab" className="ml-auto text-xs" variant="light" />
              )}
            </Dropdown.Item>
            <Dropdown.Item
              id="insert-left"
              textValue="向左添加标签"
              aria-label="向左添加标签"
              aria-keyshortcuts={
                contextMenu?.tabId === activeTabId ? getAriaShortcut('insertTabLeft') : undefined
              }
              ref={getShortcutRef(contextMenu?.tabId === activeTabId ? 'insertTabLeft' : undefined)}
              isDisabled={contextMenuTabIndex < 0}
            >
              <BetweenHorizontalStart size={16} />
              <span>向左添加标签</span>
              {contextMenu?.tabId === activeTabId && (
                <ShortcutKbd shortcut="insertTabLeft" className="ml-auto text-xs" variant="light" />
              )}
            </Dropdown.Item>
            <Dropdown.Item
              id="insert-right"
              textValue="向右添加标签"
              aria-label="向右添加标签"
              aria-keyshortcuts={
                contextMenu?.tabId === activeTabId ? getAriaShortcut('insertTabRight') : undefined
              }
              ref={getShortcutRef(
                contextMenu?.tabId === activeTabId ? 'insertTabRight' : undefined,
              )}
              isDisabled={contextMenuTabIndex < 0}
            >
              <BetweenHorizontalEnd size={16} />
              <span>向右添加标签</span>
              {contextMenu?.tabId === activeTabId && (
                <ShortcutKbd
                  shortcut="insertTabRight"
                  className="ml-auto text-xs"
                  variant="light"
                />
              )}
            </Dropdown.Item>
            <Dropdown.Item
              id="close"
              textValue="关闭"
              aria-label="关闭"
              aria-keyshortcuts={
                contextMenu?.tabId === activeTabId ? getAriaShortcut('closeTab') : undefined
              }
              ref={getShortcutRef(contextMenu?.tabId === activeTabId ? 'closeTab' : undefined)}
              isDisabled={tabs.length === 1}
            >
              <X size={16} />
              <span>关闭</span>
              {contextMenu?.tabId === activeTabId && (
                <ShortcutKbd shortcut="closeTab" className="ml-auto text-xs" variant="light" />
              )}
            </Dropdown.Item>
            <Dropdown.Item
              id="close-left"
              textValue="关闭左侧全部"
              aria-label="关闭左侧全部"
              aria-keyshortcuts={
                contextMenu?.tabId === activeTabId ? getAriaShortcut('closeTabsLeft') : undefined
              }
              ref={getShortcutRef(contextMenu?.tabId === activeTabId ? 'closeTabsLeft' : undefined)}
              isDisabled={contextMenuTabIndex <= 0}
            >
              <ChevronsLeft size={16} />
              <span>关闭左侧全部</span>
              {contextMenu?.tabId === activeTabId && (
                <ShortcutKbd shortcut="closeTabsLeft" className="ml-auto text-xs" variant="light" />
              )}
            </Dropdown.Item>
            <Dropdown.Item
              id="close-right"
              textValue="关闭右侧全部"
              aria-label="关闭右侧全部"
              aria-keyshortcuts={
                contextMenu?.tabId === activeTabId ? getAriaShortcut('closeTabsRight') : undefined
              }
              ref={getShortcutRef(
                contextMenu?.tabId === activeTabId ? 'closeTabsRight' : undefined,
              )}
              isDisabled={contextMenuTabIndex < 0 || contextMenuTabIndex === tabs.length - 1}
            >
              <ChevronsRight size={16} />
              <span>关闭右侧全部</span>
              {contextMenu?.tabId === activeTabId && (
                <ShortcutKbd
                  shortcut="closeTabsRight"
                  className="ml-auto text-xs"
                  variant="light"
                />
              )}
            </Dropdown.Item>
            <Dropdown.Item
              id="close-others"
              textValue="关闭其它全部"
              aria-label="关闭其它全部"
              aria-keyshortcuts={
                contextMenu?.tabId === activeTabId ? getAriaShortcut('closeOtherTabs') : undefined
              }
              ref={getShortcutRef(
                contextMenu?.tabId === activeTabId ? 'closeOtherTabs' : undefined,
              )}
              isDisabled={tabs.length === 1}
            >
              <CircleX size={16} />
              <span>关闭其它全部</span>
              {contextMenu?.tabId === activeTabId && (
                <ShortcutKbd
                  shortcut="closeOtherTabs"
                  className="ml-auto text-xs"
                  variant="light"
                />
              )}
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      <Popover.Root isOpen={renamePopover !== null} onOpenChange={handleRenamePopoverOpenChange}>
        <Popover.Trigger
          aria-hidden="true"
          tabIndex={-1}
          className="pointer-events-none fixed size-px opacity-0"
          style={{ left: renamePopover?.x ?? 0, top: renamePopover?.y ?? 0 }}
        />
        <Popover.Content placement="bottom start" offset={8} className="w-72">
          <Popover.Arrow />
          <Popover.Dialog className="p-4 outline-none">
            <Popover.Heading className="flex items-center gap-2 text-sm font-semibold">
              <Pencil size={15} className="text-primary" />
              重命名标签
            </Popover.Heading>
            <form className="mt-3" onSubmit={handleRenameFormSubmit}>
              <label htmlFor="tab-rename-input" className="text-xs font-medium text-muted">
                标签名称
              </label>
              <input
                ref={renameInputRef}
                id="tab-rename-input"
                value={renameDraft}
                aria-invalid={isRenameInvalid || undefined}
                autoComplete="off"
                className="mt-1.5 h-9 w-full rounded-xl border border-default bg-background px-3 text-sm outline-none transition-colors focus:border-primary aria-invalid:border-danger"
                onChange={event => handleRenameChange(event.currentTarget.value)}
              />
              {isRenameInvalid ? (
                <p className="mt-1.5 text-xs text-danger">标签名称不能为空</p>
              ) : null}
              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" size="sm" variant="tertiary" onPress={handleRenameCancel}>
                  取消
                </Button>
                <Button type="submit" size="sm" variant="primary" isDisabled={isRenameInvalid}>
                  保存
                </Button>
              </div>
            </form>
          </Popover.Dialog>
        </Popover.Content>
      </Popover.Root>
      <Tip
        ariaKeyShortcuts={getAriaShortcut('newTab')}
        label={<ShortcutHint shortcut="newTab">新建标签</ShortcutHint>}
      >
        <Button
          isIconOnly
          size="sm"
          aria-label="新建标签"
          aria-keyshortcuts={getAriaShortcut('newTab')}
          ref={getShortcutRef('newTab')}
          className="shrink-0"
          onPress={handleNewTab}
        >
          <Plus size={14} />
        </Button>
      </Tip>
    </nav>
  );
};
