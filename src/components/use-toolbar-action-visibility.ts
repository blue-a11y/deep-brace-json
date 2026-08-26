import { useMediaQuery } from '../lib/use-media-query'

export type ToolbarActionVisibility = {
  shouldShowSample: boolean
  shouldShowIndent: boolean
  shouldShowTreeTheme: boolean
  shouldShowShortcuts: boolean
  shouldShowSettings: boolean
  shouldShowTheme: boolean
  shouldShowGithub: boolean
}

export const useToolbarActionVisibility = (): ToolbarActionVisibility => {
  const shouldShowSample = useMediaQuery('(min-width: 860px)')
  const shouldShowIndent = useMediaQuery('(min-width: 800px)')
  const shouldShowTreeTheme = useMediaQuery('(min-width: 680px)')
  const shouldShowShortcuts = useMediaQuery('(min-width: 600px)')
  const shouldShowSettings = useMediaQuery('(min-width: 560px)')
  const shouldShowTheme = useMediaQuery('(min-width: 480px)')
  const shouldShowGithub = useMediaQuery('(min-width: 340px)')

  return {
    shouldShowSample,
    shouldShowIndent,
    shouldShowTreeTheme,
    shouldShowShortcuts,
    shouldShowSettings,
    shouldShowTheme,
    shouldShowGithub,
  }
}
