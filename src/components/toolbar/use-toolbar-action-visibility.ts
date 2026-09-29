import { TOOLBAR_ACTION_MIN_WIDTH } from '../../lib/layout/toolbar-breakpoints';
import { useMediaQuery } from '../../lib/layout/use-media-query';

export type ToolbarActionVisibility = {
  shouldShowSample: boolean;
  shouldShowIndent: boolean;
  shouldShowAppearance: boolean;
  shouldShowShortcuts: boolean;
  shouldShowSettings: boolean;
  shouldShowTheme: boolean;
  shouldShowGithub: boolean;
};

export const useToolbarActionVisibility = (): ToolbarActionVisibility => {
  const shouldShowSample = useMediaQuery(`(min-width: ${TOOLBAR_ACTION_MIN_WIDTH.sample}px)`);
  const shouldShowIndent = useMediaQuery(`(min-width: ${TOOLBAR_ACTION_MIN_WIDTH.indent}px)`);
  const shouldShowAppearance = useMediaQuery(
    `(min-width: ${TOOLBAR_ACTION_MIN_WIDTH.appearance}px)`,
  );
  const shouldShowShortcuts = useMediaQuery(`(min-width: ${TOOLBAR_ACTION_MIN_WIDTH.shortcuts}px)`);
  const shouldShowSettings = useMediaQuery(`(min-width: ${TOOLBAR_ACTION_MIN_WIDTH.settings}px)`);
  const shouldShowTheme = useMediaQuery(`(min-width: ${TOOLBAR_ACTION_MIN_WIDTH.theme}px)`);
  const shouldShowGithub = useMediaQuery(`(min-width: ${TOOLBAR_ACTION_MIN_WIDTH.github}px)`);

  return {
    shouldShowSample,
    shouldShowIndent,
    shouldShowAppearance,
    shouldShowShortcuts,
    shouldShowSettings,
    shouldShowTheme,
    shouldShowGithub,
  };
};
