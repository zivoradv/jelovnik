'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { useAuth } from '../auth-context';

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
        minHeight: '80dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Paper sx={{ p: 4, width: '100%', maxWidth: 400 }} elevation={0} variant="outlined">
        <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
          <RestaurantMenuIcon color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h5">Domaći kutak</Typography>
          <Typography variant="body2" color="text.secondary">
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
            />
            <TextField
              label="Lozinka"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={busy} fullWidth>
              {busy ? 'Prijavljivanje…' : 'Prijavi se'}
            </Button>
            <Typography variant="body2" align="center" color="text.secondary">
              Nemate nalog? <Link href="/register">Registrujte se</Link>
            </Typography>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
