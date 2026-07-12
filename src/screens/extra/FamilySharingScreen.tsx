import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { FormInput } from '../../components/FormInput';
import { AppButton } from '../../components/AppButton';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useTheme } from '../../theme';
import { spacing, radius } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { filterTransactionsByPeriod, EXPORT_PERIOD_LABELS, type ExportPeriod } from '../../utils/period';
import { generateAndSharePdfReport } from '../../utils/report';
import { exportTransactionsCsv } from '../../utils/exportData';

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const SHARE_PERIODS: ExportPeriod[] = ['all', 'this_month', 'last_month', 'this_year'];

export function FamilySharingScreen() {
  const theme = useTheme();
  const inviteCode = useMemo(() => generateInviteCode(), []);
  const [joinCode, setJoinCode] = useState('');
  const transactions = useFinanceStore((s) => s.transactions);
  const currency = useSettingsStore((s) => s.currency);
  const rates = useSettingsStore((s) => s.exchangeRates);

  // Список категорий строится из реально существующих транзакций (а не из полного справочника
  // категорий) — иначе в списке были бы и категории, которыми пользователь никогда не пользовался.
  const categories = useMemo(() => {
    const set = new Set(transactions.map((t) => t.category));
    return Array.from(set).sort();
  }, [transactions]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sharePeriod, setSharePeriod] = useState<ExportPeriod>('this_month');

  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return filterTransactionsByPeriod(
      transactions.filter((t) => t.category === selectedCategory),
      sharePeriod
    );
  }, [transactions, selectedCategory, sharePeriod]);

  const handleShareCategoryPdf = async () => {
    if (!selectedCategory) return;
    await generateAndSharePdfReport(
      `${selectedCategory} — ${EXPORT_PERIOD_LABELS[sharePeriod]}`,
      categoryTransactions,
      currency,
      rates
    );
  };

  const handleShareCategoryCsv = async () => {
    if (!selectedCategory) return;
    await exportTransactionsCsv(categoryTransactions);
  };

  const handleJoin = () => {
    if (joinCode.trim().length === 0) return;
    Alert.alert(
      'Демо-режим',
      'Постоянное совместное ведение бюджета по коду (с автоматическим обновлением у обеих сторон) появится вместе с облачной синхронизацией. Пока доступен реальный, но разовый способ — «Поделиться категорией» ниже.'
    );
  };

  return (
    <ScreenContainer>
      <Card>
        <Text style={[styles.title, { color: theme.text }]}>Поделиться категорией</Text>
        <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: spacing.sm }}>
          Собственник приложения сам решает, какую категорию показать — отправляется срез только
          по ней (файлом через «Поделиться»), остальные данные никуда не уходят. Это разовая
          выгрузка на сегодня, а не постоянный доступ — при следующих тратах присылать нужно будет
          заново.
        </Text>
        {categories.length === 0 ? (
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>Пока нет ни одной транзакции — нечем поделиться</Text>
        ) : (
          <>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Категория</Text>
            <View style={styles.chipsRow}>
              {categories.map((c) => {
                const active = selectedCategory === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setSelectedCategory(active ? null : c)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.accent : theme.isDark ? '#1E293B' : '#EEF2F7',
                        borderColor: active ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? '#FFFFFF' : theme.text, fontSize: 12, fontWeight: '600' }}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
            {selectedCategory && (
              <>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4, marginTop: spacing.sm }}>Период</Text>
                <SegmentedControl
                  value={sharePeriod}
                  onChange={setSharePeriod}
                  options={SHARE_PERIODS.map((p) => ({ label: EXPORT_PERIOD_LABELS[p], value: p }))}
                />
                <Text style={{ color: theme.textMuted, fontSize: 12, marginVertical: spacing.sm }}>
                  Записей за выбранный период: {categoryTransactions.length}
                </Text>
                <AppButton title="Поделиться PDF" onPress={handleShareCategoryPdf} />
                <View style={{ height: spacing.sm }} />
                <AppButton title="Поделиться CSV" variant="outline" onPress={handleShareCategoryCsv} />
              </>
            )}
          </>
        )}
      </Card>

      <Card style={styles.center}>
        <Text style={[styles.title, { color: theme.text }]}>Пригласите партнёра (демо)</Text>
        <Text style={{ color: theme.textMuted, textAlign: 'center', marginBottom: spacing.md }}>
          Покажите этот QR-код или продиктуйте код приглашения
        </Text>
        <View style={styles.qrWrap}>
          <QRCode value={`finance-app://family-invite/${inviteCode}`} size={180} color={theme.primary} />
        </View>
        <Text style={[styles.code, { color: theme.text }]}>{inviteCode}</Text>
      </Card>

      <Card>
        <Text style={[styles.title, { color: theme.text }]}>Присоединиться (демо)</Text>
        <FormInput label="Код приглашения" value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" />
        <AppButton title="Присоединиться к бюджету" onPress={handleJoin} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  qrWrap: { padding: spacing.md, backgroundColor: '#FFFFFF', borderRadius: 12 },
  code: { fontSize: 22, fontWeight: '800', letterSpacing: 4, marginTop: spacing.md },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.sm + 2, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
});
