'use client'

import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Alert, Avatar, Badge, Box, Button, Chip, Divider, IconButton, Popover, Stack, Tooltip, Typography } from '@mui/material'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { type BirthdayPerson, myBirthdayEntries, whenLabel } from '@/lib/birthdays'
import { birthdayInYear, currentMonth, formatDayMonth, monthLabel, nextBirthday, shiftMonth } from '@/lib/date'
import { rsd } from '@/lib/pricing'
import { fullName, initials } from '@/lib/users'
import { useAuth } from '../auth-context'

const WEEK_HEAD = ['P', 'U', 'S', 'Č', 'P', 'S', 'N']
/** Tačkica na ikonici kad je nečiji rođendan u narednih toliko dana. */
const SOON_DAYS = 3

type WithBirthday = BirthdayPerson & { birthday: string }

/** Šta rođendan znači za ulogovanog korisnika; `ostalo` = nema šta da se plati (druga godina, pre njegovog naloga). */
type Kind = 'moj' | 'treba' | 'placeno' | 'kasnije' | 'ostalo'

/** Kad je više rođendana istog dana, dan dobija boju najvažnijeg. */
const PRIORITY: Kind[] = ['moj', 'treba', 'placeno', 'kasnije', 'ostalo']

const KIND_COLOR: Record<Kind, 'primary' | 'warning' | 'success' | 'info' | null> = {
    moj: 'primary',
    treba: 'warning',
    placeno: 'success',
    kasnije: 'info',
    ostalo: null,
}

const LEGEND: { kind: Kind; label: string }[] = [
    { kind: 'treba', label: 'treba platiti' },
    { kind: 'placeno', label: 'plaćeno' },
    { kind: 'kasnije', label: 'kasnije' },
    { kind: 'moj', label: 'tvoj' },
]

/** Ikonica u navigaciji koja otvara rođendanski kalendar. */
export default function BirthdayCalendar() {
    const { user } = useAuth()
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)
    const [people, setPeople] = useState<WithBirthday[]>([])
    const [paid, setPaid] = useState<[number, number][]>([])
    const [amount, setAmount] = useState(0)
    const [month, setMonth] = useState(currentMonth())

    const load = useCallback(() => {
        fetch(`/api/birthdays?year=${new Date().getFullYear()}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (!d) return
                setPeople((d.users || []).filter((p: BirthdayPerson) => p.birthday))
                setPaid(d.paid || [])
                setAmount(d.amount || 0)
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        load()
    }, [load])

    /** Status uplate za ovogodišnje rođendane ostalih. */
    const statusById = useMemo(
        () => new Map(user ? myBirthdayEntries(people, paid, user).map((e) => [e.id, e.status]) : []),
        [people, paid, user],
    )

    const soon = useMemo(() => {
        const now = new Date()
        return people.some((p) => nextBirthday(p.birthday, now).days <= SOON_DAYS)
    }, [people])

    const [y, m] = month.split('-').map(Number)
    const inMonth = useMemo(
        () =>
            people
                .map((p) => ({ ...p, date: birthdayInYear(p.birthday, y) }))
                .filter((p) => p.date.getMonth() === m - 1)
                .sort((a, b) => a.date.getDate() - b.date.getDate()),
        [people, y, m],
    )

    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const daysInMonth = new Date(y, m, 0).getDate()
    const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7
    const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

    function kindOf(id: number): Kind {
        if (id === user?.id) return 'moj'
        return (y === today.getFullYear() && statusById.get(id)) || 'ostalo'
    }

    const birthdayDays = new Map<number, { names: string[]; kind: Kind }>()
    for (const p of inMonth) {
        const d = p.date.getDate()
        const prev = birthdayDays.get(d)
        const kind = kindOf(p.id)
        birthdayDays.set(d, {
            names: [...(prev?.names ?? []), fullName(p)],
            kind: prev && PRIORITY.indexOf(prev.kind) < PRIORITY.indexOf(kind) ? prev.kind : kind,
        })
    }

    function openCalendar(el: HTMLElement) {
        setMonth(currentMonth())
        setAnchor(el)
        load()
    }

    return (
        <>
            <Tooltip title="Rođendani">
                <IconButton onClick={(e) => openCalendar(e.currentTarget)} aria-label="Rođendani" sx={{ color: 'text.secondary' }}>
                    <Badge variant="dot" color="primary" invisible={!soon}>
                        <CakeOutlinedIcon />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Popover
                open={Boolean(anchor)}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { width: 'min(380px, calc(100vw - 24px))', borderRadius: 1, mt: 1 } } }}
            >
                <Stack direction="row" sx={{ px: 1, py: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                    <IconButton size="small" aria-label="Prethodni mesec" onClick={() => setMonth((v) => shiftMonth(v, -1))}>
                        <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                        🎂 {monthLabel(month)}
                    </Typography>
                    <IconButton size="small" aria-label="Sledeći mesec" onClick={() => setMonth((v) => shiftMonth(v, 1))}>
                        <ChevronRightIcon />
                    </IconButton>
                </Stack>
                <Divider />

                <Box sx={{ px: 1.5, pt: 1.5, pb: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                    {WEEK_HEAD.map((h, i) => (
                        <Typography key={i} variant="caption" color="text.disabled" sx={{ textAlign: 'center', fontWeight: 700 }}>
                            {h}
                        </Typography>
                    ))}
                    {cells.map((day, i) => {
                        if (day === null) return <Box key={`e${i}`} />
                        const info = birthdayDays.get(day)
                        const color = info ? KIND_COLOR[info.kind] : null
                        const isToday = today.getFullYear() === y && today.getMonth() === m - 1 && today.getDate() === day
                        const cell = (
                            <Box
                                key={day}
                                sx={(t) => ({
                                    aspectRatio: '1',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    fontSize: '0.85rem',
                                    fontWeight: info || isToday ? 700 : 400,
                                    color: color ? t.vars.palette[color].contrastText : 'inherit',
                                    bgcolor: color ? t.vars.palette[color].main : info ? t.vars.palette.action.selected : 'transparent',
                                    outline: isToday ? `2px solid ${t.vars.palette.text.primary}` : 'none',
                                    outlineOffset: info ? 2 : -2,
                                    cursor: info ? 'help' : 'default',
                                })}
                            >
                                {day}
                            </Box>
                        )
                        return info ? (
                            <Tooltip key={day} title={info.names.join(', ')} enterTouchDelay={0}>
                                {cell}
                            </Tooltip>
                        ) : (
                            cell
                        )
                    })}
                </Box>
                <Stack direction="row" spacing={1.5} useFlexGap sx={{ px: 2, pb: 1.25, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {LEGEND.map((l) => (
                        <Stack key={l.kind} direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: `${KIND_COLOR[l.kind]}.main` }} />
                            <Typography variant="caption" color="text.secondary">
                                {l.label}
                            </Typography>
                        </Stack>
                    ))}
                </Stack>
                <Divider />

                <Box sx={{ px: 2, py: 1.5, maxHeight: 260, overflowY: 'auto' }}>
                    {inMonth.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                            Nema rođendana u ovom mesecu.
                        </Typography>
                    ) : (
                        <Stack spacing={1.25}>
                            {inMonth.map((p) => {
                                const days = Math.round((p.date.getTime() - todayStart.getTime()) / 86_400_000)
                                const kind = kindOf(p.id)
                                const color = KIND_COLOR[kind]
                                return (
                                    <Stack key={p.id} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                        <Avatar
                                            sx={{
                                                width: 34,
                                                height: 34,
                                                fontSize: '0.8rem',
                                                bgcolor: color ? `${color}.main` : undefined,
                                                color: color ? `${color}.contrastText` : undefined,
                                            }}
                                        >
                                            {initials(p)}
                                        </Avatar>
                                        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                                {fullName(p)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatDayMonth(p.date)}
                                                {Math.abs(days) <= 60 && ` · ${whenLabel(days)}`}
                                            </Typography>
                                        </Box>
                                        <StatusChip kind={kind} amount={amount} />
                                    </Stack>
                                )
                            })}
                        </Stack>
                    )}
                </Box>

                {user && !user.birthday && (
                    <Box sx={{ px: 1.5, pb: 1.5 }}>
                        <Alert
                            severity="info"
                            sx={{ py: 0 }}
                            action={
                                <Button component={Link} href="/profil" size="small" color="inherit" onClick={() => setAnchor(null)}>
                                    Unesi
                                </Button>
                            }
                        >
                            Tvoj datum rođenja nije unet.
                        </Alert>
                    </Box>
                )}
            </Popover>
        </>
    )
}

function StatusChip({ kind, amount }: { kind: Kind; amount: number }) {
    switch (kind) {
        case 'moj':
            return <Chip size="small" color="primary" label="Tvoj rođendan 🎉" />
        case 'treba':
            return <Chip size="small" color="warning" label={`Platiti ${rsd(amount)}`} />
        case 'placeno':
            return <Chip size="small" color="success" variant="outlined" label="Plaćeno ✓" />
        case 'kasnije':
            return <Chip size="small" color="info" variant="outlined" label="Kasnije" />
        default:
            return null
    }
}
