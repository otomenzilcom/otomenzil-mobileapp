// WebArticleTable — iOS statik biçimli tablo (spec §4.23), MTV/OTV/kredi sayfalarında.
//
// Header gradient #F0FDF4→#ECFDF5, #BBF7D0 alt çizgi, 10/black. Gövde zebra #FAFAF9/white,
// #F5F5F4 ayraç, 11pt. Hücre stili: "Kredi kullanılamaz" → #DC2626 bold; highlightFirstRate &&
// "%70" → emerald700 bold; "%" → stone800 bold; else stone700 medium. NOT: iOS light-mode renk
// literalleri (tema-bağımsız) — kaynağa parite için birebir korunur.

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { radii, webFont } from '../theme';

export interface WebArticleTableProps {
  headers: string[];
  rows: string[][];
  highlightFirstRate?: boolean;
}

interface CellStyle {
  color: string;
  weight: number;
}

/** Hücre metnine göre renk/ağırlık (iOS kural sırası birebir). */
export function cellStyleFor(text: string, highlightFirstRate: boolean): CellStyle {
  if (text.includes('Kredi kullanılamaz')) return { color: '#DC2626', weight: 700 };
  if (highlightFirstRate && text.includes('%70')) return { color: '#166534', weight: 700 };
  if (text.includes('%')) return { color: '#292524', weight: 700 };
  return { color: '#44403C', weight: 500 };
}

export function WebArticleTable({
  headers,
  rows,
  highlightFirstRate = false,
}: WebArticleTableProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F0FDF4', '#ECFDF5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerRow}
      >
        {headers.map((h, i) => (
          <View key={i} style={styles.cell}>
            <Text style={[webFont(10, 900), { color: '#166534' }]}>{h}</Text>
          </View>
        ))}
      </LinearGradient>

      {rows.map((row, ri) => (
        <View
          key={ri}
          style={[styles.bodyRow, { backgroundColor: ri % 2 === 1 ? '#FAFAF9' : '#FFFFFF' }]}
        >
          {row.map((cell, ci) => {
            const cs = cellStyleFor(cell, highlightFirstRate);
            return (
              <View key={ci} style={styles.cell}>
                <Text style={[webFont(11, cs.weight), { color: cs.color }]}>{cell}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F5F5F4',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
  },
  bodyRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F5F5F4',
  },
  cell: {
    flex: 1,
    paddingHorizontal: 11,
    paddingVertical: 12,
  },
});
