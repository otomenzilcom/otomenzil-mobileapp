// CarCatalogCardView — iOS ana katalog kartı (spec §4.8).
//
// Grid: üstte 4:3 görsel + içerik (padding 16). List: 132 genişlik görsel + içerik (padding 12).
// Görsel overlay'leri: puan rozeti (sol-üst), bodyType chip (sol-alt), favori STAR overlay
// (sağ-üst). İçerik: kimlik + "{year} Model", spec deck, aksiyon şeridi (FİYAT + Detaylar/
// Karşılaştır) + kompakt garaj butonu. Ziyaretçi ipucu 2.6 sn sonra sıfırlanır.

import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CarSummary } from '../models/car';
import { radii, shadows, useTheme, webFont } from '../theme';
import { CachedImage } from './CachedImage';
import { CarCardIdentity } from './CarCardIdentity';
import { CarPrice } from './CarPrice';
import { CarSpecDeck } from './CarSpecDeck';
import { CompactGarageButton, OverlayToggleButton } from './WebShellComponents';

export type CarCatalogLayout = 'grid' | 'list';

export interface CarCatalogCardProps {
  car: CarSummary;
  layout: CarCatalogLayout;
  identityCompact?: boolean;
  showsFavoriteButton?: boolean;
  brandLogos?: Record<string, string>;
  isComparing: boolean;
  /**
   * iOS sözleşmesinde yer alır ancak bu kart düzeninde (spec §4.8) görünür bir favori kontrolü
   * yoktur — sağ-üst STAR overlay ve kompakt buton garaj eylemidir. Sözleşme parite için korunur;
   * bu düzende tüketilmez.
   */
  isFavorite: boolean;
  isInGarage: boolean;
  isLoggedIn?: boolean;
  garageBusy?: boolean;
  onDetail: () => void;
  onCompare: () => void;
  /** iOS sözleşme prop'u — bu düzende bağlı değil (bkz. `isFavorite` notu). */
  onToggleFavorite: () => void;
  onToggleGarage: () => void;
  onBrandTap?: () => void;
}

const GUEST_HINT_MS = 2600;

/** Swift CarSummary.displayTitle. */
function displayTitle(brand: string, model: string): string {
  return model.toLowerCase().startsWith(brand.toLowerCase()) ? model : `${brand} ${model}`;
}

export function CarCatalogCard({
  car,
  layout,
  identityCompact = false,
  showsFavoriteButton = true,
  brandLogos,
  isComparing,
  isInGarage,
  isLoggedIn = true,
  garageBusy = false,
  onDetail,
  onCompare,
  onToggleGarage,
  onBrandTap,
}: CarCatalogCardProps): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const [guestHint, setGuestHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashGuestHint = useCallback(() => {
    setGuestHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setGuestHint(false), GUEST_HINT_MS);
  }, []);

  const handleGarage = useCallback(() => {
    if (!isLoggedIn) flashGuestHint();
    onToggleGarage();
  }, [isLoggedIn, flashGuestHint, onToggleGarage]);

  const image = car.images?.find((u) => u.length > 0);
  const rating = car.rating ?? 0;
  const grid = layout === 'grid';

  const imageBlock = (
    <View style={grid ? styles.gridImageBlock : styles.listImageBlock}>
      <Pressable onPress={onDetail} accessibilityRole="button" accessibilityLabel={displayTitle(car.brand, car.model)}>
        <CachedImage
          uri={image}
          style={grid ? styles.gridImage : styles.listImage}
          placeholderColor={colors.stone50}
          recyclingKey={car.id}
        />
      </Pressable>
      {rating > 0 ? (
        <View
          style={[
            styles.ratingBadge,
            { backgroundColor: isDark ? 'rgba(22,101,52,0.92)' : colors.stone900 },
          ]}
        >
          <Text style={[webFont(9, 800), { color: '#FFFFFF' }]}>★ {rating.toFixed(1)} Puan</Text>
        </View>
      ) : null}
      {car.bodyType ? (
        <View
          style={[
            styles.bodyChip,
            { backgroundColor: isDark ? 'rgba(41,37,36,0.92)' : 'rgba(28,25,23,0.8)' },
          ]}
        >
          <Text style={[webFont(9, 900), { color: '#FFFFFF' }]}>{car.bodyType}</Text>
        </View>
      ) : null}
      {showsFavoriteButton ? (
        <View style={styles.overlayButton}>
          <OverlayToggleButton
            active={isInGarage}
            busy={garageBusy && !isInGarage}
            onPress={handleGarage}
            glyph="star"
          />
        </View>
      ) : null}
    </View>
  );

  const content = (
    <View style={grid ? styles.gridContent : styles.listContent}>
      <View style={styles.identityRow}>
        <View style={styles.identityFlex}>
          <CarCardIdentity
            brand={car.brand}
            model={car.model}
            brandLogos={brandLogos}
            compact={identityCompact}
            onBrandTap={onBrandTap}
            onModelTap={onDetail}
          />
        </View>
        {car.year != null ? (
          <Text style={[webFont(9, 800), { color: colors.stone400 }]}>{car.year} Model</Text>
        ) : null}
      </View>

      <CarSpecDeck
        rangeKm={car.rangeKm}
        batteryKwh={car.batteryKwh}
        powerHp={car.powerHp}
        accelerationSec={car.accelerationSec}
      />

      <View style={[styles.hairline, { backgroundColor: colors.borderLight }]} />

      <View style={styles.priceRow}>
        <Text style={[webFont(9, 800), { color: colors.stone400 }]}>FİYAT</Text>
        <View style={styles.priceFlex}>
          <CarPrice
            priceTL={car.priceTL}
            priceForeign={car.priceForeign}
            trAvailable={car.trAvailable}
            style="compact"
          />
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Pressable
          onPress={onDetail}
          accessibilityRole="button"
          accessibilityLabel="Detaylar"
          style={({ pressed }) => [
            styles.detailButton,
            { backgroundColor: colors.stone100, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[webFont(10, 900), { color: colors.stone800 }]}>DETAYLAR</Text>
        </Pressable>
        <Pressable
          onPress={onCompare}
          accessibilityRole="button"
          accessibilityLabel={isComparing ? 'Karşılaştırmadan çıkar' : 'Karşılaştır'}
          style={({ pressed }) => [
            styles.compareButton,
            {
              backgroundColor: colors.emerald600,
              borderColor: isComparing ? colors.emerald250 : 'transparent',
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[webFont(10, 900), { color: '#FFFFFF' }]}>
            {isComparing ? 'ÇIKAR' : 'KARŞILAŞTIR'}
          </Text>
        </Pressable>
      </View>

      {showsFavoriteButton ? (
        <CompactGarageButton
          isFavorite={isInGarage}
          guestHint={guestHint}
          busy={garageBusy}
          onPress={handleGarage}
        />
      ) : null}
    </View>
  );

  return (
    <View
      style={[
        grid ? styles.gridCard : styles.listCard,
        shadows.card,
        { backgroundColor: colors.cardBackground, borderColor: colors.border },
      ]}
    >
      {imageBlock}
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  listCard: {
    flexDirection: 'row',
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  gridImageBlock: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  listImageBlock: {
    width: 132,
    minHeight: 156,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  listImage: {
    width: '100%',
    height: '100%',
    minHeight: 156,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bodyChip: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  overlayButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  gridContent: {
    padding: 16,
    gap: 12,
  },
  listContent: {
    flex: 1,
    padding: 12,
    gap: 10,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  identityFlex: {
    flex: 1,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  priceFlex: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  detailButton: {
    flex: 1,
    borderRadius: radii.button,
    paddingVertical: 10,
    alignItems: 'center',
  },
  compareButton: {
    flex: 1,
    borderRadius: radii.button,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
