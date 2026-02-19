import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

const Homepage = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Hero — core promise */}
      <Box
        component="main"
        sx={{
          py: { xs: 8, md: 12 },
          background:
            'linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #4c1d95 100%)',
          color: 'white',
        }}
      >
        <Container maxWidth="md">
          <Typography
            component="h1"
            variant="h2"
            align="center"
            fontWeight={700}
            gutterBottom
          >
            Create a world once. Reuse it everywhere.
          </Typography>
          <Typography
            variant="h6"
            align="center"
            sx={{ opacity: 0.95, mb: 4 }}
          >
            FableHub is a canon-first UGC platform. Build Fables — structured
            worlds with lore, entities, and capabilities — and experience them
            through multiple Modes. Idle RPG first; more modes and exports
            later.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="contained"
              size="large"
              component={Link}
              to="/fables"
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              Explore Fables
            </Button>
            <Button
              variant="outlined"
              size="large"
              href="#idle-rpg"
              sx={{
                borderColor: 'white',
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              Play Idle RPG
            </Button>
          </Box>
        </Container>
      </Box>

      {/* What is FableHub */}
      <Container maxWidth="lg" sx={{ py: 8 }} id="fables">
        <Typography
          component="h2"
          variant="h4"
          color="primary.dark"
          fontWeight={700}
          align="center"
          gutterBottom
        >
          What is FableHub?
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ maxWidth: 720, mx: 'auto', mb: 6 }}
        >
          A <strong>Fable</strong> is a world — canon with entities, tags,
          relationships, and capabilities. A <strong>Mode</strong> is how that
          canon is experienced: games (Idle RPG, later card/roguelike) or
          non-game activities (FRP sessions, GM copilots, D&D/Fate exports).
          One canon, many ways to play.
        </Typography>

        {/* Three pillars: Fables, Idle RPG, More Modes */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Fables
            </Typography>
            <Typography variant="body2">
              Discover and create structured worlds. Lore, characters, factions,
              items — portable canon that any mode can use.
            </Typography>
          </Box>
          <Box
            id="idle-rpg"
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'secondary.main',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Idle RPG (MVP)
            </Typography>
            <Typography variant="body2">
              Quest, gear up, fight the boss. Fighter, Rogue, Sorcerer. Level to
              10, merchant, PvP, and groups. The first mode — friends
              playtestable.
            </Typography>
          </Box>
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'error.main',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" fontWeight={600} gutterBottom>
              More Modes
            </Typography>
            <Typography variant="body2">
              Card battles, FRP sessions, GM copilots, and exports to D&D/Fate or
              lore books. Same canon, new experiences.
            </Typography>
          </Box>
        </Box>

        {/* MVP CTA */}
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography
            variant="h5"
            color="primary.dark"
            fontWeight={600}
            gutterBottom
          >
            Current MVP
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: 640, mx: 'auto' }}
          >
            Create a fable, get 20 quest creatures and 1 boss auto-generated.
            Players choose a chassis, run the quest → merchant → boss loop, and
            unlock the legendary. Canon-first, mode-scoped, runtime-separate.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            component={Link}
            to="/fables"
            sx={{ mt: 3 }}
          >
            Get Started
          </Button>
        </Box>
      </Container>
    </Box>
  )
}

export default Homepage
