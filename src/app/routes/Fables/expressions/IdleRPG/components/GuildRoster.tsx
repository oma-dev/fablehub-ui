import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { IdleRpgGroup, IdleRpgPackV1 } from '@features/idle-rpg/api'

const RANK_NAMES: Record<number, string> = {
  1: 'Member',
  2: 'Officer',
  3: 'Leader',
}

interface Props {
  group: IdleRpgGroup
  pack: IdleRpgPackV1
  selectedMemberId?: string | null
  onSelectMember?: (characterId: string) => void
}

export default function GuildRoster({ group, pack, selectedMemberId = null, onSelectMember }: Props) {
  const members = group.members ?? []
  const ranks = group.memberRanks ?? {}
  const getRank = (characterId: string) => RANK_NAMES[ranks[characterId]] ?? 'Member'
  const getClassName = (classId: string) => pack.classes.find((c) => c.id === classId)?.name ?? classId

  return (
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
                  onClick={() => onSelectMember?.(m.id)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: selectedMemberId === m.id ? 'rgba(168,85,247,0.16)' : undefined,
                  }}
                >
                  <TableCell>{m.name}</TableCell>
                  <TableCell align="right">{m.level}</TableCell>
                  <TableCell>{getClassName(m.classId)}</TableCell>
                  <TableCell>{getRank(m.id)}</TableCell>
                  <TableCell sx={{ color: 'text.disabled' }}>-</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
