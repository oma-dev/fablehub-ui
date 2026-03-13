import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { AnimationFrameImageSource, StatusAnimation, StatusAnimationParticle } from '@features/idle-rpg/api'
import SoundUploadButton from './SoundUploadButton'

const IMAGE_SOURCE_OPTIONS: Array<{ value: AnimationFrameImageSource; label: string }> = [
  { value: 'url', label: 'Custom URL' },
  { value: 'weaponIcon', label: 'Weapon icon' },
  { value: 'weaponAnimation', label: 'Weapon animation' },
  { value: 'weaponProjectile', label: 'Weapon projectile' },
  { value: 'weaponImpact', label: 'Weapon impact' },
  { value: 'defenseIcon', label: 'Defense icon' },
  { value: 'defenseAnimation', label: 'Defense animation' },
  { value: 'defenseProjectile', label: 'Defense projectile' },
  { value: 'defenseImpact', label: 'Defense impact' },
]

export type StatusParticleForm = {
  imageSource: AnimationFrameImageSource
  url: string
  soundUrl: string
  soundVolumePercent: string
  soundFadeInMs: string
  soundFadeOutMs: string
  delayMs: string
  lifetimeMs: string
  startSizePx: string
  endSizePx: string
  offsetX: string
  offsetY: string
  endOffsetX: string
  endOffsetY: string
  acceleration: string
  rotationStart: string
  rotationEnd: string
  loop: boolean
}

export function createEmptyStatusParticle(): StatusParticleForm {
  return {
    imageSource: 'url',
    url: '',
    soundUrl: '',
    soundVolumePercent: '100',
    soundFadeInMs: '0',
    soundFadeOutMs: '0',
    delayMs: '0',
    lifetimeMs: '1000',
    startSizePx: '72',
    endSizePx: '96',
    offsetX: '0',
    offsetY: '0',
    endOffsetX: '0',
    endOffsetY: '0',
    acceleration: '0',
    rotationStart: '0',
    rotationEnd: '0',
    loop: true,
  }
}

function asNumberString(value: unknown, fallback = '0'): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return value.trim()
  return fallback
}

export type StatusAnimationSection = 'particles' | 'preTransformParticles'

export function hydrateStatusAnimationParticles(
  animation?: StatusAnimation | null,
  section: StatusAnimationSection = 'particles',
  fallbackToEmptyRow = true,
): StatusParticleForm[] {
  const sourceParticles = section === 'preTransformParticles'
    ? (animation?.preTransformParticles ?? [])
    : (animation?.particles ?? [])
  const rows = sourceParticles.map((particle) => ({
    imageSource: particle.imageSource ?? 'url',
    url: particle.url ?? '',
    soundUrl: particle.soundUrl ?? '',
    soundVolumePercent: asNumberString(particle.soundVolumePercent, '100'),
    soundFadeInMs: asNumberString(particle.soundFadeInMs, '0'),
    soundFadeOutMs: asNumberString(particle.soundFadeOutMs, '0'),
    delayMs: asNumberString(particle.delayMs, '0'),
    lifetimeMs: asNumberString(particle.lifetimeMs, '1000'),
    startSizePx: asNumberString(particle.startSizePx ?? particle.sizePx, '72'),
    endSizePx: asNumberString(particle.endSizePx ?? particle.sizePx ?? particle.startSizePx, '96'),
    offsetX: asNumberString(particle.offsetX, '0'),
    offsetY: asNumberString(particle.offsetY, '0'),
    endOffsetX: asNumberString(particle.endOffsetX ?? particle.offsetX, '0'),
    endOffsetY: asNumberString(particle.endOffsetY ?? particle.offsetY, '0'),
    acceleration: asNumberString(particle.acceleration, '0'),
    rotationStart: asNumberString(particle.rotationStart, '0'),
    rotationEnd: asNumberString(particle.rotationEnd ?? particle.rotationStart, '0'),
    loop: particle.loop ?? false,
  }))
  if (rows.length > 0) return rows
  return fallbackToEmptyRow ? [createEmptyStatusParticle()] : []
}

function parseNumber(input: string): number | undefined {
  if (input.trim() === '') return undefined
  const n = Number(input)
  return Number.isNaN(n) ? undefined : n
}

function parseSoundVolumePercent(input: string): number {
  const n = Number(input)
  if (Number.isNaN(n)) return 100
  return Math.min(100, Math.max(0, n))
}

export function buildStatusParticleList(particles: StatusParticleForm[]): StatusAnimationParticle[] {
  return particles
    .map((particle) => {
      const out: StatusAnimationParticle = {
        imageSource: particle.imageSource,
        loop: particle.loop,
      }
      if (particle.url.trim()) out.url = particle.url.trim()
      if (particle.soundUrl.trim()) out.soundUrl = particle.soundUrl.trim()
      if (particle.soundUrl.trim()) out.soundVolumePercent = parseSoundVolumePercent(particle.soundVolumePercent)
      if (particle.soundUrl.trim() && Number(particle.soundFadeInMs) > 0) out.soundFadeInMs = Number(particle.soundFadeInMs)
      if (particle.soundUrl.trim() && Number(particle.soundFadeOutMs) > 0) out.soundFadeOutMs = Number(particle.soundFadeOutMs)
      const delayMs = parseNumber(particle.delayMs)
      if (delayMs != null) out.delayMs = delayMs
      const lifetimeMs = parseNumber(particle.lifetimeMs)
      if (lifetimeMs != null) out.lifetimeMs = lifetimeMs

      const startSizePx = parseNumber(particle.startSizePx)
      const endSizePx = parseNumber(particle.endSizePx)
      if (startSizePx != null) out.startSizePx = startSizePx
      if (endSizePx != null) out.endSizePx = endSizePx
      if (startSizePx != null && endSizePx == null) out.endSizePx = startSizePx
      if (endSizePx != null && startSizePx == null) out.startSizePx = endSizePx

      const offsetX = parseNumber(particle.offsetX)
      const offsetY = parseNumber(particle.offsetY)
      const endOffsetX = parseNumber(particle.endOffsetX)
      const endOffsetY = parseNumber(particle.endOffsetY)
      if (offsetX != null) out.offsetX = offsetX
      if (offsetY != null) out.offsetY = offsetY
      if (endOffsetX != null) out.endOffsetX = endOffsetX
      if (endOffsetY != null) out.endOffsetY = endOffsetY

      const acceleration = parseNumber(particle.acceleration)
      if (acceleration != null) out.acceleration = acceleration

      const rotationStart = parseNumber(particle.rotationStart)
      const rotationEnd = parseNumber(particle.rotationEnd)
      if (rotationStart != null) out.rotationStart = rotationStart
      if (rotationEnd != null) out.rotationEnd = rotationEnd
      if (rotationStart != null && rotationEnd == null) out.rotationEnd = rotationStart

      return out
    })
    .filter((particle) => Boolean(particle.url || particle.imageSource !== 'url'))
}

export function buildStatusAnimation(
  particles: StatusParticleForm[],
  preTransformParticles: StatusParticleForm[] = [],
): StatusAnimation | undefined {
  const built = buildStatusParticleList(particles)
  const builtPreTransform = buildStatusParticleList(preTransformParticles)

  if (built.length === 0 && builtPreTransform.length === 0) return undefined
  const animation: StatusAnimation = {}
  if (built.length > 0) animation.particles = built
  if (builtPreTransform.length > 0) animation.preTransformParticles = builtPreTransform
  return animation
}

type Props = {
  particles: StatusParticleForm[]
  onChange: (next: StatusParticleForm[]) => void
  title?: string
}

export default function StatusAnimationEditor({ particles, onChange, title }: Props) {
  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="caption" color="text.secondary">{title ?? 'Status Animation Particles'}</Typography>
      {particles.map((particle, index) => (
        <Paper key={index} variant="outlined" sx={{ p: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Image</InputLabel>
            <Select
              value={particle.imageSource}
              label="Image"
              onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, imageSource: e.target.value as AnimationFrameImageSource } : x))}
            >
              {IMAGE_SOURCE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {particle.imageSource === 'url' && (
            <TextField
              size="small"
              label="Particle URL"
              value={particle.url}
              onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, url: e.target.value } : x))}
              sx={{ minWidth: 220, flex: 1 }}
            />
          )}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 260, flex: 1 }}>
            <TextField
              size="small"
              label="Sound URL"
              value={particle.soundUrl}
              onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, soundUrl: e.target.value } : x))}
              sx={{ minWidth: 220, flex: 1 }}
            />
            <SoundUploadButton
              onUploaded={(url) => onChange(particles.map((x, i) => i === index ? { ...x, soundUrl: url } : x))}
            />
          </Box>
          <TextField
            size="small"
            label="Sound %"
            type="number"
            value={particle.soundVolumePercent}
            onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, soundVolumePercent: e.target.value } : x))}
            sx={{ width: 110 }}
            inputProps={{ min: 0, max: 100 }}
          />
          <TextField
            size="small"
            label="Snd Fade-in"
            type="number"
            value={particle.soundFadeInMs}
            onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, soundFadeInMs: e.target.value } : x))}
            sx={{ width: 120 }}
            inputProps={{ min: 0 }}
          />
          <TextField
            size="small"
            label="Snd Fade-out"
            type="number"
            value={particle.soundFadeOutMs}
            onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, soundFadeOutMs: e.target.value } : x))}
            sx={{ width: 120 }}
            inputProps={{ min: 0 }}
          />
          <TextField size="small" label="Delay (ms)" type="number" value={particle.delayMs} onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, delayMs: e.target.value } : x))} sx={{ width: 110 }} />
          <TextField size="small" label="Lifetime (ms)" type="number" value={particle.lifetimeMs} onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, lifetimeMs: e.target.value } : x))} sx={{ width: 120 }} />
          <TextField size="small" label="Start size" type="number" value={particle.startSizePx} onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, startSizePx: e.target.value } : x))} sx={{ width: 110 }} />
          <TextField size="small" label="End size" type="number" value={particle.endSizePx} onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, endSizePx: e.target.value } : x))} sx={{ width: 110 }} />
          <TextField size="small" label="Offset X" type="number" value={particle.offsetX} onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, offsetX: e.target.value } : x))} sx={{ width: 100 }} />
          <TextField size="small" label="Offset Y" type="number" value={particle.offsetY} onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, offsetY: e.target.value } : x))} sx={{ width: 100 }} />
          <TextField size="small" label="End X" type="number" value={particle.endOffsetX} onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, endOffsetX: e.target.value } : x))} sx={{ width: 100 }} />
          <TextField size="small" label="End Y" type="number" value={particle.endOffsetY} onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, endOffsetY: e.target.value } : x))} sx={{ width: 100 }} />
          <TextField size="small" label="Acceleration" type="number" value={particle.acceleration} onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, acceleration: e.target.value } : x))} sx={{ width: 120 }} />
          <TextField size="small" label="Rot start" type="number" value={particle.rotationStart} onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, rotationStart: e.target.value } : x))} sx={{ width: 110 }} />
          <TextField size="small" label="Rot end" type="number" value={particle.rotationEnd} onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, rotationEnd: e.target.value } : x))} sx={{ width: 110 }} />
          <FormControlLabel
            control={<Checkbox size="small" checked={particle.loop} onChange={(e) => onChange(particles.map((x, i) => i === index ? { ...x, loop: e.target.checked } : x))} />}
            label="Loop"
          />
          <IconButton size="small" color="error" onClick={() => onChange(particles.filter((_, i) => i !== index))}>-</IconButton>
        </Paper>
      ))}
      <Button type="button" size="small" variant="outlined" onClick={() => onChange([...(particles ?? []), createEmptyStatusParticle()])}>+ Add status particle</Button>
    </Box>
  )
}

