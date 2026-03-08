import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {
  getRaids,
  getGroup,
  prepareRaidCall,
} from '@features/idle-rpg/api'
import type {
  CharacterState,
  IdleRpgGroup,
  IdleRpgPackV1,
  RaidWithBoss,
} from '@features/idle-rpg/api'
import raidFallbackBg from '../../../../../../assets/backgrounds/questRoad.png'

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  groupId: string
  onCharacterUpdate: (character: CharacterState) => void
}

export default function RaidsTab({ fableId, realmId, character, pack: _pack, groupId, onCharacterUpdate: _onCharacterUpdate }: Props) {
  const [raids, setRaids] = useState<RaidWithBoss[]>([])
  const [group, setGroup] = useState<IdleRpgGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [raidIndex, setRaidIndex] = useState(0)
  const [preparing, setPreparing] = useState(false)

  const isLeader = group?.leaderId === character.id
  const currentRaid = raids[raidIndex] ?? null
  const hasActiveRaidCall = Boolean(group?.currentRaidCall)
  const canGoRight = raidIndex < raids.length - 1

  useEffect(() => {
    if (!fableId || !realmId || !character?.id || !groupId) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      getRaids(fableId, realmId, character.id),
      getGroup(fableId, realmId, groupId),
    ])
      .then(([raidsResponse, loadedGroup]) => {
        if (!cancelled) {
          setRaids(raidsResponse.raids ?? [])
          setGroup(loadedGroup)
        }
      })
      .catch((unknownError: unknown) => {
        if (!cancelled) {
          setError(unknownError instanceof Error ? unknownError.message : 'Failed to load raids')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [fableId, realmId, character.id, groupId])

  const handlePrepare = async () => {
    if (!currentRaid || preparing || hasActiveRaidCall) return
    setError(null)
    setPreparing(true)

    try {
      await prepareRaidCall(fableId, realmId, groupId, { raidId: currentRaid.id, characterId: character.id })
      const updatedGroup = await getGroup(fableId, realmId, groupId)
      setGroup(updatedGroup)
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : 'Failed to prepare raid')
    } finally {
      setPreparing(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, p: { xs: 1, sm: 1.5 }, gap: 1 }}>
      {error && (
        <Typography color="error" sx={{ px: 0.5 }}>
          {error}
        </Typography>
      )}

      {loading && (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!loading && raids.length === 0 && (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">No raids in this realm.</Typography>
        </Box>
      )}

      {!loading && raids.length > 0 && currentRaid && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 2,
            backgroundImage: `url(${currentRaid.imageUrl || raidFallbackBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: {
                xs: 'linear-gradient(180deg, rgba(2,6,23,0.72) 0%, rgba(2,6,23,0.86) 55%, rgba(2,6,23,0.92) 100%)',
                md: 'linear-gradient(265deg, rgba(2,6,23,0.95) 0%, rgba(2,6,23,0.78) 44%, rgba(2,6,23,0.14) 80%, rgba(2,6,23,0.02) 100%)',
              },
            }}
          />

          <IconButton
            size="large"
            onClick={() => setRaidIndex((index) => Math.max(0, index - 1))}
            disabled={raidIndex <= 0}
            sx={{
              position: 'absolute',
              left: { xs: 6, sm: 12, md: 16 },
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'primary.main',
              bgcolor: 'rgba(15,23,42,0.56)',
              '&:hover': { bgcolor: 'rgba(15,23,42,0.72)' },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>

          <IconButton
            size="large"
            onClick={() => setRaidIndex((index) => Math.min(raids.length - 1, index + 1))}
            disabled={!canGoRight}
            sx={{
              position: 'absolute',
              right: { xs: 6, sm: 12, md: 16 },
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'primary.main',
              bgcolor: 'rgba(15,23,42,0.56)',
              '&:hover': { bgcolor: 'rgba(15,23,42,0.72)' },
            }}
          >
            <ChevronRightIcon />
          </IconButton>

          <Box
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: { xs: '100%', md: '48%' },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: { xs: 2.5, sm: 3.5, md: 5 },
              py: { xs: 2.5, sm: 3.5, md: 4 },
            }}
          >
            <Box sx={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Typography variant="overline" sx={{ letterSpacing: 1.7, color: 'rgba(226,232,240,0.72)', fontWeight: 700 }}>
                Raid {raidIndex + 1} / {raids.length}
              </Typography>

              <Typography
                variant="h3"
                fontWeight={900}
                sx={{
                  lineHeight: 1.08,
                  background: 'linear-gradient(90deg, #f8fafc, #c7d2fe)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {currentRaid.name}
              </Typography>

              {currentRaid.description && (
                <Typography sx={{ color: 'rgba(226,232,240,0.86)', fontSize: 15 }}>
                  {currentRaid.description}
                </Typography>
              )}

              <Typography sx={{ color: 'rgba(226,232,240,0.9)', fontWeight: 600 }}>
                Required level: <strong>{currentRaid.requiredLevel}</strong>
              </Typography>

              <Typography sx={{ color: 'rgba(226,232,240,0.9)', fontWeight: 600 }}>
                Cost: <strong>{currentRaid.requiredCurrencyCost?.amount ?? 0} {currentRaid.requiredCurrencyCost?.currencyId ?? ''}</strong>
              </Typography>

              <Typography sx={{ color: 'rgba(148,163,184,0.95)', fontWeight: 600 }}>
                Guild stock: {currentRaid.guildStock ?? 0}
              </Typography>

              {!currentRaid.canAfford && (
                <Typography color="warning.main" sx={{ fontWeight: 700 }}>
                  Guild cannot afford this raid.
                </Typography>
              )}

              {hasActiveRaidCall && (
                <Typography color="warning.main" sx={{ fontWeight: 700 }}>
                  A raid is already prepared. Wait until it finishes.
                </Typography>
              )}

              {!isLeader && (
                <Typography sx={{ color: 'rgba(148,163,184,0.95)', fontWeight: 600 }}>
                  Only guild leader can prepare raids.
                </Typography>
              )}

              {isLeader && (
                <Button
                  variant="contained"
                  onClick={handlePrepare}
                  disabled={preparing || hasActiveRaidCall || !currentRaid.canAfford}
                  sx={{
                    mt: 0.8,
                    alignSelf: 'flex-start',
                    px: 3.25,
                    py: 1.1,
                    fontWeight: 900,
                    letterSpacing: 0.4,
                    boxShadow: '0 0 24px rgba(99,102,241,0.34)',
                  }}
                >
                  {preparing ? 'Preparing...' : (hasActiveRaidCall ? 'PREPARE LOCKED' : 'PREPARE')}
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}
