import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { getFables } from '@features/fables/api'
import type { Fable } from '@features/fables/api'

const Fables = () => {
  const [fables, setFables] = useState<Fable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getFables()
      .then((data: Fable[]) => {
        if (!cancelled) {
          setFables(data)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load fables')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Container maxWidth="lg">
        <Typography
          component="h1"
          variant="h4"
          color="primary.dark"
          fontWeight={700}
          gutterBottom
        >
          Discover Fables
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Explore structured worlds — canon with entities, tags, and
          capabilities. Each fable can be experienced through multiple modes;
          Idle RPG is available first.
        </Typography>
        <Button
          component={Link}
          to="/fables/create"
          variant="contained"
          color="primary"
          sx={{ mb: 4 }}
        >
          Create Fable
        </Button>

        {/* Feed: New (context: discovery via new, trending, most played) */}
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          New
        </Typography>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        {!loading && !error && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
              mb: 4,
            }}
          >
            {fables.map((fable) => (
              <Card
                key={fable.id}
                component={Link}
                to={`/fables/${fable.id}`}
                sx={{
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardActionArea>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {fable.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {fable.description ?? 'No description.'}
                    </Typography>
                    {fable.idleRpg && (
                      <Typography
                        variant="caption"
                        color="primary.main"
                        sx={{ mt: 1, display: 'block' }}
                      >
                        Idle RPG
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}
        {!loading && !error && fables.length === 0 && (
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            No fables yet. Create the first one!
          </Typography>
        )}

        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Trending
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Coming soon — fables by popularity and activity.
        </Typography>

        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Most played
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Coming soon — top fables by player count.
        </Typography>
      </Container>
    </Box>
  )
}

export default Fables
