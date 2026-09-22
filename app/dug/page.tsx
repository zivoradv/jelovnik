'use client'

import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import SavingsOutlinedIcon from '@mui/icons-material/SavingsOutlined'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { Alert, Box, Card, CardContent, Chip, Divider, IconButton, Snackbar, Stack, Tooltip, Typography } from '@mui/material'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { formatAccountNumber, PAYMENT_RECIPIENT } from '@/lib/constants'
import { formatDateLong, fromISODate } from '@/lib/date'
import { debtRoast } from '@/lib/fun'
import { rsd } from '@/lib/pricing'
import { fullName } from '@/lib/users'
import { useAuth } from '../auth-context'
import PageLoader from '../components/PageLoader'

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

export default function DugPage() {
    const { user } = useAuth()
    const [rows, setRows] = useState<DebtRow[]>([])
    const [unpaidTotal, setUnpaidTotal] = useState(0)
    const [overpaidTotal, setOverpaidTotal] = useState(0)
    const [paidTotal, setPaidTotal] = useState(0)
    const [unpaidCount, setUnpaidCount] = useState(0)
    const [credit, setCredit] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [copied, setCopied] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const [paymentsRes, statsRes] = await Promise.all([fetch('/api/payments'), fetch('/api/stats/me')])
            const [payments] = await Promise.all([paymentsRes.json(), statsRes.json()])
            setRows(payments.rows || [])
            setUnpaidTotal(payments.unpaidTotal || 0)
            setOverpaidTotal(payments.overpaidTotal || 0)
            setPaidTotal(payments.paidTotal || 0)
            setUnpaidCount(payments.unpaidCount || 0)
            setCredit(payments.credit || 0)
        } catch {
            setError('Greška pri učitavanju.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    async function copy(label: string, value: string) {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(`${label} kopiran.`)
        } catch {
            setCopied('Kopiranje nije uspelo – prepiši ručno.')
        }
    }

    if (loading) {
        return <PageLoader />
    }

    const subsidyTotal = rows.reduce((a, r) => a + r.subsidy, 0)
    // pretplata već pokriva deo duga, pa se uplaćuje samo ono što pretekne
    const toPay = Math.max(0, unpaidTotal - credit)
    const settled = toPay <= 0
    const accountNumber = formatAccountNumber(PAYMENT_RECIPIENT.account)
    const purpose = user ? `Obroci – ${fullName(user)}` : 'Obroci'

    return (
        <Stack spacing={{ xs: 2.5, sm: 3 }}>
            <Box>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                    Moj dug
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Pregled porudžbina po danima. Uplate evidentira administrator – kada platiš, dan će biti označen kao plaćen.
                </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Card
                sx={(t) => ({
                    boxShadow: t.shadows[3],
                    overflow: 'hidden',
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 5,
                        bgcolor: settled ? 'success.main' : 'primary.main',
                    },
                })}
            >
                <CardContent sx={{ p: { xs: 2.5, sm: 3 }, pl: { xs: 3, sm: 3.5 } }}>
                    <Typography variant="overline" color="text.secondary">
                        Za plaćanje
                    </Typography>
                    <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <Typography
                            component="p"
                            sx={{
                                fontFamily: 'var(--font-sans)',
                                fontWeight: 700,
                                letterSpacing: '-0.02em',
                                color: settled ? 'success.main' : 'primary.main',
                                fontSize: 'clamp(2rem, 1.5rem + 2.4vw, 2.75rem)',
                                lineHeight: 1.1,
                            }}
                        >
                            {rsd(toPay)}
                        </Typography>
                        {unpaidCount > 0 && (
                            <Chip size="small" variant="outlined" label={`${unpaidCount} ${unpaidCount === 1 ? 'dan' : 'dana'}`} />
                        )}
                        {credit > 0 && unpaidTotal > 0 && (
                            <Typography variant="caption" color="text.secondary">
                                dug {rsd(unpaidTotal)} − pretplata {rsd(Math.min(credit, unpaidTotal))}
                            </Typography>
                        )}
                    </Stack>

                    <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

                    <Stack spacing={0.75}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
                                <Typography variant="body2" color="text.secondary">
                                    Već plaćeno
                                </Typography>
                            </Stack>
                            <Typography sx={{ fontWeight: 600, color: 'success.main' }}>{rsd(paidTotal)}</Typography>
                        </Stack>
                        {credit > 0 && (
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                    <SavingsOutlinedIcon fontSize="small" sx={{ color: 'info.main' }} />
                                    <Typography variant="body2" color="text.secondary">
                                        Pretplata (tvoj kredit)
                                    </Typography>
                                </Stack>
                                <Typography sx={{ fontWeight: 600, color: 'info.main' }}>{rsd(credit)}</Typography>
                            </Stack>
                        )}
                        {overpaidTotal > 0 && (
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ pl: 3.5 }}>
                                    Preplaćeni dani (ide u pretplatu)
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
                                    {rsd(overpaidTotal)}
                                </Typography>
                            </Stack>
                        )}
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <AccountBalanceOutlinedIcon fontSize="small" sx={{ color: 'info.main' }} />
                                <Typography variant="body2" color="text.secondary">
                                    Pokrila firma (ukupno)
                                </Typography>
                            </Stack>
                            <Typography sx={{ fontWeight: 600, color: 'info.main' }}>{rsd(subsidyTotal)}</Typography>
                        </Stack>
                    </Stack>

                    <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                        {debtRoast(toPay, toPay > 0 ? unpaidCount : 0)}
                    </Typography>
                </CardContent>
            </Card>

            <Card>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
                        <AccountBalanceOutlinedIcon color="primary" fontSize="small" />
                        <Typography variant="h6">Podaci za uplatu</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Sve uplate za obroke idu administratoru. Kad uplatiš, javi da evidentira uplatu – tek tada se dan vodi kao plaćen.
                    </Typography>

                    <Stack spacing={1.25}>
                        <PaymentField label="Prima" value={PAYMENT_RECIPIENT.name} />
                        <PaymentField label="Broj računa" value={accountNumber} mono onCopy={() => copy('Broj računa', accountNumber)} />
                        <PaymentField label="Svrha uplate" value={purpose} onCopy={() => copy('Svrha uplate', purpose)} />
                        {toPay > 0 && (
                            <PaymentField
                                label={credit > 0 ? 'Iznos (posle pretplate)' : 'Iznos'}
                                value={rsd(toPay)}
                                highlight
                                onCopy={() => copy('Iznos', String(toPay))}
                            />
                        )}
                    </Stack>
                </CardContent>
            </Card>

            {credit > 0 && (
                <Alert severity="info" icon={<SavingsOutlinedIcon fontSize="inherit" />}>
                    Imaš pretplatu od <b>{rsd(credit)}</b> – uplaćeno je više nego što je dug, pa taj novac sam plaća naredne obroke
                    (najstariji dug prvi). Ako ti treba nazad, javi administratoru.
                </Alert>
            )}

            {overpaidTotal > 0 && (
                <Alert severity="info">
                    Za neki dan je plaćeno više nego što porudžbina sada košta (promenio si porudžbinu posle uplate). Razlika od{' '}
                    {rsd(overpaidTotal)} prelazi u pretplatu čim administrator ili sledeća izmena porudžbine osveži stanje.
                </Alert>
            )}

            {rows.length === 0 ? (
                <Card sx={{ py: 6, px: 3, textAlign: 'center' }}>
                    <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="h6" sx={{ mb: 0.5 }}>
                        Još nema porudžbina
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Kada naručiš prvi obrok, račun će se pojaviti ovde.
                    </Typography>
                </Card>
            ) : (
                <Stack spacing={1.25}>
                    {rows.map((r) => (
                        <DebtRowCard key={r.date} row={r} />
                    ))}
                </Stack>
            )}

            <Snackbar
                open={!!copied}
                autoHideDuration={2000}
                onClose={() => setCopied('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="success" variant="filled" onClose={() => setCopied('')}>
                    {copied}
                </Alert>
            </Snackbar>
        </Stack>
    )
}

function PaymentField({
    label,
    value,
    mono,
    highlight,
    onCopy,
}: {
    label: string
    value: ReactNode
    mono?: boolean
    highlight?: boolean
    onCopy?: () => void
}) {
    return (
        <Stack
            direction="row"
            spacing={1.5}
            sx={(t) => ({
                alignItems: 'center',
                px: 1.5,
                py: 1,
                borderRadius: 2.5,
                border: '1.5px solid',
                borderColor: t.vars.palette.divider,
                bgcolor: t.vars.palette.action.hover,
            })}
        >
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                    {label}
                </Typography>
                <Typography
                    sx={{
                        fontWeight: 700,
                        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
                        letterSpacing: mono ? '0.04em' : undefined,
                        color: highlight ? 'primary.main' : 'text.primary',
                        overflowWrap: 'anywhere',
                    }}
                >
                    {value}
                </Typography>
            </Box>
            {onCopy && (
                <Tooltip title="Kopiraj">
                    <IconButton size="small" aria-label={`Kopiraj: ${label}`} onClick={onCopy}>
                        <ContentCopyIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
        </Stack>
    )
}

function DebtRowCard({ row: r }: { row: DebtRow }) {
    const done = r.status === 'placeno' || r.status === 'nista'
    return (
        <Card
            sx={(t) => ({
                opacity: done ? 0.72 : 1,
                bgcolor: done ? t.vars.palette.action.hover : undefined,
            })}
        >
            <CardContent sx={{ '&:last-child': { pb: 2 }, py: 1.75 }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                            sx={(t) => ({
                                fontWeight: 600,
                                textDecoration: done ? 'line-through' : 'none',
                                textDecorationColor: `rgba(${t.vars.palette.text.secondaryChannel} / 0.5)`,
                            })}
                        >
                            {formatDateLong(fromISODate(r.date))}
                        </Typography>
                        <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 700,
                                    color: done ? 'text.secondary' : 'primary.main',
                                }}
                            >
                                {rsd(r.total)}
                            </Typography>
                            {r.subsidy > 0 && (
                                <Tooltip title={`Puna cena ${rsd(r.full)}, firma pokriva ${rsd(r.subsidy)}`}>
                                    <Typography variant="caption" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                                        {rsd(r.full)}
                                    </Typography>
                                </Tooltip>
                            )}
                            {r.mealCount > 0 && (
                                <Chip
                                    size="small"
                                    label={`${r.mealCount} ${r.mealCount === 1 ? 'porcija' : 'porcije'}`}
                                    variant="outlined"
                                    sx={{ color: 'text.secondary' }}
                                />
                            )}
                            {r.status === 'delimicno' && (
                                <Typography variant="caption" color="text.secondary">
                                    plaćeno {rsd(r.paid)} · ostaje {rsd(r.remaining)}
                                </Typography>
                            )}
                            {r.status === 'preplaceno' && (
                                <Typography variant="caption" color="text.secondary">
                                    plaćeno {rsd(r.paid)} · preplata {rsd(-r.remaining)}
                                </Typography>
                            )}
                        </Stack>
                    </Box>

                    <StatusChip row={r} />
                </Stack>
            </CardContent>
        </Card>
    )
}

function StatusChip({ row: r }: { row: DebtRow }) {
    const paidAt = r.paidAt ? `Evidentirano ${formatDateLong(new Date(r.paidAt))}` : ''
    switch (r.status) {
        case 'placeno':
            return (
                <Tooltip title={paidAt || 'Plaćeno'}>
                    <Chip icon={<CheckCircleIcon />} label="Plaćeno" size="small" color="success" variant="outlined" />
                </Tooltip>
            )
        case 'nista':
            return <Chip label="Ništa za plaćanje" size="small" variant="outlined" />
        case 'delimicno':
            return (
                <Tooltip title={paidAt}>
                    <Chip icon={<ScheduleIcon />} label="Delimično" size="small" color="warning" variant="outlined" />
                </Tooltip>
            )
        case 'preplaceno':
            return (
                <Tooltip title={paidAt}>
                    <Chip icon={<CheckCircleIcon />} label="Preplaćeno" size="small" color="info" variant="outlined" />
                </Tooltip>
            )
        default:
            return <Chip icon={<ScheduleIcon />} label="Nije plaćeno" size="small" color="primary" variant="outlined" />
    }
}
