'use client'

import CampaignIcon from '@mui/icons-material/Campaign'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import IndeterminateCheckBoxOutlinedIcon from '@mui/icons-material/IndeterminateCheckBoxOutlined'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import PaymentsIcon from '@mui/icons-material/Payments'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined'
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
import { useConfirm } from '../confirm-context'

type DebtStatus = 'placeno' | 'neplaceno' | 'delimicno' | 'preplaceno' | 'nista'

interface DebtRow {
    date: string
    full: number
    subsidy: number
    total: number
    paid: number
    remaining: number
    status: DebtStatus
    mealCount: number
    paidAt: string | null
}

interface Balance {
    userId: number
    username: string
    firstName: string
    lastName: string
    rows: DebtRow[]
    unpaidTotal: number
    overpaidTotal: number
    paidTotal: number
    unpaidCount: number
    balance: number
}

const STATUS_LABEL: Record<DebtStatus, { label: string; color: 'success' | 'primary' | 'warning' | 'info' | 'default' }> = {
    placeno: { label: 'plaćeno', color: 'success' },
    neplaceno: { label: 'duguje', color: 'primary' },
    delimicno: { label: 'delimično', color: 'warning' },
    preplaceno: { label: 'preplaćeno', color: 'info' },
    nista: { label: 'ništa', color: 'default' },
}

export default function DebtsAdmin() {
    const confirm = useConfirm()
    const [balances, setBalances] = useState<Balance[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState('')
    const [toast, setToast] = useState('')
    const [busy, setBusy] = useState<string | null>(null)
    const [expanded, setExpanded] = useState<number | null>(null)
    const [onlyOpen, setOnlyOpen] = useState(true)
    const [search, setSearch] = useState('')

    const [msgOpen, setMsgOpen] = useState(false)
    const [msgTitle, setMsgTitle] = useState('')
    const [msgBody, setMsgBody] = useState('')

    const load = useCallback(async () => {
        setRefreshing(true)
        setError('')
        try {
            const res = await fetch('/api/admin/payments')
            const data = await res.json()
            setBalances(data.balances || [])
        } catch {
            setError('Greška pri učitavanju dugova.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return balances
            .filter((b) => (onlyOpen ? b.unpaidTotal > 0 || b.overpaidTotal > 0 : b.rows.length > 0))
            .filter((b) => !q || fullName(b).toLowerCase().includes(q) || b.username.toLowerCase().includes(q))
            .sort(
                (a, b) =>
                    b.unpaidTotal - a.unpaidTotal || b.overpaidTotal - a.overpaidTotal || fullName(a).localeCompare(fullName(b), 'sr'),
            )
    }, [balances, onlyOpen, search])

    const totals = useMemo(() => {
        let unpaid = 0
        let overpaid = 0
        let paid = 0
        let debtors = 0
        for (const b of balances) {
            unpaid += b.unpaidTotal
            overpaid += b.overpaidTotal
            paid += b.paidTotal
            if (b.unpaidTotal > 0) debtors += 1
        }
        return { unpaid, overpaid, paid, debtors }
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

    async function setDay(b: Balance, r: DebtRow, paid: boolean) {
        if (!paid) {
            const ok = await confirm({
                title: 'Vratiti dan na neplaćeno?',
                message: `${fullName(b)}, ${formatDateLong(fromISODate(r.date))}: evidentirana uplata od ${rsd(r.paid)} se briše i iznos ${rsd(r.total)} se ponovo vodi kao dug.`,
                confirmText: 'Vrati na neplaćeno',
                danger: true,
            })
            if (!ok) return
        } else if (r.status === 'delimicno') {
            const ok = await confirm({
                title: 'Označiti kao plaćeno u celosti?',
                message: `Plaćeno je ${rsd(r.paid)}, dan košta ${rsd(r.total)}. Potvrdom evidentiraš da je korisnik doplatio ${rsd(r.remaining)}.`,
                confirmText: `Evidentiraj ${rsd(r.remaining)}`,
            })
            if (!ok) return
        } else if (r.status === 'preplaceno') {
            const ok = await confirm({
                title: 'Izravnati preplatu?',
                message: `Plaćeno je ${rsd(r.paid)}, a dan sada košta ${rsd(r.total)}. Potvrdom se uplata za taj dan upisuje kao ${rsd(r.total)} – razliku od ${rsd(-r.remaining)} vrati korisniku ili je prebij ručno.`,
                confirmText: 'Izravnaj',
            })
            if (!ok) return
        }
        const key = `${b.userId}|${r.date}`
        setBusy(key)
        setError('')
        try {
            if (await post({ userId: b.userId, date: r.date, paid })) await load()
        } finally {
            setBusy(null)
        }
    }

    async function payAll(b: Balance) {
        const ok = await confirm({
            title: 'Označiti sve kao plaćeno?',
            message: `${fullName(b)}: ${b.unpaidCount} ${b.unpaidCount === 1 ? 'dan' : 'dana'}, ukupno ${rsd(b.unpaidTotal)}. Korisnik dobija obaveštenje o uplati.`,
            confirmText: `Evidentiraj ${rsd(b.unpaidTotal)}`,
        })
        if (!ok) return
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
        const ok = await confirm({
            title: 'Poslati podsetnik dužnicima?',
            message: `Obaveštenje sa iznosom duga dobija ${totals.debtors} ${totals.debtors === 1 ? 'korisnik' : 'korisnika'}.`,
            confirmText: 'Pošalji',
        })
        if (!ok) return
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
        <Box sx={{ opacity: refreshing ? 0.6 : 1, transition: 'opacity 150ms' }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', sm: totals.overpaid > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)' },
                    gap: 1.5,
                    mb: 2.5,
                }}
            >
                <StatTile label="Ukupno neplaćeno" value={rsd(totals.unpaid)} icon={<PaymentsIcon fontSize="small" />} highlight />
                <StatTile label="Dužnika" value={String(totals.debtors)} icon={<NotificationsActiveIcon fontSize="small" />} />
                <StatTile label="Ukupno naplaćeno" value={rsd(totals.paid)} icon={<CheckCircleIcon fontSize="small" />} />
                {totals.overpaid > 0 && (
                    <StatTile label="Preplate (vratiti)" value={rsd(totals.overpaid)} icon={<SavingsOutlinedIcon fontSize="small" />} />
                )}
            </Box>

            <Alert severity="info" sx={{ mb: 2.5 }}>
                Cena svakog dana je zamrznuta u trenutku naručivanja. Uplata se upisuje sa tačnim iznosom – ako korisnik posle uplate
                promeni porudžbinu, dan postaje <b>delimično</b> plaćen ili <b>preplaćen</b> i ti i on dobijate obaveštenje.
            </Alert>

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
                        control={<Switch checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />}
                        label="Samo otvoreni računi"
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
                        {onlyOpen ? 'Niko ne duguje' : 'Nema porudžbina'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {onlyOpen ? 'Svi računi su izmireni. Kuvarica je srećna.' : 'Još niko nije naručio.'}
                    </Typography>
                </Card>
            ) : (
                <Stack spacing={1.25}>
                    {filtered.map((b) => {
                        const open = expanded === b.userId
                        const owes = b.unpaidTotal > 0
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
                                                bgcolor: owes ? t.vars.palette.primary.main : t.vars.palette.action.selected,
                                                color: owes ? t.vars.palette.primary.contrastText : t.vars.palette.text.secondary,
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
                                                {b.overpaidTotal > 0 && ` · preplata ${rsd(b.overpaidTotal)}`}
                                            </Typography>
                                        </Box>
                                        <Stack sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
                                            <Typography sx={{ fontWeight: 700, color: owes ? 'primary.main' : 'success.main' }}>
                                                {owes ? rsd(b.unpaidTotal) : 'izmireno'}
                                            </Typography>
                                            {b.unpaidCount > 0 && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {b.unpaidCount} neplać.
                                                </Typography>
                                            )}
                                        </Stack>
                                        {owes && (
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
                                                const settled = r.status === 'placeno' || r.status === 'nista'
                                                const partial = r.status === 'delimicno' || r.status === 'preplaceno'
                                                const st = STATUS_LABEL[r.status]
                                                return (
                                                    <Stack
                                                        key={r.date}
                                                        direction="row"
                                                        spacing={1.5}
                                                        useFlexGap
                                                        sx={(t) => ({
                                                            alignItems: 'center',
                                                            flexWrap: 'wrap',
                                                            px: 1,
                                                            py: 0.5,
                                                            borderRadius: 2,
                                                            opacity: settled ? 0.65 : 1,
                                                            '&:hover': { bgcolor: t.vars.palette.action.hover },
                                                        })}
                                                    >
                                                        <Tooltip
                                                            title={
                                                                settled
                                                                    ? 'Vrati na neplaćeno'
                                                                    : partial
                                                                      ? 'Delimično plaćeno – izaberi akciju desno'
                                                                      : 'Označi kao plaćeno'
                                                            }
                                                        >
                                                            <span>
                                                                <Checkbox
                                                                    checked={settled}
                                                                    indeterminate={partial}
                                                                    disabled={busy === key || partial}
                                                                    onChange={(e) => setDay(b, r, e.target.checked)}
                                                                    icon={<RadioButtonUncheckedIcon />}
                                                                    checkedIcon={<CheckCircleIcon />}
                                                                    indeterminateIcon={<IndeterminateCheckBoxOutlinedIcon />}
                                                                    sx={{
                                                                        p: 0.5,
                                                                        color: 'text.disabled',
                                                                        '&.Mui-checked': { color: 'success.main' },
                                                                        '&.MuiCheckbox-indeterminate, &.Mui-disabled.MuiCheckbox-indeterminate':
                                                                            {
                                                                                color: 'warning.main',
                                                                            },
                                                                    }}
                                                                    slotProps={{ input: { 'aria-label': `Plaćeno ${r.date}` } }}
                                                                />
                                                            </span>
                                                        </Tooltip>
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ minWidth: 96, textDecoration: settled ? 'line-through' : 'none' }}
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
                                                            {r.mealCount === 0 && ' · porudžbina obrisana'}
                                                            {partial && ` · plaćeno ${rsd(r.paid)}`}
                                                            {r.status === 'delimicno' && ` · ostaje ${rsd(r.remaining)}`}
                                                            {r.status === 'preplaceno' && ` · višak ${rsd(-r.remaining)}`}
                                                        </Typography>
                                                        <Chip size="small" color={st.color} variant="outlined" label={st.label} />
                                                        {partial && (
                                                            <Stack direction="row" spacing={0.5}>
                                                                <Button
                                                                    size="small"
                                                                    variant="outlined"
                                                                    color="success"
                                                                    disabled={busy === key}
                                                                    onClick={() => setDay(b, r, true)}
                                                                    sx={{ py: 0, minHeight: 26 }}
                                                                >
                                                                    Izravnaj na {rsd(r.total)}
                                                                </Button>
                                                                <Button
                                                                    size="small"
                                                                    variant="text"
                                                                    color="inherit"
                                                                    disabled={busy === key}
                                                                    onClick={() => setDay(b, r, false)}
                                                                    sx={{ py: 0, minHeight: 26, color: 'text.secondary' }}
                                                                >
                                                                    Vrati na neplaćeno
                                                                </Button>
                                                            </Stack>
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
