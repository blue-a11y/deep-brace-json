import { useEffect, useState } from 'react';

/**
 * 响应式断点检测（桌面/移动切换布局用）。
 * 初始恒为 false，真实值在 effect（hydration 之后）同步——
 * 避免 SSR/客户端首帧不一致导致的 hydration mismatch。
 */
export function useMediaQuery(query: string): boolean {
  const [doesMatch, setDoesMatch] = useState(false);
  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const handleChange = () => setDoesMatch(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', handleChange);
    setDoesMatch(mediaQueryList.matches);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [query]);
  return doesMatch;
}
