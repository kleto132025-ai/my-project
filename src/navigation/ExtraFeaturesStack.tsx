import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useTheme } from '../theme';
import { headerScreenOptions } from './screenOptions';
import { withErrorBoundary } from '../components/withErrorBoundary';
import { ExtraFeaturesScreen } from '../screens/extra/ExtraFeaturesScreen';
import { OcrScannerScreen } from '../screens/extra/OcrScannerScreen';
import { VoiceInputScreen } from '../screens/extra/VoiceInputScreen';
import { CloudBackupScreen } from '../screens/extra/CloudBackupScreen';
import { WidgetsScreen } from '../screens/extra/WidgetsScreen';
import { FamilySharingScreen } from '../screens/extra/FamilySharingScreen';
import { AiInsightsScreen } from '../screens/extra/AiInsightsScreen';
import { RecurringTemplatesScreen } from '../screens/extra/RecurringTemplatesScreen';
import { TaxCalculatorScreen } from '../screens/extra/TaxCalculatorScreen';
import { FinancialPlannerScreen } from '../screens/extra/FinancialPlannerScreen';
import { MultiProfileScreen } from '../screens/extra/MultiProfileScreen';

const SafeExtraFeaturesScreen = withErrorBoundary(ExtraFeaturesScreen);
const SafeOcrScannerScreen = withErrorBoundary(OcrScannerScreen);
const SafeVoiceInputScreen = withErrorBoundary(VoiceInputScreen);
const SafeCloudBackupScreen = withErrorBoundary(CloudBackupScreen);
const SafeWidgetsScreen = withErrorBoundary(WidgetsScreen);
const SafeFamilySharingScreen = withErrorBoundary(FamilySharingScreen);
const SafeAiInsightsScreen = withErrorBoundary(AiInsightsScreen);
const SafeRecurringTemplatesScreen = withErrorBoundary(RecurringTemplatesScreen);
const SafeTaxCalculatorScreen = withErrorBoundary(TaxCalculatorScreen);
const SafeFinancialPlannerScreen = withErrorBoundary(FinancialPlannerScreen);
const SafeMultiProfileScreen = withErrorBoundary(MultiProfileScreen);

const Stack = createNativeStackNavigator();

export function ExtraFeaturesStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={headerScreenOptions(theme)}>
      <Stack.Screen
        name="ExtraFeaturesHome"
        component={SafeExtraFeaturesScreen}
        options={{ title: 'Дополнительно', headerLeft: () => <DrawerToggleButton tintColor="#FFFFFF" /> }}
      />
      <Stack.Screen name="OcrScanner" component={SafeOcrScannerScreen} options={{ title: 'Сканер чеков' }} />
      <Stack.Screen name="VoiceInput" component={SafeVoiceInputScreen} options={{ title: 'Голосовой ввод' }} />
      <Stack.Screen name="CloudBackup" component={SafeCloudBackupScreen} options={{ title: 'Облачный бэкап' }} />
      <Stack.Screen name="Widgets" component={SafeWidgetsScreen} options={{ title: 'Виджеты' }} />
      <Stack.Screen name="FamilySharing" component={SafeFamilySharingScreen} options={{ title: 'Семейный бюджет' }} />
      <Stack.Screen name="AiInsights" component={SafeAiInsightsScreen} options={{ title: 'ИИ-аналитика' }} />
      <Stack.Screen name="RecurringTemplates" component={SafeRecurringTemplatesScreen} options={{ title: 'Шаблоны трат' }} />
      <Stack.Screen name="TaxCalculator" component={SafeTaxCalculatorScreen} options={{ title: 'Налоговый вычет' }} />
      <Stack.Screen name="FinancialPlanner" component={SafeFinancialPlannerScreen} options={{ title: 'Планировщик' }} />
      <Stack.Screen name="MultiProfile" component={SafeMultiProfileScreen} options={{ title: 'Мультипрофиль' }} />
    </Stack.Navigator>
  );
}
