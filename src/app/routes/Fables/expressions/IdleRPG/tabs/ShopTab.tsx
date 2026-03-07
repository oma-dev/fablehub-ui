import { useState } from 'react'
import Box from '@mui/material/Box'
import merchantBg from '../../../../../../assets/backgrounds/merchant.png'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { buyItem, equipItem, sellItem } from '@features/idle-rpg/api'
import type { CharacterState, IdleRpgPackV1, ItemTemplate } from '@features/idle-rpg/api'
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
  const [sellingId, setSellingId] = useState<string | null>(null)

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

  const handleSell = async (itemId: string) => {
    setError(null)
    setSellingId(itemId)
    try {
      const updated = await sellItem(fableId, realmId, character.id, itemId, 1)
      onCharacterUpdate(updated)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not sell item')
    } finally {
      setSellingId(null)
    }
  }

  const INVENTORY_COLS = 6
  const INVENTORY_ROWS = 4
  const INVENTORY_SLOTS = INVENTORY_COLS * INVENTORY_ROWS
  const ITEM_SIZE = 60
  const SLOT_GAP = 8

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
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        backgroundImage: `url(${merchantBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        p: { xs: 1, sm: 1.5 },
      }}
    >
      {error && (
        <Typography color="error" variant="body2" sx={{ px: 1, pb: 1 }}>
          {error}
        </Typography>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(320px, 0.85fr) minmax(420px, 1fr) minmax(560px, 1.2fr)',
          },
        }}
      >
        <Paper
          variant="outlined"
          sx={{
            minHeight: 0,
            p: 1.25,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            bgcolor: 'rgba(20,18,31,0.9)',
            borderColor: 'rgba(168,85,247,0.28)',
            boxShadow: '0 16px 28px rgba(0,0,0,0.34)',
          }}
        >
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{
              px: 1,
              pb: 1,
              background: 'linear-gradient(90deg, #f8f5ff, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Adventurer
          </Typography>
          <CharacterPanel
            fableId={fableId}
            realmId={realmId}
            character={character}
            pack={pack}
            onCharacterUpdate={onCharacterUpdate}
          />
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: 'rgba(16,14,25,0.9)',
            borderColor: 'rgba(192,132,252,0.25)',
            boxShadow: 'inset 0 0 40px rgba(124,58,237,0.09), 0 16px 28px rgba(0,0,0,0.3)',
          }}
        >
          <Box sx={{ px: 1.5, py: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{
                background: 'linear-gradient(90deg, #f1ecff, #c084fc)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Inventory
            </Typography>
            <Chip
              label={`${inventoryItems.length}/${INVENTORY_SLOTS}`}
              size="small"
              sx={{
                fontWeight: 700,
                color: '#e9d5ff',
                bgcolor: 'rgba(88,28,135,0.35)',
                border: '1px solid rgba(192,132,252,0.3)',
              }}
            />
          </Box>
          <Divider />

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 1.5 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${INVENTORY_COLS}, minmax(110px, 1fr))`,
                gap: `${SLOT_GAP}px`,
                alignContent: 'start',
              }}
            >
              {slots.map((slot, index) => {
                if (!slot) {
                  return (
                    <Box
                      key={`empty-${index}`}
                      sx={{
                        minHeight: 132,
                        borderRadius: 2,
                        border: '1px dashed rgba(168,85,247,0.3)',
                        background: 'linear-gradient(180deg, rgba(26,23,38,0.7), rgba(18,16,28,0.75))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(203,213,225,0.36)',
                        fontSize: 11,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Empty
                    </Box>
                  )
                }

                const { inv, item } = slot
                const isEquipped = Object.values(character.equipment).includes(inv.itemId)
                const equippedInSlot = character.equipment[item.slot] === inv.itemId
                const classCanEquip = canClassEquipItem(pack, character.classId, item)

                return (
                  <Box
                    key={`${inv.itemId}-${index}`}
                    sx={{
                      minHeight: 132,
                      borderRadius: 2,
                      p: 0.85,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.6,
                      border: isEquipped
                        ? '1px solid rgba(192,132,252,0.72)'
                        : '1px solid rgba(148,163,184,0.22)',
                      bgcolor: 'rgba(20,18,31,0.9)',
                      boxShadow: isEquipped
                        ? '0 0 16px rgba(168,85,247,0.28)'
                        : '0 8px 16px rgba(0,0,0,0.22)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip
                        label={equippedInSlot ? 'EQ' : item.slot.replace('_', ' ')}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: 9,
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          color: equippedInSlot ? '#f5d0fe' : '#cbd5e1',
                          bgcolor: equippedInSlot ? 'rgba(168,85,247,0.35)' : 'rgba(71,85,105,0.35)',
                          border: equippedInSlot
                            ? '1px solid rgba(192,132,252,0.5)'
                            : '1px solid rgba(148,163,184,0.3)',
                        }}
                      />
                      {inv.qty > 1 && (
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#f8fafc', opacity: 0.9 }}>
                          x{inv.qty}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <ItemView item={item} currency={primaryCurrency} size={ITEM_SIZE} />
                    </Box>

                    <Box sx={{ mt: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
                      {classCanEquip ? (
                        <Tooltip title={`Equip to ${item.slot.replace('_', ' ')}`} arrow>
                          <Button
                            size="small"
                            variant={equippedInSlot ? 'contained' : 'outlined'}
                            color="primary"
                            disabled={equippingId !== null || sellingId !== null || equippedInSlot}
                            onClick={() => handleEquip(inv.itemId, item.slot)}
                            sx={{ fontSize: 10, py: 0.2, minWidth: 0, textTransform: 'none' }}
                          >
                            {equippingId === inv.itemId ? '...' : equippedInSlot ? 'Equipped' : 'Equip'}
                          </Button>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Your class cannot equip this item" arrow>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled
                            sx={{ fontSize: 10, py: 0.2, minWidth: 0, textTransform: 'none' }}
                          >
                            Locked
                          </Button>
                        </Tooltip>
                      )}

                      <Tooltip title={`Sell for ${Math.max(0, item.sellValue ?? 0)} ${primaryCurrency?.name ?? 'Gold'}`} arrow>
                        <Button
                          size="small"
                          variant="text"
                          color="warning"
                          disabled={sellingId !== null || equippingId !== null}
                          onClick={() => handleSell(inv.itemId)}
                          sx={{ fontSize: 10, py: 0.2, minWidth: 0, textTransform: 'none' }}
                        >
                          {sellingId === inv.itemId ? '...' : `Sell ${Math.max(0, item.sellValue ?? 0)}`}
                        </Button>
                      </Tooltip>
                    </Box>
                  </Box>
                )
              })}
            </Box>
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            bgcolor: 'rgba(16,14,24,0.92)',
            borderColor: 'rgba(251,191,36,0.24)',
            boxShadow: 'inset 0 0 44px rgba(251,191,36,0.06), 0 16px 28px rgba(0,0,0,0.35)',
          }}
        >
          <Box sx={{ px: 1.5, py: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography
              variant="h6"
              fontWeight={800}
              sx={{
                background: 'linear-gradient(90deg, #fff7d6, #fbbf24)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Merchant Wares
            </Typography>
            <Chip
              label={`${gold} ${primaryCurrency?.name ?? 'Gold'}`}
              size="small"
              sx={{
                fontWeight: 700,
                color: '#fde68a',
                bgcolor: 'rgba(180,83,9,0.25)',
                border: '1px solid rgba(251,191,36,0.35)',
              }}
            />
          </Box>
          <Divider />

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 1.5 }}>
            {merchantListings.length === 0 ? (
              <Typography color="text.secondary" variant="body2">
                No items for sale.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' },
                  gap: 1.1,
                }}
              >
                {merchantListings.map((listing) => {
                  const item = itemMap.get(listing.itemId)
                  if (!item) return null
                  const canAfford = gold >= listing.price

                  return (
                    <Box
                      key={listing.itemId}
                      sx={{
                        borderRadius: 2,
                        p: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.75,
                        border: canAfford
                          ? '1px solid rgba(251,191,36,0.28)'
                          : '1px solid rgba(148,163,184,0.2)',
                        bgcolor: canAfford
                          ? 'rgba(44,31,10,0.38)'
                          : 'rgba(30,27,40,0.55)',
                        boxShadow: canAfford
                          ? '0 0 16px rgba(251,191,36,0.09)'
                          : '0 8px 14px rgba(0,0,0,0.22)',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <ItemView item={item} currency={primaryCurrency} price={listing.price} size={96} />
                      </Box>

                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: '#f8fafc',
                          textAlign: 'center',
                          lineHeight: 1.2,
                          minHeight: 32,
                        }}
                      >
                        {item.name}
                      </Typography>

                      <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        disabled={!canAfford || buyingId !== null}
                        onClick={() => handleBuy(listing.itemId)}
                        sx={{ fontSize: 11, py: 0.35, textTransform: 'none' }}
                      >
                        {buyingId === listing.itemId ? '...' : `Buy • ${listing.price}g`}
                      </Button>
                    </Box>
                  )
                })}
              </Box>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}
