'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== password2) {
      setError('Lozinke se ne poklapaju.');
      return;
    }
    setBusy(true);
    try {
      await register(username, password);
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri registraciji.');
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
          <Typography variant="h5">Napravite nalog</Typography>
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
              helperText="Najmanje 4 karaktera"
            />
            <TextField
              label="Potvrda lozinke"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={busy} fullWidth>
              {busy ? 'Kreiranje…' : 'Registruj se'}
            </Button>
            <Typography variant="body2" align="center" color="text.secondary">
              Već imate nalog? <Link href="/login">Prijavite se</Link>
            </Typography>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
