import type { CSSProperties } from 'react'
import type { AnimationFrameImageSource } from './animationConfig'

export type EquippedItemGlowVariant = 'weapon' | 'defense'

type GlowStyle = {
  core: string
  outer: string
  aura: string
  rim: string
  saturate: number
  brightness: number
  contrast: number
}

type RgbColor = { r: number; g: number; b: number }

const GLOW_STYLES = {
  weapon: {
    core: 'rgba(255, 255, 255, 0.82)',
    outer: 'rgba(0, 150, 255, 0.62)',
    aura: 'rgba(42, 168, 255, 0.34)',
    rim: 'rgba(170, 228, 255, 0.5)',
    saturate: 1.2,
    brightness: 1.1,
    contrast: 1.08,
  },
  defense: {
    core: 'rgba(255, 255, 255, 0.8)',
    outer: 'rgba(64, 224, 208, 0.52)',
    aura: 'rgba(33, 190, 170, 0.3)',
    rim: 'rgba(201, 255, 246, 0.48)',
    saturate: 1.14,
    brightness: 1.07,
    contrast: 1.05,
  },
} satisfies Record<EquippedItemGlowVariant, GlowStyle>

function normalizeHexColor(colorHex?: string | null): string | undefined {
  const trimmed = colorHex?.trim()
  if (!trimmed) return undefined
  const normalized = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) return normalized
  return undefined
}

function hexToRgb(colorHex: string): RgbColor {
  const normalized = colorHex.slice(1)
  const hex = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

function mixWithWhite(rgb: RgbColor, amount: number): RgbColor {
  return {
    r: Math.round(rgb.r + ((255 - rgb.r) * amount)),
    g: Math.round(rgb.g + ((255 - rgb.g) * amount)),
    b: Math.round(rgb.b + ((255 - rgb.b) * amount)),
  }
}

function rgba(rgb: RgbColor, alpha: number): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

function getGlowPalette(variant: EquippedItemGlowVariant, colorHex?: string): GlowStyle {
  const normalizedHex = normalizeHexColor(colorHex)
  if (!normalizedHex) return GLOW_STYLES[variant]

  const rgb = hexToRgb(normalizedHex)
  const rimRgb = mixWithWhite(rgb, 0.62)

  return {
    ...GLOW_STYLES[variant],
    outer: rgba(rgb, variant === 'weapon' ? 0.62 : 0.52),
    aura: rgba(rgb, variant === 'weapon' ? 0.34 : 0.3),
    rim: rgba(rimRgb, variant === 'weapon' ? 0.5 : 0.48),
  }
}

export function getEquippedItemGlowVariant(
  imageSource?: AnimationFrameImageSource,
): EquippedItemGlowVariant | undefined {
  if (!imageSource || imageSource === 'url') return undefined
  if (imageSource.startsWith('weapon')) return 'weapon'
  if (imageSource.startsWith('defense')) return 'defense'
  return undefined
}

export function getEquippedItemGlowImageFilter(
  variant?: EquippedItemGlowVariant,
  colorHex?: string,
  shadowPreset: 'soft' | 'medium' | 'strong' = 'medium',
): string {
  const baseShadow = shadowPreset === 'soft'
    ? 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))'
    : shadowPreset === 'strong'
      ? 'drop-shadow(0 4px 14px rgba(0,0,0,0.5))'
      : 'drop-shadow(0 2px 10px rgba(0,0,0,0.45))'

  if (!variant) return baseShadow

  const style = getGlowPalette(variant, colorHex)
  return [
    baseShadow,
    `drop-shadow(0 0 2px ${style.core})`,
    `drop-shadow(0 0 10px ${style.outer})`,
    `drop-shadow(0 0 24px ${style.aura})`,
    `saturate(${style.saturate})`,
    `brightness(${style.brightness})`,
    `contrast(${style.contrast})`,
  ].join(' ')
}

export function getEquippedItemGlowBackdropStyle(
  variant?: EquippedItemGlowVariant,
  colorHex?: string,
): CSSProperties | undefined {
  if (!variant) return undefined

  const style = getGlowPalette(variant, colorHex)
  return {
    position: 'absolute',
    inset: '18%',
    borderRadius: '50%',
    background: `radial-gradient(circle, ${style.rim} 0%, ${style.aura} 42%, rgba(255,255,255,0) 78%)`,
    filter: 'blur(14px)',
    opacity: 0.95,
    transform: 'scale(1.08)',
    mixBlendMode: 'screen',
    pointerEvents: 'none',
  }
}
