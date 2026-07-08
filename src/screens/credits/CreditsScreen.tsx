import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { SegmentedControl } from '../../components/SegmentedControl';
import { ProgressBar } from '../../components/ProgressBar';
import { FormInput } from '../../components/FormInput';
import { DateField } from '../../components/DateField';
import { AppButton } from '../../components/AppButton';
import { EmptyState } from '../../components/EmptyState';
import { MiniCalendar } from '../../components/MiniCalendar';
import { useTheme } from '../../theme';
import { spacing } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { formatCurrency } from '../../utils/format';
import { calculateLoanRemaining, calculateMonthlyPayment } from '../../utils/calculations';
import { schedulePaymentReminders, scheduleReminder, requestNotificationPermissions } from '../../utils/notifications';
import type { DebtStatus } from '../../types';

type Segment = 'credits' | 'calendar' | 'debts' | 'insurance';

function monthsBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
}

export function CreditsScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const [segment, setSegment] = useState<Segment>('credits');
  const [showForm, setShowForm] = useState(false);
  const [expandedCreditId, setExpandedCreditId] = useState<string | null>(null);

  const credits = useFinanceStore((s) => s.credits);
  const regularPayments = useFinanceStore((s) => s.regularPayments);
  const friendDebts = useFinanceStore((s) => s.friendDebts);
  const insurancePolicies = useFinanceStore((s) => s.insurancePolicies);
  const saveCredit = useFinanceStore((s) => s.saveCredit);
  const saveFriendDebt = useFinanceStore((s) => s.saveFriendDebt);
  const saveInsurancePolicy = useFinanceStore((s) => s.saveInsurancePolicy);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [term, setTerm] = useState('24');
  const [personName, setPersonName] = useState('');
  const [debtStatus, setDebtStatus] = useState<DebtStatus>('i_owe');
  const [reminderDate, setReminderDate] = useState(new Date(Date.now() + 7 * 24 * 3600 * 1000));
  const [insuranceType, setInsuranceType] = useState('');
  const [insurer, setInsurer] = useState('');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 90 * 24 * 3600 * 1000));
  const [earlyRepayAmount, setEarlyRepayAmount] = useState('');

  const resetForm = () => {
    setName('');
    setAmount('');
    setRate('');
    setTerm('24');
    setPersonName('');
    setInsuranceType('');
    setInsurer('');
    setShowForm(false);
  };

  const handleAddCredit = async () => {
    if (!name.trim() || !amount) return;
    const amt = parseFloat(amount);
    const rt = parseFloat(rate || '0');
    const tm = parseInt(term, 10) || 24;
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    await saveCredit({
      name: name.trim(),
      amount: amt,
      rate: rt,
      termMonths: tm,
      monthlyPayment: calculateMonthlyPayment(amt, rt, tm),
      remaining: amt,
      nextPaymentDate,
      startDate: new Date(),
    });
    resetForm();
  };

  const handleEarlyRepay = async (creditId: string) => {
    const credit = credits.find((c) => c.id === creditId);
    const repayAmount = parseFloat(earlyRepayAmount);
    if (!credit || Number.isNaN(repayAmount) || repayAmount <= 0) return;
    await saveCredit({ ...credit, remaining: Math.max(credit.remaining - repayAmount, 0) });
    setEarlyRepayAmount('');
    Alert.alert('Готово', 'Досрочное погашение учтено');
  };

  const handleAddDebt = async () => {
    if (!personName.trim() || !amount) return;
    await saveFriendDebt({
      personName: personName.trim(),
      amount: parseFloat(amount),
      status: debtStatus,
      isPaid: false,
      reminderDate,
    });
    const granted = await requestNotificationPermissions();
    if (granted) await schedulePaymentReminders(`Долг: ${personName.trim()}`, reminderDate);
    resetForm();
  };

  const handleAddInsurance = async () => {
    if (!insuranceType.trim() || !insurer.trim() || !amount) return;
    await saveInsurancePolicy({
      type: insuranceType.trim(),
      insurer: insurer.trim(),
      amount: parseFloat(amount),
      endDate,
    });
    const granted = await requestNotificationPermissions();
    if (granted) {
      const reminderAt = new Date(endDate);
      reminderAt.setDate(reminderAt.getDate() - 30);
      await scheduleReminder('Страховка скоро истекает', `${insuranceType.trim()} — окончание через 30 дней`, reminderAt);
    }
    resetForm();
  };

  const markedDates = useMemo(() => {
    const set = new Set<string>();
    const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    credits.forEach((c) => set.add(key(c.nextPaymentDate)));
    friendDebts.forEach((d) => d.reminderDate && set.add(key(d.reminderDate)));
    insurancePolicies.forEach((p) => set.add(key(p.endDate)));
    const now = new Date();
    regularPayments
      .filter((p) => p.isActive)
      .forEach((p) => set.add(key(new Date(now.getFullYear(), now.getMonth(), p.dayOfMonth))));
    return set;
  }, [credits, friendDebts, insurancePolicies, regularPayments]);

  return (
    <ScreenContainer>
      <SegmentedControl
        value={segment}
        onChange={(v) => {
          setSegment(v);
          resetForm();
        }}
        options={[
          { label: 'Кредиты', value: 'credits' },
          { label: 'Календарь', value: 'calendar' },
          { label: 'Долги', value: 'debts' },
          { label: 'Страховка', value: 'insurance' },
        ]}
      />

      {segment === 'credits' && (
        <>
          {credits.length === 0 ? (
            <EmptyState title="Нет активных кредитов" />
          ) : (
            credits.map((c) => {
              const paidMonths = monthsBetween(c.startDate, new Date());
              const progress = ((c.amount - c.remaining) / Math.max(c.amount, 1)) * 100;
              const isExpanded = expandedCreditId === c.id;
              return (
                <Card key={c.id}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.itemTitle, { color: theme.text }]}>{c.name}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>{c.rate}%</Text>
                  </View>
                  <ProgressBar percent={progress} />
                  <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 13 }}>
                    Остаток: {formatCurrency(c.remaining, currency)} · Платёж: {formatCurrency(c.monthlyPayment, currency)}/мес
                  </Text>
                  <AppButton
                    title={isExpanded ? 'Скрыть график' : 'График погашения'}
                    variant="outline"
                    onPress={() => setExpandedCreditId(isExpanded ? null : c.id)}
                  />
                  {isExpanded && (
                    <View style={{ marginTop: spacing.sm }}>
                      {Array.from({ length: Math.min(c.termMonths, 12) }).map((_, i) => {
                        const month = i + 1;
                        const remaining = calculateLoanRemaining(c.amount, c.rate, month, c.termMonths);
                        return (
                          <View key={month} style={styles.scheduleRow}>
                            <Text style={{ color: theme.textMuted, fontSize: 12 }}>Месяц {month}</Text>
                            <Text style={{ color: theme.text, fontSize: 12 }}>
                              {formatCurrency(c.monthlyPayment, currency)}
                            </Text>
                            <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                              Остаток: {formatCurrency(remaining, currency)}
                            </Text>
                          </View>
                        );
                      })}
                      {c.termMonths > 12 && (
                        <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                          Показаны первые 12 месяцев из {c.termMonths}
                        </Text>
                      )}
                      <View style={{ marginTop: spacing.sm }}>
                        <FormInput
                          label="Досрочное погашение"
                          keyboardType="numeric"
                          value={earlyRepayAmount}
                          onChangeText={setEarlyRepayAmount}
                          placeholder="Сумма"
                        />
                        <AppButton title="Погасить досрочно" onPress={() => handleEarlyRepay(c.id)} />
                      </View>
                    </View>
                  )}
                </Card>
              );
            })
          )}
          {showForm ? (
            <Card>
              <FormInput label="Название" value={name} onChangeText={setName} />
              <FormInput label="Сумма" keyboardType="numeric" value={amount} onChangeText={setAmount} />
              <FormInput label="Ставка %" keyboardType="numeric" value={rate} onChangeText={setRate} />
              <FormInput label="Срок (мес.)" keyboardType="numeric" value={term} onChangeText={setTerm} />
              <AppButton title="Сохранить кредит" onPress={handleAddCredit} />
            </Card>
          ) : (
            <AppButton title="+ Добавить кредит" variant="outline" onPress={() => setShowForm(true)} />
          )}
        </>
      )}

      {segment === 'calendar' && (
        <Card>
          <MiniCalendar markedDates={markedDates} />
          <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.sm }}>
            Отмечены даты платежей по кредитам, регулярным платежам, долгам и страховкам. Напоминания приходят за 1 и 3 дня.
          </Text>
        </Card>
      )}

      {segment === 'debts' && (
        <>
          {friendDebts.length === 0 ? (
            <EmptyState title="Нет долгов" />
          ) : (
            friendDebts.map((d) => (
              <Card key={d.id}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{d.personName}</Text>
                  <Text style={{ color: d.status === 'i_owe' ? theme.expenseColor : theme.incomeColor, fontWeight: '700' }}>
                    {formatCurrency(d.amount, currency)}
                  </Text>
                </View>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                  {d.status === 'i_owe' ? 'Я должен' : 'Мне должны'} · {d.isPaid ? 'Оплачено' : 'Не оплачено'}
                </Text>
              </Card>
            ))
          )}
          {showForm ? (
            <Card>
              <FormInput label="Имя" value={personName} onChangeText={setPersonName} />
              <FormInput label="Сумма" keyboardType="numeric" value={amount} onChangeText={setAmount} />
              <SegmentedControl
                value={debtStatus}
                onChange={setDebtStatus}
                options={[
                  { label: 'Я должен', value: 'i_owe' },
                  { label: 'Мне должны', value: 'owed_to_me' },
                ]}
              />
              <DateField label="Напомнить" value={reminderDate} onChange={setReminderDate} />
              <AppButton title="Сохранить долг" onPress={handleAddDebt} />
            </Card>
          ) : (
            <AppButton title="+ Добавить долг" variant="outline" onPress={() => setShowForm(true)} />
          )}
        </>
      )}

      {segment === 'insurance' && (
        <>
          {insurancePolicies.length === 0 ? (
            <EmptyState title="Нет полисов страхования" />
          ) : (
            insurancePolicies.map((p) => (
              <Card key={p.id}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{p.type}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>{p.insurer}</Text>
                </View>
                <Text style={{ color: theme.textMuted, marginTop: 4 }}>{formatCurrency(p.amount, currency)}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                  Окончание: {p.endDate.toLocaleDateString('ru-RU')}
                </Text>
              </Card>
            ))
          )}
          {showForm ? (
            <Card>
              <FormInput label="Тип полиса" value={insuranceType} onChangeText={setInsuranceType} placeholder="ОСАГО" />
              <FormInput label="Страховщик" value={insurer} onChangeText={setInsurer} />
              <FormInput label="Сумма" keyboardType="numeric" value={amount} onChangeText={setAmount} />
              <DateField label="Дата окончания" value={endDate} onChange={setEndDate} />
              <AppButton title="Сохранить полис" onPress={handleAddInsurance} />
            </Card>
          ) : (
            <AppButton title="+ Добавить полис" variant="outline" onPress={() => setShowForm(true)} />
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  itemTitle: { fontSize: 15, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
});
