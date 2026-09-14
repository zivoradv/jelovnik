'use client'

import CampaignIcon from '@mui/icons-material/Campaign'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import PaymentsIcon from '@mui/icons-material/Payments'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    Collapse,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    Skeleton,
    Snackbar,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { formatDateLong, fromISODate } from '@/lib/date'
import { rsd } from '@/lib/pricing'
import { fullName, initials } from '@/lib/users'

interface DebtRow {
    date: string
    full: number
    subsidy: number
    total: number
    mealCount: number
    customCount: number
    paid: boolean
    paidAt: string | null
}

interface Balance {
    userId: number
    username: string
    firstName: string
    lastName: string
    rows: DebtRow[]
    unpaidTotal: number
    paidTotal: number
    unpaidCount: number
}

export default function DebtsAdmin() {
    const [balances, setBalances] = useState<Balance[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [toast, setToast] = useState('')
    const [busy, setBusy] = useState<string | null>(null)
    const [expanded, setExpanded] = useState<number | null>(null)
    const [onlyDebtors, setOnlyDebtors] = useState(true)
    const [search, setSearch] = useState('')

    const [msgOpen, setMsgOpen] = useState(false)
    const [msgTitle, setMsgTitle] = useState('')
    const [msgBody, setMsgBody] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch('/api/admin/payments')
            const data = await res.json()
            setBalances(data.balances || [])
        } catch {
            setError('Greška pri učitavanju dugova.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return balances
            .filter((b) => (onlyDebtors ? b.unpaidTotal > 0 : b.rows.length > 0))
            .filter((b) => !q || fullName(b).toLowerCase().includes(q) || b.username.toLowerCase().includes(q))
            .sort((a, b) => b.unpaidTotal - a.unpaidTotal || fullName(a).localeCompare(fullName(b), 'sr'))
    }, [balances, onlyDebtors, search])

    const totals = useMemo(() => {
        let unpaid = 0
        let paid = 0
        let debtors = 0
        for (const b of balances) {
            unpaid += b.unpaidTotal
            paid += b.paidTotal
            if (b.unpaidTotal > 0) debtors += 1
        }
        return { unpaid, paid, debtors }
    }, [balances])

    async function post(body: unknown): Promise<boolean> {
        const res = await fetch('/api/admin/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data.error || 'Greška pri čuvanju.')
            return false
        }
        return true
    }

    async function togglePaid(b: Balance, date: string, paid: boolean) {
        const key = `${b.userId}|${date}`
        setBusy(key)
        setError('')
        try {
            if (await post({ userId: b.userId, date, paid })) await load()
        } finally {
            setBusy(null)
        }
    }

    async function payAll(b: Balance) {
        if (!confirm(`Označiti sve neplaćene dane (${rsd(b.unpaidTotal)}) za ${fullName(b)} kao plaćene?`)) return
        setBusy(`all|${b.userId}`)
        setError('')
        try {
            if (await post({ userId: b.userId, all: true })) {
                await load()
                setToast(`${fullName(b)}: dug izmiren, korisnik obavešten.`)
            }
        } finally {
            setBusy(null)
        }
    }

    async function sendReminders() {
        if (!confirm(`Poslati podsetnik svima koji duguju (${totals.debtors})?`)) return
        setBusy('reminders')
        setError('')
        try {
            const res = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'debt-reminders' }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Greška pri slanju.')
            setToast(`Podsetnik poslat: ${data.notified} ${data.notified === 1 ? 'korisniku' : 'korisnika'}.`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Greška pri slanju.')
        } finally {
            setBusy(null)
        }
    }

    async function sendBroadcast() {
        setBusy('broadcast')
        setError('')
        try {
            const res = await fetch('/api/admin/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'broadcast', title: msgTitle, body: msgBody }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Greška pri slanju.')
            setMsgOpen(false)
            setMsgTitle('')
            setMsgBody('')
            setToast(`Poruka poslata svim korisnicima (${data.notified}).`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Greška pri slanju.')
        } finally {
            setBusy(null)
        }
    }

    if (loading) {
        return (
            <Stack spacing={1.5}>
                <Skeleton variant="rounded" height={88} />
                {[0, 1, 2].map((i) => (
                    <Skeleton key={i} variant="rounded" height={84} />
                ))}
            </Stack>
        )
    }

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2.5 }}>
                <StatTile label="Ukupno neplaćeno" value={rsd(totals.unpaid)} icon={<PaymentsIcon fontSize="small" />} highlight />
                <StatTile label="Dužnika" value={String(totals.debtors)} icon={<NotificationsActiveIcon fontSize="small" />} />
                <StatTile label="Ukupno naplaćeno" value={rsd(totals.paid)} icon={<CheckCircleIcon fontSize="small" />} />
            </Box>

            <Card sx={{ p: { xs: 2, sm: 2.5 }, mb: 2.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
                    <TextField
                        size="small"
                        label="Pretraga"
                        placeholder="ime, prezime ili korisničko ime"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{ minWidth: 240 }}
                    />
                    <FormControlLabel
                        control={<Switch checked={onlyDebtors} onChange={(e) => setOnlyDebtors(e.target.checked)} />}
                        label="Samo dužnici"
                    />
                    <Box sx={{ flexGrow: 1 }} />
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            startIcon={<NotificationsActiveIcon />}
                            onClick={sendReminders}
                            disabled={busy === 'reminders' || totals.debtors === 0}
                        >
                            Podsetnik dužnicima
                        </Button>
                        <Button variant="outlined" startIcon={<CampaignIcon />} onClick={() => setMsgOpen(true)}>
                            Poruka svima
                        </Button>
                    </Stack>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Podsetnik se šalje i automatski svakog ponedeljka ujutru (cron), a ovde možeš da ga pošalješ odmah.
                </Typography>
            </Card>

            {filtered.length === 0 ? (
                <Card sx={{ py: 6, px: 3, textAlign: 'center' }}>
                    <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1.5 }} />
                    <Typography variant="h6" sx={{ mb: 0.5 }}>
                        {onlyDebtors ? 'Niko ne duguje' : 'Nema porudžbina'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {onlyDebtors ? 'Svi računi su izmireni. Kuvarica je srećna.' : 'Još niko nije naručio.'}
                    </Typography>
                </Card>
            ) : (
                <Stack spacing={1.25}>
                    {filtered.map((b) => {
                        const open = expanded === b.userId
                        return (
                            <Card key={b.userId} sx={{ '&:hover': { borderColor: 'primary.light' } }}>
                                <CardContent sx={{ '&:last-child': { pb: 1.75 }, py: 1.75 }}>
                                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                        <Avatar
                                            sx={(t) => ({
                                                width: 40,
                                                height: 40,
                                                fontWeight: 700,
                                                fontSize: '0.9rem',
                                                bgcolor: b.unpaidTotal > 0 ? t.vars.palette.primary.main : t.vars.palette.action.selected,
                                                color:
                                                    b.unpaidTotal > 0 ? t.vars.palette.primary.contrastText : t.vars.palette.text.secondary,
                                            })}
                                        >
                                            {initials(b)}
                                        </Avatar>
                                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                            <Typography sx={{ fontWeight: 600 }} noWrap>
                                                {fullName(b)}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                @{b.username} · {b.rows.length} {b.rows.length === 1 ? 'dan' : 'dana'}
                                                {b.paidTotal > 0 && ` · plaćeno ${rsd(b.paidTotal)}`}
                                            </Typography>
                                        </Box>
                                        <Stack sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
                                            <Typography
                                                sx={{ fontWeight: 700, color: b.unpaidTotal > 0 ? 'primary.main' : 'success.main' }}
                                            >
                                                {b.unpaidTotal > 0 ? rsd(b.unpaidTotal) : 'izmireno'}
                                            </Typography>
                                            {b.unpaidCount > 0 && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {b.unpaidCount} neplać.
                                                </Typography>
                                            )}
                                        </Stack>
                                        {b.unpaidTotal > 0 && (
                                            <Tooltip title="Označi sve kao plaćeno">
                                                <span>
                                                    <IconButton
                                                        aria-label="Označi sve kao plaćeno"
                                                        onClick={() => payAll(b)}
                                                        disabled={busy === `all|${b.userId}`}
                                                        sx={{ color: 'success.main' }}
                                                    >
                                                        <DoneAllIcon />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        )}
                                        <IconButton
                                            aria-label={open ? 'Sakrij dane' : 'Prikaži dane'}
                                            onClick={() => setExpanded(open ? null : b.userId)}
                                            sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 160ms' }}
                                        >
                                            <ExpandMoreIcon />
                                        </IconButton>
                                    </Stack>

                                    <Collapse in={open} unmountOnExit>
                                        <Divider sx={{ my: 1.5 }} />
                                        <Stack spacing={0.5}>
                                            {b.rows.map((r) => {
                                                const key = `${b.userId}|${r.date}`
                                                return (
                                                    <Stack
                                                        key={r.date}
                                                        direction="row"
                                                        spacing={1.5}
                                                        sx={(t) => ({
                                                            alignItems: 'center',
                                                            px: 1,
                                                            py: 0.5,
                                                            borderRadius: 2,
                                                            opacity: r.paid ? 0.65 : 1,
                                                            '&:hover': { bgcolor: t.vars.palette.action.hover },
                                                        })}
                                                    >
                                                        <Checkbox
                                                            checked={r.paid}
                                                            disabled={busy === key}
                                                            onChange={(e) => togglePaid(b, r.date, e.target.checked)}
                                                            icon={<RadioButtonUncheckedIcon />}
                                                            checkedIcon={<CheckCircleIcon />}
                                                            sx={{
                                                                p: 0.5,
                                                                color: 'text.disabled',
                                                                '&.Mui-checked': { color: 'success.main' },
                                                            }}
                                                            slotProps={{ input: { 'aria-label': `Plaćeno ${r.date}` } }}
                                                        />
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ minWidth: 96, textDecoration: r.paid ? 'line-through' : 'none' }}
                                                        >
                                                            {formatDateLong(fromISODate(r.date))}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 90 }}>
                                                            {rsd(r.total)}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                                                            puna {rsd(r.full)}
                                                            {r.subsidy > 0 && ` · firma ${rsd(r.subsidy)}`}
                                                            {r.mealCount > 0 && ` · ${r.mealCount} porc.`}
                                                            {r.customCount > 0 && ` · ${r.customCount} bez cene`}
                                                        </Typography>
                                                        {r.paid ? (
                                                            <Chip size="small" color="success" variant="outlined" label="plaćeno" />
                                                        ) : (
                                                            <Chip size="small" color="primary" variant="outlined" label="duguje" />
                                                        )}
                                                    </Stack>
                                                )
                                            })}
                                        </Stack>
                                    </Collapse>
                                </CardContent>
                            </Card>
                        )
                    })}
                </Stack>
            )}

            <Dialog open={msgOpen} onClose={() => setMsgOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Poruka svim korisnicima</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Naslov"
                            value={msgTitle}
                            onChange={(e) => setMsgTitle(e.target.value)}
                            required
                            fullWidth
                            autoFocus
                            placeholder="npr. Sutra nema kuvanih jela"
                        />
                        <TextField
                            label="Tekst poruke"
                            value={msgBody}
                            onChange={(e) => setMsgBody(e.target.value)}
                            fullWidth
                            multiline
                            minRows={3}
                        />
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setMsgOpen(false)} color="inherit">
                        Otkaži
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<CampaignIcon />}
                        onClick={sendBroadcast}
                        disabled={busy === 'broadcast' || !msgTitle.trim()}
                    >
                        Pošalji
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={!!toast}
                autoHideDuration={2500}
                onClose={() => setToast('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="success" variant="filled" onClose={() => setToast('')}>
                    {toast}
                </Alert>
            </Snackbar>
        </Box>
    )
}

function StatTile({ label, value, icon, highlight }: { label: string; value: string; icon: ReactNode; highlight?: boolean }) {
    return (
        <Card sx={{ px: 2, py: 1.75 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 0.5, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', color: 'primary.main' }}>{icon}</Box>
                <Typography variant="body2" color="text.secondary">
                    {label}
                </Typography>
            </Stack>
            <Typography
                sx={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 600,
                    fontSize: '1.6rem',
                    lineHeight: 1.15,
                    color: highlight ? 'primary.main' : 'text.primary',
                }}
            >
                {value}
            </Typography>
        </Card>
    )
}
