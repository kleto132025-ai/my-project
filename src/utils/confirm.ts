import { Alert } from 'react-native';

export function confirmDelete(itemLabel: string, onConfirm: () => void): void {
  Alert.alert(`Удалить «${itemLabel}»?`, 'Это действие нельзя отменить', [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Удалить', style: 'destructive', onPress: onConfirm },
  ]);
}
