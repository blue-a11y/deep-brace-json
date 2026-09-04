import type { Key } from 'react';
import {
  Button,
  ListBox,
  Modal,
  Select,
  useOverlayState,
  type UseOverlayStateReturn,
} from '@heroui/react';
import { Palette, Type } from 'lucide-react';
import { CODE_FONT_OPTIONS, type CodeFont } from '../lib/code-font';
import { TREE_THEME_OPTIONS, type TreeTheme } from '../lib/tree-theme';
import { useShortcutLabels } from '../lib/use-shortcut-labels';
import { useWorkspaceCommand } from '../lib/use-workspace-command';
import { useStore } from '../store/use-store';

type ThemeSettingsProps = {
  overlayState?: UseOverlayStateReturn;
  shouldHideTrigger?: boolean;
};

export const ThemeSettings = ({
  overlayState,
  shouldHideTrigger = false,
}: ThemeSettingsProps = {}) => {
  const fallbackOverlayState = useOverlayState();
  const activeOverlayState = overlayState ?? fallbackOverlayState;
  const { getAriaShortcut, getShortcutLabel, getShortcutRef } = useShortcutLabels();
  useWorkspaceCommand('openTheme', () => activeOverlayState.open());
  const treeTheme = useStore(state => state.treeTheme);
  const handleTreeThemeChange = useStore(state => state.setTreeTheme);
  const codeFont = useStore(state => state.codeFont);
  const handleCodeFontChange = useStore(state => state.setCodeFont);

  const handleTreeThemeSelectionChange = (nextValue: Key | Key[] | null) => {
    if (
      typeof nextValue === 'string' &&
      TREE_THEME_OPTIONS.some(option => option.value === nextValue)
    ) {
      handleTreeThemeChange(nextValue as TreeTheme);
    }
  };

  const handleCodeFontSelectionChange = (nextValue: Key | Key[] | null) => {
    if (
      typeof nextValue === 'string' &&
      CODE_FONT_OPTIONS.some(option => option.value === nextValue)
    ) {
      handleCodeFontChange(nextValue as CodeFont);
    }
  };

  return (
    <Modal state={activeOverlayState}>
      <Button
        size="sm"
        variant="ghost"
        aria-label="打开主题设置"
        aria-keyshortcuts={getAriaShortcut('openTheme')}
        ref={getShortcutRef('openTheme')}
        aria-description={getShortcutLabel('openTheme')}
        className={`${shouldHideTrigger ? 'hidden' : ''} shrink-0 px-3`}
      >
        <Palette size={15} />
        <span>主题</span>
      </Button>
      <Modal.Backdrop className="!bg-black/20 dark:!bg-black/30">
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger aria-label="关闭主题设置" />
            <Modal.Header className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-0">
              <Modal.Icon className="row-span-2 bg-default text-foreground">
                <Palette className="size-5" />
              </Modal.Icon>
              <Modal.Heading>主题</Modal.Heading>
              <p className="text-sm leading-5 text-muted">调整代码内容的视觉样式</p>
            </Modal.Header>
            <Modal.Body>
              <div className="divide-y divide-default/70 overflow-hidden rounded-2xl border border-default/70">
                <section className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_190px] sm:items-center">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Palette className="size-4 shrink-0 text-muted" />
                      配色
                    </h3>
                    <p className="mt-1 pl-6 text-xs leading-5 text-muted">语法高亮颜色</p>
                  </div>
                  <Select
                    aria-label="代码配色"
                    className="w-full"
                    value={treeTheme}
                    variant="secondary"
                    onChange={handleTreeThemeSelectionChange}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {TREE_THEME_OPTIONS.map(option => (
                          <ListBox.Item
                            key={option.value}
                            id={option.value}
                            textValue={option.label}
                          >
                            {option.label}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </section>

                <section className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_190px] sm:items-center">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Type className="size-4 shrink-0 text-muted" />
                      字体
                    </h3>
                    <p className="mt-1 pl-6 text-xs leading-5 text-muted">代码内容字形</p>
                  </div>
                  <Select
                    aria-label="代码字体"
                    className="w-full"
                    value={codeFont}
                    variant="secondary"
                    onChange={handleCodeFontSelectionChange}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {CODE_FONT_OPTIONS.map(option => (
                          <ListBox.Item
                            key={option.value}
                            id={option.value}
                            textValue={option.label}
                          >
                            <span style={{ fontFamily: `var(--font-${option.value})` }}>
                              {option.label}
                            </span>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </section>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};
