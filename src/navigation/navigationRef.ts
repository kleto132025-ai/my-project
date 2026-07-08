import { createNavigationContainerRef, type NavigationContainerRefWithCurrent } from '@react-navigation/native';

export const navigationRef: NavigationContainerRefWithCurrent<Record<string, object | undefined>> =
  createNavigationContainerRef();

export function navigateGlobal(name: string, params?: object) {
  if (navigationRef.isReady()) {
    navigationRef.navigate({ name, params } as never);
  }
}
