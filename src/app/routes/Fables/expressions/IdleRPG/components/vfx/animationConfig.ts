/**
 * Attack animation config: driven by AnimationFrames when present, else fallback from styleId.
 * Keeps straight/arc projectile motion logic; other VFX come from optional frame URLs.
 */

/** Source for frame image: custom URL or resolve from equipped weapon at runtime. */
export type AnimationFrameImageSource = 'url' | 'weaponIcon' | 'weaponAnimation' | 'weaponProjectile' | 'weaponImpact'

/** Optional weapon frame (pops at caster, fades in, stays until end). */
export interface AnimationWeaponFrame {
  url?: string
  imageSource?: AnimationFrameImageSource
  fadeInMs?: number
  /** Display size in px (width & height). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over fadeInMs. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
}

/** Optional projectile frame (flies caster → target). */
export interface AnimationProjectileFrame {
  url?: string
  imageSource?: AnimationFrameImageSource
  trajectory: 'straight' | 'arc'
  speedMs?: number
  /** Display size in px (width & height). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over flight. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
}

/** Optional impact frame (pops at target, fades out). */
export interface AnimationImpactFrame {
  url?: string
  imageSource?: AnimationFrameImageSource
  showMs?: number
  vanishMs?: number
  /** Display size in px (width & height). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over show+vanish. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
}

/** Attack animation as three optional PNG frames. Matches API AnimationFrames. */
export interface AnimationFrames {
  weapon?: AnimationWeaponFrame
  projectile?: AnimationProjectileFrame
  impact?: AnimationImpactFrame
}

export type ProjectileType = 'straight' | 'arc' | null

/** Single fallback impact style when not using AnimationFrames.impact. Export for ImpactEffect. */
export type ImpactStyle = 'slash' | 'punch' | 'flail' | 'arrow' | 'bolt' | 'generic'

/** Resolved config for one attack: frames (when present) + fallback trajectory/color/duration. */
export interface AttackAnimationConfig {
  /** When AnimationFrames is used */
  frames: AnimationFrames | null
  /** Projectile trajectory (from frames.projectile or styleId fallback) */
  projectile: ProjectileType
  /** For damage number color when no frames.impact */
  impactColor: string
  /** Total sequence duration in ms */
  sequenceDurationMs: number
}

/** Style IDs that have fallback animation (for dropdowns / tests). */
export const STYLE_IDS = [
  'melee_slash', 'melee_flail', 'melee_punch',
  'projectile_arrow', 'projectile_bolt', 'projectile_fireball', 'projectile_meteor',
  'instant_slash',
] as const

const STYLE_FALLBACKS: Record<
  string,
  { projectile: ProjectileType; impactColor: string; sequenceDurationMs: number }
> = {
  melee_slash: { projectile: 'arc', impactColor: '#ef5350', sequenceDurationMs: 900 },
  melee_flail: { projectile: 'arc', impactColor: '#b0bec5', sequenceDurationMs: 1000 },
  melee_punch: { projectile: 'arc', impactColor: '#ff9800', sequenceDurationMs: 900 },
  projectile_arrow: { projectile: 'arc', impactColor: '#8d6e63', sequenceDurationMs: 1100 },
  projectile_bolt: { projectile: 'straight', impactColor: '#7c4dff', sequenceDurationMs: 1100 },
  projectile_fireball: { projectile: 'arc', impactColor: '#ff9800', sequenceDurationMs: 1100 },
  projectile_meteor: { projectile: 'arc', impactColor: '#b71c1c', sequenceDurationMs: 1200 },
  instant_slash: { projectile: null, impactColor: '#26c6da', sequenceDurationMs: 700 },
}

const DEFAULT_FALLBACK: AttackAnimationConfig = {
  frames: null,
  projectile: null,
  impactColor: '#fff',
  sequenceDurationMs: 900,
}

/** Resolve animation config: use animationFrames when provided, else styleId fallback. */
export function getAttackAnimationConfig(
  styleId?: string,
  animationFrames?: AnimationFrames | null
): AttackAnimationConfig {
  const fallback = styleId && STYLE_FALLBACKS[styleId]
    ? {
        ...DEFAULT_FALLBACK,
        projectile: STYLE_FALLBACKS[styleId].projectile,
        impactColor: STYLE_FALLBACKS[styleId].impactColor,
        sequenceDurationMs: STYLE_FALLBACKS[styleId].sequenceDurationMs,
      }
    : DEFAULT_FALLBACK

  if (animationFrames && (animationFrames.weapon || animationFrames.projectile || animationFrames.impact)) {
    const projectile: ProjectileType = animationFrames.projectile
      ? animationFrames.projectile.trajectory
      : fallback.projectile
    return {
      frames: animationFrames,
      projectile,
      impactColor: fallback.impactColor,
      sequenceDurationMs: fallback.sequenceDurationMs,
    }
  }

  return { ...fallback, frames: null }
}

/** Resolve a single frame's image URL from imageSource + weapon URLs. */
function resolveFrameUrl(
  frame: { url?: string; imageSource?: AnimationFrameImageSource } | undefined,
  weaponIconUrl: string | null | undefined,
  weaponAnimationUrl: string | null | undefined,
  weaponProjectileUrl: string | null | undefined,
  weaponImpactUrl: string | null | undefined
): string | null {
  if (!frame) return null
  const src = frame.imageSource ?? 'url'
  if (src === 'weaponIcon') return weaponIconUrl ?? null
  if (src === 'weaponAnimation') return weaponAnimationUrl ?? null
  if (src === 'weaponProjectile') return weaponProjectileUrl ?? null
  if (src === 'weaponImpact') return weaponImpactUrl ?? null
  return (frame.url?.trim()) ? frame.url.trim() : null
}

/**
 * Resolve ability animation frames with equipped weapon URLs.
 * Call before passing to CombatReplay so playback only reads Ability's frame URLs.
 */
export function resolveAnimationFrames(
  frames: AnimationFrames | null | undefined,
  weaponIconUrl: string | null | undefined,
  weaponAnimationUrl: string | null | undefined,
  weaponProjectileUrl?: string | null,
  weaponImpactUrl?: string | null
): AnimationFrames | null {
  if (!frames) return null
  const result: AnimationFrames = {}
  if (frames.weapon) {
    const url = resolveFrameUrl(frames.weapon, weaponIconUrl, weaponAnimationUrl, weaponProjectileUrl, weaponImpactUrl)
    if (url) result.weapon = { ...frames.weapon, url }
    else if (frames.weapon.url?.trim()) result.weapon = { ...frames.weapon }
  }
  if (frames.projectile) {
    const url = resolveFrameUrl(frames.projectile, weaponIconUrl, weaponAnimationUrl, weaponProjectileUrl, weaponImpactUrl)
    if (url) result.projectile = { ...frames.projectile, url }
    else if (frames.projectile.url?.trim()) result.projectile = { ...frames.projectile }
  }
  if (frames.impact) {
    const url = resolveFrameUrl(frames.impact, weaponIconUrl, weaponAnimationUrl, weaponProjectileUrl, weaponImpactUrl)
    if (url) result.impact = { ...frames.impact, url }
    else if (frames.impact.url?.trim()) result.impact = { ...frames.impact }
  }
  if (!result.weapon && !result.projectile && !result.impact) return null
  return result
}
