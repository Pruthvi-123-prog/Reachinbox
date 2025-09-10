import { createTheme } from '@mui/material/styles';

// Custom Diganthadeepa theme for the application
const diganthadeepaTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#0d4d6e', // Deep teal
      light: '#3b7d9c',
      dark: '#0a3246',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9fb3c8', // Soft silver
      light: '#cfd8e3',
      dark: '#7089a0',
      contrastText: '#ffffff',
    },
    background: {
      default: '#030303',
      paper: 'rgba(17, 17, 17, 0.7)',
    },
    text: {
      primary: '#e6e6e6',
      secondary: '#b3b3b3',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: '"Neue Montreal", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.5px',
    },
    h3: {
      fontWeight: 700,
      letterSpacing: '-0.25px',
    },
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.25px',
    },
    h5: {
      fontWeight: 600,
      letterSpacing: '0',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '0',
    },
    subtitle1: {
      fontWeight: 500,
      letterSpacing: '0.1px',
    },
    subtitle2: {
      fontWeight: 500,
      letterSpacing: '0.1px',
    },
    body1: {
      fontWeight: 400,
      letterSpacing: '0.5px',
    },
    body2: {
      fontWeight: 400,
      letterSpacing: '0.25px',
    },
    button: {
      fontWeight: 500,
      letterSpacing: '0.5px',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: 'radial-gradient(circle at 50% 50%, #0a0a0a 0%, #030303 100%)',
          backgroundAttachment: 'fixed',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255, 255, 255, 0.05)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'rgba(255, 255, 255, 0.2)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '8px 16px',
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          },
        },
        contained: {
          background: 'linear-gradient(45deg, #0d4d6e 0%, #136f9c 100%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #0a3246 0%, #0d5474 100%)',
          },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': {
            borderWidth: '1px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(17, 17, 17, 0.7)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 6px 25px rgba(13, 77, 110, 0.15)',
            borderColor: 'rgba(13, 77, 110, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(17, 17, 17, 0.7)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'rgba(15, 15, 15, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(10, 10, 10, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          transition: 'all 0.3s ease',
          '&.Mui-selected': {
            backgroundColor: 'rgba(13, 77, 110, 0.2)',
            '&:hover': {
              backgroundColor: 'rgba(13, 77, 110, 0.3)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          fontWeight: 500,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '0.75rem',
          fontWeight: 500,
        },
      },
    },
  },
});

export default diganthadeepaTheme;
