// ProfileView — iOS profil ekranı (spec §3.4, salt-okunur).
//
// Veri: authStore.currentUser + favorites (katalogla çözülür) + garaj sayısı. API çağrısı YOK.
// Oturum kapalıysa giriş istemi. Yönetici için mor aksan/rozet. Favori grid'i favoriyi kaldırır.

import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CachedImage, Icon } from '../../components';
import type { CarSummary } from '../../models';
import { useAuthStore, useNavigationStore } from '../../stores';
import { radii, useTheme, webFont } from '../../theme';
import {
  AccountAvatar,
  CopyableProfileUrl,
  InfoTile,
  LoggedOutPrompt,
  StatTile,
} from './accountPrimitives';

function displayTitle(car: CarSummary): string {
  return car.model.toLowerCase().startsWith(car.brand.toLowerCase())
    ? car.model
    : `${car.brand} ${car.model}`;
}

export function ProfileScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const currentUser = useAuthStore((s) => s.currentUser);
  const favorites = useAuthStore((s) => s.favorites);
  const garageCarIds = useAuthStore((s) => s.garageCarIds);
  const catalogCars = useNavigationStore((s) => s.catalogCars);

  const favoriteCars = useMemo(() => {
    const byId = new Map(catalogCars.map((c) => [c.id, c]));
    return favorites.map((id) => byId.get(id)).filter((c): c is CarSummary => c != null);
  }, [favorites, catalogCars]);

  if (currentUser === null) {
    return (
      <ScrollView style={{ backgroundColor: colors.pageBackground }}>
        <LoggedOutPrompt
          icon="alert-triangle"
          title="Oturum Açmanız Gerekiyor"
          message="Üye profilinizi görüntülemek için giriş yapmalısınız."
          buttonLabel="GİRİŞ YAP VEYA KAYDOL"
          onPress={() =>
            useAuthStore
              .getState()
              .openAuth('Profil sayfasını görebilmek için giriş yapmanız gerekir.')
          }
        />
      </ScrollView>
    );
  }

  const isAdmin = currentUser.isAdmin === true;
  const accent = isAdmin ? '#9333EA' : colors.emerald600;
  const slug = currentUser.memberSlug;

  return (
    <ScrollView
      style={{ backgroundColor: colors.pageBackground }}
      contentContainerStyle={styles.content}
    >
      {/* Profile card */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        {isAdmin ? (
          <View style={[styles.adminBanner, { backgroundColor: '#9333EA' }]}>
            <Icon name="shield" size={13} color="#FFFFFF" />
            <Text style={[webFont(11, 900), { color: '#FFFFFF' }]}>Yönetici Profili</Text>
          </View>
        ) : null}
        <View style={[styles.accentBar, { backgroundColor: accent }]} />

        <View style={styles.identityRow}>
          <AccountAvatar username={currentUser.username} avatarColor={currentUser.avatarColor} />
          <View style={styles.identityText}>
            <Text style={[webFont(20, 900), { color: colors.stone900 }]}>
              {currentUser.username.toUpperCase()}
            </Text>
            {isAdmin ? (
              <View style={[styles.roleBadge, { backgroundColor: 'rgba(147,51,234,0.12)' }]}>
                <Icon name="shield" size={11} color="#9333EA" />
                <Text style={[webFont(10, 800), { color: '#9333EA' }]}>Yönetici</Text>
              </View>
            ) : null}
            {slug ? (
              <Text style={[webFont(12, 600), { color: colors.stone500 }]}>@{slug}</Text>
            ) : null}
            <Text style={[webFont(11, 700), { color: accent }]}>
              {isAdmin ? 'Site Yöneticisi' : 'Aktif Üye'}
            </Text>
          </View>
        </View>

        {/* Info tiles */}
        <View style={styles.tileRow}>
          <InfoTile icon="mail" label="E-posta" value={currentUser.email || '—'} />
          <InfoTile icon="calendar" label="Üyelik tarihi" value={currentUser.memberSince ?? '—'} />
        </View>
        <View style={styles.tileRow}>
          <InfoTile
            icon="shield"
            label="Durum"
            value={isAdmin ? 'YÖNETİCİ ÜYE' : 'AKTİF ÜYE'}
          />
        </View>

        {slug ? <CopyableProfileUrl memberSlug={slug} /> : null}

        {/* Stat tiles */}
        <View style={styles.statRow}>
          <StatTile label="Yorum" value={0} />
          <StatTile label="Favori" value={favorites.length} />
          <StatTile label="Rozet" value={0} />
          <StatTile label="Garaj" value={garageCarIds.length} />
        </View>
      </View>

      {/* Favorites section */}
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.sectionHead}>
          <Icon name="heart" size={16} color={colors.rose500} />
          <Text style={[webFont(15, 900), { color: colors.stone900 }]}>
            Favori Araçlarım ({favoriteCars.length})
          </Text>
        </View>
        <Text style={[webFont(11, 500), { color: colors.stone500 }]}>
          İlgilendiğiniz modeller; garajınızdaki sahip olduğunuz araçlardan ayrıdır.
        </Text>

        {favoriteCars.length === 0 ? (
          <View style={styles.emptyFav}>
            <Icon name="heart-outline" size={28} color={colors.stone400} />
            <Text style={[webFont(12, 600), { color: colors.stone500 }]}>
              Henüz favori aracınız yok.
            </Text>
            <Pressable
              onPress={() => useNavigationStore.getState().navigate('search')}
              accessibilityRole="button"
              accessibilityLabel="Araç Kataloğuna Git"
              style={({ pressed }) => [
                styles.emptyButton,
                { backgroundColor: colors.emerald600, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[webFont(11, 900), { color: '#FFFFFF' }]}>ARAÇ KATALOĞUNA GİT</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.favGrid}>
            {favoriteCars.map((car) => (
              <FavoriteCard key={car.id} car={car} />
            ))}
          </View>
        )}
      </View>

      {/* Footer link */}
      <Pressable
        onPress={() => useNavigationStore.getState().navigate('settings')}
        accessibilityRole="button"
        accessibilityLabel="Hesap bilgilerini düzenle (Ayarlar)"
        style={({ pressed }) => [
          styles.footerLink,
          { backgroundColor: colors.cardBackground, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Icon name="sliders" size={15} color={colors.stone600} />
        <Text style={[webFont(12, 700), { color: colors.stone700 }]}>
          Hesap bilgilerini düzenle (Ayarlar)
        </Text>
      </Pressable>
    </ScrollView>
  );
}

/** Favori kartı: 52×52 küçük görsel, başlık, İncele, köşe kalp (favoriyi kaldırır). */
function FavoriteCard({ car }: { car: CarSummary }): React.JSX.Element {
  const { colors } = useTheme();
  const image = car.images?.find((u) => u.length > 0);
  return (
    <View style={[styles.favCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
      <Pressable
        onPress={() => useNavigationStore.getState().openCarDetail(car.id)}
        accessibilityRole="button"
        accessibilityLabel={displayTitle(car)}
        style={styles.favCardBody}
      >
        <CachedImage uri={image} style={styles.favThumb} placeholderColor={colors.stone50} recyclingKey={car.id} />
        <View style={styles.favCardText}>
          <Text style={[webFont(12, 800), { color: colors.stone900 }]} numberOfLines={2}>
            {displayTitle(car)}
          </Text>
          <Text style={[webFont(10, 700), { color: colors.emerald600 }]}>→ İncele</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => void useAuthStore.getState().toggleFavorite(car.id)}
        accessibilityRole="button"
        accessibilityLabel="Favoriden çıkar"
        hitSlop={8}
        style={styles.favHeart}
      >
        <Icon name="heart" size={16} color={colors.rose500} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  identityRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  identityText: {
    flex: 1,
    gap: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tileRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyFav: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  emptyButton: {
    borderRadius: radii.button,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  favGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  favCard: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
  },
  favCardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  favThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  favCardText: {
    flex: 1,
    gap: 4,
  },
  favHeart: {
    padding: 6,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.inner,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
});
