import { useEffect, useRef, type KeyboardEvent } from 'react';
import { Button } from '@heroui/react';
import { MousePointerClick, X } from 'lucide-react';
import { dismissTabGuide } from '../lib/storage';
import { toast } from '../lib/toast';

type TabOnboardingGuideProps = {
  isVisible: boolean;
  onClose: () => void;
};

export const TabOnboardingGuide = ({ isVisible, onClose }: TabOnboardingGuideProps) => {
  const guideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (isVisible) guideRef.current?.focus();
  }, [isVisible]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  const handleDismissPermanently = () => {
    if (!dismissTabGuide()) {
      toast.warning('无法保存“不再提示”设置', {
        description: '当前浏览器禁止使用 localStorage，可以先关闭本次引导。',
      });
      return;
    }
    onClose();
  };

  if (!isVisible) return null;

  return (
    <aside
      ref={guideRef}
      role="dialog"
      aria-labelledby="tab-onboarding-guide-title"
      aria-describedby="tab-onboarding-guide-description"
      tabIndex={-1}
      className="absolute top-full left-1 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-default/70 bg-overlay p-4 text-overlay-foreground shadow-overlay outline-none"
      onKeyDown={handleKeyDown}
    >
      <span
        aria-hidden="true"
        className="absolute -top-1.5 left-7 size-3 rotate-45 border-t border-l border-default/70 bg-overlay"
      />
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label="关闭标签新手引导"
        className="absolute top-2 right-2 size-7 min-w-7"
        onPress={onClose}
      >
        <X className="size-4" />
      </Button>
      <div className="flex gap-3 pr-6">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <MousePointerClick className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 id="tab-onboarding-guide-title" className="text-sm font-semibold">
            试试右键标签
          </h3>
          <p id="tab-onboarding-guide-description" className="mt-1 text-xs leading-5 text-muted">
            可以重命名或关闭当前标签，也可以一次关闭左侧、右侧或其它标签。
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button size="sm" variant="tertiary" onPress={onClose}>
          知道了
        </Button>
        <Button size="sm" variant="primary" onPress={handleDismissPermanently}>
          不再提示
        </Button>
      </div>
    </aside>
  );
};
