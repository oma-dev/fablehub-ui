import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import PersonIcon from '@mui/icons-material/Person'
import type { ActiveStatusEffect } from '@features/idle-rpg/api'
import charBackground from '../../../../assets/backgrounds/charBackground.png'

interface ReplayPortraitProps {
  url?: string | null
  weaponUrl?: string | null
  sizePx: number
  personIconSizePx: number
  borderRadius: number
  borderWidth: number
  weaponSizePx?: number
  weaponOffsetPx?: number
}

interface ReplayBarProps {
  current: number
  max: number
  label: string
  fontSizePx: number
  heightPx: number
  radius: number
  colorHex?: string
}

const STATUS_EFFECT_COLORS: Record<string, string> = {
  buff: '#64b5f6',
  debuff: '#ef5350',
}

export function ReplayPortrait({
  url,
  weaponUrl,
  sizePx,
  personIconSizePx,
  borderRadius,
  borderWidth,
  weaponSizePx = 56,
  weaponOffsetPx = -24,
}: ReplayPortraitProps) {
  return (
    <Box sx={{ position: 'relative', width: sizePx, height: sizePx, flexShrink: 0 }}>
      <Box
        sx={{
          width: sizePx,
          height: sizePx,
          borderRadius,
          overflow: 'hidden',
          bgcolor: '#14121f',
          backgroundImage: `url(${charBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `${borderWidth}px solid rgba(168,85,247,0.35)`,
          boxShadow: '0 0 36px rgba(168,85,247,0.2), inset 0 0 24px rgba(0,0,0,0.3)',
        }}
      >
        {url ? (
          <Box
            component="img"
            src={url}
            alt="portrait"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.6)) drop-shadow(0 0 20px rgba(168,85,247,0.3))',
            }}
          />
        ) : (
          <PersonIcon sx={{ fontSize: personIconSizePx, color: 'rgba(168,85,247,0.25)' }} />
        )}
      </Box>
      {weaponUrl && (
        <Box
          component="img"
          src={weaponUrl}
          alt="weapon"
          sx={{
            position: 'absolute',
            bottom: weaponOffsetPx,
            right: weaponOffsetPx,
            width: weaponSizePx,
            height: weaponSizePx,
            objectFit: 'contain',
            borderRadius: '50%',
            border: '2px solid rgba(245,158,11,0.5)',
            bgcolor: '#14121f',
            boxShadow: '0 0 12px rgba(245,158,11,0.2)',
            zIndex: 5,
          }}
        />
      )}
    </Box>
  )
}

export function ReplayHpBar({
  current,
  max,
  label,
  fontSizePx,
  heightPx,
  radius,
}: ReplayBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const gradient = pct > 50
    ? 'linear-gradient(90deg, #4ade80, #22c55e)'
    : pct > 25
      ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
      : 'linear-gradient(90deg, #f87171, #ef4444)'
  const glowColor = pct > 50 ? 'rgba(34,197,94,0.3)' : pct > 25 ? 'rgba(251,191,36,0.3)' : 'rgba(239,68,68,0.3)'

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: fontSizePx }}>
          {label}
        </Typography>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: fontSizePx }}>
          {current} / {max}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: heightPx,
          borderRadius: radius,
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(168,85,247,0.1)',
          transition: 'none',
          '& .MuiLinearProgress-bar': {
            transition: 'transform 0.4s ease-out',
            borderRadius: radius,
            background: gradient,
            boxShadow: `0 0 10px ${glowColor}`,
          },
        }}
      />
    </Box>
  )
}

export function ReplayResourceBar({
  current,
  max,
  label,
  fontSizePx,
  heightPx,
  radius,
  colorHex = '#ffffff',
}: ReplayBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const color = colorHex.startsWith('#') ? colorHex : `#${colorHex}`

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: fontSizePx, color }}>
          {label}
        </Typography>
        <Typography variant="caption" fontWeight={700} sx={{ fontSize: fontSizePx }}>
          {current} / {max}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: heightPx,
          borderRadius: radius,
          bgcolor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'none',
          '& .MuiLinearProgress-bar': {
            transition: 'transform 0.4s ease-out',
            borderRadius: radius,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: `0 0 10px ${color}55`,
          },
        }}
      />
    </Box>
  )
}

export function ReplayStatusEffectIcons({
  effects,
  iconSize = 24,
}: {
  effects: ActiveStatusEffect[]
  iconSize?: number
}) {
  if (effects.length === 0) {
    return null
  }

  return (
    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap', mt: 0.5 }}>
      {effects.map((effect) => (
        <Tooltip
          key={effect.id}
          title={`${effect.name}${effect.description ? `: ${effect.description}` : ''} (${effect.remainingTurns} turns, ${effect.stacks ?? 1}/${effect.maxStacks ?? 1} stacks)`}
        >
          {effect.iconUrl ? (
            <Box
              component="img"
              src={effect.iconUrl}
              alt={effect.name}
              sx={{
                width: iconSize,
                height: iconSize,
                borderRadius: '4px',
                border: `1px solid ${STATUS_EFFECT_COLORS[effect.category ?? 'debuff'] ?? '#666'}`,
              }}
            />
          ) : (
            <Box
              sx={{
                width: iconSize,
                height: iconSize,
                borderRadius: '4px',
                bgcolor: STATUS_EFFECT_COLORS[effect.category ?? 'debuff'] ?? '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              {effect.name.charAt(0).toUpperCase()}
            </Box>
          )}
        </Tooltip>
      ))}
    </Box>
  )
}

