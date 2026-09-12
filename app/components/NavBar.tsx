'use client';

import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../auth-context';
import ThemeToggle from './ThemeToggle';

export default function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Sakrij navigaciju na stranicama za prijavu/registraciju.
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <AppBar position="sticky" color="primary" enableColorOnDark>
      <Toolbar sx={{ gap: 1 }}>
        <RestaurantMenuIcon />
        <Typography
          variant="h6"
          component={Link}
          href="/"
          sx={{ color: 'inherit', textDecoration: 'none', flexGrow: 1 }}
        >
          Jelovnik        </Typography>

        {user && (
          <>
            <Button color="inherit" component={Link} href="/">
              Meni
            </Button>
            <Button color="inherit" component={Link} href="/dug">
              Moj dug
            </Button>
            {user.role === 'admin' && (
              <Button color="inherit" component={Link} href="/admin">
                Administracija
              </Button>
            )}
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Chip
                label={user.username}
                size="small"
                variant="outlined"
                sx={{ color: 'inherit', borderColor: 'currentColor' }}
              />
            </Box>
            <Button color="inherit" onClick={() => logout()}>
              Odjava
            </Button>
          </>
        )}

        <ThemeToggle />
      </Toolbar>
    </AppBar>
  );
}
