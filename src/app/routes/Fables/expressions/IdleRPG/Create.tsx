import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { createIdleRpg, getFable } from '../../../../../services/api'
import type { Fable } from '../../../../../services/api'

const IdleRpgCreate = () => {
  const { fableId } = useParams<{ fableId: string }>()
  const navigate = useNavigate()
  const [fableName, setFableName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!fableId) return
    getFable(fableId)
      .then((f: Fable) => setFableName(f.name))
      .catch(() => setFableName(null))
  }, [fableId])

  const handleCreateWithDefaults = async () => {
    if (!fableId) return
    setError(null)
    setSubmitting(true)
    try {
      await createIdleRpg(fableId)
      navigate(`/fables/${fableId}`)
    } catch (err) {
      const message = err && typeof err === 'object' && 'data' in err
        ? String((err as { data?: unknown }).data)
        : err instanceof Error ? err.message : 'Failed to create Idle RPG.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!fableId) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="sm">
          <Typography color="text.secondary" gutterBottom>Missing fable.</Typography>
          <Button component={Link} to="/fables" variant="contained" color="primary">
            Back to Fables
          </Button>
        </Container>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="sm">
        <Typography
          component="h1"
          variant="h4"
          color="primary.dark"
          fontWeight={700}
          gutterBottom
        >
          Create Idle RPG
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {fableName ? `Enable Idle RPG for “${fableName}”.` : 'Enable Idle RPG for this fable.'}
          {' '}The backend will use default config (3 chassis, 20 quest creatures, 1 boss, xp table).
        </Typography>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateWithDefaults}
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create with default config'}
          </Button>
          <Button
            component={Link}
            to={`/fables/${fableId}`}
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
        </Box>
      </Container>
    </Box>
  )
}

export default IdleRpgCreate
