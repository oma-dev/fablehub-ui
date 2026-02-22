import { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useAuth } from '../contexts/AuthContext'

const Layout = () => {
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleLogout = async () => {
    setAnchorEl(null)
    await signOut()
    navigate('/', { replace: true })
  }

  const initials = user?.email
    ? user.email.charAt(0).toUpperCase()
    : '?'

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

          {!loading && (
            user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <Typography variant="body2" sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
                  {user.email}
                </Typography>
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small" sx={{ p: 0 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
                    {initials}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={() => setAnchorEl(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                >
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>Log out</MenuItem>
                </Menu>
              </Box>
            ) : (
              <>
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
              </>
            )
          )}
        </Toolbar>
      </AppBar>
      <Outlet />
    </>
  )
}

export default Layout
