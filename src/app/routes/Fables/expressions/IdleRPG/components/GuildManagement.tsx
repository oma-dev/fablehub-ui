import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { donateToGuild } from '@features/idle-rpg/api'
import type { CharacterState, GuildChampion, IdleRpgGroup, IdleRpgPackV1 } from '@features/idle-rpg/api'

interface Props {
  group: IdleRpgGroup
  champion?: GuildChampion | null
  character: CharacterState
  pack: IdleRpgPackV1
  fableId: string
  realmId: string
  onDonateSuccess?: () => void
}

export default function GuildManagement({ group, champion, character, pack, fableId, realmId, onDonateSuccess }: Props) {
  const [donateOpen, setDonateOpen] = useState(false)
  const [donateCurrencyId, setDonateCurrencyId] = useState('')
  const [donateAmount, setDonateAmount] = useState('')
  const [donating, setDonating] = useState(false)
  const [donateError, setDonateError] = useState<string | null>(null)

  const displayName = `${group.name} ${group.label}`
  const memberCount = group.members?.length ?? 0
  const leader = group.leaderId
    ? group.members?.find((m) => m.id === group.leaderId)
    : null
  const championDisplay = champion ? `${champion.name} — ${champion.wins} wins` : '—'

  const stock = group.stockBalances ?? {}
  const stockDisplay = Object.entries(stock)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => {
      const name = pack.economy?.currencies?.find((c) => c.id === id)?.name ?? id
      return `${v} ${name}`
    })
    .join(', ') || '—'

  const handleDonateOpen = () => {
    setDonateError(null)
    setDonateCurrencyId(pack.economy?.currencies?.[0]?.id ?? '')
    setDonateAmount('')
    setDonateOpen(true)
  }

  const handleDonateSubmit = async () => {
    const amount = Number(donateAmount)
    if (!donateCurrencyId || amount < 1) return
    setDonateError(null)
    setDonating(true)
    try {
      await donateToGuild(fableId, realmId, group.id, {
        characterId: character.id,
        currencyId: donateCurrencyId,
        amount,
      })
      onDonateSuccess?.()
      setDonateOpen(false)
    } catch (err: unknown) {
      setDonateError(err instanceof Error ? err.message : 'Donation failed')
    } finally {
      setDonating(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
        Guild info
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <InfoRow label="Name" value={displayName} />
        <InfoRow label="Members" value={String(memberCount)} />
        <InfoRow label="Leader" value={leader?.name ?? '—'} />
        <InfoRow label="Created" value={group.createdAt ? new Date(group.createdAt).toLocaleDateString() : '—'} />
        <InfoRow label="Description" value="—" />
        <InfoRow label="Guild stock" value={stockDisplay} />
        <Button variant="outlined" size="small" onClick={handleDonateOpen} sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
          Donate
        </Button>
      </Box>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1.5 }}>
        Guild Champion
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <InfoRow label="Champion" value={championDisplay} />
      </Box>

      <Dialog open={donateOpen} onClose={() => !donating && setDonateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Donate to guild</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FormControl fullWidth size="small" sx={{ mt: 1, mb: 2 }}>
            <InputLabel>Currency</InputLabel>
            <Select
              value={donateCurrencyId}
              label="Currency"
              onChange={(e) => setDonateCurrencyId(e.target.value)}
            >
              {(pack.economy?.currencies ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Amount"
            type="number"
            fullWidth
            size="small"
            value={donateAmount}
            onChange={(e) => setDonateAmount(e.target.value)}
            inputProps={{ min: 1 }}
          />
          {donateError && (
            <Typography color="error" sx={{ mt: 2 }}>{donateError}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDonateOpen(false)} disabled={donating}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleDonateSubmit}
            disabled={donating || !donateCurrencyId || Number(donateAmount) < 1}
          >
            {donating ? 'Donating…' : 'Donate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'baseline' }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  )
}

