import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useTheme } from '../theme';
import { headerScreenOptions } from './screenOptions';
import { withErrorBoundary } from '../components/withErrorBoundary';

const Stack = createNativeStackNavigator();

interface SimpleStackProps {
  routeName: string;
  title: string;
  component: React.ComponentType<any>;
  showDrawerToggle?: boolean;
}

export function createSimpleStack({ routeName, title, component, showDrawerToggle = true }: SimpleStackProps) {
  const SafeComponent = withErrorBoundary(component);
  return function Wrapped() {
    const theme = useTheme();
    return (
      <Stack.Navigator screenOptions={headerScreenOptions(theme)}>
        <Stack.Screen
          name={routeName}
          component={SafeComponent}
          options={{
            title,
            headerLeft: showDrawerToggle ? () => <DrawerToggleButton tintColor="#FFFFFF" /> : undefined,
          }}
        />
      </Stack.Navigator>
    );
  };
}
