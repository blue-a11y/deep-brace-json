export type TabScrollArea = 'editor' | 'tree'

type ScrollPosition = {
  left: number
  top: number
}

type ActiveScrollElement = {
  element: HTMLElement
  frozen: boolean
  latest: ScrollPosition
  tabId: string
}

const scrollPositions = new Map<string, ScrollPosition>()
const activeScrollElements = new Map<TabScrollArea, ActiveScrollElement>()

const getScrollKey = (tabId: string, area: TabScrollArea) => `${tabId}:${area}`

const readScrollPosition = (element: HTMLElement): ScrollPosition => ({
  left: element.scrollLeft,
  top: element.scrollTop,
})

export const captureActiveTabScrollPositions = () => {
  for (const [area, active] of activeScrollElements) {
    active.latest = readScrollPosition(active.element)
    active.frozen = true
    scrollPositions.set(getScrollKey(active.tabId, area), active.latest)
  }
}

export const bindTabScrollPosition = (
  tabId: string,
  area: TabScrollArea,
  element: HTMLElement,
) => {
  const key = getScrollKey(tabId, area)
  const saved = scrollPositions.get(key)
  let restoreFrame: number | null = null
  let restoring = Boolean(saved)
  const active = {
    element,
    frozen: false,
    latest: saved ?? readScrollPosition(element),
    tabId,
  }
  activeScrollElements.set(area, active)

  const restore = () => {
    if (!saved) return
    element.scrollLeft = saved.left
    element.scrollTop = saved.top
  }

  const save = () => {
    if (restoring || active.frozen) return
    active.latest = readScrollPosition(element)
    scrollPositions.set(key, active.latest)
  }

  if (saved) {
    let attempts = 0
    const restoreWhenReady = () => {
      restore()
      attempts += 1

      const leftReady = saved.left === 0
        || Math.abs(element.scrollLeft - saved.left) < 1
      const topReady = saved.top === 0
        || Math.abs(element.scrollTop - saved.top) < 1

      if ((leftReady && topReady) || attempts >= 20) {
        restoring = false
        restoreFrame = null
        return
      }

      restoreFrame = window.requestAnimationFrame(restoreWhenReady)
    }

    restoreWhenReady()
  }

  element.addEventListener('scroll', save, { passive: true })

  return () => {
    if (!restoring) scrollPositions.set(key, active.latest)
    if (activeScrollElements.get(area)?.element === element) {
      activeScrollElements.delete(area)
    }
    if (restoreFrame !== null) window.cancelAnimationFrame(restoreFrame)
    element.removeEventListener('scroll', save)
  }
}
