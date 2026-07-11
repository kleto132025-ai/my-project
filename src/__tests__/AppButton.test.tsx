import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '../testUtils';
import { AppButton } from '../components/AppButton';

// RNTL v14 рендерит и обрабатывает события асинхронно (под капотом использует React 19 act()),
// поэтому render() и fireEvent() нужно ожидать через await.
describe('AppButton', () => {
  it('renders the given title', async () => {
    await renderWithTheme(<AppButton title="Сохранить" onPress={() => {}} />);
    expect(screen.getByText('Сохранить')).toBeTruthy();
  });

  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<AppButton title="Сохранить" onPress={onPress} />);
    await fireEvent.press(screen.getByText('Сохранить'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<AppButton title="Сохранить" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByText('Сохранить'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner instead of the title while loading', async () => {
    await renderWithTheme(<AppButton title="Сохранить" onPress={() => {}} loading />);
    expect(screen.queryByText('Сохранить')).toBeNull();
  });
});
