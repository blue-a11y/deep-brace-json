import type { Key } from 'react';
import { CircleFill } from '@gravity-ui/icons';
import { Button, Tabs } from '@heroui/react';
import { Moon, Sparkles, Sun } from 'lucide-react';
import { useStore } from '../store/use-store';
import { AppSettings } from './app-settings';
import { GithubMark } from './github-mark';
import { IndentSelect } from './indent-select';
import AnimatedContent from './react-bits/animated-content';
import Shuffle from './react-bits/shuffle';
import { ShortcutHelp } from './shortcut-help';
import { Tip } from './tip';
import { ToolbarMenu } from './toolbar-menu';
import { TreeThemeSelect } from './tree-theme-select';
import { useToolbarActionVisibility } from './use-toolbar-action-visibility';

const FEATURE_DOT_SIZE = 4;

export const Toolbar = () => {
  const handleLoadSample = useStore(state => state.loadSample);
  const handleToggleTheme = useStore(state => state.toggleTheme);
  const isDark = useStore(state => state.isDark);
  const indentSize = useStore(state => state.indentSize);
  const handleIndentSizeChange = useStore(state => state.setIndentSize);
  const treeTheme = useStore(state => state.treeTheme);
  const handleTreeThemeChange = useStore(state => state.setTreeTheme);
  const actionVisibility = useToolbarActionVisibility();
  const hasOverflowActions = Object.values(actionVisibility).some(isVisible => !isVisible);

  const handleThemeSelectionChange = (key: Key) => {
    if ((key === 'dark') !== isDark) handleToggleTheme();
  };

  const handleOpenRepository = () => {
    window.open('https://github.com/blue-a11y/deep-brace-json', '_blank', 'noopener,noreferrer');
  };

  return (
    <header className="flex shrink-0 items-center gap-2 px-1 py-1.5">
      <div className="mr-1 flex shrink-0 items-baseline gap-2.5 md:mr-3">
        <AnimatedContent
          distance={0}
          scale={0}
          duration={0.65}
          ease="back.out(2)"
          className="flex shrink-0 self-center"
        >
          <div className="grid size-7 shrink-0 place-items-center self-center rounded-lg bg-foreground font-mono text-xs font-bold text-background">
            {'{ }'}
          </div>
        </AnimatedContent>
        <Shuffle
          text="DeepBrace JSON"
          tag="span"
          shouldTriggerOnHover={false}
          shouldLoop
          loopDelay={5}
          delay={1.5}
          duration={0.6}
          stagger={0.05}
          textAlign="left"
          className="shrink-0 whitespace-nowrap font-logo text-[18px] tracking-tight sm:text-[20px]"
        />
        {/* 工具特性 */}
        <div className="hidden -translate-y-0.5 items-center gap-1 font-sans tracking-normal lg:flex">
          <span className="inline-flex h-5 shrink-0 items-center px-1.5 text-xs font-medium text-emerald-500">
            嵌套解析
          </span>
          <CircleFill aria-hidden="true" className="shrink-0 opacity-40" width={FEATURE_DOT_SIZE} />
          <span className="inline-flex h-5 shrink-0 items-center px-1.5 text-xs font-medium text-emerald-500">
            数据持久化
          </span>
          <CircleFill aria-hidden="true" className="shrink-0 opacity-40" width={FEATURE_DOT_SIZE} />
          <span className="inline-flex h-5 shrink-0 items-center px-1.5 text-xs font-medium text-emerald-500">
            多标签工作区
          </span>
          <CircleFill
            aria-hidden="true"
            className="hidden shrink-0 opacity-40 xl:block"
            width={FEATURE_DOT_SIZE}
          />
          <span className="hidden h-5 shrink-0 items-center px-1.5 text-xs font-medium text-emerald-500 xl:inline-flex">
            JSON5 支持
          </span>
        </div>
      </div>

      <div className="toolbar-actions ml-auto flex items-center gap-2">
        {hasOverflowActions && <ToolbarMenu actionVisibility={actionVisibility} />}
        {actionVisibility.shouldShowSample && (
          <Tip label="载入示例">
            <Button size="sm" variant="ghost" onPress={handleLoadSample}>
              <Sparkles size={15} />
              <span className="hidden md:inline">示例</span>
            </Button>
          </Tip>
        )}

        {actionVisibility.shouldShowIndent && (
          <IndentSelect value={indentSize} onChange={handleIndentSizeChange} />
        )}
        {actionVisibility.shouldShowTreeTheme && (
          <TreeThemeSelect value={treeTheme} onChange={handleTreeThemeChange} />
        )}

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
              <Tabs.List aria-label="主题" className="h-8 p-0.5">
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
