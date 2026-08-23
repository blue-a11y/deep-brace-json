'use client'

/**
 * 对照 HeroUI v3 官方 Toast 源码复刻的实现。
 * DOM 结构与类名与官方渲染产物一致(.toast-region / .toast / .toast--success /
 * .toast__title 等),视觉由 @heroui/styles 的官方 CSS 直接命中;
 * 行为由本模块实现:队列管理、堆叠分层(inline translate/scale)、溢出与退场渐隐
 * (data-hidden + CSS transition)、超时自动消失、region 悬停暂停计时。
 * 官方版本依赖 react-aria-components 的 UNSTABLE API + View Transitions,
 * 在部分环境下无视觉效果,故有此复刻。
 */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { create } from 'zustand'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

export type ToastVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger'

const MAX_VISIBLE = 3
const DEFAULT_TIMEOUT = 4000
const GAP = 12
const SCALE_FACTOR = 0.05
const EXIT_MS = 380 // 平移退场动画 350ms + 余量

interface ToastItem {
  key: string
  title: ReactNode
  description?: ReactNode
  variant: ToastVariant
  /** 0 表示常驻 */
  timeout: number
  /** 退场中(超时/关闭),渐隐后移除 */
  exiting?: boolean
}

interface ToastState {
  items: ToastItem[]
  add: (item: Omit<ToastItem, 'key' | 'exiting'>) => string
  close: (key: string) => void
  clear: () => void
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()
/** add 时刻记录,供悬停暂停时计算剩余时间 */
const startedAt = new Map<string, number>()
let seq = 0

const scheduleRemove = (key: string, ms: number) => {
  const t = setTimeout(() => {
    timers.delete(key)
    useToastStore.setState(s => ({ items: s.items.filter(i => i.key !== key) }))
  }, ms)
  timers.set(key, t)
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  add: item => {
    const key = `toast-${++seq}`
    startedAt.set(key, Date.now())
    set(s => ({ items: [{ ...item, key }, ...s.items] }))
    if (item.timeout > 0) {
      // 超时 → 进入渐隐 → EXIT_MS 后移除
      const t = setTimeout(() => get().close(key), item.timeout)
      timers.set(key, t)
    }
    return key
  },
  close: key => {
    const item = get().items.find(i => i.key === key)
    if (!item || item.exiting) return
    const t = timers.get(key)
    if (t) clearTimeout(t)
    set(s => ({
      items: s.items.map(i => (i.key === key ? { ...i, exiting: true } : i)),
    }))
    scheduleRemove(key, EXIT_MS)
  },
  clear: () => {
    for (const t of timers.values()) clearTimeout(t)
    timers.clear()
    set({ items: [] })
  },
}))

/* ---------------- toast() 命令式 API(与 HeroUI 签名兼容) ---------------- */

interface ToastOptions {
  description?: ReactNode
  timeout?: number
}

function notify(title: ReactNode, variant: ToastVariant, options?: ToastOptions) {
  return useToastStore.getState().add({
    title,
    description: options?.description,
    variant,
    timeout: options?.timeout ?? DEFAULT_TIMEOUT,
  })
}

export const toast = Object.assign(
  (title: ReactNode, options?: ToastOptions) => notify(title, 'default', options),
  {
    success: (title: ReactNode, options?: ToastOptions) => notify(title, 'success', options),
    danger: (title: ReactNode, options?: ToastOptions) => notify(title, 'danger', options),
    info: (title: ReactNode, options?: ToastOptions) => notify(title, 'accent', options),
    warning: (title: ReactNode, options?: ToastOptions) => notify(title, 'warning', options),
    clear: () => useToastStore.getState().clear(),
    close: (key: string) => useToastStore.getState().close(key),
  },
)

/* ---------------- 图标(对齐官方 data-slot,命中官方 CSS 尺寸规则) ---------------- */

const ICONS: Record<ToastVariant, typeof Info> = {
  default: Info,
  accent: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
}

/* ---------------- Region 组件(应用根挂载一次) ---------------- */

export function ToastRegion() {
  const items = useToastStore(s => s.items)
  const close = useToastStore(s => s.close)
  const frontRef = useRef<HTMLDivElement | null>(null)
  const [frontHeight, setFrontHeight] = useState(0)

  // region 悬停暂停/恢复计时(对齐官方 pauseAll/resumeAll 行为)
  const pauseRef = useRef(false)
  const remainingRef = useRef(new Map<string, number>())
  const onMouseEnter = () => {
    if (pauseRef.current) return
    pauseRef.current = true
    for (const item of items) {
      if (item.exiting || item.timeout <= 0) continue
      const t = timers.get(item.key)
      if (!t) continue
      clearTimeout(t)
      timers.delete(item.key)
      // 记录剩余时间(以 add 时刻近似;exiting 项不暂停)
      remainingRef.current.set(item.key, Math.max(item.timeout - (Date.now() - startedAt.get(item.key)!), 300))
    }
  }
  const onMouseLeave = () => {
    pauseRef.current = false
    for (const [key, remain] of remainingRef.current) {
      const t = setTimeout(() => useToastStore.getState().close(key), remain)
      timers.set(key, t)
    }
    remainingRef.current.clear()
  }

  useEffect(() => {
    const el = frontRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setFrontHeight(el.offsetHeight))
    ro.observe(el)
    setFrontHeight(el.offsetHeight)
    return () => ro.disconnect()
  }, [items[0]?.key])

  return (
    <div
      className="toast-region toast-region--bottom"
      data-slot="toast-region"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={
        {
          '--toast-width': '460px',
          '--gap': `${GAP}px`,
          '--scale-factor': SCALE_FACTOR,
          '--placement': 'bottom',
        } as React.CSSProperties
      }
    >
      {items.map((item, index) => {
        const isHidden = index >= MAX_VISIBLE || !!item.exiting
        const Icon = ICONS[item.variant]
        return (
          <div
            key={item.key}
            aria-hidden={isHidden}
            className={`toast toast--bottom toast--${item.variant}`}
            data-slot="toast"
            data-frontmost={index === 0}
            data-hidden={isHidden}
            data-exiting={!!item.exiting}
            data-index={index}
            ref={index === 0 ? frontRef : undefined}
            style={
              (item.exiting
                ? // 退场:平移滑出屏底(transition 承担动画)
                  {
                    translate: '0 100%',
                    opacity: 0,
                    pointerEvents: 'none',
                    zIndex: items.length - index,
                  }
                : {
                    scale: `${1 - index * SCALE_FACTOR}`,
                    translate: `0 ${-index * GAP}px 0`,
                    zIndex: items.length - index,
                    opacity: isHidden ? 0 : 1,
                    pointerEvents: isHidden ? 'none' : 'auto',
                    ...(index > 0 && frontHeight
                      ? ({ '--front-height': `${frontHeight}px` } as React.CSSProperties)
                      : null),
                  }) as React.CSSProperties
            }
          >
            <div className="toast__indicator" data-slot="toast-indicator">
              <Icon data-slot="toast-default-icon" />
            </div>
            <div className="toast__content" data-slot="toast-content">
              <div className="toast__title" data-slot="toast-title">
                {item.title}
              </div>
              {item.description ? (
                <div className="toast__description" data-slot="toast-description">
                  {item.description}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="关闭"
              className="close-button toast__close-button"
              data-slot="toast-close"
              onClick={() => close(item.key)}
            >
              <X data-slot="close-button-icon" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
