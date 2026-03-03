import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech'
import {
  getRaids,
  getGroup,
  prepareRaidCall,
  markRaidReplayViewed,
} from '@features/idle-rpg/api'
import type {
  CharacterState,
  IdleRpgGroup,
  IdleRpgPackV1,
  RaidReplayPayload,
  RaidWithBoss,
} from '@features/idle-rpg/api'
import RaidReplayView from '../components/RaidReplayView'

interface Props {
  fableId: string
  realmId: string
  character: CharacterState
  pack: IdleRpgPackV1
  groupId: string
  onCharacterUpdate: (c: CharacterState) => void
}

export default function RaidsTab({ fableId, realmId, character, pack, groupId, onCharacterUpdate: _onCharacterUpdate }: Props) {
  const [raids, setRaids] = useState<RaidWithBoss[]>([])
  const [pendingReplay, setPendingReplay] = useState<RaidReplayPayload | null>(null)
  const [watchingReplay, setWatchingReplay] = useState<RaidReplayPayload | null>(null)
  const [group, setGroup] = useState<IdleRpgGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [raidIndex, setRaidIndex] = useState(0)
  const [preparing, setPreparing] = useState(false)

  const isLeader = group?.leaderId === character.id
  const currentRaid = raids[raidIndex] ?? null

  useEffect(() => {
    if (!fableId || !realmId || !character?.id || !groupId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      getRaids(fableId, realmId, character.id),
      getGroup(fableId, realmId, groupId),
    ])
      .then(([raidsRes, g]) => {
        if (!cancelled) {
          setRaids(raidsRes.raids ?? [])
          setPendingReplay(raidsRes.pendingReplay ?? null)
          setGroup(g)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load raids')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [fableId, realmId, character.id, groupId])

  const handlePrepare = async () => {
    if (!currentRaid || preparing) return
    setError(null)
    setPreparing(true)
    try {
      await prepareRaidCall(fableId, realmId, groupId, { raidId: currentRaid.id, characterId: character.id })
      const g = await getGroup(fableId, realmId, groupId)
      setGroup(g)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to prepare raid')
    } finally {
      setPreparing(false)
    }
  }

  const handleReplayDone = async () => {
    await markRaidReplayViewed(fableId, realmId, groupId, { characterId: character.id })
    setPendingReplay(null)
    const raidsRes = await getRaids(fableId, realmId, character.id)
    setRaids(raidsRes.raids ?? [])
  }

  const activeReplay = pendingReplay ?? watchingReplay
  if (activeReplay) {
    return (
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <RaidReplayView
          replay={activeReplay}
          group={group}
          pack={pack}
          onDone={
            pendingReplay
              ? handleReplayDone
              : () => setWatchingReplay(null)
          }
        />
      </Box>
    )
  }

  const canGoRight = raidIndex < raids.length - 1

  const lastRaidReplay = group?.lastRaidCombatResult ?? null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', p: 3 }}>
      {error && (
        <Typography color="error" sx={{ mb: 1.5 }}>
          {error}
        </Typography>
      )}
      {loading && (
        <Typography color="text.secondary">Loading raids…</Typography>
      )}
      {!loading && lastRaidReplay && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'rgba(20,18,31,0.6)', borderColor: 'rgba(168,85,247,0.3)' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            History
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2">
              Last raid: <strong>{lastRaidReplay.raidName}</strong>
              {lastRaidReplay.victory != null && (
                <Typography component="span" variant="body2" sx={{ ml: 1 }} color={lastRaidReplay.victory ? 'success.main' : 'error.main'}>
                  ({lastRaidReplay.victory ? 'Victory' : 'Defeat'})
                </Typography>
              )}
            </Typography>
            <Button variant="outlined" size="small" onClick={() => setWatchingReplay(lastRaidReplay)}>
              Watch replay
            </Button>
          </Box>
        </Paper>
      )}
      {!loading && raids.length === 0 && (
        <Typography color="text.secondary">No raids in this realm.</Typography>
      )}
      {!loading && raids.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, flex: 1 }}>
          <IconButton
            size="large"
            onClick={() => setRaidIndex((i) => Math.max(0, i - 1))}
            disabled={raidIndex <= 0}
            sx={{ color: 'primary.main' }}
          >
            <ChevronLeftIcon />
          </IconButton>
          <Paper
            elevation={0}
            sx={{
              width: 380,
              minHeight: 440,
              borderRadius: 3,
              overflow: 'hidden',
              textAlign: 'center',
              bgcolor: '#0c0a14',
              border: '3px solid transparent',
              backgroundImage: 'linear-gradient(#0c0a14, #0c0a14), linear-gradient(135deg, #a855f7, #6366f1, #a855f7)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              boxShadow: '0 0 40px 8px rgba(168,85,247,0.25), inset 0 0 24px rgba(0,0,0,0.3)',
            }}
          >
            <Box sx={{ width: '100%', height: 220, bgcolor: 'rgba(20,18,31,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {currentRaid?.imageUrl ? (
                <Box component="img" src={currentRaid.imageUrl} alt={currentRaid.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <MilitaryTechIcon sx={{ fontSize: 80, color: 'rgba(168,85,247,0.4)' }} />
              )}
            </Box>
            <Box sx={{ p: 2.5 }}>
              <Typography variant="overline" color="text.secondary" letterSpacing={1.5}>Raid</Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, mb: 1, background: 'linear-gradient(90deg, #e8e4f0, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {currentRaid?.name ?? '—'}
              </Typography>
              {currentRaid?.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, minHeight: 40 }}>{currentRaid.description}</Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                Required level: <strong>{currentRaid?.requiredLevel ?? 1}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cost: <strong>{currentRaid?.requiredCurrencyCost?.amount ?? 0} {currentRaid?.requiredCurrencyCost?.currencyId ?? ''}</strong>
                {' '}(Guild: {currentRaid?.guildStock ?? 0})
              </Typography>
              {currentRaid && !currentRaid.canAfford && (
                <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>Guild cannot afford this raid.</Typography>
              )}
              {isLeader && currentRaid?.canAfford && (
                <Button variant="contained" size="medium" onClick={handlePrepare} disabled={preparing} sx={{ mt: 2 }}>
                  {preparing ? 'Preparing…' : 'PREPARE'}
                </Button>
              )}
            </Box>
          </Paper>
          <IconButton
            size="large"
            onClick={() => setRaidIndex((i) => Math.min(raids.length - 1, i + 1))}
            disabled={!canGoRight}
            sx={{ color: 'primary.main' }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  )
}

