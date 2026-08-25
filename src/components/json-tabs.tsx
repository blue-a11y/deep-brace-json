import type { Key, MouseEvent, PointerEvent } from 'react'
import { flushSync } from 'react-dom'
import { Button, Tabs } from '@heroui/react'
import { Braces, Plus, X } from 'lucide-react'

import { toast } from '../lib/toast'
import { useStore, type JsonTab } from '../store/useStore'

type IJsonTabItemProps = {
  tab: JsonTab
  index: number
  closeDisabled: boolean
  onClose: (tab: JsonTab, index: number) => void
}

const getTabDisplayTitle = (index: number) => `Brace ${index + 1}`

const JsonTabItem = ({ tab, index, closeDisabled, onClose }: IJsonTabItemProps) => {
  const displayTitle = getTabDisplayTitle(index)
  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }
  const handleClose = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onClose(tab, index)
  }

  return (
    <Tabs.Tab
      id={tab.id}
      aria-label={`${displayTitle}，${tab.title}`}
      className="group gap-1"
    >
      <span title={tab.title} className="flex min-w-0 items-center gap-1 overflow-hidden">
        <Braces size={14} className="shrink-0" />
        <span className="min-w-0 truncate text-sm">{displayTitle}</span>
      </span>
      <button
        type="button"
        aria-label={`关闭 ${displayTitle}`}
        disabled={closeDisabled}
        className="grid size-6 shrink-0 place-items-center rounded-full text-foreground/45 outline-none transition-colors hover:bg-foreground/10 hover:text-foreground disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-foreground/45"
        onPointerDown={handlePointerDown}
        onClick={handleClose}
      >
        <X size={12} />
      </button>
      <Tabs.Indicator />
    </Tabs.Tab>
  )
}

export const JsonTabs = () => {
  const tabs = useStore(state => state.tabs)
  const activeTabId = useStore(state => state.activeTabId)
  const setActiveTab = useStore(state => state.setActiveTab)
  const openTab = useStore(state => state.openTab)
  const closeTab = useStore(state => state.closeTab)
  const restoreTab = useStore(state => state.restoreTab)
  const handleNewTab = () => {
    openTab()
    toast.info('已新建标签')
  }
  const handleSelectionChange = (key: Key) => setActiveTab(String(key))
  const handleCloseTab = (tab: JsonTab, index: number) => {
    const target = {
      index,
      previousTabId: tabs[index - 1]?.id,
      nextTabId: tabs[index + 1]?.id,
    }
    // 先完成面板切换，避免 Toast 的 View Transition 捕获整页重绘。
    flushSync(() => closeTab(tab.id))
    let toastKey = ''
    const handleUndo = () => {
      flushSync(() => restoreTab(tab, target))
      toast.close(toastKey)
    }
    toastKey = toast(`已关闭 ${getTabDisplayTitle(index)}`, {
      actionProps: {
        children: '撤销',
        className: 'tab-close-toast-action h-7 rounded-lg px-3 text-xs',
        onPress: handleUndo,
        size: 'sm',
        variant: 'tertiary',
      },
    })
  }
  const tabCollectionKey = tabs.map(tab => tab.id).join(':')

  return (
    <nav aria-label="JSON 标签" className="-mt-1 mb-1 flex min-w-0 items-center gap-1 px-1">
      <Tabs
        key={tabCollectionKey}
        variant="secondary"
        selectedKey={activeTabId}
        className="min-w-0 flex-1 [&_[data-slot=tabs-tab]]:w-auto [&_[data-slot=tabs-tab]]:flex-none [&_[data-slot=tabs-tab]]:px-0"
        onSelectionChange={handleSelectionChange}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="已打开的 JSON" className="gap-4">
            {tabs.map((tab, index) => (
              <JsonTabItem
                key={tab.id}
                tab={tab}
                index={index}
                closeDisabled={tabs.length === 1}
                onClose={handleCloseTab}
              />
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      <Button
        isIconOnly
        size="sm"
        aria-label="新建标签"
        className="shrink-0"
        onPress={handleNewTab}
      >
        <Plus size={14} />
      </Button>
    </nav>
  )
}
