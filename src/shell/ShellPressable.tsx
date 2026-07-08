// Basılabilir sarmalayıcı — tutarlı dokunma geri bildirimi (basılıyken hafif saydamlık).
// Shell chrome'unda tekrar eden Pressable stilini merkezîleştirir.

import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

export interface ShellPressableProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
  disabled?: boolean;
  hitSlop?: number;
}

export function ShellPressable({
  onPress,
  style,
  children,
  accessibilityLabel,
  disabled,
  hitSlop,
}: ShellPressableProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [style, { opacity: disabled ? 0.5 : pressed ? 0.6 : 1 }]}
    >
      {children}
    </Pressable>
  );
}
