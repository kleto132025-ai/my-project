import { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/financeStore';
import { useAiStore } from '../store/aiStore';
import { generateId } from '../utils/id';
import { requestNotificationPermissions } from '../utils/notifications';
import { useUpcomingPayments } from './useFinancials';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function useAppBootstrap(): boolean {
  const [isReady, setIsReady] = useState(false);
  const loadAll = useFinanceStore((s) => s.loadAll);
  const profile = useFinanceStore((s) => s.profile);
  const saveProfile = useFinanceStore((s) => s.saveProfile);
  const loadApiKeyStatus = useAiStore((s) => s.loadApiKeyStatus);
  const notifications = useFinanceStore((s) => s.notifications);
  const addNotification = useFinanceStore((s) => s.addNotification);
  // "На этой неделе" на главном экране уже показывает эти события, но раньше это никак не
  // отражалось в колокольчике уведомлений — там появлялись только предупреждения о лимитах
  // бюджета (единственное место, вызывающее addNotification). Локальные напоминания через
  // expo-notifications планируются отдельно и не связаны со списком уведомлений в приложении.
  const upcomingPayments = useUpcomingPayments(7);

  useEffect(() => {
    (async () => {
      await loadAll();
      await loadApiKeyStatus();
      await requestNotificationPermissions();
      setIsReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isReady && !profile) {
      saveProfile({ id: generateId(), name: 'Пользователь', registeredAt: new Date() });
    }
  }, [isReady, profile, saveProfile]);

  useEffect(() => {
    if (!isReady) return;
    upcomingPayments.forEach(async (p) => {
      // relatedId включает конкретную дату — у ежемесячных платежей так на каждое новое
      // наступление создаётся новое уведомление, а не одно на все времена.
      const relatedId = `${p.id}-${dateKey(p.date)}`;
      const alreadyNotified = notifications.some((n) => n.type === 'payment' && n.relatedId === relatedId);
      if (alreadyNotified) return;

      // credit-/debt-/insurance- живут на экране "Кредиты и платежи" (разные сегменты одного
      // экрана), regular- — в отдельном разделе "Регулярные платежи".
      const relatedScreen = p.id.startsWith('regular-') ? 'RegularPayments' : 'Credits';

      await addNotification({
        type: 'payment',
        title: 'Скоро платёж',
        message: `${p.label} — ${p.date.toLocaleDateString('ru-RU')}`,
        date: new Date(),
        isRead: false,
        relatedScreen,
        relatedId,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, upcomingPayments]);

  return isReady;
}
