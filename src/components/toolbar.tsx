import type { Key } from 'react';
import { Button, Dropdown, Tabs } from '@heroui/react';
import {
  Braces,
  ChevronDown,
  Database,
  FileJson,
  Moon,
  PanelsTopLeft,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import { useShortcutLabels } from '../lib/use-shortcut-labels';
import { useStore } from '../store/use-store';
import { AppSettings } from './app-settings';
import { Brand } from './brand';
import { GithubMark } from './github-mark';
import { IndentSelect } from './indent-select';
import { SampleMenu } from './sample-menu';
import { ShortcutHelp } from './shortcut-help';
import { ThemeSettings } from './theme-settings';
import { Tip } from './tip';
import { ToolbarMenu } from './toolbar-menu';
import { useToolbarActionVisibility } from './use-toolbar-action-visibility';

const TOOLBAR_FEATURES = [
  {
    label: '大文档优化',
    icon: Zap,
    description: '后台解析 · 按需渲染 · 完整复制。可在「示例」中体验约 1 MB / 10 MB 大文档。',
  },
  {
    label: '嵌套解析',
    icon: Braces,
    description: '将字符串中的 JSON 对象或数组解析到新标签，继续逐层查看。',
  },
  {
    label: '数据持久化',
    icon: Database,
    description: '标签、内容和偏好自动保存在当前浏览器，刷新后继续工作。',
  },
  {
    label: '多标签工作区',
    icon: PanelsTopLeft,
    description: '并排管理多份 JSON，支持重命名、左右添加和批量关闭。',
  },
  {
    label: 'JSON5 支持',
    icon: FileJson,
    description: '支持注释、尾随逗号和未加引号的键，也可格式化为标准 JSON。',
  },
] as const;

const FEATURE_TAG_CLASS_NAME =
  'h-6 shrink-0 cursor-help rounded-full border-0 bg-blue-500/10 px-2 text-[11px] font-medium leading-6 whitespace-nowrap text-blue-600 transition-colors hover:bg-blue-500/15 motion-reduce:transition-none dark:text-blue-400';

export const Toolbar = () => {
  const { getAriaShortcut, getShortcutLabel, getShortcutRef } = useShortcutLabels();
  const handleToggleTheme = useStore(state => state.toggleTheme);
  const isDark = useStore(state => state.isDark);
  const indentSize = useStore(state => state.indentSize);
  const handleIndentSizeChange = useStore(state => state.setIndentSize);
  const actionVisibility = useToolbarActionVisibility();
  const hasOverflowActions = Object.values(actionVisibility).some(isVisible => !isVisible);

  const handleThemeSelectionChange = (key: Key) => {
    if ((key === 'dark') !== isDark) handleToggleTheme();
  };

  const handleOpenRepository = () => {
    window.open('https://github.com/blue-a11y/deep-brace-json', '_blank', 'noopener,noreferrer');
  };

  return (
    <header className="workspace-toolbar flex shrink-0 items-center gap-2 px-1 py-1.5">
      <div className="mr-1 flex shrink-0 items-baseline gap-2.5 md:mr-3">
        <Brand />
        {/* 工具特性 */}
        <div
          role="group"
          aria-label="产品亮点"
          className="ml-1 hidden shrink-0 items-center gap-1.5 self-center border-l border-foreground/10 pl-3 font-sans tracking-normal xl:flex"
        >
          {TOOLBAR_FEATURES.map((feature, index) => (
            <div key={feature.label} className={index === 0 ? 'flex' : 'hidden 2xl:flex'}>
              <Tip label={feature.description} triggerClassName={FEATURE_TAG_CLASS_NAME}>
                <span className="inline-flex items-center gap-1">
                  <feature.icon size={12} aria-hidden="true" className="shrink-0" />
                  {feature.label}
                </span>
              </Tip>
            </div>
          ))}
        </div>
      </div>

      <div className="toolbar-actions ml-auto flex items-center gap-2">
        {hasOverflowActions && <ToolbarMenu actionVisibility={actionVisibility} />}
        {actionVisibility.shouldShowSample && (
          <Dropdown>
            <Dropdown.Trigger
              aria-label="选择示例"
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-xl px-2 text-sm outline-none hover:bg-default"
            >
              <Sparkles size={15} className="shrink-0" />
              <span>示例</span>
              <ChevronDown size={12} className="shrink-0" />
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom end">
              <SampleMenu />
            </Dropdown.Popover>
          </Dropdown>
        )}

        {actionVisibility.shouldShowIndent && (
          <IndentSelect value={indentSize} onChange={handleIndentSizeChange} />
        )}
        {actionVisibility.shouldShowAppearance && <ThemeSettings />}

        {actionVisibility.shouldShowShortcuts && <ShortcutHelp />}
        {actionVisibility.shouldShowSettings && <AppSettings />}
        {actionVisibility.shouldShowTheme && (
          <Tabs
            aria-label="主题"
            className="shrink-0"
            selectedKey={isDark ? 'dark' : 'light'}
            onSelectionChange={handleThemeSelectionChange}
          >
            <Tabs.ListContainer>
              <Tabs.List
                aria-label="主题"
                aria-keyshortcuts={getAriaShortcut('toggleTheme')}
                ref={getShortcutRef('toggleTheme')}
                aria-description={getShortcutLabel('toggleTheme')}
                className="h-8 p-0.5"
              >
                <Tabs.Tab
                  id="light"
                  aria-label="浅色"
                  className="h-7 min-h-7 w-[45px] min-w-[45px] rounded-full p-0"
                >
                  <Sun size={16} strokeWidth={2.5} />
                  <Tabs.Indicator className="rounded-full" />
                </Tabs.Tab>
                <Tabs.Tab
                  id="dark"
                  aria-label="深色"
                  className="h-7 min-h-7 w-[45px] min-w-[45px] rounded-full p-0"
                >
                  <Moon size={16} strokeWidth={2.5} />
                  <Tabs.Indicator className="rounded-full" />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        )}
        {actionVisibility.shouldShowGithub && (
          <Tip label="查看 GitHub 仓库">
            <Button
              isIconOnly
              aria-label="打开 GitHub 仓库"
              size="sm"
              variant="tertiary"
              className="shrink-0"
              onPress={handleOpenRepository}
            >
              <GithubMark />
            </Button>
          </Tip>
        )}
      </div>
    </header>
  );
};
