import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import type { AnimationFrameImageSource } from './vfx/animationConfig'
import type { AnimationFrames } from '../../../../../../services/api'
import SoundUploadButton from './SoundUploadButton'

const IMAGE_SOURCE_OPTIONS: { value: AnimationFrameImageSource; label: string }[] = [
  { value: 'url', label: 'Custom URL' },
  { value: 'weaponIcon', label: 'Weapon icon' },
  { value: 'weaponAnimation', label: 'Weapon animation' },
  { value: 'weaponProjectile', label: 'Weapon projectile' },
  { value: 'weaponImpact', label: 'Weapon impact' },
]

export interface AnimFrameForm {
  enabled: boolean
  imageSource: AnimationFrameImageSource
  url: string
  soundUrl: string
  delayMs: string
  fadeInMs: string
  lifetimeMs: string
  trajectory: 'straight' | 'arc'
  showMs: string
  vanishMs: string
  startSizePx: string
  endSizePx: string
  offsetX: string
  offsetY: string
  endOffsetX: string
  endOffsetY: string
  acceleration: string
  rotationStart: string
  rotationEnd: string
}

export interface AbilityAnimFrames {
  weapon: AnimFrameForm[]
  projectile: AnimFrameForm[]
  impact: AnimFrameForm[]
  block: AnimFrameForm[]
}

export const defaultWeaponFrame = (): AnimFrameForm => ({
  enabled: false, imageSource: 'url', url: '', soundUrl: '', delayMs: '0', fadeInMs: '200', lifetimeMs: '0',
  trajectory: 'straight', showMs: '0', vanishMs: '0',
  startSizePx: '80', endSizePx: '120', offsetX: '0', offsetY: '0', endOffsetX: '0', endOffsetY: '0', acceleration: '0', rotationStart: '0', rotationEnd: '0',
})

export const defaultProjectileFrame = (): AnimFrameForm => ({
  enabled: false, imageSource: 'url', url: '', soundUrl: '', delayMs: '0', fadeInMs: '0', lifetimeMs: '400',
  trajectory: 'arc', showMs: '0', vanishMs: '0',
  startSizePx: '120', endSizePx: '300', offsetX: '0', offsetY: '0', endOffsetX: '0', endOffsetY: '0', acceleration: '0', rotationStart: '0', rotationEnd: '0',
})

export const defaultImpactFrame = (): AnimFrameForm => ({
  enabled: false, imageSource: 'url', url: '', soundUrl: '', delayMs: '0', fadeInMs: '0', lifetimeMs: '600',
  trajectory: 'straight', showMs: '90', vanishMs: '510',
  startSizePx: '60', endSizePx: '140', offsetX: '0', offsetY: '0', endOffsetX: '0', endOffsetY: '0', acceleration: '0', rotationStart: '0', rotationEnd: '0',
})

export const defaultBlockFrame = (): AnimFrameForm => ({
  enabled: false, imageSource: 'url', url: '', soundUrl: '', delayMs: '0', fadeInMs: '0', lifetimeMs: '800',
  trajectory: 'straight', showMs: '320', vanishMs: '480',
  startSizePx: '100', endSizePx: '140', offsetX: '0', offsetY: '0', endOffsetX: '0', endOffsetY: '0', acceleration: '0', rotationStart: '0', rotationEnd: '0',
})

export const emptyAnimFrames = (): AbilityAnimFrames => ({
  weapon: [], projectile: [], impact: [], block: [],
})

export function hydrateAnimFrames(af?: AnimationFrames | null): AbilityAnimFrames {
  if (!af) return emptyAnimFrames()
  return {
    weapon: (af.weapon ?? []).map(f => ({
      enabled: true, imageSource: (f.imageSource ?? 'url') as AnimationFrameImageSource, url: f.url ?? '',
      soundUrl: f.soundUrl ?? '',
      delayMs: String(f.delayMs ?? 0), fadeInMs: String(f.fadeInMs ?? 200), lifetimeMs: String(f.lifetimeMs ?? 0),
      trajectory: 'straight' as const, showMs: '0', vanishMs: '0',
      startSizePx: String(f.startSizePx ?? f.sizePx ?? 80), endSizePx: String(f.endSizePx ?? f.sizePx ?? 120),
      offsetX: String(f.offsetX ?? 0), offsetY: String(f.offsetY ?? 0),
      endOffsetX: String(f.endOffsetX ?? f.offsetX ?? 0), endOffsetY: String(f.endOffsetY ?? f.offsetY ?? 0),
      acceleration: String(f.acceleration ?? 0),
      rotationStart: String(f.rotationStart ?? 0), rotationEnd: String(f.rotationEnd ?? f.rotationStart ?? 0),
    })),
    projectile: (af.projectile ?? []).map(f => ({
      enabled: true, imageSource: (f.imageSource ?? 'url') as AnimationFrameImageSource, url: f.url ?? '',
      soundUrl: f.soundUrl ?? '',
      delayMs: String(f.delayMs ?? 0), fadeInMs: '0', lifetimeMs: String(f.lifetimeMs ?? f.speedMs ?? 400),
      trajectory: (f.trajectory ?? 'arc') as 'straight' | 'arc', showMs: '0', vanishMs: '0',
      startSizePx: String(f.startSizePx ?? f.sizePx ?? 120), endSizePx: String(f.endSizePx ?? f.sizePx ?? 300),
      offsetX: String(f.offsetX ?? 0), offsetY: String(f.offsetY ?? 0),
      endOffsetX: String(0), endOffsetY: String(0),
      acceleration: String(f.acceleration ?? 0),
      rotationStart: String(f.rotationStart ?? 0), rotationEnd: String(f.rotationEnd ?? f.rotationStart ?? 0),
    })),
    impact: (af.impact ?? []).map(f => ({
      enabled: true, imageSource: (f.imageSource ?? 'url') as AnimationFrameImageSource, url: f.url ?? '',
      soundUrl: f.soundUrl ?? '',
      delayMs: String(f.delayMs ?? 0), fadeInMs: '0', lifetimeMs: String(f.lifetimeMs ?? 600),
      trajectory: 'straight' as const, showMs: String(f.showMs ?? 90), vanishMs: String(f.vanishMs ?? 510),
      startSizePx: String(f.startSizePx ?? f.sizePx ?? 60), endSizePx: String(f.endSizePx ?? f.sizePx ?? 140),
      offsetX: String(f.offsetX ?? 0), offsetY: String(f.offsetY ?? 0),
      endOffsetX: String(f.endOffsetX ?? f.offsetX ?? 0), endOffsetY: String(f.endOffsetY ?? f.offsetY ?? 0),
      acceleration: String(f.acceleration ?? 0),
      rotationStart: String(f.rotationStart ?? 0), rotationEnd: String(f.rotationEnd ?? f.rotationStart ?? 0),
    })),
    block: (af.block ?? []).map(f => ({
      enabled: true, imageSource: (f.imageSource ?? 'url') as AnimationFrameImageSource, url: f.url ?? '',
      soundUrl: f.soundUrl ?? '',
      delayMs: String(f.delayMs ?? 0), fadeInMs: '0', lifetimeMs: String(f.lifetimeMs ?? 800),
      trajectory: 'straight' as const, showMs: String(f.showMs ?? 320), vanishMs: String(f.vanishMs ?? 480),
      startSizePx: String(f.startSizePx ?? f.sizePx ?? 100), endSizePx: String(f.endSizePx ?? f.sizePx ?? 140),
      offsetX: String(f.offsetX ?? 0), offsetY: String(f.offsetY ?? 0),
      endOffsetX: String(0), endOffsetY: String(0),
      acceleration: String(0),
      rotationStart: String(f.rotationStart ?? 0), rotationEnd: String(f.rotationEnd ?? f.rotationStart ?? 0),
    })),
  }
}

export function buildAnimationFrames(af: AbilityAnimFrames): AnimationFrames | undefined {
  const weapon = af.weapon.filter(f => f.enabled && f.url.trim()).map(f => ({
    ...(f.imageSource !== 'url' ? { imageSource: f.imageSource } : {}),
    ...(f.url.trim() ? { url: f.url.trim() } : {}),
    ...(f.soundUrl.trim() ? { soundUrl: f.soundUrl.trim() } : {}),
    ...(Number(f.delayMs) > 0 ? { delayMs: Number(f.delayMs) } : {}),
    ...(Number(f.fadeInMs) !== 200 ? { fadeInMs: Number(f.fadeInMs) } : {}),
    ...(Number(f.lifetimeMs) > 0 ? { lifetimeMs: Number(f.lifetimeMs) } : {}),
    startSizePx: Number(f.startSizePx) || 80,
    endSizePx: Number(f.endSizePx) || 120,
    ...(Number(f.offsetX) !== 0 ? { offsetX: Number(f.offsetX) } : {}),
    ...(Number(f.offsetY) !== 0 ? { offsetY: Number(f.offsetY) } : {}),
    ...(Number(f.endOffsetX) !== Number(f.offsetX) ? { endOffsetX: Number(f.endOffsetX) } : {}),
    ...(Number(f.endOffsetY) !== Number(f.offsetY) ? { endOffsetY: Number(f.endOffsetY) } : {}),
    ...(Number(f.acceleration) !== 0 ? { acceleration: Number(f.acceleration) } : {}),
    ...(Number(f.rotationStart) !== 0 ? { rotationStart: Number(f.rotationStart) } : {}),
    ...(Number(f.rotationEnd) !== Number(f.rotationStart) ? { rotationEnd: Number(f.rotationEnd) } : {}),
  }))
  const projectile = af.projectile.filter(f => f.enabled && f.url.trim()).map(f => ({
    ...(f.imageSource !== 'url' ? { imageSource: f.imageSource } : {}),
    ...(f.url.trim() ? { url: f.url.trim() } : {}),
    ...(f.soundUrl.trim() ? { soundUrl: f.soundUrl.trim() } : {}),
    ...(Number(f.delayMs) > 0 ? { delayMs: Number(f.delayMs) } : {}),
    trajectory: f.trajectory,
    ...(Number(f.lifetimeMs) > 0 ? { lifetimeMs: Number(f.lifetimeMs) } : {}),
    startSizePx: Number(f.startSizePx) || 120,
    endSizePx: Number(f.endSizePx) || 300,
    ...(Number(f.offsetX) !== 0 ? { offsetX: Number(f.offsetX) } : {}),
    ...(Number(f.offsetY) !== 0 ? { offsetY: Number(f.offsetY) } : {}),
    ...(Number(f.acceleration) !== 0 ? { acceleration: Number(f.acceleration) } : {}),
    ...(Number(f.rotationStart) !== 0 ? { rotationStart: Number(f.rotationStart) } : {}),
    ...(Number(f.rotationEnd) !== Number(f.rotationStart) ? { rotationEnd: Number(f.rotationEnd) } : {}),
  }))
  const impact = af.impact.filter(f => f.enabled && f.url.trim()).map(f => ({
    ...(f.imageSource !== 'url' ? { imageSource: f.imageSource } : {}),
    ...(f.url.trim() ? { url: f.url.trim() } : {}),
    ...(f.soundUrl.trim() ? { soundUrl: f.soundUrl.trim() } : {}),
    ...(Number(f.delayMs) > 0 ? { delayMs: Number(f.delayMs) } : {}),
    ...(Number(f.showMs) > 0 ? { showMs: Number(f.showMs) } : {}),
    ...(Number(f.vanishMs) > 0 ? { vanishMs: Number(f.vanishMs) } : {}),
    ...(Number(f.lifetimeMs) > 0 ? { lifetimeMs: Number(f.lifetimeMs) } : {}),
    startSizePx: Number(f.startSizePx) || 60,
    endSizePx: Number(f.endSizePx) || 140,
    ...(Number(f.offsetX) !== 0 ? { offsetX: Number(f.offsetX) } : {}),
    ...(Number(f.offsetY) !== 0 ? { offsetY: Number(f.offsetY) } : {}),
    ...(Number(f.endOffsetX) !== Number(f.offsetX) ? { endOffsetX: Number(f.endOffsetX) } : {}),
    ...(Number(f.endOffsetY) !== Number(f.offsetY) ? { endOffsetY: Number(f.endOffsetY) } : {}),
    ...(Number(f.acceleration) !== 0 ? { acceleration: Number(f.acceleration) } : {}),
    ...(Number(f.rotationStart) !== 0 ? { rotationStart: Number(f.rotationStart) } : {}),
    ...(Number(f.rotationEnd) !== Number(f.rotationStart) ? { rotationEnd: Number(f.rotationEnd) } : {}),
  }))
  const block = af.block.filter(f => f.enabled && f.url.trim()).map(f => ({
    ...(f.imageSource !== 'url' ? { imageSource: f.imageSource } : {}),
    ...(f.url.trim() ? { url: f.url.trim() } : {}),
    ...(f.soundUrl.trim() ? { soundUrl: f.soundUrl.trim() } : {}),
    ...(Number(f.delayMs) > 0 ? { delayMs: Number(f.delayMs) } : {}),
    ...(Number(f.showMs) > 0 ? { showMs: Number(f.showMs) } : {}),
    ...(Number(f.vanishMs) > 0 ? { vanishMs: Number(f.vanishMs) } : {}),
    ...(Number(f.lifetimeMs) > 0 ? { lifetimeMs: Number(f.lifetimeMs) } : {}),
    startSizePx: Number(f.startSizePx) || 100,
    endSizePx: Number(f.endSizePx) || 140,
    ...(Number(f.offsetX) !== 0 ? { offsetX: Number(f.offsetX) } : {}),
    ...(Number(f.offsetY) !== 0 ? { offsetY: Number(f.offsetY) } : {}),
    ...(Number(f.rotationStart) !== 0 ? { rotationStart: Number(f.rotationStart) } : {}),
    ...(Number(f.rotationEnd) !== Number(f.rotationStart) ? { rotationEnd: Number(f.rotationEnd) } : {}),
  }))
  if (!weapon.length && !projectile.length && !impact.length && !block.length) return undefined
  return {
    ...(weapon.length ? { weapon } : {}),
    ...(projectile.length ? { projectile } : {}),
    ...(impact.length ? { impact } : {}),
    ...(block.length ? { block } : {}),
  }
}

interface FrameListEditorProps {
  label: string
  frames: AnimFrameForm[]
  phaseType: 'weapon' | 'projectile' | 'impact' | 'block'
  onChange: (frames: AnimFrameForm[]) => void
  defaultFrame: () => AnimFrameForm
}

function FrameListEditor({ label, frames, phaseType, onChange, defaultFrame }: FrameListEditorProps) {
  const update = (idx: number, patch: Partial<AnimFrameForm>) => {
    onChange(frames.map((f, i) => i === idx ? { ...f, ...patch } : f))
  }
  const updateOffset = (idx: number, axis: 'x' | 'y', value: string) => {
    const current = frames[idx]
    if (!current) return
    if (phaseType === 'weapon' || phaseType === 'impact') {
      if (axis === 'x') {
        update(idx, {
          offsetX: value,
          ...(current.endOffsetX === current.offsetX ? { endOffsetX: value } : {}),
        })
      } else {
        update(idx, {
          offsetY: value,
          ...(current.endOffsetY === current.offsetY ? { endOffsetY: value } : {}),
        })
      }
      return
    }
    update(idx, axis === 'x' ? { offsetX: value } : { offsetY: value })
  }
  const remove = (idx: number) => onChange(frames.filter((_, i) => i !== idx))
  const add = () => onChange([...frames, { ...defaultFrame(), enabled: true }])

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="body2" fontWeight={600} color="text.secondary">{label}</Typography>
        <IconButton size="small" onClick={add}><AddIcon fontSize="small" /></IconButton>
      </Box>
      {frames.map((f, idx) => (
        <Box key={idx} sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center', mb: 0.75, pl: 1, borderLeft: '2px solid rgba(168,85,247,0.3)' }}>
          <FormControlLabel
            control={<Checkbox size="small" checked={f.enabled} onChange={(e) => update(idx, { enabled: e.target.checked })} />}
            label={<Typography variant="caption">#{idx + 1}</Typography>}
            sx={{ mr: 0 }}
          />
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Source</InputLabel>
            <Select value={f.imageSource} label="Source" onChange={(e) => update(idx, { imageSource: e.target.value as AnimationFrameImageSource })}>
              {IMAGE_SOURCE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="URL" value={f.url} onChange={(e) => update(idx, { url: e.target.value })} sx={{ flex: 1, minWidth: 160 }} />
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', minWidth: 220, flex: 1 }}>
            <TextField size="small" label="Sound URL" value={f.soundUrl} onChange={(e) => update(idx, { soundUrl: e.target.value })} sx={{ flex: 1, minWidth: 160 }} />
            <SoundUploadButton disabled={!f.enabled} onUploaded={(url) => update(idx, { soundUrl: url })} />
          </Box>
          <TextField size="small" label="Delay (ms)" type="number" value={f.delayMs} onChange={(e) => update(idx, { delayMs: e.target.value })} sx={{ width: 90 }} />
          {phaseType === 'weapon' && (
            <TextField size="small" label="Fade-in (ms)" type="number" value={f.fadeInMs} onChange={(e) => update(idx, { fadeInMs: e.target.value })} sx={{ width: 100 }} />
          )}
          {phaseType === 'projectile' && (
            <FormControl size="small" sx={{ minWidth: 90 }}>
              <InputLabel>Trajectory</InputLabel>
              <Select value={f.trajectory} label="Trajectory" onChange={(e) => update(idx, { trajectory: e.target.value as 'straight' | 'arc' })}>
                <MenuItem value="straight">straight</MenuItem>
                <MenuItem value="arc">arc</MenuItem>
              </Select>
            </FormControl>
          )}
          <TextField size="small" label="Lifetime (ms)" type="number" value={f.lifetimeMs} onChange={(e) => update(idx, { lifetimeMs: e.target.value })} sx={{ width: 100 }} />
          {(phaseType === 'impact' || phaseType === 'block') && (
            <>
              <TextField size="small" label="Show (ms)" type="number" value={f.showMs} onChange={(e) => update(idx, { showMs: e.target.value })} sx={{ width: 90 }} />
              <TextField size="small" label="Vanish (ms)" type="number" value={f.vanishMs} onChange={(e) => update(idx, { vanishMs: e.target.value })} sx={{ width: 90 }} />
            </>
          )}
          <TextField size="small" label="Start size (px)" type="number" value={f.startSizePx} onChange={(e) => update(idx, { startSizePx: e.target.value })} sx={{ width: 100 }} />
          <TextField size="small" label="End size (px)" type="number" value={f.endSizePx} onChange={(e) => update(idx, { endSizePx: e.target.value })} sx={{ width: 100 }} />
          <TextField size="small" label="Offset X" type="number" value={f.offsetX} onChange={(e) => updateOffset(idx, 'x', e.target.value)} sx={{ width: 80 }} />
          <TextField size="small" label="Offset Y" type="number" value={f.offsetY} onChange={(e) => updateOffset(idx, 'y', e.target.value)} sx={{ width: 80 }} />
          {(phaseType === 'weapon' || phaseType === 'impact') && (
            <>
              <TextField size="small" label="End Offset X" type="number" value={f.endOffsetX} onChange={(e) => update(idx, { endOffsetX: e.target.value })} sx={{ width: 100 }} />
              <TextField size="small" label="End Offset Y" type="number" value={f.endOffsetY} onChange={(e) => update(idx, { endOffsetY: e.target.value })} sx={{ width: 100 }} />
            </>
          )}
          {(phaseType === 'weapon' || phaseType === 'impact' || phaseType === 'projectile') && (
            <TextField size="small" label="Acceleration" type="number" value={f.acceleration} onChange={(e) => update(idx, { acceleration: e.target.value })} sx={{ width: 100 }} />
          )}
          <TextField size="small" label="Rotation Start" type="number" value={f.rotationStart} onChange={(e) => update(idx, { rotationStart: e.target.value })} sx={{ width: 110 }} />
          <TextField size="small" label="Rotation End" type="number" value={f.rotationEnd} onChange={(e) => update(idx, { rotationEnd: e.target.value })} sx={{ width: 110 }} />
          <IconButton size="small" color="error" onClick={() => remove(idx)}><DeleteIcon fontSize="small" /></IconButton>
        </Box>
      ))}
    </Box>
  )
}

interface Props {
  animFrames: AbilityAnimFrames
  onChange: (af: AbilityAnimFrames) => void
  isReactive?: boolean
}

export default function AbilityAnimationEditor({ animFrames, onChange, isReactive }: Props) {
  return (
    <Box sx={{ mt: 1, p: 1.5, bgcolor: 'rgba(168,85,247,0.04)', borderRadius: 1, border: '1px solid rgba(168,85,247,0.15)' }}>
      <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>Animation Frames</Typography>
      <FrameListEditor
        label="Weapon (caster portrait)"
        frames={animFrames.weapon}
        phaseType="weapon"
        onChange={(frames) => onChange({ ...animFrames, weapon: frames })}
        defaultFrame={defaultWeaponFrame}
      />
      <FrameListEditor
        label="Projectile (caster → target)"
        frames={animFrames.projectile}
        phaseType="projectile"
        onChange={(frames) => onChange({ ...animFrames, projectile: frames })}
        defaultFrame={defaultProjectileFrame}
      />
      <FrameListEditor
        label="Impact (target portrait)"
        frames={animFrames.impact}
        phaseType="impact"
        onChange={(frames) => onChange({ ...animFrames, impact: frames })}
        defaultFrame={defaultImpactFrame}
      />
      {isReactive && (
        <FrameListEditor
          label="Block (defender card border)"
          frames={animFrames.block}
          phaseType="block"
          onChange={(frames) => onChange({ ...animFrames, block: frames })}
          defaultFrame={defaultBlockFrame}
        />
      )}
    </Box>
  )
}
