import { useParams, Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

const FableIdleRPG = () => {
  const { fableId } = useParams<{ fableId: string }>()

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h4" color="primary.dark" fontWeight={700} gutterBottom>
          Idle RPG
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Quest, merchant, boss, PvP, and groups for this fable. Coming soon in
          Phase 1–2.
        </Typography>
        <Button
          component={Link}
          to={fableId ? `/fables/${fableId}` : '/fables'}
          variant="contained"
          color="primary"
        >
          Back to Fable
        </Button>
      </Container>
    </Box>
  )
}

export default FableIdleRPG
