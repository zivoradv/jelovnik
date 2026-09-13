'use client';

import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Container from '@mui/material/Container';
import Chip from '@mui/material/Chip';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../auth-context';
import ThemeToggle from './ThemeToggle';
import BrandMark from './BrandMark';

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Meni', icon: <RestaurantMenuIcon /> },
  { href: '/dug', label: 'Moj dug', icon: <ReceiptLongIcon /> },
  {
    href: '/admin?tab=porudzbine',
    label: 'Porudžbine',
    icon: <ListAltIcon />,
    adminOnly: true,
  },
  {
    href: '/admin?tab=jela',
    label: 'Administracija',
    icon: <SettingsIcon />,
    adminOnly: true,
  },
];

export default function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sakrij navigaciju na stranicama za prijavu/registraciju.
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  // Aktivna stavka: /admin se razlikuje po ?tab= parametru.
  function isActive(href: string): boolean {
    const [path, query] = href.split('?');
    if (pathname !== path) return false;
    if (!query) return true;
    const tab = new URLSearchParams(query).get('tab');
    const current = searchParams.get('tab') || 'jela';
    return tab === current;
  }

  const items = NAV_ITEMS.filter((i) => !i.adminOnly || user?.role === 'admin');
  const initial = user?.username?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={(t) => ({
          // Mlečno staklo: sadržaj se nazire ispod trake dok se skroluje.
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          backgroundColor: 'rgba(248, 244, 239, 0.78)',
          borderBottom: `1px solid ${t.vars.palette.divider}`,
          ...t.applyStyles('dark', {
            backgroundColor: 'rgba(20, 16, 14, 0.78)',
          }),
        })}
      >
        <Container maxWidth="lg" disableGutters>
          <Toolbar sx={{ gap: 1, px: { xs: 2, sm: 3 }, minHeight: { xs: 62, sm: 70 } }}>
            <Box
              component={Link}
              href="/"
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                mr: 1,
              }}
              aria-label="Početna"
            >
              <BrandMark />
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {user && (
              <>
                {/* Navigacija na širem ekranu */}
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ display: { xs: 'none', md: 'flex' } }}
                >
                  {items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Button
                        key={item.href}
                        component={Link}
                        href={item.href}
                        startIcon={item.icon}
                        disableRipple
                        sx={(t) => ({
                          px: 1.75,
                          py: 0.85,
                          color: active
                            ? t.vars.palette.primary.main
                            : t.vars.palette.text.secondary,
                          backgroundColor: active
                            ? t.vars.palette.action.selected
                            : 'transparent',
                          '&:hover': {
                            backgroundColor: active
                              ? t.vars.palette.action.selected
                              : t.vars.palette.action.hover,
                            color: active
                              ? t.vars.palette.primary.main
                              : t.vars.palette.text.primary,
                          },
                          '& .MuiButton-startIcon > *': { fontSize: 20 },
                        })}
                      >
                        {item.label}
                      </Button>
                    );
                  })}
                </Stack>

                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ display: { xs: 'none', md: 'block' }, mx: 1, my: 1.75 }}
                />
              </>
            )}

            <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
              <ThemeToggle />
            </Box>

            {user && (
              <>
                {/* Korisnik + odjava (širi ekran) */}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ display: { xs: 'none', md: 'flex' } }}
                >
                  <Chip
                    avatar={
                      <Avatar
                        sx={(t) => ({
                          bgcolor: `${t.vars.palette.primary.main} !important`,
                          color: `${t.vars.palette.primary.contrastText} !important`,
                          fontWeight: 700,
                          fontSize: '0.8rem',
                        })}
                      >
                        {initial}
                      </Avatar>
                    }
                    label={user.username}
                    variant="outlined"
                    sx={{ pr: 0.5 }}
                  />
                  <IconButton
                    onClick={() => logout()}
                    aria-label="Odjava"
                    sx={{ color: 'text.secondary' }}
                  >
                    <LogoutIcon />
                  </IconButton>
                </Stack>

                {/* Hamburger (telefon / tablet) */}
                <IconButton
                  edge="end"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Otvori meni"
                  sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                >
                  <MenuIcon />
                </IconButton>
              </>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Bočni meni za uske ekrane */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 290,
            borderTopLeftRadius: 20,
            borderBottomLeftRadius: 20,
            backgroundImage: 'none',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ p: 2, pb: 1.5 }}
          >
            <BrandMark size="sm" />
            <IconButton onClick={() => setDrawerOpen(false)} aria-label="Zatvori meni">
              <CloseIcon />
            </IconButton>
          </Stack>

          {user && (
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={(t) => ({
                mx: 2,
                mb: 1,
                p: 1.5,
                borderRadius: 3,
                bgcolor: t.vars.palette.action.hover,
              })}
            >
              <Avatar
                sx={(t) => ({
                  bgcolor: t.vars.palette.primary.main,
                  color: t.vars.palette.primary.contrastText,
                  fontWeight: 700,
                })}
              >
                {initial}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }} noWrap>
                  {user.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.role === 'admin' ? 'Administrator' : 'Korisnik'}
                </Typography>
              </Box>
            </Stack>
          )}

          <List sx={{ px: 1.5, py: 1, flexGrow: 1 }}>
            {items.map((item) => {
              const active = isActive(item.href);
              return (
                <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    component={Link}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    sx={(t) => ({
                      borderRadius: 2.5,
                      py: 1.25,
                      color: active ? t.vars.palette.primary.main : 'inherit',
                      bgcolor: active ? t.vars.palette.action.selected : 'transparent',
                    })}
                  >
                    <ListItemIcon
                      sx={{ minWidth: 40, color: active ? 'primary.main' : 'text.secondary' }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontWeight: active ? 700 : 500 }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>

          <Divider />
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ p: 2 }}
          >
            <ThemeToggle withLabel />
            <Button
              onClick={() => {
                setDrawerOpen(false);
                logout();
              }}
              startIcon={<LogoutIcon />}
              color="inherit"
              sx={{ color: 'text.secondary' }}
            >
              Odjava
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}
