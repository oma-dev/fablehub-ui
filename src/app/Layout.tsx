import { Outlet } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Button from '@mui/material/Button'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router-dom'

const Layout = () => {
  return (
    <>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.dark' }}>
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            FableHub
          </Typography>
          <Button color="inherit" component={Link} to="/fables">
            Fables
          </Button>
          <Button color="inherit" component={Link} to="/">
            Idle RPG
          </Button>
          <Button color="inherit" component={Link} to="/login">
            Log in
          </Button>
          <Button
            variant="contained"
            color="secondary"
            component={Link}
            to="/register"
            sx={{ ml: 2 }}
          >
            Get Started
          </Button>
        </Toolbar>
      </AppBar>
      <Outlet />
    </>
  )
}

export default Layout
