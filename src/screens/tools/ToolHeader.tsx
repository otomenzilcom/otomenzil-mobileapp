// Paylaşılan `toolHeader(badge:title:subtitle:)` — iOS ToolViews.swift §1.3 birebir.
//
// Basit VStack: badge (10/black emerald, tracking 0.8), title (24/black), subtitle (13/medium
// stone500). Consumption & Trunk araç ekranları bunu tüketir.

import { StyleSheet, Text, View } from 'react-native';

import { useTheme, webFont } from '../../theme';

export interface ToolHeaderProps {
  badge: string;
  title: string;
  subtitle: string;
}

export function ToolHeader({ badge, title, subtitle }: ToolHeaderProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[webFont(10, 900), styles.badge, { color: colors.emerald600 }]}>
        {badge.toUpperCase()}
      </Text>
      <Text style={[webFont(24, 900), { color: colors.stone900 }]}>{title}</Text>
      <Text style={[webFont(13, 500), { color: colors.stone500 }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  badge: {
    letterSpacing: 0.8,
  },
});
