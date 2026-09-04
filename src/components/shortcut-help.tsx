import { Button, Modal, useOverlayState, type UseOverlayStateReturn } from '@heroui/react';
import { Keyboard } from 'lucide-react';
import {
  DEFAULT_SHORTCUT_MODIFIERS,
  isShortcutModifiers,
  MODIFIER_OPTIONS,
  SHORTCUT_GROUPS,
} from '../lib/shortcuts';
import { useShortcutLabels } from '../lib/use-shortcut-labels';
import { useWorkspaceCommand } from '../lib/use-workspace-command';
import { useStore } from '../store/use-store';
import { ShortcutKbd } from './shortcut-hint';

type ShortcutHelpProps = {
  overlayState?: UseOverlayStateReturn;
  shouldHideTrigger?: boolean;
};

export const ShortcutHelp = ({
  overlayState,
  shouldHideTrigger = false,
}: ShortcutHelpProps = {}) => {
  const fallbackOverlayState = useOverlayState();
  const activeOverlayState = overlayState ?? fallbackOverlayState;
  const modifiers = useStore(state => state.shortcutModifiers);
  const setModifiers = useStore(state => state.setShortcutModifiers);
  const { getAriaShortcut, getShortcutLabel, getShortcutRef } = useShortcutLabels();
  useWorkspaceCommand('openShortcuts', () => activeOverlayState.open());

  return (
    <Modal state={activeOverlayState}>
      <Button
        size="sm"
        variant="ghost"
        aria-label="查看快捷键"
        aria-keyshortcuts={getAriaShortcut('openShortcuts')}
        ref={getShortcutRef('openShortcuts')}
        aria-description={getShortcutLabel('openShortcuts')}
        className={`${shouldHideTrigger ? 'hidden' : ''} w-9 shrink-0 px-0 md:w-8 xl:w-fit xl:px-3`}
      >
        <Keyboard size={15} />
        <span className="hidden xl:inline">快捷键</span>
      </Button>
      <Modal.Backdrop>
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog className="sm:max-w-2xl">
            <Modal.CloseTrigger aria-label="关闭快捷键" />
            <Modal.Header>
              <Modal.Heading className="flex items-center gap-2 text-base">
                <Keyboard size={18} />
                快捷键
              </Modal.Heading>
              <p className="text-xs text-muted">同时按下修饰键和字母键，在编辑器中也可使用。</p>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              <section aria-label="快捷键修饰键" className="border-b border-default pb-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-medium">统一修饰键</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    isDisabled={MODIFIER_OPTIONS.every(
                      option => modifiers[option.id] === DEFAULT_SHORTCUT_MODIFIERS[option.id],
                    )}
                    onPress={() => setModifiers(DEFAULT_SHORTCUT_MODIFIERS)}
                  >
                    恢复默认
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {MODIFIER_OPTIONS.map(option => {
                    const nextModifiers = { ...modifiers, [option.id]: !modifiers[option.id] };
                    return (
                      <Button
                        key={option.id}
                        size="sm"
                        aria-pressed={modifiers[option.id]}
                        aria-describedby="shortcut-modifier-description"
                        variant={modifiers[option.id] ? 'primary' : 'tertiary'}
                        className="h-7 min-w-14 rounded-lg px-3 text-xs"
                        isDisabled={!isShortcutModifiers(nextModifiers)}
                        onPress={() => setModifiers(nextModifiers)}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
                <p id="shortcut-modifier-description" className="mt-2 text-xs leading-5 text-muted">
                  至少保留 Ctrl、Alt / Option 或 Cmd / Meta 中的一项。所有操作同步更新并自动保存。
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  系统或浏览器保留组合可能优先执行（如 Cmd/Ctrl + W
                  关闭页面）。建议保留默认组合；遇到冲突请改用按钮。
                </p>
              </section>
              <div className="grid items-start gap-4 sm:grid-cols-2">
                {SHORTCUT_GROUPS.map(group => (
                  <section
                    key={group.title}
                    aria-label={`${group.title}快捷键`}
                    className={`rounded-2xl bg-default/45 p-3 ${
                      group.title === '标签'
                        ? 'sm:col-start-2 sm:row-span-3 sm:row-start-1'
                        : 'sm:col-start-1'
                    }`}
                  >
                    <h3 className="mb-2 px-1 text-xs font-semibold text-muted">{group.title}</h3>
                    <div>
                      {group.items.map(item => (
                        <div
                          key={item.id}
                          className="flex min-h-7 items-center justify-between gap-3 px-1 py-0.5 text-foreground/80"
                        >
                          <span className="text-xs">{item.label}</span>
                          <ShortcutKbd
                            className="h-5 gap-0 rounded-md px-1 text-[10px] leading-none [&_*]:text-[10px]"
                            shortcut={item.id}
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
