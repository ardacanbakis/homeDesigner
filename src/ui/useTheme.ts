import { useDesignStore } from '../store/design'

/** Thin wrapper so welcome screen + editor share one theme source.
 *  Keeps the historical { dark, toggle } API. */
export function useTheme() {
  const theme = useDesignStore(s => s.theme)
  const toggle = useDesignStore(s => s.toggleTheme)
  return { dark: theme === 'dark', toggle }
}
