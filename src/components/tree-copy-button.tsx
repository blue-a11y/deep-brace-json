import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Check, Copy } from 'lucide-react'
import { serializeForCopy } from '../lib/indent'
import { toast } from '../lib/toast'
import { useStore } from '../store/use-store'

const COPY_FEEDBACK_DURATION_MS = 1500

type TreeCopyButtonProps = {
  value: unknown
}

export const TreeCopyButton = ({ value }: TreeCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false)
  const feedbackTimerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current)
  }, [])

  const handleCopy = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    try {
      const text = serializeForCopy(value, useStore.getState().indentSize)
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      toast.success(typeof value === 'string' ? '已复制值' : '已复制节点')
      feedbackTimerRef.current = window.setTimeout(() => {
        setIsCopied(false)
        feedbackTimerRef.current = null
      }, COPY_FEEDBACK_DURATION_MS)
    } catch {
      /* 剪贴板不可用时静默 */
    }
  }

  return (
    <button
      type="button"
      aria-label={isCopied ? '已复制' : '复制'}
      className="mb-0.5 ml-1.5 inline-grid size-5 shrink-0 cursor-pointer place-items-center self-end rounded text-foreground/35 opacity-0 outline-none transition-all hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-foreground/20 group-hover:opacity-100"
      onClick={handleCopy}
    >
      <span className="relative inline-grid place-items-center">
        <Copy
          size={12}
          className={`col-start-1 row-start-1 transition-all duration-200 ${!isCopied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
        />
        <Check
          size={13}
          className={`col-start-1 row-start-1 text-emerald-500 transition-all duration-200 ${isCopied ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`}
        />
      </span>
    </button>
  )
}
