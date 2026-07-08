// Slider — iOS SwiftUI Slider(value, in:step:) karşılığı.
//
// @react-native-community/slider kurulu DEĞİL; yeni bağımlılık eklememek için PanResponder ile
// hafif bir kaydırıcı. min/max/step ve tint renkleri prop olarak alınır (puanlama 0…5 step 1,
// şarj 0…95 / 0…100 step 5). Değer chip'i konumlandırmak için thumb merkez x'i onThumbPosition
// ile bildirilir — spec'in hardcoded 180pt offset'i yerine ölçülen track genişliği (RN §5).

import { useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderHandlers,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const THUMB_SIZE = 22;
const TRACK_HEIGHT = 4;

export interface SliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Thumb merkez x'i (px) — değer chip'i konumlandırmak için. */
  onThumbPositionChange?: (centerX: number) => void;
}

/** PanResponder kapanışının render sırasında değişen değerleri okuduğu değişebilir konfig. */
interface SliderConfig {
  minimumValue: number;
  maximumValue: number;
  step: number;
  disabled: boolean;
  trackWidth: number;
  onValueChange: (value: number) => void;
}

function clampToStep(raw: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, raw));
  const steps = Math.round((clamped - min) / step);
  return Math.min(max, min + steps * step);
}

/** PanResponder tabanlı kaydırıcı (step'li, tint'li). */
export function Slider({
  value,
  minimumValue,
  maximumValue,
  step,
  onValueChange,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
  disabled,
  style,
  onThumbPositionChange,
}: SliderProps): React.JSX.Element {
  const [trackWidth, setTrackWidth] = useState(0);

  // PanResponder bir kez kurulur; kapanış, olay anında bir ref'teki en güncel konfigten değerleri
  // okur. Ref yalnızca effect'te yazılır, panHandlers effect'te state'e taşınır (react-hooks temiz).
  const configRef = useRef<SliderConfig>({
    minimumValue,
    maximumValue,
    step,
    disabled: disabled ?? false,
    trackWidth: 0,
    onValueChange,
  });
  const [panHandlers, setPanHandlers] = useState<GestureResponderHandlers | null>(null);

  useEffect(() => {
    configRef.current = {
      minimumValue,
      maximumValue,
      step,
      disabled: disabled ?? false,
      trackWidth,
      onValueChange,
    };
  }, [minimumValue, maximumValue, step, disabled, trackWidth, onValueChange]);

  useEffect(() => {
    let grantX = 0;
    const emit = (x: number): void => {
      const cfg = configRef.current;
      const track = Math.max(1, cfg.trackWidth - THUMB_SIZE);
      const frac = Math.min(1, Math.max(0, (x - THUMB_SIZE / 2) / track));
      const raw = cfg.minimumValue + frac * (cfg.maximumValue - cfg.minimumValue);
      cfg.onValueChange(clampToStep(raw, cfg.minimumValue, cfg.maximumValue, cfg.step));
    };
    const pan = PanResponder.create({
      onStartShouldSetPanResponder: () => !configRef.current.disabled,
      onMoveShouldSetPanResponder: () => !configRef.current.disabled,
      onPanResponderGrant: (e) => {
        if (configRef.current.disabled) return;
        grantX = e.nativeEvent.locationX;
        emit(grantX);
      },
      onPanResponderMove: (_e, gesture) => {
        if (configRef.current.disabled) return;
        // Sürükleme sırasında locationX güvenilmez; grant konumu + dx ile mutlak track x.
        emit(grantX + gesture.dx);
      },
    });
    setPanHandlers(pan.panHandlers);
  }, []);

  const range = maximumValue - minimumValue;
  const fraction = range > 0 ? (value - minimumValue) / range : 0;
  const usable = Math.max(0, trackWidth - THUMB_SIZE);
  const thumbLeft = fraction * usable;
  const thumbCenter = thumbLeft + THUMB_SIZE / 2;

  useEffect(() => {
    if (onThumbPositionChange && trackWidth > 0) onThumbPositionChange(thumbCenter);
  }, [onThumbPositionChange, thumbCenter, trackWidth]);

  const onLayout = (e: LayoutChangeEvent): void => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View
      style={[styles.container, disabled && styles.disabled, style]}
      onLayout={onLayout}
      {...(panHandlers ?? {})}
    >
      <View style={[styles.track, { backgroundColor: maximumTrackTintColor }]}>
        <View
          style={[styles.fill, { backgroundColor: minimumTrackTintColor, width: thumbCenter }]}
        />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          { left: thumbLeft, backgroundColor: thumbTintColor ?? minimumTrackTintColor },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: THUMB_SIZE + 8,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  fill: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    top: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
});
