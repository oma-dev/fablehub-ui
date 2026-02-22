import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { buyItem } from '../../../../../../services/api'
import type { CharacterState, IdleRpgPackV1 } from '../../../../../../services/api'

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  onCharacterUpdate: (c: CharacterState) => void
}

export default function ShopTab({ fableId, realmId, character, pack, onCharacterUpdate }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [buyingId, setBuyingId] = useState<string | null>(null)
  const gold = character.balances.gold ?? 0

  const itemMap = new Map(pack.items.map((it) => [it.id, it]))

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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflow: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h6" fontWeight={600}>Merchant</Typography>
        <Chip label={`Gold: ${gold}`} color="warning" variant="outlined" />
      </Box>

      {error && <Typography color="error">{error}</Typography>}

      {/* Listings */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Rarity</TableCell>
              <TableCell>Slot</TableCell>
              <TableCell>Stats</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {pack.merchant.listings.map((listing) => {
              const item = itemMap.get(listing.itemId)
              if (!item) return null
              const canAfford = gold >= listing.price
              return (
                <TableRow key={listing.itemId}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell><Chip label={item.rarity} size="small" variant="outlined" /></TableCell>
                  <TableCell>{item.slot.replace('_', ' ')}</TableCell>
                  <TableCell>
                    {Object.entries(item.stats).map(([k, v]) => `${k}:${v}`).join(', ')}
                  </TableCell>
                  <TableCell align="right">{listing.price} {listing.currencyId}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!canAfford || buyingId === listing.itemId}
                      onClick={() => handleBuy(listing.itemId)}
                    >
                      {buyingId === listing.itemId ? '...' : 'Buy'}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Inventory */}
      <Divider />
      <Typography variant="h6" fontWeight={600}>Inventory</Typography>
      {character.inventory.length === 0 ? (
        <Typography color="text.secondary">Empty</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {character.inventory.map((inv) => {
            const item = itemMap.get(inv.itemId)
            return (
              <Chip key={inv.itemId} label={`${item?.name ?? inv.itemId} x${inv.qty}`} variant="outlined" />
            )
          })}
        </Box>
      )}
    </Box>
  )
}
