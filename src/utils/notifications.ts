import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleReminder(title: string, body: string, triggerDate: Date): Promise<void> {
  // Если дата напоминания уже в прошлом (например, событие добавили задним числом),
  // молча пропускаем — планировать уведомление на прошлое не имеет смысла.
  if (triggerDate.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

export async function schedulePaymentReminders(paymentName: string, dueDate: Date): Promise<void> {
  const threeDaysBefore = new Date(dueDate);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
  const oneDayBefore = new Date(dueDate);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);

  await scheduleReminder('Скоро платёж', `${paymentName} — через 3 дня`, threeDaysBefore);
  await scheduleReminder('Платёж завтра', `${paymentName} — не забудьте оплатить`, oneDayBefore);
}
