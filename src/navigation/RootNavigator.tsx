import React from 'react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { AuthSetupScreen } from '../screens/auth/AuthSetupScreen';
import { AuthLockScreen } from '../screens/auth/AuthLockScreen';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { MainDrawer } from './MainDrawer';
import { withErrorBoundary } from '../components/withErrorBoundary';

const SafeAuthSetupScreen = withErrorBoundary(AuthSetupScreen);
const SafeAuthLockScreen = withErrorBoundary(AuthLockScreen);
const SafeOnboardingScreen = withErrorBoundary(OnboardingScreen);

export function RootNavigator() {
  const hasSetupAuth = useAuthStore((s) => s.hasSetupAuth);
  const isUnlockedThisSession = useAuthStore((s) => s.isUnlockedThisSession);
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);

  if (!hasSetupAuth) return <SafeAuthSetupScreen />;
  if (!isUnlockedThisSession) return <SafeAuthLockScreen />;
  if (!hasCompletedOnboarding) return <SafeOnboardingScreen />;
  return <MainDrawer />;
}
