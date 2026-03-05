import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { getRaidCall, setRaidReady } from '@features/idle-rpg/api'
import type { CharacterState, IdleRpgGroup, IdleRpgPackV1, RaidCallResponse } from '@features/idle-rpg/api'

function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) return '0:00'
  const minutes = Math.floor(milliseconds / 60000)
  const seconds = Math.floor((milliseconds % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatUtcDateTime(timestampMs: number): string {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return ''
  return `${new Date(timestampMs).toISOString().slice(0, 16).replace('T', ' ')} UTC`
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
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [readying, setReadying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isReady = raidCall?.readyCharacterIds.includes(character.id) ?? false

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => {
      window.clearInterval(timerId)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const fetchRaidCall = async (initialLoad: boolean) => {
      if (initialLoad) setLoading(true)
      try {
        const response = await getRaidCall(fableId, realmId, groupId)
        if (!cancelled) setRaidCall(response ?? null)
      } catch {
        if (!cancelled) setRaidCall(null)
      } finally {
        if (initialLoad && !cancelled) setLoading(false)
      }
    }
    void fetchRaidCall(true)
    const intervalId = window.setInterval(() => {
      void fetchRaidCall(false)
    }, 5000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [fableId, realmId, groupId, onUpdate])

  const scheduledStartAt = raidCall?.nextScheduledStartAt ?? 0
  const countdownMs = Math.max(0, scheduledStartAt - nowMs)

  const handleReady = async () => {
    if (isReady || readying) return
    setError(null)
    setReadying(true)
    try {
      const updatedCall = await setRaidReady(fableId, realmId, groupId, { characterId: character.id })
      setRaidCall(updatedCall)
      onUpdate?.()
    } catch (unknownError: unknown) {
      setError(unknownError instanceof Error ? unknownError.message : 'Failed to set ready')
    } finally {
      setReadying(false)
    }
  }

  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">Loading raid call...</Typography>
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
                  Lv.{raidCall.boss.level} | HP {raidCall.boss.hp} | AP {raidCall.boss.ap} | ARM {raidCall.boss.arm}
                </Typography>
              </Box>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary">
            {countdownMs > 0
              ? `Raid starts in ${formatCountdown(countdownMs)} (${formatUtcDateTime(scheduledStartAt)})`
              : 'Raid start time reached. It will start automatically shortly.'}
          </Typography>

          {raidCall.raidSchedule && (
            <Typography variant="caption" color="text.secondary">
              Schedule: {`${String(raidCall.raidSchedule.startHourUtc).padStart(2, '0')}:${String(raidCall.raidSchedule.startMinuteUtc).padStart(2, '0')} UTC every ${raidCall.raidSchedule.intervalDays} day(s), anchor ${raidCall.raidSchedule.anchorDateUtc}`}
            </Typography>
          )}

          {!isReady && (
            <Button variant="contained" size="small" onClick={handleReady} disabled={readying}>
              {readying ? '...' : 'READY'}
            </Button>
          )}
          {isReady && <Typography variant="body2" color="success.main">You are ready.</Typography>}

          {raidCall.readyCharacterIds.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Ready ({raidCall.readyCharacterIds.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {raidCall.readyCharacterIds.map((id) => {
                  const member = group.members?.find((x) => x.id === id)
                  return (
                    <Typography key={id} variant="body2" component="span" sx={{ mr: 1 }}>
                      {member?.name ?? id}
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
