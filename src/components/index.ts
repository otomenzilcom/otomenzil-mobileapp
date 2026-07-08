// Paylaşılan bileşen barrel export'u (Wave 4).
//
// Wave 5 ekran agent'ları buradan tüketir. ToastBanner shell'de yaşar (authStore toast'larına
// bağlı) — burada yalnızca yeniden dışa aktarılır; kopya YOKTUR.

// ── Temel / paylaşılan primitifler ──
export { Icon } from './ComponentIcon';
export type { IconName, IconProps } from './ComponentIcon';
export { CachedImage } from './CachedImage';
export type { CachedImageProps } from './CachedImage';
export { Slider } from './Slider';
export type { SliderProps } from './Slider';
export { ShareSheet, share } from './ShareSheet';
export type { ShareContent } from './ShareSheet';
export {
  WebEmeraldBadge,
  WebSectionHeader,
  WebPrimaryButton,
  WebCardAccentBar,
  WebFeatureCard,
  ShareMetaPillButton,
  WebColorModeToggle,
  OverlayToggleButton,
  CompactGarageButton,
  launchFeatureCards,
} from './WebShellComponents';
export type {
  WebEmeraldBadgeProps,
  WebSectionHeaderProps,
  WebPrimaryButtonProps,
  WebCardAccentBarProps,
  WebFeatureCardProps,
  ShareMetaPillButtonProps,
  WebColorModeToggleProps,
  OverlayToggleButtonProps,
  CompactGarageButtonProps,
} from './WebShellComponents';

// ── HTML / TOC ──
export { HTMLContentView } from './HTMLContentView';
export type { HTMLContentViewProps } from './HTMLContentView';
export {
  buildHtmlDocument,
  buildProseCss,
  parseBridgeMessage,
  reloadSignature,
} from './htmlContentTemplate';
export type { ProseStyle } from './htmlContentTemplate';
export { ArticleToc } from './ArticleToc';
export type { ArticleTocProps } from './ArticleToc';

// ── Araç bileşenleri ──
export { BrandLogo } from './BrandLogo';
export type { BrandLogoProps } from './BrandLogo';
export { CarPrice } from './CarPrice';
export type { CarPriceProps, CarPriceStyle } from './CarPrice';
export { CarSpecDeck } from './CarSpecDeck';
export type { CarSpecDeckProps } from './CarSpecDeck';
export { CarCardIdentity } from './CarCardIdentity';
export type { CarCardIdentityProps } from './CarCardIdentity';
export { CarCatalogCard } from './CarCatalogCard';
export type { CarCatalogCardProps, CarCatalogLayout } from './CarCatalogCard';
export { CarSummaryCard } from './CarSummaryCard';
export type { CarSummaryCardProps } from './CarSummaryCard';
export { CarDetailPricePanel, CarDetailMetricsGrid } from './CarDetailPricePanel';
export type {
  CarDetailPricePanelProps,
  CarDetailMetricsGridProps,
} from './CarDetailPricePanel';
export { DataVerificationBadge } from './DataVerificationBadge';
export type { DataVerificationBadgeProps } from './DataVerificationBadge';
export { CompareCarModelPicker } from './CompareCarModelPicker';
export type { CompareCarModelPickerProps } from './CompareCarModelPicker';
export {
  formatRange,
  formatBattery,
  formatPower,
  formatAcceleration,
  formatChargingMinutes,
} from './carSpecFormat';

// ── Blog / reklam ──
export { BlogPostCard, BlogMetaBadges } from './BlogPostCard';
export type { BlogPostCardProps, BlogMetaBadgesProps, BlogCardLayout } from './BlogPostCard';
export { AdSlot } from './AdSlot';
export type { AdSlotProps } from './AdSlot';

// ── Etkileşim (puanlama/yorum) ──
export {
  CarRatingVoteBar,
  ChargingSimulatorSection,
  ReportErrorSheet,
  CarReviewsSection,
  BlogCommentsSection,
  CompareCommentsSection,
} from './EngagementViews';
export type {
  CarRatingVoteBarProps,
  ChargingSimulatorSectionProps,
  ReportErrorSheetProps,
  CarReviewsSectionProps,
  BlogCommentsSectionProps,
  CompareCommentsSectionProps,
} from './EngagementViews';
export { WebCommentsSection } from './WebCommentsSection';
export type { WebCommentsSectionProps, CommentAccessors } from './WebCommentsSection';

// ── Düzen / araç ekranları ──
export { WebFilterField } from './WebFilterField';
export type { WebFilterFieldProps, FilterOption } from './WebFilterField';
export { WebArticleTable, cellStyleFor } from './WebArticleTable';
export type { WebArticleTableProps } from './WebArticleTable';
export { EngineeringLabSection } from './EngineeringLabSection';
export type { EngineeringLabSectionProps } from './EngineeringLabSection';
export { LegalPageLayout, FlowLayout, legalRelatedDefaults, htmlPlainTextLength } from './LegalPageLayout';
export type { LegalPageLayoutProps, LegalKind, LegalRelatedLink, FlowLayoutProps } from './LegalPageLayout';
export { GuestGarageGate } from './GuestGarageGate';
export type { GuestGarageGateProps } from './GuestGarageGate';

// ── ToastBanner (shell'den yeniden dışa aktarım — kopya değil) ──
export { ToastBanner } from '../shell/ToastBanner';
