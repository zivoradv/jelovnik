'use client'

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import GroupIcon from '@mui/icons-material/Group'
import ListAltIcon from '@mui/icons-material/ListAlt'
import PaymentsIcon from '@mui/icons-material/Payments'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import { Alert, Box, Card, CircularProgress, Stack, Tab, Tabs, Typography } from '@mui/material'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useAuth } from '../auth-context'
import DebtsAdmin from './DebtsAdmin'
import MealsAdmin from './MealsAdmin'
import OrdersAdmin from './OrdersAdmin'
import RasporedAdmin from './RasporedAdmin'
import UsersAdmin from './UsersAdmin'

const TABS = ['raspored', 'jela', 'porudzbine', 'dugovi', 'korisnici'] as const

export default function AdminPage() {
    return (
        <Suspense fallback={null}>
            <AdminInner />
        </Suspense>
    )
}

function AdminInner() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()

    const initial = Math.max(0, TABS.indexOf((searchParams.get('tab') || 'raspored') as (typeof TABS)[number]))
    const [tab, setTab] = useState(initial)

    useEffect(() => {
        const idx = TABS.indexOf((searchParams.get('tab') || 'raspored') as (typeof TABS)[number])
        if (idx >= 0) setTab(idx)
    }, [searchParams])

    function handleChange(v: number) {
        setTab(v)
        router.replace(`/admin?tab=${TABS[v]}`)
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        )
    }

    if (user?.role !== 'admin') {
        return <Alert severity="error">Nemate pristup ovoj stranici.</Alert>
    }

    return (
        <Stack spacing={{ xs: 2.5, sm: 3 }}>
            <Box>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                    Administracija
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Dodeli šemu nedelji, uredi jela, pregledaj porudžbine, dugove i korisnike.
                </Typography>
            </Box>

            <Card sx={{ px: { xs: 1, sm: 2 }, pt: 0.5 }}>
                <Tabs value={tab} onChange={(_, v) => handleChange(v)} variant="scrollable" allowScrollButtonsMobile>
                    <Tab icon={<CalendarMonthIcon />} iconPosition="start" label="Raspored" />
                    <Tab icon={<RestaurantMenuIcon />} iconPosition="start" label="Jela" />
                    <Tab icon={<ListAltIcon />} iconPosition="start" label="Porudžbine" />
                    <Tab icon={<PaymentsIcon />} iconPosition="start" label="Dugovi" />
                    <Tab icon={<GroupIcon />} iconPosition="start" label="Korisnici" />
                </Tabs>
            </Card>

            <Box>
                {tab === 0 && <RasporedAdmin />}
                {tab === 1 && <MealsAdmin />}
                {tab === 2 && <OrdersAdmin />}
                {tab === 3 && <DebtsAdmin />}
                {tab === 4 && <UsersAdmin />}
            </Box>
        </Stack>
    )
}
