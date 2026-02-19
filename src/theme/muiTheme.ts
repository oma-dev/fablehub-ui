import { createTheme } from '@mui/material/styles'

const muiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#7c3aed',
      light: '#a78bfa',
      dark: '#5b21b6',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2563eb',
      light: '#60a5fa',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    error: {
      main: '#dc2626',
      light: '#f87171',
      dark: '#b91c1c',
      contrastText: '#ffffff',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
})

export default muiTheme
