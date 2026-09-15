'use client'

import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { Alert, Box, Card, CardContent, Chip, Divider, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { formatDateLong, fromISODate } from '@/lib/date'
import { debtRoast } from '@/lib/fun'
import { rsd } from '@/lib/pricing'

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
    const [rows, setRows] = useState<DebtRow[]>([])
    const [unpaidTotal, setUnpaidTotal] = useState(0)
    const [overpaidTotal, setOverpaidTotal] = useState(0)
    const [paidTotal, setPaidTotal] = useState(0)
    const [unpaidCount, setUnpaidCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

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
        } catch {
            setError('Greška pri učitavanju.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    if (loading) {
        return (
            <Stack spacing={2}>
                <Skeleton variant="text" width={160} height={40} />
                <Skeleton variant="rounded" height={132} />
                {[0, 1, 2].map((i) => (
                    <Skeleton key={i} variant="rounded" height={76} />
                ))}
            </Stack>
        )
    }

    const subsidyTotal = rows.reduce((a, r) => a + r.subsidy, 0)
    const settled = unpaidTotal <= 0

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
                            {rsd(unpaidTotal)}
                        </Typography>
                        {unpaidCount > 0 && (
                            <Chip size="small" variant="outlined" label={`${unpaidCount} ${unpaidCount === 1 ? 'dan' : 'dana'}`} />
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
                        {overpaidTotal > 0 && (
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ pl: 3.5 }}>
                                    Preplata (tvoj kredit)
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
                                    {rsd(overpaidTotal)}
                                </Typography>
                            </Stack>
                        )}
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ pl: 3.5 }}>
                                Pokrila firma (ukupno)
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {rsd(subsidyTotal)}
                            </Typography>
                        </Stack>
                    </Stack>

                    <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic', color: 'text.secondary' }}>
                        {debtRoast(unpaidTotal, unpaidCount)}
                    </Typography>
                </CardContent>
            </Card>

            {overpaidTotal > 0 && (
                <Alert severity="info">
                    Za neki dan je plaćeno više nego što porudžbina sada košta (promenio si porudžbinu posle uplate). Razliku od{' '}
                    {rsd(overpaidTotal)} dogovori sa administratorom – vraća se ili prebija sa sledećim dugom.
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
