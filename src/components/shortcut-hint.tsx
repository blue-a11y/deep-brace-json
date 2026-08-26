import type { ReactNode } from 'react';
import { Kbd } from '@heroui/react';
import { getShortcutAltKey, getShortcutKey, type ShortcutId } from '../lib/shortcuts';

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
}: ShortcutKbdProps) => (
  <Kbd variant={variant} className={`shrink-0 ${className}`}>
    <Kbd.Abbr keyValue={getShortcutAltKey()} />
    <Kbd.Abbr keyValue="shift" />
    <Kbd.Content>{getShortcutKey(shortcut)}</Kbd.Content>
  </Kbd>
);

export const ShortcutHint = ({ shortcut, children }: ShortcutHintProps) => (
  <span className="flex items-center gap-3">
    <span>{children}</span>
    <ShortcutKbd shortcut={shortcut} variant="light" />
  </span>
);
