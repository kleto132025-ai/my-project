import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { TabsNavigator } from './TabsNavigator';
import { createSimpleStack } from './SimpleStack';
import { ExtraFeaturesStack } from './ExtraFeaturesStack';
import { SavingsScreen } from '../screens/savings/SavingsScreen';
import { CreditsScreen } from '../screens/credits/CreditsScreen';
import { RegularPaymentsScreen } from '../screens/regularPayments/RegularPaymentsScreen';
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen';
import { PeriodComparisonScreen } from '../screens/analytics/PeriodComparisonScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { WishlistScreen } from '../screens/wishlist/WishlistScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

const Drawer = createDrawerNavigator();

const SavingsStack = createSimpleStack({ routeName: 'SavingsHome', title: 'Накопления', component: SavingsScreen });
const CreditsStack = createSimpleStack({ routeName: 'CreditsHome', title: 'Кредиты и платежи', component: CreditsScreen });
const RegularPaymentsStack = createSimpleStack({
  routeName: 'RegularPaymentsHome',
  title: 'Регулярные платежи',
  component: RegularPaymentsScreen,
});
// Тот же экран транзакций, что и на нижней вкладке "Транзакции", но открывается сразу
// с нужным типом — чтобы не приходилось лезть внутрь и переключать вручную.
const IncomeStack = createSimpleStack({
  routeName: 'IncomeHome',
  title: 'Доходы',
  component: TransactionsScreen,
  initialParams: { type: 'income' },
});
const ExpenseStack = createSimpleStack({
  routeName: 'ExpenseHome',
  title: 'Расходы',
  component: TransactionsScreen,
  initialParams: { type: 'expense' },
});
const PeriodComparisonStack = createSimpleStack({
  routeName: 'PeriodComparisonHome',
  title: 'Сравнение периодов',
  component: PeriodComparisonScreen,
});
const NotificationsStack = createSimpleStack({
  routeName: 'NotificationsHome',
  title: 'Уведомления',
  component: NotificationsScreen,
  showDrawerToggle: false,
});
const ProfileStack = createSimpleStack({ routeName: 'ProfileHome', title: 'Профиль', component: ProfileScreen });
const WishlistStack = createSimpleStack({ routeName: 'WishlistHome', title: 'Хочу купить', component: WishlistScreen });
const SettingsStack = createSimpleStack({ routeName: 'SettingsHome', title: 'Настройки', component: SettingsScreen });

export function MainDrawer() {
  const theme = useTheme();
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerActiveTintColor: theme.accent,
        drawerInactiveTintColor: theme.textMuted,
        drawerActiveBackgroundColor: theme.accent + '1A',
        // Drawer.Navigator рисует свою панель поверх экранов отдельным нативным View,
        // поэтому цвет фона нужно задавать явно — иначе в тёмной теме панель останется белой.
        drawerStyle: { backgroundColor: theme.card },
        sceneStyle: { backgroundColor: theme.background },
      }}
    >
      <Drawer.Screen
        name="Tabs"
        component={TabsNavigator}
        options={{ title: 'Главная', drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
      />
      <Drawer.Screen
        name="Income"
        component={IncomeStack}
        options={{ title: 'Доходы', drawerIcon: ({ color, size }) => <Ionicons name="arrow-down-circle-outline" size={size} color={color} /> }}
      />
      <Drawer.Screen
        name="Expense"
        component={ExpenseStack}
        options={{ title: 'Расходы', drawerIcon: ({ color, size }) => <Ionicons name="arrow-up-circle-outline" size={size} color={color} /> }}
      />
      <Drawer.Screen
        name="Savings"
        component={SavingsStack}
        options={{ title: 'Накопления', drawerIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} /> }}
      />
      <Drawer.Screen
        name="Credits"
        component={CreditsStack}
        options={{ title: 'Кредиты и платежи', drawerIcon: ({ color, size }) => <Ionicons name="card-outline" size={size} color={color} /> }}
      />
      <Drawer.Screen
        name="RegularPayments"
        component={RegularPaymentsStack}
        options={{ title: 'Регулярные платежи', drawerIcon: ({ color, size }) => <Ionicons name="repeat-outline" size={size} color={color} /> }}
      />
      <Drawer.Screen
        name="PeriodComparison"
        component={PeriodComparisonStack}
        options={{ title: 'Сравнение периодов', drawerIcon: ({ color, size }) => <Ionicons name="git-compare-outline" size={size} color={color} /> }}
      />
      <Drawer.Screen
        name="Wishlist"
        component={WishlistStack}
        options={{ title: 'Хочу купить', drawerIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} /> }}
      />
      <Drawer.Screen
        name="ExtraFeatures"
        component={ExtraFeaturesStack}
        options={{ title: 'Дополнительно', drawerIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color} /> }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileStack}
        options={{ title: 'Профиль', drawerIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsStack}
        options={{ title: 'Настройки', drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }}
      />
      <Drawer.Screen
        name="Notifications"
        component={NotificationsStack}
        options={{ title: 'Уведомления', drawerItemStyle: { display: 'none' } }}
      />
    </Drawer.Navigator>
  );
}
