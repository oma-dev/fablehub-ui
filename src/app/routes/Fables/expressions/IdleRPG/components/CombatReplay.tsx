import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import type { ActiveStatusEffect, AnimationFrames, CombatEventType, CombatResult, CombatTurnEvent, StatusAnimation } from '@features/idle-rpg/api'
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
  styleId?: string
  /** Weapon icon URL for portrait overlay and fallback projectile image when ability has no frame URL. */
  weaponUrl?: string | null
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
  /** Optional intro sound for left-side combatant (typically class intro). */
  playerIntroSoundUrl?: string | null
  /** Optional intro sound for right-side combatant (typically creature/class intro). */
  creatureIntroSoundUrl?: string | null
  /** Optional looping boss music while replay is active. */
  bossBattleMusicUrl?: string | null
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
const VS_WIDTH = Math.round(70 * SCALE)
const TURN_FONT_SIZE = Math.round(14 * SCALE)
const RESULT_FONT_SIZE = `${1.5 * SCALE}rem`
const BUTTON_FONT_SIZE = `${1.1 * SCALE}rem`

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

function playOneShotAudio(url: string, delayMs = 0): () => void {
  let audio: HTMLAudioElement | null = null
  let timeoutId: number | null = null
  let cancelled = false
  const start = () => {
    if (cancelled) return
    audio = new Audio(url)
    audio.play().catch(() => undefined)
  }
  if (delayMs > 0) timeoutId = window.setTimeout(start, delayMs)
  else start()
  return () => {
    cancelled = true
    if (timeoutId != null) window.clearTimeout(timeoutId)
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
  playerIntroSoundUrl,
  creatureIntroSoundUrl,
  bossBattleMusicUrl,
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

  const [playerVariant, setPlayerVariant] = useState<string>('idle')
  const [creatureVariant, setCreatureVariant] = useState<string>('idle')
  const [showPlayerImpact, setShowPlayerImpact] = useState(false)
  const [showCreatureImpact, setShowCreatureImpact] = useState(false)

  // Multi-frame VFX arrays
  const [activeWeaponFrames, setActiveWeaponFrames] = useState<ActiveWeaponFrame[]>([])
  const [activeProjectiles, setActiveProjectiles] = useState<ActiveProjectileEntry[]>([])
  const [activeImpactFrames, setActiveImpactFrames] = useState<ActiveImpactFrame[]>([])
  const [activeBlockFrames, setActiveBlockFrames] = useState<ActiveBlockFrameEntry[]>([])
  const [activeStatusLoopParticles, setActiveStatusLoopParticles] = useState<ActiveStatusParticleEntry[]>([])
  const [activeStatusBurstParticles, setActiveStatusBurstParticles] = useState<ActiveStatusParticleEntry[]>([])

  type DmgState = { value: number; type: CombatEventType; key: number; abilityName?: string } | null
  const [playerDmg, setPlayerDmg] = useState<DmgState>(null)
  const [creatureDmg, setCreatureDmg] = useState<DmgState>(null)
  const [playerStatusEffects, setPlayerStatusEffects] = useState<ActiveStatusEffect[]>([])
  const [creatureStatusEffects, setCreatureStatusEffects] = useState<ActiveStatusEffect[]>([])
  const dmgKeyRef = useRef(0)
  const vfxKeyRef = useRef(0)
  const introPlayedRef = useRef(false)
  const bossBgmRef = useRef<HTMLAudioElement | null>(null)

  const playerAnim = getAttackAnimationConfig(player.styleId, player.animationFrames)
  const creatureAnim = getAttackAnimationConfig(creature.styleId, creature.animationFrames)
  const playerVariants = getMotionVariants(playerAnim, 'left')
  const creatureVariants = getMotionVariants(creatureAnim, 'right')

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

  const resolveStatusParticleUrl = useCallback((
    side: 'player' | 'creature',
    imageSource?: 'url' | 'weaponIcon' | 'weaponAnimation' | 'weaponProjectile' | 'weaponImpact',
    url?: string,
  ): string => {
    const source = imageSource ?? 'url'
    if (source === 'url') return url?.trim() ?? ''
    const weaponUrl = side === 'player' ? player.weaponUrl : creature.weaponUrl
    return weaponUrl?.trim() ?? ''
  }, [player.weaponUrl, creature.weaponUrl])

  const buildStatusParticleEntry = useCallback((
    side: 'player' | 'creature',
    particle: {
      url?: string
      soundUrl?: string
      imageSource?: 'url' | 'weaponIcon' | 'weaponAnimation' | 'weaponProjectile' | 'weaponImpact'
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

  const triggerStatusBurstForEvent = useCallback((event: CombatTurnEvent) => {
    if (!STATUS_BURST_EVENT_TYPES.has(event.type)) return
    const statusTemplateId =
      event.statusTemplateId
      ?? playerStatusEffects.find((status) => status.id === event.statusEffectId)?.templateId
      ?? creatureStatusEffects.find((status) => status.id === event.statusEffectId)?.templateId
    if (!statusTemplateId) return
    const side: 'player' | 'creature' | null =
      event.targetId === playerId ? 'player'
      : event.targetId === creatureId ? 'creature'
      : null
    if (!side) return

    const particles = statusAnimations?.[statusTemplateId]?.particles ?? []
    for (const particle of particles) {
      if (particle.loop) continue
      const built = buildStatusParticleEntry(side, particle, false)
      if (!built) continue
      const key = ++vfxKeyRef.current
      setActiveStatusBurstParticles(prev => [...prev, { ...built, key, loop: false }])
      const removeAfterMs = built.delayMs + built.lifetimeMs + 150
      setTimeout(() => {
        setActiveStatusBurstParticles(prev => prev.filter(p => p.key !== key))
      }, removeAfterMs)
    }
  }, [buildStatusParticleEntry, creatureId, creatureStatusEffects, playerId, playerStatusEffects, statusAnimations])

  const animateAttack = useCallback(async (
    attackerSide: 'player' | 'creature',
    events: CombatTurnEvent[],
    anim: AttackAnimationConfig,
  ) => {
    if (abortRef.current || events.length === 0) return
    const setAttackerVariant = attackerSide === 'player' ? setPlayerVariant : setCreatureVariant
    const setTargetImpact = attackerSide === 'player' ? setShowCreatureImpact : setShowPlayerImpact
    const setTargetVariant = attackerSide === 'player' ? setCreatureVariant : setPlayerVariant
    const frames = anim.frames
    const isRightSideAttacker = attackerSide === 'creature'

    // Step 1: Spend resource BEFORE the animation fires — standard gaming feel
    const hasResourceCost = events.some(ev => ev.type === 'resource_change' && ev.resourceAfter)
    if (hasResourceCost) {
      for (const ev of events) {
        if (ev.type === 'resource_change' && ev.resourceAfter) {
          const isPlayerSource = ev.sourceId === playerId
          if (isPlayerSource) setPlayerResourceCurrent(ev.resourceAfter.current)
          else setCreatureResourceCurrent(ev.resourceAfter.current)
        }
      }
      // Brief pause so the bar animation is visible before the ability fires
      await sleep(350)
      if (abortRef.current) return
    }

    // Step 2: Cast animation begins
    setAttackerVariant('cast')
    await sleep(160)

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
      await sleep(maxWeaponMs)
    }

    // Detect block events in this group
    const blockEvent = events.find(ev => ev.type === 'block' && ev.blocked)
    const isBlocked = !!blockEvent

    // --- Projectile frames ---
    const projFrames = frames?.projectile ?? []
    if (anim.projectile && projFrames.length > 0) {
      const srcRef = attackerSide === 'player' ? playerPortraitRef : creaturePortraitRef
      const tgtRef = attackerSide === 'player' ? creaturePortraitRef : playerPortraitRef
      const tgtPos = getPortraitPos(tgtRef)
      const weaponUrlFallback = attackerSide === 'player' ? player.weaponUrl : creature.weaponUrl
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

    if (abortRef.current) return

    // --- Block frames (shown at defender portrait center when blocked) ---
    if (isBlocked && blockEvent) {
      const defenderSide: 'player' | 'creature' = attackerSide === 'player' ? 'creature' : 'player'
      const isRightSideDefender = defenderSide === 'creature'
      const resolveBlockTiming = (f: AnimationBlockFrame) => {
        if (f.showMs != null && f.vanishMs != null) return { showMs: f.showMs, vanishMs: f.vanishMs }
        const lt = f.lifetimeMs ?? (f.showMs != null ? f.showMs + (f.vanishMs ?? 500) : 800)
        return { showMs: Math.floor(lt * 0.4), vanishMs: Math.ceil(lt * 0.6) }
      }
      const blockAnimFrames = (blockEvent.blockAnimationFrames?.block ?? []).filter(f => f.url?.trim())
      if (blockAnimFrames.length > 0) {
        blockAnimFrames.forEach(async (f) => {
          if (f.delayMs) await sleep(f.delayMs)
          const { showMs, vanishMs } = resolveBlockTiming(f)
          const entry: ActiveBlockFrameEntry = {
            key: ++vfxKeyRef.current,
            side: defenderSide,
            url: f.url!.trim(),
            soundUrl: f.soundUrl?.trim() || undefined,
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
        setPlayerDmg({ value: 0, type: 'block', key: dmgKeyRef.current, abilityName: 'Blocked!' })
      } else {
        setCreatureDmg({ value: 0, type: 'block', key: dmgKeyRef.current, abilityName: 'Blocked!' })
      }

      const maxBlockMs = blockAnimFrames.length > 0
        ? Math.max(...blockAnimFrames.map(f => {
            const { showMs, vanishMs } = resolveBlockTiming(f)
            return (f.delayMs ?? 0) + showMs + vanishMs
          }))
        : 600
      await sleep(maxBlockMs)

      setActiveBlockFrames([])
      setAttackerVariant('return')
      await sleep(280)
      setAttackerVariant('idle')
      setPlayerDmg(null)
      setCreatureDmg(null)
      return
    }

    // --- Impact frames ---
    const impactFrames = (frames?.impact ?? []).filter(f => f.url?.trim())
    const resolveImpactTiming = (f: typeof impactFrames[0]) => {
      if (f.showMs != null && f.vanishMs != null) return { showMs: f.showMs, vanishMs: f.vanishMs }
      const lt = f.lifetimeMs ?? (f.showMs != null ? f.showMs + (f.vanishMs ?? 500) : 600)
      return { showMs: Math.floor(lt * 0.15), vanishMs: Math.ceil(lt * 0.85) }
    }
    const maxImpactMs = impactFrames.length > 0
      ? Math.max(...impactFrames.map(f => {
          const { showMs, vanishMs } = resolveImpactTiming(f)
          return (f.delayMs ?? 0) + showMs + vanishMs
        }))
      : 350

    if (impactFrames.length > 0) {
      const isRightSideDefender = attackerSide === 'player'
      impactFrames.forEach(async (f) => {
        if (f.delayMs) await sleep(f.delayMs)
        const { showMs, vanishMs } = resolveImpactTiming(f)
        const entry: ActiveImpactFrame = {
          key: ++vfxKeyRef.current,
          side: attackerSide === 'player' ? 'creature' : 'player',
          url: f.url!.trim(),
          soundUrl: f.soundUrl?.trim() || undefined,
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

    for (const ev of events) triggerStatusBurstForEvent(ev)

    setTargetImpact(true)
    setTargetVariant('hit')
    for (const ev of targetEvents) {
      const isOnPlayer = ev.targetId === playerId
      dmgKeyRef.current++
      if (isOnPlayer) {
        setPlayerDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
        setPlayerHp(Math.max(0, ev.targetHpAfter))
      } else {
        setCreatureDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
        setCreatureHp(Math.max(0, ev.targetHpAfter))
      }
    }

    // Self-heals (lifesteal) shown 200ms after the hit for visual clarity
    if (selfHealEvents.length > 0) {
      sleep(200).then(() => {
        for (const ev of selfHealEvents) {
          const isOnPlayer = ev.targetId === playerId
          dmgKeyRef.current++
          if (isOnPlayer) {
            setPlayerDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
            setPlayerHp(Math.max(0, ev.targetHpAfter))
          } else {
            setCreatureDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
            setCreatureHp(Math.max(0, ev.targetHpAfter))
          }
        }
      })
    }

    await sleep(maxImpactMs)

    setActiveWeaponFrames([])
    setActiveImpactFrames([])
    setTargetImpact(false)
    setAttackerVariant('return')
    setTargetVariant('idle')
    await sleep(280)

    setAttackerVariant('idle')
    setPlayerDmg(null)
    setCreatureDmg(null)
  }, [playerId, player.weaponUrl, creature.weaponUrl, getPortraitPos, triggerStatusBurstForEvent])

  const animateAmbientEvents = useCallback(async (events: CombatTurnEvent[]) => {
    for (const ev of events) {
      if (abortRef.current) return

      if (ev.type === 'resource_change' && ev.resourceAfter) {
        const isPlayerSource = ev.sourceId === playerId
        if (isPlayerSource) setPlayerResourceCurrent(ev.resourceAfter.current)
        else setCreatureResourceCurrent(ev.resourceAfter.current)
      }

      triggerStatusBurstForEvent(ev)

      if (DAMAGE_NUMBER_EVENT_TYPES.has(ev.type)) {
        const isOnPlayer = ev.targetId === playerId
        dmgKeyRef.current++
        if (isOnPlayer) {
          setPlayerDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
          setPlayerHp(Math.max(0, ev.targetHpAfter))
        } else {
          setCreatureDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
          setCreatureHp(Math.max(0, ev.targetHpAfter))
        }
        await sleep(240)
        setPlayerDmg(null)
        setCreatureDmg(null)
      } else if (STATUS_BURST_EVENT_TYPES.has(ev.type)) {
        await sleep(180)
      }
    }
  }, [playerId, triggerStatusBurstForEvent])

  const playTurn = useCallback(async (turn: CombatResult['turns'][number]) => {
    const groups = groupCombatTurnEvents(turn.events)

    for (const group of groups) {
      if (abortRef.current) return
      if (group.kind === 'ambient') {
        await animateAmbientEvents(group.events)
        continue
      }
      if (group.events.every((event) => event.type === 'resource_change')) continue
      const sourceEvent = group.events.find((event) => event.type !== 'resource_change') ?? group.events[0]
      const attackerSide = sourceEvent.sourceId === playerId ? 'player' : 'creature'
      const groupAbilityId = group.events.find((event) => !!event.abilityId)?.abilityId
      const overrideFrames = groupAbilityId && abilityAnimations?.[groupAbilityId]
      const baseAnimation = attackerSide === 'player' ? playerAnim : creatureAnim
      const animationConfig = overrideFrames
        ? getAttackAnimationConfig(undefined, overrideFrames)
        : baseAnimation
      await animateAttack(attackerSide, group.events, animationConfig)
    }

    if (turn.activeStatusEffects) {
      const nextPlayer = turn.activeStatusEffects[playerId] ?? []
      const nextCreature = turn.activeStatusEffects[creatureId] ?? []
      setPlayerStatusEffects(nextPlayer)
      setCreatureStatusEffects(nextCreature)
      syncLoopStatusParticles(nextPlayer, nextCreature)
    }
    if (turn.resources) {
      if (turn.resources[playerId]) setPlayerResourceCurrent(turn.resources[playerId].current)
      if (turn.resources[creatureId]) setCreatureResourceCurrent(turn.resources[creatureId].current)
    }
  }, [
    abilityAnimations,
    animateAmbientEvents,
    animateAttack,
    creatureAnim,
    creatureId,
    playerAnim,
    playerId,
    syncLoopStatusParticles,
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

  useEffect(() => {
    if (introPlayedRef.current) return
    introPlayedRef.current = true
    const cleanups: Array<() => void> = []
    const playerIntro = playerIntroSoundUrl?.trim()
    const creatureIntro = creatureIntroSoundUrl?.trim()
    if (playerIntro) cleanups.push(playOneShotAudio(playerIntro))
    if (creatureIntro) cleanups.push(playOneShotAudio(creatureIntro, playerIntro ? 140 : 0))
    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [playerIntroSoundUrl, creatureIntroSoundUrl])

  useEffect(() => {
    if (bossBgmRef.current) {
      bossBgmRef.current.pause()
      bossBgmRef.current.src = ''
      bossBgmRef.current = null
    }
    const bgmUrl = bossBattleMusicUrl?.trim()
    if (!bgmUrl || done) return
    const audio = new Audio(bgmUrl)
    audio.loop = true
    audio.volume = 0.35
    bossBgmRef.current = audio
    audio.play().catch(() => undefined)
    return () => {
      audio.pause()
      audio.src = ''
      if (bossBgmRef.current === audio) bossBgmRef.current = null
    }
  }, [bossBattleMusicUrl, done])

  const handleSkip = () => {
    stopPlayback()
    if (bossBgmRef.current) {
      bossBgmRef.current.pause()
      bossBgmRef.current.src = ''
      bossBgmRef.current = null
    }
    setPlayerVariant('idle')
    setCreatureVariant('idle')
    setShowPlayerImpact(false)
    setShowCreatureImpact(false)
    setActiveWeaponFrames([])
    setActiveProjectiles([])
    setActiveImpactFrames([])
    setActiveBlockFrames([])
    setActiveStatusLoopParticles([])
    setActiveStatusBurstParticles([])
    setPlayerDmg(null)
    setCreatureDmg(null)

    let pHp = player.maxHp
    let cHp = creature.maxHp
    for (const turn of combat.turns) {
      for (const ev of turn.events) {
        if (ev.targetId === playerId) pHp = Math.max(0, ev.targetHpAfter)
        else cHp = Math.max(0, ev.targetHpAfter)
      }
    }
    setPlayerHp(pHp)
    setCreatureHp(cHp)
    // Jump resources to final state
    const lastTurn = combat.turns[combat.turns.length - 1]
    if (lastTurn?.resources) {
      const creatureId = combat.turns[0]?.events?.find(e => e.sourceId !== playerId)?.sourceId
        ?? combat.turns[0]?.events?.find(e => e.targetId !== playerId)?.targetId ?? ''
      if (lastTurn.resources[playerId]) setPlayerResourceCurrent(lastTurn.resources[playerId].current)
      if (lastTurn.resources[creatureId]) setCreatureResourceCurrent(lastTurn.resources[creatureId].current)
    }
    finishAtTurn(lastTurn?.turnIndex ?? 0)
  }

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
          variants={playerVariants}
          animate={playerVariant}
          style={{ flex: 1, maxWidth: CARD_MAX_WIDTH, position: 'relative' }}
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
                url={player.portraitUrl}
                weaponUrl={player.weaponUrl}
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
                <WeaponFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} fadeInMs={f.fadeInMs} lifetimeMs={f.lifetimeMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} endOffsetX={f.endOffsetX} endOffsetY={f.endOffsetY} acceleration={f.acceleration} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored={false} id={f.key} />
              ))}
              {showPlayerImpact && activeImpactFrames.filter(f => f.side === 'player').length > 0
                ? activeImpactFrames.filter(f => f.side === 'player').map(f => (
                  <ImpactFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} endOffsetX={f.endOffsetX} endOffsetY={f.endOffsetY} acceleration={f.acceleration} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored={false} id={f.key} />
                ))
                : (
                  <ImpactEffect
                    show={showPlayerImpact}
                    style={'generic' as const}
                    color={creatureAnim.impactColor}
                    id={`p-impact-${dmgKeyRef.current}`}
                  />
                )
              }
              <AnimatePresence>
                {playerDmg && (
                  <DamageNumber value={playerDmg.value} type={playerDmg.type} id={playerDmg.key} abilityName={playerDmg.abilityName} />
                )}
              </AnimatePresence>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: NAME_FONT_SIZE }}>{player.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: LEVEL_FONT_SIZE }}>Level {player.level}</Typography>
            </Box>
            <ReplayHpBar current={playerHp} max={player.maxHp} label="HP" fontSizePx={HP_FONT_SIZE} heightPx={HP_BAR_HEIGHT} radius={HP_BAR_RADIUS} />
            {player.resource && playerResourceCurrent !== null && (
              <ReplayResourceBar
                current={playerResourceCurrent}
                max={player.resource.max}
                label={player.resource.name}
                colorHex={player.resource.colorHex}
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
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: STAT_FONT_SIZE }}>{player[key]}</Typography>
                </Box>
              ))}
            </Box>
            {activeBlockFrames.filter(f => f.side === 'player').map(f => (
              <BlockFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} side="player" showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored={false} id={f.key} />
            ))}
          </Paper>
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
          variants={creatureVariants}
          animate={creatureVariant}
          style={{ flex: 1, maxWidth: CARD_MAX_WIDTH, position: 'relative' }}
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
                url={creature.portraitUrl}
                weaponUrl={creature.weaponUrl}
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
                <WeaponFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} fadeInMs={f.fadeInMs} lifetimeMs={f.lifetimeMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} endOffsetX={f.endOffsetX} endOffsetY={f.endOffsetY} acceleration={f.acceleration} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored id={f.key} />
              ))}
              {showCreatureImpact && activeImpactFrames.filter(f => f.side === 'creature').length > 0
                ? activeImpactFrames.filter(f => f.side === 'creature').map(f => (
                  <ImpactFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} endOffsetX={f.endOffsetX} endOffsetY={f.endOffsetY} acceleration={f.acceleration} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored id={f.key} />
                ))
                : (
                  <ImpactEffect
                    show={showCreatureImpact}
                    style={'generic' as const}
                    color={playerAnim.impactColor}
                    id={`c-impact-${dmgKeyRef.current}`}
                  />
                )
              }
              <AnimatePresence>
                {creatureDmg && (
                  <DamageNumber value={creatureDmg.value} type={creatureDmg.type} id={creatureDmg.key} abilityName={creatureDmg.abilityName} />
                )}
              </AnimatePresence>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: NAME_FONT_SIZE }}>{creature.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: LEVEL_FONT_SIZE }}>Level {creature.level}</Typography>
            </Box>
            <ReplayHpBar current={creatureHp} max={creature.maxHp} label="HP" fontSizePx={HP_FONT_SIZE} heightPx={HP_BAR_HEIGHT} radius={HP_BAR_RADIUS} />
            {creature.resource && creatureResourceCurrent !== null && (
              <ReplayResourceBar
                current={creatureResourceCurrent}
                max={creature.resource.max}
                label={creature.resource.name}
                colorHex={creature.resource.colorHex}
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
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: STAT_FONT_SIZE }}>{creature[key]}</Typography>
                </Box>
              ))}
            </Box>
            {activeBlockFrames.filter(f => f.side === 'creature').map(f => (
              <BlockFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} side="creature" showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored id={f.key} />
            ))}
          </Paper>
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
              onClick={onFinish}
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

