import { useState } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import CategoryIcon from '@mui/icons-material/Category'
import type { ItemTemplate } from '../../../../../../services/api'

const RARITY_COLORS: Record<string, string> = {
  common: '#9e9bab',
  rare: '#818cf8',
  legendary: '#fbbf24',
}

const RARITY_BG: Record<string, string> = {
  common: 'rgba(158,155,171,0.06)',
  rare: 'rgba(129,140,248,0.08)',
  legendary: 'rgba(251,191,36,0.10)',
}

const RARITY_BORDER: Record<string, string> = {
  common: 'rgba(158,155,171,0.25)',
  rare: 'rgba(129,140,248,0.35)',
  legendary: 'rgba(251,191,36,0.40)',
}

const RARITY_GLOW: Record<string, string> = {
  common: 'none',
  rare: '0 0 10px rgba(129,140,248,0.15)',
  legendary: '0 0 14px rgba(251,191,36,0.25)',
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

  const rarityColor = RARITY_COLORS[item.rarity] ?? RARITY_COLORS.common
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
          border: `2px solid ${RARITY_BORDER[item.rarity] ?? RARITY_BORDER.common}`,
          bgcolor: RARITY_BG[item.rarity] ?? RARITY_BG.common,
          boxShadow: RARITY_GLOW[item.rarity] ?? 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
          '&:hover': {
            borderColor: rarityColor,
            boxShadow: `0 0 16px ${rarityColor}40`,
            
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
                  label={item.rarity}
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
