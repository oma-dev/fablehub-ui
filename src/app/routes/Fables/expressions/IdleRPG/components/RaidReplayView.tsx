import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import PersonIcon from '@mui/icons-material/Person'
import type { CombatEventType, CombatResult, CombatTurnEvent, IdleRpgGroup, IdleRpgPackV1, RaidReplayPayload } from '../../../../../../services/api'
import type { IdleRpgGroupMember } from '../../../../../../services/api'
import { getAttackAnimationConfig, type AttackAnimationConfig, type AnimationBlockFrame } from './vfx/animationConfig'
import BlockFrame from './vfx/BlockFrame'
import DamageNumber from './vfx/DamageNumber'
import ImpactEffect from './vfx/ImpactEffect'
import ImpactFrame from './vfx/ImpactFrame'
import Projectile, { PROJECTILE_SPEED, type ProjectilePos } from './vfx/Projectile'
import WeaponFrame from './vfx/WeaponFrame'

import charBackground from '../../../../../../assets/backgrounds/charBackground.png'
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

const STAT_LABELS = [
  { key: 'ap', label: 'Attack' },
  { key: 'arm', label: 'Armor' },
] as const

/** Default animation for raid replay (no per-ability data stored). */
const DEFAULT_ANIM = getAttackAnimationConfig('melee_slash', null)

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

function RaidPortrait({ url, size }: { url?: string | null; size: number }) {
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: PORTRAIT_BORDER_RADIUS,
          overflow: 'hidden',
          bgcolor: '#14121f',
          backgroundImage: `url(${charBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `${PORTRAIT_BORDER}px solid rgba(168,85,247,0.35)`,
          boxShadow: '0 0 36px rgba(168,85,247,0.2), inset 0 0 24px rgba(0,0,0,0.3)',
        }}
      >
        {url ? (
          <Box component="img" src={url} alt="portrait" sx={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.6)) drop-shadow(0 0 20px rgba(168,85,247,0.3))' }} />
        ) : (
          <PersonIcon sx={{ fontSize: PERSON_ICON_SIZE, color: 'rgba(168,85,247,0.25)' }} />
        )}
      </Box>
    </Box>
  )
}

function RaidHpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const grad =
    pct > 50
      ? 'linear-gradient(90deg, #4ade80, #22c55e)'
      : pct > 25
        ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
        : 'linear-gradient(90deg, #f87171, #ef4444)'
  const glowColor =
    pct > 50 ? 'rgba(34,197,94,0.3)' : pct > 25 ? 'rgba(251,191,36,0.3)' : 'rgba(239,68,68,0.3)'
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: HP_FONT_SIZE }}>
          HP
        </Typography>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: HP_FONT_SIZE }}>
          {current} / {max}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: HP_BAR_HEIGHT,
          borderRadius: HP_BAR_RADIUS,
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(168,85,247,0.1)',
          transition: 'none',
          '& .MuiLinearProgress-bar': {
            transition: 'transform 0.4s ease-out',
            borderRadius: HP_BAR_RADIUS,
            background: grad,
            boxShadow: `0 0 10px ${glowColor}`,
          },
        }}
      />
    </Box>
  )
}

function RaidResourceBar({ current, max, name, colorHex }: { current: number; max: number; name: string; colorHex: string }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const color = colorHex.startsWith('#') ? colorHex : `#${colorHex}`
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: HP_FONT_SIZE, color }}>{name}</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: HP_FONT_SIZE }}>{current} / {max}</Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: HP_BAR_HEIGHT,
          borderRadius: HP_BAR_RADIUS,
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'none',
          '& .MuiLinearProgress-bar': {
            transition: 'transform 0.4s ease-out',
            borderRadius: HP_BAR_RADIUS,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 10px ${color}55`,
          },
        }}
      />
    </Box>
  )
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
  const [currentTurn, setCurrentTurn] = useState(-1)
  const [finished, setFinished] = useState(false)
  const [partyVariant, setPartyVariant] = useState('idle')
  const [bossVariant, setBossVariant] = useState('idle')
  const [showPartyImpact, setShowPartyImpact] = useState(false)
  const [showBossImpact, setShowBossImpact] = useState(false)
  const [showProjectile, setShowProjectile] = useState<'left-to-right' | 'right-to-left' | null>(null)
  const [projFrom, setProjFrom] = useState<ProjectilePos>({ x: 0, y: 0 })
  const [projTo, setProjTo] = useState<ProjectilePos>({ x: 0, y: 0 })
  const [projectileImageUrl, setProjectileImageUrl] = useState<string | null>(null)
  const [projectileDurationMs, setProjectileDurationMs] = useState<number | undefined>(undefined)
  const [partyDmg, setPartyDmg] = useState<{ value: number; type: CombatEventType; key: number; abilityName?: string } | null>(null)
  const [bossDmg, setBossDmg] = useState<{ value: number; type: CombatEventType; key: number; abilityName?: string } | null>(null)
  const dmgKeyRef = useRef(0)
  const vfxKeyRef = useRef(0)

  type ActiveWF = { key: number; side: 'party' | 'boss'; url: string; fadeInMs: number; lifetimeMs?: number; sizePx?: number; startSizePx?: number; endSizePx?: number; offsetX: number; offsetY: number }
  type ActiveIF = { key: number; side: 'party' | 'boss'; url: string; showMs: number; vanishMs: number; sizePx?: number; startSizePx?: number; endSizePx?: number; offsetX: number; offsetY: number }
  type ActiveBF = { key: number; side: 'party' | 'boss'; url: string; showMs: number; vanishMs: number; sizePx?: number; startSizePx?: number; endSizePx?: number; offsetX: number; offsetY: number }
  const [activeWeaponFrames, setActiveWeaponFrames] = useState<ActiveWF[]>([])
  const [activeImpactFrames, setActiveImpactFrames] = useState<ActiveIF[]>([])
  const [activeBlockFrames, setActiveBlockFrames] = useState<ActiveBF[]>([])
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

  const getMember = (id: string): IdleRpgGroupMember | undefined =>
    group?.members?.find((m) => m.id === id)
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
            key: ++vfxKeyRef.current, side: attackerSide, url: f.url!.trim(),
            fadeInMs: f.fadeInMs ?? 200, lifetimeMs: f.lifetimeMs, sizePx: f.sizePx,
            startSizePx: f.startSizePx, endSizePx: f.endSizePx, offsetX: f.offsetX ?? 0, offsetY: f.offsetY ?? 0,
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
        if (projFrames.length > 0) {
          const firstFrame = projFrames[0]
          setProjFrom(getPortraitPos(srcRef))
          setProjTo(tgtPos)
          setProjectileImageUrl(firstFrame.url?.trim() ?? null)
          const flightMs = firstFrame.lifetimeMs ?? firstFrame.speedMs ?? (anim.projectile === 'arc' ? PROJECTILE_SPEED * 1.25 : PROJECTILE_SPEED) * 1000 + 50
          setProjectileDurationMs(flightMs)
          setShowProjectile(dir)
          await sleep(flightMs)
          setShowProjectile(null)
        } else {
          setProjFrom(getPortraitPos(srcRef))
          setProjTo(tgtPos)
          setProjectileImageUrl(null)
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
              key: ++vfxKeyRef.current, side: defenderSide, url: f.url!.trim(),
              showMs, vanishMs, sizePx: f.sizePx, startSizePx: f.startSizePx, endSizePx: f.endSizePx,
              offsetX: f.offsetX ?? 0, offsetY: f.offsetY ?? 0,
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
        const resolveImpactTiming = (f: typeof impactFrames[0]) => {
          if (f.showMs != null && f.vanishMs != null) return { showMs: f.showMs, vanishMs: f.vanishMs }
          const lt = f.lifetimeMs ?? (f.showMs != null ? f.showMs + (f.vanishMs ?? 500) : 600)
          return { showMs: Math.floor(lt * 0.15), vanishMs: Math.ceil(lt * 0.85) }
        }
        impactFrames.forEach(async (f) => {
          if (f.delayMs) await sleep(f.delayMs)
          const { showMs, vanishMs } = resolveImpactTiming(f)
          setActiveImpactFrames(prev => [...prev, {
            key: ++vfxKeyRef.current, side: defenderSide, url: f.url!.trim(),
            showMs, vanishMs, sizePx: f.sizePx, startSizePx: f.startSizePx, endSizePx: f.endSizePx,
            offsetX: f.offsetX ?? 0, offsetY: f.offsetY ?? 0,
          }])
        })
      }

      setTargetImpact(true)
      setTargetVariant('hit')

      const combatEvents = events.filter(ev => ev.type !== 'resource_change' && ev.type !== 'block')
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
    [getPortraitPos, bossId, partyOrder, resolveAbilityAnim],
  )

  useEffect(() => {
    if (totalTurns === 0) {
      setFinished(true)
      return
    }
    abortRef.current = false
    const playTurns = async () => {
      await sleep(600)
      for (let i = 0; i < combat.turns.length; i++) {
        if (abortRef.current) return
        const turn = combat.turns[i]
        setCurrentTurn(turn.turnIndex ?? i)
        const groups: CombatTurnEvent[][] = []
        for (const ev of turn.events as CombatTurnEvent[]) {
          const prev = groups[groups.length - 1]
          if (ev.type === 'block' && prev && prev.length > 0) {
            prev.push(ev)
          } else if (prev && prev[0].sourceId === ev.sourceId && ev.abilityId && prev[0].abilityId === ev.abilityId) {
            prev.push(ev)
          } else {
            groups.push([ev])
          }
        }
        for (const grp of groups) {
          if (abortRef.current) return
          if (grp.every(ev => ev.type === 'resource_change')) continue
          const attackerSide = partyOrder.includes(grp[0].sourceId) ? 'party' : 'boss'
          const anim = resolveAbilityAnim(grp[0].abilityId)
          await animateAttack(attackerSide, grp, anim)
        }
        if (!abortRef.current) await sleep(300)
      }
      if (!abortRef.current) setFinished(true)
    }
    playTurns()
    return () => {
      abortRef.current = true
    }
  }, [combat.turns, totalTurns, partyOrder, animateAttack, resolveAbilityAnim])

  const handleSkip = () => {
    abortRef.current = true
    setPartyVariant('idle')
    setBossVariant('idle')
    setShowPartyImpact(false)
    setShowBossImpact(false)
    setShowProjectile(null)
    setPartyDmg(null)
    setBossDmg(null)
    setActiveWeaponFrames([])
    setActiveImpactFrames([])
    setActiveBlockFrames([])
    setJustDiedIds([])
    const hp: Record<string, number> = {}
    for (const id of partyOrder) hp[id] = partyMaxHp[id] ?? 100
    if (bossId != null) hp[bossId] = bossMaxHp
    for (const turn of combat.turns ?? []) {
      for (const ev of turn.events as CombatTurnEvent[]) {
        hp[ev.targetId] = Math.max(0, ev.targetHpAfter)
      }
    }
    setCombatantHp(hp)
    setCurrentTurn(combat.turns?.length ? combat.turns.length - 1 : 0)
    setFinished(true)
  }

  const handleDone = () => {
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
                      <RaidPortrait url={getMemberPortrait(member)} size={portraitSize} />
                      {isFront && (
                        <>
                          {activeWeaponFrames.filter(f => f.side === 'party').map(f => (
                            <WeaponFrame key={f.key} show url={f.url} fadeInMs={f.fadeInMs} lifetimeMs={f.lifetimeMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} id={f.key} />
                          ))}
                          {showPartyImpact && activeImpactFrames.filter(f => f.side === 'party').length > 0
                            ? activeImpactFrames.filter(f => f.side === 'party').map(f => (
                              <ImpactFrame key={f.key} show url={f.url} showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} id={f.key} />
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
                    <RaidHpBar current={hp} max={maxHp} />
                    {(() => {
                      const memberCls = pack.classes?.find((c) => c.id === member?.classId)
                      const resDef = memberCls?.resourceId ? (pack.resources ?? []).find((r) => r.id === memberCls.resourceId) : null
                      if (!resDef) return null
                      const resCurrent = resDef.isGenerative ? 0 : resDef.max
                      return <RaidResourceBar current={resCurrent} max={resDef.max} name={resDef.name} colorHex={resDef.colorHex} />
                    })()}
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
                  <RaidPortrait url={boss.iconUrl ?? undefined} size={PORTRAIT_SIZE} />
                  {activeWeaponFrames.filter(f => f.side === 'boss').map(f => (
                    <WeaponFrame key={f.key} show url={f.url} fadeInMs={f.fadeInMs} lifetimeMs={f.lifetimeMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} id={f.key} />
                  ))}
                  {showBossImpact && activeImpactFrames.filter(f => f.side === 'boss').length > 0
                    ? activeImpactFrames.filter(f => f.side === 'boss').map(f => (
                      <ImpactFrame key={f.key} show url={f.url} showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} id={f.key} />
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
                <RaidHpBar current={currentHp[bossId] ?? 0} max={bossMaxHp} />
                {(() => {
                  const bossResDef = boss.resourceId ? (pack.resources ?? []).find((r) => r.id === boss.resourceId) : null
                  if (!bossResDef) return null
                  const resCurrent = bossResDef.isGenerative ? 0 : bossResDef.max
                  return <RaidResourceBar current={resCurrent} max={bossResDef.max} name={bossResDef.name} colorHex={bossResDef.colorHex} />
                })()}
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
                  <BlockFrame key={f.key} show url={f.url} side="creature" showMs={f.showMs} vanishMs={f.vanishMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} id={f.key} />
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
