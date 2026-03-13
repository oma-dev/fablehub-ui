import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import type {
  ActiveStatusEffect,
  AnimationFrameImageSource,
  AnimationFrames,
  CombatEventType,
  CombatResult,
  CombatTurnEvent,
  SummonedCombatantSnapshot,
  StatusAnimation,
  StatusTransformConfig,
} from '@features/idle-rpg/api'
import {
  ReplayHpBar,
  ReplayPortrait,
  ReplayResourceBar,
  ReplayStatusEffectIcons,
} from '@features/idle-rpg/replay/ui'
import { useReplayRuntime } from '@features/idle-rpg/replay/hooks'
import { groupCombatTurnEvents } from '@features/idle-rpg/replay/runtime'
import { getAttackAnimationConfig, type AttackAnimationConfig, type AnimationBlockFrame } from './vfx/animationConfig'
import BlockFrame from './vfx/BlockFrame'
import DamageNumber from './vfx/DamageNumber'
import ImpactEffect from './vfx/ImpactEffect'
import ImpactFrame from './vfx/ImpactFrame'
import Projectile, { PROJECTILE_SPEED, type ProjectilePos } from './vfx/Projectile'
import StatusParticleEffect from './vfx/StatusParticleEffect'
import WeaponFrame from './vfx/WeaponFrame'

interface ResourceInfo {
  name: string
  colorHex: string
  max: number
  isGenerative: boolean
}

interface CombatantInfo {
  name: string
  level: number
  maxHp: number
  ap: number
  arm: number
  portraitUrl?: string | null
  introSoundUrl?: string | null
  introSoundVolumePercent?: number | null
  introSoundFadeInMs?: number | null
  introSoundFadeOutMs?: number | null
  styleId?: string
  /** Weapon icon URL for portrait overlay and fallback projectile image when ability has no frame URL. */
  weaponUrl?: string | null
  /** Optional weapon animation image URL. */
  weaponAnimationUrl?: string | null
  /** Optional weapon projectile image URL. */
  weaponProjectileUrl?: string | null
  /** Optional weapon impact image URL. */
  weaponImpactUrl?: string | null
  /** Optional defense item icon URL. */
  defenseUrl?: string | null
  /** Optional defense item animation image URL. */
  defenseAnimationUrl?: string | null
  /** Optional defense item projectile image URL. */
  defenseProjectileUrl?: string | null
  /** Optional defense item impact image URL. */
  defenseImpactUrl?: string | null
  /** Pre-resolved animation frames (Ability + weapon URLs already resolved by caller). */
  animationFrames?: AnimationFrames | null
  /** Optional resource (mana, rage, etc.) to display below HP bar. */
  resource?: ResourceInfo | null
}

interface Props {
  combat: CombatResult
  player: CombatantInfo
  creature: CombatantInfo
  victory: boolean
  onFinish: () => void
  /** Optional replay background image URL (used for boss fights). */
  arenaBackgroundImageUrl?: string | null
  /** When provided (e.g. PvP), use this as the left-side combatant ID. Otherwise derived from first event. */
  leftCharacterId?: string
  /** Per-ability animation overrides keyed by abilityId. When an ability fires, its frames are used instead of the combatant default. */
  abilityAnimations?: Record<string, AnimationFrames>
  /** Per-status animation definitions keyed by status template id. */
  statusAnimations?: Record<string, StatusAnimation>
  /** Per-status transform definitions keyed by status template id. */
  statusTransforms?: Record<string, StatusTransformConfig>
  /** Optional intro sound for left-side combatant (typically class intro). */
  playerIntroSoundUrl?: string | null
  /** Optional intro sound volume percent for left-side combatant. */
  playerIntroSoundVolumePercent?: number | null
  /** Optional intro sound fade-in ms for left-side combatant. */
  playerIntroSoundFadeInMs?: number | null
  /** Optional intro sound fade-out ms for left-side combatant. */
  playerIntroSoundFadeOutMs?: number | null
  /** Optional intro sound for right-side combatant (typically creature/class intro). */
  creatureIntroSoundUrl?: string | null
  /** Optional intro sound volume percent for right-side combatant. */
  creatureIntroSoundVolumePercent?: number | null
  /** Optional intro sound fade-in ms for right-side combatant. */
  creatureIntroSoundFadeInMs?: number | null
  /** Optional intro sound fade-out ms for right-side combatant. */
  creatureIntroSoundFadeOutMs?: number | null
  /** Optional looping boss music while replay is active. */
  bossBattleMusicUrl?: string | null
  /** Optional boss music volume percent. */
  bossBattleMusicVolumePercent?: number | null
  /** Optional boss music fade-in ms. */
  bossBattleMusicFadeInMs?: number | null
  /** Optional boss music fade-out ms. */
  bossBattleMusicFadeOutMs?: number | null
}

const STAT_LABELS: { key: keyof Pick<CombatantInfo, 'ap' | 'arm'>; label: string }[] = [
  { key: 'ap', label: 'Attack' },
  { key: 'arm', label: 'Armor' },
]

const SCALE = 1.2
const PORTRAIT_SIZE = Math.round(380 * SCALE)  // 300
const PORTRAIT_BORDER_RADIUS = 3 * SCALE
const PORTRAIT_BORDER = Math.round(3 * SCALE)
const WEAPON_SIZE = Math.round(56 * SCALE)
const WEAPON_OFFSET = Math.round(-24 * SCALE)
const PERSON_ICON_SIZE = Math.round(100 * SCALE)
const HP_FONT_SIZE = Math.round(12 * SCALE)
const HP_BAR_HEIGHT = Math.round(16 * SCALE)
const HP_BAR_RADIUS = 2 * SCALE
const STAT_FONT_SIZE = Math.round(13 * SCALE)
const NAME_FONT_SIZE = `${1.1 * SCALE}rem`
const LEVEL_FONT_SIZE = `${0.875 * SCALE}rem`
const CARD_GAP = 1.5 * SCALE
const CARD_PADDING = 2.5 * SCALE
const CARD_RADIUS = 3 * SCALE
const CARD_MAX_WIDTH = Math.round(380 * SCALE)
const BACKLINE_STACK_SCALE_STEP = 0.12
const BACKLINE_STACK_OFFSET_PX = 128
const VS_WIDTH = Math.round(70 * SCALE)
const TURN_FONT_SIZE = Math.round(14 * SCALE)
const RESULT_FONT_SIZE = `${1.5 * SCALE}rem`
const BUTTON_FONT_SIZE = `${1.1 * SCALE}rem`
const CARD_LUNGE_DURATION_MS = 260
const CARD_RETURN_DURATION_MS = 240
const TRANSFORM_SWAP_HOLD_MS = 2000
const SUMMON_SPAWN_DELAY_MS = 1000
const SUMMON_POST_SPAWN_DELAY_MS = 2500
const FRONTLINE_SWAP_TRANSITION_MS = 360

type CardMotionEase = 'linear' | [number, number, number, number]
type CardMotionTransition = { type: 'tween'; duration: number; ease: CardMotionEase }

const DEFAULT_CARD_MOTION_TRANSITION: CardMotionTransition = {
  type: 'tween',
  duration: CARD_RETURN_DURATION_MS / 1000,
  ease: [0.42, 0.0, 0.58, 1.0],
}

function resolveCardMotionEase(acceleration = 0, startSpeed = 0): CardMotionEase {
  const clamped = Math.max(-100, Math.min(100, acceleration))
  const intensity = Math.abs(clamped) / 100
  const clampedStartSpeed = Math.max(-100, Math.min(100, startSpeed))
  const normalizedStartSpeed = clampedStartSpeed / 100
  const y1 = Math.max(0, Math.min(0.95, 0.25 + normalizedStartSpeed * 0.65))
  if (clamped > 0) {
    const x1 = 0.45 - (0.3 * intensity)
    return [x1, y1, 1, 1]
  }
  if (clamped < 0) {
    const x2 = 0.55 + (0.35 * intensity)
    return [0, y1, x2, 1]
  }
  if (clampedStartSpeed !== 0) return [0.25, y1, 0.85, 1]
  return 'linear'
}

function resolveCardMotionDurationMs(baseDurationMs: number, acceleration = 0): number {
  const clamped = Math.max(-100, Math.min(100, acceleration))
  const factor = clamped >= 0
    ? (1 - (0.55 * (clamped / 100)))
    : (1 + (0.75 * (Math.abs(clamped) / 100)))
  return Math.max(90, Math.round(baseDurationMs * factor))
}

function getMotionVariants(_anim: AttackAnimationConfig, direction: 'left' | 'right') {
  const sign = direction === 'left' ? 1 : -1
  return {
    idle: { x: 0, scale: 1 },
    cast: { scale: 1.08, transition: { duration: 0.15 } },
    hit: {
      x: [0, sign * -6, sign * 6, sign * -4, 0],
      transition: { duration: 0.3 },
    },
    return: { x: 0, scale: 1, transition: { duration: 0.25, ease: [0.42, 0.0, 0.58, 1.0] as const } },
  }
}

// --- Active VFX entry types ---
interface ActiveWeaponFrame {
  key: number
  side: 'player' | 'creature'
  url: string
  soundUrl?: string
  soundVolumePercent?: number
  soundFadeInMs?: number
  soundFadeOutMs?: number
  fadeInMs: number
  /** When set, the component self-animates fade-out; when absent, stays until sequence end cleanup. */
  lifetimeMs?: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  offsetX: number
  offsetY: number
  endOffsetX?: number
  endOffsetY?: number
  acceleration?: number
  rotationStart?: number
  rotationEnd?: number
}

interface ActiveProjectileEntry {
  key: number
  direction: 'left-to-right' | 'right-to-left'
  imageUrl: string | null
  soundUrl?: string
  soundVolumePercent?: number
  soundFadeInMs?: number
  soundFadeOutMs?: number
  mirrored?: boolean
  from: ProjectilePos
  to: ProjectilePos
  trajectory: 'straight' | 'arc'
  durationMs?: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  acceleration?: number
  rotationStart?: number
  rotationEnd?: number
  color: string
  show: boolean
}

interface ActiveImpactFrame {
  key: number
  side: 'player' | 'creature'
  url: string
  soundUrl?: string
  soundVolumePercent?: number
  soundFadeInMs?: number
  soundFadeOutMs?: number
  showMs: number
  vanishMs: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  offsetX: number
  offsetY: number
  endOffsetX?: number
  endOffsetY?: number
  acceleration?: number
  rotationStart?: number
  rotationEnd?: number
}

interface ActiveBlockFrameEntry {
  key: number
  side: 'player' | 'creature'
  url: string
  soundUrl?: string
  soundVolumePercent?: number
  soundFadeInMs?: number
  soundFadeOutMs?: number
  showMs: number
  vanishMs: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  offsetX: number
  offsetY: number
  rotationStart?: number
  rotationEnd?: number
}

interface ActiveStatusParticleEntry {
  key: number
  identity?: string
  side: 'player' | 'creature'
  url: string
  soundUrl?: string
  soundVolumePercent?: number
  soundFadeInMs?: number
  soundFadeOutMs?: number
  delayMs: number
  lifetimeMs: number
  startSizePx?: number
  endSizePx?: number
  offsetX: number
  offsetY: number
  endOffsetX?: number
  endOffsetY?: number
  acceleration?: number
  rotationStart?: number
  rotationEnd?: number
  loop: boolean
}

const DAMAGE_NUMBER_EVENT_TYPES = new Set<CombatEventType>(['damage', 'heal', 'dot_tick', 'hot_tick', 'execute'])
const STATUS_BURST_EVENT_TYPES = new Set<CombatEventType>(['status_applied', 'dot_tick', 'hot_tick'])
const DAMAGE_POPUP_LIFETIME_MS = 950

type DamagePopup = {
  value: number
  type: CombatEventType
  key: number
  abilityName?: string
  isCritical?: boolean
}

function getPreferredTransformTemplateId(
  effects: ActiveStatusEffect[],
  statusTransforms?: Record<string, StatusTransformConfig>,
): string | null {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const templateId = effects[index]?.templateId
    if (!templateId) continue
    const portraitUrl = statusTransforms?.[templateId]?.portraitUrl?.trim()
    if (portraitUrl) return templateId
  }
  return null
}

function clampSoundVolume(volumePercent?: number | null): number {
  if (volumePercent == null || Number.isNaN(volumePercent)) return 1
  return Math.min(1, Math.max(0, volumePercent / 100))
}

function animateAudioVolume(
  audio: HTMLAudioElement,
  from: number,
  to: number,
  durationMs: number,
): () => void {
  const clampedFrom = Math.min(1, Math.max(0, from))
  const clampedTo = Math.min(1, Math.max(0, to))
  if (durationMs <= 0) {
    audio.volume = clampedTo
    return () => undefined
  }
  let cancelled = false
  let timerId: number | null = null
  const startedAt = Date.now()
  const tick = () => {
    if (cancelled) return
    const elapsed = Date.now() - startedAt
    const progress = Math.min(1, elapsed / durationMs)
    audio.volume = clampedFrom + ((clampedTo - clampedFrom) * progress)
    if (progress < 1) {
      timerId = window.setTimeout(tick, 16)
    }
  }
  tick()
  return () => {
    cancelled = true
    if (timerId != null) window.clearTimeout(timerId)
  }
}

function fadeOutAndReleaseAudio(audio: HTMLAudioElement, fadeOutMs = 0): () => void {
  let stopFade: (() => void) | null = null
  let finalizeTimer: number | null = null
  const release = () => {
    audio.pause()
    audio.src = ''
  }
  if (fadeOutMs > 0) {
    stopFade = animateAudioVolume(audio, audio.volume, 0, fadeOutMs)
    finalizeTimer = window.setTimeout(release, fadeOutMs)
  } else {
    release()
  }
  return () => {
    if (stopFade) stopFade()
    if (finalizeTimer != null) window.clearTimeout(finalizeTimer)
    release()
  }
}

function playOneShotAudio(
  url: string,
  volumePercent = 100,
  delayMs = 0,
  fadeInMs = 0,
  fadeOutMs = 0,
): () => void {
  let audio: HTMLAudioElement | null = null
  let timeoutId: number | null = null
  let fadeOutStartTimerId: number | null = null
  let stopFadeIn: (() => void) | null = null
  let stopFadeOutAndRelease: (() => void) | null = null
  let cancelled = false
  let fadeOutScheduled = false
  const targetVolume = clampSoundVolume(volumePercent)

  const clearTimers = () => {
    if (timeoutId != null) window.clearTimeout(timeoutId)
    if (fadeOutStartTimerId != null) window.clearTimeout(fadeOutStartTimerId)
    timeoutId = null
    fadeOutStartTimerId = null
  }

  const scheduleFadeOutFromMetadata = () => {
    if (!audio || fadeOutMs <= 0 || fadeOutScheduled) return
    const durationMs = Number.isFinite(audio.duration) ? Math.floor(audio.duration * 1000) : 0
    if (durationMs <= 0) return
    fadeOutScheduled = true
    const startAfterMs = Math.max(0, durationMs - fadeOutMs)
    fadeOutStartTimerId = window.setTimeout(() => {
      if (!audio) return
      stopFadeOutAndRelease = fadeOutAndReleaseAudio(audio, fadeOutMs)
    }, startAfterMs)
  }

  const start = () => {
    if (cancelled) return
    audio = new Audio(url)
    audio.volume = fadeInMs > 0 ? 0 : targetVolume
    if (fadeInMs > 0) {
      stopFadeIn = animateAudioVolume(audio, 0, targetVolume, fadeInMs)
    }
    if (fadeOutMs > 0) {
      audio.addEventListener('loadedmetadata', scheduleFadeOutFromMetadata, { once: true })
      audio.addEventListener('durationchange', scheduleFadeOutFromMetadata, { once: true })
    }
    audio.play().catch(() => undefined)
    scheduleFadeOutFromMetadata()
  }
  if (delayMs > 0) timeoutId = window.setTimeout(start, delayMs)
  else start()
  return () => {
    cancelled = true
    clearTimers()
    if (stopFadeIn) stopFadeIn()
    if (stopFadeOutAndRelease) stopFadeOutAndRelease()
    if (audio) {
      audio.pause()
      audio.src = ''
      audio = null
    }
  }
}

export default function CombatReplay({
  combat,
  player,
  creature,
  victory,
  onFinish,
  arenaBackgroundImageUrl,
  leftCharacterId,
  abilityAnimations,
  statusAnimations,
  statusTransforms,
  playerIntroSoundUrl,
  playerIntroSoundVolumePercent,
  playerIntroSoundFadeInMs,
  playerIntroSoundFadeOutMs,
  creatureIntroSoundUrl,
  creatureIntroSoundVolumePercent,
  creatureIntroSoundFadeInMs,
  creatureIntroSoundFadeOutMs,
  bossBattleMusicUrl,
  bossBattleMusicVolumePercent,
  bossBattleMusicFadeInMs,
  bossBattleMusicFadeOutMs,
}: Props) {
  const [playerHp, setPlayerHp] = useState(player.maxHp)
  const [creatureHp, setCreatureHp] = useState(creature.maxHp)
  const [playerResourceCurrent, setPlayerResourceCurrent] = useState<number | null>(
    player.resource ? (player.resource.isGenerative ? 0 : player.resource.max) : null
  )
  const [creatureResourceCurrent, setCreatureResourceCurrent] = useState<number | null>(
    creature.resource ? (creature.resource.isGenerative ? 0 : creature.resource.max) : null
  )
  const abortRef = useRef(false)
  const arenaRef = useRef<HTMLDivElement>(null)
  const playerPortraitRef = useRef<HTMLDivElement>(null)
  const creaturePortraitRef = useRef<HTMLDivElement>(null)
  const playerCardRef = useRef<HTMLDivElement>(null)   // kept for potential future use
  const creatureCardRef = useRef<HTMLDivElement>(null) // kept for potential future use

  const playerId = leftCharacterId ?? combat.turns[0]?.events[0]?.sourceId ?? 'player'
  const creatureId =
    combat.turns[0]?.events?.find(e => e.sourceId !== playerId)?.sourceId
    ?? combat.turns[0]?.events?.find(e => e.targetId !== playerId)?.targetId
    ?? 'creature'
  const initialFrontlineSnapshot = combat.turns[0]?.frontlineBySide
  const playerSideKey =
    Object.entries(initialFrontlineSnapshot ?? {}).find(([, id]) => id === playerId)?.[0]
    ?? '0'
  const creatureSideKey =
    Object.entries(initialFrontlineSnapshot ?? {}).find(([, id]) => id === creatureId)?.[0]
    ?? (playerSideKey === '0' ? '1' : '0')
  const [playerFrontId, setPlayerFrontId] = useState(playerId)
  const [creatureFrontId, setCreatureFrontId] = useState(creatureId)
  const [sideRosterIds, setSideRosterIds] = useState<{ player: string[]; creature: string[] }>({
    player: [playerId],
    creature: [creatureId],
  })
  const sideByCombatantIdRef = useRef<Record<string, 'player' | 'creature'>>({
    [playerId]: 'player',
    [creatureId]: 'creature',
  })
  const combatantInfoByIdRef = useRef<Record<string, CombatantInfo>>({
    [playerId]: player,
    [creatureId]: creature,
  })
  const hpByCombatantIdRef = useRef<Record<string, number>>({
    [playerId]: player.maxHp,
    [creatureId]: creature.maxHp,
  })
  const resourceByCombatantIdRef = useRef<Record<string, number | null>>({
    [playerId]: player.resource ? (player.resource.isGenerative ? 0 : player.resource.max) : null,
    [creatureId]: creature.resource ? (creature.resource.isGenerative ? 0 : creature.resource.max) : null,
  })
  const latestStatusByCombatantIdRef = useRef<Record<string, ActiveStatusEffect[]>>({})

  const [playerVariant, setPlayerVariant] = useState<string>('idle')
  const [creatureVariant, setCreatureVariant] = useState<string>('idle')
  const [playerCardOffsetX, setPlayerCardOffsetX] = useState(0)
  const [creatureCardOffsetX, setCreatureCardOffsetX] = useState(0)
  const [playerCardTransition, setPlayerCardTransition] = useState<CardMotionTransition>(DEFAULT_CARD_MOTION_TRANSITION)
  const [creatureCardTransition, setCreatureCardTransition] = useState<CardMotionTransition>(DEFAULT_CARD_MOTION_TRANSITION)
  const [showPlayerImpact, setShowPlayerImpact] = useState(false)
  const [showCreatureImpact, setShowCreatureImpact] = useState(false)
  const [showPlayerGenericImpact, setShowPlayerGenericImpact] = useState(false)
  const [showCreatureGenericImpact, setShowCreatureGenericImpact] = useState(false)

  // Multi-frame VFX arrays
  const [activeWeaponFrames, setActiveWeaponFrames] = useState<ActiveWeaponFrame[]>([])
  const [activeProjectiles, setActiveProjectiles] = useState<ActiveProjectileEntry[]>([])
  const [activeImpactFrames, setActiveImpactFrames] = useState<ActiveImpactFrame[]>([])
  const [activeBlockFrames, setActiveBlockFrames] = useState<ActiveBlockFrameEntry[]>([])
  const [activeStatusLoopParticles, setActiveStatusLoopParticles] = useState<ActiveStatusParticleEntry[]>([])
  const [activeStatusBurstParticles, setActiveStatusBurstParticles] = useState<ActiveStatusParticleEntry[]>([])

  const [playerDmg, setPlayerDmg] = useState<DamagePopup[]>([])
  const [creatureDmg, setCreatureDmg] = useState<DamagePopup[]>([])
  const [playerStatusEffects, setPlayerStatusEffects] = useState<ActiveStatusEffect[]>([])
  const [creatureStatusEffects, setCreatureStatusEffects] = useState<ActiveStatusEffect[]>([])
  const [playerTransformTemplateId, setPlayerTransformTemplateId] = useState<string | null>(null)
  const [creatureTransformTemplateId, setCreatureTransformTemplateId] = useState<string | null>(null)
  const dmgKeyRef = useRef(0)
  const vfxKeyRef = useRef(0)
  const introPlayedRef = useRef(false)
  const bossBgmRef = useRef<HTMLAudioElement | null>(null)
  const playerTransformTimerRef = useRef<number | null>(null)
  const creatureTransformTimerRef = useRef<number | null>(null)
  const playerDmgTimerRef = useRef<number[]>([])
  const creatureDmgTimerRef = useRef<number[]>([])
  const summonIntroCleanupByCombatantIdRef = useRef<Record<string, () => void>>({})
  const playedSummonIntroIdsRef = useRef<Set<string>>(new Set())
  const previousPlayerFrontIdRef = useRef(playerFrontId)
  const previousCreatureFrontIdRef = useRef(creatureFrontId)
  const [playerFrontSwapPulse, setPlayerFrontSwapPulse] = useState(false)
  const [creatureFrontSwapPulse, setCreatureFrontSwapPulse] = useState(false)

  const playerAnim = getAttackAnimationConfig(player.styleId, player.animationFrames)
  const creatureAnim = getAttackAnimationConfig(creature.styleId, creature.animationFrames)
  const playerVariants = getMotionVariants(playerAnim, 'left')
  const creatureVariants = getMotionVariants(creatureAnim, 'right')

  useEffect(() => {
    if (previousPlayerFrontIdRef.current === playerFrontId) return
    previousPlayerFrontIdRef.current = playerFrontId
    setPlayerFrontSwapPulse(true)
    const rafId = window.requestAnimationFrame(() => setPlayerFrontSwapPulse(false))
    return () => window.cancelAnimationFrame(rafId)
  }, [playerFrontId])

  useEffect(() => {
    if (previousCreatureFrontIdRef.current === creatureFrontId) return
    previousCreatureFrontIdRef.current = creatureFrontId
    setCreatureFrontSwapPulse(true)
    const rafId = window.requestAnimationFrame(() => setCreatureFrontSwapPulse(false))
    return () => window.cancelAnimationFrame(rafId)
  }, [creatureFrontId])

  const getPortraitPos = useCallback((ref: React.RefObject<HTMLDivElement | null>): ProjectilePos => {
    const arena = arenaRef.current
    const el = ref.current
    if (!arena || !el) return { x: 0, y: 0 }
    const aRect = arena.getBoundingClientRect()
    const eRect = el.getBoundingClientRect()
    return {
      x: eRect.left + eRect.width / 2 - aRect.left,
      y: eRect.top + eRect.height / 2 - aRect.top,
    }
  }, [])

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  const getReplaySideForCombatantId = useCallback((combatantId: string): 'player' | 'creature' => {
    const mapped = sideByCombatantIdRef.current[combatantId]
    if (mapped) return mapped
    if (combatantId === playerId) return 'player'
    return 'creature'
  }, [playerId])

  const getFrontIdForSide = useCallback((side: 'player' | 'creature'): string => {
    return side === 'player' ? playerFrontId : creatureFrontId
  }, [playerFrontId, creatureFrontId])

  const getBaseAnimationForAttacker = useCallback((attackerId: string): AttackAnimationConfig => {
    if (attackerId === playerId) return playerAnim
    if (attackerId === creatureId) return creatureAnim
    const attackerInfo = combatantInfoByIdRef.current[attackerId]
    return getAttackAnimationConfig(attackerInfo?.styleId, attackerInfo?.animationFrames ?? undefined)
  }, [playerAnim, creatureAnim, playerId, creatureId])

  const setDisplayedFrontline = useCallback((side: 'player' | 'creature', frontId: string) => {
    if (!frontId) return
    const info = combatantInfoByIdRef.current[frontId]
    if (!info) return
    const hp = hpByCombatantIdRef.current[frontId] ?? info.maxHp
    const resourceCurrent = resourceByCombatantIdRef.current[frontId] ?? null
    const statusEffects = latestStatusByCombatantIdRef.current[frontId] ?? []
    if (side === 'player') {
      setPlayerFrontId(frontId)
      setPlayerHp(hp)
      setPlayerResourceCurrent(resourceCurrent)
      setPlayerStatusEffects(statusEffects)
      setPlayerTransformTemplateId(getPreferredTransformTemplateId(statusEffects, statusTransforms))
      return
    }
    setCreatureFrontId(frontId)
    setCreatureHp(hp)
    setCreatureResourceCurrent(resourceCurrent)
    setCreatureStatusEffects(statusEffects)
    setCreatureTransformTemplateId(getPreferredTransformTemplateId(statusEffects, statusTransforms))
  }, [statusTransforms])

  const reorderSideRosterForFront = useCallback((side: 'player' | 'creature', frontId: string) => {
    if (!frontId) return
    setSideRosterIds((previous) => {
      const existing = previous[side]
      const next = [frontId, ...existing.filter((id) => id !== frontId)]
      return side === 'player'
        ? { ...previous, player: next }
        : { ...previous, creature: next }
    })
  }, [])

  const stopSummonIntroSounds = useCallback(() => {
    for (const stopSound of Object.values(summonIntroCleanupByCombatantIdRef.current)) {
      stopSound()
    }
    summonIntroCleanupByCombatantIdRef.current = {}
    playedSummonIntroIdsRef.current.clear()
  }, [])

  const registerSummonedCombatant = useCallback((snapshot?: SummonedCombatantSnapshot, options?: { playIntroSound?: boolean }) => {
    if (!snapshot?.id) return
    const sideKey = String(snapshot.side ?? '')
    const side: 'player' | 'creature' = sideKey === playerSideKey ? 'player' : 'creature'
    sideByCombatantIdRef.current[snapshot.id] = side
    combatantInfoByIdRef.current[snapshot.id] = {
      name: snapshot.name,
      level: snapshot.level ?? 1,
      maxHp: snapshot.maxHp,
      ap: snapshot.ap,
      arm: snapshot.arm,
      portraitUrl: snapshot.portraitUrl ?? null,
      introSoundUrl: snapshot.introSoundUrl ?? null,
      introSoundVolumePercent: snapshot.introSoundVolumePercent ?? null,
      introSoundFadeInMs: snapshot.introSoundFadeInMs ?? null,
      introSoundFadeOutMs: snapshot.introSoundFadeOutMs ?? null,
      ...(snapshot.animationFrames ? { animationFrames: snapshot.animationFrames } : {}),
      resource: snapshot.resource
        ? {
            name: 'Resource',
            colorHex: '#60a5fa',
            max: snapshot.resource.max,
            isGenerative: false,
          }
        : null,
    }
    hpByCombatantIdRef.current[snapshot.id] = snapshot.currentHp
    resourceByCombatantIdRef.current[snapshot.id] = snapshot.resource?.current ?? null
    latestStatusByCombatantIdRef.current[snapshot.id] = latestStatusByCombatantIdRef.current[snapshot.id] ?? []
    reorderSideRosterForFront(side, snapshot.id)
    setDisplayedFrontline(side, snapshot.id)
    const shouldPlayIntroSound = options?.playIntroSound ?? true
    const introSoundUrl = snapshot.introSoundUrl?.trim()
    if (shouldPlayIntroSound && introSoundUrl && !playedSummonIntroIdsRef.current.has(snapshot.id)) {
      playedSummonIntroIdsRef.current.add(snapshot.id)
      summonIntroCleanupByCombatantIdRef.current[snapshot.id]?.()
      summonIntroCleanupByCombatantIdRef.current[snapshot.id] = playOneShotAudio(
        introSoundUrl,
        snapshot.introSoundVolumePercent ?? 100,
        0,
        snapshot.introSoundFadeInMs ?? 0,
        snapshot.introSoundFadeOutMs ?? 0,
      )
    }
  }, [playerSideKey, reorderSideRosterForFront, setDisplayedFrontline])

  const clearDamagePopupTimers = useCallback((side: 'player' | 'creature') => {
    const timerRef = side === 'player' ? playerDmgTimerRef : creatureDmgTimerRef
    for (const timerId of timerRef.current) window.clearTimeout(timerId)
    timerRef.current = []
  }, [])

  const clearDamagePopups = useCallback((side?: 'player' | 'creature') => {
    if (!side || side === 'player') {
      clearDamagePopupTimers('player')
      setPlayerDmg([])
    }
    if (!side || side === 'creature') {
      clearDamagePopupTimers('creature')
      setCreatureDmg([])
    }
  }, [clearDamagePopupTimers])

  const pushDamagePopup = useCallback((side: 'player' | 'creature', popup: DamagePopup) => {
    if (side === 'player') setPlayerDmg((previous) => [...previous, popup])
    else setCreatureDmg((previous) => [...previous, popup])

    const timerId = window.setTimeout(() => {
      if (side === 'player') {
        setPlayerDmg((previous) => previous.filter((entry) => entry.key !== popup.key))
      } else {
        setCreatureDmg((previous) => previous.filter((entry) => entry.key !== popup.key))
      }
    }, DAMAGE_POPUP_LIFETIME_MS)

    if (side === 'player') playerDmgTimerRef.current.push(timerId)
    else creatureDmgTimerRef.current.push(timerId)
  }, [])

  const clearTransformTimer = useCallback((side: 'player' | 'creature') => {
    const timerRef = side === 'player' ? playerTransformTimerRef : creatureTransformTimerRef
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleTransformActivation = useCallback((
    side: 'player' | 'creature',
    templateId: string,
    delayMs: number,
    soundUrl?: string,
    soundVolumePercent?: number,
    soundFadeInMs?: number,
    soundFadeOutMs?: number,
  ) => {
    clearTransformTimer(side)
    const activate = () => {
      if (side === 'player') setPlayerTransformTemplateId(templateId)
      else setCreatureTransformTemplateId(templateId)
      const trimmedSoundUrl = soundUrl?.trim()
      if (trimmedSoundUrl) {
        playOneShotAudio(
          trimmedSoundUrl,
          soundVolumePercent ?? 100,
          0,
          soundFadeInMs ?? 0,
          soundFadeOutMs ?? 0,
        )
      }
    }
    if (delayMs <= 0) {
      activate()
      return
    }
    const timerId = window.setTimeout(() => {
      activate()
      if (side === 'player') playerTransformTimerRef.current = null
      else creatureTransformTimerRef.current = null
    }, delayMs)
    if (side === 'player') playerTransformTimerRef.current = timerId
    else creatureTransformTimerRef.current = timerId
  }, [clearTransformTimer])

  const setCardMotion = useCallback((
    side: 'player' | 'creature',
    destinationX: number,
    durationMs: number,
    acceleration = 0,
    startSpeed = 0,
  ) => {
    const transition: CardMotionTransition = {
      type: 'tween',
      duration: durationMs / 1000,
      ease: resolveCardMotionEase(acceleration, startSpeed),
    }
    if (side === 'player') {
      setPlayerCardTransition(transition)
      setPlayerCardOffsetX(destinationX)
      return
    }
    setCreatureCardTransition(transition)
    setCreatureCardOffsetX(destinationX)
  }, [])

  const getCardLungeDestinationX = useCallback((
    attackerSide: 'player' | 'creature',
    lungeGapPx: number,
  ): number => {
    const attackerCard = attackerSide === 'player' ? playerCardRef.current : creatureCardRef.current
    const defenderCard = attackerSide === 'player' ? creatureCardRef.current : playerCardRef.current
    if (!attackerCard || !defenderCard) return 0
    const attackerRect = attackerCard.getBoundingClientRect()
    const defenderRect = defenderCard.getBoundingClientRect()
    const currentGapPx = attackerSide === 'player'
      ? defenderRect.left - attackerRect.right
      : attackerRect.left - defenderRect.right
    const travelPx = currentGapPx - lungeGapPx
    return attackerSide === 'player' ? travelPx : -travelPx
  }, [])

  const resolveStatusParticleUrl = useCallback((
    side: 'player' | 'creature',
    imageSource?: AnimationFrameImageSource,
    url?: string,
  ): string => {
    const source = imageSource ?? 'url'
    if (source === 'url') return url?.trim() ?? ''
    const frontId = side === 'player' ? playerFrontId : creatureFrontId
    const frontInfo = combatantInfoByIdRef.current[frontId]
    if (!frontInfo) return ''
    if (source === 'weaponIcon') return frontInfo.weaponUrl?.trim() ?? ''
    if (source === 'weaponAnimation') return frontInfo.weaponAnimationUrl?.trim() ?? ''
    if (source === 'weaponProjectile') return frontInfo.weaponProjectileUrl?.trim() ?? ''
    if (source === 'weaponImpact') return frontInfo.weaponImpactUrl?.trim() ?? ''
    if (source === 'defenseIcon') return frontInfo.defenseUrl?.trim() ?? ''
    if (source === 'defenseAnimation') return frontInfo.defenseAnimationUrl?.trim() ?? ''
    if (source === 'defenseProjectile') return frontInfo.defenseProjectileUrl?.trim() ?? ''
    if (source === 'defenseImpact') return frontInfo.defenseImpactUrl?.trim() ?? ''
    return ''
  }, [playerFrontId, creatureFrontId])

  const buildStatusParticleEntry = useCallback((
    side: 'player' | 'creature',
    particle: {
      url?: string
      soundUrl?: string
      soundVolumePercent?: number
      soundFadeInMs?: number
      soundFadeOutMs?: number
      imageSource?: AnimationFrameImageSource
      delayMs?: number
      lifetimeMs?: number
      sizePx?: number
      startSizePx?: number
      endSizePx?: number
      offsetX?: number
      offsetY?: number
      endOffsetX?: number
      endOffsetY?: number
      acceleration?: number
      rotationStart?: number
      rotationEnd?: number
      loop?: boolean
    },
    loop: boolean,
  ): Omit<ActiveStatusParticleEntry, 'key'> | null => {
    const url = resolveStatusParticleUrl(side, particle.imageSource, particle.url)
    if (!url) return null

    const isRightSide = side === 'creature'
    const offsetX = isRightSide ? -(particle.offsetX ?? 0) : (particle.offsetX ?? 0)
    const offsetY = particle.offsetY ?? 0
    const endOffsetX = isRightSide
      ? -(particle.endOffsetX ?? particle.offsetX ?? 0)
      : (particle.endOffsetX ?? particle.offsetX ?? 0)
    const endOffsetY = particle.endOffsetY ?? particle.offsetY ?? 0
    const rotationStart = isRightSide ? -(particle.rotationStart ?? 0) : (particle.rotationStart ?? 0)
    const rotationEnd = isRightSide
      ? -(particle.rotationEnd ?? particle.rotationStart ?? 0)
      : (particle.rotationEnd ?? particle.rotationStart ?? 0)

    return {
      side,
      url,
      soundUrl: particle.soundUrl?.trim() || undefined,
      soundVolumePercent: particle.soundVolumePercent ?? 100,
      soundFadeInMs: particle.soundFadeInMs ?? 0,
      soundFadeOutMs: particle.soundFadeOutMs ?? 0,
      delayMs: Math.max(0, particle.delayMs ?? 0),
      lifetimeMs: Math.max(100, particle.lifetimeMs ?? 1000),
      startSizePx: particle.startSizePx ?? particle.sizePx,
      endSizePx: particle.endSizePx ?? particle.sizePx ?? particle.startSizePx,
      offsetX,
      offsetY,
      endOffsetX,
      endOffsetY,
      acceleration: particle.acceleration ?? 0,
      rotationStart,
      rotationEnd,
      loop,
    }
  }, [resolveStatusParticleUrl])

  const syncLoopStatusParticles = useCallback((nextPlayerEffects: ActiveStatusEffect[], nextCreatureEffects: ActiveStatusEffect[]) => {
    const desired: Array<{ identity: string; entry: Omit<ActiveStatusParticleEntry, 'key' | 'identity'> }> = []
    const appendForSide = (side: 'player' | 'creature', effects: ActiveStatusEffect[]) => {
      effects.forEach((status) => {
        const particles = statusAnimations?.[status.templateId]?.particles ?? []
        particles.forEach((particle, idx) => {
          if (!particle.loop) return
          const entry = buildStatusParticleEntry(side, particle, true)
          if (!entry) return
          desired.push({
            identity: `${side}:${status.id}:${idx}`,
            entry,
          })
        })
      })
    }

    appendForSide('player', nextPlayerEffects)
    appendForSide('creature', nextCreatureEffects)

    setActiveStatusLoopParticles((prev) => {
      const prevByIdentity = new Map(prev.map((entry) => [entry.identity ?? '', entry]))
      const next: ActiveStatusParticleEntry[] = []
      for (const item of desired) {
        const existing = prevByIdentity.get(item.identity)
        if (existing) {
          next.push({
            ...existing,
            ...item.entry,
            key: existing.key,
            identity: item.identity,
            loop: true,
          })
          continue
        }
        next.push({
          ...item.entry,
          key: ++vfxKeyRef.current,
          identity: item.identity,
          loop: true,
        })
      }
      return next
    })
  }, [buildStatusParticleEntry, statusAnimations])

  const triggerStatusBurstForEvent = useCallback((event: CombatTurnEvent): number => {
    if (!STATUS_BURST_EVENT_TYPES.has(event.type)) return 0
    const statusTemplateId =
      event.statusTemplateId
      ?? playerStatusEffects.find((status) => status.id === event.statusEffectId)?.templateId
      ?? creatureStatusEffects.find((status) => status.id === event.statusEffectId)?.templateId
    if (!statusTemplateId) return 0
    const side: 'player' | 'creature' | null = getReplaySideForCombatantId(event.targetId)
    if (!side) return 0
    let transformPauseMs = 0

    const pushBurstParticle = (particle: {
      url?: string
      soundUrl?: string
      soundVolumePercent?: number
      soundFadeInMs?: number
      soundFadeOutMs?: number
      imageSource?: AnimationFrameImageSource
      delayMs?: number
      lifetimeMs?: number
      sizePx?: number
      startSizePx?: number
      endSizePx?: number
      offsetX?: number
      offsetY?: number
      endOffsetX?: number
      endOffsetY?: number
      acceleration?: number
      rotationStart?: number
      rotationEnd?: number
      loop?: boolean
    }) => {
      const built = buildStatusParticleEntry(side, particle, false)
      if (!built) return
      const key = ++vfxKeyRef.current
      setActiveStatusBurstParticles(prev => [...prev, { ...built, key, loop: false }])
      const removeAfterMs = built.delayMs + built.lifetimeMs + 150
      setTimeout(() => {
        setActiveStatusBurstParticles(prev => prev.filter(p => p.key !== key))
      }, removeAfterMs)
    }

    if (event.type === 'status_applied') {
      const transformConfig = statusTransforms?.[statusTemplateId]
      const transformPortraitUrl = transformConfig?.portraitUrl?.trim()
      if (transformPortraitUrl) {
        const swapDelayMs = Math.max(0, transformConfig?.swapPortraitDelayMs ?? 0)
        const activeTemplateId = side === 'player' ? playerTransformTemplateId : creatureTransformTemplateId
        const shouldTriggerTransformSequence = activeTemplateId !== statusTemplateId
        scheduleTransformActivation(
          side,
          statusTemplateId,
          swapDelayMs,
          shouldTriggerTransformSequence ? transformConfig?.soundUrl : undefined,
          transformConfig?.soundVolumePercent,
          transformConfig?.soundFadeInMs,
          transformConfig?.soundFadeOutMs,
        )
        if (shouldTriggerTransformSequence) {
          transformPauseMs = swapDelayMs + TRANSFORM_SWAP_HOLD_MS
        }
      }
      const preTransformParticles = statusAnimations?.[statusTemplateId]?.preTransformParticles ?? []
      for (const particle of preTransformParticles) {
        pushBurstParticle(particle)
      }
    }

    const particles = statusAnimations?.[statusTemplateId]?.particles ?? []
    for (const particle of particles) {
      if (particle.loop) continue
      pushBurstParticle(particle)
    }
    return transformPauseMs
  }, [
    buildStatusParticleEntry,
    creatureId,
    creatureTransformTemplateId,
    creatureStatusEffects,
    playerId,
    playerTransformTemplateId,
    playerStatusEffects,
    scheduleTransformActivation,
    statusAnimations,
    statusTransforms,
  ])

  const syncRealtimeStatusesForEvent = useCallback((
    event: CombatTurnEvent,
    turnStatusEffects?: Record<string, ActiveStatusEffect[]>,
  ) => {
    if (!turnStatusEffects) return
    if (event.type !== 'status_applied' && event.type !== 'status_expired' && event.type !== 'status_dispelled') return

    const targetId = event.targetId
    const nextTargetStatuses = turnStatusEffects[targetId] ?? []
    latestStatusByCombatantIdRef.current[targetId] = nextTargetStatuses

    const playerCurrentFrontId = getFrontIdForSide('player')
    const creatureCurrentFrontId = getFrontIdForSide('creature')

    if (targetId === playerCurrentFrontId) {
      setPlayerStatusEffects(nextTargetStatuses)
      const nextTransform = getPreferredTransformTemplateId(nextTargetStatuses, statusTransforms)
      if (!nextTransform) {
        clearTransformTimer('player')
        setPlayerTransformTemplateId(null)
      }
    } else if (targetId === creatureCurrentFrontId) {
      setCreatureStatusEffects(nextTargetStatuses)
      const nextTransform = getPreferredTransformTemplateId(nextTargetStatuses, statusTransforms)
      if (!nextTransform) {
        clearTransformTimer('creature')
        setCreatureTransformTemplateId(null)
      }
    }

    const nextPlayerFrontStatuses = latestStatusByCombatantIdRef.current[playerCurrentFrontId] ?? []
    const nextCreatureFrontStatuses = latestStatusByCombatantIdRef.current[creatureCurrentFrontId] ?? []
    syncLoopStatusParticles(nextPlayerFrontStatuses, nextCreatureFrontStatuses)
  }, [
    getFrontIdForSide,
    statusTransforms,
    clearTransformTimer,
    syncLoopStatusParticles,
  ])

  const animateAttack = useCallback(async (
    attackerSide: 'player' | 'creature',
    events: CombatTurnEvent[],
    anim: AttackAnimationConfig,
    turnStatusEffects?: Record<string, ActiveStatusEffect[]>,
  ) => {
    if (abortRef.current || events.length === 0) return
    const setAttackerVariant = attackerSide === 'player' ? setPlayerVariant : setCreatureVariant
    const setTargetImpact = attackerSide === 'player' ? setShowCreatureImpact : setShowPlayerImpact
    const setTargetVariant = attackerSide === 'player' ? setCreatureVariant : setPlayerVariant
    const setTargetGenericImpact = attackerSide === 'player' ? setShowCreatureGenericImpact : setShowPlayerGenericImpact
    const frames = anim.frames
    const isRightSideAttacker = attackerSide === 'creature'
    const attackerCardAnimation = frames?.card?.attacker ?? 'cast'
    const targetCardAnimation = frames?.card?.target ?? 'hit'
    const shouldLunge = attackerCardAnimation === 'lunge'
    const lungeGapPx = frames?.card?.lungeGapPx ?? 0
    const lungeDelayMs = Math.max(0, frames?.card?.lungeDelayMs ?? 0)
    const lungeStartSpeed = frames?.card?.lungeStartSpeed ?? 0
    const lungeAcceleration = frames?.card?.accelerationLunge ?? 0
    const returnAcceleration = frames?.card?.accelerationReturn ?? 0
    let usedLunge = false

    // Step 1: Spend resource BEFORE the animation fires — standard gaming feel
    const hasResourceCost = events.some(ev => ev.type === 'resource_change' && ev.resourceAfter)
    if (hasResourceCost) {
      for (const ev of events) {
        if (ev.type === 'resource_change' && ev.resourceAfter) {
          resourceByCombatantIdRef.current[ev.sourceId] = ev.resourceAfter.current
          const sourceSide = getReplaySideForCombatantId(ev.sourceId)
          if (sourceSide === 'player' && getFrontIdForSide('player') === ev.sourceId) {
            setPlayerResourceCurrent(ev.resourceAfter.current)
          } else if (sourceSide === 'creature' && getFrontIdForSide('creature') === ev.sourceId) {
            setCreatureResourceCurrent(ev.resourceAfter.current)
          }
        }
      }
      // Brief pause so the bar animation is visible before the ability fires
      await sleep(350)
      if (abortRef.current) return
    }

    // Step 2: Card movement begins
    if (attackerCardAnimation === 'cast') {
      setAttackerVariant('cast')
      await sleep(160)
    } else {
      setAttackerVariant('idle')
    }

    // --- Weapon frames (all fired concurrently) ---
    const weaponFrames = (frames?.weapon ?? []).filter(f => f.url?.trim())
    if (weaponFrames.length > 0) {
      const maxWeaponMs = Math.max(...weaponFrames.map(f => (f.delayMs ?? 0) + (f.fadeInMs ?? 200)))
      weaponFrames.forEach(async (f) => {
        if (f.delayMs) await sleep(f.delayMs)
        const entry: ActiveWeaponFrame = {
          key: ++vfxKeyRef.current,
          side: attackerSide,
          url: f.url!.trim(),
          soundUrl: f.soundUrl?.trim() || undefined,
          soundVolumePercent: f.soundVolumePercent ?? 100,
          soundFadeInMs: f.soundFadeInMs ?? 0,
          soundFadeOutMs: f.soundFadeOutMs ?? 0,
          fadeInMs: f.fadeInMs ?? 200,
          lifetimeMs: f.lifetimeMs,
          sizePx: f.sizePx,
          startSizePx: f.startSizePx,
          endSizePx: f.endSizePx,
          offsetX: isRightSideAttacker ? -(f.offsetX ?? 0) : (f.offsetX ?? 0),
          offsetY: f.offsetY ?? 0,
          endOffsetX: isRightSideAttacker ? -(f.endOffsetX ?? f.offsetX ?? 0) : (f.endOffsetX ?? f.offsetX ?? 0),
          endOffsetY: f.endOffsetY ?? f.offsetY ?? 0,
          acceleration: f.acceleration ?? 0,
          rotationStart: isRightSideAttacker ? -(f.rotationStart ?? 0) : (f.rotationStart ?? 0),
          rotationEnd: isRightSideAttacker ? -(f.rotationEnd ?? f.rotationStart ?? 0) : (f.rotationEnd ?? f.rotationStart ?? 0),
        }
        setActiveWeaponFrames(prev => [...prev, entry])
        if (f.lifetimeMs != null) {
          await sleep(f.lifetimeMs + 100)
          setActiveWeaponFrames(prev => prev.filter(e => e.key !== entry.key))
        }
      })
      if (!shouldLunge) await sleep(maxWeaponMs)
    }

    // Detect avoid events in this group (supports legacy block events)
    const avoidEvent = events.find(
      (ev) => (ev.type === 'avoid' && ev.avoided) || (ev.type === 'block' && ev.blocked),
    )
    const isAvoided = !!avoidEvent

    // --- Projectile frames ---
    const projFrames = frames?.projectile ?? []
    if (!shouldLunge && anim.projectile && projFrames.length > 0) {
      const srcRef = attackerSide === 'player' ? playerPortraitRef : creaturePortraitRef
      const tgtRef = attackerSide === 'player' ? creaturePortraitRef : playerPortraitRef
      const tgtPos = getPortraitPos(tgtRef)
      const attackerFrontId = getFrontIdForSide(attackerSide)
      const weaponUrlFallback = combatantInfoByIdRef.current[attackerFrontId]?.weaponUrl
      const dir = attackerSide === 'player' ? 'left-to-right' as const : 'right-to-left' as const
      const defaultFlight = (anim.projectile === 'arc' ? PROJECTILE_SPEED * 1.25 : PROJECTILE_SPEED) * 1000 + 50
      const resolveFlightMs = (f: typeof projFrames[0]) => f.lifetimeMs ?? f.speedMs ?? defaultFlight
      const maxProjMs = Math.max(...projFrames.map(f => (f.delayMs ?? 0) + resolveFlightMs(f)))
      projFrames.forEach(async (f) => {
        if (f.delayMs) await sleep(f.delayMs)
        const srcPos = getPortraitPos(srcRef)
        const key = ++vfxKeyRef.current
        const flightMs = resolveFlightMs(f)
        const entry: ActiveProjectileEntry = {
          key,
          direction: dir,
          imageUrl: f.url?.trim() ?? weaponUrlFallback ?? null,
          soundUrl: f.soundUrl?.trim() || undefined,
          soundVolumePercent: f.soundVolumePercent ?? 100,
          soundFadeInMs: f.soundFadeInMs ?? 0,
          soundFadeOutMs: f.soundFadeOutMs ?? 0,
          mirrored: isRightSideAttacker,
          from: {
            x: srcPos.x + (isRightSideAttacker ? -(f.offsetX ?? 0) : (f.offsetX ?? 0)),
            y: srcPos.y + (f.offsetY ?? 0),
          },
          to: tgtPos,
          trajectory: f.trajectory,
          durationMs: flightMs,
          sizePx: f.sizePx,
          startSizePx: f.startSizePx,
          endSizePx: f.endSizePx,
          acceleration: f.acceleration ?? 0,
          rotationStart: isRightSideAttacker ? -(f.rotationStart ?? 0) : (f.rotationStart ?? 0),
          rotationEnd: isRightSideAttacker ? -(f.rotationEnd ?? f.rotationStart ?? 0) : (f.rotationEnd ?? f.rotationStart ?? 0),
          color: anim.impactColor,
          show: true,
        }
        setActiveProjectiles(prev => [...prev, entry])
        await sleep(flightMs)
        setActiveProjectiles(prev => prev.map(p => p.key === key ? { ...p, show: false } : p))
        setTimeout(() => setActiveProjectiles(prev => prev.filter(p => p.key !== key)), 400)
      })
      await sleep(maxProjMs)
    }

    if (shouldLunge) {
      if (lungeDelayMs > 0) await sleep(lungeDelayMs)
      const lungeDurationMs = resolveCardMotionDurationMs(CARD_LUNGE_DURATION_MS, lungeAcceleration)
      const destinationX = getCardLungeDestinationX(attackerSide, lungeGapPx)
      setCardMotion(attackerSide, destinationX, lungeDurationMs, lungeAcceleration, lungeStartSpeed)
      await sleep(lungeDurationMs)
      usedLunge = true
    }

    if (abortRef.current) return

    // --- Block frames (shown at defender portrait center when blocked) ---
    if (isAvoided && avoidEvent) {
      const defenderSide: 'player' | 'creature' = attackerSide === 'player' ? 'creature' : 'player'
      const isRightSideDefender = defenderSide === 'creature'
      const resolveBlockTiming = (f: AnimationBlockFrame) => {
        if (f.showMs != null && f.vanishMs != null) return { showMs: f.showMs, vanishMs: f.vanishMs }
        const lt = f.lifetimeMs ?? (f.showMs != null ? f.showMs + (f.vanishMs ?? 500) : 800)
        return { showMs: Math.floor(lt * 0.4), vanishMs: Math.ceil(lt * 0.6) }
      }
      const blockAnimFrames = (
        avoidEvent.avoidAnimationFrames?.avoid
        ?? avoidEvent.avoidAnimationFrames?.block
        ?? avoidEvent.blockAnimationFrames?.avoid
        ?? avoidEvent.blockAnimationFrames?.block
        ?? []
      ).filter(f => f.url?.trim())
      if (blockAnimFrames.length > 0) {
        blockAnimFrames.forEach(async (f) => {
          if (f.delayMs) await sleep(f.delayMs)
          const { showMs, vanishMs } = resolveBlockTiming(f)
          const entry: ActiveBlockFrameEntry = {
            key: ++vfxKeyRef.current,
            side: defenderSide,
            url: f.url!.trim(),
            soundUrl: f.soundUrl?.trim() || undefined,
            soundVolumePercent: f.soundVolumePercent ?? 100,
            soundFadeInMs: f.soundFadeInMs ?? 0,
            soundFadeOutMs: f.soundFadeOutMs ?? 0,
            showMs,
            vanishMs,
            sizePx: f.sizePx,
            startSizePx: f.startSizePx,
            endSizePx: f.endSizePx,
            offsetX: isRightSideDefender ? -(f.offsetX ?? 0) : (f.offsetX ?? 0),
            offsetY: f.offsetY ?? 0,
            rotationStart: isRightSideDefender ? -(f.rotationStart ?? 0) : (f.rotationStart ?? 0),
            rotationEnd: isRightSideDefender ? -(f.rotationEnd ?? f.rotationStart ?? 0) : (f.rotationEnd ?? f.rotationStart ?? 0),
          }
          setActiveBlockFrames(prev => [...prev, entry])
        })
      }

      // Show "Blocked" text on the defender side
      const isDefenderPlayer = defenderSide === 'player'
      dmgKeyRef.current++
      if (isDefenderPlayer) {
        pushDamagePopup('player', { value: 0, type: 'block', key: dmgKeyRef.current, abilityName: 'Avoided!' })
      } else {
        pushDamagePopup('creature', { value: 0, type: 'block', key: dmgKeyRef.current, abilityName: 'Avoided!' })
      }

      const maxBlockMs = blockAnimFrames.length > 0
        ? Math.max(...blockAnimFrames.map(f => {
            const { showMs, vanishMs } = resolveBlockTiming(f)
            return (f.delayMs ?? 0) + showMs + vanishMs
          }))
        : 600
      await sleep(maxBlockMs)

      setActiveBlockFrames([])
      if (usedLunge) {
        const returnDurationMs = resolveCardMotionDurationMs(CARD_RETURN_DURATION_MS, returnAcceleration)
        setCardMotion(attackerSide, 0, returnDurationMs, returnAcceleration)
        await sleep(returnDurationMs)
      } else {
        setAttackerVariant('return')
        await sleep(280)
      }
      setAttackerVariant('idle')
      return
    }

    const hasCriticalDamage = events.some((event) => event.type === 'damage' && event.isCritical === true)

    // --- Impact frames ---
    const impactFrames = (frames?.impact ?? []).filter(f => f.url?.trim())
    const hasAnyParticleFrames = weaponFrames.length > 0 || projFrames.length > 0 || impactFrames.length > 0
    const shouldUseGenericImpactFallback = !hasAnyParticleFrames
    const shouldShowImpactFrames = impactFrames.length > 0
    const shouldShowAnyImpactVisual = shouldShowImpactFrames || shouldUseGenericImpactFallback
    const resolveImpactTiming = (f: typeof impactFrames[0]) => {
      if (f.showMs != null && f.vanishMs != null) return { showMs: f.showMs, vanishMs: f.vanishMs }
      const lt = f.lifetimeMs ?? (f.showMs != null ? f.showMs + (f.vanishMs ?? 500) : 600)
      return { showMs: Math.floor(lt * 0.15), vanishMs: Math.ceil(lt * 0.85) }
    }
    const maxImpactMs = shouldShowImpactFrames
      ? Math.max(...impactFrames.map(f => {
          const { showMs, vanishMs } = resolveImpactTiming(f)
          return (f.delayMs ?? 0) + showMs + vanishMs
        }))
      : (hasAnyParticleFrames ? 300 : 350)

    if (shouldShowImpactFrames) {
      const isRightSideDefender = attackerSide === 'player'
      impactFrames.forEach(async (f) => {
        if (f.delayMs) await sleep(f.delayMs)
        const { showMs, vanishMs } = resolveImpactTiming(f)
        const entry: ActiveImpactFrame = {
          key: ++vfxKeyRef.current,
          side: attackerSide === 'player' ? 'creature' : 'player',
          url: f.url!.trim(),
          soundUrl: f.soundUrl?.trim() || undefined,
          soundVolumePercent: hasCriticalDamage ? (f.soundVolumePercent ?? 100) * 2 : (f.soundVolumePercent ?? 100),
          soundFadeInMs: f.soundFadeInMs ?? 0,
          soundFadeOutMs: f.soundFadeOutMs ?? 0,
          showMs,
          vanishMs,
          sizePx: f.sizePx,
          startSizePx: f.startSizePx,
          endSizePx: f.endSizePx,
          offsetX: isRightSideDefender ? -(f.offsetX ?? 0) : (f.offsetX ?? 0),
          offsetY: f.offsetY ?? 0,
          endOffsetX: isRightSideDefender ? -(f.endOffsetX ?? f.offsetX ?? 0) : (f.endOffsetX ?? f.offsetX ?? 0),
          endOffsetY: f.endOffsetY ?? f.offsetY ?? 0,
          acceleration: f.acceleration ?? 0,
          rotationStart: isRightSideDefender ? -(f.rotationStart ?? 0) : (f.rotationStart ?? 0),
          rotationEnd: isRightSideDefender ? -(f.rotationEnd ?? f.rotationStart ?? 0) : (f.rotationEnd ?? f.rotationStart ?? 0),
        }
        setActiveImpactFrames(prev => [...prev, entry])
      })
    }

    // Combat events (damage/heal/execute) — split into target-side (shown at impact) and self-side
    // (lifesteal heal shown 200ms later so it reads: "hit enemy → drain life → heal self")
    const combatEvents = events.filter(ev => ev.type !== 'resource_change' && ev.type !== 'block')
      .filter(ev => DAMAGE_NUMBER_EVENT_TYPES.has(ev.type))
    const targetEvents = combatEvents.filter(ev => ev.targetId !== ev.sourceId || ev.type !== 'heal')
    const selfHealEvents = combatEvents.filter(ev => ev.targetId === ev.sourceId && ev.type === 'heal')

    let transformPauseUntilMs = 0
    for (const ev of events) {
      const transformPauseMs = triggerStatusBurstForEvent(ev)
      syncRealtimeStatusesForEvent(ev, turnStatusEffects)
      if (transformPauseMs > 0) {
        transformPauseUntilMs = Math.max(transformPauseUntilMs, Date.now() + transformPauseMs)
      }
    }

    setTargetGenericImpact(shouldUseGenericImpactFallback)
    setTargetImpact(shouldShowAnyImpactVisual)
    if (targetCardAnimation === 'hit') setTargetVariant('hit')
    else setTargetVariant('idle')
    for (const ev of targetEvents) {
      hpByCombatantIdRef.current[ev.targetId] = Math.max(0, ev.targetHpAfter)
      const targetSide = getReplaySideForCombatantId(ev.targetId)
      dmgKeyRef.current++
      if (targetSide === 'player') {
        pushDamagePopup('player', { value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName, isCritical: ev.isCritical === true })
        if (getFrontIdForSide('player') === ev.targetId) setPlayerHp(Math.max(0, ev.targetHpAfter))
      } else {
        pushDamagePopup('creature', { value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName, isCritical: ev.isCritical === true })
        if (getFrontIdForSide('creature') === ev.targetId) setCreatureHp(Math.max(0, ev.targetHpAfter))
      }
    }

    // Self-heals (lifesteal) shown 200ms after the hit for visual clarity
    if (selfHealEvents.length > 0) {
      sleep(200).then(() => {
        for (const ev of selfHealEvents) {
          hpByCombatantIdRef.current[ev.targetId] = Math.max(0, ev.targetHpAfter)
          const targetSide = getReplaySideForCombatantId(ev.targetId)
          dmgKeyRef.current++
          if (targetSide === 'player') {
            pushDamagePopup('player', { value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName, isCritical: ev.isCritical === true })
            if (getFrontIdForSide('player') === ev.targetId) setPlayerHp(Math.max(0, ev.targetHpAfter))
          } else {
            pushDamagePopup('creature', { value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName, isCritical: ev.isCritical === true })
            if (getFrontIdForSide('creature') === ev.targetId) setCreatureHp(Math.max(0, ev.targetHpAfter))
          }
        }
      })
    }

    await sleep(maxImpactMs)

    setActiveWeaponFrames([])
    setActiveImpactFrames([])
    setTargetImpact(false)
    setTargetGenericImpact(false)
    if (usedLunge) {
      const returnDurationMs = resolveCardMotionDurationMs(CARD_RETURN_DURATION_MS, returnAcceleration)
      setCardMotion(attackerSide, 0, returnDurationMs, returnAcceleration)
      await sleep(returnDurationMs)
    } else {
      setAttackerVariant('return')
      await sleep(280)
    }
    setTargetVariant('idle')

    setAttackerVariant('idle')

    const remainingTransformPauseMs = transformPauseUntilMs > 0
      ? Math.max(0, transformPauseUntilMs - Date.now())
      : 0
    if (remainingTransformPauseMs > 0) {
      await sleep(remainingTransformPauseMs)
    }
  }, [
    getPortraitPos,
    pushDamagePopup,
    triggerStatusBurstForEvent,
    getCardLungeDestinationX,
    setCardMotion,
    getReplaySideForCombatantId,
    getFrontIdForSide,
    syncRealtimeStatusesForEvent,
    triggerStatusBurstForEvent,
  ])

  const animateAmbientEvents = useCallback(async (
    events: CombatTurnEvent[],
    turnStatusEffects?: Record<string, ActiveStatusEffect[]>,
  ) => {
    for (const ev of events) {
      if (abortRef.current) return

      if (ev.type === 'resource_change' && ev.resourceAfter) {
        resourceByCombatantIdRef.current[ev.sourceId] = ev.resourceAfter.current
        const sourceSide = getReplaySideForCombatantId(ev.sourceId)
        if (sourceSide === 'player' && getFrontIdForSide('player') === ev.sourceId) {
          setPlayerResourceCurrent(ev.resourceAfter.current)
        } else if (sourceSide === 'creature' && getFrontIdForSide('creature') === ev.sourceId) {
          setCreatureResourceCurrent(ev.resourceAfter.current)
        }
      }

      if (ev.type === 'summon') {
        await sleep(SUMMON_SPAWN_DELAY_MS)
        registerSummonedCombatant(ev.summonedCombatant)
        await sleep(SUMMON_POST_SPAWN_DELAY_MS)
        continue
      }

      const transformPauseMs = triggerStatusBurstForEvent(ev)
      syncRealtimeStatusesForEvent(ev, turnStatusEffects)

      if (DAMAGE_NUMBER_EVENT_TYPES.has(ev.type)) {
        hpByCombatantIdRef.current[ev.targetId] = Math.max(0, ev.targetHpAfter)
        const targetSide = getReplaySideForCombatantId(ev.targetId)
        dmgKeyRef.current++
        if (targetSide === 'player') {
          pushDamagePopup('player', { value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName, isCritical: ev.isCritical === true })
          if (getFrontIdForSide('player') === ev.targetId) setPlayerHp(Math.max(0, ev.targetHpAfter))
        } else {
          pushDamagePopup('creature', { value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName, isCritical: ev.isCritical === true })
          if (getFrontIdForSide('creature') === ev.targetId) setCreatureHp(Math.max(0, ev.targetHpAfter))
        }
        await sleep(240)
      } else if (STATUS_BURST_EVENT_TYPES.has(ev.type)) {
        await sleep(180)
      }

      if (transformPauseMs > 0) {
        await sleep(transformPauseMs)
      }
    }
  }, [pushDamagePopup, triggerStatusBurstForEvent, syncRealtimeStatusesForEvent, getReplaySideForCombatantId, getFrontIdForSide, registerSummonedCombatant])

  const playTurn = useCallback(async (turn: CombatResult['turns'][number]) => {
    const groups = groupCombatTurnEvents(turn.events)

    for (const group of groups) {
      if (abortRef.current) return
      if (group.kind === 'ambient') {
        await animateAmbientEvents(group.events, turn.activeStatusEffects)
        continue
      }
      if (group.events.every((event) => event.type === 'resource_change')) continue
      const nonResourceEvents = group.events.filter((event) => event.type !== 'resource_change')
      const nonResourceNonBlockEvents = nonResourceEvents.filter((event) => event.type !== 'block')
      const isBlockedCastGroup =
        nonResourceEvents.length > 0
        && nonResourceEvents.every((event) =>
          (event.type === 'block' && event.blocked) || (event.type === 'avoid' && event.avoided),
        )

      let attackerSide: 'player' | 'creature' = 'player'
      if (isBlockedCastGroup) {
        const blockTargetId = nonResourceEvents[0]?.targetId
        const blockedSide = blockTargetId ? getReplaySideForCombatantId(blockTargetId) : 'creature'
        attackerSide = blockedSide === 'player' ? 'creature' : 'player'
      } else {
        const attackerEvent =
          nonResourceNonBlockEvents[0]
          ?? group.events.find((event) => event.type === 'resource_change')
          ?? nonResourceEvents[0]
          ?? group.events[0]
        attackerSide = getReplaySideForCombatantId(attackerEvent.sourceId)
      }
      const groupAbilityId = group.events.find((event) => !!event.abilityId)?.abilityId
      const overrideFrames = groupAbilityId && abilityAnimations?.[groupAbilityId]
      const attackerIdForAnimation = (
        nonResourceNonBlockEvents[0]
        ?? nonResourceEvents[0]
        ?? group.events[0]
      )?.sourceId ?? (attackerSide === 'player' ? playerFrontId : creatureFrontId)
      const baseAnimation = getBaseAnimationForAttacker(attackerIdForAnimation)
      const animationConfig = overrideFrames
        ? getAttackAnimationConfig(undefined, overrideFrames)
        : baseAnimation
      await animateAttack(attackerSide, group.events, animationConfig, turn.activeStatusEffects)
      const summonEvents = group.events.filter((event) => event.type === 'summon' && event.summonedCombatant)
      if (summonEvents.length > 0) {
        await sleep(SUMMON_SPAWN_DELAY_MS)
        for (const summonEvent of summonEvents) {
          registerSummonedCombatant(summonEvent.summonedCombatant)
        }
        await sleep(SUMMON_POST_SPAWN_DELAY_MS)
      }
    }

    if (turn.activeStatusEffects) {
      latestStatusByCombatantIdRef.current = { ...turn.activeStatusEffects }
      const nextPlayerFrontId = turn.frontlineBySide?.[playerSideKey] ?? playerFrontId
      const nextCreatureFrontId = turn.frontlineBySide?.[creatureSideKey] ?? creatureFrontId
      reorderSideRosterForFront('player', nextPlayerFrontId)
      reorderSideRosterForFront('creature', nextCreatureFrontId)
      setDisplayedFrontline('player', nextPlayerFrontId)
      setDisplayedFrontline('creature', nextCreatureFrontId)
      const nextPlayer = turn.activeStatusEffects[nextPlayerFrontId] ?? []
      const nextCreature = turn.activeStatusEffects[nextCreatureFrontId] ?? []
      setPlayerStatusEffects(nextPlayer)
      setCreatureStatusEffects(nextCreature)
      syncLoopStatusParticles(nextPlayer, nextCreature)

      const nextPlayerTransform = getPreferredTransformTemplateId(nextPlayer, statusTransforms)
      if (!nextPlayerTransform) {
        clearTransformTimer('player')
        setPlayerTransformTemplateId(null)
      } else if (
        !nextPlayer.some((status) => status.templateId === playerTransformTemplateId)
        && playerTransformTimerRef.current == null
      ) {
        setPlayerTransformTemplateId(nextPlayerTransform)
      }

      const nextCreatureTransform = getPreferredTransformTemplateId(nextCreature, statusTransforms)
      if (!nextCreatureTransform) {
        clearTransformTimer('creature')
        setCreatureTransformTemplateId(null)
      } else if (
        !nextCreature.some((status) => status.templateId === creatureTransformTemplateId)
        && creatureTransformTimerRef.current == null
      ) {
        setCreatureTransformTemplateId(nextCreatureTransform)
      }
    }
    if (turn.resources) {
      for (const [combatantId, resource] of Object.entries(turn.resources)) {
        resourceByCombatantIdRef.current[combatantId] = resource.current
      }
      const nextPlayerFrontId = turn.frontlineBySide?.[playerSideKey] ?? playerFrontId
      const nextCreatureFrontId = turn.frontlineBySide?.[creatureSideKey] ?? creatureFrontId
      if (turn.resources[nextPlayerFrontId]) setPlayerResourceCurrent(turn.resources[nextPlayerFrontId].current)
      if (turn.resources[nextCreatureFrontId]) setCreatureResourceCurrent(turn.resources[nextCreatureFrontId].current)
    }
  }, [
    abilityAnimations,
    animateAmbientEvents,
    animateAttack,
    clearTransformTimer,
    playerTransformTemplateId,
    creatureTransformTemplateId,
    statusTransforms,
    syncLoopStatusParticles,
    getReplaySideForCombatantId,
    getBaseAnimationForAttacker,
    registerSummonedCombatant,
    playerSideKey,
    creatureSideKey,
    playerFrontId,
    creatureFrontId,
    reorderSideRosterForFront,
    setDisplayedFrontline,
  ])

  const {
    currentTurn,
    isFinished: done,
    stop: stopPlayback,
    finishAtTurn,
  } = useReplayRuntime({
    turns: combat.turns,
    onPlayTurn: playTurn,
    abortRef,
    startDelayMs: 600,
    betweenTurnsDelayMs: 300,
  })

  const stopBossBgm = useCallback(async (fadeOutMs = 0) => {
    const audio = bossBgmRef.current
    if (!audio) return
    bossBgmRef.current = null
    if (fadeOutMs > 0) {
      fadeOutAndReleaseAudio(audio, fadeOutMs)
      await new Promise<void>((resolve) => window.setTimeout(resolve, fadeOutMs))
      return
    }
    audio.pause()
    audio.src = ''
  }, [])

  useEffect(() => {
    if (introPlayedRef.current) return
    introPlayedRef.current = true
    const cleanups: Array<() => void> = []
    const playerIntro = playerIntroSoundUrl?.trim()
    const creatureIntro = creatureIntroSoundUrl?.trim()
    if (playerIntro) {
      cleanups.push(
        playOneShotAudio(
          playerIntro,
          playerIntroSoundVolumePercent ?? 100,
          0,
          playerIntroSoundFadeInMs ?? 0,
          playerIntroSoundFadeOutMs ?? 0,
        ),
      )
    }
    if (creatureIntro) {
      cleanups.push(
        playOneShotAudio(
          creatureIntro,
          creatureIntroSoundVolumePercent ?? 100,
          playerIntro ? 140 : 0,
          creatureIntroSoundFadeInMs ?? 0,
          creatureIntroSoundFadeOutMs ?? 0,
        ),
      )
    }
    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [
    playerIntroSoundUrl,
    playerIntroSoundVolumePercent,
    playerIntroSoundFadeInMs,
    playerIntroSoundFadeOutMs,
    creatureIntroSoundUrl,
    creatureIntroSoundVolumePercent,
    creatureIntroSoundFadeInMs,
    creatureIntroSoundFadeOutMs,
  ])

  useEffect(() => {
    if (bossBgmRef.current) void stopBossBgm(bossBattleMusicFadeOutMs ?? 0)
    const bgmUrl = bossBattleMusicUrl?.trim()
    if (!bgmUrl) return
    const audio = new Audio(bgmUrl)
    audio.loop = true
    const targetVolume = clampSoundVolume(bossBattleMusicVolumePercent ?? 100)
    const fadeInMs = Math.max(0, bossBattleMusicFadeInMs ?? 0)
    audio.volume = fadeInMs > 0 ? 0 : targetVolume
    bossBgmRef.current = audio
    let stopFadeIn: (() => void) | null = null
    if (fadeInMs > 0) stopFadeIn = animateAudioVolume(audio, 0, targetVolume, fadeInMs)
    audio.play().catch(() => undefined)
    return () => {
      if (stopFadeIn) stopFadeIn()
      if (bossBgmRef.current !== audio) return
      bossBgmRef.current = null
      fadeOutAndReleaseAudio(audio, Math.max(0, bossBattleMusicFadeOutMs ?? 0))
    }
  }, [
    bossBattleMusicUrl,
    bossBattleMusicVolumePercent,
    bossBattleMusicFadeInMs,
    bossBattleMusicFadeOutMs,
    stopBossBgm,
  ])

  useEffect(() => () => {
    clearTransformTimer('player')
    clearTransformTimer('creature')
    clearDamagePopups()
    stopSummonIntroSounds()
  }, [clearTransformTimer, clearDamagePopups, stopSummonIntroSounds])

  const handleSkip = () => {
    stopPlayback()
    clearTransformTimer('player')
    clearTransformTimer('creature')
    stopSummonIntroSounds()
    setPlayerVariant('idle')
    setCreatureVariant('idle')
    setPlayerCardOffsetX(0)
    setCreatureCardOffsetX(0)
    setShowPlayerImpact(false)
    setShowCreatureImpact(false)
    setActiveWeaponFrames([])
    setActiveProjectiles([])
    setActiveImpactFrames([])
    setActiveBlockFrames([])
    setActiveStatusLoopParticles([])
    setActiveStatusBurstParticles([])
    clearDamagePopups()

    for (const turn of combat.turns) {
      for (const ev of turn.events) {
        if (ev.type === 'summon') registerSummonedCombatant(ev.summonedCombatant, { playIntroSound: false })
        hpByCombatantIdRef.current[ev.targetId] = Math.max(0, ev.targetHpAfter)
      }
    }
    const lastTurn = combat.turns[combat.turns.length - 1]
    const finalPlayerFrontId = lastTurn?.frontlineBySide?.[playerSideKey] ?? playerFrontId
    const finalCreatureFrontId = lastTurn?.frontlineBySide?.[creatureSideKey] ?? creatureFrontId
    reorderSideRosterForFront('player', finalPlayerFrontId)
    reorderSideRosterForFront('creature', finalCreatureFrontId)
    setDisplayedFrontline('player', finalPlayerFrontId)
    setDisplayedFrontline('creature', finalCreatureFrontId)
    setPlayerHp(hpByCombatantIdRef.current[finalPlayerFrontId] ?? combatantInfoByIdRef.current[finalPlayerFrontId]?.maxHp ?? player.maxHp)
    setCreatureHp(hpByCombatantIdRef.current[finalCreatureFrontId] ?? combatantInfoByIdRef.current[finalCreatureFrontId]?.maxHp ?? creature.maxHp)

    // Jump resources to final state
    if (lastTurn?.resources) {
      for (const [combatantId, resource] of Object.entries(lastTurn.resources)) {
        resourceByCombatantIdRef.current[combatantId] = resource.current
      }
      if (lastTurn.resources[finalPlayerFrontId]) setPlayerResourceCurrent(lastTurn.resources[finalPlayerFrontId].current)
      if (lastTurn.resources[finalCreatureFrontId]) setCreatureResourceCurrent(lastTurn.resources[finalCreatureFrontId].current)
    }
    latestStatusByCombatantIdRef.current = { ...(lastTurn?.activeStatusEffects ?? {}) }
    const finalPlayerStatuses = lastTurn?.activeStatusEffects?.[finalPlayerFrontId] ?? []
    const finalCreatureStatuses = lastTurn?.activeStatusEffects?.[finalCreatureFrontId] ?? []
    setPlayerStatusEffects(finalPlayerStatuses)
    setCreatureStatusEffects(finalCreatureStatuses)
    setPlayerTransformTemplateId(getPreferredTransformTemplateId(finalPlayerStatuses, statusTransforms))
    setCreatureTransformTemplateId(getPreferredTransformTemplateId(finalCreatureStatuses, statusTransforms))
    syncLoopStatusParticles(finalPlayerStatuses, finalCreatureStatuses)
    finishAtTurn(lastTurn?.turnIndex ?? 0)
  }

  const handleContinue = async () => {
    clearTransformTimer('player')
    clearTransformTimer('creature')
    stopSummonIntroSounds()
    await stopBossBgm(Math.max(0, bossBattleMusicFadeOutMs ?? 0))
    onFinish()
  }

  const playerFrontInfo = combatantInfoByIdRef.current[playerFrontId] ?? player
  const creatureFrontInfo = combatantInfoByIdRef.current[creatureFrontId] ?? creature
  const playerBacklineIds = sideRosterIds.player
    .filter((combatantId) => combatantId !== playerFrontId && (hpByCombatantIdRef.current[combatantId] ?? 0) > 0)
    .slice(0, 3)
  const creatureBacklineIds = sideRosterIds.creature
    .filter((combatantId) => combatantId !== creatureFrontId && (hpByCombatantIdRef.current[combatantId] ?? 0) > 0)
    .slice(0, 3)
  const playerTransformPortraitUrl = playerTransformTemplateId
    ? statusTransforms?.[playerTransformTemplateId]?.portraitUrl?.trim()
    : ''
  const creatureTransformPortraitUrl = creatureTransformTemplateId
    ? statusTransforms?.[creatureTransformTemplateId]?.portraitUrl?.trim()
    : ''
  const resolvedPlayerPortraitUrl = playerTransformPortraitUrl || playerFrontInfo.portraitUrl
  const resolvedCreaturePortraitUrl = creatureTransformPortraitUrl || creatureFrontInfo.portraitUrl

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        height: '100%',
        backgroundImage: arenaBackgroundImageUrl
          ? `linear-gradient(rgba(12,10,20,0.35), rgba(12,10,20,0.35)), url(${arenaBackgroundImageUrl})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >

      {currentTurn >= 0 && (
        <Typography variant="body2" color="text.secondary" textAlign="center" fontWeight={600} sx={{ fontSize: TURN_FONT_SIZE }}>
          Turn {currentTurn + 1} / {combat.turns.length}
        </Typography>
      )}

      {/* Arena: flex 1 so it fills remaining height; center cards vertically; larger gap between cards */}
      <Box ref={arenaRef} sx={{ flex: 1, display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: 0 }}>

        {/* Projectile layer — all active projectiles */}
        <AnimatePresence>
          {activeProjectiles.map(p => (
            <Projectile
              key={p.key}
              show={p.show}
              color={p.color}
              direction={p.direction}
              id={p.key}
              soundUrl={p.soundUrl}
              soundVolumePercent={p.soundVolumePercent}
              soundFadeInMs={p.soundFadeInMs}
              soundFadeOutMs={p.soundFadeOutMs}
              weaponUrl={p.imageUrl}
              mirrored={p.mirrored}
              trajectory={p.trajectory}
              durationMs={p.durationMs}
              sizePx={p.sizePx}
              startSizePx={p.startSizePx}
              endSizePx={p.endSizePx}
              acceleration={p.acceleration}
              rotationStart={p.rotationStart}
              rotationEnd={p.rotationEnd}
              from={p.from}
              to={p.to}
            />
          ))}
        </AnimatePresence>

        {/* Player card */}
        <motion.div
          animate={{ x: playerCardOffsetX }}
          transition={playerCardTransition}
          style={{ flex: 1, maxWidth: CARD_MAX_WIDTH, position: 'relative' }}
        >
          <AnimatePresence initial={false}>
            {playerBacklineIds.map((combatantId, index) => {
              const backInfo = combatantInfoByIdRef.current[combatantId]
              if (!backInfo) return null
              const scale = Math.max(0.52, 1 - ((index + 1) * BACKLINE_STACK_SCALE_STEP))
              const cardWidth = Math.round(CARD_MAX_WIDTH * scale)
              const portraitSize = Math.round(PORTRAIT_SIZE * scale)
              const hp = hpByCombatantIdRef.current[combatantId] ?? backInfo.maxHp
              const resourceCurrent = resourceByCombatantIdRef.current[combatantId] ?? null
              const statusEffects = latestStatusByCombatantIdRef.current[combatantId] ?? []
              const stackOffset = BACKLINE_STACK_OFFSET_PX * (index + 1)
              return (
                <motion.div
                  key={`player-backline-${combatantId}`}
                  layout
                  initial={{ opacity: 0, x: stackOffset * 0.6, y: -(stackOffset * 0.45), scale: 0.92 }}
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: stackOffset * 0.6, y: -(stackOffset * 0.45), scale: 0.9 }}
                  transition={{
                    duration: FRONTLINE_SWAP_TRANSITION_MS / 1000,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    position: 'absolute',
                    left: -stackOffset,
                    top: stackOffset,
                    zIndex: index + 1,
                    pointerEvents: 'none',
                  }}
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      width: cardWidth,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: CARD_GAP,
                      p: CARD_PADDING,
                      pt: 0,
                      borderRadius: CARD_RADIUS,
                      bgcolor: '#14121f',
                      borderColor: 'rgba(99,102,241,0.45)',
                      boxShadow: '0 0 24px rgba(0,0,0,0.4), 0 0 20px rgba(99,102,241,0.12)',
                    }}
                  >
                    <ReplayPortrait
                      url={backInfo.portraitUrl}
                      weaponUrl={backInfo.weaponUrl}
                      sizePx={portraitSize}
                      personIconSizePx={PERSON_ICON_SIZE}
                      borderRadius={PORTRAIT_BORDER_RADIUS}
                      borderWidth={PORTRAIT_BORDER}
                      weaponSizePx={Math.round(WEAPON_SIZE * scale)}
                      weaponOffsetPx={Math.round(WEAPON_OFFSET * scale)}
                    />
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: NAME_FONT_SIZE }}>{backInfo.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: LEVEL_FONT_SIZE }}>Level {backInfo.level}</Typography>
                    </Box>
                    <ReplayHpBar current={hp} max={backInfo.maxHp} label="HP" fontSizePx={HP_FONT_SIZE} heightPx={HP_BAR_HEIGHT} radius={HP_BAR_RADIUS} />
                    {backInfo.resource && resourceCurrent !== null && (
                      <ReplayResourceBar
                        current={resourceCurrent}
                        max={backInfo.resource.max}
                        label={backInfo.resource.name}
                        colorHex={backInfo.resource.colorHex}
                        fontSizePx={HP_FONT_SIZE}
                        heightPx={HP_BAR_HEIGHT}
                        radius={HP_BAR_RADIUS}
                      />
                    )}
                    <ReplayStatusEffectIcons effects={statusEffects} />
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {STAT_LABELS.map(({ key, label }) => (
                        <Box key={`${combatantId}-${label}`} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.75 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: STAT_FONT_SIZE }}>{label}</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ fontSize: STAT_FONT_SIZE }}>{backInfo[key]}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </motion.div>
              )
            })}
          </AnimatePresence>
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              transition: `transform ${FRONTLINE_SWAP_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${FRONTLINE_SWAP_TRANSITION_MS}ms ease`,
              transform: playerFrontSwapPulse ? 'translate3d(0, 24px, 0) scale(0.92)' : 'translate3d(0, 0, 0) scale(1)',
              opacity: playerFrontSwapPulse ? 0.65 : 1,
            }}
          >
            <motion.div
              variants={playerVariants}
              animate={playerVariant}
              style={{ position: 'relative' }}
            >
            <Paper
              ref={playerCardRef}
              variant="outlined"
              sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: CARD_GAP, p: CARD_PADDING, pt: 0, borderRadius: CARD_RADIUS,
                bgcolor: '#14121f',
                borderColor: 'rgba(99,102,241,0.45)',
                boxShadow: '0 0 24px rgba(0,0,0,0.4), 0 0 20px rgba(99,102,241,0.12)',
                position: 'relative', overflow: 'visible',
              }}
            >
              <Box ref={playerPortraitRef} sx={{ position: 'relative' }}>
              <ReplayPortrait
                url={resolvedPlayerPortraitUrl}
                weaponUrl={playerFrontInfo.weaponUrl}
                sizePx={PORTRAIT_SIZE}
                personIconSizePx={PERSON_ICON_SIZE}
                borderRadius={PORTRAIT_BORDER_RADIUS}
                borderWidth={PORTRAIT_BORDER}
                weaponSizePx={WEAPON_SIZE}
                weaponOffsetPx={WEAPON_OFFSET}
              />
              {activeStatusLoopParticles.filter(p => p.side === 'player').map(p => (
                <StatusParticleEffect
                  key={p.key}
                  id={p.key}
                  url={p.url}
                  soundUrl={p.soundUrl}
                  soundVolumePercent={p.soundVolumePercent}
                  soundFadeInMs={p.soundFadeInMs}
                  soundFadeOutMs={p.soundFadeOutMs}
                  delayMs={p.delayMs}
                  lifetimeMs={p.lifetimeMs}
                  startSizePx={p.startSizePx}
                  endSizePx={p.endSizePx}
                  offsetX={p.offsetX}
                  offsetY={p.offsetY}
                  endOffsetX={p.endOffsetX}
                  endOffsetY={p.endOffsetY}
                  acceleration={p.acceleration}
                  rotationStart={p.rotationStart}
                  rotationEnd={p.rotationEnd}
                  loop
                />
              ))}
              {activeStatusBurstParticles.filter(p => p.side === 'player').map(p => (
                <StatusParticleEffect
                  key={p.key}
                  id={p.key}
                  url={p.url}
                  soundUrl={p.soundUrl}
                  soundVolumePercent={p.soundVolumePercent}
                  soundFadeInMs={p.soundFadeInMs}
                  soundFadeOutMs={p.soundFadeOutMs}
                  delayMs={p.delayMs}
                  lifetimeMs={p.lifetimeMs}
                  startSizePx={p.startSizePx}
                  endSizePx={p.endSizePx}
                  offsetX={p.offsetX}
                  offsetY={p.offsetY}
                  endOffsetX={p.endOffsetX}
                  endOffsetY={p.endOffsetY}
                  acceleration={p.acceleration}
                  rotationStart={p.rotationStart}
                  rotationEnd={p.rotationEnd}
                />
              ))}
              {activeWeaponFrames.filter(f => f.side === 'player').map(f => (
                <WeaponFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} soundVolumePercent={f.soundVolumePercent} soundFadeInMs={f.soundFadeInMs} soundFadeOutMs={f.soundFadeOutMs} fadeInMs={f.fadeInMs} lifetimeMs={f.lifetimeMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} endOffsetX={f.endOffsetX} endOffsetY={f.endOffsetY} acceleration={f.acceleration} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored={false} id={f.key} />
              ))}
              {showPlayerImpact && activeImpactFrames.filter(f => f.side === 'player').length > 0
                ? activeImpactFrames.filter(f => f.side === 'player').map(f => (
                  <ImpactFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} soundVolumePercent={f.soundVolumePercent} soundFadeInMs={f.soundFadeInMs} soundFadeOutMs={f.soundFadeOutMs} showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} endOffsetX={f.endOffsetX} endOffsetY={f.endOffsetY} acceleration={f.acceleration} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored={false} id={f.key} />
                ))
                : (showPlayerImpact && showPlayerGenericImpact ? (
                  <ImpactEffect
                    show={showPlayerImpact}
                    style={'generic' as const}
                    color={creatureAnim.impactColor}
                    id={`p-impact-${dmgKeyRef.current}`}
                  />
                ) : null)
              }
              <AnimatePresence>
                {playerDmg.map((popup, index) => (
                  <DamageNumber
                    key={popup.key}
                    value={popup.value}
                    type={popup.type}
                    id={popup.key}
                    abilityName={popup.abilityName}
                    isCritical={popup.isCritical}
                    stackIndex={playerDmg.length - index - 1}
                  />
                ))}
              </AnimatePresence>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: NAME_FONT_SIZE }}>{playerFrontInfo.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: LEVEL_FONT_SIZE }}>Level {playerFrontInfo.level}</Typography>
            </Box>
            <ReplayHpBar current={playerHp} max={playerFrontInfo.maxHp} label="HP" fontSizePx={HP_FONT_SIZE} heightPx={HP_BAR_HEIGHT} radius={HP_BAR_RADIUS} />
            {playerFrontInfo.resource && playerResourceCurrent !== null && (
              <ReplayResourceBar
                current={playerResourceCurrent}
                max={playerFrontInfo.resource.max}
                label={playerFrontInfo.resource.name}
                colorHex={playerFrontInfo.resource.colorHex}
                fontSizePx={HP_FONT_SIZE}
                heightPx={HP_BAR_HEIGHT}
                radius={HP_BAR_RADIUS}
              />
            )}
            <ReplayStatusEffectIcons effects={playerStatusEffects} />
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {STAT_LABELS.map(({ key, label }) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.75 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: STAT_FONT_SIZE }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: STAT_FONT_SIZE }}>{playerFrontInfo[key]}</Typography>
                </Box>
              ))}
            </Box>
              {activeBlockFrames.filter(f => f.side === 'player').map(f => (
                <BlockFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} soundVolumePercent={f.soundVolumePercent} soundFadeInMs={f.soundFadeInMs} soundFadeOutMs={f.soundFadeOutMs} side="player" showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored={false} id={f.key} />
              ))}
            </Paper>
            </motion.div>
          </div>
        </motion.div>

        {/* Center: VS label */}
        <Box sx={{ alignSelf: 'center', position: 'relative', width: VS_WIDTH, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Typography
            variant="h3"
            fontWeight={900}
            sx={{
              fontSize: `${2 * SCALE}rem`,
              userSelect: 'none',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(99,102,241,0.3))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            VS
          </Typography>
        </Box>

        {/* Creature card */}
        <motion.div
          animate={{ x: creatureCardOffsetX }}
          transition={creatureCardTransition}
          style={{ flex: 1, maxWidth: CARD_MAX_WIDTH, position: 'relative' }}
        >
          <AnimatePresence initial={false}>
            {creatureBacklineIds.map((combatantId, index) => {
              const backInfo = combatantInfoByIdRef.current[combatantId]
              if (!backInfo) return null
              const scale = Math.max(0.52, 1 - ((index + 1) * BACKLINE_STACK_SCALE_STEP))
              const cardWidth = Math.round(CARD_MAX_WIDTH * scale)
              const portraitSize = Math.round(PORTRAIT_SIZE * scale)
              const hp = hpByCombatantIdRef.current[combatantId] ?? backInfo.maxHp
              const resourceCurrent = resourceByCombatantIdRef.current[combatantId] ?? null
              const statusEffects = latestStatusByCombatantIdRef.current[combatantId] ?? []
              const stackOffset = BACKLINE_STACK_OFFSET_PX * (index + 1)
              return (
                <motion.div
                  key={`creature-backline-${combatantId}`}
                  layout
                  initial={{ opacity: 0, x: -(stackOffset * 0.6), y: -(stackOffset * 0.45), scale: 0.92 }}
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -(stackOffset * 0.6), y: -(stackOffset * 0.45), scale: 0.9 }}
                  transition={{
                    duration: FRONTLINE_SWAP_TRANSITION_MS / 1000,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{
                    position: 'absolute',
                    right: -stackOffset,
                    top: stackOffset,
                    zIndex: index + 1,
                    pointerEvents: 'none',
                  }}
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      width: cardWidth,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: CARD_GAP,
                      p: CARD_PADDING,
                      pt: 0,
                      borderRadius: CARD_RADIUS,
                      bgcolor: '#1a1414',
                      borderColor: 'rgba(239,68,68,0.4)',
                      boxShadow: '0 0 24px rgba(0,0,0,0.4), 0 0 20px rgba(239,68,68,0.1)',
                    }}
                  >
                    <ReplayPortrait
                      url={backInfo.portraitUrl}
                      weaponUrl={backInfo.weaponUrl}
                      sizePx={portraitSize}
                      personIconSizePx={PERSON_ICON_SIZE}
                      borderRadius={PORTRAIT_BORDER_RADIUS}
                      borderWidth={PORTRAIT_BORDER}
                      weaponSizePx={Math.round(WEAPON_SIZE * scale)}
                      weaponOffsetPx={Math.round(WEAPON_OFFSET * scale)}
                    />
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: NAME_FONT_SIZE }}>{backInfo.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: LEVEL_FONT_SIZE }}>Level {backInfo.level}</Typography>
                    </Box>
                    <ReplayHpBar current={hp} max={backInfo.maxHp} label="HP" fontSizePx={HP_FONT_SIZE} heightPx={HP_BAR_HEIGHT} radius={HP_BAR_RADIUS} />
                    {backInfo.resource && resourceCurrent !== null && (
                      <ReplayResourceBar
                        current={resourceCurrent}
                        max={backInfo.resource.max}
                        label={backInfo.resource.name}
                        colorHex={backInfo.resource.colorHex}
                        fontSizePx={HP_FONT_SIZE}
                        heightPx={HP_BAR_HEIGHT}
                        radius={HP_BAR_RADIUS}
                      />
                    )}
                    <ReplayStatusEffectIcons effects={statusEffects} />
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {STAT_LABELS.map(({ key, label }) => (
                        <Box key={`${combatantId}-${label}`} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.75 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: STAT_FONT_SIZE }}>{label}</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ fontSize: STAT_FONT_SIZE }}>{backInfo[key]}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                </motion.div>
              )
            })}
          </AnimatePresence>
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              transition: `transform ${FRONTLINE_SWAP_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${FRONTLINE_SWAP_TRANSITION_MS}ms ease`,
              transform: creatureFrontSwapPulse ? 'translate3d(0, 24px, 0) scale(0.92)' : 'translate3d(0, 0, 0) scale(1)',
              opacity: creatureFrontSwapPulse ? 0.65 : 1,
            }}
          >
            <motion.div
              variants={creatureVariants}
              animate={creatureVariant}
              style={{ position: 'relative' }}
            >
            <Paper
              ref={creatureCardRef}
              variant="outlined"
              sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: CARD_GAP, p: CARD_PADDING, pt: 0, borderRadius: CARD_RADIUS,
                bgcolor: '#1a1414',
                borderColor: 'rgba(239,68,68,0.4)',
                boxShadow: '0 0 24px rgba(0,0,0,0.4), 0 0 20px rgba(239,68,68,0.1)',
                position: 'relative', overflow: 'visible',
              }}
            >
              <Box ref={creaturePortraitRef} sx={{ position: 'relative' }}>
              <ReplayPortrait
                url={resolvedCreaturePortraitUrl}
                weaponUrl={creatureFrontInfo.weaponUrl}
                sizePx={PORTRAIT_SIZE}
                personIconSizePx={PERSON_ICON_SIZE}
                borderRadius={PORTRAIT_BORDER_RADIUS}
                borderWidth={PORTRAIT_BORDER}
                weaponSizePx={WEAPON_SIZE}
                weaponOffsetPx={WEAPON_OFFSET}
              />
              {activeStatusLoopParticles.filter(p => p.side === 'creature').map(p => (
                <StatusParticleEffect
                  key={p.key}
                  id={p.key}
                  url={p.url}
                  soundUrl={p.soundUrl}
                  soundVolumePercent={p.soundVolumePercent}
                  soundFadeInMs={p.soundFadeInMs}
                  soundFadeOutMs={p.soundFadeOutMs}
                  delayMs={p.delayMs}
                  lifetimeMs={p.lifetimeMs}
                  startSizePx={p.startSizePx}
                  endSizePx={p.endSizePx}
                  offsetX={p.offsetX}
                  offsetY={p.offsetY}
                  endOffsetX={p.endOffsetX}
                  endOffsetY={p.endOffsetY}
                  acceleration={p.acceleration}
                  rotationStart={p.rotationStart}
                  rotationEnd={p.rotationEnd}
                  loop
                />
              ))}
              {activeStatusBurstParticles.filter(p => p.side === 'creature').map(p => (
                <StatusParticleEffect
                  key={p.key}
                  id={p.key}
                  url={p.url}
                  soundUrl={p.soundUrl}
                  soundVolumePercent={p.soundVolumePercent}
                  soundFadeInMs={p.soundFadeInMs}
                  soundFadeOutMs={p.soundFadeOutMs}
                  delayMs={p.delayMs}
                  lifetimeMs={p.lifetimeMs}
                  startSizePx={p.startSizePx}
                  endSizePx={p.endSizePx}
                  offsetX={p.offsetX}
                  offsetY={p.offsetY}
                  endOffsetX={p.endOffsetX}
                  endOffsetY={p.endOffsetY}
                  acceleration={p.acceleration}
                  rotationStart={p.rotationStart}
                  rotationEnd={p.rotationEnd}
                />
              ))}
              {activeWeaponFrames.filter(f => f.side === 'creature').map(f => (
                <WeaponFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} soundVolumePercent={f.soundVolumePercent} soundFadeInMs={f.soundFadeInMs} soundFadeOutMs={f.soundFadeOutMs} fadeInMs={f.fadeInMs} lifetimeMs={f.lifetimeMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} endOffsetX={f.endOffsetX} endOffsetY={f.endOffsetY} acceleration={f.acceleration} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored id={f.key} />
              ))}
              {showCreatureImpact && activeImpactFrames.filter(f => f.side === 'creature').length > 0
                ? activeImpactFrames.filter(f => f.side === 'creature').map(f => (
                  <ImpactFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} soundVolumePercent={f.soundVolumePercent} soundFadeInMs={f.soundFadeInMs} soundFadeOutMs={f.soundFadeOutMs} showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} endOffsetX={f.endOffsetX} endOffsetY={f.endOffsetY} acceleration={f.acceleration} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored id={f.key} />
                ))
                : (showCreatureImpact && showCreatureGenericImpact ? (
                  <ImpactEffect
                    show={showCreatureImpact}
                    style={'generic' as const}
                    color={playerAnim.impactColor}
                    id={`c-impact-${dmgKeyRef.current}`}
                  />
                ) : null)
              }
              <AnimatePresence>
                {creatureDmg.map((popup, index) => (
                  <DamageNumber
                    key={popup.key}
                    value={popup.value}
                    type={popup.type}
                    id={popup.key}
                    abilityName={popup.abilityName}
                    isCritical={popup.isCritical}
                    stackIndex={creatureDmg.length - index - 1}
                  />
                ))}
              </AnimatePresence>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: NAME_FONT_SIZE }}>{creatureFrontInfo.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: LEVEL_FONT_SIZE }}>Level {creatureFrontInfo.level}</Typography>
            </Box>
            <ReplayHpBar current={creatureHp} max={creatureFrontInfo.maxHp} label="HP" fontSizePx={HP_FONT_SIZE} heightPx={HP_BAR_HEIGHT} radius={HP_BAR_RADIUS} />
            {creatureFrontInfo.resource && creatureResourceCurrent !== null && (
              <ReplayResourceBar
                current={creatureResourceCurrent}
                max={creatureFrontInfo.resource.max}
                label={creatureFrontInfo.resource.name}
                colorHex={creatureFrontInfo.resource.colorHex}
                fontSizePx={HP_FONT_SIZE}
                heightPx={HP_BAR_HEIGHT}
                radius={HP_BAR_RADIUS}
              />
            )}
            <ReplayStatusEffectIcons effects={creatureStatusEffects} />
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {STAT_LABELS.map(({ key, label }) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.75 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: STAT_FONT_SIZE }}>{label}</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: STAT_FONT_SIZE }}>{creatureFrontInfo[key]}</Typography>
                </Box>
              ))}
            </Box>
              {activeBlockFrames.filter(f => f.side === 'creature').map(f => (
                <BlockFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} soundVolumePercent={f.soundVolumePercent} soundFadeInMs={f.soundFadeInMs} soundFadeOutMs={f.soundFadeOutMs} side="creature" showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored id={f.key} />
              ))}
            </Paper>
            </motion.div>
          </div>
        </motion.div>
      </Box>

      {/* Skip */}
      {!done && (
        <Box sx={{ textAlign: 'center' }}>
          <Button variant="outlined" size="medium" onClick={handleSkip} color="primary">Skip</Button>
        </Box>
      )}

      {/* Result */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ textAlign: 'center', paddingBottom: 12 }}
          >
            <Typography
              variant="h4"
              fontWeight={900}
              gutterBottom
              sx={{
                fontSize: RESULT_FONT_SIZE,
                background: victory
                  ? 'linear-gradient(135deg, #4ade80, #22c55e)'
                  : 'linear-gradient(135deg, #f87171, #ef4444)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {victory ? 'Victory!' : 'Defeat'}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleContinue}
              size="large"
              sx={{ px: 5, py: 1.5, fontSize: BUTTON_FONT_SIZE }}
            >
              Continue
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  )
}
