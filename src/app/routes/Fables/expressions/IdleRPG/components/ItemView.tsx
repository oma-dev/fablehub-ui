import { useState } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import CategoryIcon from '@mui/icons-material/Category'
import type { ItemTemplate } from '@features/idle-rpg/api'
import { RARITY_NAMES } from '@features/idle-rpg/api'

/** Rarity 1=common .. 5=legendary; colors keyed by number */
const RARITY_COLORS: Record<number, string> = {
  1: '#9e9bab',
  2: '#22c55e',
  3: '#3b82f6',
  4: '#a78bfa',
  5: '#f59e0b',
}

/** Slot background: grey / green / blue / purple / orange */
const RARITY_BG: Record<number, string> = {
  1: '#3d3b45',
  2: '#1e3d2a',
  3: '#1e2a4a',
  4: '#2e1f4a',
  5: '#4a3512',
}

const RARITY_BORDER: Record<number, string> = {
  1: 'rgba(158,155,171,0.4)',
  2: 'rgba(34,197,94,0.5)',
  3: 'rgba(59,130,246,0.5)',
  4: 'rgba(167,139,250,0.6)',
  5: 'rgba(245,158,11,0.7)',
}

const RARITY_GLOW: Record<number, string> = {
  1: 'none',
  2: '0 0 10px rgba(34,197,94,0.2)',
  3: '0 0 12px rgba(59,130,246,0.25)',
  4: '0 0 16px rgba(167,139,250,0.35), inset 0 0 20px rgba(139,92,246,0.08)',
  5: '0 0 20px rgba(245,158,11,0.4), 0 0 40px rgba(251,191,36,0.15), inset 0 0 24px rgba(251,191,36,0.06)',
}

/** Epic/legendary use gradient backgrounds for fancy slot */
const RARITY_BG_GRADIENT: Record<number, string | undefined> = {
  1: undefined,
  2: undefined,
  3: undefined,
  4: 'linear-gradient(145deg, rgba(88,28,135,0.4) 0%, rgba(139,92,246,0.25) 50%, rgba(30,27,75,0.9) 100%)',
  5: 'linear-gradient(145deg, rgba(180,83,9,0.35) 0%, rgba(245,158,11,0.3) 50%, rgba(75,45,5,0.95) 100%)',
}

interface ItemViewProps {
  item: ItemTemplate
  /** Primary currency info from pack.economy.currencies[0]. */
  currency?: { id: string; name: string; iconUrl?: string }
  /** Override price (e.g. from MerchantListing). Falls back to item.price.amount. */
  price?: number
  /** Size of the square in px. Defaults to 64. */
  size?: number
  /** Optional badge element rendered on top-right (e.g. quantity). */
  badge?: React.ReactNode
  children?: React.ReactNode
}

export default function ItemView({
  item,
  currency,
  price,
  size = 64,
  badge,
  children,
}: ItemViewProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const rarityNum = typeof item.rarity === 'number' ? item.rarity : 1
  const rarityColor = RARITY_COLORS[rarityNum] ?? RARITY_COLORS[1]
  const resolvedPrice = price ?? item.price?.amount
  const statEntries = Object.entries(item.stats).filter(([, v]) => v && v !== 0)

  return (
    <>
      <Box
        onMouseEnter={(e) => setAnchorEl(e.currentTarget)}
        onMouseLeave={() => setAnchorEl(null)}
        sx={{
          width: size,
          height: size,
          flexShrink: 0,
          position: 'relative',
          borderRadius: 1.5,
          border: `2px solid ${RARITY_BORDER[rarityNum] ?? RARITY_BORDER[1]}`,
          ...(RARITY_BG_GRADIENT[rarityNum]
            ? { background: RARITY_BG_GRADIENT[rarityNum] }
            : { bgcolor: RARITY_BG[rarityNum] ?? RARITY_BG[1] }),
          boxShadow: RARITY_GLOW[rarityNum] ?? 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
          '&:hover': {
            borderColor: rarityColor,
            boxShadow: rarityNum >= 4
              ? `0 0 24px ${rarityColor}60, 0 0 48px ${rarityColor}30`
              : `0 0 16px ${rarityColor}40`,
          },
        }}
      >
        {item.iconUrl ? (
          <Box
            component="img"
            src={item.iconUrl}
            alt={item.name}
            sx={{ width: '80%', height: '80%', objectFit: 'contain' }}
          />
        ) : (
          <CategoryIcon sx={{ fontSize: size * 0.45, color: rarityColor, opacity: 0.7 }} />
        )}

        {badge && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              bgcolor: 'rgba(0,0,0,0.75)',
              borderRadius: 0.75,
              px: 0.5,
              lineHeight: 1,
            }}
          >
            {badge}
          </Box>
        )}

        {children}
      </Box>

      <Popper
        open={open}
        anchorEl={anchorEl}
        placement="right-start"
        transition
        modifiers={[
          { name: 'offset', options: { offset: [0, 8] } },
          { name: 'preventOverflow', options: { padding: 12 } },
          { name: 'flip', enabled: true },
        ]}
        sx={{ zIndex: 1500, pointerEvents: 'none' }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={150}>
            <Paper
              elevation={12}
              sx={{
                minWidth: 200,
                maxWidth: 260,
                p: 1.5,
                bgcolor: 'rgba(18,16,30,0.97)',
                border: `1px solid ${rarityColor}50`,
                borderRadius: 2,
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Name */}
              <Typography
                variant="subtitle2"
                fontWeight={800}
                sx={{ color: rarityColor, lineHeight: 1.3, mb: 0.25 }}
              >
                {item.name}
              </Typography>

              {/* Rarity + slot */}
              <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                <Chip
                  label={RARITY_NAMES[rarityNum] ?? 'common'}
                  size="small"
                  sx={{
                    fontSize: 10,
                    height: 18,
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    bgcolor: `${rarityColor}18`,
                    color: rarityColor,
                    border: `1px solid ${rarityColor}30`,
                  }}
                />
                <Chip
                  label={item.slot.replace('_', ' ')}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 10, height: 18, textTransform: 'capitalize' }}
                />
              </Box>

              {/* Stats */}
              {statEntries.length > 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mb: 1 }}>
                  {statEntries.map(([stat, value]) => (
                    <Box key={stat} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 11 }}>
                        {stat}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: 12,
                          color: (value ?? 0) > 0 ? '#4ade80' : '#f87171',
                        }}
                      >
                        {(value ?? 0) > 0 ? '+' : ''}{value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Cost */}
              {resolvedPrice != null && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    pt: 0.75,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: 11 }}>
                    Cost:
                  </Typography>
                  {currency?.iconUrl && (
                    <Box
                      component="img"
                      src={currency.iconUrl}
                      alt={currency.name}
                      sx={{ width: 14, height: 14, objectFit: 'contain' }}
                    />
                  )}
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 12, color: '#fbbf24' }}>
                    {resolvedPrice} {currency?.name ?? item.price?.currencyId ?? ''}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

