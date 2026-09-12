'use client';

import { useState } from 'react';
import { Box, Tabs, Tab, Typography, CircularProgress } from '@mui/material';
import { useAuth } from '../auth-context';
import MealsAdmin from './MealsAdmin';
import OrdersAdmin from './OrdersAdmin';
import UsersAdmin from './UsersAdmin';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState(0);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Typography>Nemate pristup ovoj stranici.</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Administracija
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3 }}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        <Tab label="Jela" />
        <Tab label="Porudžbine" />
        <Tab label="Korisnici" />
      </Tabs>

      {tab === 0 && <MealsAdmin />}
      {tab === 1 && <OrdersAdmin />}
      {tab === 2 && <UsersAdmin />}
    </Box>
  );
}
