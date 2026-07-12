import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { CardActions } from '../../components/CardActions';
import { SegmentedControl } from '../../components/SegmentedControl';
import { ProgressBar } from '../../components/ProgressBar';
import { FormInput } from '../../components/FormInput';
import { DateField } from '../../components/DateField';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency, formatNumber } from '../../utils/format';
import { calculateGoalProgress } from '../../utils/calculations';
import { convertAmount } from '../../utils/currency';
import { confirmDelete } from '../../utils/confirm';
import { fetchMoexPrice, MoexApiError } from '../../utils/moex';
import type {
  AssetType,
  Goal,
  Deposit,
  SavingsAccount,
  Investment,
  InvestmentPayout,
  CashbackCard,
  Currency,
} from '../../types';
import { parseLocaleNumber } from '../../utils/parseNumber';

type Segment = 'deposits' | 'accounts' | 'investments' | 'goals' | 'cashback';

const SEGMENT_HINTS: Record<Segment, string> = {
  goals: 'Копите на конкретную покупку с дедлайном — прогресс-бар покажет, сколько уже собрано',
  deposits: 'Банковские вклады с фиксированным сроком (дата открытия и закрытия) и процентной ставкой',
  accounts: 'Накопительные счета без срока — остаток и проценты, начисляются автоматически каждый месяц',
  investments: 'Акции, облигации, ПИФ, крипта — количество, цена, доходность, дивиденды и купоны',
  cashback: 'Ваши карты с процентом кэшбэка — сколько уже накоплено баллов/рублей',
};

const CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR'];

const ASSET_TYPES: AssetType[] = ['stock', 'bond', 'crypto', 'fund'];
const ASSET_LABELS: Record<AssetType, string> = { stock: 'Акции', bond: 'Облигации', crypto: 'Крипта', fund: 'ПИФ' };
// Тип выплаты определяется по классу актива: акции платят дивиденды, облигации — купоны.
const PAYOUT_LABELS: Record<AssetType, string> = {
  stock: 'Дивиденды',
  bond: 'Купоны',
  crypto: 'Выплата',
  fund: 'Выплата',
};

export function SavingsScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const rates = useSettingsStore((s) => s.exchangeRates);
  const [segment, setSegment] = useState<Segment>('goals');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const deposits = useFinanceStore((s) => s.deposits);
  const savingsAccounts = useFinanceStore((s) => s.savingsAccounts);
  const savingsAccruals = useFinanceStore((s) => s.savingsAccruals);
  const investments = useFinanceStore((s) => s.investments);
  const investmentPayouts = useFinanceStore((s) => s.investmentPayouts);
  const goals = useFinanceStore((s) => s.goals);
  const cashbackCards = useFinanceStore((s) => s.cashbackCards);
  const saveDeposit = useFinanceStore((s) => s.saveDeposit);
  const saveSavingsAccount = useFinanceStore((s) => s.saveSavingsAccount);
  const saveInvestment = useFinanceStore((s) => s.saveInvestment);
  const addInvestmentPayout = useFinanceStore((s) => s.addInvestmentPayout);
  const editInvestmentPayout = useFinanceStore((s) => s.editInvestmentPayout);
  const removeInvestmentPayout = useFinanceStore((s) => s.removeInvestmentPayout);
  const saveGoal = useFinanceStore((s) => s.saveGoal);
  const saveCashbackCard = useFinanceStore((s) => s.saveCashbackCard);
  const removeDeposit = useFinanceStore((s) => s.removeDeposit);
  const removeSavingsAccount = useFinanceStore((s) => s.removeSavingsAccount);
  const removeInvestment = useFinanceStore((s) => s.removeInvestment);
  const [expandedInvestmentId, setExpandedInvestmentId] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutDate, setPayoutDate] = useState(new Date());
  const [editingPayoutId, setEditingPayoutId] = useState<string | null>(null);
  const [payoutEditAmount, setPayoutEditAmount] = useState('');
  const [payoutEditDate, setPayoutEditDate] = useState(new Date());
  const removeGoal = useFinanceStore((s) => s.removeGoal);
  const removeCashbackCard = useFinanceStore((s) => s.removeCashbackCard);

  // form state (generic fields reused across segments)
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [openDate, setOpenDate] = useState(new Date());
  const [closeDate, setCloseDate] = useState(new Date(Date.now() + 365 * 24 * 3600 * 1000));
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [moexTicker, setMoexTicker] = useState('');
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
  const [deadline, setDeadline] = useState(new Date(Date.now() + 180 * 24 * 3600 * 1000));
  const [isShared, setIsShared] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [entryCurrency, setEntryCurrency] = useState<Currency>(currency);

  const resetForm = () => {
    setName('');
    setAmount('');
    setRate('');
    setQuantity('');
    setPurchasePrice('');
    setCurrentPrice('');
    setMoexTicker('');
    setIsShared(false);
    setPartnerName('');
    setEntryCurrency(currency);
    setShowForm(false);
    setEditingId(null);
  };

  const startEditGoal = (g: Goal) => {
    setName(g.name);
    setAmount(String(g.targetAmount));
    setDeadline(g.deadline);
    setIsShared(!!g.isShared);
    setPartnerName(g.partnerName ?? '');
    setEditingId(g.id);
    setShowForm(true);
  };

  const startEditDeposit = (d: Deposit) => {
    setName(d.name);
    setAmount(String(d.amount));
    setRate(String(d.rate));
    setOpenDate(d.openDate);
    setCloseDate(d.closeDate);
    setEntryCurrency(d.currency);
    setEditingId(d.id);
    setShowForm(true);
  };

  const startEditSavingsAccount = (a: SavingsAccount) => {
    setName(a.name);
    setAmount(String(a.balance));
    setRate(String(a.rate));
    setEntryCurrency(a.currency);
    setEditingId(a.id);
    setShowForm(true);
  };

  const startEditInvestment = (i: Investment) => {
    setName(i.name);
    setAssetType(i.assetType);
    setQuantity(String(i.quantity));
    setPurchasePrice(String(i.purchasePrice));
    setCurrentPrice(String(i.currentPrice));
    setMoexTicker(i.moexTicker ?? '');
    setEntryCurrency(i.currency);
    setEditingId(i.id);
    setShowForm(true);
  };

  const startEditCashback = (c: CashbackCard) => {
    setName(c.name);
    setRate(String(c.cashbackPercent));
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleAddDeposit = async () => {
    if (!name.trim() || !amount) return;
    await saveDeposit({
      ...(editingId ? { id: editingId } : {}),
      name: name.trim(),
      amount: parseLocaleNumber(amount),
      rate: parseLocaleNumber(rate || '0'),
      openDate,
      closeDate,
      currency: entryCurrency,
    } as Deposit);
    resetForm();
  };

  const handleAddSavingsAccount = async () => {
    if (!name.trim() || !amount) return;
    const existing = editingId ? savingsAccounts.find((a) => a.id === editingId) : undefined;
    await saveSavingsAccount({
      ...(editingId ? { id: editingId } : {}),
      name: name.trim(),
      balance: parseLocaleNumber(amount),
      rate: parseLocaleNumber(rate || '0'),
      // Дата, с которой ведётся отсчёт начислений — при создании счёта это сегодня,
      // при редактировании остатка/ставки уже существующего счёта не сбрасывается.
      lastAccrualDate: existing?.lastAccrualDate ?? new Date(),
      currency: entryCurrency,
    } as SavingsAccount);
    resetForm();
  };

  const handleAddInvestment = async () => {
    if (!name.trim() || !quantity) return;
    await saveInvestment({
      ...(editingId ? { id: editingId } : {}),
      name: name.trim(),
      assetType,
      quantity: parseLocaleNumber(quantity),
      purchasePrice: parseLocaleNumber(purchasePrice || '0'),
      currentPrice: parseLocaleNumber(currentPrice || purchasePrice || '0'),
      currency: entryCurrency,
      moexTicker: moexTicker.trim() ? moexTicker.trim().toUpperCase() : undefined,
    } as Investment);
    resetForm();
  };

  // Подтягивает текущую цену актива с Мосбиржи по тикеру (публичный ISS API, без ключа) —
  // чтобы «Текущую цену» не нужно было каждый раз обновлять вручную. Ошибки (нет интернета,
  // тикер не найден) тихо игнорируются при автообновлении при открытии вкладки и показываются
  // явно только при нажатии кнопки «Обновить цену» на конкретном активе.
  const refreshMoexPrice = useCallback(
    async (investment: Investment, { silent }: { silent: boolean }) => {
      if (!investment.moexTicker) return;
      setRefreshingIds((prev) => new Set(prev).add(investment.id));
      try {
        const price = await fetchMoexPrice(investment.moexTicker, investment.assetType);
        await saveInvestment({ ...investment, currentPrice: price });
      } catch (e) {
        if (!silent) {
          const message = e instanceof MoexApiError ? e.message : 'Не удалось получить цену с Мосбиржи';
          Alert.alert('Не удалось обновить цену', message);
        }
      } finally {
        setRefreshingIds((prev) => {
          const next = new Set(prev);
          next.delete(investment.id);
          return next;
        });
      }
    },
    [saveInvestment]
  );

  // Автообновление при каждом открытии вкладки «Инвестиции» — так цены, привязанные к
  // тикеру, обычно не приходится обновлять вручную вообще. Список активов на момент
  // открытия вкладки берётся напрямую (без изменения зависимостей эффекта), чтобы
  // повторное сохранение цены не запускало эффект по кругу.
  useEffect(() => {
    if (segment !== 'investments') return;
    investments.filter((i) => i.moexTicker).forEach((i) => refreshMoexPrice(i, { silent: true }));
    // Намеренно зависит только от segment, а не от investments/refreshMoexPrice: обновление
    // цены сохраняет актив заново, что меняло бы ссылку на investments и перезапускало бы
    // эффект по кругу при каждом открытии вкладки.
  }, [segment]);

  const handleAddPayout = async (investmentId: string) => {
    const payAmount = parseLocaleNumber(payoutAmount);
    if (Number.isNaN(payAmount) || payAmount <= 0) return;
    await addInvestmentPayout(investmentId, payAmount, payoutDate);
    setPayoutAmount('');
    setPayoutDate(new Date());
  };

  const startEditPayout = (p: InvestmentPayout) => {
    setEditingPayoutId(p.id);
    setPayoutEditAmount(String(p.amount));
    setPayoutEditDate(p.date);
  };

  const cancelEditPayout = () => {
    setEditingPayoutId(null);
    setPayoutEditAmount('');
  };

  const handleSavePayoutEdit = async () => {
    if (!editingPayoutId) return;
    const editAmount = parseLocaleNumber(payoutEditAmount);
    if (Number.isNaN(editAmount) || editAmount <= 0) return;
    await editInvestmentPayout(editingPayoutId, editAmount, payoutEditDate);
    cancelEditPayout();
  };

  const handleAddGoal = async () => {
    if (!name.trim() || !amount) return;
    const existing = editingId ? goals.find((g) => g.id === editingId) : undefined;
    await saveGoal({
      ...(editingId ? { id: editingId } : {}),
      name: name.trim(),
      targetAmount: parseLocaleNumber(amount),
      savedAmount: existing?.savedAmount ?? 0,
      deadline,
      priority: existing?.priority ?? 'medium',
      isShared,
      partnerName: isShared ? partnerName.trim() : undefined,
      partnerSavedAmount: isShared ? existing?.partnerSavedAmount ?? 0 : undefined,
    } as Goal);
    resetForm();
  };

  const handleAddCashback = async () => {
    if (!name.trim() || !rate) return;
    const existing = editingId ? cashbackCards.find((c) => c.id === editingId) : undefined;
    await saveCashbackCard({
      ...(editingId ? { id: editingId } : {}),
      name: name.trim(),
      cashbackPercent: parseLocaleNumber(rate),
      accumulated: existing?.accumulated ?? 0,
    } as CashbackCard);
    resetForm();
  };

  const isEditing = editingId !== null;

  return (
    <ScreenContainer>
      <SegmentedControl
        value={segment}
        onChange={(v) => {
          setSegment(v);
          resetForm();
        }}
        options={[
          { label: 'Цели', value: 'goals' },
          { label: 'Вклады', value: 'deposits' },
          { label: 'Счета', value: 'accounts' },
          { label: 'Инвестиции', value: 'investments' },
          { label: 'Кэшбэк', value: 'cashback' },
        ]}
      />
      <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: spacing.sm }}>{SEGMENT_HINTS[segment]}</Text>

      {segment === 'goals' && (
        <>
          {goals.length === 0 ? (
            <EmptyState title="Пока нет целей" subtitle="Создайте первую финансовую цель" />
          ) : (
            goals.map((g) => (
              <Card key={g.id}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{g.name}</Text>
                  <View style={styles.headerRight}>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                      до {g.deadline.toLocaleDateString('ru-RU')}
                    </Text>
                    <CardActions onEdit={() => startEditGoal(g)} onDelete={() => confirmDelete(g.name, () => removeGoal(g.id))} />
                  </View>
                </View>
                <ProgressBar percent={calculateGoalProgress(g.savedAmount, g.targetAmount)} />
                <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 13 }}>
                  {formatCurrency(g.savedAmount, currency)} из {formatCurrency(g.targetAmount, currency)}
                </Text>
                {g.isShared && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                      Совместная цель с {g.partnerName}
                    </Text>
                    <ProgressBar
                      percent={calculateGoalProgress(g.partnerSavedAmount ?? 0, g.targetAmount)}
                      color={theme.secondary}
                    />
                  </View>
                )}
              </Card>
            ))
          )}
          {showForm ? (
            <Card>
              <FormInput label="Название" value={name} onChangeText={setName} placeholder="Новая машина" />
              <FormInput label="Целевая сумма" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
              <DateField label="Срок" value={deadline} onChange={setDeadline} />
              <View style={styles.rowBetween}>
                <Text style={{ color: theme.text }}>Цель с партнёром</Text>
                <Switch value={isShared} onValueChange={setIsShared} />
              </View>
              {isShared && (
                <FormInput label="Имя партнёра" value={partnerName} onChangeText={setPartnerName} />
              )}
              <AppButton title={isEditing ? 'Сохранить изменения' : 'Сохранить цель'} onPress={handleAddGoal} />
              <View style={{ height: spacing.sm }} />
              <AppButton title="Отмена" variant="outline" onPress={resetForm} />
            </Card>
          ) : (
            <AppButton title="+ Добавить цель" variant="outline" onPress={() => setShowForm(true)} />
          )}
        </>
      )}

      {segment === 'deposits' && (
        <>
          {deposits.length === 0 ? (
            <EmptyState title="Нет вкладов" />
          ) : (
            deposits.map((d) => (
              <Card key={d.id}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{d.name}</Text>
                  <CardActions onEdit={() => startEditDeposit(d)} onDelete={() => confirmDelete(d.name, () => removeDeposit(d.id))} />
                </View>
                <Text style={{ color: theme.textMuted, marginTop: 4 }}>
                  {formatCurrency(convertAmount(d.amount, d.currency, currency, rates), currency)} · {formatNumber(d.rate)}% годовых
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                  {d.openDate.toLocaleDateString('ru-RU')} — {d.closeDate.toLocaleDateString('ru-RU')}
                </Text>
              </Card>
            ))
          )}
          {showForm ? (
            <Card>
              <FormInput label="Название" value={name} onChangeText={setName} />
              <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Валюта</Text>
              <SegmentedControl
                value={entryCurrency}
                onChange={setEntryCurrency}
                options={CURRENCIES.map((c) => ({ label: c, value: c }))}
              />
              <FormInput label="Сумма" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
              <FormInput label="Ставка %" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
              <DateField label="Дата открытия" value={openDate} onChange={setOpenDate} />
              <DateField label="Дата закрытия" value={closeDate} onChange={setCloseDate} />
              <AppButton title={isEditing ? 'Сохранить изменения' : 'Сохранить вклад'} onPress={handleAddDeposit} />
              <View style={{ height: spacing.sm }} />
              <AppButton title="Отмена" variant="outline" onPress={resetForm} />
            </Card>
          ) : (
            <AppButton title="+ Добавить вклад" variant="outline" onPress={() => setShowForm(true)} />
          )}
        </>
      )}

      {segment === 'accounts' && (
        <>
          {savingsAccounts.length === 0 ? (
            <EmptyState title="Нет накопительных счетов" />
          ) : (
            savingsAccounts.map((a) => {
              const nextAccrualDate = new Date(
                a.lastAccrualDate.getFullYear(),
                a.lastAccrualDate.getMonth() + 1,
                a.lastAccrualDate.getDate()
              );
              const lastAccrual = savingsAccruals
                .filter((acc) => acc.accountId === a.id)
                .sort((x, y) => y.date.getTime() - x.date.getTime())[0];
              return (
                <Card key={a.id}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.itemTitle, { color: theme.text }]}>{a.name}</Text>
                    <CardActions
                      onEdit={() => startEditSavingsAccount(a)}
                      onDelete={() => confirmDelete(a.name, () => removeSavingsAccount(a.id))}
                    />
                  </View>
                  <Text style={{ color: theme.textMuted, marginTop: 4 }}>
                    {formatCurrency(convertAmount(a.balance, a.currency, currency, rates), currency)} · {formatNumber(a.rate)}% годовых
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
                    Проценты начисляются ежемесячно на остаток · следующее начисление:{' '}
                    {nextAccrualDate.toLocaleDateString('ru-RU')}
                  </Text>
                  {lastAccrual && (
                    <Text style={{ color: theme.success, fontSize: 12, marginTop: 4, fontWeight: '600' }}>
                      Начислено {lastAccrual.date.toLocaleDateString('ru-RU')}: +
                      {formatCurrency(convertAmount(lastAccrual.amount, a.currency, currency, rates), currency)}
                    </Text>
                  )}
                </Card>
              );
            })
          )}
          {showForm ? (
            <Card>
              <FormInput label="Название счёта" value={name} onChangeText={setName} placeholder="Накопительный счёт" />
              <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Валюта</Text>
              <SegmentedControl
                value={entryCurrency}
                onChange={setEntryCurrency}
                options={CURRENCIES.map((c) => ({ label: c, value: c }))}
              />
              <FormInput label="Текущий остаток" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
              <FormInput label="Ставка % годовых" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
              <AppButton title={isEditing ? 'Сохранить изменения' : 'Сохранить счёт'} onPress={handleAddSavingsAccount} />
              <View style={{ height: spacing.sm }} />
              <AppButton title="Отмена" variant="outline" onPress={resetForm} />
            </Card>
          ) : (
            <AppButton title="+ Добавить накопительный счёт" variant="outline" onPress={() => setShowForm(true)} />
          )}
        </>
      )}

      {segment === 'investments' && (
        <>
          {investments.length === 0 ? (
            <EmptyState title="Нет инвестиций" />
          ) : (
            investments.map((i) => {
              const profitPercent =
                i.purchasePrice > 0 ? ((i.currentPrice - i.purchasePrice) / i.purchasePrice) * 100 : 0;
              const isExpanded = expandedInvestmentId === i.id;
              const payoutLabel = PAYOUT_LABELS[i.assetType];
              const payouts = investmentPayouts
                .filter((p) => p.investmentId === i.id)
                .sort((a, b) => b.date.getTime() - a.date.getTime());
              const totalPayouts = payouts.reduce((sum, p) => sum + p.amount, 0);
              const fmt = (a: number) => formatCurrency(convertAmount(a, i.currency, currency, rates), currency);
              const isRefreshing = refreshingIds.has(i.id);
              return (
                <Card key={i.id}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.itemTitle, { color: theme.text }]}>{i.name}</Text>
                    <View style={styles.headerRight}>
                      <Text style={{ color: theme.textMuted, fontSize: 12 }}>{ASSET_LABELS[i.assetType]}</Text>
                      <CardActions onEdit={() => startEditInvestment(i)} onDelete={() => confirmDelete(i.name, () => removeInvestment(i.id))} />
                    </View>
                  </View>
                  <Text style={{ color: theme.textMuted, marginTop: 4 }}>
                    {i.quantity} шт. по {fmt(i.currentPrice)}
                  </Text>
                  <Text style={{ color: profitPercent >= 0 ? theme.success : theme.danger, fontWeight: '700' }}>
                    {profitPercent >= 0 ? '+' : ''}
                    {formatNumber(profitPercent)}%
                  </Text>
                  {totalPayouts > 0 && (
                    <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                      {payoutLabel} всего: {fmt(totalPayouts)}
                    </Text>
                  )}
                  {i.moexTicker && (
                    <>
                      <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                        Тикер Мосбиржи: {i.moexTicker}
                      </Text>
                      <AppButton
                        title={isRefreshing ? 'Обновление…' : 'Обновить цену с Мосбиржи'}
                        variant="outline"
                        disabled={isRefreshing}
                        onPress={() => refreshMoexPrice(i, { silent: false })}
                      />
                    </>
                  )}
                  <AppButton
                    title={isExpanded ? 'Скрыть выплаты' : `${payoutLabel}`}
                    variant="outline"
                    onPress={() => setExpandedInvestmentId(isExpanded ? null : i.id)}
                  />
                  {isExpanded && (
                    <View style={{ marginTop: spacing.sm }}>
                      {payouts.length > 0 && (
                        <View style={{ marginBottom: spacing.sm }}>
                          {payouts.map((p) =>
                            editingPayoutId === p.id ? (
                              <View key={p.id} style={{ marginBottom: spacing.sm }}>
                                <FormInput
                                  label="Сумма"
                                  keyboardType="decimal-pad"
                                  value={payoutEditAmount}
                                  onChangeText={setPayoutEditAmount}
                                />
                                <DateField label="Дата" value={payoutEditDate} onChange={setPayoutEditDate} />
                                <AppButton title="Сохранить" onPress={handleSavePayoutEdit} />
                                <View style={{ height: spacing.xs }} />
                                <AppButton title="Отмена" variant="outline" onPress={cancelEditPayout} />
                              </View>
                            ) : (
                              <View key={p.id} style={styles.scheduleRow}>
                                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                                  {p.date.toLocaleDateString('ru-RU')}
                                </Text>
                                <Text style={{ color: theme.text, fontSize: 12 }}>{fmt(p.amount)}</Text>
                                <CardActions
                                  onEdit={() => startEditPayout(p)}
                                  onDelete={() =>
                                    confirmDelete(`${payoutLabel.toLowerCase()} от ${p.date.toLocaleDateString('ru-RU')}`, () =>
                                      removeInvestmentPayout(p.id)
                                    )
                                  }
                                />
                              </View>
                            )
                          )}
                        </View>
                      )}
                      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                        Добавить {payoutLabel.toLowerCase()}
                      </Text>
                      <FormInput
                        label="Сумма"
                        keyboardType="decimal-pad"
                        value={payoutAmount}
                        onChangeText={setPayoutAmount}
                      />
                      <DateField label="Дата" value={payoutDate} onChange={setPayoutDate} />
                      <AppButton title="Добавить" onPress={() => handleAddPayout(i.id)} />
                    </View>
                  )}
                </Card>
              );
            })
          )}
          {showForm ? (
            <Card>
              <FormInput label="Название" value={name} onChangeText={setName} />
              <SegmentedControl
                value={assetType}
                onChange={setAssetType}
                options={ASSET_TYPES.map((a) => ({ label: ASSET_LABELS[a], value: a }))}
              />
              <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Валюта</Text>
              <SegmentedControl
                value={entryCurrency}
                onChange={setEntryCurrency}
                options={CURRENCIES.map((c) => ({ label: c, value: c }))}
              />
              <FormInput label="Количество" keyboardType="decimal-pad" value={quantity} onChangeText={setQuantity} />
              <FormInput
                label="Цена покупки"
                keyboardType="decimal-pad"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
              />
              <FormInput
                label="Текущая цена"
                keyboardType="decimal-pad"
                value={currentPrice}
                onChangeText={setCurrentPrice}
              />
              {assetType !== 'crypto' && (
                <>
                  <FormInput
                    label="Тикер Мосбиржи (необязательно)"
                    value={moexTicker}
                    onChangeText={setMoexTicker}
                    placeholder="SBER"
                    autoCapitalize="characters"
                  />
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: spacing.sm }}>
                    Если указать тикер — «Текущая цена» будет подтягиваться с Мосбиржи автоматически
                    при открытии этой вкладки, вручную вводить её больше не придётся.
                  </Text>
                </>
              )}
              <AppButton title={isEditing ? 'Сохранить изменения' : 'Сохранить актив'} onPress={handleAddInvestment} />
              <View style={{ height: spacing.sm }} />
              <AppButton title="Отмена" variant="outline" onPress={resetForm} />
            </Card>
          ) : (
            <AppButton title="+ Добавить актив" variant="outline" onPress={() => setShowForm(true)} />
          )}
        </>
      )}

      {segment === 'cashback' && (
        <>
          {cashbackCards.length === 0 ? (
            <EmptyState title="Нет привязанных карт" />
          ) : (
            cashbackCards.map((c) => (
              <Card key={c.id}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{c.name}</Text>
                  <View style={styles.headerRight}>
                    <Text style={{ color: theme.secondary, fontWeight: '700' }}>{formatNumber(c.cashbackPercent)}%</Text>
                    <CardActions onEdit={() => startEditCashback(c)} onDelete={() => confirmDelete(c.name, () => removeCashbackCard(c.id))} />
                  </View>
                </View>
                <Text style={{ color: theme.textMuted, marginTop: 4 }}>
                  Накоплено: {formatCurrency(c.accumulated, currency)}
                </Text>
              </Card>
            ))
          )}
          {showForm ? (
            <Card>
              <FormInput label="Название карты" value={name} onChangeText={setName} />
              <FormInput label="Кэшбэк %" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
              <AppButton title={isEditing ? 'Сохранить изменения' : 'Сохранить карту'} onPress={handleAddCashback} />
              <View style={{ height: spacing.sm }} />
              <AppButton title="Отмена" variant="outline" onPress={resetForm} />
            </Card>
          ) : (
            <AppButton title="+ Добавить карту" variant="outline" onPress={() => setShowForm(true)} />
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  itemTitle: { fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
});
