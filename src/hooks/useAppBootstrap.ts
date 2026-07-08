import { useEffect, useState } from 'react';
import { useFinanceStore } from '../store/financeStore';
import { generateId } from '../utils/id';
import { requestNotificationPermissions } from '../utils/notifications';

export function useAppBootstrap(): boolean {
  const [isReady, setIsReady] = useState(false);
  const loadAll = useFinanceStore((s) => s.loadAll);
  const profile = useFinanceStore((s) => s.profile);
  const saveProfile = useFinanceStore((s) => s.saveProfile);

  useEffect(() => {
    (async () => {
      await loadAll();
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

  return isReady;
}
