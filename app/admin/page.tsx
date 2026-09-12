'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Box, Tabs, Tab, Typography, CircularProgress } from '@mui/material';
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

  const initial = Math.max(0, TABS.indexOf((searchParams.get('tab') || 'jela') as (typeof TABS)[number]));
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
        onChange={(_, v) => handleChange(v)}
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