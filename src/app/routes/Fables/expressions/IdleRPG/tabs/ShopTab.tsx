import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { buyItem, equipItem } from '../../../../../../services/api'
import type { CharacterState, IdleRpgPackV1, ItemTemplate } from '../../../../../../services/api'
import CharacterPanel from '../components/CharacterPanel'

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  onCharacterUpdate: (c: CharacterState) => void
}

const RARITY_COLORS: Record<string, string> = {
  common: '#78748a',
  rare: '#818cf8',
  legendary: '#fbbf24',
}

function StatBonuses({ stats }: { stats: Partial<Record<string, number>> }) {
  const entries = Object.entries(stats).filter(([, v]) => v && v !== 0)
  if (!entries.length) return <Typography variant="caption" color="text.disabled">—</Typography>
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {entries.map(([k, v]) => (
        <Chip
          key={k}
          label={`${k} ${(v ?? 0) > 0 ? '+' : ''}${v}`}
          size="small"
          variant="outlined"
          sx={{
            fontSize: 11,
            height: 22,
            fontWeight: 600,
            borderColor: (v ?? 0) > 0 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
            color: (v ?? 0) > 0 ? '#4ade80' : '#f87171',
          }}
        />
      ))}
    </Box>
  )
}

function RarityChip({ rarity }: { rarity: string }) {
  return (
    <Chip
      label={rarity}
      size="small"
      sx={{
        fontSize: 11,
        height: 22,
        fontWeight: 700,
        bgcolor: `${RARITY_COLORS[rarity] ?? '#78748a'}25`,
        color: RARITY_COLORS[rarity] ?? '#78748a',
        border: `1px solid ${RARITY_COLORS[rarity] ?? '#78748a'}40`,
      }}
    />
  )
}

function canClassEquipItem(pack: IdleRpgPackV1, classId: string, item: ItemTemplate): boolean {
  const cls = pack.classes.find((c) => c.id === classId)
  if (!cls) return false
  const slotRule = cls.slots?.[item.slot]
  if (!slotRule) return false
  const allowed = slotRule.allowedTagsAny ?? []
  if (allowed.length === 0) return true
  return item.tags.some((t) => allowed.includes(t))
}

export default function ShopTab({ fableId, realmId, character, pack, onCharacterUpdate }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [equippingId, setEquippingId] = useState<string | null>(null)

  const itemMap = new Map(pack.items.map((it) => [it.id, it]))
  const gold = character.balances.gold ?? 0

  const handleBuy = async (itemId: string) => {
    setError(null)
    setBuyingId(itemId)
    try {
      const updated = await buyItem(fableId, realmId, character.id, itemId)
      onCharacterUpdate(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Purchase failed')
    } finally {
      setBuyingId(null)
    }
  }

  const handleEquip = async (itemId: string, slot: string) => {
    setError(null)
    setEquippingId(itemId)
    try {
      const updated = await equipItem(fableId, realmId, character.id, slot, itemId)
      onCharacterUpdate(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not equip item')
    } finally {
      setEquippingId(null)
    }
  }

  const inventoryItems = character.inventory
    .map((inv) => ({ inv, item: itemMap.get(inv.itemId) }))
    .filter((x): x is { inv: { itemId: string; qty: number }; item: ItemTemplate } => !!x.item)

  return (
    <Box sx={{ display: 'flex', gap: 3, flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* LEFT: Character Panel */}
      <Paper
        variant="outlined"
        sx={{
          width: 600,
          flexShrink: 0,
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'auto',
          background: 'linear-gradient(180deg, rgba(168,85,247,0.05) 0%, rgba(20,18,31,0.9) 100%)',
          borderColor: 'rgba(168,85,247,0.15)',
        }}
      >
        <CharacterPanel
          fableId={fableId}
          realmId={realmId}
          character={character}
          pack={pack}
          onCharacterUpdate={onCharacterUpdate}
        />
      </Paper>

      {/* RIGHT: Shop + Inventory */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden', minWidth: 0 }}>

        {error && (
          <Typography color="error" variant="body2" sx={{ px: 1.5, pt: 1.5 }}>{error}</Typography>
        )}

        {/* Merchant Shop */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              px: 1.5,
              pt: 1.5,
              pb: 1,
              flexShrink: 0,
              background: 'linear-gradient(90deg, #e8e4f0, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '1.2rem',
            }}
          >
            Merchant
          </Typography>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 1.5, pb: 1.5 }}>
            {pack.merchant.listings.length === 0 ? (
              <Typography color="text.secondary" variant="body2">No items for sale.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {pack.merchant.listings.map((listing) => {
                  const item = itemMap.get(listing.itemId)
                  if (!item) return null
                  const canAfford = gold >= listing.price
                  const ownedQty = character.inventory.find((i) => i.itemId === listing.itemId)?.qty ?? 0
                  return (
                    <Paper
                      key={listing.itemId}
                      variant="outlined"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        px: 2.5,
                        py: 1.5,
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          borderColor: 'rgba(168,85,247,0.35)',
                          boxShadow: '0 0 12px rgba(168,85,247,0.1)',
                        },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body1" fontWeight={700}>{item.name}</Typography>
                          <RarityChip rarity={item.rarity} />
                          <Chip label={item.slot.replace('_', ' ')} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                          {ownedQty > 0 && (
                            <Chip label={`Owned: ${ownedQty}`} size="small" variant="outlined" sx={{ fontSize: 11, height: 22, borderColor: 'rgba(34,197,94,0.4)', color: '#4ade80' }} />
                          )}
                        </Box>
                        <Box sx={{ mt: 0.75 }}>
                          <StatBonuses stats={item.stats} />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75, flexShrink: 0 }}>
                        <Typography variant="body1" fontWeight={700} sx={{ color: canAfford ? '#fbbf24' : '#f87171' }}>
                          {listing.price} {listing.currencyId}
                        </Typography>
                        <Button
                          size="medium"
                          variant="contained"
                          color="warning"
                          disabled={!canAfford || buyingId !== null}
                          onClick={() => handleBuy(listing.itemId)}
                          sx={{ minWidth: 80 }}
                        >
                          {buyingId === listing.itemId ? '…' : 'Buy'}
                        </Button>
                      </Box>
                    </Paper>
                  )
                })}
              </Box>
            )}
          </Box>
        </Box>

        <Divider />

        {/* Inventory */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              px: 1.5,
              pt: 1.5,
              pb: 1,
              flexShrink: 0,
              background: 'linear-gradient(90deg, #e8e4f0, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '1.2rem',
            }}
          >
            Inventory
          </Typography>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 1.5, pb: 1.5 }}>
            {inventoryItems.length === 0 ? (
              <Typography color="text.secondary" variant="body2">Your bag is empty.</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {inventoryItems.map(({ inv, item }) => {
                  const isEquipped = Object.values(character.equipment).includes(inv.itemId)
                  const equippedInSlot = character.equipment[item.slot] === inv.itemId
                  const classCanEquip = canClassEquipItem(pack, character.classId, item)
                  return (
                    <Paper
                      key={inv.itemId}
                      variant="outlined"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        px: 2.5,
                        py: 1.5,
                        borderColor: isEquipped ? 'rgba(168,85,247,0.4)' : undefined,
                        bgcolor: isEquipped ? 'rgba(168,85,247,0.08)' : undefined,
                        boxShadow: isEquipped ? '0 0 12px rgba(168,85,247,0.12)' : undefined,
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          borderColor: 'rgba(168,85,247,0.35)',
                          boxShadow: '0 0 12px rgba(168,85,247,0.1)',
                        },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body1" fontWeight={700}>{item.name}</Typography>
                          <RarityChip rarity={item.rarity} />
                          <Chip label={item.slot.replace('_', ' ')} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                          {inv.qty > 1 && (
                            <Chip label={`×${inv.qty}`} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
                          )}
                          {isEquipped && (
                            <Chip
                              label="Equipped"
                              size="small"
                              sx={{
                                fontSize: 11,
                                height: 22,
                                fontWeight: 700,
                                bgcolor: 'rgba(168,85,247,0.2)',
                                color: '#c084fc',
                                border: '1px solid rgba(168,85,247,0.3)',
                              }}
                            />
                          )}
                        </Box>
                        <Box sx={{ mt: 0.75 }}>
                          <StatBonuses stats={item.stats} />
                        </Box>
                      </Box>
                      <Box sx={{ flexShrink: 0 }}>
                        {equippedInSlot ? (
                          <Chip
                            label="Equipped"
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: 'rgba(168,85,247,0.2)',
                              color: '#c084fc',
                              border: '1px solid rgba(168,85,247,0.3)',
                            }}
                          />
                        ) : classCanEquip ? (
                          <Tooltip title={`Equip to ${item.slot.replace('_', ' ')} slot`} arrow>
                            <span>
                              <Button
                                size="medium"
                                variant="outlined"
                                color="primary"
                                disabled={equippingId !== null}
                                onClick={() => handleEquip(inv.itemId, item.slot)}
                                sx={{ minWidth: 80 }}
                              >
                                {equippingId === inv.itemId ? '…' : 'Equip'}
                              </Button>
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Your class cannot equip this item" arrow>
                            <span>
                              <Button size="medium" variant="outlined" disabled>Can't equip</Button>
                            </span>
                          </Tooltip>
                        )}
                      </Box>
                    </Paper>
                  )
                })}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
