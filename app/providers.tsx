'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import theme from './theme';
import { AuthProvider } from './auth-context';
import NavBar from './components/NavBar';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme} defaultMode="system">
      <CssBaseline />
      <AuthProvider>
        <NavBar />
        <Box component="main" sx={{ minHeight: '100dvh' }}>
          <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
            {children}
          </Container>
        </Box>
      </AuthProvider>
    </ThemeProvider>
  );
}
