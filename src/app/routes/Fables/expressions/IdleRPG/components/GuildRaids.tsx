import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { getRaidCall, setRaidReady, startRaid } from '@features/idle-rpg/api'
import type { CharacterState, IdleRpgGroup, IdleRpgPackV1, RaidCallResponse } from '@features/idle-rpg/api'

const RAID_PREPARE_DURATION_MS = 20 * 1000 // 20 seconds (for testing; was 1 hour)

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface Props {
  fableId: string
  realmId: string
  groupId: string
  group: IdleRpgGroup
  character: CharacterState
  pack: IdleRpgPackV1
  onUpdate?: () => void
}

export default function GuildRaids({ fableId, realmId, groupId, group, character, pack: _pack, onUpdate }: Props) {
  const [raidCall, setRaidCall] = useState<RaidCallResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [readying, setReadying] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isLeader = group.leaderId === character.id
  const isReady = raidCall?.readyCharacterIds.includes(character.id) ?? false

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getRaidCall(fableId, realmId, groupId)
      .then((r) => { if (!cancelled) setRaidCall(r ?? null) })
      .catch(() => { if (!cancelled) setRaidCall(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [fableId, realmId, groupId, onUpdate])

  const now = Date.now()
  const endsAt = raidCall?.preparedAt != null ? raidCall.preparedAt + RAID_PREPARE_DURATION_MS : 0
  const countdownMs = Math.max(0, endsAt - now)
  const canStart = isLeader && countdownMs === 0 && (raidCall?.readyCharacterIds.length ?? 0) > 0

  const handleReady = async () => {
    if (isReady || readying) return
    setError(null)
    setReadying(true)
    try {
      const updated = await setRaidReady(fableId, realmId, groupId, { characterId: character.id })
      setRaidCall(updated)
      onUpdate?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to set ready')
    } finally {
      setReadying(false)
    }
  }

  const handleStart = async () => {
    if (!canStart || starting) return
    setError(null)
    setStarting(true)
    try {
      await startRaid(fableId, realmId, groupId, { characterId: character.id })
      setRaidCall(null)
      onUpdate?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start raid')
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">Loading raid call…</Typography>
      </Paper>
    )
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
        Raids
      </Typography>
      {!raidCall ? (
        <Typography color="text.secondary">No current raid call.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography sx={{ color: 'primary.main', fontWeight: 700 }}>There&apos;s a raid call!</Typography>
          <Typography variant="body2">{raidCall.raid?.name ?? raidCall.raidId}</Typography>
          {raidCall.boss && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {raidCall.boss.iconUrl && (
                <Box
                  component="img"
                  src={raidCall.boss.iconUrl}
                  alt={raidCall.boss.name}
                  sx={{ width: 56, height: 56, borderRadius: 1, objectFit: 'cover' }}
                />
              )}
              <Box>
                <Typography variant="body2" fontWeight={600}>{raidCall.boss.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Lv.{raidCall.boss.level} · HP {raidCall.boss.hp} · AP {raidCall.boss.ap} · ARM {raidCall.boss.arm}
                </Typography>
              </Box>
            </Box>
          )}
          <Typography variant="body2" color="text.secondary">
            {countdownMs > 0
              ? `Raid starts in ${formatCountdown(countdownMs)}`
              : 'Raid can start now (leader only).'}
          </Typography>
          {!isReady && (
            <Button variant="contained" size="small" onClick={handleReady} disabled={readying}>
              {readying ? '…' : 'READY'}
            </Button>
          )}
          {isReady && <Typography variant="body2" color="success.main">You are ready.</Typography>}
          {canStart && (
            <Button variant="contained" color="primary" size="small" onClick={handleStart} disabled={starting}>
              {starting ? 'Starting…' : 'Start raid'}
            </Button>
          )}
          {raidCall.readyCharacterIds.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Ready ({raidCall.readyCharacterIds.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {raidCall.readyCharacterIds.map((id) => {
                  const m = group.members?.find((x) => x.id === id)
                  return (
                    <Typography key={id} variant="body2" component="span" sx={{ mr: 1 }}>
                      {m?.name ?? id}
                    </Typography>
                  )
                })}
              </Box>
            </Box>
          )}
          {error && <Typography color="error" variant="body2">{error}</Typography>}
        </Box>
      )}
    </Paper>
  )
}

