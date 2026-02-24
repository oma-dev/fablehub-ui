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
import ItemView from '../components/ItemView'

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  onCharacterUpdate: (c: CharacterState) => void
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
  const primaryCurrency = pack.economy.currencies[0]

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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {pack.merchant.listings.map((listing) => {
                  const item = itemMap.get(listing.itemId)
                  if (!item) return null
                  const canAfford = gold >= listing.price
                  return (
                    <Box key={listing.itemId} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      <ItemView
                        item={item}
                        currency={primaryCurrency}
                        price={listing.price}
                        size={68}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        disabled={!canAfford || buyingId !== null}
                        onClick={() => handleBuy(listing.itemId)}
                        sx={{ minWidth: 68, fontSize: 11, py: 0.25, textTransform: 'none' }}
                      >
                        {buyingId === listing.itemId ? '…' : `${listing.price}g`}
                      </Button>
                    </Box>
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                {inventoryItems.map(({ inv, item }) => {
                  const isEquipped = Object.values(character.equipment).includes(inv.itemId)
                  const equippedInSlot = character.equipment[item.slot] === inv.itemId
                  const classCanEquip = canClassEquipItem(pack, character.classId, item)
                  return (
                    <Box key={inv.itemId} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      <ItemView
                        item={item}
                        currency={primaryCurrency}
                        size={68}
                        badge={inv.qty > 1 ? (
                          <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                            ×{inv.qty}
                          </Typography>
                        ) : undefined}
                      >
                        {isEquipped && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 2,
                              left: 2,
                              bgcolor: 'rgba(168,85,247,0.85)',
                              borderRadius: 0.5,
                              px: 0.4,
                              lineHeight: 1,
                            }}
                          >
                            <Typography variant="caption" sx={{ fontSize: 8, fontWeight: 800, color: '#fff' }}>
                              EQ
                            </Typography>
                          </Box>
                        )}
                      </ItemView>
                      {equippedInSlot ? (
                        <Chip
                          label="Equipped"
                          size="small"
                          sx={{
                            fontSize: 10,
                            height: 20,
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
                              size="small"
                              variant="outlined"
                              color="primary"
                              disabled={equippingId !== null}
                              onClick={() => handleEquip(inv.itemId, item.slot)}
                              sx={{ minWidth: 68, fontSize: 11, py: 0.15, textTransform: 'none' }}
                            >
                              {equippingId === inv.itemId ? '…' : 'Equip'}
                            </Button>
                          </span>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Your class cannot equip this item" arrow>
                          <span>
                            <Button size="small" variant="outlined" disabled sx={{ minWidth: 68, fontSize: 10, py: 0.15, textTransform: 'none' }}>
                              Can't equip
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </Box>
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
