import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useTheme } from '../theme';
import { headerScreenOptions } from './screenOptions';
import { withErrorBoundary } from '../components/withErrorBoundary';
import { HomeButton } from '../components/HomeButton';

const Stack = createNativeStackNavigator();

interface ExtraScreen {
  name: string;
  component: React.ComponentType<any>;
  title: string;
  presentation?: 'modal';
}

interface SimpleStackProps {
  routeName: string;
  title: string;
  component: React.ComponentType<any>;
  showDrawerToggle?: boolean;
  /** Стартовые параметры экрана — например, чтобы один и тот же компонент открывался
   * с разным начальным состоянием из разных пунктов меню (см. "Доходы"/"Расходы"). */
  initialParams?: Record<string, unknown>;
  /** Дополнительные экраны в том же стеке — нужно, когда основной экран сам куда-то
   * переходит через navigation.navigate('ИмяЭкрана', ...): React Navigation ищет целевой
   * экран только в текущем стеке и по цепочке родителей, а не у "соседних" стеков бокового
   * меню, поэтому такой экран (например, форма добавления транзакции, открытая с "Доходы"/
   * "Расходы", а не со вкладки "Транзакции") должен быть зарегистрирован в том же стеке. */
  extraScreens?: ExtraScreen[];
}

export function createSimpleStack({
  routeName,
  title,
  component,
  showDrawerToggle = true,
  initialParams,
  extraScreens,
}: SimpleStackProps) {
  const SafeComponent = withErrorBoundary(component);
  const SafeExtraScreens = extraScreens?.map((s) => ({ ...s, SafeComponent: withErrorBoundary(s.component) }));
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
        {SafeExtraScreens?.map((s) => (
          <Stack.Screen
            key={s.name}
            name={s.name}
            component={s.SafeComponent}
            options={{ title: s.title, presentation: s.presentation }}
          />
        ))}
      </Stack.Navigator>
    );
  };
}
