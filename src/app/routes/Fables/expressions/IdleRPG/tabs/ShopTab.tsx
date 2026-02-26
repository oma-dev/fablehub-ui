import { useState } from 'react'
import Box from '@mui/material/Box'
import merchantBg from '../../../../../../assets/backgrounds/merchant.png'
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
  const merchantListings = character.merchant?.listings ?? []

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

  const INVENTORY_COLS = 6
  const INVENTORY_ROWS = 4
  const INVENTORY_SLOTS = INVENTORY_COLS * INVENTORY_ROWS
  const ITEM_SIZE = 52
  const SLOT_GAP = 6

  const inventoryItems = character.inventory
    .map((inv) => ({ inv, item: itemMap.get(inv.itemId) }))
    .filter((x): x is { inv: { itemId: string; qty: number }; item: ItemTemplate } => !!x.item)

  const slots: ({ inv: { itemId: string; qty: number }; item: ItemTemplate } | null)[] = []
  for (let i = 0; i < INVENTORY_SLOTS; i++) {
    slots.push(inventoryItems[i] ?? null)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        backgroundImage: `url(${merchantBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >

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
          bgcolor: '#14121f',
          borderColor: 'rgba(168,85,247,0.35)',
          boxShadow: '0 0 24px rgba(0,0,0,0.4)',
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
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'rgba(20,18,31,0.82)',
            borderRadius: 2,
            border: '1px solid rgba(168,85,247,0.15)',
            m: 1.5,
            overflow: 'hidden',
          }}
        >
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
            {merchantListings.length === 0 ? (
              <Typography color="text.secondary" variant="body2">No items for sale.</Typography>
            ) : (
              <Box sx={{ display: 'inline-grid', gridTemplateColumns: 'repeat(3, auto)', gap: 10, justifyContent: 'center', width: '100%' }}>
                {merchantListings.map((listing) => {
                  const item = itemMap.get(listing.itemId)
                  if (!item) return null
                  const canAfford = gold >= listing.price
                  return (
                    <Box key={listing.itemId} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                      <ItemView
                        item={item}
                        currency={primaryCurrency}
                        price={listing.price}
                        size={120}
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

        <Divider sx={{ mx: 1.5 }} />

        {/* Inventory */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'rgba(20,18,31,0.82)',
            borderRadius: 2,
            border: '1px solid rgba(168,85,247,0.15)',
            m: 1.5,
            overflow: 'hidden',
          }}
        >
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
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: 1.5, pb: 1.5, display: 'flex', justifyContent: 'center' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${INVENTORY_COLS}, ${ITEM_SIZE}px)`,
                gap: SLOT_GAP,
                alignContent: 'start',
              }}
            >
              {slots.map((slot, index) => {
                if (!slot) {
                  return (
                    <Box
                      key={`empty-${index}`}
                      sx={{
                        width: ITEM_SIZE,
                        height: ITEM_SIZE,
                        borderRadius: 1,
                        border: '2px dashed rgba(168,85,247,0.2)',
                        bgcolor: 'rgba(20,18,31,0.6)',
                        flexShrink: 0,
                      }}
                    />
                  )
                }
                const { inv, item } = slot
                const isEquipped = Object.values(character.equipment).includes(inv.itemId)
                const equippedInSlot = character.equipment[item.slot] === inv.itemId
                const classCanEquip = canClassEquipItem(pack, character.classId, item)
                return (
                  <Box key={`${inv.itemId}-${index}`} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                    <ItemView
                      item={item}
                      currency={primaryCurrency}
                      size={ITEM_SIZE}
                      badge={inv.qty > 1 ? (
                        <Typography variant="caption" sx={{ fontSize: 9, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                          ×{inv.qty}
                        </Typography>
                      ) : undefined}
                    >
                      {isEquipped && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 1,
                            left: 1,
                            bgcolor: 'rgba(168,85,247,0.9)',
                            borderRadius: 0.5,
                            px: 0.35,
                            lineHeight: 1,
                          }}
                        >
                          <Typography variant="caption" sx={{ fontSize: 7, fontWeight: 800, color: '#fff' }}>
                            EQ
                          </Typography>
                        </Box>
                      )}
                    </ItemView>
                    {equippedInSlot ? (
                      <Chip
                        label="EQ"
                        size="small"
                        sx={{
                          fontSize: 9,
                          height: 18,
                          fontWeight: 700,
                          bgcolor: 'rgba(168,85,247,0.25)',
                          color: '#c084fc',
                          border: '1px solid rgba(168,85,247,0.4)',
                        }}
                      />
                    ) : classCanEquip ? (
                      <Tooltip title={`Equip to ${item.slot.replace('_', ' ')}`} arrow>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          disabled={equippingId !== null}
                          onClick={() => handleEquip(inv.itemId, item.slot)}
                          sx={{ minWidth: ITEM_SIZE, fontSize: 9, py: 0.1, textTransform: 'none' }}
                        >
                          {equippingId === inv.itemId ? '…' : 'Equip'}
                        </Button>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Your class cannot equip this item" arrow>
                        <Button size="small" variant="outlined" disabled sx={{ minWidth: ITEM_SIZE, fontSize: 8, py: 0.1, textTransform: 'none' }}>
                          —
                        </Button>
                      </Tooltip>
                    )}
                  </Box>
                )
              })}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
