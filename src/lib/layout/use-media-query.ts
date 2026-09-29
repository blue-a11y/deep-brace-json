import { useEffect, useState } from 'react';

/**
 * 响应式断点检测（桌面/移动切换布局用）。
 * 当前应用使用客户端 createRoot；首帧直接读取视口，避免先挂载错误布局。
 */
export function useMediaQuery(query: string): boolean {
  const [doesMatch, setDoesMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const handleChange = () => setDoesMatch(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', handleChange);
    setDoesMatch(mediaQueryList.matches);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [query]);
  return doesMatch;
}
