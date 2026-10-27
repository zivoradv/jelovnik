'use client'

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
    Alert,
    Avatar,
    Box,
    Card,
    CardContent,
    Checkbox,
    Chip,
    Collapse,
    FormControlLabel,
    IconButton,
    LinearProgress,
    Skeleton,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BirthdayPerson as BirthdayUser } from '@/lib/birthdays'
import { birthdayInYear, formatDayMonth } from '@/lib/date'
import { rsd } from '@/lib/pricing'
import { fullName, initials } from '@/lib/users'

export default function BirthdaysAdmin() {
    const [year, setYear] = useState(new Date().getFullYear())
    const [people, setPeople] = useState<BirthdayUser[]>([])
    const [paid, setPaid] = useState<Set<string>>(new Set())
    const [amount, setAmount] = useState(500)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [expanded, setExpanded] = useState<number | null>(null)

    const load = useCallback(async () => {
        setError('')
        try {
            const res = await fetch(`/api/birthdays?year=${year}`)
            const data = await res.json()
            setPeople(data.users || [])
            setPaid(new Set((data.paid || []).map(([c, p]: [number, number]) => `${c}:${p}`)))
            setAmount(data.amount ?? 500)
        } catch {
            setError('Greška pri učitavanju rođendana.')
        } finally {
            setLoading(false)
        }
    }, [year])

    useEffect(() => {
        load()
    }, [load])

    async function post(body: object) {
        setError('')
        const res = await fetch('/api/admin/birthdays', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data.error || 'Greška pri čuvanju.')
        }
        await load()
    }

    const participants = useMemo(() => people.filter((p) => p.birthdayFund), [people])

    const celebrants = useMemo(
        () =>
            participants
                .filter((p): p is BirthdayUser & { birthday: string } => !!p.birthday)
                .map((p) => ({ ...p, date: birthdayInYear(p.birthday, year) }))
                .sort((a, b) => a.date.getTime() - b.date.getTime()),
        [participants, year],
    )

    const perCelebrant = Math.max(participants.length - 1, 0)
    // broje se samo uplate između učesnika
    const totalPaid = celebrants.reduce(
        (sum, c) => sum + participants.filter((p) => p.id !== c.id && paid.has(`${c.id}:${p.id}`)).length,
        0,
    )
    const today = new Date()

    if (loading) return <Skeleton variant="rounded" height={240} />

    return (
        <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <IconButton size="small" aria-label="Prethodna godina" onClick={() => setYear((y) => y - 1)}>
                        <ChevronLeftIcon />
                    </IconButton>
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {year}.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Skupljeno {rsd(totalPaid * amount)} od {rsd(celebrants.length * perCelebrant * amount)}
                        </Typography>
                    </Box>
                    <IconButton size="small" aria-label="Sledeća godina" onClick={() => setYear((y) => y + 1)}>
                        <ChevronRightIcon />
                    </IconButton>
                </Stack>
            </Card>

            <Card>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Typography variant="h6" sx={{ mb: 1.5 }}>
                        Ko je platio
                    </Typography>
                    {celebrants.length === 0 && <Typography color="text.secondary">Niko još nema unet datum rođenja.</Typography>}
                    <Stack spacing={1}>
                        {celebrants.map((c) => {
                            const payers = participants.filter((p) => p.id !== c.id)
                            const count = payers.filter((p) => paid.has(`${c.id}:${p.id}`)).length
                            const open = expanded === c.id
                            const past = c.date < today
                            return (
                                <Box key={c.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                                    <Stack
                                        direction="row"
                                        spacing={1.5}
                                        onClick={() => setExpanded(open ? null : c.id)}
                                        sx={{ p: 1.5, alignItems: 'center', cursor: 'pointer' }}
                                    >
                                        <Avatar>{initials(c)}</Avatar>
                                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                            <Typography sx={{ fontWeight: 600 }} noWrap>
                                                {fullName(c)}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {formatDayMonth(c.date)} · {rsd(count * amount)} od {rsd(payers.length * amount)}
                                            </Typography>
                                            <LinearProgress
                                                variant="determinate"
                                                value={payers.length ? (count / payers.length) * 100 : 0}
                                                color={count === payers.length ? 'success' : 'primary'}
                                                sx={{ mt: 0.75, borderRadius: 1 }}
                                            />
                                        </Box>
                                        <Chip
                                            size="small"
                                            label={`${count}/${payers.length}`}
                                            color={count === payers.length ? 'success' : past ? 'warning' : 'default'}
                                        />
                                        <ExpandMoreIcon sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                                    </Stack>
                                    <Collapse in={open} unmountOnExit>
                                        <Box
                                            sx={{
                                                px: 1.5,
                                                pb: 1.5,
                                                display: 'grid',
                                                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                                            }}
                                        >
                                            {payers.map((p) => (
                                                <FormControlLabel
                                                    key={p.id}
                                                    label={fullName(p)}
                                                    control={
                                                        <Checkbox
                                                            checked={paid.has(`${c.id}:${p.id}`)}
                                                            onChange={(e) =>
                                                                post({ celebrantId: c.id, payerId: p.id, year, paid: e.target.checked })
                                                            }
                                                        />
                                                    }
                                                />
                                            ))}
                                        </Box>
                                    </Collapse>
                                </Box>
                            )
                        })}
                    </Stack>
                </CardContent>
            </Card>

            <Card>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Typography variant="h6" sx={{ mb: 0.5 }}>
                        Učesnici i datumi rođenja
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Korisnici datum unose na profilu, a ovde možeš da ga dopuniš ili ispraviš. Ko <b>ne učestvuje</b> ne daje pare za
                        druge, niko ne daje za njega i ne pojavljuje se u „Ko je platio” ni u dugu ostalih.
                    </Typography>
                    <Stack spacing={1.25}>
                        {people.map((p) => (
                            <Stack
                                key={p.id}
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={{ xs: 0.5, sm: 1.5 }}
                                sx={{ alignItems: { sm: 'center' }, opacity: p.birthdayFund ? 1 : 0.6 }}
                            >
                                <Typography sx={{ flexGrow: 1, minWidth: 0, fontWeight: 600 }} noWrap>
                                    {fullName(p)}
                                </Typography>
                                <FormControlLabel
                                    label={p.birthdayFund ? 'Učestvuje' : 'Ne učestvuje'}
                                    control={
                                        <Switch checked={p.birthdayFund} onChange={(e) => post({ userId: p.id, fund: e.target.checked })} />
                                    }
                                    sx={{ mr: 0, minWidth: 150 }}
                                />
                                <TextField
                                    type="date"
                                    size="small"
                                    defaultValue={p.birthday ?? ''}
                                    onBlur={(e) =>
                                        e.target.value !== (p.birthday ?? '') && post({ userId: p.id, birthday: e.target.value })
                                    }
                                    slotProps={{ htmlInput: { 'aria-label': `Datum rođenja: ${fullName(p)}` } }}
                                    sx={{ width: 170 }}
                                />
                            </Stack>
                        ))}
                    </Stack>
                </CardContent>
            </Card>
        </Stack>
    )
}
