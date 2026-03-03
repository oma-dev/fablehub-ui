import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import type { ActiveStatusEffect, CombatEventType, CombatResult, CombatTurnEvent, IdleRpgGroup, IdleRpgPackV1, RaidReplayPayload, StatusAnimationParticle } from '@features/idle-rpg/api'
import type { IdleRpgGroupMember } from '@features/idle-rpg/api'
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

import dungeonBg from '../../../../../../assets/backgrounds/dungeon.png'

// Match CombatReplay layout and styling (same scale, card design, HpBar, Portrait)
const SCALE = 1.2
const PORTRAIT_SIZE = Math.round(380 * SCALE)
const PORTRAIT_BORDER_RADIUS = 3 * SCALE
const PORTRAIT_BORDER = Math.round(3 * SCALE)
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
const DAMAGE_NUMBER_EVENT_TYPES = new Set<CombatEventType>(['damage', 'heal', 'dot_tick', 'hot_tick', 'execute'])
const STATUS_BURST_EVENT_TYPES = new Set<CombatEventType>(['status_applied', 'dot_tick', 'hot_tick'])

function clampSoundVolume(volumePercent?: number | null): number {
  if (volumePercent == null || Number.isNaN(volumePercent)) return 1
  return Math.min(1, Math.max(0, volumePercent / 100))
}

function playOneShotAudio(url: string, volumePercent = 100): void {
  const audio = new Audio(url)
  audio.volume = clampSoundVolume(volumePercent)
  audio.play().catch(() => undefined)
}

const STAT_LABELS = [
  { key: 'ap', label: 'Attack' },
  { key: 'arm', label: 'Armor' },
] as const

/** Default animation for raid replay (no per-ability data stored). */
const DEFAULT_ANIM = getAttackAnimationConfig('melee_slash', null)

interface ActiveStatusParticleEntry {
  key: number
  side: 'party' | 'boss'
  url: string
  soundUrl?: string
  soundVolumePercent?: number
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

function getBossId(combat: CombatResult, partyOrder: string[]): string | null {
  const partySet = new Set(partyOrder)
  for (const id of Object.keys(combat.finalHp ?? {})) {
    if (!partySet.has(id)) return id
  }
  return null
}

interface Props {
  replay: RaidReplayPayload
  group: IdleRpgGroup | null
  pack: IdleRpgPackV1
  onDone: () => void
}

export default function RaidReplayView({ replay, group, pack, onDone }: Props) {
  const { combat, partyOrder, victory, partyMaxHp = {}, bossMaxHp = 0 } = replay
  const bossId = useMemo(() => getBossId(combat, partyOrder), [combat, partyOrder])
  const totalTurns = combat.turns?.length ?? 0
  const abortRef = useRef(false)
  const bossIntroPlayedRef = useRef(false)
  const lastFrontPartyIdRef = useRef<string | null>(null)
  const bossBgmRef = useRef<HTMLAudioElement | null>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const partyPortraitRef = useRef<HTMLDivElement>(null)
  const bossPortraitRef = useRef<HTMLDivElement>(null)

  const partyVariants = useMemo(() => getMotionVariants(DEFAULT_ANIM, 'left'), [])
  const bossVariants = useMemo(() => getMotionVariants(DEFAULT_ANIM, 'right'), [])

  const [combatantHp, setCombatantHp] = useState<Record<string, number>>(() => {
    const hp: Record<string, number> = {}
    for (const id of partyOrder) hp[id] = partyMaxHp[id] ?? 100
    if (bossId != null) hp[bossId] = bossMaxHp
    return hp
  })
  const [partyVariant, setPartyVariant] = useState('idle')
  const [bossVariant, setBossVariant] = useState('idle')
  const [showPartyImpact, setShowPartyImpact] = useState(false)
  const [showBossImpact, setShowBossImpact] = useState(false)
  const [showProjectile, setShowProjectile] = useState<'left-to-right' | 'right-to-left' | null>(null)
  const [projFrom, setProjFrom] = useState<ProjectilePos>({ x: 0, y: 0 })
  const [projTo, setProjTo] = useState<ProjectilePos>({ x: 0, y: 0 })
  const [projectileImageUrl, setProjectileImageUrl] = useState<string | null>(null)
  const [projectileSoundUrl, setProjectileSoundUrl] = useState<string | undefined>(undefined)
  const [projectileSoundVolumePercent, setProjectileSoundVolumePercent] = useState<number>(100)
  const [projectileMirrored, setProjectileMirrored] = useState(false)
  const [projectileAcceleration, setProjectileAcceleration] = useState(0)
  const [projectileRotationStart, setProjectileRotationStart] = useState(0)
  const [projectileRotationEnd, setProjectileRotationEnd] = useState(0)
  const [projectileDurationMs, setProjectileDurationMs] = useState<number | undefined>(undefined)
  const [partyDmg, setPartyDmg] = useState<{ value: number; type: CombatEventType; key: number; abilityName?: string } | null>(null)
  const [bossDmg, setBossDmg] = useState<{ value: number; type: CombatEventType; key: number; abilityName?: string } | null>(null)
  const dmgKeyRef = useRef(0)
  const vfxKeyRef = useRef(0)

  type ActiveWF = {
    key: number
    side: 'party' | 'boss'
    url: string
    soundUrl?: string
    soundVolumePercent?: number
    fadeInMs: number
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
  type ActiveIF = {
    key: number
    side: 'party' | 'boss'
    url: string
    soundUrl?: string
    soundVolumePercent?: number
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
  type ActiveBF = { key: number; side: 'party' | 'boss'; url: string; soundUrl?: string; soundVolumePercent?: number; showMs: number; vanishMs: number; sizePx?: number; startSizePx?: number; endSizePx?: number; offsetX: number; offsetY: number; rotationStart?: number; rotationEnd?: number }
  const [activeWeaponFrames, setActiveWeaponFrames] = useState<ActiveWF[]>([])
  const [activeImpactFrames, setActiveImpactFrames] = useState<ActiveIF[]>([])
  const [activeBlockFrames, setActiveBlockFrames] = useState<ActiveBF[]>([])
  const [activeStatusBurstParticles, setActiveStatusBurstParticles] = useState<ActiveStatusParticleEntry[]>([])
  const [statusEffectsById, setStatusEffectsById] = useState<Record<string, ActiveStatusEffect[]>>({})
  const bossCardRef = useRef<HTMLDivElement>(null)
  /** IDs of party members who just died; kept in the list until fade-out completes so we can animate. */
  const [justDiedIds, setJustDiedIds] = useState<string[]>([])

  const currentHp = combatantHp

  /** Party order for display: alive + currently dying (so we can animate death and then slide). */
  const displayPartyIds = useMemo(
    () => partyOrder.filter((id) => (currentHp[id] ?? 0) > 0 || justDiedIds.includes(id)),
    [partyOrder, currentHp, justDiedIds],
  )

  const bossLookupId = replay.bossCreatureId || bossId
  const boss = bossLookupId ? pack.creatures?.find((c) => c.id === bossLookupId) : null
  const bossReplayBackground = replay.bossBackgroundImageUrl ?? boss?.backgroundImageUrl
  const frontPartyId = useMemo(
    () => displayPartyIds.find((id) => !justDiedIds.includes(id)) ?? displayPartyIds[0] ?? null,
    [displayPartyIds, justDiedIds],
  )
  const frontPartyStatusEffects = frontPartyId ? (statusEffectsById[frontPartyId] ?? []) : []
  const bossStatusEffects = bossId ? (statusEffectsById[bossId] ?? []) : []
  const statusAnimationsByTemplateId = useMemo(() => {
    const map = new Map<string, { particles?: StatusAnimationParticle[] }>()
    for (const status of (pack.statusEffects ?? [])) {
      map.set(status.id, status.animation ?? {})
    }
    return map
  }, [pack.statusEffects])

  const partyMembersFallback = replay.partyMembers ?? []
  const getMember = (id: string): IdleRpgGroupMember | undefined =>
    group?.members?.find((m) => m.id === id)
    ?? partyMembersFallback.find((m) => m.id === id)
  const getMemberPortrait = (member: IdleRpgGroupMember | undefined): string | null =>
    member
      ? (member.portraitUrl?.trim() || (pack.classes?.find((c) => c.id === member.classId)?.iconUrl ?? null)) ?? null
      : null

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
    side: 'party' | 'boss',
    _holderId: string | null,
    particle: StatusAnimationParticle,
  ): string => {
    const source = particle.imageSource ?? 'url'
    if (source === 'url') return particle.url?.trim() ?? ''
    if (side === 'party') return ''
    return ''
  }, [])

  const buildStatusParticleEntry = useCallback((
    side: 'party' | 'boss',
    holderId: string | null,
    particle: StatusAnimationParticle,
    loop: boolean,
  ): Omit<ActiveStatusParticleEntry, 'key'> | null => {
    const url = resolveStatusParticleUrl(side, holderId, particle)
    if (!url) return null
    const isRightSide = side === 'boss'
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

  const loopStatusParticles = useMemo(() => {
    const entries: Array<Omit<ActiveStatusParticleEntry, 'key'>> = []
    for (const status of frontPartyStatusEffects) {
      const particles = statusAnimationsByTemplateId.get(status.templateId)?.particles ?? []
      for (const particle of particles) {
        if (!particle.loop) continue
        const entry = buildStatusParticleEntry('party', frontPartyId, particle, true)
        if (entry) entries.push(entry)
      }
    }
    for (const status of bossStatusEffects) {
      const particles = statusAnimationsByTemplateId.get(status.templateId)?.particles ?? []
      for (const particle of particles) {
        if (!particle.loop) continue
        const entry = buildStatusParticleEntry('boss', bossId ?? null, particle, true)
        if (entry) entries.push(entry)
      }
    }
    return entries
  }, [bossId, bossStatusEffects, buildStatusParticleEntry, frontPartyId, frontPartyStatusEffects, statusAnimationsByTemplateId])

  const triggerStatusBurstForEvent = useCallback((event: CombatTurnEvent) => {
    if (!STATUS_BURST_EVENT_TYPES.has(event.type)) return
    const statusTemplateId =
      event.statusTemplateId
      ?? Object.values(statusEffectsById).flat().find((status) => status.id === event.statusEffectId)?.templateId
    if (!statusTemplateId) return

    const side: 'party' | 'boss' | null =
      event.targetId === bossId ? 'boss'
      : partyOrder.includes(event.targetId) ? 'party'
      : null
    if (!side) return

    const holderId = side === 'party' ? event.targetId : bossId ?? null
    const particles = statusAnimationsByTemplateId.get(statusTemplateId)?.particles ?? []
    for (const particle of particles) {
      if (particle.loop) continue
      const built = buildStatusParticleEntry(side, holderId, particle, false)
      if (!built) continue
      const key = ++vfxKeyRef.current
      setActiveStatusBurstParticles(prev => [...prev, { ...built, key }])
      const removeAfterMs = built.delayMs + built.lifetimeMs + 150
      setTimeout(() => {
        setActiveStatusBurstParticles(prev => prev.filter(p => p.key !== key))
      }, removeAfterMs)
    }
  }, [bossId, buildStatusParticleEntry, partyOrder, statusAnimationsByTemplateId, statusEffectsById])

  const resolveAbilityAnim = useCallback((abilityId?: string): AttackAnimationConfig => {
    if (!abilityId) return DEFAULT_ANIM
    const ability = (pack.abilities ?? []).find(a => a.id === abilityId)
    if (!ability?.animationFrames) return DEFAULT_ANIM
    return getAttackAnimationConfig(undefined, ability.animationFrames)
  }, [pack.abilities])

  const animateAttack = useCallback(
    async (attackerSide: 'party' | 'boss', events: CombatTurnEvent[], anim: AttackAnimationConfig) => {
      if (abortRef.current || events.length === 0) return
      const setAttackerVariant = attackerSide === 'party' ? setPartyVariant : setBossVariant
      const setTargetImpact = attackerSide === 'party' ? setShowBossImpact : setShowPartyImpact
      const setTargetDmg = attackerSide === 'party' ? setBossDmg : setPartyDmg
      const setTargetVariant = attackerSide === 'party' ? setBossVariant : setPartyVariant
      const frames = anim.frames
      const isRightSideAttacker = attackerSide === 'boss'

      // Resource events first
      const hasResourceCost = events.some(ev => ev.type === 'resource_change' && ev.resourceAfter)
      if (hasResourceCost) {
        await sleep(350)
        if (abortRef.current) return
      }

      setAttackerVariant('cast')
      await sleep(160)

      // Detect block
      const blockEvent = events.find(ev => ev.type === 'block' && ev.blocked)
      const isBlocked = !!blockEvent

      // Weapon frames
      const weaponFrames = (frames?.weapon ?? []).filter(f => f.url?.trim())
      if (weaponFrames.length > 0) {
        const maxWeaponMs = Math.max(...weaponFrames.map(f => (f.delayMs ?? 0) + (f.fadeInMs ?? 200)))
        weaponFrames.forEach(async (f) => {
          if (f.delayMs) await sleep(f.delayMs)
          const entry: ActiveWF = {
            key: ++vfxKeyRef.current, side: attackerSide, url: f.url!.trim(), soundUrl: f.soundUrl?.trim() || undefined, soundVolumePercent: f.soundVolumePercent ?? 100,
            fadeInMs: f.fadeInMs ?? 200, lifetimeMs: f.lifetimeMs, sizePx: f.sizePx,
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

      // Projectile
      const dir: 'left-to-right' | 'right-to-left' = attackerSide === 'party' ? 'left-to-right' : 'right-to-left'
      const srcRef = attackerSide === 'party' ? partyPortraitRef : bossPortraitRef
      const tgtRef = attackerSide === 'party' ? bossPortraitRef : partyPortraitRef
      const defenderSide: 'party' | 'boss' = attackerSide === 'party' ? 'boss' : 'party'
      const tgtPos = getPortraitPos(tgtRef)

      const projFrames = frames?.projectile ?? []
      if (anim.projectile) {
        setProjectileMirrored(isRightSideAttacker)
        if (projFrames.length > 0) {
          const firstFrame = projFrames[0]
          setProjFrom(getPortraitPos(srcRef))
          setProjTo(tgtPos)
          setProjectileImageUrl(firstFrame.url?.trim() ?? null)
          setProjectileSoundUrl(firstFrame.soundUrl?.trim() || undefined)
          setProjectileSoundVolumePercent(firstFrame.soundVolumePercent ?? 100)
          setProjectileAcceleration(firstFrame.acceleration ?? 0)
          setProjectileRotationStart(isRightSideAttacker ? -(firstFrame.rotationStart ?? 0) : (firstFrame.rotationStart ?? 0))
          setProjectileRotationEnd(isRightSideAttacker ? -(firstFrame.rotationEnd ?? firstFrame.rotationStart ?? 0) : (firstFrame.rotationEnd ?? firstFrame.rotationStart ?? 0))
          const flightMs = firstFrame.lifetimeMs ?? firstFrame.speedMs ?? (anim.projectile === 'arc' ? PROJECTILE_SPEED * 1.25 : PROJECTILE_SPEED) * 1000 + 50
          setProjectileDurationMs(flightMs)
          setShowProjectile(dir)
          await sleep(flightMs)
          setShowProjectile(null)
        } else {
          setProjFrom(getPortraitPos(srcRef))
          setProjTo(tgtPos)
          setProjectileImageUrl(null)
          setProjectileSoundUrl(undefined)
          setProjectileSoundVolumePercent(100)
          setProjectileAcceleration(0)
          setProjectileRotationStart(0)
          setProjectileRotationEnd(0)
          setProjectileDurationMs(undefined)
          setShowProjectile(dir)
          const flightMs = (anim.projectile === 'arc' ? PROJECTILE_SPEED * 1.25 : PROJECTILE_SPEED) * 1000 + 50
          await sleep(flightMs)
          setShowProjectile(null)
        }
      }

      if (abortRef.current) return

      // Block handling
      if (isBlocked && blockEvent) {
        const isRightSideDefender = defenderSide === 'boss'
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
            setActiveBlockFrames(prev => [...prev, {
              key: ++vfxKeyRef.current, side: defenderSide, url: f.url!.trim(), soundUrl: f.soundUrl?.trim() || undefined, soundVolumePercent: f.soundVolumePercent ?? 100,
              showMs, vanishMs, sizePx: f.sizePx, startSizePx: f.startSizePx, endSizePx: f.endSizePx,
              offsetX: isRightSideDefender ? -(f.offsetX ?? 0) : (f.offsetX ?? 0),
              offsetY: f.offsetY ?? 0,
              rotationStart: isRightSideDefender ? -(f.rotationStart ?? 0) : (f.rotationStart ?? 0),
              rotationEnd: isRightSideDefender ? -(f.rotationEnd ?? f.rotationStart ?? 0) : (f.rotationEnd ?? f.rotationStart ?? 0),
            }])
          })
        }
        dmgKeyRef.current++
        setTargetDmg({ value: 0, type: 'block', key: dmgKeyRef.current, abilityName: 'Blocked!' })
        const maxBlockMs = blockAnimFrames.length > 0
          ? Math.max(...blockAnimFrames.map(f => { const t = resolveBlockTiming(f); return (f.delayMs ?? 0) + t.showMs + t.vanishMs }))
          : 600
        await sleep(maxBlockMs)
        setActiveBlockFrames([])
        setActiveWeaponFrames([])
        setAttackerVariant('return')
        await sleep(280)
        setAttackerVariant('idle')
        setTargetDmg(null)
        return
      }

      // Impact frames
      const impactFrames = (frames?.impact ?? []).filter(f => f.url?.trim())
      if (impactFrames.length > 0) {
        const isRightSideDefender = defenderSide === 'boss'
        const resolveImpactTiming = (f: typeof impactFrames[0]) => {
          if (f.showMs != null && f.vanishMs != null) return { showMs: f.showMs, vanishMs: f.vanishMs }
          const lt = f.lifetimeMs ?? (f.showMs != null ? f.showMs + (f.vanishMs ?? 500) : 600)
          return { showMs: Math.floor(lt * 0.15), vanishMs: Math.ceil(lt * 0.85) }
        }
        impactFrames.forEach(async (f) => {
          if (f.delayMs) await sleep(f.delayMs)
          const { showMs, vanishMs } = resolveImpactTiming(f)
          setActiveImpactFrames(prev => [...prev, {
            key: ++vfxKeyRef.current, side: defenderSide, url: f.url!.trim(), soundUrl: f.soundUrl?.trim() || undefined, soundVolumePercent: f.soundVolumePercent ?? 100,
            showMs, vanishMs, sizePx: f.sizePx, startSizePx: f.startSizePx, endSizePx: f.endSizePx,
            offsetX: isRightSideDefender ? -(f.offsetX ?? 0) : (f.offsetX ?? 0),
            offsetY: f.offsetY ?? 0,
            endOffsetX: isRightSideDefender ? -(f.endOffsetX ?? f.offsetX ?? 0) : (f.endOffsetX ?? f.offsetX ?? 0),
            endOffsetY: f.endOffsetY ?? f.offsetY ?? 0,
            acceleration: f.acceleration ?? 0,
            rotationStart: isRightSideDefender ? -(f.rotationStart ?? 0) : (f.rotationStart ?? 0),
            rotationEnd: isRightSideDefender ? -(f.rotationEnd ?? f.rotationStart ?? 0) : (f.rotationEnd ?? f.rotationStart ?? 0),
          }])
        })
      }

      setTargetImpact(true)
      setTargetVariant('hit')

      const combatEvents = events
        .filter(ev => ev.type !== 'resource_change' && ev.type !== 'block')
        .filter(ev => DAMAGE_NUMBER_EVENT_TYPES.has(ev.type))
      for (const ev of events) triggerStatusBurstForEvent(ev)
      for (const ev of combatEvents) {
        dmgKeyRef.current++
        const isOnBoss = ev.targetId === bossId
        if (isOnBoss) {
          setBossDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
        } else {
          setPartyDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
        }
        const targetHpAfter = Math.max(0, ev.targetHpAfter)
        setCombatantHp((prev) => ({ ...prev, [ev.targetId]: targetHpAfter }))
        if (targetHpAfter === 0 && partyOrder.includes(ev.targetId)) {
          setJustDiedIds((prev) => (prev.includes(ev.targetId) ? prev : [...prev, ev.targetId]))
        }
      }

      const maxImpactMs = impactFrames.length > 0
        ? Math.max(...impactFrames.map(f => {
            const t = (() => { if (f.showMs != null && f.vanishMs != null) return { showMs: f.showMs, vanishMs: f.vanishMs }; const lt = f.lifetimeMs ?? 600; return { showMs: Math.floor(lt * 0.15), vanishMs: Math.ceil(lt * 0.85) } })()
            return (f.delayMs ?? 0) + t.showMs + t.vanishMs
          }))
        : 350
      await sleep(maxImpactMs)

      setActiveWeaponFrames([])
      setActiveImpactFrames([])
      setTargetImpact(false)
      setAttackerVariant('return')
      setTargetVariant('idle')
      await sleep(280)

      setAttackerVariant('idle')
      setTargetDmg(null)
    },
    [getPortraitPos, bossId, partyOrder, triggerStatusBurstForEvent],
  )

  const animateAmbientEvents = useCallback(async (events: CombatTurnEvent[]) => {
    for (const ev of events) {
      if (abortRef.current) return
      triggerStatusBurstForEvent(ev)
      if (DAMAGE_NUMBER_EVENT_TYPES.has(ev.type)) {
        dmgKeyRef.current++
        const isOnBoss = ev.targetId === bossId
        if (isOnBoss) {
          setBossDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
        } else {
          setPartyDmg({ value: ev.value, type: ev.type, key: dmgKeyRef.current, abilityName: ev.abilityName })
        }
        setCombatantHp((prev) => ({ ...prev, [ev.targetId]: Math.max(0, ev.targetHpAfter) }))
        await sleep(240)
        setPartyDmg(null)
        setBossDmg(null)
      } else if (STATUS_BURST_EVENT_TYPES.has(ev.type)) {
        await sleep(180)
      }
    }
  }, [bossId, triggerStatusBurstForEvent])

  const playTurn = useCallback(async (turn: CombatResult['turns'][number]) => {
    const groups = groupCombatTurnEvents(turn.events as CombatTurnEvent[])

    for (const group of groups) {
      if (abortRef.current) return
      if (group.kind === 'ambient') {
        await animateAmbientEvents(group.events)
        continue
      }
      if (group.events.every((event) => event.type === 'resource_change')) continue
      const sourceEvent = group.events.find((event) => event.type !== 'resource_change') ?? group.events[0]
      const attackerSide = partyOrder.includes(sourceEvent.sourceId) ? 'party' : 'boss'
      const abilityId = group.events.find((event) => !!event.abilityId)?.abilityId
      const animationConfig = resolveAbilityAnim(abilityId)
      await animateAttack(attackerSide, group.events, animationConfig)
    }

    if (turn.activeStatusEffects) {
      setStatusEffectsById(turn.activeStatusEffects)
    }
  }, [animateAmbientEvents, animateAttack, partyOrder, resolveAbilityAnim])

  const {
    currentTurn,
    isFinished: finished,
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
    if (bossBgmRef.current) {
      bossBgmRef.current.pause()
      bossBgmRef.current.src = ''
      bossBgmRef.current = null
    }
    const bgmUrl = boss?.bossBattleMusicUrl?.trim()
    if (!bgmUrl) return
    const audio = new Audio(bgmUrl)
    audio.loop = true
    audio.volume = clampSoundVolume(boss?.bossBattleMusicVolumePercent ?? 100)
    bossBgmRef.current = audio
    audio.play().catch(() => undefined)
    return () => {
      audio.pause()
      audio.src = ''
      if (bossBgmRef.current === audio) bossBgmRef.current = null
    }
  }, [boss?.bossBattleMusicUrl, boss?.bossBattleMusicVolumePercent])

  useEffect(() => {
    if (finished || !boss || bossIntroPlayedRef.current) return
    const introUrl = boss.introSoundUrl?.trim()
    if (!introUrl) {
      bossIntroPlayedRef.current = true
      return
    }
    bossIntroPlayedRef.current = true
    playOneShotAudio(introUrl, boss.introSoundVolumePercent ?? 100)
  }, [boss, finished])

  useEffect(() => {
    if (finished) return
    const currentFrontId = frontPartyId ?? null
    if (!currentFrontId || currentFrontId === lastFrontPartyIdRef.current) return
    lastFrontPartyIdRef.current = currentFrontId
    const member = getMember(currentFrontId)
    const frontClass = pack.classes?.find((c) => c.id === member?.classId)
    const introUrl = frontClass?.introSoundUrl?.trim()
    if (introUrl) playOneShotAudio(introUrl, frontClass?.introSoundVolumePercent ?? 100)
  }, [finished, frontPartyId, group?.members, pack.classes])

  const handleSkip = () => {
    stopPlayback()
    setPartyVariant('idle')
    setBossVariant('idle')
    setShowPartyImpact(false)
    setShowBossImpact(false)
    setShowProjectile(null)
    setProjectileSoundUrl(undefined)
    setProjectileSoundVolumePercent(100)
    setProjectileMirrored(false)
    setProjectileAcceleration(0)
    setProjectileRotationStart(0)
    setProjectileRotationEnd(0)
    setPartyDmg(null)
    setBossDmg(null)
    setActiveWeaponFrames([])
    setActiveImpactFrames([])
    setActiveBlockFrames([])
    setActiveStatusBurstParticles([])
    setJustDiedIds([])
    const hp: Record<string, number> = {}
    for (const id of partyOrder) hp[id] = partyMaxHp[id] ?? 100
    if (bossId != null) hp[bossId] = bossMaxHp
    for (const turn of combat.turns ?? []) {
      for (const ev of turn.events as CombatTurnEvent[]) {
        hp[ev.targetId] = Math.max(0, ev.targetHpAfter)
      }
    }
    const lastTurn = combat.turns?.[combat.turns.length - 1]
    setStatusEffectsById(lastTurn?.activeStatusEffects ?? {})
    setCombatantHp(hp)
    finishAtTurn(lastTurn?.turnIndex ?? (combat.turns?.length ? combat.turns.length - 1 : 0))
  }

  const handleDone = () => {
    if (bossBgmRef.current) {
      bossBgmRef.current.pause()
      bossBgmRef.current.src = ''
      bossBgmRef.current = null
    }
    onDone()
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flex: 1,
        backgroundImage: bossReplayBackground
          ? `linear-gradient(rgba(12,10,20,0.35), rgba(12,10,20,0.35)), url(${bossReplayBackground})`
          : `url(${dungeonBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%', p: 2 }}>
        {currentTurn >= 0 && !finished && (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            fontWeight={600}
            sx={{ fontSize: TURN_FONT_SIZE }}
          >
            Turn {currentTurn + 1} / {totalTurns}
          </Typography>
        )}

        {/* Arena: same layout as CombatReplay — left = party (stacked), center = VS, right = boss */}
        <Box
          ref={arenaRef}
          sx={{
            display: 'flex',
            gap: 3,
            justifyContent: 'center',
            alignItems: 'flex-start',
            position: 'relative',
            flex: 1,
            minHeight: 0,
          }}
        >
          <AnimatePresence>
            {showProjectile && (
              <Projectile
                show
                color={DEFAULT_ANIM.impactColor}
                direction={showProjectile}
                id={`proj-${dmgKeyRef.current}`}
                weaponUrl={projectileImageUrl}
                soundUrl={projectileSoundUrl}
                soundVolumePercent={projectileSoundVolumePercent}
                mirrored={projectileMirrored}
                acceleration={projectileAcceleration}
                rotationStart={projectileRotationStart}
                rotationEnd={projectileRotationEnd}
                trajectory={DEFAULT_ANIM.projectile}
                durationMs={projectileDurationMs}
                from={projFrom}
                to={projTo}
              />
            )}
          </AnimatePresence>

          {/* Party stack: front = first alive, behind = smaller + offset; dying fades out, next slides in */}
          <Box
            sx={{
              flex: 1,
              maxWidth: CARD_MAX_WIDTH,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              minWidth: 320,
            }}
          >
            <AnimatePresence mode="popLayout">
              {displayPartyIds.map((id, idx) => {
                const member = getMember(id)
                const hp = currentHp[id] ?? 0
                const maxHp = partyMaxHp[id] ?? 100
                const isDying = justDiedIds.includes(id)
                const frontAliveIdx = displayPartyIds.findIndex((cid) => !justDiedIds.includes(cid))
                const isFront = frontAliveIdx >= 0 && idx === frontAliveIdx
                const scale = 1 - idx * 0.12
                const offsetX = idx * 128
                const offsetY = idx * 128
                const cardWidth = Math.round(CARD_MAX_WIDTH * scale)
                const portraitSize = Math.round(PORTRAIT_SIZE * scale)
                const paperSx = {
                  position: 'relative' as const,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column' as const,
                  alignItems: 'center',
                  gap: CARD_GAP,
                  p: CARD_PADDING,
                  pt: 0,
                  borderRadius: CARD_RADIUS,
                  bgcolor: '#14121f',
                  borderColor: 'rgba(99,102,241,0.45)',
                  boxShadow: '0 0 24px rgba(0,0,0,0.4), 0 0 20px rgba(99,102,241,0.12)',
                }
                const paperContent = (
                  <>
                    <Box ref={isFront ? partyPortraitRef : undefined} sx={{ position: 'relative' }}>
                      <ReplayPortrait
                        url={getMemberPortrait(member)}
                        sizePx={portraitSize}
                        personIconSizePx={PERSON_ICON_SIZE}
                        borderRadius={PORTRAIT_BORDER_RADIUS}
                        borderWidth={PORTRAIT_BORDER}
                      />
                      {isFront && (
                        <>
                          {loopStatusParticles.filter(p => p.side === 'party').map((p, idx) => (
                            <StatusParticleEffect
                              key={`party-loop-${idx}-${p.url}`}
                              id={`party-loop-${idx}-${p.url}`}
                              url={p.url}
                              soundUrl={p.soundUrl}
                              soundVolumePercent={p.soundVolumePercent}
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
                          {activeStatusBurstParticles.filter(p => p.side === 'party').map(p => (
                            <StatusParticleEffect
                              key={p.key}
                              id={p.key}
                              url={p.url}
                              soundUrl={p.soundUrl}
                              soundVolumePercent={p.soundVolumePercent}
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
                          {activeWeaponFrames.filter(f => f.side === 'party').map(f => (
                            <WeaponFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} soundVolumePercent={f.soundVolumePercent} fadeInMs={f.fadeInMs} lifetimeMs={f.lifetimeMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} endOffsetX={f.endOffsetX} endOffsetY={f.endOffsetY} acceleration={f.acceleration} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored={false} id={f.key} />
                          ))}
                          {showPartyImpact && activeImpactFrames.filter(f => f.side === 'party').length > 0
                            ? activeImpactFrames.filter(f => f.side === 'party').map(f => (
                              <ImpactFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} soundVolumePercent={f.soundVolumePercent} showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} endOffsetX={f.endOffsetX} endOffsetY={f.endOffsetY} acceleration={f.acceleration} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored={false} id={f.key} />
                            ))
                            : (
                              <ImpactEffect
                                show={showPartyImpact}
                                style="generic"
                                color={DEFAULT_ANIM.impactColor}
                                id={`party-impact-${dmgKeyRef.current}`}
                              />
                            )
                          }
                          <AnimatePresence>
                            {partyDmg && (
                              <DamageNumber value={partyDmg.value} type={partyDmg.type} id={partyDmg.key} abilityName={partyDmg.abilityName} />
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: NAME_FONT_SIZE }}>
                        {member?.name ?? id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: LEVEL_FONT_SIZE }}>
                        Level {member?.level ?? '?'}
                      </Typography>
                    </Box>
                    <ReplayHpBar current={hp} max={maxHp} label="HP" fontSizePx={HP_FONT_SIZE} heightPx={HP_BAR_HEIGHT} radius={HP_BAR_RADIUS} />
                    {(() => {
                      const memberCls = pack.classes?.find((c) => c.id === member?.classId)
                      const resDef = memberCls?.resourceId ? (pack.resources ?? []).find((r) => r.id === memberCls.resourceId) : null
                      if (!resDef) return null
                      const resCurrent = resDef.isGenerative ? 0 : resDef.max
                      return (
                        <ReplayResourceBar
                          current={resCurrent}
                          max={resDef.max}
                          label={resDef.name}
                          colorHex={resDef.colorHex}
                          fontSizePx={HP_FONT_SIZE}
                          heightPx={HP_BAR_HEIGHT}
                          radius={HP_BAR_RADIUS}
                        />
                      )
                    })()}
                    <ReplayStatusEffectIcons effects={statusEffectsById[id] ?? []} />
                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {STAT_LABELS.map(({ key, label }) => (
                        <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.75 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: STAT_FONT_SIZE }}>
                            {label}
                          </Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ fontSize: STAT_FONT_SIZE }}>
                            —
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                )
                return (
                  <motion.div
                    key={id}
                    initial={false}
                    animate={{
                      top: offsetY,
                      right: 40 + offsetX,
                      width: cardWidth,
                      opacity: isDying ? 0 : 1,
                    }}
                    transition={{
                      opacity: {
                        duration: isDying ? 0.6 : 0.25,
                        ...(isDying && { onComplete: () => setJustDiedIds((prev) => prev.filter((x) => x !== id)) }),
                      },
                      default: { type: 'spring', stiffness: 300, damping: 30 },
                    }}
                    style={{
                      position: 'absolute',
                      zIndex: displayPartyIds.length - idx,
                    }}
                  >
                    <Box>
                      {isFront ? (
                        <motion.div variants={partyVariants} animate={partyVariant}>
                          <Paper variant="outlined" sx={paperSx}>
                            {paperContent}
                          </Paper>
                        </motion.div>
                      ) : (
                        <Paper variant="outlined" sx={paperSx}>
                          {paperContent}
                        </Paper>
                      )}
                    </Box>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </Box>

          {/* Center: VS label (same as CombatReplay) */}
          <Box
            sx={{
              alignSelf: 'center',
              position: 'relative',
              width: VS_WIDTH,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
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

          {/* Boss card (same style as CombatReplay creature card) */}
          {bossId && boss && (
            <motion.div
              variants={bossVariants}
              animate={bossVariant}
              style={{ flex: 1, maxWidth: CARD_MAX_WIDTH, position: 'relative' }}
            >
              <Paper
                ref={bossCardRef}
                variant="outlined"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: CARD_GAP,
                  p: CARD_PADDING,
                  pt: 0,
                  borderRadius: CARD_RADIUS,
                  flex: 1,
                  maxWidth: CARD_MAX_WIDTH,
                  bgcolor: '#1a1414',
                  borderColor: 'rgba(239,68,68,0.4)',
                  boxShadow: '0 0 24px rgba(0,0,0,0.4), 0 0 20px rgba(239,68,68,0.1)',
                  position: 'relative', overflow: 'visible',
                }}
              >
                <Box ref={bossPortraitRef} sx={{ position: 'relative' }}>
                  <ReplayPortrait
                    url={boss.iconUrl ?? undefined}
                    sizePx={PORTRAIT_SIZE}
                    personIconSizePx={PERSON_ICON_SIZE}
                    borderRadius={PORTRAIT_BORDER_RADIUS}
                    borderWidth={PORTRAIT_BORDER}
                  />
                  {loopStatusParticles.filter(p => p.side === 'boss').map((p, idx) => (
                    <StatusParticleEffect
                      key={`boss-loop-${idx}-${p.url}`}
                      id={`boss-loop-${idx}-${p.url}`}
                      url={p.url}
                      soundUrl={p.soundUrl}
                      soundVolumePercent={p.soundVolumePercent}
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
                  {activeStatusBurstParticles.filter(p => p.side === 'boss').map(p => (
                    <StatusParticleEffect
                      key={p.key}
                      id={p.key}
                      url={p.url}
                      soundUrl={p.soundUrl}
                      soundVolumePercent={p.soundVolumePercent}
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
                  {activeWeaponFrames.filter(f => f.side === 'boss').map(f => (
                    <WeaponFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} soundVolumePercent={f.soundVolumePercent} fadeInMs={f.fadeInMs} lifetimeMs={f.lifetimeMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} endOffsetX={f.endOffsetX} endOffsetY={f.endOffsetY} acceleration={f.acceleration} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored id={f.key} />
                  ))}
                  {showBossImpact && activeImpactFrames.filter(f => f.side === 'boss').length > 0
                    ? activeImpactFrames.filter(f => f.side === 'boss').map(f => (
                      <ImpactFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} soundVolumePercent={f.soundVolumePercent} showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} endOffsetX={f.endOffsetX} endOffsetY={f.endOffsetY} acceleration={f.acceleration} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored id={f.key} />
                    ))
                    : (
                      <ImpactEffect
                        show={showBossImpact}
                        style="generic"
                        color={DEFAULT_ANIM.impactColor}
                        id={`boss-impact-${dmgKeyRef.current}`}
                      />
                    )
                  }
                  <AnimatePresence>
                    {bossDmg && (
                      <DamageNumber value={bossDmg.value} type={bossDmg.type} id={bossDmg.key} abilityName={bossDmg.abilityName} />
                    )}
                  </AnimatePresence>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2} sx={{ fontSize: NAME_FONT_SIZE }}>
                    {boss.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: LEVEL_FONT_SIZE }}>
                    Level {boss.level}
                  </Typography>
                </Box>
                <ReplayHpBar current={currentHp[bossId] ?? 0} max={bossMaxHp} label="HP" fontSizePx={HP_FONT_SIZE} heightPx={HP_BAR_HEIGHT} radius={HP_BAR_RADIUS} />
                {(() => {
                  const bossResDef = boss.resourceId ? (pack.resources ?? []).find((r) => r.id === boss.resourceId) : null
                  if (!bossResDef) return null
                  const resCurrent = bossResDef.isGenerative ? 0 : bossResDef.max
                  return (
                    <ReplayResourceBar
                      current={resCurrent}
                      max={bossResDef.max}
                      label={bossResDef.name}
                      colorHex={bossResDef.colorHex}
                      fontSizePx={HP_FONT_SIZE}
                      heightPx={HP_BAR_HEIGHT}
                      radius={HP_BAR_RADIUS}
                    />
                  )
                })()}
                <ReplayStatusEffectIcons effects={bossStatusEffects} />
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {STAT_LABELS.map(({ key, label }) => (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', px: 0.75 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: STAT_FONT_SIZE }}>
                        {label}
                      </Typography>
                      <Typography variant="body2" fontWeight={700} sx={{ fontSize: STAT_FONT_SIZE }}>
                        {boss[key]}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                {activeBlockFrames.filter(f => f.side === 'boss').map(f => (
                  <BlockFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} soundVolumePercent={f.soundVolumePercent} side="creature" showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored id={f.key} />
                ))}
              </Paper>
            </motion.div>
          )}
        </Box>

        {!finished && (
          <Box sx={{ textAlign: 'center' }}>
            <Button variant="outlined" size="medium" onClick={handleSkip} color="primary">
              Skip
            </Button>
          </Box>
        )}

        {/* Result (same as CombatReplay) */}
        {finished && (
          <Box sx={{ textAlign: 'center', paddingBottom: 12 }}>
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
              onClick={handleDone}
              size="large"
              sx={{ px: 5, py: 1.5, fontSize: BUTTON_FONT_SIZE }}
            >
              Done
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}

