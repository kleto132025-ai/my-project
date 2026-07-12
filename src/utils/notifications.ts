import * as Notifications from 'expo-notifications';
import type { InsurancePolicy } from '../types';

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

// Страховка с ежегодной оплатой (обычная схема: ОСАГО/КАСКО, ипотечное страхование
// жизни/объекта) напоминается раз в год за 30 дней до окончания. Страховка, оплачиваемая
// ежемесячно (реже, для полисов с помесячным взносом), напоминается каждый месяц в день
// оплаты — оба напоминания через настоящие повторяющиеся триггеры, а не разовые, чтобы не
// пропасть после первого же года/месяца.
export async function scheduleInsuranceReminder(policy: InsurancePolicy): Promise<void> {
  if (policy.paymentFrequency === 'monthly') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Ежемесячный взнос по страховке',
        body: `${policy.type} — не забудьте оплатить, иначе банк может поднять ставку`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: policy.endDate.getDate(),
        hour: 10,
        minute: 0,
      },
    });
    return;
  }
  const reminderDate = new Date(policy.endDate);
  reminderDate.setDate(reminderDate.getDate() - 30);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Страховка скоро истекает',
      body: `${policy.type} — продление через 30 дней`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      day: reminderDate.getDate(),
      month: reminderDate.getMonth(),
      hour: 10,
      minute: 0,
    },
  });
}
