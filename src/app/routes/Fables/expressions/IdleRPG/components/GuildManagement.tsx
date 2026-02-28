import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import type { IdleRpgGroup } from '../../../../../../services/api'

interface Props {
  group: IdleRpgGroup
}

export default function GuildManagement({ group }: Props) {
  const displayName = `${group.name} ${group.label}`
  const memberCount = group.members?.length ?? 0
  const leader = group.leaderId
    ? group.members?.find((m) => m.id === group.leaderId)
    : null

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
        <InfoRow label="Donations" value="—" />
      </Box>
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
