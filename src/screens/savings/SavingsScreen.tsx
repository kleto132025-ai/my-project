import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
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
import { formatCurrency } from '../../utils/format';
import { calculateGoalProgress } from '../../utils/calculations';
import type { AssetType } from '../../types';

type Segment = 'deposits' | 'investments' | 'goals' | 'cashback';

const ASSET_TYPES: AssetType[] = ['stock', 'bond', 'crypto', 'fund'];
const ASSET_LABELS: Record<AssetType, string> = { stock: 'Акции', bond: 'Облигации', crypto: 'Крипта', fund: 'ПИФ' };

export function SavingsScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const [segment, setSegment] = useState<Segment>('goals');
  const [showForm, setShowForm] = useState(false);

  const deposits = useFinanceStore((s) => s.deposits);
  const investments = useFinanceStore((s) => s.investments);
  const goals = useFinanceStore((s) => s.goals);
  const cashbackCards = useFinanceStore((s) => s.cashbackCards);
  const saveDeposit = useFinanceStore((s) => s.saveDeposit);
  const saveInvestment = useFinanceStore((s) => s.saveInvestment);
  const saveGoal = useFinanceStore((s) => s.saveGoal);
  const saveCashbackCard = useFinanceStore((s) => s.saveCashbackCard);

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
  const [deadline, setDeadline] = useState(new Date(Date.now() + 180 * 24 * 3600 * 1000));
  const [isShared, setIsShared] = useState(false);
  const [partnerName, setPartnerName] = useState('');

  const resetForm = () => {
    setName('');
    setAmount('');
    setRate('');
    setQuantity('');
    setPurchasePrice('');
    setCurrentPrice('');
    setIsShared(false);
    setPartnerName('');
    setShowForm(false);
  };

  const handleAddDeposit = async () => {
    if (!name.trim() || !amount) return;
    await saveDeposit({
      name: name.trim(),
      amount: parseFloat(amount),
      rate: parseFloat(rate || '0'),
      openDate,
      closeDate,
    });
    resetForm();
  };

  const handleAddInvestment = async () => {
    if (!name.trim() || !quantity) return;
    await saveInvestment({
      name: name.trim(),
      assetType,
      quantity: parseFloat(quantity),
      purchasePrice: parseFloat(purchasePrice || '0'),
      currentPrice: parseFloat(currentPrice || purchasePrice || '0'),
    });
    resetForm();
  };

  const handleAddGoal = async () => {
    if (!name.trim() || !amount) return;
    await saveGoal({
      name: name.trim(),
      targetAmount: parseFloat(amount),
      savedAmount: 0,
      deadline,
      priority: 'medium',
      isShared,
      partnerName: isShared ? partnerName.trim() : undefined,
      partnerSavedAmount: isShared ? 0 : undefined,
    });
    resetForm();
  };

  const handleAddCashback = async () => {
    if (!name.trim() || !rate) return;
    await saveCashbackCard({ name: name.trim(), cashbackPercent: parseFloat(rate), accumulated: 0 });
    resetForm();
  };

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
          { label: 'Инвестиции', value: 'investments' },
          { label: 'Кэшбэк', value: 'cashback' },
        ]}
      />

      {segment === 'goals' && (
        <>
          {goals.length === 0 ? (
            <EmptyState title="Пока нет целей" subtitle="Создайте первую финансовую цель" />
          ) : (
            goals.map((g) => (
              <Card key={g.id}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{g.name}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                    до {g.deadline.toLocaleDateString('ru-RU')}
                  </Text>
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
              <FormInput label="Целевая сумма" keyboardType="numeric" value={amount} onChangeText={setAmount} />
              <DateField label="Срок" value={deadline} onChange={setDeadline} />
              <View style={styles.rowBetween}>
                <Text style={{ color: theme.text }}>Цель с партнёром</Text>
                <Switch value={isShared} onValueChange={setIsShared} />
              </View>
              {isShared && (
                <FormInput label="Имя партнёра" value={partnerName} onChangeText={setPartnerName} />
              )}
              <AppButton title="Сохранить цель" onPress={handleAddGoal} />
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
                <Text style={[styles.itemTitle, { color: theme.text }]}>{d.name}</Text>
                <Text style={{ color: theme.textMuted, marginTop: 4 }}>
                  {formatCurrency(d.amount, currency)} · {d.rate}% годовых
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
              <FormInput label="Сумма" keyboardType="numeric" value={amount} onChangeText={setAmount} />
              <FormInput label="Ставка %" keyboardType="numeric" value={rate} onChangeText={setRate} />
              <DateField label="Дата открытия" value={openDate} onChange={setOpenDate} />
              <DateField label="Дата закрытия" value={closeDate} onChange={setCloseDate} />
              <AppButton title="Сохранить вклад" onPress={handleAddDeposit} />
            </Card>
          ) : (
            <AppButton title="+ Добавить вклад" variant="outline" onPress={() => setShowForm(true)} />
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
              return (
                <Card key={i.id}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.itemTitle, { color: theme.text }]}>{i.name}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>{ASSET_LABELS[i.assetType]}</Text>
                  </View>
                  <Text style={{ color: theme.textMuted, marginTop: 4 }}>
                    {i.quantity} шт. по {formatCurrency(i.currentPrice, currency)}
                  </Text>
                  <Text style={{ color: profitPercent >= 0 ? theme.success : theme.danger, fontWeight: '700' }}>
                    {profitPercent >= 0 ? '+' : ''}
                    {profitPercent.toFixed(1)}%
                  </Text>
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
              <FormInput label="Количество" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
              <FormInput
                label="Цена покупки"
                keyboardType="numeric"
                value={purchasePrice}
                onChangeText={setPurchasePrice}
              />
              <FormInput
                label="Текущая цена"
                keyboardType="numeric"
                value={currentPrice}
                onChangeText={setCurrentPrice}
              />
              <AppButton title="Сохранить актив" onPress={handleAddInvestment} />
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
                  <Text style={{ color: theme.secondary, fontWeight: '700' }}>{c.cashbackPercent}%</Text>
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
              <FormInput label="Кэшбэк %" keyboardType="numeric" value={rate} onChangeText={setRate} />
              <AppButton title="Сохранить карту" onPress={handleAddCashback} />
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
});
