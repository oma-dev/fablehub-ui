/**
 * Maps attack styleIds (from pack class.primaryAttack.styleId) to frontend animation descriptors.
 * Strategy 2: the frontend infers animation from the class data in the pack.
 */

export type CasterMotion = 'lunge' | 'cast' | 'none'
export type ProjectileType = 'straight' | 'arc' | null
export type ImpactStyle = 'slash' | 'punch' | 'arrow' | 'bolt' | 'generic'

export interface AttackAnimation {
  /** How the attacker moves: lunge forward, cast-in-place, or stay still */
  casterMotion: CasterMotion
  /** If set, a projectile travels from caster toward target */
  projectile: ProjectileType
  /** Visual effect on impact at the target */
  impactStyle: ImpactStyle
  /** Color accent for the impact effect */
  impactColor: string
  /** Lunge distance in px (for 'lunge' casterMotion) */
  lungeDistance: number
  /** Total duration of the attack sequence in ms */
  sequenceDurationMs: number
}

export const STYLE_ANIMATIONS: Record<string, AttackAnimation> = {
  melee_slash: {
    casterMotion: 'lunge',
    projectile: null,
    impactStyle: 'slash',
    impactColor: '#ef5350',
    lungeDistance: 60,
    sequenceDurationMs: 900,
  },
  melee_punch: {
    casterMotion: 'lunge',
    projectile: null,
    impactStyle: 'punch',
    impactColor: '#ff9800',
    lungeDistance: 60,
    sequenceDurationMs: 900,
  },
  projectile_arrow: {
    casterMotion: 'cast',
    projectile: 'straight',
    impactStyle: 'arrow',
    impactColor: '#8d6e63',
    lungeDistance: 0,
    sequenceDurationMs: 1100,
  },
  projectile_bolt: {
    casterMotion: 'cast',
    projectile: 'straight',
    impactStyle: 'bolt',
    impactColor: '#7c4dff',
    lungeDistance: 0,
    sequenceDurationMs: 1100,
  },
  instant_slash: {
    casterMotion: 'none',
    projectile: null,
    impactStyle: 'slash',
    impactColor: '#26c6da',
    lungeDistance: 0,
    sequenceDurationMs: 700,
  },
}

/** Fallback for unknown styleIds */
export const DEFAULT_ANIMATION: AttackAnimation = {
  casterMotion: 'lunge',
  projectile: null,
  impactStyle: 'generic',
  impactColor: '#fff',
  lungeDistance: 40,
  sequenceDurationMs: 900,
}

export function getAttackAnimation(styleId?: string): AttackAnimation {
  if (!styleId) return DEFAULT_ANIMATION
  return STYLE_ANIMATIONS[styleId] ?? DEFAULT_ANIMATION
}
