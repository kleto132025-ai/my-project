import React from 'react';
import { Text, Pressable } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { createSimpleStack } from '../navigation/SimpleStack';

// Регрессионный тест на баг "The action 'NAVIGATE' ... was not handled by any navigator",
// который случался при открытии формы транзакции из "Доходы"/"Расходы" в боковом меню —
// эти экраны используют createSimpleStack, и переход внутри них должен находить
// зарегистрированный там же extraScreens, а не только соседний стек вкладки "Транзакции".
function FakeMainScreen() {
  const navigation = useNavigation<any>();
  return (
    <Pressable onPress={() => navigation.navigate('AddTransaction', { type: 'income' })}>
      <Text>Открыть форму</Text>
    </Pressable>
  );
}

function FakeAddTransactionScreen() {
  return <Text>Новая транзакция — экран открыт</Text>;
}

describe('createSimpleStack extraScreens', () => {
  it('resolves a screen registered via extraScreens when the main screen navigates to it', async () => {
    const IncomeStack = createSimpleStack({
      routeName: 'IncomeHome',
      title: 'Доходы',
      component: FakeMainScreen,
      extraScreens: [{ name: 'AddTransaction', component: FakeAddTransactionScreen, title: 'Новая транзакция' }],
    });

    await renderWithTheme(
      <NavigationContainer>
        <IncomeStack />
      </NavigationContainer>
    );

    await fireEvent.press(screen.getByText('Открыть форму'));

    expect(await screen.findByText('Новая транзакция — экран открыт')).toBeTruthy();
  });

  it('throws the "not handled by any navigator" error when the target screen is missing (control case)', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const StackWithoutExtra = createSimpleStack({
      routeName: 'IncomeHome',
      title: 'Доходы',
      component: FakeMainScreen,
    });

    await renderWithTheme(
      <NavigationContainer>
        <StackWithoutExtra />
      </NavigationContainer>
    );

    await fireEvent.press(screen.getByText('Открыть форму'));

    expect(screen.queryByText('Новая транзакция — экран открыт')).toBeNull();
    consoleError.mockRestore();
  });
});
