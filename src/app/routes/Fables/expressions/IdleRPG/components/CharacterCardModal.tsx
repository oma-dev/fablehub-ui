import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Typography from '@mui/material/Typography'
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi'
import type { PlayStateResponse } from '@features/idle-rpg/api'
import CharacterPanel from './CharacterPanel'

interface Props {
  open: boolean
  onClose: () => void
  profile: PlayStateResponse | null
  loading?: boolean
  error?: string | null
  fableId: string
  realmId: string
  /** Show Fight button (e.g. PvP, Guild roster). Parent should hide when target === viewer. */
  showFightButton?: boolean
  onFight?: () => void
  fighting?: boolean
}

export default function CharacterCardModal({
  open,
  onClose,
  profile,
  loading = false,
  error = null,
  fableId,
  realmId,
  showFightButton = false,
  onFight,
  fighting = false,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent sx={{ pt: 3, pb: 3 }}>
        {loading && (
          <Typography color="text.secondary">Loading...</Typography>
        )}
        {error && (
          <Typography color="error">{error}</Typography>
        )}
        {profile && !loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CharacterPanel
              fableId={fableId}
              realmId={realmId}
              character={profile.character}
              pack={profile.pack}
              onCharacterUpdate={() => {}}
              readOnly
            />
            {showFightButton && onFight && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<SportsKabaddiIcon />}
                onClick={onFight}
                disabled={fighting}
                size="large"
                sx={{ px: 4, py: 1.5 }}
              >
                {fighting ? 'Fighting...' : 'Fight'}
              </Button>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

