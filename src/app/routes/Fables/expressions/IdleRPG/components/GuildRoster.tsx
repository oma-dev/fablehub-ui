import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { getGuildMemberPlayState } from '@features/idle-rpg/api'
import type { CharacterState, IdleRpgGroup, IdleRpgPackV1, PlayStateResponse } from '@features/idle-rpg/api'
import CharacterCardModal from './CharacterCardModal'

const RANK_NAMES: Record<number, string> = {
  1: 'Member',
  2: 'Officer',
  3: 'Leader',
}

interface Props {
  fableId: string
  realmId: string
  group: IdleRpgGroup
  pack: IdleRpgPackV1
  viewerCharacter: CharacterState
  /** When Fight is clicked, redirect to PvP tab and start fight there. */
  onRequestPvpFight?: (targetCharacterId: string, targetProfile: PlayStateResponse) => void
}

export default function GuildRoster({ fableId, realmId, group, pack, viewerCharacter, onRequestPvpFight }: Props) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [profile, setProfile] = useState<PlayStateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedMemberId) {
      setProfile(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getGuildMemberPlayState(fableId, realmId, viewerCharacter.id, selectedMemberId)
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load profile')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fableId, realmId, viewerCharacter.id, selectedMemberId])

  const members = group.members ?? []
  const ranks = group.memberRanks ?? {}
  const getRank = (characterId: string) => RANK_NAMES[ranks[characterId]] ?? 'Member'
  const getClassName = (classId: string) => pack.classes.find((c) => c.id === classId)?.name ?? classId

  const handleClose = () => {
    setSelectedMemberId(null)
  }

  const handleFight = () => {
    if (!selectedMemberId || !profile) return
    onRequestPvpFight?.(selectedMemberId, profile)
    setSelectedMemberId(null)
  }

  const canFight = !!selectedMemberId && selectedMemberId !== viewerCharacter.id && !!profile && !!onRequestPvpFight

  return (
    <>
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Roster
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell align="right">Level</TableCell>
                <TableCell>Class</TableCell>
                <TableCell>Rank</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>
                    No members
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => (
                  <TableRow
                    key={m.id}
                    hover
                    onClick={() => setSelectedMemberId(m.id)}
                    sx={{
                      cursor: 'pointer',
                    }}
                  >
                    <TableCell>{m.name}</TableCell>
                    <TableCell align="right">{m.level}</TableCell>
                    <TableCell>{getClassName(m.classId)}</TableCell>
                    <TableCell>{getRank(m.id)}</TableCell>
                    <TableCell sx={{ color: 'text.disabled' }}>—</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <CharacterCardModal
        open={!!selectedMemberId}
        onClose={handleClose}
        profile={profile}
        loading={loading}
        error={error}
        fableId={fableId}
        realmId={realmId}
        showFightButton={canFight}
        onFight={handleFight}
      />
    </>
  )
}

