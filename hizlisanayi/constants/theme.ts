export const colors = {
  // Primary
  primary: '#1D4ED8',
  primaryDark: '#1E40AF',
  primaryLight: '#EFF6FF',

  // Surfaces
  background: '#F1F5F9',
  surface: '#FFFFFF',
  border: '#CBD5E1',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textOnPrimary: '#FFFFFF',

  // Status: Success
  success: '#15803D',
  successBg: '#F0FDF4',

  // Status: Urgent / Warning
  urgent: '#C2410C',
  urgentBg: '#FFF7ED',
  // keep 'warning' as alias for urgentBg text, for backward compat
  warning: '#C2410C',

  // Status: Error
  error: '#DC2626',
  errorBg: '#FEF2F2',

  // Status: Neutral / Pending
  neutral: '#475569',
  neutralBg: '#F8FAFC',

  // Misc
  placeholder: '#94A3B8',
  disabled: '#CBD5E1',
} as const;

export const typography = {
  /** Screen title — 28 / bold */
  pageTitle: { fontSize: 28 as const, fontWeight: 'bold' as const },
  /** Section header within a screen — 20 / semibold */
  sectionTitle: { fontSize: 20 as const, fontWeight: '600' as const },
  /** Job title in card, company name — 17 / semibold */
  cardTitle: { fontSize: 17 as const, fontWeight: '600' as const },
  /** Descriptions, form labels — 16 / regular */
  body: { fontSize: 16 as const, fontWeight: '400' as const },
  /** Meta info: city, time, category — 14 / regular */
  secondary: { fontSize: 14 as const, fontWeight: '400' as const },
  /** Timestamps, helper text — 13 / regular */
  caption: { fontSize: 13 as const, fontWeight: '400' as const },
  /** Status labels, category tags — 12 / semibold */
  badge: { fontSize: 12 as const, fontWeight: '600' as const },
  /** Button label */
  button: { fontSize: 16 as const, fontWeight: '600' as const },
} as const;

export const spacing = {
  xs: 8,   // inner icon padding, tight gaps
  sm: 12,  // between label and input
  md: 16,  // screen horizontal padding, card padding
  lg: 24,  // between card sections
  xl: 32,  // between major screen sections
  xxl: 40,
  xxxl: 48,
} as const;

export const radius = {
  /** Inputs & buttons */
  md: 14,
  /** Cards — alias: radius.lg kept for backward compatibility */
  lg: 16,
  card: 16,
  /** Pills / chips */
  pill: 999,
  /** Photo thumbnails */
  photo: 10,
  /** Bottom sheets — applied to top corners only */
  sheet: 24,
} as const;

export const size = {
  /** Input height — 52px */
  inputHeight: 52,
  /** Primary CTA button height — 56px */
  buttonHeight: 56,
  /** Secondary / ghost button height — 48px */
  buttonHeightSecondary: 48,
  /** Destructive button height — 48px */
  buttonHeightSmall: 48,
  /** List rows min touch target */
  listRowMinHeight: 56,
} as const;
