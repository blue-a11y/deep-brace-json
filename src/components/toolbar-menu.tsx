import type { Key } from 'react';
import { Dropdown, Header, useOverlayState } from '@heroui/react';
import { AlignLeft, Check, Keyboard, Menu, Moon, Palette, Settings, Sun } from 'lucide-react';
import { INDENT_OPTIONS, type IndentSize } from '../lib/indent';
import { isSampleId, SAMPLE_OPTIONS } from '../lib/sample';
import { useShortcutLabels } from '../lib/use-shortcut-labels';
import { useStore } from '../store/use-store';
import { AppSettings } from './app-settings';
import { GithubMark } from './github-mark';
import { ShortcutHelp } from './shortcut-help';
import { ShortcutKbd } from './shortcut-hint';
import { ThemeSettings } from './theme-settings';
import type { ToolbarActionVisibility } from './use-toolbar-action-visibility';

const REPOSITORY_URL = 'https://github.com/blue-a11y/deep-brace-json';

type ToolbarMenuProps = {
  actionVisibility: ToolbarActionVisibility;
};

export const ToolbarMenu = ({ actionVisibility }: ToolbarMenuProps) => {
  const { getAriaShortcut, getShortcutRef } = useShortcutLabels();
  const handleToggleTheme = useStore(state => state.toggleTheme);
  const handleLoadSample = useStore(state => state.loadSample);
  const isDark = useStore(state => state.isDark);
  const indentSize = useStore(state => state.indentSize);
  const handleIndentSizeChange = useStore(state => state.setIndentSize);
  const appearanceOverlayState = useOverlayState();
  const shortcutOverlayState = useOverlayState();
  const settingsOverlayState = useOverlayState();

  const handleMenuAction = (key: Key) => {
    if (isSampleId(key)) handleLoadSample(key);
    if (key === 'shortcuts') shortcutOverlayState.open();
    if (key === 'settings') settingsOverlayState.open();
    if (key === 'appearance') appearanceOverlayState.open();
    if (key === 'page-theme') handleToggleTheme();
    if (key === 'github') {
      window.open(REPOSITORY_URL, '_blank', 'noopener,noreferrer');
    }
  };

  const handleIndentAction = (key: Key) => {
    if (typeof key === 'number' && INDENT_OPTIONS.includes(key as IndentSize)) {
      handleIndentSizeChange(key as IndentSize);
    }
  };

  return (
    <>
      <Dropdown>
        <Dropdown.Trigger
          aria-label="打开工具菜单"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-foreground outline-none transition-colors hover:bg-default focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Menu className="shrink-0" size={18} />
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end">
          <Dropdown.Menu aria-label="工具菜单" className="min-w-60" onAction={handleMenuAction}>
            {!actionVisibility.shouldShowSample && (
              <Dropdown.Section aria-label="示例数据">
                <Header>载入示例</Header>
                {SAMPLE_OPTIONS.map(option => (
                  <Dropdown.Item
                    key={option.id}
                    id={option.id}
                    textValue={option.label}
                    aria-label={option.label}
                  >
                    <span className="flex flex-col gap-0.5">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted">{option.description}</span>
                    </span>
                  </Dropdown.Item>
                ))}
              </Dropdown.Section>
            )}

            {!actionVisibility.shouldShowIndent && (
              <Dropdown.SubmenuTrigger>
                <Dropdown.Item id="indent" textValue={`缩进：${indentSize} 空格`}>
                  <AlignLeft size={16} />
                  <span>缩进</span>
                  <span className="ml-auto text-xs text-muted">{indentSize} 空格</span>
                  <Dropdown.SubmenuIndicator />
                </Dropdown.Item>
                <Dropdown.Popover placement="left top">
                  <Dropdown.Menu aria-label="缩进" onAction={handleIndentAction}>
                    {INDENT_OPTIONS.map(option => (
                      <Dropdown.Item key={option} id={option} textValue={`${option} 空格`}>
                        {indentSize === option ? (
                          <Check className="text-primary" size={16} />
                        ) : (
                          <span className="size-4" />
                        )}
                        <span>{option} 空格</span>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown.SubmenuTrigger>
            )}

            {!actionVisibility.shouldShowAppearance && (
              <Dropdown.Item
                id="appearance"
                textValue="主题"
                aria-label="主题"
                aria-keyshortcuts={getAriaShortcut('openTheme')}
                ref={getShortcutRef('openTheme')}
              >
                <Palette size={16} />
                <span>主题</span>
                <ShortcutKbd shortcut="openTheme" className="ml-auto text-xs" variant="light" />
              </Dropdown.Item>
            )}

            {!actionVisibility.shouldShowShortcuts && (
              <Dropdown.Item
                id="shortcuts"
                textValue="快捷键"
                aria-label="快捷键"
                aria-keyshortcuts={getAriaShortcut('openShortcuts')}
                ref={getShortcutRef('openShortcuts')}
              >
                <Keyboard size={16} />
                <span>快捷键</span>
                <ShortcutKbd shortcut="openShortcuts" className="ml-auto text-xs" variant="light" />
              </Dropdown.Item>
            )}
            {!actionVisibility.shouldShowSettings && (
              <Dropdown.Item
                id="settings"
                textValue="设置"
                aria-label="设置"
                aria-keyshortcuts={getAriaShortcut('openSettings')}
                ref={getShortcutRef('openSettings')}
              >
                <Settings size={16} />
                <span>设置</span>
                <ShortcutKbd shortcut="openSettings" className="ml-auto text-xs" variant="light" />
              </Dropdown.Item>
            )}
            {!actionVisibility.shouldShowTheme && (
              <Dropdown.Item
                id="page-theme"
                textValue={isDark ? '切换至浅色主题' : '切换至深色主题'}
                aria-label={isDark ? '切换至浅色主题' : '切换至深色主题'}
                aria-keyshortcuts={getAriaShortcut('toggleTheme')}
                ref={getShortcutRef('toggleTheme')}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                <span>{isDark ? '切换至浅色主题' : '切换至深色主题'}</span>
                <ShortcutKbd shortcut="toggleTheme" className="ml-auto text-xs" variant="light" />
              </Dropdown.Item>
            )}
            {!actionVisibility.shouldShowGithub && (
              <Dropdown.Item id="github" textValue="打开 GitHub 仓库">
                <GithubMark />
                <span>GitHub</span>
              </Dropdown.Item>
            )}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>

      {!actionVisibility.shouldShowShortcuts && (
        <ShortcutHelp overlayState={shortcutOverlayState} shouldHideTrigger />
      )}
      {!actionVisibility.shouldShowSettings && (
        <AppSettings overlayState={settingsOverlayState} shouldHideTrigger />
      )}
      {!actionVisibility.shouldShowAppearance && (
        <ThemeSettings overlayState={appearanceOverlayState} shouldHideTrigger />
      )}
    </>
  );
};
