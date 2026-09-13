'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Stack,
  Tabs,
  Tab,
  Typography,
  CircularProgress,
  Card,
  Alert,
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import ListAltIcon from '@mui/icons-material/ListAlt';
import GroupIcon from '@mui/icons-material/Group';
import { useAuth } from '../auth-context';
import MealsAdmin from './MealsAdmin';
import OrdersAdmin from './OrdersAdmin';
import UsersAdmin from './UsersAdmin';

// Nazivi tabova u URL-u (npr. /admin?tab=porudzbine)
const TABS = ['jela', 'porudzbine', 'korisnici'] as const;

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminInner />
    </Suspense>
  );
}

function AdminInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial = Math.max(
    0,
    TABS.indexOf((searchParams.get('tab') || 'jela') as (typeof TABS)[number]),
  );
  const [tab, setTab] = useState(initial);

  // Prati promenu ?tab= (npr. kad se klikne link iz navigacije)
  useEffect(() => {
    const idx = TABS.indexOf((searchParams.get('tab') || 'jela') as (typeof TABS)[number]);
    if (idx >= 0) setTab(idx);
  }, [searchParams]);

  function handleChange(v: number) {
    setTab(v);
    router.replace(`/admin?tab=${TABS[v]}`);
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Alert severity="error">Nemate pristup ovoj stranici.</Alert>;
  }

  return (
    <Stack spacing={{ xs: 2.5, sm: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ mb: 0.5 }}>
          Administracija
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Unesi dnevni meni, pregledaj porudžbine i upravljaj korisnicima.
        </Typography>
      </Box>

      <Card sx={{ px: { xs: 1, sm: 2 }, pt: 0.5 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => handleChange(v)}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab icon={<RestaurantMenuIcon />} iconPosition="start" label="Jela" />
          <Tab icon={<ListAltIcon />} iconPosition="start" label="Porudžbine" />
          <Tab icon={<GroupIcon />} iconPosition="start" label="Korisnici" />
        </Tabs>
      </Card>

      <Box>
        {tab === 0 && <MealsAdmin />}
        {tab === 1 && <OrdersAdmin />}
        {tab === 2 && <UsersAdmin />}
      </Box>
    </Stack>
  );
}
