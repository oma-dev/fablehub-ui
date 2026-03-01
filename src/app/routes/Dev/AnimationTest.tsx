import { useCallback, useRef, useState, forwardRef } from 'react'
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
import SmartToyIcon from '@mui/icons-material/SmartToy'
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
import DamageNumber from '../../routes/Fables/expressions/IdleRPG/components/vfx/DamageNumber'
import ImpactEffect from '../../routes/Fables/expressions/IdleRPG/components/vfx/ImpactEffect'
import ImpactFrame from '../../routes/Fables/expressions/IdleRPG/components/vfx/ImpactFrame'
import Projectile, { PROJECTILE_SPEED, type ProjectilePos } from '../../routes/Fables/expressions/IdleRPG/components/vfx/Projectile'
import WeaponFrame from '../../routes/Fables/expressions/IdleRPG/components/vfx/WeaponFrame'

const styleIds = [...STYLE_IDS]
const ALL_IMPACT_STYLES: ImpactStyle[] = ['slash', 'punch', 'flail', 'arrow', 'bolt', 'generic']
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
  delayMs: number
  fadeInMs: number
  lifetimeMs: number
  startSizePx: number
  endSizePx: number
  offsetX: number
  offsetY: number
}
interface ProjectileFrameForm {
  enabled: boolean
  imageSource: AnimationFrameImageSource
  url: string
  delayMs: number
  /** Lifetime / flight duration in ms */
  lifetimeMs: number
  trajectory: 'straight' | 'arc'
  startSizePx: number
  endSizePx: number
  offsetX: number
  offsetY: number
}
interface ImpactFrameForm {
  enabled: boolean
  imageSource: AnimationFrameImageSource
  url: string
  delayMs: number
  showMs: number
  vanishMs: number
  /** Shorthand total lifetime; overrides showMs+vanishMs when the other two aren't touched */
  lifetimeMs: number
  startSizePx: number
  endSizePx: number
  offsetX: number
  offsetY: number
}

const defaultWeaponFrame = (): WeaponFrameForm => ({
  enabled: false,
  imageSource: 'url',
  url: 'https://bg3.wiki/w/images/0/0f/Quarterstaff_Unfaded.png',
  delayMs: 0,
  fadeInMs: 200,
  lifetimeMs: 0,   // 0 = stay until sequence ends
  startSizePx: 80,
  endSizePx: 120,
  offsetX: 0,
  offsetY: 0,
})
const defaultProjectileFrame = (): ProjectileFrameForm => ({
  enabled: false,
  imageSource: 'url',
  url: 'https://bg3.wiki/w/images/2/2e/Fireball_Spell_Icon.png',
  delayMs: 0,
  lifetimeMs: 400,
  trajectory: 'arc',
  startSizePx: 120,
  endSizePx: 300,
  offsetX: 0,
  offsetY: 0,
})
const defaultImpactFrame = (): ImpactFrameForm => ({
  enabled: false,
  imageSource: 'url',
  url: 'https://bg3.wiki/w/images/4/4e/Smoke_Powder_Unfaded.png',
  delayMs: 0,
  showMs: 90,
  vanishMs: 510,
  lifetimeMs: 600,
  startSizePx: 60,
  endSizePx: 140,
  offsetX: 0,
  offsetY: 0,
})

// --- Active VFX types (runtime) ---
interface ActiveWeaponFrameEntry {
  key: number
  url: string
  fadeInMs: number
  lifetimeMs?: number
  sizePx?: number
  startSizePx?: number
  endSizePx?: number
  offsetX: number
  offsetY: number
}
interface ActiveProjectileEntry {
  key: number
  direction: 'left-to-right' | 'right-to-left'
  imageUrl: string | null
  from: ProjectilePos
  to: ProjectilePos
  trajectory: 'straight' | 'arc'
  durationMs?: number
  startSizePx?: number
  endSizePx?: number
  color: string
  show: boolean
}
interface ActiveImpactFrameEntry {
  key: number
  url: string
  showMs: number
  vanishMs: number
  startSizePx?: number
  endSizePx?: number
  offsetX: number
  offsetY: number
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
  icon: React.ReactNode
  variant: string
  variants: ReturnType<typeof getMotionVariants>
  showImpact: boolean
  impactStyle: ImpactStyle
  impactColor: string
  impactKey: number
  dmg: { value: number; type: 'damage' | 'heal'; key: number } | null
  accentGradient: string
  activeWeaponFrames?: ActiveWeaponFrameEntry[]
  activeImpactFrames?: ActiveImpactFrameEntry[]
}>(function CombatantCard({
  label,
  icon,
  variant,
  variants,
  showImpact,
  impactStyle,
  impactColor,
  impactKey,
  dmg,
  accentGradient,
  activeWeaponFrames,
  activeImpactFrames,
}, ref) {
  return (
    <motion.div variants={variants} animate={variant} style={{ width: 220, position: 'relative' }}>
      <Paper
        variant="outlined"
        sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 1.5, p: 2.5, borderRadius: 2, background: accentGradient,
        }}
      >
        <Box ref={ref} sx={{ position: 'relative', width: 100, height: 100 }}>
          <Box
            sx={{
              width: 100, height: 100, borderRadius: 1.5, bgcolor: 'rgba(0,0,0,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid', borderColor: 'divider',
            }}
          >
            {icon}
          </Box>
          {(activeWeaponFrames ?? []).map(f => (
            <WeaponFrame key={f.key} show url={f.url} fadeInMs={f.fadeInMs} lifetimeMs={f.lifetimeMs} sizePx={f.sizePx} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} id={f.key} />
          ))}
          {showImpact && (activeImpactFrames ?? []).length > 0
            ? (activeImpactFrames ?? []).map(f => (
              <ImpactFrame key={f.key} show url={f.url} showMs={f.showMs} vanishMs={f.vanishMs} startSizePx={f.startSizePx} endSizePx={f.endSizePx} offsetX={f.offsetX} offsetY={f.offsetY} id={f.key} />
            ))
            : <ImpactEffect show={showImpact} style={impactStyle} color={impactColor} id={`impact-${impactKey}`} />
          }
          <AnimatePresence>
            {dmg && <DamageNumber value={dmg.value} type={dmg.type} id={dmg.key} />}
          </AnimatePresence>
        </Box>
        <Typography variant="subtitle1" fontWeight={700}>{label}</Typography>
      </Paper>
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
        {resolveUrl(frame.imageSource, frame.url) && (
          <img src={resolveUrl(frame.imageSource, frame.url)} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }} />
        )}
        <NumField label="Delay (ms)" value={frame.delayMs} onChange={(v) => set('delayMs', Math.max(0, v))} min={0} max={2000} step={50} disabled={!frame.enabled} />
        <NumField label="Fade-in (ms)" value={frame.fadeInMs} onChange={(v) => set('fadeInMs', Math.max(50, v))} min={50} max={2000} step={50} width={110} disabled={!frame.enabled} />
        <NumField label="Lifetime (ms)" value={frame.lifetimeMs} onChange={(v) => set('lifetimeMs', Math.max(0, v))} min={0} max={5000} step={50} width={120} helperText="0 = whole seq" disabled={!frame.enabled} />
        <NumField label="Start size" value={frame.startSizePx} onChange={(v) => set('startSizePx', Math.max(16, v))} min={16} max={400} step={8} disabled={!frame.enabled} />
        <NumField label="End size" value={frame.endSizePx} onChange={(v) => set('endSizePx', Math.max(16, v))} min={16} max={400} step={8} disabled={!frame.enabled} />
        <NumField label="Offset X" value={frame.offsetX} onChange={(v) => set('offsetX', v)} min={-300} max={300} step={8} disabled={!frame.enabled} />
        <NumField label="Offset Y" value={frame.offsetY} onChange={(v) => set('offsetY', v)} min={-300} max={300} step={8} disabled={!frame.enabled} />
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
  const [trajectoryOverride, setTrajectoryOverride] = useState<'auto' | 'straight' | 'arc'>('auto')
  const [playing, setPlaying] = useState(false)
  const [logLines, setLogLines] = useState<string[]>([])

  // Array-based frame forms
  const [weaponFrames, setWeaponFrames] = useState<WeaponFrameForm[]>([defaultWeaponFrame()])
  const [projectileFrames, setProjectileFrames] = useState<ProjectileFrameForm[]>([defaultProjectileFrame()])
  const [impactFrames, setImpactFrames] = useState<ImpactFrameForm[]>([defaultImpactFrame()])

  // Active VFX state (runtime)
  const [playerActiveWeapon, setPlayerActiveWeapon] = useState<ActiveWeaponFrameEntry[]>([])
  const [creatureActiveWeapon, setCreatureActiveWeapon] = useState<ActiveWeaponFrameEntry[]>([])
  const [activeProjectiles, setActiveProjectiles] = useState<ActiveProjectileEntry[]>([])
  const [playerActiveImpact, setPlayerActiveImpact] = useState<ActiveImpactFrameEntry[]>([])
  const [creatureActiveImpact, setCreatureActiveImpact] = useState<ActiveImpactFrameEntry[]>([])

  const [playerVariant, setPlayerVariant] = useState('idle')
  const [creatureVariant, setCreatureVariant] = useState('idle')
  const [showPlayerImpact, setShowPlayerImpact] = useState(false)
  const [showCreatureImpact, setShowCreatureImpact] = useState(false)
  const [playerDmg, setPlayerDmg] = useState<{ value: number; type: 'damage' | 'heal'; key: number } | null>(null)
  const [creatureDmg, setCreatureDmg] = useState<{ value: number; type: 'damage' | 'heal'; key: number } | null>(null)
  const dmgKeyRef = useRef(0)
  const vfxKeyRef = useRef(0)
  const arenaRef = useRef<HTMLDivElement>(null)
  const playerPortraitRef = useRef<HTMLDivElement>(null)
  const creaturePortraitRef = useRef<HTMLDivElement>(null)

  // Impact gallery state
  const [galleryKey, setGalleryKey] = useState(0)
  const [galleryPlaying, setGalleryPlaying] = useState(false)

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

  const resolveFrameUrl = useCallback((source: AnimationFrameImageSource, customUrl: string): string => {
    if (source === 'weaponIcon') return weaponUrl?.trim() || ''
    if (source === 'weaponAnimation') return weaponAnimationUrl?.trim() || ''
    if (source === 'weaponProjectile') return weaponProjectileUrl?.trim() || ''
    if (source === 'weaponImpact') return weaponImpactUrl?.trim() || ''
    return customUrl?.trim() || ''
  }, [weaponUrl, weaponAnimationUrl, weaponProjectileUrl, weaponImpactUrl])

  const log = useCallback((text: string) => {
    setLogLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`])
  }, [])

  const runAttack = useCallback(async (
    side: 'player' | 'creature',
    anim: AttackAnimationConfig,
    styleId: string,
  ) => {
    const setAttVar = side === 'player' ? setPlayerVariant : setCreatureVariant
    const setTgtImpact = side === 'player' ? setShowCreatureImpact : setShowPlayerImpact
    const setTgtDmg = side === 'player' ? setCreatureDmg : setPlayerDmg
    const setTgtVar = side === 'player' ? setCreatureVariant : setPlayerVariant
    const setAttackerWeapon = side === 'player' ? setPlayerActiveWeapon : setCreatureActiveWeapon
    const setTargetImpactFrames = side === 'player' ? setCreatureActiveImpact : setPlayerActiveImpact
    const sideLabel = side === 'player' ? 'Player' : 'Creature'
    log(`${sideLabel} attacks with "${styleId}"`)

    setAttVar('cast')
    await sleep(160)

    // --- Weapon frames ---
    // Sequence timing: wait only for fade-in phase. lifetimeMs (if set) controls independent fade-out.
    // A frame without lifetimeMs stays until sequence-end cleanup.
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
          fadeInMs: f.fadeInMs,
          lifetimeMs: f.lifetimeMs > 0 ? f.lifetimeMs : undefined,
          sizePx: undefined,
          startSizePx: f.startSizePx,
          endSizePx: f.endSizePx,
          offsetX: f.offsetX,
          offsetY: f.offsetY,
        }
        setAttackerWeapon(prev => [...prev, entry])
        if (f.lifetimeMs > 0) {
          // Auto-remove after explicit lifetime
          await sleep(f.lifetimeMs + 100)
          setAttackerWeapon(prev => prev.filter(e => e.key !== entry.key))
        }
        // else: cleaned up at sequence end
      })
      log(`  Weapon frames: ${activeWeaponForms.length}`)
      await sleep(maxWeaponMs)
    }

    // --- Projectile frames (lifetimeMs = flight duration) ---
    const activeProjForms = projectileFrames.filter(f => f.enabled)
    if (activeProjForms.length > 0) {
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
          from: { x: srcPos.x + f.offsetX, y: srcPos.y + f.offsetY },
          to: tgtPos,
          trajectory: f.trajectory,
          durationMs: f.lifetimeMs,
          startSizePx: f.startSizePx,
          endSizePx: f.endSizePx,
          color: anim.impactColor,
          show: true,
        }
        setActiveProjectiles(prev => [...prev, entry])
        await sleep(f.lifetimeMs)
        setActiveProjectiles(prev => prev.map(p => p.key === key ? { ...p, show: false } : p))
        setTimeout(() => setActiveProjectiles(prev => prev.filter(p => p.key !== key)), 400)
      })
      await sleep(maxProjMs)
    } else {
      // Fallback orb projectile if style has a projectile
      const traj = trajectoryOverride === 'auto' ? anim.projectile : trajectoryOverride
      if (traj) {
        const dir = side === 'player' ? 'left-to-right' as const : 'right-to-left' as const
        const srcRef = side === 'player' ? playerPortraitRef : creaturePortraitRef
        const tgtRef = side === 'player' ? creaturePortraitRef : playerPortraitRef
        const key = ++vfxKeyRef.current
        const entry: ActiveProjectileEntry = {
          key, direction: dir, imageUrl: null,
          from: getPortraitPos(srcRef), to: getPortraitPos(tgtRef),
          trajectory: traj as 'straight' | 'arc', color: anim.impactColor, show: true,
        }
        setActiveProjectiles(prev => [...prev, entry])
        const flightMs = (traj === 'arc' ? PROJECTILE_SPEED * 1.25 : PROJECTILE_SPEED) * 1000 + 50
        await sleep(flightMs)
        setActiveProjectiles(prev => prev.map(p => p.key === key ? { ...p, show: false } : p))
        setTimeout(() => setActiveProjectiles(prev => prev.filter(p => p.key !== key)), 400)
        await sleep(flightMs)
      }
    }

    // --- Impact frames ---
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
          showMs: f.showMs,
          vanishMs: f.vanishMs,
          startSizePx: f.startSizePx,
          endSizePx: f.endSizePx,
          offsetX: f.offsetX,
          offsetY: f.offsetY,
        }
        setTargetImpactFrames(prev => [...prev, entry])
      })
      const dmgValue = Math.floor(Math.random() * 30) + 5
      setTgtImpact(true)
      setTgtVar('hit')
      dmgKeyRef.current++
      setTgtDmg({ value: dmgValue, type: 'damage', key: dmgKeyRef.current })
      log(`  Impact → ${dmgValue} damage`)
      await sleep(maxImpactMs)
    } else {
      const dmgValue = Math.floor(Math.random() * 30) + 5
      setTgtImpact(true)
      setTgtVar('hit')
      dmgKeyRef.current++
      setTgtDmg({ value: dmgValue, type: 'damage', key: dmgKeyRef.current })
      log(`  Impact → ${dmgValue} damage`)
      await sleep(350)
    }

    setAttackerWeapon([])  // clean up weapon particles that had no explicit lifetimeMs
    setTargetImpactFrames([])
    setTgtImpact(false)
    setAttVar('return')
    setTgtVar('idle')
    await sleep(280)
    setAttVar('idle')
    setTgtDmg(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log, weaponFrames, projectileFrames, impactFrames, trajectoryOverride, resolveFrameUrl, getPortraitPos])

  const handlePlay = useCallback(async () => {
    if (playing) return
    setPlaying(true)
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
    await runAttack('player', attackerAnim, attackerStyle)
    setPlaying(false)
  }, [playing, attackerAnim, attackerStyle, runAttack])

  const handleCreatureAttack = useCallback(async () => {
    if (playing) return
    setPlaying(true)
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
          <Chip size="small" label="motion: cast" color="info" variant="outlined" />
          <Chip size="small" label={`projectile: ${attackerAnim.projectile ?? 'none'}`} color={attackerAnim.projectile ? 'success' : 'default'} variant="outlined" />
          <Chip size="small" label="impact: generic" sx={{ borderColor: attackerAnim.impactColor, color: attackerAnim.impactColor }} variant="outlined" />
        </Box>
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
      </Paper>

      {/* Arena */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: 'grey.50', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">Arena</Typography>
        <Box ref={arenaRef} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, py: 2, position: 'relative' }}>
          {/* Projectile layer */}
          <AnimatePresence>
            {activeProjectiles.map(p => (
              <Projectile
                key={p.key}
                show={p.show}
                color={p.color}
                direction={p.direction}
                id={p.key}
                weaponUrl={p.imageUrl}
                trajectory={p.trajectory}
                durationMs={p.durationMs}
                startSizePx={p.startSizePx}
                endSizePx={p.endSizePx}
                from={p.from}
                to={p.to}
              />
            ))}
          </AnimatePresence>

          <CombatantCard
            ref={playerPortraitRef}
            label="Player"
            icon={<PersonIcon sx={{ fontSize: 48, color: 'rgba(33,150,243,0.5)' }} />}
            variant={playerVariant}
            variants={playerVariants}
            showImpact={showPlayerImpact}
            impactStyle="generic"
            impactColor={defenderAnim.impactColor}
            impactKey={dmgKeyRef.current}
            dmg={playerDmg}
            accentGradient="linear-gradient(135deg, rgba(33,150,243,0.08) 0%, rgba(33,150,243,0.02) 100%)"
            activeWeaponFrames={playerActiveWeapon}
            activeImpactFrames={playerActiveImpact}
          />

          <Box sx={{ width: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Typography variant="h4" fontWeight={900} color="text.disabled" sx={{ userSelect: 'none' }}>VS</Typography>
          </Box>

          <CombatantCard
            ref={creaturePortraitRef}
            label="Creature"
            icon={<SmartToyIcon sx={{ fontSize: 48, color: 'rgba(244,67,54,0.5)' }} />}
            variant={creatureVariant}
            variants={creatureVariants}
            showImpact={showCreatureImpact}
            impactStyle="generic"
            impactColor={attackerAnim.impactColor}
            impactKey={dmgKeyRef.current}
            dmg={creatureDmg}
            accentGradient="linear-gradient(135deg, rgba(244,67,54,0.08) 0%, rgba(244,67,54,0.02) 100%)"
            activeWeaponFrames={creatureActiveWeapon}
            activeImpactFrames={creatureActiveImpact}
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
