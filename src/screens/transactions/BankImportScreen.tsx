import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { AppButton } from '../../components/AppButton';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useTheme } from '../../theme';
import { spacing, radius } from '../../theme';
import { useFinanceStore } from '../../store/financeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { readTextFile } from '../../utils/exportData';
import { parseCsv, parseCsvAmount, parseCsvDate } from '../../utils/csv';
import { suggestCategory } from '../../utils/categorize';
import { formatCurrency } from '../../utils/format';
import type { TransactionType } from '../../types';

type Step = 'pick' | 'map' | 'preview';

interface ParsedRow {
  date: Date;
  amount: number;
  type: TransactionType;
  comment: string;
  category: string;
}

// Импорт выписки банка — вместо ввода каждой операции вручную. Формат CSV у банков не
// стандартизован (разные столбцы, разделители, даты), поэтому вместо жёсткого парсера под
// конкретный банк — сопоставление столбцов вручную один раз за импорт, дальше всё автоматически:
// категория подбирается той же эвристикой (`suggestCategory`), что используется при ручном вводе.
export function BankImportScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const currency = useSettingsStore((s) => s.currency);

  const [step, setStep] = useState<Step>('pick');
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [dateCol, setDateCol] = useState<number | null>(null);
  const [amountCol, setAmountCol] = useState<number | null>(null);
  const [descriptionCol, setDescriptionCol] = useState<number | null>(null);
  const [signConvention, setSignConvention] = useState<'negative_expense' | 'positive_expense'>('negative_expense');
  const [isImporting, setIsImporting] = useState(false);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (result.canceled) return;
      const asset = result.assets[0];
      const text = await readTextFile(asset.uri);
      const rows = parseCsv(text);
      if (rows.length < 2) {
        Alert.alert('Не удалось прочитать файл', 'В файле не найдено ни одной строки с данными — проверьте, что это CSV-выписка');
        return;
      }
      setFileName(asset.name);
      setHeaders(rows[0]);
      setDataRows(rows.slice(1));
      setDateCol(null);
      setAmountCol(null);
      setDescriptionCol(null);
      setStep('map');
    } catch {
      Alert.alert('Не удалось прочитать файл', 'Проверьте, что выбран текстовый CSV-файл выписки');
    }
  };

  const parsedRows: ParsedRow[] = React.useMemo(() => {
    if (dateCol == null || amountCol == null) return [];
    const result: ParsedRow[] = [];
    for (const row of dataRows) {
      const date = parseCsvDate(row[dateCol] ?? '');
      const rawAmount = parseCsvAmount(row[amountCol] ?? '');
      if (!date || Number.isNaN(rawAmount) || rawAmount === 0) continue;
      const isNegative = rawAmount < 0;
      const type: TransactionType =
        signConvention === 'negative_expense' ? (isNegative ? 'expense' : 'income') : isNegative ? 'income' : 'expense';
      const comment = descriptionCol != null ? (row[descriptionCol] ?? '').trim() : '';
      const category = suggestCategory(comment, type) ?? 'Другое';
      result.push({ date, amount: Math.abs(rawAmount), type, comment, category });
    }
    return result;
  }, [dataRows, dateCol, amountCol, descriptionCol, signConvention]);

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    try {
      for (const row of parsedRows) {
        await addTransaction({
          amount: row.amount,
          category: row.category,
          type: row.type,
          date: row.date,
          comment: row.comment || undefined,
          currency,
        });
      }
      Alert.alert('Импорт завершён', `Добавлено операций: ${parsedRows.length}`, [
        { text: 'Готово', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setIsImporting(false);
    }
  };

  const ColumnPicker = ({
    label,
    value,
    onChange,
    optional,
  }: {
    label: string;
    value: number | null;
    onChange: (i: number | null) => void;
    optional?: boolean;
  }) => (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>
        {label}
        {optional ? ' (необязательно)' : ''}
      </Text>
      <View style={styles.chipsRow}>
        {optional && (
          <Pressable
            onPress={() => onChange(null)}
            style={[styles.chip, { backgroundColor: value == null ? theme.accent : theme.isDark ? '#1E293B' : '#EEF2F7', borderColor: value == null ? theme.accent : theme.border }]}
          >
            <Text style={{ color: value == null ? '#FFFFFF' : theme.text, fontSize: 12, fontWeight: '600' }}>Нет</Text>
          </Pressable>
        )}
        {headers.map((h, i) => {
          const active = value === i;
          return (
            <Pressable
              key={i}
              onPress={() => onChange(i)}
              style={[styles.chip, { backgroundColor: active ? theme.accent : theme.isDark ? '#1E293B' : '#EEF2F7', borderColor: active ? theme.accent : theme.border }]}
            >
              <Text style={{ color: active ? '#FFFFFF' : theme.text, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                {h.trim() || `Столбец ${i + 1}`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      {step === 'pick' && (
        <Card>
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: spacing.sm }}>
            Импорт выписки банка
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: spacing.md }}>
            Выгрузите выписку по счёту/карте из приложения банка в формате CSV, затем выберите этот
            файл здесь. Формат у банков разный — на следующем шаге нужно один раз указать, какой
            столбец за что отвечает, дальше категории подберутся автоматически.
          </Text>
          <AppButton title="Выбрать файл CSV" onPress={handlePickFile} />
        </Card>
      )}

      {step === 'map' && (
        <Card>
          <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 4 }}>{fileName}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: spacing.md }}>
            Найдено строк: {dataRows.length}. Укажите, какой столбец за что отвечает.
          </Text>
          <ColumnPicker label="Столбец с датой" value={dateCol} onChange={setDateCol} />
          <ColumnPicker label="Столбец с суммой" value={amountCol} onChange={setAmountCol} />
          <ColumnPicker label="Столбец с описанием операции" value={descriptionCol} onChange={setDescriptionCol} optional />
          <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Как понимать знак суммы</Text>
          <SegmentedControl
            value={signConvention}
            onChange={setSignConvention}
            options={[
              { label: 'Минус = расход', value: 'negative_expense' },
              { label: 'Минус = доход', value: 'positive_expense' },
            ]}
          />
          <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 4, marginBottom: spacing.md }}>
            В большинстве выписок списания (расходы) идут со знаком минус — если после проверки на
            следующем шаге окажется наоборот, вернитесь и переключите здесь.
          </Text>
          <AppButton
            title="Далее"
            onPress={() => setStep('preview')}
            disabled={dateCol == null || amountCol == null}
          />
          <View style={{ height: spacing.sm }} />
          <AppButton title="Назад к выбору файла" variant="outline" onPress={() => setStep('pick')} />
        </Card>
      )}

      {step === 'preview' && (
        <>
          <Card>
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 4 }}>Проверьте перед импортом</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: spacing.sm }}>
              Распознано операций: {parsedRows.length} из {dataRows.length} строк
              {dataRows.length > parsedRows.length ? ` (${dataRows.length - parsedRows.length} пропущено — не удалось разобрать дату или сумму)` : ''}.
            </Text>
            <ScrollView style={styles.previewList} nestedScrollEnabled>
              {parsedRows.slice(0, 20).map((row, i) => (
                <View key={i} style={styles.previewRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 12 }} numberOfLines={1}>
                      {row.comment || row.category}
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 11 }}>
                      {row.date.toLocaleDateString('ru-RU')} · {row.category}
                    </Text>
                  </View>
                  <Text style={{ color: row.type === 'expense' ? theme.expenseColor : theme.incomeColor, fontWeight: '700', fontSize: 12 }}>
                    {row.type === 'expense' ? '-' : '+'}
                    {formatCurrency(row.amount, currency)}
                  </Text>
                </View>
              ))}
              {parsedRows.length > 20 && (
                <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: spacing.sm }}>
                  И ещё {parsedRows.length - 20} операций…
                </Text>
              )}
            </ScrollView>
          </Card>
          <AppButton
            title={isImporting ? 'Импорт…' : `Импортировать ${parsedRows.length} операций`}
            onPress={handleImport}
            disabled={isImporting || parsedRows.length === 0}
          />
          <View style={{ height: spacing.sm }} />
          <AppButton title="Назад к сопоставлению столбцов" variant="outline" onPress={() => setStep('map')} />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.sm + 2, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, maxWidth: 160 },
  previewList: { maxHeight: 360 },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000015',
    gap: spacing.sm,
  },
});
