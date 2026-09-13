'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Card,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  InputAdornment,
  IconButton,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import LoginIcon from '@mui/icons-material/Login';
import { useAuth } from '../auth-context';
import BrandMark from '../components/BrandMark';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(username, password);
      router.replace(params.get('next') || '/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri prijavi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: '82dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'absolute', top: 0, right: 0 }}>
        <ThemeToggle />
      </Box>

      <Card
        sx={(t) => ({
          p: { xs: 3, sm: 4 },
          width: '100%',
          maxWidth: 420,
          boxShadow: t.shadows[5],
        })}
      >
        <Stack spacing={1} alignItems="center" sx={{ mb: 3.5 }}>
          <BrandMark size="lg" showText={false} />
          <Typography variant="h5" sx={{ mt: 1.5 }}>
            Dobro došli nazad
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Prijavite se da naručite obrok
          </Typography>
        </Stack>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Korisničko ime"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              fullWidth
              autoComplete="username"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon fontSize="small" color="disabled" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Lozinka"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon fontSize="small" color="disabled" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      size="small"
                      aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                    >
                      {showPassword ? (
                        <VisibilityOffOutlinedIcon fontSize="small" />
                      ) : (
                        <VisibilityOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy}
              fullWidth
              startIcon={busy ? undefined : <LoginIcon />}
              sx={{ mt: 0.5 }}
            >
              {busy ? 'Prijavljivanje…' : 'Prijavi se'}
            </Button>

            <Typography variant="body2" align="center" color="text.secondary">
              Nemate nalog?{' '}
              <Box
                component={Link}
                href="/register"
                sx={{
                  color: 'primary.main',
                  fontWeight: 600,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Registrujte se
              </Box>
            </Typography>
          </Stack>
        </form>
      </Card>
    </Box>
  );
}
