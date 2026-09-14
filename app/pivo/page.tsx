'use client'

import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import ScheduleIcon from '@mui/icons-material/Schedule'
import SportsBarIcon from '@mui/icons-material/SportsBar'
import ThumbDownOutlinedIcon from '@mui/icons-material/ThumbDownOutlined'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import {
    Alert,
    Avatar,
    AvatarGroup,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Skeleton,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { formatDateLong, fromISODate, toISODate } from '@/lib/date'
import { fullName, initials } from '@/lib/users'
import { useAuth } from '../auth-context'
import { useFun } from '../fun-context'

interface Person {
    userId: number
    username: string
    firstName: string
    lastName: string
    status: 'da' | 'ne'
}

interface Plan {
    id: number
    date: string
    time: string
    place: string
    note: string
    createdBy: number
    creatorName: string
    going: Person[]
    notGoing: Person[]
}

function dayName(iso: string): string {
    return new Intl.DateTimeFormat('sr-Latn-RS', { weekday: 'long' }).format(fromISODate(iso))
}

function peopleWord(n: number): string {
    if (n === 1) return 'osoba'
    if (n >= 2 && n <= 4) return 'osobe'
    return 'osoba'
}

const CHEERS = [
    'Živeli! 🍻',
    'Prvo pivo je uvek najbolje.',
    'Kuvarica ne mora da zna.',
    'Jedno pivo. Rekao je svako ikad.',
    'Nije bitno kad, bitno je s kim.',
]

export default function PivoPage() {
    const { user } = useAuth()
    const { confetti } = useFun()
    const [upcoming, setUpcoming] = useState<Plan[]>([])
    const [past, setPast] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [toast, setToast] = useState('')
    const [busy, setBusy] = useState<string | null>(null)

    const [open, setOpen] = useState(false)
    const [date, setDate] = useState(() => toISODate(new Date()))
    const [time, setTime] = useState('17:00')
    const [place, setPlace] = useState('')
    const [note, setNote] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/pivo')
            const data = await res.json()
            setUpcoming(data.upcoming || [])
            setPast(data.past || [])
        } catch {
            setError('Greška pri učitavanju.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    function applyPlan(plan: Plan) {
        setUpcoming((prev) => prev.map((p) => (p.id === plan.id ? plan : p)))
    }

    async function vote(plan: Plan, status: 'da' | 'ne') {
        setBusy(`${plan.id}|${status}`)
        setError('')
        try {
            const res = await fetch('/api/pivo/rsvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: plan.id, status }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Greška.')
            applyPlan(data.plan)
            if (status === 'da') {
                confetti('burst')
                setToast(CHEERS[Math.floor(Math.random() * CHEERS.length)])
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Greška.')
        } finally {
            setBusy(null)
        }
    }

    async function create() {
        setBusy('create')
        setError('')
        try {
            const res = await fetch('/api/pivo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, time, place, note }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Greška.')
            setOpen(false)
            setPlace('')
            setNote('')
            await load()
            confetti('burst')
            setToast('Predlog je poslat svima. Sad čekamo ekipu.')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Greška.')
        } finally {
            setBusy(null)
        }
    }

    async function remove(plan: Plan) {
        if (!confirm('Obrisati ovaj dogovor?')) return
        const res = await fetch(`/api/pivo/${plan.id}`, { method: 'DELETE' })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data.error || 'Greška pri brisanju.')
            return
        }
        await load()
    }

    const next = upcoming[0] ?? null
    const rest = upcoming.slice(1)

    if (loading) {
        return (
            <Stack spacing={2}>
                <Skeleton variant="text" width={200} height={44} />
                <Skeleton variant="rounded" height={220} />
                <Skeleton variant="rounded" height={120} />
            </Stack>
        )
    }

    return (
        <Stack spacing={{ xs: 2.5, sm: 3 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="h4" sx={{ mb: 0.5 }}>
                        Pivo 🍺
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Ko ide, kad i gde. Predloži termin ili se prijavi na postojeći.
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ flexShrink: 0 }}>
                    Predloži pivo
                </Button>
            </Stack>

            {error && (
                <Alert severity="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {next ? (
                <PlanCard
                    plan={next}
                    me={user?.id ?? 0}
                    isAdmin={user?.role === 'admin'}
                    busy={busy}
                    onVote={vote}
                    onDelete={remove}
                    hero
                />
            ) : (
                <Card sx={{ py: 6, px: 3, textAlign: 'center' }}>
                    <SportsBarIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="h6" sx={{ mb: 0.5 }}>
                        Trenutno nema dogovora
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                        Neko mora da bude prvi. Zašto ne ti?
                    </Typography>
                    <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
                        Predloži pivo
                    </Button>
                </Card>
            )}

            {rest.length > 0 && (
                <Box>
                    <SectionTitle title="Sledeći termini" count={rest.length} />
                    <Stack spacing={1.25}>
                        {rest.map((p) => (
                            <PlanCard
                                key={p.id}
                                plan={p}
                                me={user?.id ?? 0}
                                isAdmin={user?.role === 'admin'}
                                busy={busy}
                                onVote={vote}
                                onDelete={remove}
                            />
                        ))}
                    </Stack>
                </Box>
            )}

            {past.length > 0 && (
                <Box>
                    <SectionTitle title="Bilo je lepo" count={past.length} />
                    <Stack spacing={1}>
                        {past.map((p) => (
                            <Card key={p.id} sx={{ opacity: 0.7 }}>
                                <CardContent sx={{ '&:last-child': { pb: 1.5 }, py: 1.5 }}>
                                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                                        <Typography sx={{ fontWeight: 600 }}>
                                            {dayName(p.date)}, {formatDateLong(fromISODate(p.date))} u {p.time}
                                        </Typography>
                                        {p.place && <Chip size="small" variant="outlined" icon={<PlaceOutlinedIcon />} label={p.place} />}
                                        <Box sx={{ flexGrow: 1 }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {p.going.length > 0 ? `${p.going.map((g) => fullName(g)).join(', ')}` : 'niko nije išao 😢'}
                                        </Typography>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </Box>
            )}

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle>Predloži pivo 🍺</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Stack direction="row" spacing={1.5}>
                            <TextField
                                label="Datum"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: toISODate(new Date()) } }}
                                fullWidth
                            />
                            <TextField
                                label="Vreme"
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                slotProps={{ inputLabel: { shrink: true } }}
                                sx={{ minWidth: 130 }}
                            />
                        </Stack>
                        <TextField
                            label="Mesto"
                            value={place}
                            onChange={(e) => setPlace(e.target.value)}
                            fullWidth
                            placeholder="npr. Kod Vlajka"
                        />
                        <TextField
                            label="Napomena"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            fullWidth
                            multiline
                            minRows={2}
                            placeholder="npr. posle posla, ko može"
                        />
                        <Alert severity="info" variant="outlined">
                            Svi korisnici dobijaju obaveštenje, a ti si automatski prijavljen.
                        </Alert>
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setOpen(false)} color="inherit">
                        Otkaži
                    </Button>
                    <Button variant="contained" onClick={create} disabled={busy === 'create' || !date || !time}>
                        {busy === 'create' ? 'Šaljem…' : 'Predloži'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={!!toast}
                autoHideDuration={3000}
                onClose={() => setToast('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="success" variant="filled" onClose={() => setToast('')}>
                    {toast}
                </Alert>
            </Snackbar>
        </Stack>
    )
}

function SectionTitle({ title, count }: { title: string; count: number }) {
    return (
        <Stack direction="row" spacing={1} sx={{ mb: 1.25, alignItems: 'center' }}>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
                {title}
            </Typography>
            <Chip label={count} size="small" variant="outlined" sx={{ height: 20 }} />
            <Divider sx={{ flexGrow: 1, ml: 1 }} />
        </Stack>
    )
}

function PlanCard({
    plan,
    me,
    isAdmin,
    busy,
    onVote,
    onDelete,
    hero,
}: {
    plan: Plan
    me: number
    isAdmin: boolean
    busy: string | null
    onVote: (plan: Plan, status: 'da' | 'ne') => void
    onDelete: (plan: Plan) => void
    hero?: boolean
}) {
    const mine = plan.going.find((g) => g.userId === me) ? 'da' : plan.notGoing.find((g) => g.userId === me) ? 'ne' : null
    const isToday = plan.date === toISODate(new Date())
    const canDelete = plan.createdBy === me || isAdmin

    return (
        <Card
            sx={(t) => ({
                position: 'relative',
                overflow: 'hidden',
                boxShadow: hero ? t.shadows[4] : 'none',
                borderColor: hero ? 'secondary.main' : t.vars.palette.divider,
                '&::before': hero
                    ? {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 5,
                          background: `linear-gradient(180deg, ${t.vars.palette.secondary.light}, ${t.vars.palette.secondary.dark})`,
                      }
                    : undefined,
            })}
        >
            <CardContent sx={{ p: hero ? { xs: 2.5, sm: 3 } : 2, pl: hero ? { xs: 3, sm: 3.5 } : 2 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        {hero && (
                            <Typography variant="overline" color="secondary.dark" sx={{ lineHeight: 1 }}>
                                {isToday ? 'Danas!' : 'Sledeće pivo'}
                            </Typography>
                        )}
                        <Typography variant={hero ? 'h5' : 'subtitle1'} sx={{ fontWeight: 700, mt: hero ? 0.5 : 0, lineHeight: 1.2 }}>
                            {dayName(plan.date).replace(/^./, (c) => c.toUpperCase())}, {formatDateLong(fromISODate(plan.date))}
                        </Typography>
                        <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Chip size="small" icon={<ScheduleIcon />} label={plan.time} />
                            {plan.place && <Chip size="small" variant="outlined" icon={<PlaceOutlinedIcon />} label={plan.place} />}
                            <Typography variant="caption" color="text.secondary">
                                predložio/la {plan.creatorName}
                            </Typography>
                        </Stack>
                        {plan.note && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                                „{plan.note}”
                            </Typography>
                        )}
                    </Box>
                    {canDelete && (
                        <Tooltip title="Obriši dogovor">
                            <IconButton
                                size="small"
                                aria-label="Obriši"
                                onClick={() => onDelete(plan)}
                                sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                            >
                                <DeleteOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>

                <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: plan.going.length > 0 ? 1 : 0 }}>
                            <ThumbUpIcon fontSize="small" sx={{ color: 'success.main' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Ide {plan.going.length} {peopleWord(plan.going.length)}
                            </Typography>
                            {plan.going.length > 0 && (
                                <AvatarGroup
                                    max={6}
                                    sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.75rem', fontWeight: 700 } }}
                                >
                                    {plan.going.map((g) => (
                                        <Tooltip key={g.userId} title={fullName(g)}>
                                            <Avatar
                                                sx={(t) => ({
                                                    bgcolor: t.vars.palette.secondary.main,
                                                    color: t.vars.palette.secondary.contrastText,
                                                })}
                                            >
                                                {initials(g)}
                                            </Avatar>
                                        </Tooltip>
                                    ))}
                                </AvatarGroup>
                            )}
                        </Stack>
                        {plan.going.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {plan.going.map((g) => (
                                    <Chip
                                        key={g.userId}
                                        size="small"
                                        label={fullName(g)}
                                        color={g.userId === me ? 'secondary' : 'default'}
                                        variant={g.userId === me ? 'filled' : 'outlined'}
                                    />
                                ))}
                            </Box>
                        )}
                        {plan.notGoing.length > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                Ne može: {plan.notGoing.map((g) => fullName(g)).join(', ')}
                            </Typography>
                        )}
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                        <Button
                            variant={mine === 'da' ? 'contained' : 'outlined'}
                            color="success"
                            startIcon={<ThumbUpIcon />}
                            disabled={busy !== null || mine === 'da'}
                            onClick={() => onVote(plan, 'da')}
                        >
                            {mine === 'da' ? 'Idem!' : 'Idem'}
                        </Button>
                        <Button
                            variant={mine === 'ne' ? 'contained' : 'outlined'}
                            color="inherit"
                            startIcon={<ThumbDownOutlinedIcon />}
                            disabled={busy !== null || mine === 'ne'}
                            onClick={() => onVote(plan, 'ne')}
                            sx={{ color: mine === 'ne' ? undefined : 'text.secondary' }}
                        >
                            Ne mogu
                        </Button>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    )
}
