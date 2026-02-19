import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'

const Homepage = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.dark' }}>
        <Toolbar>
          <Typography
            variant="h6"
            component="span"
            sx={{ flexGrow: 1, fontWeight: 700 }}
          >
            FableHub
          </Typography>
          <Button color="inherit">Fables</Button>
          <Button color="inherit">Idle RPG</Button>
          <Button
            variant="contained"
            color="secondary"
            sx={{ ml: 2 }}
          >
            Get Started
          </Button>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          py: { xs: 8, md: 12 },
          background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #4c1d95 100%)',
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
            Welcome to FableHub
          </Typography>
          <Typography
            variant="h6"
            align="center"
            sx={{ opacity: 0.95, mb: 4 }}
          >
            Your place for stories and idle adventures. Purple, bold, and ready.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
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
              sx={{
                borderColor: 'white',
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Play Idle RPG
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8 }}>
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
              Purple
            </Typography>
            <Typography variant="body2">
              Primary brand color. Use for main actions and key sections.
            </Typography>
          </Box>
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'secondary.main',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Blue
            </Typography>
            <Typography variant="body2">
              Secondary accent. Great for links and secondary buttons.
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
              Red
            </Typography>
            <Typography variant="body2">
              Alerts and emphasis. Use sparingly for impact.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography variant="h4" color="primary.dark" fontWeight={600} gutterBottom>
            Clean &amp; Simple
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto' }}>
            This homepage uses MUI components with your custom purple, red, and blue theme
            on a white background. Tailwind utility classes like{' '}
            <code className="text-purple-600 bg-purple-100 px-1 rounded">text-purple-600</code>{' '}
            are also available when you need them.
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default Homepage
