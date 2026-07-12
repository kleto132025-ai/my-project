import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useTheme } from '../theme';
import { headerScreenOptions } from './screenOptions';
import { withErrorBoundary } from '../components/withErrorBoundary';
import { HomeButton } from '../components/HomeButton';

const Stack = createNativeStackNavigator();

interface SimpleStackProps {
  routeName: string;
  title: string;
  component: React.ComponentType<any>;
  showDrawerToggle?: boolean;
  /** Стартовые параметры экрана — например, чтобы один и тот же компонент открывался
   * с разным начальным состоянием из разных пунктов меню (см. "Доходы"/"Расходы"). */
  initialParams?: Record<string, unknown>;
}

export function createSimpleStack({
  routeName,
  title,
  component,
  showDrawerToggle = true,
  initialParams,
}: SimpleStackProps) {
  const SafeComponent = withErrorBoundary(component);
  return function Wrapped() {
    const theme = useTheme();
    return (
      <Stack.Navigator screenOptions={headerScreenOptions(theme)}>
        <Stack.Screen
          name={routeName}
          component={SafeComponent}
          initialParams={initialParams}
          options={{
            title,
            headerLeft: showDrawerToggle ? () => <DrawerToggleButton tintColor="#FFFFFF" /> : undefined,
            // Экраны бокового меню — корень своего отдельного стека, системной кнопки "назад"
            // у них нет (даже у "Уведомлений", у которых нет и открывающего меню значка) —
            // без явной кнопки "На главную" единственный путь назад — свайп/аппаратная кнопка
            // назад, что не всегда очевидно.
            headerRight: () => <HomeButton />,
          }}
        />
      </Stack.Navigator>
    );
  };
}
