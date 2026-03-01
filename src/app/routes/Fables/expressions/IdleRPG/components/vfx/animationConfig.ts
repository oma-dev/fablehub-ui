/**
 * Attack animation config: driven by AnimationFrames when present, else fallback from styleId.
 * Keeps straight/arc projectile motion logic; other VFX come from optional frame URLs.
 */

/** Source for frame image: custom URL or resolve from equipped weapon at runtime. */
export type AnimationFrameImageSource = 'url' | 'weaponIcon' | 'weaponAnimation' | 'weaponProjectile' | 'weaponImpact'

/** Optional weapon frame (pops at caster, fades in, then vanishes after lifetimeMs). */
export interface AnimationWeaponFrame {
  url?: string
  imageSource?: AnimationFrameImageSource
  /** Delay in ms before this frame starts (allows staggering multiple weapon frames). */
  delayMs?: number
  /** Fade-in duration in ms. Default 200. */
  fadeInMs?: number
  /**
   * Total lifetime of the particle in ms (post-delay), from appearance to fully gone.
   * Controls when it fades out. Default: fadeInMs + 600.
   */
  lifetimeMs?: number
  /** Display size in px (width & height). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over fadeInMs. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
  /** Horizontal offset in px from caster portrait center (positive = right). */
  offsetX?: number
  /** Vertical offset in px from caster portrait center (positive = down). */
  offsetY?: number
}

/** Optional projectile frame (flies caster → target). */
export interface AnimationProjectileFrame {
  url?: string
  imageSource?: AnimationFrameImageSource
  /** Delay in ms before this frame starts (allows staggering multiple projectiles). */
  delayMs?: number
  trajectory: 'straight' | 'arc'
  /** Flight duration in ms. Alias: lifetimeMs. */
  speedMs?: number
  /** Total lifetime of the particle in ms. Equivalent to speedMs; takes precedence if both set. */
  lifetimeMs?: number
  /** Display size in px (width & height). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over flight. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
  /** Horizontal offset in px applied to the start (caster) position. Target stays fixed. */
  offsetX?: number
  /** Vertical offset in px applied to the start (caster) position. Target stays fixed. */
  offsetY?: number
}

/** Optional impact frame (pops at target, fades out). */
export interface AnimationImpactFrame {
  url?: string
  imageSource?: AnimationFrameImageSource
  /** Delay in ms before this frame starts (allows staggering multiple impact frames). */
  delayMs?: number
  /** How long fully visible before starting fade-out. Used when lifetimeMs is not set. */
  showMs?: number
  /** Fade-out duration in ms. Used when lifetimeMs is not set. */
  vanishMs?: number
  /**
   * Total lifetime shorthand (showMs + vanishMs). When set, overrides showMs/vanishMs
   * with a 15%/85% split. Ignored when both showMs and vanishMs are explicitly set.
   */
  lifetimeMs?: number
  /** Display size in px (width & height). */
  sizePx?: number
  /** Start size in px; animates to endSizePx over show+vanish. */
  startSizePx?: number
  /** End size in px. */
  endSizePx?: number
  /** Horizontal offset in px from target portrait center (positive = right). */
  offsetX?: number
  /** Vertical offset in px from target portrait center (positive = down). */
  offsetY?: number
}

/** Optional block frame: pops at defender card border when a reactive block triggers. */
export interface AnimationBlockFrame {
  url?: string
  imageSource?: AnimationFrameImageSource
  delayMs?: number
  showMs?: number
  vanishMs?: number
  lifetimeMs?: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  offsetX?: number
  offsetY?: number
}

/** Attack animation as arrays of optional PNG frames per phase. Multiple entries play concurrently. */
export interface AnimationFrames {
  weapon?: AnimationWeaponFrame[]
  projectile?: AnimationProjectileFrame[]
  impact?: AnimationImpactFrame[]
  block?: AnimationBlockFrame[]
}

export type ProjectileType = 'straight' | 'arc' | null

/** Single fallback impact style when not using AnimationFrames.impact. Export for ImpactEffect. */
export type ImpactStyle = 'slash' | 'punch' | 'flail' | 'arrow' | 'bolt' | 'generic'

/** Resolved config for one attack: frames (when present) + fallback trajectory/color/duration. */
export interface AttackAnimationConfig {
  /** When AnimationFrames is used */
  frames: AnimationFrames | null
  /** Projectile trajectory (from first frames.projectile entry or styleId fallback) */
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

  const hasWeapon = (animationFrames?.weapon?.length ?? 0) > 0
  const hasProjectile = (animationFrames?.projectile?.length ?? 0) > 0
  const hasImpact = (animationFrames?.impact?.length ?? 0) > 0
  const hasBlock = (animationFrames?.block?.length ?? 0) > 0

  if (animationFrames && (hasWeapon || hasProjectile || hasImpact || hasBlock)) {
    // Use trajectory from first projectile frame, else fallback
    const projectile: ProjectileType = hasProjectile
      ? animationFrames.projectile![0].trajectory
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
 * Call before passing to CombatReplay so playback only reads resolved URLs.
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

  if (frames.weapon?.length) {
    const resolved = frames.weapon.flatMap((f) => {
      const url = resolveFrameUrl(f, weaponIconUrl, weaponAnimationUrl, weaponProjectileUrl, weaponImpactUrl)
      if (url) return [{ ...f, url }]
      if (f.url?.trim()) return [{ ...f }]
      return []
    })
    if (resolved.length) result.weapon = resolved
  }

  if (frames.projectile?.length) {
    const resolved = frames.projectile.flatMap((f) => {
      const url = resolveFrameUrl(f, weaponIconUrl, weaponAnimationUrl, weaponProjectileUrl, weaponImpactUrl)
      if (url) return [{ ...f, url }]
      if (f.url?.trim()) return [{ ...f }]
      return []
    })
    if (resolved.length) result.projectile = resolved
  }

  if (frames.impact?.length) {
    const resolved = frames.impact.flatMap((f) => {
      const url = resolveFrameUrl(f, weaponIconUrl, weaponAnimationUrl, weaponProjectileUrl, weaponImpactUrl)
      if (url) return [{ ...f, url }]
      if (f.url?.trim()) return [{ ...f }]
      return []
    })
    if (resolved.length) result.impact = resolved
  }

  if (frames.block?.length) {
    const resolved = frames.block.flatMap((f) => {
      const url = resolveFrameUrl(f, weaponIconUrl, weaponAnimationUrl, weaponProjectileUrl, weaponImpactUrl)
      if (url) return [{ ...f, url }]
      if (f.url?.trim()) return [{ ...f }]
      return []
    })
    if (resolved.length) result.block = resolved
  }

  if (!result.weapon && !result.projectile && !result.impact && !result.block) return null
  return result
}
