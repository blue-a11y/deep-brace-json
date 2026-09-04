import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHORTCUT_MODIFIERS,
  findShortcut,
  getAriaShortcut,
  getShortcutKey,
  isShortcutModifiers,
  SHORTCUT_GROUPS,
} from './shortcuts';

const keyEvent = (overrides: Partial<KeyboardEvent> = {}) =>
  ({
    code: 'KeyI',
    altKey: true,
    shiftKey: true,
    ctrlKey: false,
    metaKey: false,
    defaultPrevented: false,
    repeat: false,
    isComposing: false,
    ...overrides,
  }) as KeyboardEvent;

describe('workspace shortcuts', () => {
  it('keeps every listed operation reachable without duplicate keys', () => {
    const ids = SHORTCUT_GROUPS.flatMap(group => group.items.map(item => item.id));
    const keys = ids.map(getShortcutKey);
    expect(new Set(keys).size).toBe(ids.length);
    for (const id of ids) {
      const key = getShortcutKey(id);
      const code = key === '[' ? 'BracketLeft' : key === ']' ? 'BracketRight' : `Key${key}`;
      expect(findShortcut(keyEvent({ code }))).toBe(id);
    }
  });

  it('uses physical codes so Option-produced characters do not break shortcuts', () => {
    expect(findShortcut(keyEvent({ key: 'ˆ' }))).toBe('focusEditor');
    expect(getAriaShortcut('focusEditor')).toBe('Alt+Shift+I');
  });

  it.each([
    { repeat: true },
    { isComposing: true },
    { defaultPrevented: true },
    { ctrlKey: true },
    { metaKey: true },
    { altKey: false },
    { code: 'KeyZ' },
  ])('ignores repeats, IME, consumed events and unmatched keys: %j', overrides => {
    expect(findShortcut(keyEvent(overrides))).toBeNull();
  });

  it('matches all configured modifiers exactly and updates accessible labels', () => {
    const modifiers = { ctrl: false, alt: false, meta: true, shift: true };
    expect(findShortcut(keyEvent(), modifiers)).toBeNull();
    expect(findShortcut(keyEvent({ altKey: false, metaKey: true }), modifiers)).toBe('focusEditor');
    expect(findShortcut(keyEvent({ metaKey: true }), modifiers)).toBeNull();
    expect(getAriaShortcut('renameTab', modifiers)).toBe('Meta+Shift+R');
  });

  it('does not treat AltGr text input as a Ctrl+Alt shortcut', () => {
    const modifiers = { ctrl: true, alt: true, meta: false, shift: false };
    expect(
      findShortcut(
        keyEvent({ ctrlKey: true, shiftKey: false, getModifierState: key => key === 'AltGraph' }),
        modifiers,
      ),
    ).toBeNull();
  });

  it.each([
    null,
    {},
    ['alt', 'shift'],
    { ...DEFAULT_SHORTCUT_MODIFIERS, alt: false },
    { ...DEFAULT_SHORTCUT_MODIFIERS, ctrl: 'true' },
  ])('rejects invalid or typing-only modifier preferences: %j', value => {
    expect(isShortcutModifiers(value)).toBe(false);
  });
});
