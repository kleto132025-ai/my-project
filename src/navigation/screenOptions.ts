import type { Theme } from '../theme';

export function headerScreenOptions(theme: Theme) {
  return {
    headerStyle: { backgroundColor: theme.primary },
    headerTintColor: '#FFFFFF',
    headerTitleStyle: { fontWeight: '700' as const },
    contentStyle: { backgroundColor: theme.background },
  };
}
