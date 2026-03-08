import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
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
  fightButtonLabel?: string
  fightButtonDisabled?: boolean
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
  fightButtonLabel,
  fightButtonDisabled = false,
}: Props) {
  if (!open) return null

  return (
    <Box
      onClick={onClose}
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 1.25, sm: 2 },
        bgcolor: 'rgba(8,7,14,0.6)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <Paper
        onClick={(event) => event.stopPropagation()}
        sx={{
          width: 'min(640px, 96vw)',
          maxHeight: '92%',
          overflow: 'auto',
          p: 3,
        }}
        >
        {loading && (
          <Box sx={{ minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={28} />
          </Box>
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
                disabled={fighting || fightButtonDisabled}
                size="large"
                sx={{ px: 4, py: 1.5 }}
              >
                {fighting ? 'Fighting...' : (fightButtonLabel ?? 'Fight')}
              </Button>
            )}
          </Box>
        )}
      </Paper>
    </Box>
  )
}

