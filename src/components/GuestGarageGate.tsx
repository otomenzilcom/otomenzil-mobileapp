// GuestGarageGateView — iOS ziyaretçi garaj kapısı (spec §4.20).
//
// Tam ekran koyu hero: gradient [stone950, stone900(flip-aware), emerald950] + emerald radial
// glow (yaklaşık — RN'de LinearGradient overlay ile). Kilit pill, "Garajım" 32/black, açıklama
// metinleri, 3 WebFeatureCard (darkSurface), CTA "Giriş Yap · Garajını Aç".

import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme, webFont } from '../theme';
import { Icon } from './ComponentIcon';
import { launchFeatureCards, WebFeatureCard } from './WebShellComponents';

export interface GuestGarageGateProps {
  onLogin: () => void;
}

export function GuestGarageGate({ onLogin }: GuestGarageGateProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <LinearGradient
      colors={[colors.stone950, colors.stone900, colors.emerald950]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      {/* emerald glow yaklaşımı — sağ-üst köşeden yumuşak parıltı */}
      <LinearGradient
        colors={['rgba(22,163,74,0.3)', 'rgba(22,163,74,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.6 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.lockPill}>
          <Icon name="lock" size={12} color="#A7F3D0" />
          <Text style={[webFont(10, 900), styles.lockText, { color: '#A7F3D0' }]}>Üyelik gerekli</Text>
        </View>

        <Text style={[webFont(32, 900), { color: '#FFFFFF' }]}>Garajım</Text>
        <Text style={[webFont(14, 500), { color: colors.stone300 }]}>
          Aracını garajına eklemek ve yönetmek için giriş yapmalısınız.
        </Text>
        <Text style={[webFont(12, 500), { color: colors.stone400 }]}>
          Üye olduğunuzda aracınızı kaydedebilir, yakın şarj istasyonlarını bulabilir ve menzil
          hesaplarını kişiselleştirebilirsiniz.
        </Text>

        <View style={styles.cards}>
          {launchFeatureCards.map((card) => (
            <WebFeatureCard
              key={card.title}
              icon={card.icon}
              title={card.title}
              text={card.text}
              darkSurface
            />
          ))}
        </View>

        <Pressable
          onPress={onLogin}
          accessibilityRole="button"
          accessibilityLabel="Giriş Yap · Garajını Aç"
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: colors.emerald500, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Icon name="login" size={16} color={colors.stone950} />
          <Text style={[webFont(11, 900), styles.ctaText, { color: colors.stone950 }]}>
            Giriş Yap · Garajını Aç
          </Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
    paddingTop: 40,
  },
  lockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(52,211,153,0.2)',
    backgroundColor: 'rgba(22,163,74,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  lockText: {
    letterSpacing: 1.2,
  },
  cards: {
    gap: 10,
    marginTop: 8,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  ctaText: {
    letterSpacing: 0.8,
  },
});
