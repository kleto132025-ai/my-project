import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { headerScreenOptions } from './screenOptions';
import { NotificationBellButton } from '../components/NotificationBellButton';
import { withErrorBoundary } from '../components/withErrorBoundary';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen';
import { AddTransactionScreen } from '../screens/transactions/AddTransactionScreen';
import { BankImportScreen } from '../screens/transactions/BankImportScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { BudgetScreen } from '../screens/budget/BudgetScreen';

const SafeDashboardScreen = withErrorBoundary(DashboardScreen);
const SafeTransactionsScreen = withErrorBoundary(TransactionsScreen);
const SafeAddTransactionScreen = withErrorBoundary(AddTransactionScreen);
const SafeBankImportScreen = withErrorBoundary(BankImportScreen);
const SafeAnalyticsScreen = withErrorBoundary(AnalyticsScreen);
const SafeBudgetScreen = withErrorBoundary(BudgetScreen);

const Tab = createBottomTabNavigator();
const DashboardStackNav = createNativeStackNavigator();
const TransactionsStackNav = createNativeStackNavigator();
const AnalyticsStackNav = createNativeStackNavigator();
const BudgetStackNav = createNativeStackNavigator();

function DashboardStack() {
  const theme = useTheme();
  return (
    <DashboardStackNav.Navigator screenOptions={headerScreenOptions(theme)}>
      <DashboardStackNav.Screen
        name="DashboardHome"
        component={SafeDashboardScreen}
        options={{ title: 'Главная', headerLeft: () => <DrawerToggleButton tintColor="#FFFFFF" />, headerRight: () => <NotificationBellButton /> }}
      />
    </DashboardStackNav.Navigator>
  );
}

function TransactionsStack() {
  const theme = useTheme();
  return (
    <TransactionsStackNav.Navigator screenOptions={headerScreenOptions(theme)}>
      <TransactionsStackNav.Screen
        name="TransactionsHome"
        component={SafeTransactionsScreen}
        options={{ title: 'Доходы и расходы', headerRight: () => <NotificationBellButton /> }}
      />
      <TransactionsStackNav.Screen
        name="AddTransaction"
        component={SafeAddTransactionScreen}
        options={{ title: 'Новая транзакция', presentation: 'modal' }}
      />
      <TransactionsStackNav.Screen
        name="BankImport"
        component={SafeBankImportScreen}
        options={{ title: 'Импорт выписки', presentation: 'modal' }}
      />
    </TransactionsStackNav.Navigator>
  );
}

function AnalyticsStack() {
  const theme = useTheme();
  return (
    <AnalyticsStackNav.Navigator screenOptions={headerScreenOptions(theme)}>
      <AnalyticsStackNav.Screen
        name="AnalyticsHome"
        component={SafeAnalyticsScreen}
        options={{ title: 'Аналитика', headerRight: () => <NotificationBellButton /> }}
      />
    </AnalyticsStackNav.Navigator>
  );
}

function BudgetStack() {
  const theme = useTheme();
  return (
    <BudgetStackNav.Navigator screenOptions={headerScreenOptions(theme)}>
      <BudgetStackNav.Screen
        name="BudgetHome"
        component={SafeBudgetScreen}
        options={{ title: 'Бюджет', headerRight: () => <NotificationBellButton /> }}
      />
    </BudgetStackNav.Navigator>
  );
}

export function TabsNavigator() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{ title: 'Главная', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsStack}
        options={{ title: 'Транзакции', tabBarIcon: ({ color, size }) => <Ionicons name="swap-vertical-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsStack}
        options={{ title: 'Аналитика', tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" size={size} color={color} /> }}
      />
      <Tab.Screen
        name="Budget"
        component={BudgetStack}
        options={{ title: 'Бюджет', tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} /> }}
      />
    </Tab.Navigator>
  );
}
