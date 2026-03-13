import { useCallback, useEffect, useRef, useState, forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import PersonIcon from '@mui/icons-material/Person'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import TextField from '@mui/material/TextField'
import {
  STYLE_IDS,
  getAttackAnimationConfig,
  type AttackAnimationConfig,
  type ImpactStyle,
  type AnimationFrameImageSource,
} from '../../routes/Fables/expressions/IdleRPG/components/vfx/animationConfig'
import BlockFrame from '../../routes/Fables/expressions/IdleRPG/components/vfx/BlockFrame'
import DamageNumber from '../../routes/Fables/expressions/IdleRPG/components/vfx/DamageNumber'
import ImpactEffect from '../../routes/Fables/expressions/IdleRPG/components/vfx/ImpactEffect'
import ImpactFrame from '../../routes/Fables/expressions/IdleRPG/components/vfx/ImpactFrame'
import Projectile, { PROJECTILE_SPEED, type ProjectilePos } from '../../routes/Fables/expressions/IdleRPG/components/vfx/Projectile'
import StatusParticleEffect from '../../routes/Fables/expressions/IdleRPG/components/vfx/StatusParticleEffect'
import WeaponFrame from '../../routes/Fables/expressions/IdleRPG/components/vfx/WeaponFrame'
import AbilityAnimationEditor, {
  type AbilityAnimFrames as SharedAbilityAnimFrames,
  emptyAnimFrames as createEmptyAnimFrames,
  hydrateAnimFrames as hydrateSharedAnimFrames,
  buildAnimationFrames as buildSharedAnimationFrames,
} from '../../routes/Fables/expressions/IdleRPG/components/AbilityAnimationEditor'
import EffectsEditor, {
  type EffectFormRow,
  createEmptyEffectRow,
  hydrateEffectRows,
  buildEffectPayload,
} from '../../routes/Fables/expressions/IdleRPG/components/EffectsEditor'
import StatusAnimationEditor, {
  type StatusParticleForm,
  createEmptyStatusParticle,
} from '../../routes/Fables/expressions/IdleRPG/components/StatusAnimationEditor'
import SoundUploadButton from '../../routes/Fables/expressions/IdleRPG/components/SoundUploadButton'
import { getFables, getIdleRpgRealm, getIdleRpgRealms, updateIdleRpgRealm } from '@features/idle-rpg/api'
import type { Ability, DerivedStatId, DerivedStatModifier, Fable, IdleRpgPackV1, IdleRpgRealm } from '@features/idle-rpg/api'
import charBackground from '../../../assets/backgrounds/charBackground.png'

const styleIds = [...STYLE_IDS]
const ALL_IMPACT_STYLES: ImpactStyle[] = ['slash', 'punch', 'flail', 'arrow', 'bolt', 'generic']
const REACTIVE_TRIGGER_TIMINGS = ['on_incoming_cast', 'on_hit_taken'] as const
const DEFAULT_MAIN_STAT_IDS = ['STR', 'DEX', 'INT', 'LCK']
const DERIVED_STATS: Array<{ id: DerivedStatId; label: string }> = [
  { id: 'max_resource_amount', label: 'Maximum Resource Amount' },
  { id: 'resource_regeneration', label: 'Resource Regeneration / Turn' },
  { id: 'max_hp', label: 'Max HP Bonus' },
  { id: 'hp_regeneration', label: 'HP Regeneration / Turn' },
  { id: 'avoid_chance', label: 'Avoid Chance (%)' },
  { id: 'damage_resistance', label: 'Damage Resistance (%)' },
  { id: 'critical_hit_chance', label: 'Critical Hit Chance (%)' },
  { id: 'critical_hit_damage', label: 'Critical Hit Damage (%)' },
  { id: 'cooldown_reduction', label: 'Cooldown Reduction (%)' },
]

// --- Mirror CombatReplay layout constants for accurate previewing ---
const SCALE = 1.2
const PORTRAIT_SIZE = Math.round(380 * SCALE)
const PORTRAIT_BORDER_RADIUS = 3 * SCALE
const PORTRAIT_BORDER = Math.round(3 * SCALE)
const PERSON_ICON_SIZE = Math.round(100 * SCALE)
const NAME_FONT_SIZE = `${1.1 * SCALE}rem`
const CARD_GAP = 1.5 * SCALE
const CARD_PADDING = 2.5 * SCALE
const CARD_RADIUS = 3 * SCALE
const CARD_MAX_WIDTH = Math.round(380 * SCALE)
const VS_WIDTH = Math.round(70 * SCALE)
const ARENA_CARD_GAP = 20
const CARD_LUNGE_DURATION_MS = 260
const CARD_RETURN_DURATION_MS = 240

type CardMotionEase = 'linear' | [number, number, number, number]
type CardMotionTransition = { type: 'tween'; duration: number; ease: CardMotionEase }

const DEFAULT_CARD_MOTION_TRANSITION: CardMotionTransition = {
  type: 'tween',
  duration: CARD_RETURN_DURATION_MS / 1000,
  ease: [0.42, 0.0, 0.58, 1.0],
}

type DerivedModifierForm = {
  statId: DerivedStatId
  flat: string
  percent: string
}

function emptyDerivedModifier(): DerivedModifierForm {
  return { statId: 'max_hp', flat: '', percent: '' }
}

function hydrateDerivedModifiers(mods: DerivedStatModifier[] | undefined): DerivedModifierForm[] {
  return (mods ?? []).map((mod) => ({
    statId: mod.statId,
    flat: mod.flat != null ? String(mod.flat) : '',
    percent: mod.percent != null ? String(mod.percent) : '',
  }))
}

function buildDerivedModifiers(rows: DerivedModifierForm[]): DerivedStatModifier[] {
  return rows
    .map((row) => {
      const out: DerivedStatModifier = { statId: row.statId }
      if (row.flat.trim() !== '' && !Number.isNaN(Number(row.flat))) out.flat = Number(row.flat)
      if (row.percent.trim() !== '' && !Number.isNaN(Number(row.percent))) out.percent = Number(row.percent)
      return out
    })
    .filter((row) => row.flat != null || row.percent != null)
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
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
const IMAGE_SOURCE_OPTIONS: { value: AnimationFrameImageSource; label: string }[] = [
  { value: 'url', label: 'Custom URL' },
  { value: 'weaponIcon', label: 'Weapon icon' },
  { value: 'weaponAnimation', label: 'Weapon animation' },
  { value: 'weaponProjectile', label: 'Weapon projectile' },
  { value: 'weaponImpact', label: 'Weapon impact' },
]

// --- Frame form types ---
interface WeaponFrameForm {
  enabled: boolean
  imageSource: AnimationFrameImageSource
  url: string
  soundUrl: string
  delayMs: number
  fadeInMs: number
  lifetimeMs: number
  startSizePx: number
  endSizePx: number
  offsetX: number
  offsetY: number
  endOffsetX: number
  endOffsetY: number
  acceleration: number
  rotationStart: number
  rotationEnd: number
}
interface ProjectileFrameForm {
  enabled: boolean
  imageSource: AnimationFrameImageSource
  url: string
  soundUrl: string
  delayMs: number
  /** Lifetime / flight duration in ms */
  lifetimeMs: number
  trajectory: 'straight' | 'arc'
  startSizePx: number
  endSizePx: number
  offsetX: number
  offsetY: number
  acceleration: number
  rotationStart: number
  rotationEnd: number
}
interface ImpactFrameForm {
  enabled: boolean
  imageSource: AnimationFrameImageSource
  url: string
  soundUrl: string
  delayMs: number
  showMs: number
  vanishMs: number
  /** Shorthand total lifetime; overrides showMs+vanishMs when the other two aren't touched */
  lifetimeMs: number
  startSizePx: number
  endSizePx: number
  offsetX: number
  offsetY: number
  endOffsetX: number
  endOffsetY: number
  acceleration: number
  rotationStart: number
  rotationEnd: number
}

const defaultWeaponFrame = (): WeaponFrameForm => ({
  enabled: false,
  imageSource: 'url',
  url: 'https://bg3.wiki/w/images/0/0f/Quarterstaff_Unfaded.png',
  soundUrl: '',
  delayMs: 0,
  fadeInMs: 200,
  lifetimeMs: 0,   // 0 = stay until sequence ends
  startSizePx: 80,
  endSizePx: 120,
  offsetX: 0,
  offsetY: 0,
  endOffsetX: 0,
  endOffsetY: 0,
  acceleration: 0,
  rotationStart: 0,
  rotationEnd: 0,
})
const defaultProjectileFrame = (): ProjectileFrameForm => ({
  enabled: false,
  imageSource: 'url',
  url: 'https://bg3.wiki/w/images/2/2e/Fireball_Spell_Icon.png',
  soundUrl: '',
  delayMs: 0,
  lifetimeMs: 400,
  trajectory: 'arc',
  startSizePx: 120,
  endSizePx: 300,
  offsetX: 0,
  offsetY: 0,
  acceleration: 0,
  rotationStart: 0,
  rotationEnd: 0,
})
const defaultImpactFrame = (): ImpactFrameForm => ({
  enabled: false,
  imageSource: 'url',
  url: 'https://bg3.wiki/w/images/4/4e/Smoke_Powder_Unfaded.png',
  soundUrl: '',
  delayMs: 0,
  showMs: 90,
  vanishMs: 510,
  lifetimeMs: 600,
  startSizePx: 60,
  endSizePx: 140,
  offsetX: 0,
  offsetY: 0,
  endOffsetX: 0,
  endOffsetY: 0,
  acceleration: 0,
  rotationStart: 0,
  rotationEnd: 0,
})

interface BlockFrameForm {
  enabled: boolean
  imageSource: AnimationFrameImageSource
  url: string
  soundUrl: string
  delayMs: number
  startBeforeImpactMs: number
  showMs: number
  vanishMs: number
  lifetimeMs: number
  startSizePx: number
  endSizePx: number
  offsetX: number
  offsetY: number
  rotationStart: number
  rotationEnd: number
}
const defaultBlockFrame = (): BlockFrameForm => ({
  enabled: false,
  imageSource: 'url',
  url: '',
  soundUrl: '',
  delayMs: 0,
  startBeforeImpactMs: 0,
  showMs: 320,
  vanishMs: 480,
  lifetimeMs: 800,
  startSizePx: 100,
  endSizePx: 140,
  offsetX: 0,
  offsetY: 0,
  rotationStart: 0,
  rotationEnd: 0,
})

// --- Active VFX types (runtime) ---
interface ActiveWeaponFrameEntry {
  key: number
  url: string
  soundUrl?: string
  fadeInMs: number
  lifetimeMs?: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  offsetX: number
  offsetY: number
  endOffsetX: number
  endOffsetY: number
  acceleration: number
  rotationStart: number
  rotationEnd: number
  mirrored?: boolean
}
interface ActiveProjectileEntry {
  key: number
  direction: 'left-to-right' | 'right-to-left'
  imageUrl: string | null
  soundUrl?: string
  from: ProjectilePos
  to: ProjectilePos
  trajectory: 'straight' | 'arc'
  durationMs?: number
  startSizePx?: number
  endSizePx?: number
  acceleration: number
  rotationStart: number
  rotationEnd: number
  mirrored?: boolean
  color: string
  show: boolean
}
interface ActiveImpactFrameEntry {
  key: number
  url: string
  soundUrl?: string
  showMs: number
  vanishMs: number
  startSizePx?: number
  endSizePx?: number
  offsetX: number
  offsetY: number
  endOffsetX: number
  endOffsetY: number
  acceleration: number
  rotationStart: number
  rotationEnd: number
  mirrored?: boolean
}
interface ActiveBlockFrameEntry {
  key: number
  side: 'player' | 'creature'
  url: string
  soundUrl?: string
  showMs: number
  vanishMs: number
  startSizePx?: number
  endSizePx?: number
  offsetX: number
  offsetY: number
  rotationStart: number
  rotationEnd: number
  mirrored?: boolean
}

interface ActiveStatusParticleEntry {
  key: number
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

function getMotionVariants(_anim: AttackAnimationConfig, direction: 'left' | 'right') {
  const sign = direction === 'left' ? 1 : -1
  return {
    idle: { x: 0, scale: 1 },
    cast: { scale: 1.08, transition: { duration: 0.15 } },
    hit: { x: [0, sign * -6, sign * 6, sign * -4, 0], transition: { duration: 0.3 } },
    return: { x: 0, scale: 1, transition: { duration: 0.25, ease: [0.42, 0.0, 0.58, 1.0] as const } },
  }
}

const CombatantCard = forwardRef<HTMLDivElement, {
  label: string
  variant: string
  variants: ReturnType<typeof getMotionVariants>
  cardOffsetX?: number
  cardTransition?: CardMotionTransition
  showImpact: boolean
  impactStyle: ImpactStyle
  impactColor: string
  impactKey: number
  dmg: { value: number; type: 'damage' | 'heal' | 'block'; key: number } | null
  activeWeaponFrames?: ActiveWeaponFrameEntry[]
  activeImpactFrames?: ActiveImpactFrameEntry[]
  activeBlockFrames?: ActiveBlockFrameEntry[]
  activeStatusLoopParticles?: ActiveStatusParticleEntry[]
  activeStatusBurstParticles?: ActiveStatusParticleEntry[]
  cardRef?: React.Ref<HTMLDivElement>
  side: 'player' | 'creature'
  portraitUrl?: string
}>(function CombatantCard({
  label,
  variant,
  variants,
  cardOffsetX = 0,
  cardTransition = DEFAULT_CARD_MOTION_TRANSITION,
  showImpact,
  impactStyle,
  impactColor,
  impactKey,
  dmg,
  activeWeaponFrames,
  activeImpactFrames,
  activeBlockFrames,
  activeStatusLoopParticles,
  activeStatusBurstParticles,
  cardRef,
  side,
  portraitUrl,
}, ref) {
  const isPlayer = side === 'player'
  const borderColor = isPlayer ? 'rgba(99,102,241,0.45)' : 'rgba(239,68,68,0.4)'
  const glowColor = isPlayer ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.1)'
  return (
    <motion.div
      animate={{ x: cardOffsetX }}
      transition={cardTransition}
      style={{ flex: 1, maxWidth: CARD_MAX_WIDTH, position: 'relative' }}
    >
      <motion.div variants={variants} animate={variant}>
        <Paper
          ref={cardRef}
          variant="outlined"
          sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: CARD_GAP, p: CARD_PADDING, pt: 0, borderRadius: CARD_RADIUS,
            bgcolor: isPlayer ? '#14121f' : '#1a1414',
            borderColor,
            boxShadow: `0 0 24px rgba(0,0,0,0.4), 0 0 20px ${glowColor}`,
            position: 'relative', overflow: 'visible',
          }}
        >
        <Box ref={ref} sx={{ position: 'relative', width: PORTRAIT_SIZE, height: PORTRAIT_SIZE, flexShrink: 0 }}>
          <Box
            sx={{
              width: PORTRAIT_SIZE,
              height: PORTRAIT_SIZE,
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
            {portraitUrl ? (
              <img src={portraitUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.6)) drop-shadow(0 0 20px rgba(168,85,247,0.3))' }} />
            ) : (
              <PersonIcon sx={{ fontSize: PERSON_ICON_SIZE, color: 'rgba(168,85,247,0.25)' }} />
            )}
          </Box>
          {(activeStatusLoopParticles ?? []).map((p) => (
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
          {(activeStatusBurstParticles ?? []).map((p) => (
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
          {(activeWeaponFrames ?? []).map(f => (
            <WeaponFrame
              key={f.key}
              show
              url={f.url}
              soundUrl={f.soundUrl}
              fadeInMs={f.fadeInMs}
              lifetimeMs={f.lifetimeMs}
              sizePx={f.sizePx}
              startSizePx={f.startSizePx}
              endSizePx={f.endSizePx}
              offsetX={f.offsetX}
              offsetY={f.offsetY}
              endOffsetX={f.endOffsetX}
              endOffsetY={f.endOffsetY}
              acceleration={f.acceleration}
              rotationStart={f.rotationStart}
              rotationEnd={f.rotationEnd}
              mirrored={f.mirrored}
              id={f.key}
            />
          ))}
          {showImpact && (activeImpactFrames ?? []).length > 0
            ? (activeImpactFrames ?? []).map(f => (
              <ImpactFrame
                key={f.key}
                show
                url={f.url}
                soundUrl={f.soundUrl}
                showMs={f.showMs}
                vanishMs={f.vanishMs}
                startSizePx={f.startSizePx}
                endSizePx={f.endSizePx}
                offsetX={f.offsetX}
                offsetY={f.offsetY}
                endOffsetX={f.endOffsetX}
                endOffsetY={f.endOffsetY}
                acceleration={f.acceleration}
                rotationStart={f.rotationStart}
                rotationEnd={f.rotationEnd}
                mirrored={f.mirrored}
                id={f.key}
              />
            ))
            : <ImpactEffect show={showImpact} style={impactStyle} color={impactColor} id={`impact-${impactKey}`} />
          }
          <AnimatePresence>
            {dmg && <DamageNumber value={dmg.value} type={dmg.type} id={dmg.key} />}
          </AnimatePresence>
        </Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: NAME_FONT_SIZE }}>{label}</Typography>
        {(activeBlockFrames ?? []).map(f => (
          <BlockFrame key={f.key} show url={f.url} soundUrl={f.soundUrl} side={side} showMs={f.showMs} vanishMs={f.vanishMs} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} rotationStart={f.rotationStart} rotationEnd={f.rotationEnd} mirrored={f.mirrored} id={f.key} />
        ))}
        </Paper>
      </motion.div>
    </motion.div>
  )
})

// --- Small helper: a labeled number field ---
function NumField({ label, value, onChange, min, max, step, width, disabled, helperText }: {
  label: string; value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number; width?: number; disabled?: boolean; helperText?: string
}) {
  return (
    <TextField
      size="small" type="number" label={label} value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      inputProps={{ min, max, step }}
      sx={{ width: width ?? 100 }}
      disabled={disabled}
      helperText={helperText}
    />
  )
}

// --- Weapon frame row editor ---
function WeaponFrameEditor({ frame, idx, onChange, onRemove, resolveUrl }: {
  frame: WeaponFrameForm
  idx: number
  onChange: (f: WeaponFrameForm) => void
  onRemove: () => void
  resolveUrl: (source: AnimationFrameImageSource, url: string) => string
}) {
  const set = <K extends keyof WeaponFrameForm>(key: K, val: WeaponFrameForm[K]) => onChange({ ...frame, [key]: val })
  const setOffsetX = (v: number) => onChange({
    ...frame,
    offsetX: v,
    ...(frame.endOffsetX === frame.offsetX ? { endOffsetX: v } : {}),
  })
  const setOffsetY = (v: number) => onChange({
    ...frame,
    offsetY: v,
    ...(frame.endOffsetY === frame.offsetY ? { endOffsetY: v } : {}),
  })
  return (
    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <FormControlLabel
          control={<Checkbox checked={frame.enabled} onChange={(e) => set('enabled', e.target.checked)} size="small" />}
          label={<Typography variant="body2" fontWeight={600}>Weapon frame #{idx + 1}</Typography>}
          sx={{ m: 0 }}
        />
        <IconButton size="small" color="error" onClick={onRemove}><DeleteIcon fontSize="small" /></IconButton>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', opacity: frame.enabled ? 1 : 0.4 }}>
        <FormControl size="small" sx={{ minWidth: 140 }} disabled={!frame.enabled}>
          <InputLabel>Image</InputLabel>
          <Select value={frame.imageSource} label="Image" onChange={(e) => set('imageSource', e.target.value as AnimationFrameImageSource)}>
            {IMAGE_SOURCE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
        {frame.imageSource === 'url' && (
          <TextField size="small" label="PNG URL" value={frame.url} onChange={(e) => set('url', e.target.value)} placeholder="https://..." sx={{ minWidth: 240, flex: 1 }} disabled={!frame.enabled} />
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 260, flex: 1 }}>
          <TextField size="small" label="Sound URL" value={frame.soundUrl} onChange={(e) => set('soundUrl', e.target.value)} placeholder="https://..." sx={{ minWidth: 220, flex: 1 }} disabled={!frame.enabled} />
          <SoundUploadButton disabled={!frame.enabled} onUploaded={(url) => set('soundUrl', url)} />
        </Box>
        {resolveUrl(frame.imageSource, frame.url) && (
          <img src={resolveUrl(frame.imageSource, frame.url)} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }} />
        )}
        <NumField label="Delay (ms)" value={frame.delayMs} onChange={(v) => set('delayMs', Math.max(0, v))} min={0} max={2000} step={50} disabled={!frame.enabled} />
        <NumField label="Fade-in (ms)" value={frame.fadeInMs} onChange={(v) => set('fadeInMs', Math.max(50, v))} min={50} max={2000} step={50} width={110} disabled={!frame.enabled} />
        <NumField label="Lifetime (ms)" value={frame.lifetimeMs} onChange={(v) => set('lifetimeMs', Math.max(0, v))} min={0} max={5000} step={50} width={120} helperText="0 = whole seq" disabled={!frame.enabled} />
        <NumField label="Start size" value={frame.startSizePx} onChange={(v) => set('startSizePx', Math.max(16, v))} min={16} max={400} step={8} disabled={!frame.enabled} />
        <NumField label="End size" value={frame.endSizePx} onChange={(v) => set('endSizePx', Math.max(16, v))} min={16} max={400} step={8} disabled={!frame.enabled} />
        <NumField label="Offset X" value={frame.offsetX} onChange={setOffsetX} min={-300} max={300} step={8} disabled={!frame.enabled} />
        <NumField label="Offset Y" value={frame.offsetY} onChange={setOffsetY} min={-300} max={300} step={8} disabled={!frame.enabled} />
        <NumField label="End X" value={frame.endOffsetX} onChange={(v) => set('endOffsetX', v)} min={-300} max={300} step={8} disabled={!frame.enabled} helperText="final offset" />
        <NumField label="End Y" value={frame.endOffsetY} onChange={(v) => set('endOffsetY', v)} min={-300} max={300} step={8} disabled={!frame.enabled} helperText="final offset" />
        <NumField label="Accel" value={frame.acceleration} onChange={(v) => set('acceleration', v)} min={-5} max={5} step={0.1} width={100} disabled={!frame.enabled} />
        <NumField label="Rot Start" value={frame.rotationStart} onChange={(v) => set('rotationStart', v)} min={-720} max={720} step={5} width={110} disabled={!frame.enabled} />
        <NumField label="Rot End" value={frame.rotationEnd} onChange={(v) => set('rotationEnd', v)} min={-720} max={720} step={5} width={110} disabled={!frame.enabled} />
      </Box>
    </Box>
  )
}

// --- Projectile frame row editor ---
function ProjectileFrameEditor({ frame, idx, onChange, onRemove, resolveUrl }: {
  frame: ProjectileFrameForm
  idx: number
  onChange: (f: ProjectileFrameForm) => void
  onRemove: () => void
  resolveUrl: (source: AnimationFrameImageSource, url: string) => string
}) {
  const set = <K extends keyof ProjectileFrameForm>(key: K, val: ProjectileFrameForm[K]) => onChange({ ...frame, [key]: val })
  return (
    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <FormControlLabel
          control={<Checkbox checked={frame.enabled} onChange={(e) => set('enabled', e.target.checked)} size="small" />}
          label={<Typography variant="body2" fontWeight={600}>Projectile frame #{idx + 1}</Typography>}
          sx={{ m: 0 }}
        />
        <IconButton size="small" color="error" onClick={onRemove}><DeleteIcon fontSize="small" /></IconButton>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', opacity: frame.enabled ? 1 : 0.4 }}>
        <FormControl size="small" sx={{ minWidth: 140 }} disabled={!frame.enabled}>
          <InputLabel>Image</InputLabel>
          <Select value={frame.imageSource} label="Image" onChange={(e) => set('imageSource', e.target.value as AnimationFrameImageSource)}>
            {IMAGE_SOURCE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
        {frame.imageSource === 'url' && (
          <TextField size="small" label="PNG URL" value={frame.url} onChange={(e) => set('url', e.target.value)} placeholder="https://..." sx={{ minWidth: 240, flex: 1 }} disabled={!frame.enabled} />
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 260, flex: 1 }}>
          <TextField size="small" label="Sound URL" value={frame.soundUrl} onChange={(e) => set('soundUrl', e.target.value)} placeholder="https://..." sx={{ minWidth: 220, flex: 1 }} disabled={!frame.enabled} />
          <SoundUploadButton disabled={!frame.enabled} onUploaded={(url) => set('soundUrl', url)} />
        </Box>
        {resolveUrl(frame.imageSource, frame.url) && (
          <img src={resolveUrl(frame.imageSource, frame.url)} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }} />
        )}
        <NumField label="Delay (ms)" value={frame.delayMs} onChange={(v) => set('delayMs', Math.max(0, v))} min={0} max={2000} step={50} disabled={!frame.enabled} />
        <NumField label="Lifetime (ms)" value={frame.lifetimeMs} onChange={(v) => set('lifetimeMs', Math.max(100, v))} min={100} max={3000} step={50} width={120} helperText="flight time" disabled={!frame.enabled} />
        <FormControl size="small" sx={{ minWidth: 100 }} disabled={!frame.enabled}>
          <InputLabel>Path</InputLabel>
          <Select value={frame.trajectory} label="Path" onChange={(e) => set('trajectory', e.target.value as 'straight' | 'arc')}>
            <MenuItem value="straight">Straight</MenuItem>
            <MenuItem value="arc">Arc</MenuItem>
          </Select>
        </FormControl>
        <NumField label="Start size" value={frame.startSizePx} onChange={(v) => set('startSizePx', Math.max(24, v))} min={24} max={600} step={24} disabled={!frame.enabled} />
        <NumField label="End size" value={frame.endSizePx} onChange={(v) => set('endSizePx', Math.max(24, v))} min={24} max={600} step={24} disabled={!frame.enabled} />
        <NumField label="Offset X" value={frame.offsetX} onChange={(v) => set('offsetX', v)} min={-300} max={300} step={8} disabled={!frame.enabled} helperText="start pos" />
        <NumField label="Offset Y" value={frame.offsetY} onChange={(v) => set('offsetY', v)} min={-300} max={300} step={8} disabled={!frame.enabled} helperText="start pos" />
        <NumField label="Accel" value={frame.acceleration} onChange={(v) => set('acceleration', v)} min={-5} max={5} step={0.1} width={100} disabled={!frame.enabled} />
        <NumField label="Rot Start" value={frame.rotationStart} onChange={(v) => set('rotationStart', v)} min={-720} max={720} step={5} width={110} disabled={!frame.enabled} />
        <NumField label="Rot End" value={frame.rotationEnd} onChange={(v) => set('rotationEnd', v)} min={-720} max={720} step={5} width={110} disabled={!frame.enabled} />
      </Box>
    </Box>
  )
}

// --- Impact frame row editor ---
function ImpactFrameEditor({ frame, idx, onChange, onRemove, resolveUrl }: {
  frame: ImpactFrameForm
  idx: number
  onChange: (f: ImpactFrameForm) => void
  onRemove: () => void
  resolveUrl: (source: AnimationFrameImageSource, url: string) => string
}) {
  const set = <K extends keyof ImpactFrameForm>(key: K, val: ImpactFrameForm[K]) => onChange({ ...frame, [key]: val })
  const setOffsetX = (v: number) => onChange({
    ...frame,
    offsetX: v,
    ...(frame.endOffsetX === frame.offsetX ? { endOffsetX: v } : {}),
  })
  const setOffsetY = (v: number) => onChange({
    ...frame,
    offsetY: v,
    ...(frame.endOffsetY === frame.offsetY ? { endOffsetY: v } : {}),
  })
  return (
    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <FormControlLabel
          control={<Checkbox checked={frame.enabled} onChange={(e) => set('enabled', e.target.checked)} size="small" />}
          label={<Typography variant="body2" fontWeight={600}>Impact frame #{idx + 1}</Typography>}
          sx={{ m: 0 }}
        />
        <IconButton size="small" color="error" onClick={onRemove}><DeleteIcon fontSize="small" /></IconButton>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', opacity: frame.enabled ? 1 : 0.4 }}>
        <FormControl size="small" sx={{ minWidth: 140 }} disabled={!frame.enabled}>
          <InputLabel>Image</InputLabel>
          <Select value={frame.imageSource} label="Image" onChange={(e) => set('imageSource', e.target.value as AnimationFrameImageSource)}>
            {IMAGE_SOURCE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
        {frame.imageSource === 'url' && (
          <TextField size="small" label="PNG URL" value={frame.url} onChange={(e) => set('url', e.target.value)} placeholder="https://..." sx={{ minWidth: 240, flex: 1 }} disabled={!frame.enabled} />
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 260, flex: 1 }}>
          <TextField size="small" label="Sound URL" value={frame.soundUrl} onChange={(e) => set('soundUrl', e.target.value)} placeholder="https://..." sx={{ minWidth: 220, flex: 1 }} disabled={!frame.enabled} />
          <SoundUploadButton disabled={!frame.enabled} onUploaded={(url) => set('soundUrl', url)} />
        </Box>
        {resolveUrl(frame.imageSource, frame.url) && (
          <img src={resolveUrl(frame.imageSource, frame.url)} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }} />
        )}
        <NumField label="Delay (ms)" value={frame.delayMs} onChange={(v) => set('delayMs', Math.max(0, v))} min={0} max={2000} step={50} disabled={!frame.enabled} />
        <NumField
          label="Lifetime (ms)" value={frame.lifetimeMs}
          onChange={(v) => {
            const lt = Math.max(200, v)
            onChange({ ...frame, lifetimeMs: lt, showMs: Math.floor(lt * 0.15), vanishMs: Math.ceil(lt * 0.85) })
          }}
          min={200} max={5000} step={50} width={120} helperText="show+vanish" disabled={!frame.enabled}
        />
        <NumField label="Show (ms)" value={frame.showMs} onChange={(v) => set('showMs', Math.max(0, v))} min={0} max={1000} step={50} disabled={!frame.enabled} />
        <NumField label="Vanish (ms)" value={frame.vanishMs} onChange={(v) => set('vanishMs', Math.max(100, v))} min={100} max={2000} step={50} width={110} helperText="fade-out" disabled={!frame.enabled} />
        <NumField label="Start size" value={frame.startSizePx} onChange={(v) => set('startSizePx', Math.max(16, v))} min={16} max={400} step={8} disabled={!frame.enabled} />
        <NumField label="End size" value={frame.endSizePx} onChange={(v) => set('endSizePx', Math.max(16, v))} min={16} max={400} step={8} disabled={!frame.enabled} />
        <NumField label="Offset X" value={frame.offsetX} onChange={setOffsetX} min={-300} max={300} step={8} disabled={!frame.enabled} />
        <NumField label="Offset Y" value={frame.offsetY} onChange={setOffsetY} min={-300} max={300} step={8} disabled={!frame.enabled} />
        <NumField label="End X" value={frame.endOffsetX} onChange={(v) => set('endOffsetX', v)} min={-300} max={300} step={8} disabled={!frame.enabled} helperText="final offset" />
        <NumField label="End Y" value={frame.endOffsetY} onChange={(v) => set('endOffsetY', v)} min={-300} max={300} step={8} disabled={!frame.enabled} helperText="final offset" />
        <NumField label="Accel" value={frame.acceleration} onChange={(v) => set('acceleration', v)} min={-5} max={5} step={0.1} width={100} disabled={!frame.enabled} />
        <NumField label="Rot Start" value={frame.rotationStart} onChange={(v) => set('rotationStart', v)} min={-720} max={720} step={5} width={110} disabled={!frame.enabled} />
        <NumField label="Rot End" value={frame.rotationEnd} onChange={(v) => set('rotationEnd', v)} min={-720} max={720} step={5} width={110} disabled={!frame.enabled} />
      </Box>
    </Box>
  )
}

function BlockFrameEditor({ frame, idx, onChange, onRemove, resolveUrl }: {
  frame: BlockFrameForm
  idx: number
  onChange: (f: BlockFrameForm) => void
  onRemove: () => void
  resolveUrl: (source: AnimationFrameImageSource, url: string) => string
}) {
  const set = <K extends keyof BlockFrameForm>(key: K, val: BlockFrameForm[K]) => onChange({ ...frame, [key]: val })
  return (
    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <FormControlLabel
          control={<Checkbox checked={frame.enabled} onChange={(e) => set('enabled', e.target.checked)} size="small" />}
          label={<Typography variant="body2" fontWeight={600}>Block frame #{idx + 1}</Typography>}
          sx={{ m: 0 }}
        />
        <IconButton size="small" color="error" onClick={onRemove}><DeleteIcon fontSize="small" /></IconButton>
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', opacity: frame.enabled ? 1 : 0.4 }}>
        <FormControl size="small" sx={{ minWidth: 140 }} disabled={!frame.enabled}>
          <InputLabel>Image</InputLabel>
          <Select value={frame.imageSource} label="Image" onChange={(e) => set('imageSource', e.target.value as AnimationFrameImageSource)}>
            {IMAGE_SOURCE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
        {frame.imageSource === 'url' && (
          <TextField size="small" label="PNG URL" value={frame.url} onChange={(e) => set('url', e.target.value)} placeholder="https://..." sx={{ minWidth: 240, flex: 1 }} disabled={!frame.enabled} />
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 260, flex: 1 }}>
          <TextField size="small" label="Sound URL" value={frame.soundUrl} onChange={(e) => set('soundUrl', e.target.value)} placeholder="https://..." sx={{ minWidth: 220, flex: 1 }} disabled={!frame.enabled} />
          <SoundUploadButton disabled={!frame.enabled} onUploaded={(url) => set('soundUrl', url)} />
        </Box>
        {resolveUrl(frame.imageSource, frame.url) && (
          <img src={resolveUrl(frame.imageSource, frame.url)} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }} />
        )}
        <NumField label="Delay (ms)" value={frame.delayMs} onChange={(v) => set('delayMs', Math.max(0, v))} min={0} max={2000} step={50} disabled={!frame.enabled} />
        <NumField
          label="Lifetime (ms)" value={frame.lifetimeMs}
          onChange={(v) => {
            const lt = Math.max(200, v)
            onChange({ ...frame, lifetimeMs: lt, showMs: Math.floor(lt * 0.15), vanishMs: Math.ceil(lt * 0.85) })
          }}
          min={200} max={5000} step={50} width={120} helperText="show+vanish" disabled={!frame.enabled}
        />
        <NumField label="Show (ms)" value={frame.showMs} onChange={(v) => set('showMs', Math.max(0, v))} min={0} max={1000} step={50} disabled={!frame.enabled} />
        <NumField label="Vanish (ms)" value={frame.vanishMs} onChange={(v) => set('vanishMs', Math.max(100, v))} min={100} max={2000} step={50} width={110} helperText="fade-out" disabled={!frame.enabled} />
        <NumField label="Start size" value={frame.startSizePx} onChange={(v) => set('startSizePx', Math.max(16, v))} min={16} max={400} step={8} disabled={!frame.enabled} />
        <NumField label="End size" value={frame.endSizePx} onChange={(v) => set('endSizePx', Math.max(16, v))} min={16} max={400} step={8} disabled={!frame.enabled} />
        <NumField label="Offset X" value={frame.offsetX} onChange={(v) => set('offsetX', v)} min={-300} max={300} step={8} disabled={!frame.enabled} />
        <NumField label="Offset Y" value={frame.offsetY} onChange={(v) => set('offsetY', v)} min={-300} max={300} step={8} disabled={!frame.enabled} />
        <NumField label="Rot Start" value={frame.rotationStart} onChange={(v) => set('rotationStart', v)} min={-720} max={720} step={5} width={110} disabled={!frame.enabled} />
        <NumField label="Rot End" value={frame.rotationEnd} onChange={(v) => set('rotationEnd', v)} min={-720} max={720} step={5} width={110} disabled={!frame.enabled} />
      </Box>
    </Box>
  )
}

void AddIcon
void defaultWeaponFrame
void defaultProjectileFrame
void defaultImpactFrame
void defaultBlockFrame
void WeaponFrameEditor
void ProjectileFrameEditor
void ImpactFrameEditor
void BlockFrameEditor

export default function AnimationTest() {
  const [attackerStyle, setAttackerStyle] = useState(styleIds[0])
  const [defenderStyle, setDefenderStyle] = useState(styleIds[0])
  const [weaponUrl, setWeaponUrl] = useState('https://bg3.wiki/w/images/c/ca/Flail_Unfaded.png')
  const [weaponAnimationUrl, setWeaponAnimationUrl] = useState('https://bg3.wiki/w/images/0/0f/Quarterstaff_Unfaded.png')
  const [weaponProjectileUrl, setWeaponProjectileUrl] = useState('')
  const [weaponImpactUrl, setWeaponImpactUrl] = useState('')
  const [defenseUrl, setDefenseUrl] = useState('')
  const [defenseAnimationUrl, setDefenseAnimationUrl] = useState('')
  const [defenseProjectileUrl, setDefenseProjectileUrl] = useState('')
  const [defenseImpactUrl, setDefenseImpactUrl] = useState('')
  const [playerPortraitUrl, setPlayerPortraitUrl] = useState('')
  const [creaturePortraitUrl, setCreaturePortraitUrl] = useState('')
  const [trajectoryOverride, setTrajectoryOverride] = useState<'auto' | 'straight' | 'arc'>('auto')
  const [animFrames, setAnimFrames] = useState<SharedAbilityAnimFrames>(createEmptyAnimFrames())
  const [playing, setPlaying] = useState(false)
  const [logLines, setLogLines] = useState<string[]>([])

  const [simulateBlock, setSimulateBlock] = useState(false)
  const [statusParticles, setStatusParticles] = useState<StatusParticleForm[]>([createEmptyStatusParticle()])
  const [statusHolderSide, setStatusHolderSide] = useState<'player' | 'creature'>('creature')
  const [statusApplied, setStatusApplied] = useState(false)
  const [activeStatusLoopParticles, setActiveStatusLoopParticles] = useState<ActiveStatusParticleEntry[]>([])
  const [activeStatusBurstParticles, setActiveStatusBurstParticles] = useState<ActiveStatusParticleEntry[]>([])

  // Active VFX state (runtime)
  const [playerActiveWeapon, setPlayerActiveWeapon] = useState<ActiveWeaponFrameEntry[]>([])
  const [creatureActiveWeapon, setCreatureActiveWeapon] = useState<ActiveWeaponFrameEntry[]>([])
  const [activeProjectiles, setActiveProjectiles] = useState<ActiveProjectileEntry[]>([])
  const [playerActiveImpact, setPlayerActiveImpact] = useState<ActiveImpactFrameEntry[]>([])
  const [creatureActiveImpact, setCreatureActiveImpact] = useState<ActiveImpactFrameEntry[]>([])
  const [activeBlockFrames, setActiveBlockFrames] = useState<ActiveBlockFrameEntry[]>([])

  const [playerVariant, setPlayerVariant] = useState('idle')
  const [creatureVariant, setCreatureVariant] = useState('idle')
  const [playerCardOffsetX, setPlayerCardOffsetX] = useState(0)
  const [creatureCardOffsetX, setCreatureCardOffsetX] = useState(0)
  const [playerCardTransition, setPlayerCardTransition] = useState<CardMotionTransition>(DEFAULT_CARD_MOTION_TRANSITION)
  const [creatureCardTransition, setCreatureCardTransition] = useState<CardMotionTransition>(DEFAULT_CARD_MOTION_TRANSITION)
  const [showPlayerImpact, setShowPlayerImpact] = useState(false)
  const [showCreatureImpact, setShowCreatureImpact] = useState(false)
  const [playerDmg, setPlayerDmg] = useState<{ value: number; type: 'damage' | 'heal' | 'block'; key: number } | null>(null)
  const [creatureDmg, setCreatureDmg] = useState<{ value: number; type: 'damage' | 'heal' | 'block'; key: number } | null>(null)
  const dmgKeyRef = useRef(0)
  const vfxKeyRef = useRef(0)
  const arenaRef = useRef<HTMLDivElement>(null)
  const playerPortraitRef = useRef<HTMLDivElement>(null)
  const creaturePortraitRef = useRef<HTMLDivElement>(null)
  const playerCardRef = useRef<HTMLDivElement>(null)
  const creatureCardRef = useRef<HTMLDivElement>(null)

  // Impact gallery state
  const [galleryKey, setGalleryKey] = useState(0)
  const [galleryPlaying, setGalleryPlaying] = useState(false)

  // Ability properties (for JSON export)
  const [abilityId, setAbilityId] = useState('my_ability')
  const [abilityName, setAbilityName] = useState('My Ability')
  const [abilityType, setAbilityType] = useState<'primary' | 'regular' | 'passive' | 'ultimate' | 'reactive'>('regular')
  const [abilityDescription, setAbilityDescription] = useState('')
  const [abilityIconUrl, setAbilityIconUrl] = useState('')
  const [cooldownTurns, setCooldownTurns] = useState(0)
  const [resourceCostId, setResourceCostId] = useState('')
  const [resourceCostAmount, setResourceCostAmount] = useState(0)
  const [unlockCost, setUnlockCost] = useState(1)
  const [minLevel, setMinLevel] = useState(1)
  const [effects, setEffects] = useState<EffectFormRow[]>([createEmptyEffectRow()])
  const [requiredItemTagsAny, setRequiredItemTagsAny] = useState('')
  const [derivedStatModifiers, setDerivedStatModifiers] = useState<DerivedModifierForm[]>([])
  const [reactiveTriggerTiming, setReactiveTriggerTiming] = useState<(typeof REACTIVE_TRIGGER_TIMINGS)[number]>('on_incoming_cast')
  const [reactivePriority, setReactivePriority] = useState(0)
  const [reactiveMaxTriggersPerTurn, setReactiveMaxTriggersPerTurn] = useState(0)
  const [jsonImportText, setJsonImportText] = useState('')
  const [fables, setFables] = useState<Fable[]>([])
  const [selectedFableId, setSelectedFableId] = useState('')
  const [realms, setRealms] = useState<IdleRpgRealm[]>([])
  const [selectedRealmId, setSelectedRealmId] = useState('')
  const [selectedRealmPack, setSelectedRealmPack] = useState<IdleRpgPackV1 | null>(null)
  const [publishingAbility, setPublishingAbility] = useState(false)
  const [publishMessage, setPublishMessage] = useState<string>('')

  const ABILITY_TYPES: typeof abilityType[] = ['primary', 'regular', 'passive', 'ultimate', 'reactive']
  const attackerCardAnimation = animFrames.card.attackerAnimation
  const targetCardAnimation = animFrames.card.targetAnimation
  const lungeGapPx = Number(animFrames.card.lungeGapPx) || 0
  const lungeDelayMs = Number(animFrames.card.lungeDelayMs) || 0
  const lungeStartSpeed = Number(animFrames.card.lungeStartSpeed) || 0
  const accelerationLunge = Number(animFrames.card.accelerationLunge) || 0
  const accelerationReturn = Number(animFrames.card.accelerationReturn) || 0
  const weaponFrames = animFrames.weapon
  const projectileFrames = animFrames.projectile
  const impactFrames = animFrames.impact
  const blockFrames = animFrames.block
  const realmMainStatIds = (selectedRealmPack?.mainStats ?? [])
    .map((row) => row.id?.trim())
    .filter((row): row is string => !!row)
  const mainStatIds = realmMainStatIds.length > 0 ? realmMainStatIds : DEFAULT_MAIN_STAT_IDS
  const fallbackMainStatId = mainStatIds[0] ?? 'STR'

  const buildAbilityJson = useCallback(() => {
    const abilityEffects = buildEffectPayload(effects)
    const requiredTags = parseTags(requiredItemTagsAny)
    const requirements: NonNullable<Ability['requirements']> = {}
    if (minLevel > 1) requirements.minLevel = minLevel
    if (requiredTags.length > 0) requirements.equippedTagsAny = requiredTags
    const passiveDerivedModifiers = buildDerivedModifiers(derivedStatModifiers)
    const ability: Ability = {
      id: abilityId.trim() || 'my_ability',
      name: abilityName.trim() || 'My Ability',
      abilityType,
      cooldownTurns,
      ...(abilityDescription.trim() ? { description: abilityDescription.trim() } : {}),
      ...(abilityIconUrl.trim() ? { iconUrl: abilityIconUrl.trim() } : {}),
      ...(resourceCostId.trim() && resourceCostAmount > 0 ? {
        cost: { cooldownTurns, resourceCost: { resourceId: resourceCostId.trim(), amount: resourceCostAmount } }
      } : {}),
      ...(unlockCost > 0 ? { unlockCost } : {}),
      ...(Object.keys(requirements).length > 0 ? { requirements } : {}),
      ...(requiredTags.length > 0 ? { requiredItemTypesAny: requiredTags } : {}),
      ...(requiredTags.length === 1 ? { requiredItemType: requiredTags[0] } : {}),
      ...(abilityEffects.length > 0 ? { effects: abilityEffects } : {}),
      ...(passiveDerivedModifiers.length > 0 ? { derivedStatModifiers: passiveDerivedModifiers } : {}),
    }
    if (abilityType === 'reactive') {
      ability.reactiveConfig = {
        triggerTiming: reactiveTriggerTiming,
        ...(reactivePriority !== 0 ? { priority: reactivePriority } : {}),
        ...(reactiveMaxTriggersPerTurn > 0 ? { maxTriggersPerTurn: reactiveMaxTriggersPerTurn } : {}),
      }
    }
    const frames = buildSharedAnimationFrames(animFrames)
    if (frames) ability.animationFrames = frames
    return ability
  }, [
    abilityDescription,
    abilityIconUrl,
    abilityId,
    abilityName,
    abilityType,
    animFrames,
    cooldownTurns,
    derivedStatModifiers,
    effects,
    minLevel,
    reactiveMaxTriggersPerTurn,
    reactivePriority,
    reactiveTriggerTiming,
    requiredItemTagsAny,
    resourceCostAmount,
    resourceCostId,
    unlockCost,
  ])

  const handleExportJson = useCallback(() => {
    const json = JSON.stringify(buildAbilityJson(), null, 2)
    navigator.clipboard.writeText(json)
    alert('Ability JSON copied to clipboard!')
  }, [buildAbilityJson])

  const handleImportJson = useCallback(() => {
    try {
      const data = JSON.parse(jsonImportText)
      if (data.id) setAbilityId(data.id)
      if (data.name) setAbilityName(data.name)
      if (data.abilityType) setAbilityType(data.abilityType)
      if (data.description) setAbilityDescription(data.description)
      if (data.iconUrl) setAbilityIconUrl(data.iconUrl)
      setCooldownTurns(data.cooldownTurns ?? data.cost?.cooldownTurns ?? 0)
      setResourceCostId(data.cost?.resourceCost?.resourceId ?? '')
      setResourceCostAmount(data.cost?.resourceCost?.amount ?? 0)
      setUnlockCost(data.unlockCost ?? 0)
      setMinLevel(data.requirements?.minLevel ?? 1)
      setRequiredItemTagsAny(
        data.requiredItemTypesAny?.join(', ')
        ?? data.requirements?.equippedTagsAny?.join(', ')
        ?? (data.requiredItemType ? String(data.requiredItemType) : ''),
      )
      setEffects(hydrateEffectRows(data.effects ?? (data.effect ? [data.effect] : undefined), fallbackMainStatId))
      setDerivedStatModifiers(hydrateDerivedModifiers(data.derivedStatModifiers))
      if (data.reactiveConfig) {
        setReactiveTriggerTiming((data.reactiveConfig.triggerTiming ?? 'on_incoming_cast') as (typeof REACTIVE_TRIGGER_TIMINGS)[number])
        setReactivePriority(data.reactiveConfig.priority ?? 0)
        setReactiveMaxTriggersPerTurn(data.reactiveConfig.maxTriggersPerTurn ?? 0)
      } else {
        setReactiveTriggerTiming('on_incoming_cast')
        setReactivePriority(0)
        setReactiveMaxTriggersPerTurn(0)
      }
      setAnimFrames(hydrateSharedAnimFrames(data.animationFrames))
      setJsonImportText('')
    } catch {
      alert('Invalid JSON')
    }
  }, [fallbackMainStatId, jsonImportText])

  useEffect(() => {
    let cancelled = false
    getFables()
      .then((rows) => {
        if (cancelled) return
        setFables(rows)
        if (!selectedFableId && rows.length > 0) {
          setSelectedFableId(rows[0].id)
        }
      })
      .catch(() => {
        if (!cancelled) setPublishMessage('Failed to load fables. You may need to sign in.')
      })
    return () => { cancelled = true }
  }, [selectedFableId])

  useEffect(() => {
    if (!selectedFableId) {
      setRealms([])
      setSelectedRealmId('')
      setSelectedRealmPack(null)
      return
    }
    let cancelled = false
    getIdleRpgRealms(selectedFableId)
      .then((rows) => {
        if (cancelled) return
        setRealms(rows)
        setSelectedRealmId((current) => {
          if (current && rows.some((row) => row.id === current)) return current
          return rows[0]?.id ?? ''
        })
      })
      .catch(() => {
        if (!cancelled) {
          setRealms([])
          setSelectedRealmId('')
        }
      })
    return () => { cancelled = true }
  }, [selectedFableId])

  useEffect(() => {
    if (!selectedFableId || !selectedRealmId) {
      setSelectedRealmPack(null)
      return
    }
    let cancelled = false
    getIdleRpgRealm(selectedFableId, selectedRealmId, { includePack: true })
      .then((realm) => {
        if (!cancelled) setSelectedRealmPack(realm.pack ?? null)
      })
      .catch(() => {
        if (!cancelled) setSelectedRealmPack(null)
      })
    return () => { cancelled = true }
  }, [selectedFableId, selectedRealmId])

  const handleAddAbilityToRealm = useCallback(async () => {
    if (!selectedFableId || !selectedRealmId || publishingAbility) return
    setPublishingAbility(true)
    setPublishMessage('')
    try {
      const realm = await getIdleRpgRealm(selectedFableId, selectedRealmId, { includePack: true })
      if (!realm.pack) throw new Error('Realm pack not found')
      const ability = buildAbilityJson()
      const currentAbilities = realm.pack.abilities ?? []
      const existingIndex = currentAbilities.findIndex((entry) => entry.id === ability.id)
      const nextAbilities = existingIndex >= 0
        ? currentAbilities.map((entry, index) => (index === existingIndex ? ability : entry))
        : [...currentAbilities, ability]
      const nextPack = { ...realm.pack, abilities: nextAbilities }
      await updateIdleRpgRealm(selectedFableId, selectedRealmId, { pack: nextPack })
      setPublishMessage(existingIndex >= 0 ? `Updated ability "${ability.id}" in realm.` : `Added ability "${ability.id}" to realm.`)
    } catch (err: unknown) {
      setPublishMessage(err instanceof Error ? err.message : 'Failed to publish ability to realm')
    } finally {
      setPublishingAbility(false)
    }
  }, [buildAbilityJson, publishingAbility, selectedFableId, selectedRealmId])

  const attackerAnim = getAttackAnimationConfig(attackerStyle)
  const defenderAnim = getAttackAnimationConfig(defenderStyle)
  const playerVariants = getMotionVariants(attackerAnim, 'left')
  const creatureVariants = getMotionVariants(defenderAnim, 'right')

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

  const getCardLungeDestinationX = useCallback((side: 'player' | 'creature', gapPx: number): number => {
    const attackerCard = side === 'player' ? playerCardRef.current : creatureCardRef.current
    const defenderCard = side === 'player' ? creatureCardRef.current : playerCardRef.current
    if (!attackerCard || !defenderCard) return 0
    const attackerRect = attackerCard.getBoundingClientRect()
    const defenderRect = defenderCard.getBoundingClientRect()
    const currentGapPx = side === 'player'
      ? defenderRect.left - attackerRect.right
      : attackerRect.left - defenderRect.right
    const travelPx = currentGapPx - gapPx
    return side === 'player' ? travelPx : -travelPx
  }, [])

  const resolveFrameUrl = useCallback((source: AnimationFrameImageSource, customUrl: string): string => {
    if (source === 'weaponIcon') return weaponUrl?.trim() || ''
    if (source === 'weaponAnimation') return weaponAnimationUrl?.trim() || ''
    if (source === 'weaponProjectile') return weaponProjectileUrl?.trim() || ''
    if (source === 'weaponImpact') return weaponImpactUrl?.trim() || ''
    if (source === 'defenseIcon') return defenseUrl?.trim() || ''
    if (source === 'defenseAnimation') return defenseAnimationUrl?.trim() || ''
    if (source === 'defenseProjectile') return defenseProjectileUrl?.trim() || ''
    if (source === 'defenseImpact') return defenseImpactUrl?.trim() || ''
    return customUrl?.trim() || ''
  }, [
    defenseAnimationUrl,
    defenseImpactUrl,
    defenseProjectileUrl,
    defenseUrl,
    weaponAnimationUrl,
    weaponImpactUrl,
    weaponProjectileUrl,
    weaponUrl,
  ])

  const parseStatusNumber = (value: string, fallback: number): number => {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }

  const parseAnimNumber = (value: string, fallback: number): number => {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }

  const resolveStatusParticleUrl = useCallback((particle: StatusParticleForm): string => {
    if (particle.imageSource === 'weaponIcon') return weaponUrl?.trim() || ''
    if (particle.imageSource === 'weaponAnimation') return weaponAnimationUrl?.trim() || weaponUrl?.trim() || ''
    if (particle.imageSource === 'weaponProjectile') return weaponProjectileUrl?.trim() || weaponAnimationUrl?.trim() || weaponUrl?.trim() || ''
    if (particle.imageSource === 'weaponImpact') return weaponImpactUrl?.trim() || weaponAnimationUrl?.trim() || weaponUrl?.trim() || ''
    if (particle.imageSource === 'defenseIcon') return defenseUrl?.trim() || ''
    if (particle.imageSource === 'defenseAnimation') return defenseAnimationUrl?.trim() || defenseUrl?.trim() || ''
    if (particle.imageSource === 'defenseProjectile') return defenseProjectileUrl?.trim() || defenseAnimationUrl?.trim() || defenseUrl?.trim() || ''
    if (particle.imageSource === 'defenseImpact') return defenseImpactUrl?.trim() || defenseAnimationUrl?.trim() || defenseUrl?.trim() || ''
    return particle.url?.trim() || ''
  }, [
    defenseAnimationUrl,
    defenseImpactUrl,
    defenseProjectileUrl,
    defenseUrl,
    weaponAnimationUrl,
    weaponImpactUrl,
    weaponProjectileUrl,
    weaponUrl,
  ])

  const buildStatusParticleEntry = useCallback((
    side: 'player' | 'creature',
    particle: StatusParticleForm,
    loop: boolean,
  ): Omit<ActiveStatusParticleEntry, 'key'> | null => {
    const url = resolveStatusParticleUrl(particle)
    if (!url) return null
    const isRightSide = side === 'creature'
    const offsetXValue = parseStatusNumber(particle.offsetX, 0)
    const offsetYValue = parseStatusNumber(particle.offsetY, 0)
    const endOffsetXValue = parseStatusNumber(particle.endOffsetX, offsetXValue)
    const endOffsetYValue = parseStatusNumber(particle.endOffsetY, offsetYValue)
    const rotationStartValue = parseStatusNumber(particle.rotationStart, 0)
    const rotationEndValue = parseStatusNumber(particle.rotationEnd, rotationStartValue)

    return {
      side,
      url,
      soundUrl: particle.soundUrl?.trim() || undefined,
      delayMs: Math.max(0, parseStatusNumber(particle.delayMs, 0)),
      lifetimeMs: Math.max(100, parseStatusNumber(particle.lifetimeMs, 1000)),
      startSizePx: parseStatusNumber(particle.startSizePx, 72),
      endSizePx: parseStatusNumber(particle.endSizePx, parseStatusNumber(particle.startSizePx, 72)),
      offsetX: isRightSide ? -offsetXValue : offsetXValue,
      offsetY: offsetYValue,
      endOffsetX: isRightSide ? -endOffsetXValue : endOffsetXValue,
      endOffsetY: endOffsetYValue,
      acceleration: parseStatusNumber(particle.acceleration, 0),
      rotationStart: isRightSide ? -rotationStartValue : rotationStartValue,
      rotationEnd: isRightSide ? -rotationEndValue : rotationEndValue,
      loop,
    }
  }, [resolveStatusParticleUrl])

  const triggerStatusBurst = useCallback((side: 'player' | 'creature') => {
    for (const particle of statusParticles) {
      if (particle.loop) continue
      const built = buildStatusParticleEntry(side, particle, false)
      if (!built) continue
      const key = ++vfxKeyRef.current
      setActiveStatusBurstParticles(prev => [...prev, { ...built, key }])
      const removeAfterMs = built.delayMs + built.lifetimeMs + 150
      setTimeout(() => {
        setActiveStatusBurstParticles(prev => prev.filter(p => p.key !== key))
      }, removeAfterMs)
    }
  }, [buildStatusParticleEntry, statusParticles])

  const handleApplyStatus = useCallback(() => {
    setStatusApplied(true)
    triggerStatusBurst(statusHolderSide)
  }, [statusHolderSide, triggerStatusBurst])

  const handleStatusTick = useCallback(() => {
    if (!statusApplied) return
    triggerStatusBurst(statusHolderSide)
  }, [statusApplied, statusHolderSide, triggerStatusBurst])

  const handleClearStatus = useCallback(() => {
    setStatusApplied(false)
    setActiveStatusLoopParticles([])
    setActiveStatusBurstParticles([])
  }, [])

  useEffect(() => {
    if (!statusApplied) {
      setActiveStatusLoopParticles([])
      return
    }
    const next: ActiveStatusParticleEntry[] = []
    for (const particle of statusParticles) {
      if (!particle.loop) continue
      const built = buildStatusParticleEntry(statusHolderSide, particle, true)
      if (!built) continue
      next.push({ ...built, key: ++vfxKeyRef.current })
    }
    setActiveStatusLoopParticles(next)
  }, [buildStatusParticleEntry, statusApplied, statusHolderSide, statusParticles])

  const log = useCallback((text: string) => {
    setLogLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`])
  }, [])

  const runAttack = useCallback(async (
    side: 'player' | 'creature',
    anim: AttackAnimationConfig,
    styleId: string,
  ) => {
    const defenderSide = side === 'player' ? 'creature' : 'player'
    const setAttVar = side === 'player' ? setPlayerVariant : setCreatureVariant
    const setTgtImpact = side === 'player' ? setShowCreatureImpact : setShowPlayerImpact
    const setTgtDmg = side === 'player' ? setCreatureDmg : setPlayerDmg
    const setTgtVar = side === 'player' ? setCreatureVariant : setPlayerVariant
    const setAttackerWeapon = side === 'player' ? setPlayerActiveWeapon : setCreatureActiveWeapon
    const setTargetImpactFrames = side === 'player' ? setCreatureActiveImpact : setPlayerActiveImpact
    const sideLabel = side === 'player' ? 'Player' : 'Creature'
    const isRightSideAttacker = side === 'creature'
    const isRightSideDefender = side === 'player'
    const shouldLunge = attackerCardAnimation === 'lunge'
    let usedLunge = false


    const isBlocked = simulateBlock && blockFrames.some(f => f.enabled)
    log(`${sideLabel} attacks with "${styleId}"${isBlocked ? ' (BLOCKED!)' : ''}`)

    if (attackerCardAnimation === 'cast') {
      setAttVar('cast')
      await sleep(160)
    } else {
      setAttVar('idle')
    }

    // --- Weapon frames ---
    const activeWeaponForms = weaponFrames.filter(f => f.enabled)
    if (activeWeaponForms.length > 0) {
      const maxWeaponMs = Math.max(...activeWeaponForms.map((f) => parseAnimNumber(f.delayMs, 0) + parseAnimNumber(f.fadeInMs, 200)))
      activeWeaponForms.forEach(async (f) => {
        const url = resolveFrameUrl(f.imageSource, f.url)
        if (!url) return
        const delayMs = Math.max(0, parseAnimNumber(f.delayMs, 0))
        const fadeInMs = Math.max(0, parseAnimNumber(f.fadeInMs, 200))
        const lifetimeMs = Math.max(0, parseAnimNumber(f.lifetimeMs, 0))
        if (delayMs) await sleep(delayMs)
        const entry: ActiveWeaponFrameEntry = {
          key: ++vfxKeyRef.current,
          url,
          soundUrl: f.soundUrl?.trim() || undefined,
          fadeInMs,
          lifetimeMs: lifetimeMs > 0 ? lifetimeMs : undefined,
          sizePx: undefined,
          startSizePx: parseAnimNumber(f.startSizePx, 80),
          endSizePx: parseAnimNumber(f.endSizePx, 120),
          offsetX: isRightSideAttacker ? -parseAnimNumber(f.offsetX, 0) : parseAnimNumber(f.offsetX, 0),
          offsetY: parseAnimNumber(f.offsetY, 0),
          endOffsetX: isRightSideAttacker ? -parseAnimNumber(f.endOffsetX, parseAnimNumber(f.offsetX, 0)) : parseAnimNumber(f.endOffsetX, parseAnimNumber(f.offsetX, 0)),
          endOffsetY: parseAnimNumber(f.endOffsetY, parseAnimNumber(f.offsetY, 0)),
          acceleration: parseAnimNumber(f.acceleration, 0),
          rotationStart: isRightSideAttacker ? -parseAnimNumber(f.rotationStart, 0) : parseAnimNumber(f.rotationStart, 0),
          rotationEnd: isRightSideAttacker ? -parseAnimNumber(f.rotationEnd, parseAnimNumber(f.rotationStart, 0)) : parseAnimNumber(f.rotationEnd, parseAnimNumber(f.rotationStart, 0)),
          mirrored: isRightSideAttacker,
        }
        setAttackerWeapon(prev => [...prev, entry])
        if (lifetimeMs > 0) {
          await sleep(lifetimeMs + 100)
          setAttackerWeapon(prev => prev.filter(e => e.key !== entry.key))
        }
      })
      log(`  Weapon frames: ${activeWeaponForms.length}`)
      await sleep(maxWeaponMs)
    }

    // --- Projectile frames (lifetimeMs = flight duration) ---
    const activeProjForms = projectileFrames.filter(f => f.enabled)
    if (!shouldLunge && activeProjForms.length > 0) {
      const dir = side === 'player' ? 'left-to-right' as const : 'right-to-left' as const
      const srcRef = side === 'player' ? playerPortraitRef : creaturePortraitRef
      const tgtRef = side === 'player' ? creaturePortraitRef : playerPortraitRef
      const tgtPos = getPortraitPos(tgtRef)
      const maxProjMs = Math.max(...activeProjForms.map((f) => parseAnimNumber(f.delayMs, 0) + parseAnimNumber(f.lifetimeMs, 400)))
      log(`  Projectile frames: ${activeProjForms.length}`)
      activeProjForms.forEach(async (f) => {
        const delayMs = Math.max(0, parseAnimNumber(f.delayMs, 0))
        const lifetimeMs = Math.max(0, parseAnimNumber(f.lifetimeMs, 400))
        if (delayMs) await sleep(delayMs)
        const srcPos = getPortraitPos(srcRef)
        const url = resolveFrameUrl(f.imageSource, f.url)
        const key = ++vfxKeyRef.current
        const entry: ActiveProjectileEntry = {
          key,
          direction: dir,
          imageUrl: url || null,
          soundUrl: f.soundUrl?.trim() || undefined,
          from: {
            x: srcPos.x + (isRightSideAttacker ? -parseAnimNumber(f.offsetX, 0) : parseAnimNumber(f.offsetX, 0)),
            y: srcPos.y + parseAnimNumber(f.offsetY, 0),
          },
          to: tgtPos,
          trajectory: f.trajectory,
          durationMs: lifetimeMs,
          startSizePx: parseAnimNumber(f.startSizePx, 120),
          endSizePx: parseAnimNumber(f.endSizePx, 300),
          acceleration: parseAnimNumber(f.acceleration, 0),
          rotationStart: isRightSideAttacker ? -parseAnimNumber(f.rotationStart, 0) : parseAnimNumber(f.rotationStart, 0),
          rotationEnd: isRightSideAttacker ? -parseAnimNumber(f.rotationEnd, parseAnimNumber(f.rotationStart, 0)) : parseAnimNumber(f.rotationEnd, parseAnimNumber(f.rotationStart, 0)),
          mirrored: isRightSideAttacker,
          color: anim.impactColor,
          show: true,
        }
        setActiveProjectiles(prev => [...prev, entry])
        await sleep(lifetimeMs)
        setActiveProjectiles(prev => prev.map(p => p.key === key ? { ...p, show: false } : p))
        setTimeout(() => setActiveProjectiles(prev => prev.filter(p => p.key !== key)), 400)
      })
      await sleep(maxProjMs)
    } else if (!shouldLunge) {
      const traj = trajectoryOverride === 'auto' ? anim.projectile : trajectoryOverride
      if (traj) {
        const dir = side === 'player' ? 'left-to-right' as const : 'right-to-left' as const
        const srcRef = side === 'player' ? playerPortraitRef : creaturePortraitRef
        const tgtRef = side === 'player' ? creaturePortraitRef : playerPortraitRef
        const key = ++vfxKeyRef.current
        const tgtPos = getPortraitPos(tgtRef)
        const entry: ActiveProjectileEntry = {
          key, direction: dir, imageUrl: null,
          soundUrl: undefined,
          from: getPortraitPos(srcRef), to: tgtPos,
          trajectory: traj as 'straight' | 'arc', acceleration: 0, rotationStart: 0, rotationEnd: 0, mirrored: isRightSideAttacker, color: anim.impactColor, show: true,
        }
        setActiveProjectiles(prev => [...prev, entry])
        const flightMs = (traj === 'arc' ? PROJECTILE_SPEED * 1.25 : PROJECTILE_SPEED) * 1000 + 50
        await sleep(flightMs)
        setActiveProjectiles(prev => prev.map(p => p.key === key ? { ...p, show: false } : p))
        setTimeout(() => setActiveProjectiles(prev => prev.filter(p => p.key !== key)), 400)
        await sleep(flightMs)
      }
    }

    if (shouldLunge) {
      if (lungeDelayMs > 0) await sleep(lungeDelayMs)
      const lungeDurationMs = resolveCardMotionDurationMs(CARD_LUNGE_DURATION_MS, accelerationLunge)
      const destinationX = getCardLungeDestinationX(side, lungeGapPx)
      setCardMotion(side, destinationX, lungeDurationMs, accelerationLunge, lungeStartSpeed)
      await sleep(lungeDurationMs)
      usedLunge = true
    }

    // --- Block frames (if blocked) ---
    if (isBlocked) {
      const activeBlockForms = blockFrames.filter(f => f.enabled)
      if (activeBlockForms.length > 0) {
        const maxBlockMs = Math.max(...activeBlockForms.map((f) => parseAnimNumber(f.delayMs, 0) + parseAnimNumber(f.showMs, 320) + parseAnimNumber(f.vanishMs, 480)))
        log(`  Block frames: ${activeBlockForms.length}`)
        activeBlockForms.forEach(async (f) => {
          const url = resolveFrameUrl(f.imageSource, f.url)
          if (!url) return
          const delayMs = Math.max(0, parseAnimNumber(f.delayMs, 0))
          if (delayMs) await sleep(delayMs)
          const entry: ActiveBlockFrameEntry = {
            key: ++vfxKeyRef.current,
            side: defenderSide,
            url,
            soundUrl: f.soundUrl?.trim() || undefined,
            showMs: parseAnimNumber(f.showMs, 320),
            vanishMs: parseAnimNumber(f.vanishMs, 480),
            startSizePx: parseAnimNumber(f.startSizePx, 100),
            endSizePx: parseAnimNumber(f.endSizePx, 140),
            offsetX: isRightSideDefender ? -parseAnimNumber(f.offsetX, 0) : parseAnimNumber(f.offsetX, 0),
            offsetY: parseAnimNumber(f.offsetY, 0),
            rotationStart: isRightSideDefender ? -parseAnimNumber(f.rotationStart, 0) : parseAnimNumber(f.rotationStart, 0),
            rotationEnd: isRightSideDefender ? -parseAnimNumber(f.rotationEnd, parseAnimNumber(f.rotationStart, 0)) : parseAnimNumber(f.rotationEnd, parseAnimNumber(f.rotationStart, 0)),
            mirrored: isRightSideDefender,
          }
          setActiveBlockFrames(prev => [...prev, entry])
        })
        dmgKeyRef.current++
        setTgtDmg({ value: 0, type: 'block', key: dmgKeyRef.current })
        log(`  Blocked! (0 damage)`)
        await sleep(maxBlockMs)
      }
      setActiveBlockFrames([])
    } else {
      // --- Impact frames (normal hit) ---
      const activeImpactForms = impactFrames.filter(f => f.enabled)
      if (activeImpactForms.length > 0) {
        const maxImpactMs = Math.max(...activeImpactForms.map((f) => parseAnimNumber(f.delayMs, 0) + parseAnimNumber(f.showMs, 90) + parseAnimNumber(f.vanishMs, 510)))
        log(`  Impact frames: ${activeImpactForms.length}`)
        activeImpactForms.forEach(async (f) => {
          const url = resolveFrameUrl(f.imageSource, f.url)
          if (!url) return
          const delayMs = Math.max(0, parseAnimNumber(f.delayMs, 0))
          if (delayMs) await sleep(delayMs)
          const entry: ActiveImpactFrameEntry = {
            key: ++vfxKeyRef.current,
            url,
            soundUrl: f.soundUrl?.trim() || undefined,
            showMs: parseAnimNumber(f.showMs, 90),
            vanishMs: parseAnimNumber(f.vanishMs, 510),
            startSizePx: parseAnimNumber(f.startSizePx, 60),
            endSizePx: parseAnimNumber(f.endSizePx, 140),
            offsetX: isRightSideDefender ? -parseAnimNumber(f.offsetX, 0) : parseAnimNumber(f.offsetX, 0),
            offsetY: parseAnimNumber(f.offsetY, 0),
            endOffsetX: isRightSideDefender ? -parseAnimNumber(f.endOffsetX, parseAnimNumber(f.offsetX, 0)) : parseAnimNumber(f.endOffsetX, parseAnimNumber(f.offsetX, 0)),
            endOffsetY: parseAnimNumber(f.endOffsetY, parseAnimNumber(f.offsetY, 0)),
            acceleration: parseAnimNumber(f.acceleration, 0),
            rotationStart: isRightSideDefender ? -parseAnimNumber(f.rotationStart, 0) : parseAnimNumber(f.rotationStart, 0),
            rotationEnd: isRightSideDefender ? -parseAnimNumber(f.rotationEnd, parseAnimNumber(f.rotationStart, 0)) : parseAnimNumber(f.rotationEnd, parseAnimNumber(f.rotationStart, 0)),
            mirrored: isRightSideDefender,
          }
          setTargetImpactFrames(prev => [...prev, entry])
        })
        const dmgValue = Math.floor(Math.random() * 30) + 5
        setTgtImpact(true)
        if (targetCardAnimation === 'hit') setTgtVar('hit')
        else setTgtVar('idle')
        dmgKeyRef.current++
        setTgtDmg({ value: dmgValue, type: 'damage', key: dmgKeyRef.current })
        log(`  Impact → ${dmgValue} damage`)
        await sleep(maxImpactMs)
      } else {
        const dmgValue = Math.floor(Math.random() * 30) + 5
        setTgtImpact(true)
        if (targetCardAnimation === 'hit') setTgtVar('hit')
        else setTgtVar('idle')
        dmgKeyRef.current++
        setTgtDmg({ value: dmgValue, type: 'damage', key: dmgKeyRef.current })
        log(`  Impact → ${dmgValue} damage`)
        await sleep(350)
      }
    }

    setAttackerWeapon([])
    setTargetImpactFrames([])
    setActiveBlockFrames([])
    setTgtImpact(false)
    if (usedLunge) {
      const returnDurationMs = resolveCardMotionDurationMs(CARD_RETURN_DURATION_MS, accelerationReturn)
      setCardMotion(side, 0, returnDurationMs, accelerationReturn)
      await sleep(returnDurationMs)
    } else {
      setAttVar('return')
      await sleep(280)
    }
    setTgtVar('idle')
    setAttVar('idle')
    setTgtDmg(null)
  }, [
    log,
    weaponFrames,
    projectileFrames,
    impactFrames,
    blockFrames,
    simulateBlock,
    trajectoryOverride,
    resolveFrameUrl,
    getPortraitPos,
    attackerCardAnimation,
    targetCardAnimation,
    lungeGapPx,
    lungeDelayMs,
    lungeStartSpeed,
    accelerationLunge,
    accelerationReturn,
    getCardLungeDestinationX,
    setCardMotion,
  ])

  const handlePlay = useCallback(async () => {
    if (playing) return
    setPlaying(true)
    setPlayerCardOffsetX(0)
    setCreatureCardOffsetX(0)
    setLogLines([])
    await runAttack('player', attackerAnim, attackerStyle)
    await sleep(400)
    await runAttack('creature', defenderAnim, defenderStyle)
    log('Sequence complete.')
    setPlaying(false)
  }, [playing, attackerAnim, defenderAnim, attackerStyle, defenderStyle, runAttack, log])

  const handlePlayerAttack = useCallback(async () => {
    if (playing) return
    setPlaying(true)
    setPlayerCardOffsetX(0)
    setCreatureCardOffsetX(0)
    await runAttack('player', attackerAnim, attackerStyle)
    setPlaying(false)
  }, [playing, attackerAnim, attackerStyle, runAttack])

  const handleCreatureAttack = useCallback(async () => {
    if (playing) return
    setPlaying(true)
    setPlayerCardOffsetX(0)
    setCreatureCardOffsetX(0)
    await runAttack('creature', defenderAnim, defenderStyle)
    setPlaying(false)
  }, [playing, defenderAnim, defenderStyle, runAttack])

  const handleGalleryReplay = useCallback(() => {
    setGalleryPlaying(false)
    setTimeout(() => {
      setGalleryKey((k) => k + 1)
      setGalleryPlaying(true)
      setTimeout(() => setGalleryPlaying(false), 600)
    }, 50)
  }, [])

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', py: 4, px: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h4" fontWeight={800}>Animation Test Bench</Typography>
        <Typography variant="body2" color="text.secondary">
          Pick attack styles, configure multiple particles per phase, fire them, and preview every impact effect.
        </Typography>
      </Box>

      {/* Style selectors */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Attacker Style</InputLabel>
          <Select value={attackerStyle} label="Attacker Style" onChange={(e) => setAttackerStyle(e.target.value)}>
            {styleIds.map((id) => <MenuItem key={id} value={id}>{id}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Defender Style</InputLabel>
          <Select value={defenderStyle} label="Defender Style" onChange={(e) => setDefenderStyle(e.target.value)}>
            {styleIds.map((id) => <MenuItem key={id} value={id}>{id}</MenuItem>)}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip size="small" label={`caster card: ${attackerCardAnimation}`} color="info" variant="outlined" />
          <Chip size="small" label={`target card: ${targetCardAnimation}`} color="info" variant="outlined" />
          <Chip size="small" label={`projectile: ${attackerAnim.projectile ?? 'none'}`} color={attackerAnim.projectile ? 'success' : 'default'} variant="outlined" />
          <Chip size="small" label="impact: generic" sx={{ borderColor: attackerAnim.impactColor, color: attackerAnim.impactColor }} variant="outlined" />
        </Box>
      </Paper>

      {/* Portrait URLs */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" label="Player portrait URL" value={playerPortraitUrl} onChange={(e) => setPlayerPortraitUrl(e.target.value)} sx={{ minWidth: 280, flex: 1 }} />
        <TextField size="small" label="Creature portrait URL" value={creaturePortraitUrl} onChange={(e) => setCreaturePortraitUrl(e.target.value)} sx={{ minWidth: 280, flex: 1 }} />
        {(playerPortraitUrl || creaturePortraitUrl) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
            {playerPortraitUrl && <img src={playerPortraitUrl} alt="player" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />}
            {creaturePortraitUrl && <img src={creaturePortraitUrl} alt="creature" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />}
          </Box>
        )}
      </Paper>

      {/* Equipment URLs */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField size="small" label="Weapon icon URL" value={weaponUrl} onChange={(e) => setWeaponUrl(e.target.value)} sx={{ minWidth: 280, flex: 1 }} helperText='Used when frame uses "Weapon icon".' />
        <TextField size="small" label="Weapon animation URL" value={weaponAnimationUrl} onChange={(e) => setWeaponAnimationUrl(e.target.value)} sx={{ minWidth: 280, flex: 1 }} helperText='Tip must face up. Used by "Weapon animation".' />
        <TextField size="small" label="Weapon projectile URL" value={weaponProjectileUrl} onChange={(e) => setWeaponProjectileUrl(e.target.value)} sx={{ minWidth: 260, flex: 1 }} />
        <TextField size="small" label="Weapon impact URL" value={weaponImpactUrl} onChange={(e) => setWeaponImpactUrl(e.target.value)} sx={{ minWidth: 260, flex: 1 }} />
        <TextField size="small" label="Defense icon URL" value={defenseUrl} onChange={(e) => setDefenseUrl(e.target.value)} sx={{ minWidth: 280, flex: 1 }} helperText='Used when frame uses "Defense icon".' />
        <TextField size="small" label="Defense animation URL" value={defenseAnimationUrl} onChange={(e) => setDefenseAnimationUrl(e.target.value)} sx={{ minWidth: 280, flex: 1 }} helperText='Used by "Defense animation".' />
        <TextField size="small" label="Defense projectile URL" value={defenseProjectileUrl} onChange={(e) => setDefenseProjectileUrl(e.target.value)} sx={{ minWidth: 260, flex: 1 }} />
        <TextField size="small" label="Defense impact URL" value={defenseImpactUrl} onChange={(e) => setDefenseImpactUrl(e.target.value)} sx={{ minWidth: 260, flex: 1 }} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Fallback trajectory</InputLabel>
          <Select value={trajectoryOverride} label="Fallback trajectory" onChange={(e) => setTrajectoryOverride(e.target.value as 'auto' | 'straight' | 'arc')}>
            <MenuItem value="auto">Auto (from style)</MenuItem>
            <MenuItem value="straight">Straight</MenuItem>
            <MenuItem value="arc">Arc</MenuItem>
          </Select>
        </FormControl>
        {(weaponUrl || weaponAnimationUrl || weaponProjectileUrl || weaponImpactUrl || defenseUrl || defenseAnimationUrl || defenseProjectileUrl || defenseImpactUrl) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, flexWrap: 'wrap' }}>
            {weaponUrl && <><img src={weaponUrl} alt="icon" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Icon</Typography></>}
            {weaponAnimationUrl && weaponAnimationUrl !== weaponUrl && <><img src={weaponAnimationUrl} alt="anim" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Anim</Typography></>}
            {weaponProjectileUrl && <><img src={weaponProjectileUrl} alt="proj" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Projectile</Typography></>}
            {weaponImpactUrl && <><img src={weaponImpactUrl} alt="impact" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Impact</Typography></>}
            {defenseUrl && <><img src={defenseUrl} alt="defense icon" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Defense Icon</Typography></>}
            {defenseAnimationUrl && defenseAnimationUrl !== defenseUrl && <><img src={defenseAnimationUrl} alt="defense anim" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Defense Anim</Typography></>}
            {defenseProjectileUrl && <><img src={defenseProjectileUrl} alt="defense projectile" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Defense Projectile</Typography></>}
            {defenseImpactUrl && <><img src={defenseImpactUrl} alt="defense impact" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Defense Impact</Typography></>}
          </Box>
        )}
      </Paper>

      {/* Animation Frames */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>Animation Frames</Typography>
          <Typography variant="body2" color="text.secondary">
            This uses the same frame schema and serializer as create/edit, so imported ability JSON round-trips without animation drift.
          </Typography>
        </Box>
        <AbilityAnimationEditor
          animFrames={animFrames}
          onChange={setAnimFrames}
          isReactive={abilityType === 'reactive'}
        />
        <FormControlLabel
          control={<Checkbox checked={simulateBlock} onChange={(e) => setSimulateBlock(e.target.checked)} size="small" />}
          label={<Typography variant="body2">Simulate avoid/block on next attack</Typography>}
          sx={{ ml: 0.5 }}
        />
      </Paper>

      {/* Status animation test */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>Status Animation Test</Typography>
        <Typography variant="body2" color="text.secondary">
          Configure status particles, then simulate apply/tick behavior. Loop particles stay while status is active; non-loop particles fire once per event.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Status holder</InputLabel>
            <Select
              value={statusHolderSide}
              label="Status holder"
              onChange={(e) => setStatusHolderSide(e.target.value as 'player' | 'creature')}
            >
              <MenuItem value="player">Player</MenuItem>
              <MenuItem value="creature">Creature</MenuItem>
            </Select>
          </FormControl>
          <Chip size="small" color={statusApplied ? 'success' : 'default'} label={statusApplied ? 'Applied' : 'Not applied'} />
          <Button variant="contained" onClick={handleApplyStatus}>Apply Status</Button>
          <Button variant="outlined" onClick={handleStatusTick} disabled={!statusApplied}>Trigger Tick</Button>
          <Button variant="outlined" color="error" onClick={handleClearStatus}>Clear Status</Button>
        </Box>
        <StatusAnimationEditor particles={statusParticles} onChange={setStatusParticles} />
      </Paper>

      {/* Ability Properties */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>Ability Properties</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" label="ID" value={abilityId} onChange={(e) => setAbilityId(e.target.value)} sx={{ width: 160 }} />
          <TextField size="small" label="Name" value={abilityName} onChange={(e) => setAbilityName(e.target.value)} sx={{ width: 180 }} />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select value={abilityType} label="Type" onChange={(e) => setAbilityType(e.target.value as typeof abilityType)}>
              {ABILITY_TYPES.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Description" value={abilityDescription} onChange={(e) => setAbilityDescription(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
          <TextField size="small" label="Icon URL" value={abilityIconUrl} onChange={(e) => setAbilityIconUrl(e.target.value)} sx={{ width: 200 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <NumField label="Cooldown (turns)" value={cooldownTurns} onChange={(v) => setCooldownTurns(Math.max(0, v))} min={0} max={20} step={1} />
          <TextField size="small" label="Resource cost ID" value={resourceCostId} onChange={(e) => setResourceCostId(e.target.value)} sx={{ width: 140 }} />
          <NumField label="Cost amount" value={resourceCostAmount} onChange={(v) => setResourceCostAmount(Math.max(0, v))} min={0} max={999} step={1} />
          <NumField label="Unlock cost (AP)" value={unlockCost} onChange={(v) => setUnlockCost(Math.max(0, v))} min={0} max={20} step={1} />
          <NumField label="Min level" value={minLevel} onChange={(v) => setMinLevel(Math.max(1, v))} min={1} max={99} step={1} />
          <TextField
            size="small"
            label="Required item tags (any)"
            value={requiredItemTagsAny}
            onChange={(e) => setRequiredItemTagsAny(e.target.value)}
            placeholder="weapon:sword, weapon:axe"
            helperText="Ability usable when any equipped item has one of these tags"
            sx={{ minWidth: 320, flex: 1 }}
          />
        </Box>
        <Divider />
        <Typography variant="subtitle2" fontWeight={600} color="text.secondary">Effects</Typography>
        <EffectsEditor
          effects={effects}
          onChange={setEffects}
          mainStatIds={mainStatIds}
          fallbackMainStatId={fallbackMainStatId}
          statusEffectOptions={(selectedRealmPack?.statusEffects ?? []).map((status) => ({ id: status.id, name: status.name }))}
          creatureOptions={(selectedRealmPack?.creatures ?? []).map((creature) => ({ id: creature.id, name: creature.name }))}
        />
        {abilityType === 'passive' && (
          <>
            <Divider />
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">Passive Derived Stat Modifiers</Typography>
            {derivedStatModifiers.map((mod, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 240 }}>
                  <InputLabel>Derived stat</InputLabel>
                  <Select
                    value={mod.statId}
                    label="Derived stat"
                    onChange={(e) => setDerivedStatModifiers((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, statId: e.target.value as DerivedStatId } : entry))}
                  >
                    {DERIVED_STATS.map((stat) => <MenuItem key={stat.id} value={stat.id}>{stat.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  label="Flat"
                  type="number"
                  value={mod.flat}
                  onChange={(e) => setDerivedStatModifiers((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, flat: e.target.value } : entry))}
                  sx={{ width: 110 }}
                />
                <TextField
                  size="small"
                  label="Percent"
                  type="number"
                  value={mod.percent}
                  onChange={(e) => setDerivedStatModifiers((prev) => prev.map((entry, entryIndex) => entryIndex === index ? { ...entry, percent: e.target.value } : entry))}
                  sx={{ width: 110 }}
                />
                <IconButton size="small" color="error" onClick={() => setDerivedStatModifiers((prev) => prev.filter((_, entryIndex) => entryIndex !== index))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button variant="outlined" size="small" onClick={() => setDerivedStatModifiers((prev) => [...prev, emptyDerivedModifier()])}>
              Add passive modifier
            </Button>
          </>
        )}
        {abilityType === 'reactive' && (
          <>
            <Divider />
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">Reactive Config</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel>Trigger timing</InputLabel>
                <Select
                  value={reactiveTriggerTiming}
                  label="Trigger timing"
                  onChange={(e) => setReactiveTriggerTiming(e.target.value as (typeof REACTIVE_TRIGGER_TIMINGS)[number])}
                >
                  {REACTIVE_TRIGGER_TIMINGS.map((timing) => <MenuItem key={timing} value={timing}>{timing}</MenuItem>)}
                </Select>
              </FormControl>
              <NumField
                label="Priority"
                value={reactivePriority}
                onChange={(v) => setReactivePriority(v)}
                min={-100}
                max={100}
                step={1}
                width={120}
                helperText="higher resolves first"
              />
              <NumField
                label="Max triggers / turn"
                value={reactiveMaxTriggersPerTurn}
                onChange={(v) => setReactiveMaxTriggersPerTurn(Math.max(0, v))}
                min={0}
                max={20}
                step={1}
                width={160}
                helperText="0 = unlimited"
              />
            </Box>
          </>
        )}
      </Paper>

      {/* Import / Export JSON */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>Import / Export JSON</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Button variant="contained" color="primary" onClick={handleExportJson}>Copy Ability JSON to Clipboard</Button>
          <Button variant="outlined" onClick={() => {
            const json = JSON.stringify(buildAbilityJson(), null, 2)
            setJsonImportText(json)
          }}>Preview JSON</Button>
        </Box>
        <Divider />
        <Typography variant="subtitle2" fontWeight={600} color="text.secondary">Add / Update In Realm</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Fable</InputLabel>
            <Select value={selectedFableId} label="Fable" onChange={(e) => setSelectedFableId(e.target.value)}>
              {fables.map((fable) => <MenuItem key={fable.id} value={fable.id}>{fable.name || fable.id}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 240 }} disabled={!selectedFableId || realms.length === 0}>
            <InputLabel>Realm</InputLabel>
            <Select value={selectedRealmId} label="Realm" onChange={(e) => setSelectedRealmId(e.target.value)}>
              {realms.map((realm) => <MenuItem key={realm.id} value={realm.id}>{realm.id}</MenuItem>)}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="success"
            onClick={handleAddAbilityToRealm}
            disabled={!selectedFableId || !selectedRealmId || publishingAbility}
          >
            {publishingAbility ? 'Saving...' : 'Add / Update Ability'}
          </Button>
        </Box>
        {publishMessage && (
          <Typography
            variant="body2"
            color={publishMessage.startsWith('Failed') ? 'error.main' : 'success.main'}
          >
            {publishMessage}
          </Typography>
        )}
        <TextField
          multiline
          minRows={3}
          maxRows={12}
          size="small"
          label="Paste ability JSON here to import"
          value={jsonImportText}
          onChange={(e) => setJsonImportText(e.target.value)}
          sx={{ fontFamily: 'monospace', fontSize: 12 }}
          InputProps={{ sx: { fontFamily: 'monospace', fontSize: 12 } }}
        />
        {jsonImportText.trim() && (
          <Button variant="contained" color="secondary" onClick={handleImportJson} sx={{ alignSelf: 'flex-start' }}>Import JSON</Button>
        )}
      </Paper>

      {/* Arena */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#0d0b14', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">Arena</Typography>
        <Box
          ref={arenaRef}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: { xs: 3, md: ARENA_CARD_GAP },
            position: 'relative',
          }}
        >
          {/* Projectile layer */}
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
                trajectory={p.trajectory}
                durationMs={p.durationMs}
                startSizePx={p.startSizePx}
                endSizePx={p.endSizePx}
                acceleration={p.acceleration}
                rotationStart={p.rotationStart}
                rotationEnd={p.rotationEnd}
                mirrored={p.mirrored}
                from={p.from}
                to={p.to}
              />
            ))}
          </AnimatePresence>

          <CombatantCard
            ref={playerPortraitRef}
            cardRef={playerCardRef}
            side="player"
            label="Player"
            variant={playerVariant}
            variants={playerVariants}
            cardOffsetX={playerCardOffsetX}
            cardTransition={playerCardTransition}
            showImpact={showPlayerImpact}
            impactStyle="generic"
            impactColor={defenderAnim.impactColor}
            impactKey={dmgKeyRef.current}
            dmg={playerDmg}
            activeWeaponFrames={playerActiveWeapon}
            activeImpactFrames={playerActiveImpact}
            activeBlockFrames={activeBlockFrames.filter(f => f.side === 'player')}
            activeStatusLoopParticles={activeStatusLoopParticles.filter(p => p.side === 'player')}
            activeStatusBurstParticles={activeStatusBurstParticles.filter(p => p.side === 'player')}
            portraitUrl={playerPortraitUrl || undefined}
          />

          <Box sx={{ alignSelf: 'center', width: VS_WIDTH, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

          <CombatantCard
            ref={creaturePortraitRef}
            cardRef={creatureCardRef}
            side="creature"
            label="Creature"
            variant={creatureVariant}
            variants={creatureVariants}
            cardOffsetX={creatureCardOffsetX}
            cardTransition={creatureCardTransition}
            showImpact={showCreatureImpact}
            impactStyle="generic"
            impactColor={attackerAnim.impactColor}
            impactKey={dmgKeyRef.current}
            dmg={creatureDmg}
            activeWeaponFrames={creatureActiveWeapon}
            activeImpactFrames={creatureActiveImpact}
            activeBlockFrames={activeBlockFrames.filter(f => f.side === 'creature')}
            activeStatusLoopParticles={activeStatusLoopParticles.filter(p => p.side === 'creature')}
            activeStatusBurstParticles={activeStatusBurstParticles.filter(p => p.side === 'creature')}
            portraitUrl={creaturePortraitUrl || undefined}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={handlePlay} disabled={playing}>Play Both</Button>
          <Button variant="outlined" onClick={handlePlayerAttack} disabled={playing}>Player Attack</Button>
          <Button variant="outlined" color="error" onClick={handleCreatureAttack} disabled={playing}>Creature Attack</Button>
        </Box>
      </Paper>

      {/* Event log */}
      {logLines.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, maxHeight: 200, overflow: 'auto', bgcolor: '#1e1e1e' }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#888', mb: 0.5, fontSize: 11 }}>Event Log</Typography>
          {logLines.map((line, i) => (
            <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11, color: '#ccc', lineHeight: 1.6 }}>{line}</Typography>
          ))}
        </Paper>
      )}

      <Divider />

      {/* Impact gallery */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>Impact Gallery</Typography>
          <Button size="small" variant="outlined" onClick={handleGalleryReplay}>Replay All</Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {ALL_IMPACT_STYLES.map((style) => {
            const colorByStyle: Record<string, string> = {
              slash: '#ef5350', punch: '#ff9800', flail: '#b0bec5', arrow: '#8d6e63', bolt: '#7c4dff', generic: '#fff',
            }
            const color = colorByStyle[style] ?? '#fff'
            return (
              <Paper key={`${style}-${galleryKey}`} variant="outlined" sx={{ width: 120, height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.03)', position: 'relative' }}>
                <Box sx={{ position: 'relative', width: 64, height: 64 }}>
                  <ImpactEffect show={galleryPlaying} style={style} color={color} id={`gallery-${style}-${galleryKey}`} />
                  {!galleryPlaying && (
                    <Box sx={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
                      <Typography variant="caption">click replay</Typography>
                    </Box>
                  )}
                </Box>
                <Typography variant="caption" fontWeight={600}>{style}</Typography>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, border: '1px solid rgba(0,0,0,0.1)' }} />
              </Paper>
            )
          })}
        </Box>
      </Box>

      {/* Style reference table */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Style Reference</Typography>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'monospace' }}>
          <thead>
            <tr>
              {['styleId', 'projectile', 'color', 'duration'].map((h) => (
                <Box component="th" key={h} sx={{ textAlign: 'left', pb: 1, pr: 2, borderBottom: '1px solid', borderColor: 'divider', fontWeight: 700 }}>{h}</Box>
              ))}
            </tr>
          </thead>
          <tbody>
            {STYLE_IDS.map((id) => {
              const a = getAttackAnimationConfig(id)
              return (
                <tr key={id}>
                  <Box component="td" sx={{ py: 0.5, pr: 2 }}>{id}</Box>
                  <Box component="td" sx={{ py: 0.5, pr: 2 }}>{a.projectile ?? '—'}</Box>
                  <Box component="td" sx={{ py: 0.5, pr: 2 }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: a.impactColor }} />
                      {a.impactColor}
                    </Box>
                  </Box>
                  <Box component="td" sx={{ py: 0.5, pr: 2 }}>{a.sequenceDurationMs}ms</Box>
                </tr>
              )
            })}
          </tbody>
        </Box>
      </Paper>
    </Box>
  )
}
