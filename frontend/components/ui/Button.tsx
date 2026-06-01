import { ActivityIndicator, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radius, size, spacing, typography } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'whatsapp';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  helperText?: string; // shown below when disabled
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  helperText,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const buttonHeight =
    variant === 'primary' || variant === 'whatsapp'
      ? size.buttonHeight          // 56px
      : size.buttonHeightSecondary; // 48px

  return (
    <View style={fullWidth && styles.fullWidthWrapper}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.base,
          { height: buttonHeight },
          fullWidth && styles.fullWidth,
          variantStyles[variant],
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'secondary' || variant === 'ghost' ? colors.primary : colors.surface}
          />
        ) : (
          <>
            {variant === 'whatsapp' && (
              <MaterialCommunityIcons
                name="whatsapp"
                size={20}
                color={colors.surface}
                style={{ marginRight: 8 }}
              />
            )}
            <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
          </>
        )}
      </Pressable>
      {isDisabled && helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fullWidthWrapper: { width: '100%' },
  base: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  fullWidth: { width: '100%' },
  label: { ...typography.button },
  /** Disabled: opacity 0.4 per ui-choices.md. Never hide the button. */
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.9 },
  helperText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border, // #CBD5E1 — not primary
  },
  destructive: {
    backgroundColor: colors.error,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  whatsapp: {
    backgroundColor: '#25D366',
  },
};

const labelStyles: Record<ButtonVariant, TextStyle> = {
  primary: { color: colors.surface },
  secondary: { color: colors.textPrimary }, // #0F172A
  destructive: { color: colors.surface },
  ghost: { color: colors.primary },
  whatsapp: { color: colors.surface },
};
