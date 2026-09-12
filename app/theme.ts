'use client';

import { createTheme } from '@mui/material/styles';

// Boje inspirisane logotipom "Domaći kutak FAN" (topla crvena / bordo).
const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: 'class',
  },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#9B1C1C', contrastText: '#ffffff' },
        secondary: { main: '#B45309' },
        background: { default: '#faf7f4', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#f0928f', contrastText: '#2a0a0a' },
        secondary: { main: '#e0a86a' },
        background: { default: '#161311', paper: '#211d1a' },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  },
});

export default theme;
