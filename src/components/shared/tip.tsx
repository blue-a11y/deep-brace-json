import type { ReactNode } from 'react';
import { Tooltip } from '@heroui/react';

type TipProps = {
  label: ReactNode;
  children: ReactNode;
  ariaKeyShortcuts?: string;
  triggerClassName?: string;
};

/** v3 Tooltip compound 结构的便捷封装 */
export const Tip = ({ label, children, ariaKeyShortcuts, triggerClassName }: TipProps) => {
  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger aria-keyshortcuts={ariaKeyShortcuts} className={triggerClassName}>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
};
