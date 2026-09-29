import type { ReactNode } from 'react';
import { Kbd } from '@heroui/react';
import {
  getShortcutDisplayKey,
  MODIFIER_OPTIONS,
  type ShortcutId,
} from '../../lib/shortcuts/shortcuts';
import { useStore } from '../../store/use-store';

type ShortcutHintProps = {
  shortcut: ShortcutId;
  children: ReactNode;
};

type ShortcutKbdProps = {
  className?: string;
  shortcut: ShortcutId;
  variant?: 'default' | 'light';
};

export const ShortcutKbd = ({
  className = '',
  shortcut,
  variant = 'default',
}: ShortcutKbdProps) => {
  const modifiers = useStore(state => state.shortcutModifiers);
  return (
    <Kbd variant={variant} className={`shrink-0 ${className}`}>
      {MODIFIER_OPTIONS.filter(option => modifiers[option.id]).map(option => (
        <Kbd.Abbr key={option.id} keyValue={option.kbd} />
      ))}
      <Kbd.Content>{getShortcutDisplayKey(shortcut)}</Kbd.Content>
    </Kbd>
  );
};

export const ShortcutHint = ({ shortcut, children }: ShortcutHintProps) => (
  <span className="flex items-center gap-3">
    <span>{children}</span>
    <ShortcutKbd shortcut={shortcut} variant="light" />
  </span>
);
