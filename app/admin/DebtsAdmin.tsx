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
    /** Neiskorišćena pretplata – novac koji čeka buduće obroke. */
    credit: number
    balance: number
}

interface CreditEntry {
    id: number
    amount: number
    reason: string
    date: string | null
    createdAt: string
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

    /** Dijalog „Evidentiraj uplatu” / „Isplati pretplatu” za jednog korisnika. */
    const [payFor, setPayFor] = useState<Balance | null>(null)
    const [payMode, setPayMode] = useState<'uplata' | 'isplata'>('uplata')
    const [payAmount, setPayAmount] = useState('')
    const [creditLog, setCreditLog] = useState<Record<number, CreditEntry[]>>({})

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
            .filter((b) => (onlyOpen ? b.unpaidTotal > 0 || b.overpaidTotal > 0 || b.credit > 0 : b.rows.length > 0 || b.credit > 0))
            .filter((b) => !q || fullName(b).toLowerCase().includes(q) || b.username.toLowerCase().includes(q))
            .sort(
                (a, b) =>
                    b.unpaidTotal - a.unpaidTotal ||
                    b.overpaidTotal - a.overpaidTotal ||
                    b.credit - a.credit ||
                    fullName(a).localeCompare(fullName(b), 'sr'),
            )
    }, [balances, onlyOpen, search])

    const totals = useMemo(() => {
        let unpaid = 0
        let overpaid = 0
        let paid = 0
        let credit = 0
        let debtors = 0
        for (const b of balances) {
            unpaid += b.unpaidTotal
            overpaid += b.overpaidTotal
            paid += b.paidTotal
            credit += b.credit
            if (b.unpaidTotal > 0) debtors += 1
        }
        return { unpaid, overpaid, paid, credit, debtors }
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

    const loadCreditLog = useCallback(async (userId: number) => {
        try {
            const res = await fetch(`/api/admin/payments?userId=${userId}`)
            const data = await res.json()
            setCreditLog((prev) => ({ ...prev, [userId]: data.log || [] }))
        } catch {}
    }, [])

    function toggleExpanded(b: Balance) {
        const open = expanded === b.userId
        setExpanded(open ? null : b.userId)
        if (!open && b.credit !== 0 && !creditLog[b.userId]) loadCreditLog(b.userId)
    }

    function openPayDialog(b: Balance, mode: 'uplata' | 'isplata') {
        setPayFor(b)
        setPayMode(mode)
        setPayAmount(String(mode === 'uplata' ? b.unpaidTotal || '' : b.credit))
    }

    /** Uplata proizvoljnog iznosa: pokriva najstarije dugove, ostatak ostaje kao pretplata. */
    async function submitPayment() {
        if (!payFor) return
        const amount = Number(payAmount)
        const b = payFor
        setBusy(`pay|${b.userId}`)
        setError('')
        try {
            const res = await fetch('/api/admin/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: b.userId, action: payMode === 'uplata' ? 'uplata' : 'pretplata-isplata', amount }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Greška pri čuvanju.')
            setPayFor(null)
            await load()
            await loadCreditLog(b.userId)
            setToast(
                payMode === 'uplata'
                    ? `${fullName(b)}: uplata ${rsd(amount)} evidentirana${data.left > 0 ? `, pretplata ${rsd(data.left)}` : ''}.`
                    : `${fullName(b)}: isplaćena pretplata ${rsd(amount)}.`,
            )
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Greška pri čuvanju.')
        } finally {
            setBusy(null)
        }
    }

    /**
     * Ručno prebijanje: preplaćeni dani se spuštaju na tačnu cenu, a višak zajedno sa
     * postojećom pretplatom pokriva otvorene dugove (inače se to dešava samo pri izmeni porudžbine).
     */
    async function applyCreditToDebt(b: Balance, ask = true) {
        if (ask) {
            const ok = await confirm({
                title: 'Iskoristiti pretplatu za dug?',
                message: `${fullName(b)}: pretplata ${rsd(b.credit)}, dug ${rsd(b.unpaidTotal)}. Pretplata se troši na najstarije dane.`,
                confirmText: 'Prebij',
            })
            if (!ok) return
        }
        setBusy(`credit|${b.userId}`)
        setError('')
        try {
            if (await post({ userId: b.userId, action: 'pretplata-primeni' })) {
                await load()
                await loadCreditLog(b.userId)
                setToast(`${fullName(b)}: stanje pretplate ažurirano.`)
            }
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
                    gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                    gap: 1.5,
                    mb: 2.5,
                }}
            >
                <StatTile label="Ukupno neplaćeno" value={rsd(totals.unpaid)} icon={<PaymentsIcon fontSize="small" />} highlight />
                <StatTile label="Dužnika" value={String(totals.debtors)} icon={<NotificationsActiveIcon fontSize="small" />} />
                <StatTile label="Ukupno naplaćeno" value={rsd(totals.paid)} icon={<CheckCircleIcon fontSize="small" />} />
                <StatTile label="Pretplata (kod tebe)" value={rsd(totals.credit)} icon={<SavingsOutlinedIcon fontSize="small" />} />
            </Box>

            <Alert severity="info" sx={{ mb: 2.5 }}>
                Cena svakog dana je zamrznuta u trenutku naručivanja. Kad neko plati <b>više nego što duguje</b>, višak ostaje kao{' '}
                <b>pretplata</b> i sam pokriva naredne obroke – najstariji dug prvi. Isto važi i kad korisnik smanji već plaćenu porudžbinu:
                razlika ide u pretplatu, a ne u „preplaćen” dan.
            </Alert>

            <Card sx={{ p: { xs: 2, sm: 2.5 }, mb: 2.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ alignItems: { md: 'center' } }}>
                    <TextField
                        size="small"
                        label="Pretraga"
                        placeholder="ime, prezime ili korisničko ime"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        sx={{ minWidth: { md: 240 } }}
                    />
                    <FormControlLabel
                        control={<Switch checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />}
                        label="Samo otvoreni računi"
                        sx={{ mr: 0 }}
                    />
                    <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
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
                                <CardContent sx={{ '&:last-child': { pb: 1.75 }, py: 1.75, px: { xs: 1.5, sm: 2 } }}>
                                    {/* ceo red otvara dane – na telefonu je strelica sitna meta */}
                                    <Stack
                                        direction="row"
                                        spacing={{ xs: 1, sm: 1.5 }}
                                        onClick={() => toggleExpanded(b)}
                                        sx={{ alignItems: 'center', cursor: 'pointer' }}
                                    >
                                        <Avatar
                                            sx={(t) => ({
                                                width: { xs: 36, sm: 40 },
                                                height: { xs: 36, sm: 40 },
                                                fontWeight: 700,
                                                fontSize: '0.85rem',
                                                bgcolor: owes ? t.vars.palette.primary.main : t.vars.palette.action.selected,
                                                color: owes ? t.vars.palette.primary.contrastText : t.vars.palette.text.secondary,
                                            })}
                                        >
                                            {initials(b)}
                                        </Avatar>
                                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                                                <Typography sx={{ fontWeight: 600 }} noWrap>
                                                    {fullName(b)}
                                                </Typography>
                                                {b.credit > 0 && (
                                                    <Chip
                                                        size="small"
                                                        color="info"
                                                        variant="outlined"
                                                        icon={<SavingsOutlinedIcon />}
                                                        label={`pretplata ${rsd(b.credit)}`}
                                                        sx={{ flexShrink: 0 }}
                                                    />
                                                )}
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                @{b.username} · {b.rows.length} {b.rows.length === 1 ? 'dan' : 'dana'}
                                                {b.paidTotal > 0 && ` · plaćeno ${rsd(b.paidTotal)}`}
                                                {b.overpaidTotal > 0 && ` · preplaćeni dani ${rsd(b.overpaidTotal)}`}
                                            </Typography>
                                        </Box>
                                        <Stack sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
                                            <Typography
                                                sx={{
                                                    fontWeight: 700,
                                                    whiteSpace: 'nowrap',
                                                    color: owes ? 'primary.main' : 'success.main',
                                                }}
                                            >
                                                {owes ? rsd(b.unpaidTotal) : 'izmireno'}
                                            </Typography>
                                            {b.unpaidCount > 0 && (
                                                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                                    {b.unpaidCount} neplać.
                                                </Typography>
                                            )}
                                        </Stack>
                                        <Tooltip title="Evidentiraj uplatu">
                                            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                                                <IconButton
                                                    aria-label="Evidentiraj uplatu"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        openPayDialog(b, 'uplata')
                                                    }}
                                                    disabled={busy === `pay|${b.userId}`}
                                                    color="primary"
                                                >
                                                    <PaymentsIcon />
                                                </IconButton>
                                            </Box>
                                        </Tooltip>
                                        {owes && (
                                            <Tooltip title="Označi sve kao plaćeno">
                                                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                                                    <IconButton
                                                        aria-label="Označi sve kao plaćeno"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            payAll(b)
                                                        }}
                                                        disabled={busy === `all|${b.userId}`}
                                                        sx={{ color: 'success.main' }}
                                                    >
                                                        <DoneAllIcon />
                                                    </IconButton>
                                                </Box>
                                            </Tooltip>
                                        )}
                                        <IconButton
                                            aria-label={open ? 'Sakrij dane' : 'Prikaži dane'}
                                            size="small"
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
                                                        spacing={1}
                                                        sx={(t) => ({
                                                            alignItems: 'flex-start',
                                                            px: { xs: 0.5, sm: 1 },
                                                            py: 0.75,
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
                                                                      ? 'Delimično plaćeno – izaberi akciju ispod'
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
                                                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                            <Stack
                                                                direction="row"
                                                                spacing={1}
                                                                useFlexGap
                                                                sx={{ alignItems: 'center', flexWrap: 'wrap', minHeight: 32 }}
                                                            >
                                                                <Typography
                                                                    variant="body2"
                                                                    sx={{ textDecoration: settled ? 'line-through' : 'none' }}
                                                                >
                                                                    {formatDateLong(fromISODate(r.date))}
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                                    {rsd(r.total)}
                                                                </Typography>
                                                                <Chip size="small" color={st.color} variant="outlined" label={st.label} />
                                                            </Stack>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                                puna {rsd(r.full)}
                                                                {r.subsidy > 0 && ` · firma ${rsd(r.subsidy)}`}
                                                                {r.mealCount > 0 && ` · ${r.mealCount} porc.`}
                                                                {r.mealCount === 0 && ' · porudžbina obrisana'}
                                                                {partial && ` · plaćeno ${rsd(r.paid)}`}
                                                                {r.status === 'delimicno' && ` · ostaje ${rsd(r.remaining)}`}
                                                                {r.status === 'preplaceno' && ` · višak ${rsd(-r.remaining)}`}
                                                            </Typography>
                                                            {partial && (
                                                                <Stack
                                                                    direction="row"
                                                                    spacing={0.5}
                                                                    useFlexGap
                                                                    sx={{ mt: 0.75, flexWrap: 'wrap' }}
                                                                >
                                                                    {r.status === 'preplaceno' ? (
                                                                        <Button
                                                                            size="small"
                                                                            variant="outlined"
                                                                            color="info"
                                                                            startIcon={<SavingsOutlinedIcon />}
                                                                            disabled={busy === `credit|${b.userId}`}
                                                                            onClick={() => applyCreditToDebt(b, false)}
                                                                            sx={{ py: 0, minHeight: 26 }}
                                                                        >
                                                                            Višak {rsd(-r.remaining)} u pretplatu
                                                                        </Button>
                                                                    ) : (
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
                                                                    )}
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
                                                        </Box>
                                                    </Stack>
                                                )
                                            })}
                                        </Stack>
                                        {b.credit > 0 && (
                                            <Box
                                                sx={(t) => ({
                                                    mt: 1.5,
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    border: '1.5px solid',
                                                    borderColor: t.vars.palette.info.light,
                                                    bgcolor: t.vars.palette.action.hover,
                                                })}
                                            >
                                                <Stack
                                                    direction={{ xs: 'column', sm: 'row' }}
                                                    spacing={1}
                                                    sx={{ alignItems: { sm: 'center' } }}
                                                >
                                                    <Box sx={{ flexGrow: 1 }}>
                                                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                                                            <SavingsOutlinedIcon fontSize="small" color="info" />
                                                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                                Pretplata: {rsd(b.credit)}
                                                            </Typography>
                                                        </Stack>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Sama pokriva naredne obroke. Možeš je odmah prebiti sa dugom ili isplatiti
                                                            korisniku.
                                                        </Typography>
                                                    </Box>
                                                    <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                                                        {owes && (
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                color="info"
                                                                disabled={busy === `credit|${b.userId}`}
                                                                onClick={() => applyCreditToDebt(b)}
                                                            >
                                                                Prebij sa dugom
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="inherit"
                                                            disabled={busy === `pay|${b.userId}`}
                                                            onClick={() => openPayDialog(b, 'isplata')}
                                                        >
                                                            Isplati
                                                        </Button>
                                                    </Stack>
                                                </Stack>
                                                {creditLog[b.userId] && creditLog[b.userId].length > 0 && (
                                                    <>
                                                        <Divider sx={{ my: 1 }} />
                                                        <Stack spacing={0.25}>
                                                            {creditLog[b.userId].slice(0, 8).map((e) => (
                                                                <Stack
                                                                    key={e.id}
                                                                    direction="row"
                                                                    spacing={1}
                                                                    sx={{ alignItems: 'baseline' }}
                                                                >
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{
                                                                            fontWeight: 700,
                                                                            minWidth: 88,
                                                                            color: e.amount > 0 ? 'success.main' : 'text.secondary',
                                                                        }}
                                                                    >
                                                                        {e.amount > 0 ? '+' : '−'}
                                                                        {rsd(Math.abs(e.amount))}
                                                                    </Typography>
                                                                    <Typography
                                                                        variant="caption"
                                                                        color="text.secondary"
                                                                        sx={{ flexGrow: 1, minWidth: 0 }}
                                                                    >
                                                                        {e.reason}
                                                                        {e.date && ` · ${formatDateLong(fromISODate(e.date))}`}
                                                                    </Typography>
                                                                </Stack>
                                                            ))}
                                                        </Stack>
                                                    </>
                                                )}
                                            </Box>
                                        )}
                                        <Button
                                            fullWidth
                                            variant="contained"
                                            startIcon={<PaymentsIcon />}
                                            onClick={() => openPayDialog(b, 'uplata')}
                                            disabled={busy === `pay|${b.userId}`}
                                            sx={{ mt: 1.5, display: { xs: 'inline-flex', sm: 'none' } }}
                                        >
                                            Evidentiraj uplatu
                                        </Button>
                                        {owes && (
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                color="success"
                                                startIcon={<DoneAllIcon />}
                                                onClick={() => payAll(b)}
                                                disabled={busy === `all|${b.userId}`}
                                                sx={{ mt: 1, display: { xs: 'inline-flex', sm: 'none' } }}
                                            >
                                                Označi sve kao plaćeno ({rsd(b.unpaidTotal)})
                                            </Button>
                                        )}
                                    </Collapse>
                                </CardContent>
                            </Card>
                        )
                    })}
                </Stack>
            )}

            <PayDialog
                balance={payFor}
                mode={payMode}
                amount={payAmount}
                busy={!!payFor && busy === `pay|${payFor.userId}`}
                onAmount={setPayAmount}
                onClose={() => setPayFor(null)}
                onSubmit={submitPayment}
            />

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

/**
 * Uplata proizvoljnog iznosa (i isplata pretplate). Odmah pokazuje kako će se novac rasporediti:
 * koliko pokriva dug, a koliko ostaje kao pretplata za naredne obroke.
 */
function PayDialog({
    balance,
    mode,
    amount,
    busy,
    onAmount,
    onClose,
    onSubmit,
}: {
    balance: Balance | null
    mode: 'uplata' | 'isplata'
    amount: string
    busy: boolean
    onAmount: (v: string) => void
    onClose: () => void
    onSubmit: () => void
}) {
    const b = balance
    const value = Math.max(0, Math.round(Number(amount) || 0))
    const isPayment = mode === 'uplata'
    const debt = b?.unpaidTotal ?? 0
    const credit = b?.credit ?? 0
    // uplata prvo ulazi u pretplatu, pa se odatle skida dug – zato i preplaćeni dani ulaze u račun
    const pool = isPayment ? value + credit + (b?.overpaidTotal ?? 0) : 0
    const covers = Math.min(pool, debt)
    const leftover = pool - covers
    const tooMuch = !isPayment && value > credit
    const invalid = value <= 0 || tooMuch

    return (
        <Dialog open={!!b} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>
                {isPayment ? 'Evidentiraj uplatu' : 'Isplati pretplatu'}
                {b && (
                    <Typography variant="body2" color="text.secondary">
                        {fullName(b)}
                    </Typography>
                )}
            </DialogTitle>
            <Divider />
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Iznos (RSD)"
                        type="number"
                        value={amount}
                        onChange={(e) => onAmount(e.target.value)}
                        autoFocus
                        fullWidth
                        error={tooMuch}
                        helperText={tooMuch ? `Pretplata je samo ${rsd(credit)}.` : undefined}
                        slotProps={{ htmlInput: { min: 1, step: 10, inputMode: 'numeric' } }}
                    />

                    {isPayment && (
                        <>
                            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                                {debt > 0 && <Chip label={`Ceo dug ${rsd(debt)}`} size="small" onClick={() => onAmount(String(debt))} />}
                                {[1000, 2000, 5000].map((v) => (
                                    <Chip key={v} label={rsd(v)} size="small" variant="outlined" onClick={() => onAmount(String(v))} />
                                ))}
                            </Stack>

                            <Box
                                sx={(t) => ({
                                    p: 1.5,
                                    borderRadius: 2,
                                    bgcolor: t.vars.palette.action.hover,
                                })}
                            >
                                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Pokriva dug
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                                        {rsd(covers)}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.5 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Ostaje kao pretplata
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: leftover > 0 ? 'info.main' : undefined }}>
                                        {rsd(leftover)}
                                    </Typography>
                                </Stack>
                                {debt > covers && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                                        Posle ove uplate ostaje dug {rsd(debt - covers)}.
                                    </Typography>
                                )}
                                {credit > 0 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                                        Uračunata je i ranija pretplata od {rsd(credit)}.
                                    </Typography>
                                )}
                            </Box>
                        </>
                    )}

                    {!isPayment && (
                        <Typography variant="body2" color="text.secondary">
                            Pretplata je {rsd(credit)}. Unesi koliko si stvarno vratio korisniku – za toliko se stanje umanjuje.
                        </Typography>
                    )}
                </Stack>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button onClick={onClose} color="inherit">
                    Otkaži
                </Button>
                <Button
                    variant="contained"
                    color={isPayment ? 'primary' : 'inherit'}
                    startIcon={isPayment ? <PaymentsIcon /> : <SavingsOutlinedIcon />}
                    onClick={onSubmit}
                    disabled={busy || invalid}
                >
                    {isPayment ? `Evidentiraj ${rsd(value)}` : `Isplati ${rsd(value)}`}
                </Button>
            </DialogActions>
        </Dialog>
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
