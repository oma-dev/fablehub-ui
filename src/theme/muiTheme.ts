import { createTheme } from '@mui/material/styles'

const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#a855f7',
      light: '#c084fc',
      dark: '#7c3aed',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
      contrastText: '#ffffff',
    },
    success: {
      main: '#22c55e',
      light: '#4ade80',
      dark: '#16a34a',
    },
    info: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
    },
    background: {
      default: '#0c0a14',
      paper: '#14121f',
    },
    text: {
      primary: '#e8e4f0',
      secondary: '#9b93b0',
      disabled: '#5c5575',
    },
    divider: 'rgba(168, 85, 247, 0.15)',
    action: {
      hover: 'rgba(168, 85, 247, 0.08)',
      selected: 'rgba(168, 85, 247, 0.14)',
      disabled: 'rgba(255, 255, 255, 0.2)',
      disabledBackground: 'rgba(255, 255, 255, 0.08)',
    },
  },
  typography: {
    fontFamily: '"Roboto", sans-serif',
    fontSize: 15,
    h3: { fontWeight: 800, letterSpacing: 1 },
    h4: { fontWeight: 800, letterSpacing: 0.5 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700, fontSize: '1.15rem' },
    subtitle1: { fontWeight: 600, fontSize: '1.05rem' },
    body1: { fontSize: '0.975rem' },
    body2: { fontSize: '0.9rem' },
    button: { fontWeight: 700, letterSpacing: 0.5 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.07) 0%, transparent 60%)',
        },
        '*::-webkit-scrollbar': {
          width: 8,
        },
        '*::-webkit-scrollbar-track': {
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 4,
        },
        '*::-webkit-scrollbar-thumb': {
          background: 'rgba(168,85,247,0.3)',
          borderRadius: 4,
          '&:hover': {
            background: 'rgba(168,85,247,0.5)',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          padding: '10px 24px',
          fontSize: '0.95rem',
          borderRadius: 10,
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
          boxShadow: '0 0 16px rgba(168,85,247,0.35)',
          '&:hover': {
            background: 'linear-gradient(135deg, #c084fc 0%, #a855f7 100%)',
            boxShadow: '0 0 24px rgba(168,85,247,0.5)',
          },
        },
        containedWarning: {
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          boxShadow: '0 0 12px rgba(245,158,11,0.3)',
          color: '#000',
          '&:hover': {
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          },
        },
        outlined: {
          borderWidth: 2,
          '&:hover': { borderWidth: 2 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: 'rgba(168, 85, 247, 0.18)',
          backgroundColor: 'rgba(20, 18, 31, 0.8)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.8rem',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          height: 10,
          backgroundColor: 'rgba(255,255,255,0.06)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: '1px solid rgba(168, 85, 247, 0.25)',
          boxShadow: '0 0 40px rgba(168,85,247,0.15)',
          background: 'linear-gradient(180deg, #1a1726 0%, #14121f 100%)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          marginInline: 6,
          paddingBlock: 12,
          '&.Mui-selected': {
            backgroundColor: 'rgba(168, 85, 247, 0.14)',
            borderLeft: '3px solid #a855f7',
            '&:hover': {
              backgroundColor: 'rgba(168, 85, 247, 0.2)',
            },
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1e1a2e',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          fontSize: '0.8rem',
          padding: '8px 14px',
        },
        arrow: {
          color: '#1e1a2e',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(168, 85, 247, 0.12)',
        },
      },
    },
  },
})

export default muiTheme
