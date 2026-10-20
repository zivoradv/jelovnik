'use client'

import CakeIcon from '@mui/icons-material/Cake'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { birthdayInYear, currentMonth, formatDayMonth, monthLabel, nextBirthday, shiftMonth } from '@/lib/date'
import { rsd } from '@/lib/pricing'
import { fullName, initials } from '@/lib/users'
import type { BirthdayUser } from '@/services/birthdays.service'
import { useAuth } from '../auth-context'
import PageLoader from '../components/PageLoader'

const WEEK_HEAD = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned']

function daysLabel(days: number): string {
    if (days === 0) return 'danas! 🎂'
    if (days === 1) return 'sutra'
    return `za ${days} dana`
}

export default function RodjendaniPage() {
    const { user, loading } = useAuth()
    const [people, setPeople] = useState<BirthdayUser[]>([])
    const [paid, setPaid] = useState<[number, number][]>([])
    const [amount, setAmount] = useState(500)
    const [month, setMonth] = useState(currentMonth())
    const [error, setError] = useState('')
    const year = new Date().getFullYear()

    useEffect(() => {
        if (!user) return
        fetch(`/api/birthdays?year=${year}`)
            .then((r) => r.json())
            .then((d) => {
                setPeople(d.users || [])
                setPaid(d.paid || [])
                setAmount(d.amount ?? 500)
            })
            .catch(() => setError('Greška pri učitavanju rođendana.'))
    }, [user, year])

    const withBirthday = useMemo(() => people.filter((p): p is BirthdayUser & { birthday: string } => !!p.birthday), [people])

    const upcoming = useMemo(() => {
        const now = new Date()
        return withBirthday
            .map((p) => ({ ...p, next: nextBirthday(p.birthday, now) }))
            .sort((a, b) => a.next.days - b.next.days)
            .slice(0, 6)
    }, [withBirthday])

    if (loading || !user) return <PageLoader />

    const iPaid = (celebrantId: number) => paid.some(([c, p]) => c === celebrantId && p === user.id)

    return (
        <Stack spacing={{ xs: 2.5, sm: 3 }}>
            <Box>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                    Rođendani
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Za svaki rođendan svi ostali daju po {rsd(amount)}.
                </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
            {!user.birthday && (
                <Alert
                    severity="info"
                    action={
                        <Button component={Link} href="/profil" color="inherit" size="small">
                            Profil
                        </Button>
                    }
                >
                    Datum rođenja ti nije unet – dodaj ga na profilu da te ne preskočimo.
                </Alert>
            )}

            <Card>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Predstojeći rođendani
                    </Typography>
                    {upcoming.length === 0 ? (
                        <Typography color="text.secondary">Još niko nije uneo datum rođenja.</Typography>
                    ) : (
                        <Stack spacing={1.5}>
                            {upcoming.map((p) => {
                                const isMe = p.id === user.id
                                const thisYear = p.next.date.getFullYear() === year
                                return (
                                    <Stack key={p.id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                        <Avatar sx={{ bgcolor: p.next.days === 0 ? 'primary.main' : undefined }}>{initials(p)}</Avatar>
                                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                            <Typography sx={{ fontWeight: 600 }} noWrap>
                                                {fullName(p)}
                                                {isMe && ' (ti)'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {formatDayMonth(p.next.date)} · {daysLabel(p.next.days)}
                                            </Typography>
                                        </Box>
                                        {!isMe &&
                                            thisYear &&
                                            (iPaid(p.id) ? (
                                                <Chip size="small" color="success" label={`Uplaćeno ${rsd(amount)}`} />
                                            ) : (
                                                <Chip size="small" color="warning" variant="outlined" label={`Treba ${rsd(amount)}`} />
                                            ))}
                                    </Stack>
                                )
                            })}
                        </Stack>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent sx={{ p: { xs: 1.5, sm: 3 } }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                        <Tooltip title="Prethodni mesec">
                            <IconButton onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Prethodni mesec" size="small">
                                <ChevronLeftIcon />
                            </IconButton>
                        </Tooltip>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                            {monthLabel(month)}
                        </Typography>
                        <Tooltip title="Sledeći mesec">
                            <IconButton onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Sledeći mesec" size="small">
                                <ChevronRightIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <MonthGrid month={month} people={withBirthday} />
                </CardContent>
            </Card>
        </Stack>
    )
}

function MonthGrid({ month, people }: { month: string; people: (BirthdayUser & { birthday: string })[] }) {
    const [y, m] = month.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7
    const today = new Date()

    const byDay = new Map<number, BirthdayUser[]>()
    for (const p of people) {
        const d = birthdayInYear(p.birthday, y)
        if (d.getMonth() !== m - 1) continue
        byDay.set(d.getDate(), [...(byDay.get(d.getDate()) ?? []), p])
    }

    const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.5 }}>
            {WEEK_HEAD.map((h) => (
                <Typography key={h} variant="caption" color="text.secondary" sx={{ textAlign: 'center', fontWeight: 600 }}>
                    {h}
                </Typography>
            ))}
            {cells.map((day, i) => {
                if (day === null) return <Box key={`e${i}`} />
                const list = byDay.get(day) ?? []
                const isToday = today.getFullYear() === y && today.getMonth() === m - 1 && today.getDate() === day
                return (
                    <Box
                        key={day}
                        sx={(t) => ({
                            minHeight: { xs: 48, sm: 72 },
                            p: 0.5,
                            borderRadius: 1,
                            border: `1px solid ${isToday ? t.vars.palette.primary.main : t.vars.palette.divider}`,
                            bgcolor: list.length ? `rgba(${t.vars.palette.primary.mainChannel} / 0.12)` : undefined,
                            overflow: 'hidden',
                        })}
                    >
                        <Typography variant="caption" sx={{ fontWeight: isToday ? 800 : 500 }}>
                            {day}
                        </Typography>
                        {list.map((p) => (
                            <Tooltip key={p.id} title={fullName(p)}>
                                <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', minWidth: 0 }}>
                                    <CakeIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                    <Typography variant="caption" noWrap sx={{ fontSize: { xs: '0.6rem', sm: '0.75rem' } }}>
                                        {p.firstName || p.username}
                                    </Typography>
                                </Stack>
                            </Tooltip>
                        ))}
                    </Box>
                )
            })}
        </Box>
    )
}
