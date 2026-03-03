import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { getFable } from '@features/fables/api'
import type { Fable } from '@features/fables/api'

const FableDetail = () => {
  const { fableId } = useParams<{ fableId: string }>()
  const [fable, setFable] = useState<Fable | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fableId) {
      setLoading(false)
      return
    }
    let cancelled = false
    getFable(fableId)
      .then((data: Fable) => {
        if (!cancelled) {
          setFable(data)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFable(null)
          setError(err instanceof Error ? err.message : 'Failed to load fable')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fableId])

  if (!fableId) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="md">
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Fable not found
          </Typography>
          <Button component={Link} to="/fables" variant="contained" color="primary">
            Back to Fables
          </Button>
        </Container>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !fable) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="md">
          <Typography variant="h5" color="text.secondary" gutterBottom>
            {error ?? 'Fable not found'}
          </Typography>
          <Button component={Link} to="/fables" variant="contained" color="primary">
            Back to Fables
          </Button>
        </Container>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="md">
        <Typography
          component="h1"
          variant="h4"
          color="primary.dark"
          fontWeight={700}
          gutterBottom
        >
          {fable.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {fable.description ?? 'No description.'}
        </Typography>

        {/* Modes (context §2.3: Idle RPG first, mode is adapter that consumes canon) */}
        <Typography variant="h6" color="text.primary" sx={{ mb: 2 }}>
          Modes
        </Typography>
        <Paper variant="outlined" sx={{ p: 2, mb: 4 }}>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Idle RPG (MVP)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Quest → merchant → boss loop. Fighter, Rogue, Sorcerer. Level 10,
            PvP, groups. Friends playtestable.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {(!fable.idleRealms?.length && !fable.idleRpg) && (
              <Button
                variant="contained"
                color="secondary"
                component={Link}
                to={`/fables/${fableId}/idle-rpg/create`}
              >
                Create Idle RPG realm
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to={`/fables/${fableId}/idle-rpg`}
              disabled={!fable.idleRealms?.length && !fable.idleRpg}
            >
              {fable.idleRealms?.length || fable.idleRpg ? 'Play Idle RPG' : 'Play (create a realm first)'}
            </Button>
          </Box>
        </Paper>

        {/* Canon (context §5: entities, tags, relationships, capabilities) */}
        <Typography variant="h6" color="text.primary" sx={{ mb: 2 }}>
          Canon
        </Typography>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Mode-agnostic source of truth: entities (characters, creatures,
            items, factions, locations), tags/ontology, relationships, and
            capabilities. Canon details and editor coming in Phase 0.
          </Typography>
        </Paper>

        <Button
          component={Link}
          to="/fables"
          variant="outlined"
          color="primary"
          sx={{ mt: 4 }}
        >
          Back to Fables
        </Button>
      </Container>
    </Box>
  )
}

export default FableDetail
