import { useEffect, useState } from 'react'

/**
 * 响应式断点检测（桌面/移动切换布局用）。
 * 初始恒为 false，真实值在 effect（hydration 之后）同步——
 * 避免 SSR/客户端首帧不一致导致的 hydration mismatch。
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}
