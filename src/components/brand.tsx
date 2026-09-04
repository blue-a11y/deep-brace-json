import { useEffect, useState, type ComponentType } from 'react';
import { useMediaQuery } from '../lib/use-media-query';

export const Brand = () => {
  const shouldReduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [Animation, setAnimation] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (shouldReduceMotion || Animation) return;
    let isCancelled = false;
    const loadAnimation = () => {
      void import('./animated-brand').then(
        module => {
          if (!isCancelled) setAnimation(() => module.default);
        },
        () => {
          // 动效不是工作区的前置条件；网络失败时保留静态品牌。
        },
      );
    };
    const hasIdleCallback = typeof window.requestIdleCallback === 'function';
    const callbackId = hasIdleCallback
      ? window.requestIdleCallback(loadAnimation, { timeout: 2000 })
      : window.setTimeout(loadAnimation, 200);
    return () => {
      isCancelled = true;
      if (hasIdleCallback) window.cancelIdleCallback(callbackId);
      else window.clearTimeout(callbackId);
    };
  }, [shouldReduceMotion, Animation]);

  return (
    <>
      <div className="brand-symbol grid size-7 shrink-0 place-items-center self-center rounded-lg bg-foreground text-xs font-bold text-background">
        {'{ }'}
      </div>
      <span className="brand-slot">
        <span className="brand-metrics" aria-hidden="true">
          DeepBrace JSON
        </span>
        {Animation && !shouldReduceMotion ? (
          <Animation />
        ) : (
          <span className="brand-wordmark shrink-0 font-logo">DeepBrace JSON</span>
        )}
      </span>
    </>
  );
};
