import { useParams, Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

// Mock fable for MVP: name + short description, Idle RPG mode enabled (context §8.2, §16)
const MOCK_FABLE: Record<string, { name: string; description: string }> = {
  '1': {
    name: 'Realm of Echoes',
    description:
      'A world where shadows hold power and every choice echoes. Canon includes entities, tags, relationships, and capabilities. Idle RPG mode is enabled — quest, gear up, and face the boss.',
  },
  '2': {
    name: 'Sundered Isles',
    description:
      'Archipelago of warring factions and lost lore. Portable canon; experience it through Idle RPG: Fighter, Rogue, or Sorcerer, level to 10, merchant, PvP, and groups.',
  },
  '3': {
    name: 'The Iron Chronicle',
    description:
      'Canon-first world of mercenaries, monsters, and one legendary drop. Same canon, many ways to play — Idle RPG first, more modes later.',
  },
}

const Fable = () => {
  const { fableId } = useParams<{ fableId: string }>()
  const fable = fableId ? MOCK_FABLE[fableId] : null

  if (!fable) {
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
          {fable.description}
        </Typography>

        {/* Modes (context: Idle RPG first, mode is adapter that consumes canon) */}
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
            <Button
              variant="contained"
              color="secondary"
              component={Link}
              to={`/fables/${fableId}/idle-rpg/create`}
            >
              Create Idle RPG
            </Button>
            <Button
              variant="contained"
              color="primary"
              component={Link}
              to={`/fables/${fableId}/idle-rpg`}
            >
              Play Idle RPG
            </Button>
          </Box>
        </Paper>

        {/* Canon placeholder (context: entities, tags, relationships, capabilities) */}
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

export default Fable
