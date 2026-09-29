import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHORTCUT_MODIFIERS,
  findShortcut,
  getAriaShortcut,
  getShortcutKey,
  getShortcutLabel,
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
      const code =
        key === '['
          ? 'BracketLeft'
          : key === ']'
            ? 'BracketRight'
            : key === 'Backspace'
              ? 'Backspace'
              : `Key${key}`;
      expect(findShortcut(keyEvent({ code }))).toBe(id);
    }
  });

  it('uses physical codes so Option-produced characters do not break shortcuts', () => {
    expect(findShortcut(keyEvent({ key: 'ˆ' }))).toBe('focusEditor');
    expect(getAriaShortcut('focusEditor')).toBe('Alt+Shift+I');
  });

  it('matches copy and Backspace with the shared modifier preference', () => {
    const modifiers = { ctrl: false, alt: false, meta: false, shift: false };
    const event = keyEvent({ altKey: false, shiftKey: false });
    expect(findShortcut(keyEvent({ ...event, code: 'KeyC' }), modifiers)).toBe('copyTree');
    expect(findShortcut(keyEvent({ ...event, code: 'Backspace' }), modifiers)).toBe('clear');
    expect(findShortcut(keyEvent({ ...event, code: 'Delete' }), modifiers)).toBeNull();
    expect(
      findShortcut(keyEvent({ ...event, code: 'Backspace', metaKey: true }), modifiers),
    ).toBeNull();
    expect(getAriaShortcut('clear', modifiers)).toBe('Backspace');
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

  it('supports Cmd-only search without requiring Option or Shift', () => {
    const modifiers = { ctrl: false, alt: false, meta: true, shift: false };
    const event = keyEvent({ code: 'KeyK', altKey: false, metaKey: true, shiftKey: false });

    expect(isShortcutModifiers(modifiers)).toBe(true);
    expect(findShortcut(event, modifiers)).toBe('searchTree');
    expect(findShortcut(keyEvent({ ...event, code: 'KeyP' }), modifiers)).toBe('closeTabsRight');
    expect(findShortcut(keyEvent({ ...event, shiftKey: true }), modifiers)).toBeNull();
    expect(findShortcut(keyEvent({ ...event, altKey: true }), modifiers)).toBeNull();
    expect(getAriaShortcut('searchTree', modifiers)).toBe('Meta+K');
  });

  it.each([false, true])(
    'matches search with optional Shift and no command modifiers: %s',
    shift => {
      const modifiers = { ctrl: false, alt: false, meta: false, shift };
      const event = keyEvent({ code: 'KeyK', altKey: false, shiftKey: shift });

      expect(isShortcutModifiers(modifiers)).toBe(true);
      expect(findShortcut(event, modifiers)).toBe('searchTree');
      expect(findShortcut(keyEvent({ ...event, ctrlKey: true }), modifiers)).toBeNull();
      expect(findShortcut(keyEvent({ ...event, shiftKey: !shift }), modifiers)).toBeNull();
      expect(getShortcutLabel('searchTree', modifiers)).toBe(shift ? 'Shift+K' : 'K');
      expect(getAriaShortcut('searchTree', modifiers)).toBe(shift ? 'Shift+K' : 'K');
    },
  );

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
    { ctrl: false, alt: false, meta: false },
    { ...DEFAULT_SHORTCUT_MODIFIERS, ctrl: 'true' },
  ])('rejects incomplete or invalid modifier preferences: %j', value => {
    expect(isShortcutModifiers(value)).toBe(false);
  });
});
