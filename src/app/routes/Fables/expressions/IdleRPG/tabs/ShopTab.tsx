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
  common: '#9e9e9e',
  rare: '#1976d2',
  legendary: '#e65100',
}

function StatBonuses({ stats }: { stats: Partial<Record<string, number>> }) {
  const entries = Object.entries(stats).filter(([, v]) => v && v !== 0)
  if (!entries.length) return <Typography variant="caption" color="text.disabled">—</Typography>
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
      {entries.map(([k, v]) => (
        <Chip
          key={k}
          label={`${k} ${(v ?? 0) > 0 ? '+' : ''}${v}`}
          size="small"
          variant="outlined"
          sx={{ fontSize: 10, height: 18, borderColor: (v ?? 0) > 0 ? 'success.main' : 'error.main', color: (v ?? 0) > 0 ? 'success.dark' : 'error.dark' }}
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
      sx={{ fontSize: 10, height: 18, bgcolor: RARITY_COLORS[rarity] ?? '#9e9e9e', color: '#fff', fontWeight: 600 }}
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

  // Inventory: enrich with item data
  const inventoryItems = character.inventory
    .map((inv) => ({ inv, item: itemMap.get(inv.itemId) }))
    .filter((x): x is { inv: { itemId: string; qty: number }; item: ItemTemplate } => !!x.item)

  return (
    <Box sx={{ display: 'flex', gap: 2.5, height: '100%', overflow: 'hidden' }}>

      {/* ── LEFT: Character Panel ── */}
      <Paper
        variant="outlined"
        sx={{
          width: 600,
          flexShrink: 0,
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'auto',
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

      {/* ── RIGHT: Shop + Inventory ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden', minWidth: 0 }}>

        {error && (
          <Typography color="error" variant="body2" sx={{ px: 1, pt: 1 }}>{error}</Typography>
        )}

        {/* Merchant Shop */}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" fontWeight={700} sx={{ px: 1, pt: 1, pb: 0.5, flexShrink: 0 }}>Merchant</Typography>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 1, pb: 1 }}>
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
                    <Paper key={listing.itemId} variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                          <RarityChip rarity={item.rarity} />
                          <Chip label={item.slot.replace('_', ' ')} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                          {ownedQty > 0 && (
                            <Chip label={`Owned: ${ownedQty}`} size="small" color="success" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                          )}
                        </Box>
                        <Box sx={{ mt: 0.5 }}>
                          <StatBonuses stats={item.stats} />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, flexShrink: 0 }}>
                        <Typography variant="body2" fontWeight={600} color={canAfford ? 'warning.dark' : 'error.main'}>
                          {listing.price} {listing.currencyId}
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          color="warning"
                          disabled={!canAfford || buyingId === listing.itemId}
                          onClick={() => handleBuy(listing.itemId)}
                          sx={{ minWidth: 64 }}
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
          <Typography variant="h6" fontWeight={700} sx={{ px: 1, pt: 1, pb: 0.5, flexShrink: 0 }}>Inventory</Typography>
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 1, pb: 1 }}>
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
                        gap: 1.5,
                        px: 2,
                        py: 1,
                        borderColor: isEquipped ? 'primary.main' : 'divider',
                        bgcolor: isEquipped ? 'action.selected' : 'background.paper',
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                          <RarityChip rarity={item.rarity} />
                          <Chip label={item.slot.replace('_', ' ')} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                          {inv.qty > 1 && (
                            <Chip label={`×${inv.qty}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
                          )}
                          {isEquipped && (
                            <Chip label="Equipped" size="small" color="primary" sx={{ fontSize: 10, height: 18 }} />
                          )}
                        </Box>
                        <Box sx={{ mt: 0.5 }}>
                          <StatBonuses stats={item.stats} />
                        </Box>
                      </Box>
                      <Box sx={{ flexShrink: 0 }}>
                        {equippedInSlot ? (
                          <Chip label="Equipped" color="primary" size="small" />
                        ) : classCanEquip ? (
                          <Tooltip title={`Equip to ${item.slot.replace('_', ' ')} slot`} arrow>
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                disabled={equippingId === inv.itemId}
                                onClick={() => handleEquip(inv.itemId, item.slot)}
                                sx={{ minWidth: 64 }}
                              >
                                {equippingId === inv.itemId ? '…' : 'Equip'}
                              </Button>
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Your class cannot equip this item" arrow>
                            <span>
                              <Button size="small" variant="outlined" disabled>Can't equip</Button>
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
