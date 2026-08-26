import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { DEFAULT_TOAST_TIMEOUT, ToastQueue } from '@heroui/react'
import type { ToastContentValue } from '@heroui/react'

type ToastOptions = Omit<ToastContentValue, 'title'> & {
  timeout?: number
  onClose?: () => void
}

type ToastVariant = NonNullable<ToastContentValue['variant']>
type QueueUpdate = () => void

const MAX_VISIBLE_TOASTS = 3
const DEFAULT_VARIANT: ToastVariant = 'default'

let isApplyingTransitionUpdate = false
let toastSequence = 0
let transitionChain: Promise<void> | null = null

const applyQueueUpdate = (update: QueueUpdate) => {
  isApplyingTransitionUpdate = true
  try {
    update()
  } finally {
    isApplyingTransitionUpdate = false
  }
}

const startQueueTransition = (update: QueueUpdate): Promise<void> => {
  if (typeof document === 'undefined' || !document.startViewTransition) {
    flushSync(() => applyQueueUpdate(update))
    return Promise.resolve()
  }

  const transition = document.startViewTransition(() => {
    flushSync(() => applyQueueUpdate(update))
  })
  void transition.ready.catch(() => undefined)
  return transition.finished.catch(() => undefined)
}

const scheduleQueueTransition = (update: QueueUpdate) => {
  const start = () => startQueueTransition(update)
  const pending = transitionChain ? transitionChain.then(start, start) : start()
  const tracked = pending.finally(() => {
    if (transitionChain === tracked) transitionChain = null
  })
  transitionChain = tracked
}

export const toastQueue = new ToastQueue<ToastContentValue>({
  maxVisibleToasts: MAX_VISIBLE_TOASTS,
  wrapUpdate: update => {
    if (isApplyingTransitionUpdate) {
      update()
      return
    }
    scheduleQueueTransition(update)
  },
})

const queueKeys = new Map<string, string>()

const notify = (title: ReactNode, variant: ToastVariant, options?: ToastOptions) => {
  const key = `deep-brace-json-toast-${++toastSequence}`
  scheduleQueueTransition(() => {
    const queueKey = toastQueue.add(
      {
        actionProps: options?.actionProps,
        description: options?.description,
        indicator: options?.indicator,
        isLoading: options?.isLoading,
        title,
        variant: options?.variant ?? variant,
      },
      {
        onClose: () => {
          queueKeys.delete(key)
          options?.onClose?.()
        },
        timeout: options?.timeout ?? DEFAULT_TOAST_TIMEOUT,
      },
    )
    queueKeys.set(key, queueKey)
  })
  return key
}

const toastBase = (title: ReactNode, options?: ToastOptions) =>
  notify(title, DEFAULT_VARIANT, options)

export const toast = Object.assign(toastBase, {
  clear: () => {
    scheduleQueueTransition(() => {
      toastQueue.clear()
      queueKeys.clear()
    })
  },
  close: (key: string) => {
    scheduleQueueTransition(() => {
      const queueKey = queueKeys.get(key)
      if (queueKey) toastQueue.close(queueKey)
    })
  },
  danger: (title: ReactNode, options?: ToastOptions) => notify(title, 'danger', options),
  info: (title: ReactNode, options?: ToastOptions) => notify(title, 'accent', options),
  success: (title: ReactNode, options?: ToastOptions) => notify(title, 'success', options),
  warning: (title: ReactNode, options?: ToastOptions) => notify(title, 'warning', options),
})
