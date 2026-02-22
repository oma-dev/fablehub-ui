import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import GroupsIcon from '@mui/icons-material/Groups'

export default function GuildTab() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2, py: 10 }}>
      <GroupsIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
      <Typography variant="h5" color="text.secondary" fontWeight={600}>Guild</Typography>
      <Typography color="text.disabled">In development</Typography>
    </Box>
  )
}
