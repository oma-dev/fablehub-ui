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
import StatusAnimationEditor, {
  type StatusParticleForm,
  createEmptyStatusParticle,
} from '../../routes/Fables/expressions/IdleRPG/components/StatusAnimationEditor'
import SoundUploadButton from '../../routes/Fables/expressions/IdleRPG/components/SoundUploadButton'
import charBackground from '../../../assets/backgrounds/charBackground.png'

const styleIds = [...STYLE_IDS]
const ALL_IMPACT_STYLES: ImpactStyle[] = ['slash', 'punch', 'flail', 'arrow', 'bolt', 'generic']

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

export default function AnimationTest() {
  const [attackerStyle, setAttackerStyle] = useState(styleIds[0])
  const [defenderStyle, setDefenderStyle] = useState(styleIds[0])
  const [weaponUrl, setWeaponUrl] = useState('https://bg3.wiki/w/images/c/ca/Flail_Unfaded.png')
  const [weaponAnimationUrl, setWeaponAnimationUrl] = useState('https://bg3.wiki/w/images/0/0f/Quarterstaff_Unfaded.png')
  const [weaponProjectileUrl, setWeaponProjectileUrl] = useState('')
  const [weaponImpactUrl, setWeaponImpactUrl] = useState('')
  const [playerPortraitUrl, setPlayerPortraitUrl] = useState('')
  const [creaturePortraitUrl, setCreaturePortraitUrl] = useState('')
  const [trajectoryOverride, setTrajectoryOverride] = useState<'auto' | 'straight' | 'arc'>('auto')
  const [attackerCardAnimation, setAttackerCardAnimation] = useState<'none' | 'cast' | 'lunge'>('cast')
  const [targetCardAnimation, setTargetCardAnimation] = useState<'none' | 'hit'>('hit')
  const [lungeGapPx, setLungeGapPx] = useState(0)
  const [lungeDelayMs, setLungeDelayMs] = useState(0)
  const [lungeStartSpeed, setLungeStartSpeed] = useState(0)
  const [accelerationLunge, setAccelerationLunge] = useState(0)
  const [accelerationReturn, setAccelerationReturn] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [logLines, setLogLines] = useState<string[]>([])

  // Array-based frame forms
  const [weaponFrames, setWeaponFrames] = useState<WeaponFrameForm[]>([defaultWeaponFrame()])
  const [projectileFrames, setProjectileFrames] = useState<ProjectileFrameForm[]>([defaultProjectileFrame()])
  const [impactFrames, setImpactFrames] = useState<ImpactFrameForm[]>([defaultImpactFrame()])
  const [blockFrames, setBlockFrames] = useState<BlockFrameForm[]>([])
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
  const [effectKind, setEffectKind] = useState<'damage' | 'heal' | 'apply_status' | 'execute' | 'lifesteal' | 'summon'>('damage')
  const [effectAmount, setEffectAmount] = useState(0)
  const [effectPercentage, setEffectPercentage] = useState(0)
  const [effectLifestealPct, setEffectLifestealPct] = useState(0)
  const [reactiveBaseChance, setReactiveBaseChance] = useState(0.2)
  const [reactiveScalingStat, setReactiveScalingStat] = useState('')
  const [reactiveScalingCoeff, setReactiveScalingCoeff] = useState(0)
  const [jsonImportText, setJsonImportText] = useState('')

  const EFFECT_KINDS = ['damage', 'heal', 'apply_status', 'execute', 'lifesteal', 'summon'] as const
  const STAT_IDS = ['STR', 'DEX', 'INT', 'LCK', 'HP', 'ARM'] as const
  const ABILITY_TYPES: typeof abilityType[] = ['primary', 'regular', 'passive', 'ultimate', 'reactive']

  const buildAbilityJson = useCallback(() => {
    const buildFrames = () => {
      const w = weaponFrames.filter(f => f.enabled).map(f => ({
        ...(f.imageSource !== 'url' ? { imageSource: f.imageSource } : {}),
        ...(f.url.trim() ? { url: f.url.trim() } : {}),
        ...(f.soundUrl.trim() ? { soundUrl: f.soundUrl.trim() } : {}),
        ...(f.delayMs > 0 ? { delayMs: f.delayMs } : {}),
        ...(f.fadeInMs !== 200 ? { fadeInMs: f.fadeInMs } : {}),
        ...(f.lifetimeMs > 0 ? { lifetimeMs: f.lifetimeMs } : {}),
        startSizePx: f.startSizePx, endSizePx: f.endSizePx,
        ...(f.offsetX !== 0 ? { offsetX: f.offsetX } : {}),
        ...(f.offsetY !== 0 ? { offsetY: f.offsetY } : {}),
        ...(f.endOffsetX !== f.offsetX ? { endOffsetX: f.endOffsetX } : {}),
        ...(f.endOffsetY !== f.offsetY ? { endOffsetY: f.endOffsetY } : {}),
        ...(f.acceleration !== 0 ? { acceleration: f.acceleration } : {}),
        ...(f.rotationStart !== 0 ? { rotationStart: f.rotationStart } : {}),
        ...(f.rotationEnd !== f.rotationStart ? { rotationEnd: f.rotationEnd } : {}),
      }))
      const p = projectileFrames.filter(f => f.enabled).map(f => ({
        ...(f.imageSource !== 'url' ? { imageSource: f.imageSource } : {}),
        ...(f.url.trim() ? { url: f.url.trim() } : {}),
        ...(f.soundUrl.trim() ? { soundUrl: f.soundUrl.trim() } : {}),
        ...(f.delayMs > 0 ? { delayMs: f.delayMs } : {}),
        trajectory: f.trajectory,
        ...(f.lifetimeMs > 0 ? { lifetimeMs: f.lifetimeMs } : {}),
        startSizePx: f.startSizePx, endSizePx: f.endSizePx,
        ...(f.offsetX !== 0 ? { offsetX: f.offsetX } : {}),
        ...(f.offsetY !== 0 ? { offsetY: f.offsetY } : {}),
        ...(f.acceleration !== 0 ? { acceleration: f.acceleration } : {}),
        ...(f.rotationStart !== 0 ? { rotationStart: f.rotationStart } : {}),
        ...(f.rotationEnd !== f.rotationStart ? { rotationEnd: f.rotationEnd } : {}),
      }))
      const im = impactFrames.filter(f => f.enabled).map(f => ({
        ...(f.imageSource !== 'url' ? { imageSource: f.imageSource } : {}),
        ...(f.url.trim() ? { url: f.url.trim() } : {}),
        ...(f.soundUrl.trim() ? { soundUrl: f.soundUrl.trim() } : {}),
        ...(f.delayMs > 0 ? { delayMs: f.delayMs } : {}),
        ...(f.showMs > 0 ? { showMs: f.showMs } : {}),
        ...(f.vanishMs > 0 ? { vanishMs: f.vanishMs } : {}),
        ...(f.lifetimeMs > 0 ? { lifetimeMs: f.lifetimeMs } : {}),
        startSizePx: f.startSizePx, endSizePx: f.endSizePx,
        ...(f.offsetX !== 0 ? { offsetX: f.offsetX } : {}),
        ...(f.offsetY !== 0 ? { offsetY: f.offsetY } : {}),
        ...(f.endOffsetX !== f.offsetX ? { endOffsetX: f.endOffsetX } : {}),
        ...(f.endOffsetY !== f.offsetY ? { endOffsetY: f.endOffsetY } : {}),
        ...(f.acceleration !== 0 ? { acceleration: f.acceleration } : {}),
        ...(f.rotationStart !== 0 ? { rotationStart: f.rotationStart } : {}),
        ...(f.rotationEnd !== f.rotationStart ? { rotationEnd: f.rotationEnd } : {}),
      }))
      const b = blockFrames.filter(f => f.enabled).map(f => ({
        ...(f.imageSource !== 'url' ? { imageSource: f.imageSource } : {}),
        ...(f.url.trim() ? { url: f.url.trim() } : {}),
        ...(f.soundUrl.trim() ? { soundUrl: f.soundUrl.trim() } : {}),
        ...(f.delayMs > 0 ? { delayMs: f.delayMs } : {}),
        ...(f.startBeforeImpactMs > 0 ? { startBeforeImpactMs: f.startBeforeImpactMs } : {}),
        ...(f.showMs > 0 ? { showMs: f.showMs } : {}),
        ...(f.vanishMs > 0 ? { vanishMs: f.vanishMs } : {}),
        ...(f.lifetimeMs > 0 ? { lifetimeMs: f.lifetimeMs } : {}),
        startSizePx: f.startSizePx, endSizePx: f.endSizePx,
        ...(f.offsetX !== 0 ? { offsetX: f.offsetX } : {}),
        ...(f.offsetY !== 0 ? { offsetY: f.offsetY } : {}),
        ...(f.rotationStart !== 0 ? { rotationStart: f.rotationStart } : {}),
        ...(f.rotationEnd !== f.rotationStart ? { rotationEnd: f.rotationEnd } : {}),
      }))
      const card = {
        attacker: attackerCardAnimation,
        target: targetCardAnimation,
        ...(lungeGapPx !== 0 ? { lungeGapPx } : {}),
        ...(lungeDelayMs !== 0 ? { lungeDelayMs } : {}),
        ...(lungeStartSpeed !== 0 ? { lungeStartSpeed } : {}),
        ...(accelerationLunge !== 0 ? { accelerationLunge } : {}),
        ...(accelerationReturn !== 0 ? { accelerationReturn } : {}),
      }
      const hasDefaultCard =
        card.attacker === 'cast'
        && card.target === 'hit'
        && card.lungeGapPx == null
        && card.lungeDelayMs == null
        && card.lungeStartSpeed == null
        && card.accelerationLunge == null
        && card.accelerationReturn == null
      if (!w.length && !p.length && !im.length && !b.length && hasDefaultCard) return undefined
      return {
        ...(w.length ? { weapon: w } : {}),
        ...(p.length ? { projectile: p } : {}),
        ...(im.length ? { impact: im } : {}),
        ...(b.length ? { block: b } : {}),
        ...(hasDefaultCard ? {} : { card }),
      }
    }
    const ability: Record<string, unknown> = {
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
      ...(minLevel > 1 ? { requirements: { minLevel } } : {}),
      effects: [{
        kind: effectKind,
        ...(effectAmount > 0 ? { amount: effectAmount } : {}),
        ...(effectPercentage > 0 ? { percentage: effectPercentage } : {}),
        ...(effectKind === 'lifesteal' && effectLifestealPct > 0 ? { lifestealPercent: effectLifestealPct } : {}),
      }],
    }
    if (abilityType === 'reactive') {
      ability.reactiveConfig = {
        baseChance: reactiveBaseChance,
        ...(reactiveScalingStat ? { scalingStat: reactiveScalingStat } : {}),
        ...(reactiveScalingCoeff > 0 ? { scalingCoeff: reactiveScalingCoeff } : {}),
      }
    }
    const frames = buildFrames()
    if (frames) ability.animationFrames = frames
    return ability
  }, [abilityId, abilityName, abilityType, abilityDescription, abilityIconUrl, cooldownTurns,
    resourceCostId, resourceCostAmount, unlockCost, minLevel, effectKind, effectAmount,
    effectPercentage, effectLifestealPct, reactiveBaseChance, reactiveScalingStat, reactiveScalingCoeff,
    weaponFrames,
    projectileFrames,
    impactFrames,
    blockFrames,
    attackerCardAnimation,
    targetCardAnimation,
    lungeGapPx,
    lungeDelayMs,
    lungeStartSpeed,
    accelerationLunge,
    accelerationReturn,
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
      const eff = data.effects?.[0] ?? data.effect
      if (eff) {
        setEffectKind(eff.kind ?? 'damage')
        setEffectAmount(eff.amount ?? 0)
        setEffectPercentage(eff.percentage ?? 0)
        setEffectLifestealPct(eff.lifestealPercent ?? 0)
      }
      if (data.reactiveConfig) {
        setReactiveBaseChance(data.reactiveConfig.baseChance ?? 0.2)
        setReactiveScalingStat(data.reactiveConfig.scalingStat ?? '')
        setReactiveScalingCoeff(data.reactiveConfig.scalingCoeff ?? 0)
      }
      const af = data.animationFrames
      if (af) {
        setWeaponFrames((af.weapon ?? []).map((f: any) => ({
          enabled: true, imageSource: f.imageSource ?? 'url', url: f.url ?? '',
          soundUrl: f.soundUrl ?? '',
          delayMs: f.delayMs ?? 0, fadeInMs: f.fadeInMs ?? 200, lifetimeMs: f.lifetimeMs ?? 0,
          startSizePx: f.startSizePx ?? f.sizePx ?? 80, endSizePx: f.endSizePx ?? f.sizePx ?? 120,
          offsetX: f.offsetX ?? 0, offsetY: f.offsetY ?? 0,
          endOffsetX: f.endOffsetX ?? f.offsetX ?? 0, endOffsetY: f.endOffsetY ?? f.offsetY ?? 0,
          acceleration: f.acceleration ?? 0,
          rotationStart: f.rotationStart ?? 0,
          rotationEnd: f.rotationEnd ?? f.rotationStart ?? 0,
        })))
        setProjectileFrames((af.projectile ?? []).map((f: any) => ({
          enabled: true, imageSource: f.imageSource ?? 'url', url: f.url ?? '',
          soundUrl: f.soundUrl ?? '',
          delayMs: f.delayMs ?? 0, lifetimeMs: f.lifetimeMs ?? f.speedMs ?? 400,
          trajectory: f.trajectory ?? 'arc',
          startSizePx: f.startSizePx ?? f.sizePx ?? 120, endSizePx: f.endSizePx ?? f.sizePx ?? 300,
          offsetX: f.offsetX ?? 0, offsetY: f.offsetY ?? 0,
          acceleration: f.acceleration ?? 0,
          rotationStart: f.rotationStart ?? 0,
          rotationEnd: f.rotationEnd ?? f.rotationStart ?? 0,
        })))
        setImpactFrames((af.impact ?? []).map((f: any) => ({
          enabled: true, imageSource: f.imageSource ?? 'url', url: f.url ?? '',
          soundUrl: f.soundUrl ?? '',
          delayMs: f.delayMs ?? 0, showMs: f.showMs ?? 90, vanishMs: f.vanishMs ?? 510,
          lifetimeMs: f.lifetimeMs ?? 600,
          startSizePx: f.startSizePx ?? f.sizePx ?? 60, endSizePx: f.endSizePx ?? f.sizePx ?? 140,
          offsetX: f.offsetX ?? 0, offsetY: f.offsetY ?? 0,
          endOffsetX: f.endOffsetX ?? f.offsetX ?? 0, endOffsetY: f.endOffsetY ?? f.offsetY ?? 0,
          acceleration: f.acceleration ?? 0,
          rotationStart: f.rotationStart ?? 0,
          rotationEnd: f.rotationEnd ?? f.rotationStart ?? 0,
        })))
        setBlockFrames((af.block ?? []).map((f: any) => ({
          enabled: true, imageSource: f.imageSource ?? 'url', url: f.url ?? '',
          soundUrl: f.soundUrl ?? '',
          delayMs: f.delayMs ?? 0, startBeforeImpactMs: f.startBeforeImpactMs ?? 0,
          showMs: f.showMs ?? 320, vanishMs: f.vanishMs ?? 480, lifetimeMs: f.lifetimeMs ?? 800,
          startSizePx: f.startSizePx ?? f.sizePx ?? 100, endSizePx: f.endSizePx ?? f.sizePx ?? 140,
          offsetX: f.offsetX ?? 0, offsetY: f.offsetY ?? 0,
          rotationStart: f.rotationStart ?? 0,
          rotationEnd: f.rotationEnd ?? f.rotationStart ?? 0,
        })))
        setAttackerCardAnimation(af.card?.attacker ?? 'cast')
        setTargetCardAnimation(af.card?.target ?? 'hit')
        setLungeGapPx(Number(af.card?.lungeGapPx ?? 0))
        setLungeDelayMs(Number(af.card?.lungeDelayMs ?? 0))
        setLungeStartSpeed(Number(af.card?.lungeStartSpeed ?? 0))
        setAccelerationLunge(Number(af.card?.accelerationLunge ?? 0))
        setAccelerationReturn(Number(af.card?.accelerationReturn ?? 0))
      }
      setJsonImportText('')
    } catch {
      alert('Invalid JSON')
    }
  }, [jsonImportText])

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
    return customUrl?.trim() || ''
  }, [weaponUrl, weaponAnimationUrl, weaponProjectileUrl, weaponImpactUrl])

  const parseStatusNumber = (value: string, fallback: number): number => {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }

  const resolveStatusParticleUrl = useCallback((particle: StatusParticleForm): string => {
    if (particle.imageSource === 'weaponIcon') return weaponUrl?.trim() || ''
    if (particle.imageSource === 'weaponAnimation') return weaponAnimationUrl?.trim() || weaponUrl?.trim() || ''
    if (particle.imageSource === 'weaponProjectile') return weaponProjectileUrl?.trim() || weaponAnimationUrl?.trim() || weaponUrl?.trim() || ''
    if (particle.imageSource === 'weaponImpact') return weaponImpactUrl?.trim() || weaponAnimationUrl?.trim() || weaponUrl?.trim() || ''
    return particle.url?.trim() || ''
  }, [weaponAnimationUrl, weaponImpactUrl, weaponProjectileUrl, weaponUrl])

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
      const maxWeaponMs = Math.max(...activeWeaponForms.map(f => f.delayMs + f.fadeInMs))
      activeWeaponForms.forEach(async (f) => {
        const url = resolveFrameUrl(f.imageSource, f.url)
        if (!url) return
        if (f.delayMs) await sleep(f.delayMs)
        const entry: ActiveWeaponFrameEntry = {
          key: ++vfxKeyRef.current,
          url,
          soundUrl: f.soundUrl?.trim() || undefined,
          fadeInMs: f.fadeInMs,
          lifetimeMs: f.lifetimeMs > 0 ? f.lifetimeMs : undefined,
          sizePx: undefined,
          startSizePx: f.startSizePx,
          endSizePx: f.endSizePx,
          offsetX: isRightSideAttacker ? -f.offsetX : f.offsetX,
          offsetY: f.offsetY,
          endOffsetX: isRightSideAttacker ? -f.endOffsetX : f.endOffsetX,
          endOffsetY: f.endOffsetY,
          acceleration: f.acceleration,
          rotationStart: isRightSideAttacker ? -f.rotationStart : f.rotationStart,
          rotationEnd: isRightSideAttacker ? -f.rotationEnd : f.rotationEnd,
          mirrored: isRightSideAttacker,
        }
        setAttackerWeapon(prev => [...prev, entry])
        if (f.lifetimeMs > 0) {
          await sleep(f.lifetimeMs + 100)
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
      const maxProjMs = Math.max(...activeProjForms.map(f => f.delayMs + f.lifetimeMs))
      log(`  Projectile frames: ${activeProjForms.length}`)
      activeProjForms.forEach(async (f) => {
        if (f.delayMs) await sleep(f.delayMs)
        const srcPos = getPortraitPos(srcRef)
        const url = resolveFrameUrl(f.imageSource, f.url)
        const key = ++vfxKeyRef.current
        const entry: ActiveProjectileEntry = {
          key,
          direction: dir,
          imageUrl: url || null,
          soundUrl: f.soundUrl?.trim() || undefined,
          from: { x: srcPos.x + (isRightSideAttacker ? -f.offsetX : f.offsetX), y: srcPos.y + f.offsetY },
          to: tgtPos,
          trajectory: f.trajectory,
          durationMs: f.lifetimeMs,
          startSizePx: f.startSizePx,
          endSizePx: f.endSizePx,
          acceleration: f.acceleration,
          rotationStart: isRightSideAttacker ? -f.rotationStart : f.rotationStart,
          rotationEnd: isRightSideAttacker ? -f.rotationEnd : f.rotationEnd,
          mirrored: isRightSideAttacker,
          color: anim.impactColor,
          show: true,
        }
        setActiveProjectiles(prev => [...prev, entry])
        await sleep(f.lifetimeMs)
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
        const maxBlockMs = Math.max(...activeBlockForms.map(f => f.delayMs + f.showMs + f.vanishMs))
        log(`  Block frames: ${activeBlockForms.length}`)
        activeBlockForms.forEach(async (f) => {
          const url = resolveFrameUrl(f.imageSource, f.url)
          if (!url) return
          if (f.delayMs) await sleep(f.delayMs)
          const entry: ActiveBlockFrameEntry = {
            key: ++vfxKeyRef.current,
            side: defenderSide,
            url,
            soundUrl: f.soundUrl?.trim() || undefined,
            showMs: f.showMs,
            vanishMs: f.vanishMs,
            startSizePx: f.startSizePx,
            endSizePx: f.endSizePx,
            offsetX: isRightSideDefender ? -f.offsetX : f.offsetX,
            offsetY: f.offsetY,
            rotationStart: isRightSideDefender ? -f.rotationStart : f.rotationStart,
            rotationEnd: isRightSideDefender ? -f.rotationEnd : f.rotationEnd,
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
        const maxImpactMs = Math.max(...activeImpactForms.map(f => f.delayMs + f.showMs + f.vanishMs))
        log(`  Impact frames: ${activeImpactForms.length}`)
        activeImpactForms.forEach(async (f) => {
          const url = resolveFrameUrl(f.imageSource, f.url)
          if (!url) return
          if (f.delayMs) await sleep(f.delayMs)
          const entry: ActiveImpactFrameEntry = {
            key: ++vfxKeyRef.current,
            url,
            soundUrl: f.soundUrl?.trim() || undefined,
            showMs: f.showMs,
            vanishMs: f.vanishMs,
            startSizePx: f.startSizePx,
            endSizePx: f.endSizePx,
            offsetX: isRightSideDefender ? -f.offsetX : f.offsetX,
            offsetY: f.offsetY,
            endOffsetX: isRightSideDefender ? -f.endOffsetX : f.endOffsetX,
            endOffsetY: f.endOffsetY,
            acceleration: f.acceleration,
            rotationStart: isRightSideDefender ? -f.rotationStart : f.rotationStart,
            rotationEnd: isRightSideDefender ? -f.rotationEnd : f.rotationEnd,
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
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Caster card</InputLabel>
          <Select value={attackerCardAnimation} label="Caster card" onChange={(e) => setAttackerCardAnimation(e.target.value as 'none' | 'cast' | 'lunge')}>
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="cast">Cast</MenuItem>
            <MenuItem value="lunge">Lunge</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Target card</InputLabel>
          <Select value={targetCardAnimation} label="Target card" onChange={(e) => setTargetCardAnimation(e.target.value as 'none' | 'hit')}>
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="hit">Hit</MenuItem>
          </Select>
        </FormControl>
        <NumField label="Lunge gap (px)" value={lungeGapPx} onChange={setLungeGapPx} min={-300} max={400} step={5} />
        <NumField label="Lunge delay (ms)" value={lungeDelayMs} onChange={setLungeDelayMs} min={0} max={3000} step={10} />
        <NumField label="Lunge start speed" value={lungeStartSpeed} onChange={setLungeStartSpeed} min={-100} max={100} step={1} />
        <NumField label="Lunge accel" value={accelerationLunge} onChange={setAccelerationLunge} min={-100} max={100} step={1} />
        <NumField label="Return accel" value={accelerationReturn} onChange={setAccelerationReturn} min={-100} max={100} step={1} />
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

      {/* Weapon URLs */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <TextField size="small" label="Weapon icon URL" value={weaponUrl} onChange={(e) => setWeaponUrl(e.target.value)} sx={{ minWidth: 280, flex: 1 }} helperText='Used when frame uses "Weapon icon".' />
        <TextField size="small" label="Weapon animation URL" value={weaponAnimationUrl} onChange={(e) => setWeaponAnimationUrl(e.target.value)} sx={{ minWidth: 280, flex: 1 }} helperText='Tip must face up. Used by "Weapon animation".' />
        <TextField size="small" label="Weapon projectile URL" value={weaponProjectileUrl} onChange={(e) => setWeaponProjectileUrl(e.target.value)} sx={{ minWidth: 260, flex: 1 }} />
        <TextField size="small" label="Weapon impact URL" value={weaponImpactUrl} onChange={(e) => setWeaponImpactUrl(e.target.value)} sx={{ minWidth: 260, flex: 1 }} />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Fallback trajectory</InputLabel>
          <Select value={trajectoryOverride} label="Fallback trajectory" onChange={(e) => setTrajectoryOverride(e.target.value as 'auto' | 'straight' | 'arc')}>
            <MenuItem value="auto">Auto (from style)</MenuItem>
            <MenuItem value="straight">Straight</MenuItem>
            <MenuItem value="arc">Arc</MenuItem>
          </Select>
        </FormControl>
        {(weaponUrl || weaponAnimationUrl || weaponProjectileUrl || weaponImpactUrl) && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1.5, flexWrap: 'wrap' }}>
            {weaponUrl && <><img src={weaponUrl} alt="icon" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Icon</Typography></>}
            {weaponAnimationUrl && weaponAnimationUrl !== weaponUrl && <><img src={weaponAnimationUrl} alt="anim" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Anim</Typography></>}
            {weaponProjectileUrl && <><img src={weaponProjectileUrl} alt="proj" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Projectile</Typography></>}
            {weaponImpactUrl && <><img src={weaponImpactUrl} alt="impact" style={{ width: 32, height: 32, objectFit: 'contain' }} /><Typography variant="caption" color="text.secondary">Impact</Typography></>}
          </Box>
        )}
      </Paper>

      {/* Animation Frames — multi-particle editors */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>Animation Frames</Typography>
          <Typography variant="body2" color="text.secondary">
            Add multiple particles per phase. All particles in each phase fire concurrently (each with its own delay). Offset X/Y shifts position from portrait center.
          </Typography>
        </Box>

        {/* Weapon frames */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">① Weapon (pops at caster)</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setWeaponFrames(prev => [...prev, defaultWeaponFrame()])}>Add</Button>
          </Box>
          {weaponFrames.map((f, i) => (
            <WeaponFrameEditor
              key={i}
              frame={f}
              idx={i}
              onChange={(updated) => setWeaponFrames(prev => prev.map((x, j) => j === i ? updated : x))}
              onRemove={() => setWeaponFrames(prev => prev.filter((_, j) => j !== i))}
              resolveUrl={resolveFrameUrl}
            />
          ))}
          {weaponFrames.length === 0 && <Typography variant="body2" color="text.disabled" sx={{ ml: 1 }}>No weapon frames. Click Add to create one.</Typography>}
        </Box>

        {/* Projectile frames */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">② Projectile (caster → target)</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setProjectileFrames(prev => [...prev, defaultProjectileFrame()])}>Add</Button>
          </Box>
          {attackerCardAnimation === 'lunge' ? (
            <Typography variant="body2" color="warning.main" sx={{ ml: 1 }}>
              Projectile frames are ignored while caster card animation is set to lunge.
            </Typography>
          ) : (
            <>
              {projectileFrames.map((f, i) => (
                <ProjectileFrameEditor
                  key={i}
                  frame={f}
                  idx={i}
                  onChange={(updated) => setProjectileFrames(prev => prev.map((x, j) => j === i ? updated : x))}
                  onRemove={() => setProjectileFrames(prev => prev.filter((_, j) => j !== i))}
                  resolveUrl={resolveFrameUrl}
                />
              ))}
              {projectileFrames.length === 0 && <Typography variant="body2" color="text.disabled" sx={{ ml: 1 }}>No projectile frames. Click Add to create one.</Typography>}
            </>
          )}
        </Box>

        {/* Impact frames */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">③ Impact (pops at target)</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setImpactFrames(prev => [...prev, defaultImpactFrame()])}>Add</Button>
          </Box>
          {impactFrames.map((f, i) => (
            <ImpactFrameEditor
              key={i}
              frame={f}
              idx={i}
              onChange={(updated) => setImpactFrames(prev => prev.map((x, j) => j === i ? updated : x))}
              onRemove={() => setImpactFrames(prev => prev.filter((_, j) => j !== i))}
              resolveUrl={resolveFrameUrl}
            />
          ))}
          {impactFrames.length === 0 && <Typography variant="body2" color="text.disabled" sx={{ ml: 1 }}>No impact frames. Click Add to create one.</Typography>}
        </Box>

        {/* Block frames */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary">④ Block (pops at defender border)</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setBlockFrames(prev => [...prev, defaultBlockFrame()])}>Add</Button>
          </Box>
          {blockFrames.map((f, i) => (
            <BlockFrameEditor
              key={i}
              frame={f}
              idx={i}
              onChange={(updated) => setBlockFrames(prev => prev.map((x, j) => j === i ? updated : x))}
              onRemove={() => setBlockFrames(prev => prev.filter((_, j) => j !== i))}
              resolveUrl={resolveFrameUrl}
            />
          ))}
          {blockFrames.length === 0 && <Typography variant="body2" color="text.disabled" sx={{ ml: 1 }}>No block frames. Click Add to create one.</Typography>}
          <FormControlLabel
            control={<Checkbox checked={simulateBlock} onChange={(e) => setSimulateBlock(e.target.checked)} size="small" />}
            label={<Typography variant="body2">Simulate block on next attack</Typography>}
            sx={{ ml: 0.5 }}
          />
        </Box>
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
        </Box>
        <Divider />
        <Typography variant="subtitle2" fontWeight={600} color="text.secondary">Effect</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Effect kind</InputLabel>
            <Select value={effectKind} label="Effect kind" onChange={(e) => setEffectKind(e.target.value as typeof effectKind)}>
              {EFFECT_KINDS.map(k => <MenuItem key={k} value={k}>{k}</MenuItem>)}
            </Select>
          </FormControl>
          <NumField label="Amount" value={effectAmount} onChange={(v) => setEffectAmount(Math.max(0, v))} min={0} max={9999} step={1} width={110} />
          <NumField label="Percentage" value={effectPercentage} onChange={(v) => setEffectPercentage(Math.max(0, v))} min={0} max={100} step={1} width={110} />
          {effectKind === 'lifesteal' && (
            <NumField label="Lifesteal %" value={effectLifestealPct} onChange={(v) => setEffectLifestealPct(Math.max(0, v))} min={0} max={100} step={1} width={110} />
          )}
        </Box>
        {abilityType === 'reactive' && (
          <>
            <Divider />
            <Typography variant="subtitle2" fontWeight={600} color="text.secondary">Reactive Config</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <NumField label="Base chance (0-1)" value={reactiveBaseChance} onChange={(v) => setReactiveBaseChance(Math.max(0, Math.min(1, v)))} min={0} max={1} step={0.05} width={140} />
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel>Scaling stat</InputLabel>
                <Select value={reactiveScalingStat} label="Scaling stat" onChange={(e) => setReactiveScalingStat(e.target.value)} displayEmpty>
                  <MenuItem value="">— None —</MenuItem>
                  {STAT_IDS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <NumField label="Scaling coeff" value={reactiveScalingCoeff} onChange={(v) => setReactiveScalingCoeff(v)} min={0} max={1} step={0.001} width={120} />
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
