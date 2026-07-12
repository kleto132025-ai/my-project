import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { CardActions } from '../../components/CardActions';
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
import { formatCurrency, formatNumber } from '../../utils/format';
import {
  calculateAmortizationStep,
  calculateMonthlyPayment,
  calculateMortgageProfit,
  simulateAmortization,
} from '../../utils/calculations';
import { schedulePaymentReminders, scheduleInsuranceReminder, requestNotificationPermissions } from '../../utils/notifications';
import { confirmDelete } from '../../utils/confirm';
import type {
  DebtStatus,
  Credit,
  CreditKind,
  CreditRepayment,
  FriendDebt,
  InsurancePolicy,
  InsurancePaymentFrequency,
  Currency,
} from '../../types';
import { convertAmount } from '../../utils/currency';
import { parseLocaleNumber } from '../../utils/parseNumber';

type Segment = 'credits' | 'mortgage' | 'calendar' | 'debts' | 'insurance';

const CURRENCIES: Currency[] = ['RUB', 'USD', 'EUR'];

export function CreditsScreen() {
  const theme = useTheme();
  const currency = useSettingsStore((s) => s.currency);
  const rates = useSettingsStore((s) => s.exchangeRates);
  const [segment, setSegment] = useState<Segment>('credits');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedCreditId, setExpandedCreditId] = useState<string | null>(null);

  const allCredits = useFinanceStore((s) => s.credits);
  const creditRepayments = useFinanceStore((s) => s.creditRepayments);
  const regularPayments = useFinanceStore((s) => s.regularPayments);
  const friendDebts = useFinanceStore((s) => s.friendDebts);
  const insurancePolicies = useFinanceStore((s) => s.insurancePolicies);
  const saveCredit = useFinanceStore((s) => s.saveCredit);
  const saveFriendDebt = useFinanceStore((s) => s.saveFriendDebt);
  const saveInsurancePolicy = useFinanceStore((s) => s.saveInsurancePolicy);
  const removeCredit = useFinanceStore((s) => s.removeCredit);
  const removeFriendDebt = useFinanceStore((s) => s.removeFriendDebt);
  const removeInsurancePolicy = useFinanceStore((s) => s.removeInsurancePolicy);
  const repayCredit = useFinanceStore((s) => s.repayCredit);
  const makePayment = useFinanceStore((s) => s.makePayment);
  const editCreditRepayment = useFinanceStore((s) => s.editCreditRepayment);
  const removeCreditRepayment = useFinanceStore((s) => s.removeCreditRepayment);

  const credits = useMemo(() => allCredits.filter((c) => c.kind === 'credit'), [allCredits]);
  const mortgages = useMemo(() => allCredits.filter((c) => c.kind === 'mortgage'), [allCredits]);
  const creditsTotalRemaining = useMemo(
    () => credits.reduce((sum, c) => sum + convertAmount(c.remaining, c.currency, currency, rates), 0),
    [credits, currency, rates]
  );
  const mortgageTotalRemaining = useMemo(
    () => mortgages.reduce((sum, c) => sum + convertAmount(c.remaining, c.currency, currency, rates), 0),
    [mortgages, currency, rates]
  );

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currentRemaining, setCurrentRemaining] = useState('');
  const [monthlyPaymentInput, setMonthlyPaymentInput] = useState('');
  const [rate, setRate] = useState('');
  const [term, setTerm] = useState('24');
  const [issueDate, setIssueDate] = useState(new Date());
  const [propertyAddress, setPropertyAddress] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [renovationCosts, setRenovationCosts] = useState('');
  const [entryCurrency, setEntryCurrency] = useState<Currency>(currency);
  const [insuranceCreditId, setInsuranceCreditId] = useState('');
  const [personName, setPersonName] = useState('');
  const [debtStatus, setDebtStatus] = useState<DebtStatus>('i_owe');
  const [reminderDate, setReminderDate] = useState(new Date(Date.now() + 7 * 24 * 3600 * 1000));
  const [insuranceType, setInsuranceType] = useState('');
  const [insurer, setInsurer] = useState('');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 90 * 24 * 3600 * 1000));
  const [insurancePaymentFrequency, setInsurancePaymentFrequency] = useState<InsurancePaymentFrequency>('annual');
  const [earlyRepayAmount, setEarlyRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(new Date());
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [nextPaymentDateInput, setNextPaymentDateInput] = useState(
    new Date(Date.now() + 30 * 24 * 3600 * 1000)
  );
  const [editingRepaymentId, setEditingRepaymentId] = useState<string | null>(null);
  const [repaymentEditAmount, setRepaymentEditAmount] = useState('');
  const [repaymentEditDate, setRepaymentEditDate] = useState(new Date());

  const resetForm = () => {
    setName('');
    setAmount('');
    setCurrentRemaining('');
    setMonthlyPaymentInput('');
    setRate('');
    setTerm('24');
    setIssueDate(new Date());
    setPropertyAddress('');
    setDownPayment('');
    setCurrentValue('');
    setRenovationCosts('');
    setEntryCurrency(currency);
    setInsuranceCreditId('');
    setInsurancePaymentFrequency('annual');
    setPersonName('');
    setInsuranceType('');
    setInsurer('');
    setNextPaymentDateInput(new Date(Date.now() + 30 * 24 * 3600 * 1000));
    setShowForm(false);
    setEditingId(null);
  };

  const startEditCredit = (c: Credit) => {
    setName(c.name);
    setAmount(String(c.amount));
    setCurrentRemaining(String(c.remaining));
    setMonthlyPaymentInput(String(c.monthlyPayment));
    setRate(String(c.rate));
    setTerm(String(c.termMonths));
    setIssueDate(c.startDate);
    setNextPaymentDateInput(c.nextPaymentDate);
    setPropertyAddress(c.propertyAddress ?? '');
    setDownPayment(c.downPayment != null ? String(c.downPayment) : '');
    setCurrentValue(c.currentValue != null ? String(c.currentValue) : '');
    setRenovationCosts(c.renovationCosts != null ? String(c.renovationCosts) : '');
    setEntryCurrency(c.currency);
    setEditingId(c.id);
    setShowForm(true);
  };

  const startEditDebt = (d: FriendDebt) => {
    setPersonName(d.personName);
    setAmount(String(d.amount));
    setDebtStatus(d.status);
    setReminderDate(d.reminderDate ?? new Date());
    setEditingId(d.id);
    setShowForm(true);
  };

  const startEditInsurance = (p: InsurancePolicy) => {
    setInsuranceType(p.type);
    setInsurer(p.insurer);
    setAmount(String(p.amount));
    setEndDate(p.endDate);
    setInsuranceCreditId(p.creditId ?? '');
    setInsurancePaymentFrequency(p.paymentFrequency);
    setEditingId(p.id);
    setShowForm(true);
  };

  const isEditing = editingId !== null;
  const formKind: CreditKind = segment === 'mortgage' ? 'mortgage' : 'credit';

  const handleAddCredit = async () => {
    if (!name.trim() || !amount) return;
    const amt = parseLocaleNumber(amount);
    const rt = parseLocaleNumber(rate || '0');
    const tm = parseInt(term, 10) || 24;
    const existing = editingId ? allCredits.find((c) => c.id === editingId) : undefined;
    // "Текущий остаток" даёт возможность завести уже действующий кредит/ипотеку не с нуля:
    // если поле оставлено пустым, остаток по умолчанию равен полной сумме (как для нового
    // кредита), но его можно указать вручную — тогда все дальнейшие платежи будут считаться
    // именно от этой суммы, а не от исходной суммы кредита.
    const enteredRemaining = currentRemaining.trim() ? parseLocaleNumber(currentRemaining) : NaN;
    const remaining = !Number.isNaN(enteredRemaining) ? enteredRemaining : existing?.remaining ?? amt;
    // Аннуитетная формула считает платёж от исходной суммы и полного срока — для кредита, уже
    // взятого раньше (с указанным вручную "Текущим остатком"), или если банк просто считает
    // иначе, эта цифра может не совпадать с реальным платёжным поручением. Поэтому платёж можно
    // задать вручную; если поле пустое — используется расчёт по формуле, как раньше.
    const enteredMonthlyPayment = monthlyPaymentInput.trim() ? parseLocaleNumber(monthlyPaymentInput) : NaN;
    const monthlyPayment = !Number.isNaN(enteredMonthlyPayment)
      ? enteredMonthlyPayment
      : calculateMonthlyPayment(amt, rt, tm);
    await saveCredit({
      ...(editingId ? { id: editingId } : {}),
      kind: existing?.kind ?? formKind,
      name: name.trim(),
      amount: amt,
      rate: rt,
      termMonths: tm,
      monthlyPayment,
      remaining,
      // Дата следующего платежа теперь задаётся вручную (по умолчанию — через 30 дней),
      // чтобы совпадать с реальным днём списания, а не с произвольной датой создания записи.
      nextPaymentDate: nextPaymentDateInput,
      startDate: issueDate,
      propertyAddress: formKind === 'mortgage' ? propertyAddress.trim() || undefined : undefined,
      downPayment: formKind === 'mortgage' && downPayment ? parseLocaleNumber(downPayment) : undefined,
      currentValue: formKind === 'mortgage' && currentValue ? parseLocaleNumber(currentValue) : undefined,
      renovationCosts: formKind === 'mortgage' && renovationCosts ? parseLocaleNumber(renovationCosts) : undefined,
      // Валюта выбирается в форме (по умолчанию — текущая валюта отображения) и сохраняется
      // как есть: при смене валюты в Настройках суммы конвертируются для отображения, а не
      // переписываются задним числом.
      currency: entryCurrency,
    } as Credit);
    resetForm();
  };

  const handleRepay = async (creditId: string) => {
    const repayAmount = parseLocaleNumber(earlyRepayAmount);
    if (Number.isNaN(repayAmount) || repayAmount <= 0) return;
    await repayCredit(creditId, repayAmount, repayDate);
    setEarlyRepayAmount('');
    setRepayDate(new Date());
  };

  const handleMakePayment = async (creditId: string) => {
    const payAmount = parseLocaleNumber(paymentAmount);
    if (Number.isNaN(payAmount) || payAmount <= 0) return;
    await makePayment(creditId, payAmount, paymentDate);
    setPaymentAmount('');
    setPaymentDate(new Date());
  };

  const startEditRepayment = (r: CreditRepayment) => {
    setEditingRepaymentId(r.id);
    setRepaymentEditAmount(String(r.amount));
    setRepaymentEditDate(r.date);
  };

  const cancelEditRepayment = () => {
    setEditingRepaymentId(null);
    setRepaymentEditAmount('');
  };

  const handleSaveRepaymentEdit = async () => {
    if (!editingRepaymentId) return;
    const editAmount = parseLocaleNumber(repaymentEditAmount);
    if (Number.isNaN(editAmount) || editAmount <= 0) return;
    await editCreditRepayment(editingRepaymentId, editAmount, repaymentEditDate);
    cancelEditRepayment();
  };

  const handleAddDebt = async () => {
    if (!personName.trim() || !amount) return;
    const existing = editingId ? friendDebts.find((d) => d.id === editingId) : undefined;
    await saveFriendDebt({
      ...(editingId ? { id: editingId } : {}),
      personName: personName.trim(),
      amount: parseLocaleNumber(amount),
      status: debtStatus,
      isPaid: existing?.isPaid ?? false,
      reminderDate,
    } as FriendDebt);
    if (!editingId) {
      const granted = await requestNotificationPermissions();
      if (granted) await schedulePaymentReminders(`Долг: ${personName.trim()}`, reminderDate);
    }
    resetForm();
  };

  const handleAddInsurance = async () => {
    if (!insuranceType.trim() || !insurer.trim() || !amount) return;
    const policy: InsurancePolicy = {
      ...(editingId ? { id: editingId } : {}),
      type: insuranceType.trim(),
      insurer: insurer.trim(),
      amount: parseLocaleNumber(amount),
      endDate,
      creditId: insuranceCreditId || undefined,
      paymentFrequency: insurancePaymentFrequency,
    } as InsurancePolicy;
    await saveInsurancePolicy(policy);
    if (!editingId) {
      const granted = await requestNotificationPermissions();
      if (granted) await scheduleInsuranceReminder(policy);
    }
    resetForm();
  };

  const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const eventsByDate = useMemo(() => {
    const map = new Map<string, { label: string; amount: number }[]>();
    const add = (d: Date, event: { label: string; amount: number }) => {
      const k = dateKey(d);
      const list = map.get(k);
      if (list) list.push(event);
      else map.set(k, [event]);
    };
    allCredits.forEach((c) =>
      add(c.nextPaymentDate, {
        label: `${c.kind === 'mortgage' ? 'Ипотека' : 'Кредит'} «${c.name}»`,
        amount: convertAmount(c.monthlyPayment, c.currency, currency, rates),
      })
    );
    friendDebts.forEach((d) => d.reminderDate && add(d.reminderDate, { label: `Долг: ${d.personName}`, amount: d.amount }));
    const now = new Date();
    insurancePolicies.forEach((p) => {
      if (p.paymentFrequency === 'monthly') {
        // Ежемесячный взнос — отмечаем ближайшее в этом месяце число оплаты, а не дату
        // окончания договора (которая может быть через несколько лет).
        add(new Date(now.getFullYear(), now.getMonth(), p.endDate.getDate()), {
          label: `Взнос по страховке: ${p.type}`,
          amount: p.amount,
        });
      } else {
        add(p.endDate, { label: `Страховка: ${p.type}`, amount: p.amount });
      }
    });
    regularPayments
      .filter((p) => p.isActive)
      .forEach((p) => add(new Date(now.getFullYear(), now.getMonth(), p.dayOfMonth), { label: p.name, amount: p.amount }));
    return map;
  }, [allCredits, friendDebts, insurancePolicies, regularPayments, currency, rates]);

  const markedDates = useMemo(() => new Set(eventsByDate.keys()), [eventsByDate]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const selectedDateEvents = selectedDate ? eventsByDate.get(dateKey(selectedDate)) ?? [] : [];

  const renderCreditCard = (c: Credit) => {
    // Все расчёты (амортизация, симуляция процентов) идут в собственной валюте кредита —
    // конвертация в валюту отображения нужна только в момент форматирования для показа.
    const fmt = (amount: number) => formatCurrency(convertAmount(amount, c.currency, currency, rates), currency);
    const progress = ((c.amount - c.remaining) / Math.max(c.amount, 1)) * 100;
    const isExpanded = expandedCreditId === c.id;
    const history = creditRepayments
      .filter((r) => r.creditId === c.id)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    const fullRepayment = history.find((r) => r.type === 'full');

    // Проценты, выплаченные на сегодня, считаются не по фактически внесённым в приложение
    // платежам (для кредита, взятому много лет назад, пришлось бы вручную вносить каждый
    // прошедший месяц), а симуляцией амортизации от даты выдачи до сегодня по сумме платежа
    // и ставке — с учётом всех зафиксированных досрочных погашений в их реальные даты.
    const earlyRepaymentsForSimulation = history
      .filter((r) => r.type !== 'regular')
      .map((r) => ({ date: r.date, amount: r.amount }));
    const totalInterestPaid = simulateAmortization(
      c.amount,
      c.rate,
      c.monthlyPayment,
      c.startDate,
      new Date(),
      earlyRepaymentsForSimulation
    ).totalInterestPaid;
    const linkedInsurance = insurancePolicies.filter((p) => p.creditId === c.id);
    const totalInsuranceCost = linkedInsurance.reduce((sum, p) => sum + p.amount, 0);
    const mortgageProfit =
      c.currentValue != null
        ? calculateMortgageProfit(
            c.amount + (c.downPayment ?? 0),
            c.currentValue,
            c.remaining,
            totalInterestPaid,
            c.renovationCosts ?? 0,
            totalInsuranceCost
          )
        : null;

    // График строится не от исходной суммы кредита, а от текущего фактического остатка
    // (c.remaining) — иначе после любых внесённых платежей график продолжал бы показывать
    // цифры так, будто ни один платёж ещё не был сделан. Даты платежей отсчитываются от
    // c.nextPaymentDate (а не от даты выдачи c.startDate) — день списания по кредиту часто
    // не совпадает с днём выдачи, и график должен показывать именно реальные даты платежей.
    const upcomingSchedule: { date: Date; payment: number; remaining: number }[] = [];
    let scheduleBalance = c.remaining;
    let scheduleDate = new Date(c.nextPaymentDate);
    for (let i = 0; i < 12 && scheduleBalance > 0; i++) {
      const step = calculateAmortizationStep(scheduleBalance, c.rate, c.monthlyPayment);
      scheduleBalance = step.newRemaining;
      upcomingSchedule.push({ date: new Date(scheduleDate), payment: c.monthlyPayment, remaining: scheduleBalance });
      scheduleDate.setMonth(scheduleDate.getMonth() + 1);
    }

    return (
      <Card key={c.id}>
        <View style={styles.rowBetween}>
          <Text style={[styles.itemTitle, { color: theme.text }]}>{c.name}</Text>
          <View style={styles.headerRight}>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{formatNumber(c.rate)}%</Text>
            <CardActions onEdit={() => startEditCredit(c)} onDelete={() => confirmDelete(c.name, () => removeCredit(c.id))} />
          </View>
        </View>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>
          Дата выдачи: {c.startDate.toLocaleDateString('ru-RU')}
          {c.remaining > 0 ? ` · Следующий платёж: ${c.nextPaymentDate.toLocaleDateString('ru-RU')}` : ''}
        </Text>
        {c.kind === 'mortgage' && (c.propertyAddress || c.downPayment != null) && (
          <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>
            {c.propertyAddress ? `Объект: ${c.propertyAddress}` : ''}
            {c.propertyAddress && c.downPayment != null ? ' · ' : ''}
            {c.downPayment != null ? `Первонач. взнос: ${fmt(c.downPayment)}` : ''}
          </Text>
        )}
        <ProgressBar percent={progress} />
        <Text style={{ color: theme.textMuted, marginTop: 6, fontSize: 13 }}>
          Остаток: {fmt(c.remaining)} · Платёж: {fmt(c.monthlyPayment)}/мес
        </Text>
        {fullRepayment && (
          <Text style={{ color: theme.success, marginTop: 4, fontSize: 12, fontWeight: '600' }}>
            Полностью погашен: {fullRepayment.date.toLocaleDateString('ru-RU')}
          </Text>
        )}
        {c.kind === 'mortgage' && (totalInterestPaid > 0 || c.currentValue != null) && (
          <View style={{ marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }}>
            {totalInterestPaid > 0 && (
              <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 2 }}>
                Выплачено процентов на сегодня: {fmt(totalInterestPaid)}
              </Text>
            )}
            {c.renovationCosts != null && c.renovationCosts > 0 && (
              <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 2 }}>
                Расходы на ремонт: {fmt(c.renovationCosts)}
              </Text>
            )}
            {totalInsuranceCost > 0 && (
              <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 2 }}>
                Страховые взносы (сумма внесённых записей): {fmt(totalInsuranceCost)}
              </Text>
            )}
            {c.currentValue != null && mortgageProfit && (
              <>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 2 }}>
                  Текущая стоимость объекта: {fmt(c.currentValue)}
                </Text>
                <Text style={{ color: theme.text, fontSize: 12, marginBottom: 2 }}>
                  Останется при продаже сегодня (за вычетом остатка долга): {fmt(mortgageProfit.saleProceeds)}
                </Text>
                <Text
                  style={{
                    color: mortgageProfit.netProfit >= 0 ? theme.success : theme.danger,
                    fontSize: 13,
                    fontWeight: '700',
                    marginTop: 4,
                  }}
                >
                  Чистая прибыль от объекта на сегодня: {mortgageProfit.netProfit >= 0 ? '+' : ''}
                  {fmt(mortgageProfit.netProfit)} ({mortgageProfit.netProfit >= 0 ? '+' : ''}
                  {formatNumber(mortgageProfit.netProfitPercent)}%)
                </Text>
              </>
            )}
          </View>
        )}
        <AppButton
          title={isExpanded ? 'Скрыть график' : 'График погашения'}
          variant="outline"
          onPress={() => {
            if (!isExpanded) {
              setPaymentAmount(String(c.monthlyPayment));
              setPaymentDate(c.nextPaymentDate);
            }
            setExpandedCreditId(isExpanded ? null : c.id);
          }}
        />
        {isExpanded && (
          <View style={{ marginTop: spacing.sm }}>
            {/* Показываем не больше 12 ближайших платежей, отталкиваясь от текущего остатка. */}
            {upcomingSchedule.map((row, i) => (
              <View key={i} style={styles.scheduleRow}>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{row.date.toLocaleDateString('ru-RU')}</Text>
                <Text style={{ color: theme.text, fontSize: 12 }}>
                  {fmt(row.payment)}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                  Остаток: {fmt(row.remaining)}
                </Text>
              </View>
            ))}
            {upcomingSchedule.length === 12 && scheduleBalance > 0 && (
              <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4 }}>
                Показаны ближайшие 12 платежей
              </Text>
            )}

            {history.length > 0 && (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                  История погашений
                </Text>
                {history.map((r) =>
                  editingRepaymentId === r.id ? (
                    <View key={r.id} style={{ marginBottom: spacing.sm }}>
                      <FormInput
                        label="Сумма"
                        keyboardType="decimal-pad"
                        value={repaymentEditAmount}
                        onChangeText={setRepaymentEditAmount}
                      />
                      <DateField label="Дата" value={repaymentEditDate} onChange={setRepaymentEditDate} />
                      <AppButton title="Сохранить" onPress={handleSaveRepaymentEdit} />
                      <View style={{ height: spacing.xs }} />
                      <AppButton title="Отмена" variant="outline" onPress={cancelEditRepayment} />
                    </View>
                  ) : (
                    <View key={r.id} style={styles.scheduleRow}>
                      <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                        {r.date.toLocaleDateString('ru-RU')}
                      </Text>
                      <Text style={{ color: theme.text, fontSize: 12 }}>{fmt(r.amount)}</Text>
                      <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                        {r.type === 'full' ? 'Полное' : r.type === 'regular' ? 'Регулярный' : 'Частичное'}
                      </Text>
                      <CardActions
                        onEdit={() => startEditRepayment(r)}
                        onDelete={() =>
                          confirmDelete(`платёж от ${r.date.toLocaleDateString('ru-RU')}`, () =>
                            removeCreditRepayment(r.id)
                          )
                        }
                      />
                    </View>
                  )
                )}
              </View>
            )}

            {c.remaining > 0 && (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                  Внести платёж
                </Text>
                <FormInput
                  label="Сумма платежа"
                  keyboardType="decimal-pad"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="Сумма"
                />
                <DateField label="Дата платежа" value={paymentDate} onChange={setPaymentDate} />
                <AppButton title="Внести платёж" onPress={() => handleMakePayment(c.id)} />
              </View>
            )}

            {c.remaining > 0 && (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                  Досрочное погашение
                </Text>
                <FormInput
                  label="Сумма досрочного погашения"
                  keyboardType="decimal-pad"
                  value={earlyRepayAmount}
                  onChangeText={setEarlyRepayAmount}
                  placeholder="Сумма"
                />
                <DateField label="Дата погашения" value={repayDate} onChange={setRepayDate} />
                <AppButton title="Погасить" onPress={() => handleRepay(c.id)} />
              </View>
            )}
          </View>
        )}
      </Card>
    );
  };

  const renderCreditForm = (submitLabel: string) => (
    <Card>
      <FormInput label="Название" value={name} onChangeText={setName} />
      <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Валюта</Text>
      <SegmentedControl
        value={entryCurrency}
        onChange={setEntryCurrency}
        options={CURRENCIES.map((c) => ({ label: c, value: c }))}
      />
      <FormInput label="Сумма" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      <FormInput
        label="Текущий остаток долга (на сегодня)"
        keyboardType="decimal-pad"
        value={currentRemaining}
        onChangeText={setCurrentRemaining}
        placeholder="Если не заполнить — берётся вся сумма"
      />
      <FormInput label="Ставка %" keyboardType="decimal-pad" value={rate} onChangeText={setRate} />
      <FormInput label="Срок (мес.)" keyboardType="numeric" value={term} onChangeText={setTerm} />
      <FormInput
        label="Ежемесячный платёж"
        keyboardType="decimal-pad"
        value={monthlyPaymentInput}
        onChangeText={setMonthlyPaymentInput}
        placeholder="Если не заполнить — считается автоматически"
      />
      <DateField label="Дата выдачи" value={issueDate} onChange={setIssueDate} />
      <DateField label="Дата следующего платежа" value={nextPaymentDateInput} onChange={setNextPaymentDateInput} />
      {formKind === 'mortgage' && (
        <>
          <FormInput label="Объект недвижимости" value={propertyAddress} onChangeText={setPropertyAddress} placeholder="Адрес или описание" />
          <FormInput label="Первоначальный взнос" keyboardType="decimal-pad" value={downPayment} onChangeText={setDownPayment} />
          <FormInput
            label="Текущая рыночная стоимость объекта"
            keyboardType="decimal-pad"
            value={currentValue}
            onChangeText={setCurrentValue}
            placeholder="Для расчёта чистой прибыли от объекта"
          />
          <FormInput
            label="Расходы на ремонт (всего)"
            keyboardType="decimal-pad"
            value={renovationCosts}
            onChangeText={setRenovationCosts}
          />
        </>
      )}
      <AppButton title={isEditing ? 'Сохранить изменения' : submitLabel} onPress={handleAddCredit} />
      <View style={{ height: spacing.sm }} />
      <AppButton title="Отмена" variant="outline" onPress={resetForm} />
    </Card>
  );

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
          { label: 'Ипотека', value: 'mortgage' },
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
            <>
              <Card style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
                <Text style={styles.summaryLabel}>Общий остаток по кредитам</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(creditsTotalRemaining, currency)}</Text>
              </Card>
              {credits.map(renderCreditCard)}
            </>
          )}
          {showForm ? (
            renderCreditForm('Сохранить кредит')
          ) : (
            <AppButton title="+ Добавить кредит" variant="outline" onPress={() => setShowForm(true)} />
          )}
        </>
      )}

      {segment === 'mortgage' && (
        <>
          {mortgages.length === 0 ? (
            <EmptyState title="Нет ипотечных кредитов" />
          ) : (
            <>
              <Card style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
                <Text style={styles.summaryLabel}>Общий остаток по ипотеке</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(mortgageTotalRemaining, currency)}</Text>
              </Card>
              {mortgages.map(renderCreditCard)}
            </>
          )}
          {showForm ? (
            renderCreditForm('Сохранить ипотеку')
          ) : (
            <AppButton title="+ Добавить ипотеку" variant="outline" onPress={() => setShowForm(true)} />
          )}
        </>
      )}

      {segment === 'calendar' && (
        <Card>
          <MiniCalendar markedDates={markedDates} onDayPress={setSelectedDate} />
          <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: spacing.sm }}>
            Отмечены даты платежей по кредитам, регулярным платежам, долгам и страховкам. Напоминания приходят за 1 и 3 дня. Нажмите на дату, чтобы увидеть, какой платёж на неё приходится.
          </Text>
          {selectedDate && (
            <View style={[styles.calendarFootnote, { borderTopColor: theme.border }]}>
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>
                {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              {selectedDateEvents.length === 0 ? (
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>На эту дату платежей не запланировано</Text>
              ) : (
                selectedDateEvents.map((event, i) => (
                  <View key={i} style={styles.scheduleRow}>
                    <Text style={{ color: theme.textMuted, fontSize: 12, flexShrink: 1 }}>{event.label}</Text>
                    <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600' }}>
                      {formatCurrency(event.amount, currency)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
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
                  <View style={styles.headerRight}>
                    <Text style={{ color: d.status === 'i_owe' ? theme.expenseColor : theme.incomeColor, fontWeight: '700' }}>
                      {formatCurrency(d.amount, currency)}
                    </Text>
                    <CardActions onEdit={() => startEditDebt(d)} onDelete={() => confirmDelete(d.personName, () => removeFriendDebt(d.id))} />
                  </View>
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
              <FormInput label="Сумма" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
              <SegmentedControl
                value={debtStatus}
                onChange={setDebtStatus}
                options={[
                  { label: 'Я должен', value: 'i_owe' },
                  { label: 'Мне должны', value: 'owed_to_me' },
                ]}
              />
              <DateField label="Напомнить" value={reminderDate} onChange={setReminderDate} />
              <AppButton title={isEditing ? 'Сохранить изменения' : 'Сохранить долг'} onPress={handleAddDebt} />
              <View style={{ height: spacing.sm }} />
              <AppButton title="Отмена" variant="outline" onPress={resetForm} />
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
                  <View style={styles.headerRight}>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>{p.insurer}</Text>
                    <CardActions onEdit={() => startEditInsurance(p)} onDelete={() => confirmDelete(p.type, () => removeInsurancePolicy(p.id))} />
                  </View>
                </View>
                <Text style={{ color: theme.textMuted, marginTop: 4 }}>
                  {formatCurrency(p.amount, currency)}
                  {p.paymentFrequency === 'monthly' ? ' · взнос ежемесячно' : ' · взнос ежегодно'}
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                  Окончание: {p.endDate.toLocaleDateString('ru-RU')}
                </Text>
                {p.creditId && (
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                    Ипотека: {allCredits.find((c) => c.id === p.creditId)?.name ?? '—'}
                  </Text>
                )}
              </Card>
            ))
          )}
          {showForm ? (
            <Card>
              <FormInput label="Тип полиса" value={insuranceType} onChangeText={setInsuranceType} placeholder="ОСАГО" />
              <FormInput label="Страховщик" value={insurer} onChangeText={setInsurer} />
              <FormInput label="Сумма взноса" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="Сколько заплатили за этот период" />
              <DateField label="Дата окончания" value={endDate} onChange={setEndDate} />
              <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Как часто вносится взнос</Text>
              <SegmentedControl
                value={insurancePaymentFrequency}
                onChange={setInsurancePaymentFrequency}
                options={[
                  { label: 'Ежегодно', value: 'annual' },
                  { label: 'Ежемесячно', value: 'monthly' },
                ]}
              />
              {mortgages.length > 0 && (
                <>
                  <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: spacing.sm }}>
                    «Сумма взноса» — это стоимость одной оплаты (не общая сумма страхования за все годы). Если полис
                    продлевается ежегодно, добавляйте отдельную запись на каждый оплаченный год — тогда «Страховые
                    взносы» в карточке ипотеки будут суммировать все реально внесённые платежи.
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>
                    Относится к ипотеке (страхование жизни/объекта)
                  </Text>
                  <SegmentedControl
                    value={insuranceCreditId}
                    onChange={setInsuranceCreditId}
                    options={[{ label: 'Не привязано', value: '' }, ...mortgages.map((m) => ({ label: m.name, value: m.id }))]}
                  />
                </>
              )}
              <AppButton title={isEditing ? 'Сохранить изменения' : 'Сохранить полис'} onPress={handleAddInsurance} />
              <View style={{ height: spacing.sm }} />
              <AppButton title="Отмена" variant="outline" onPress={resetForm} />
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryCard: { padding: spacing.md },
  summaryLabel: { color: '#E2E8F0', fontSize: 13, marginBottom: 4 },
  summaryAmount: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  calendarFootnote: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
});
