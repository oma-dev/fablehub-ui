import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi'

export default function PvPTab() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2, py: 10 }}>
      <SportsKabaddiIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
      <Typography variant="h5" color="text.secondary" fontWeight={600}>PvP Arena</Typography>
      <Typography color="text.disabled">In development</Typography>
    </Box>
  )
}
