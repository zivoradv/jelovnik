'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  IconButton,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAuth } from '../auth-context';

interface U {
  id: number;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export default function UsersAdmin() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(id: number, role: 'admin' | 'user') {
    setError('');
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Greška pri izmeni uloge.');
      return;
    }
    await load();
  }

  async function remove(id: number) {
    if (!confirm('Obrisati ovog korisnika i sve njegove porudžbine?')) return;
    const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Greška pri brisanju.');
      return;
    }
    await load();
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Korisnici ({users.length})
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={1}>
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent sx={{ '&:last-child': { pb: 1.5 }, py: 1.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography sx={{ fontWeight: 600, flexGrow: 1 }}>
                  {u.username}
                  {me?.id === u.id && (
                    <Typography component="span" variant="caption" color="text.secondary">
                      {' '}(vi)
                    </Typography>
                  )}
                </Typography>
                <TextField
                  select
                  size="small"
                  label="Uloga"
                  value={u.role}
                  onChange={(e) => changeRole(u.id, e.target.value as 'admin' | 'user')}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="user">Korisnik</MenuItem>
                  <MenuItem value="admin">Administrator</MenuItem>
                </TextField>
                <IconButton
                  color="error"
                  aria-label="Obriši"
                  disabled={me?.id === u.id}
                  onClick={() => remove(u.id)}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
