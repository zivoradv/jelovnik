'use client'

import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { Alert, Box, Card, CardContent, Chip, Divider, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { type Badge, computeBadges, type UserStats } from '@/lib/badges'
import { formatDateLong, fromISODate } from '@/lib/date'
import { debtRoast } from '@/lib/fun'
import { rsd } from '@/lib/pricing'

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

export default function DugPage() {
    const [rows, setRows] = useState<DebtRow[]>([])
    const [unpaidTotal, setUnpaidTotal] = useState(0)
    const [paidTotal, setPaidTotal] = useState(0)
    const [unpaidCount, setUnpaidCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [badges, setBadges] = useState<Badge[]>([])

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const [paymentsRes, statsRes] = await Promise.all([fetch('/api/payments'), fetch('/api/stats/me')])
            const [payments, stats] = await Promise.all([paymentsRes.json(), statsRes.json()])
            setRows(payments.rows || [])
            setUnpaidTotal(payments.unpaidTotal || 0)
            setPaidTotal(payments.paidTotal || 0)
            setUnpaidCount(payments.unpaidCount || 0)
            if (stats.stats) setBadges(computeBadges(stats.stats as UserStats))
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
                        bgcolor: unpaidTotal > 0 ? 'primary.main' : 'success.main',
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
                                color: unpaidTotal > 0 ? 'primary.main' : 'success.main',
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
                        <Card
                            key={r.date}
                            sx={(t) => ({
                                opacity: r.paid ? 0.72 : 1,
                                bgcolor: r.paid ? t.vars.palette.action.hover : undefined,
                            })}
                        >
                            <CardContent sx={{ '&:last-child': { pb: 2 }, py: 1.75 }}>
                                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                        <Typography
                                            sx={{
                                                fontWeight: 600,
                                                textDecoration: r.paid ? 'line-through' : 'none',
                                                textDecorationColor: 'rgba(130,116,102,0.5)',
                                            }}
                                        >
                                            {formatDateLong(fromISODate(r.date))}
                                        </Typography>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            useFlexGap
                                            sx={{ mt: 0.5, alignItems: 'center', flexWrap: 'wrap' }}
                                        >
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: r.paid ? 'text.secondary' : 'primary.main',
                                                }}
                                            >
                                                {rsd(r.total)}
                                            </Typography>
                                            {r.subsidy > 0 && (
                                                <Tooltip title={`Puna cena ${rsd(r.full)}, firma pokriva ${rsd(r.subsidy)}`}>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                        sx={{ textDecoration: 'line-through' }}
                                                    >
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
                                            {r.customCount > 0 && (
                                                <Chip size="small" color="warning" variant="outlined" label={`${r.customCount} bez cene`} />
                                            )}
                                        </Stack>
                                    </Box>

                                    {r.paid ? (
                                        <Tooltip title={r.paidAt ? `Evidentirano ${formatDateLong(new Date(r.paidAt))}` : 'Plaćeno'}>
                                            <Chip
                                                icon={<CheckCircleIcon />}
                                                label="Plaćeno"
                                                size="small"
                                                color="success"
                                                variant="outlined"
                                            />
                                        </Tooltip>
                                    ) : (
                                        <Chip
                                            icon={<ScheduleIcon />}
                                            label="Nije plaćeno"
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            )}

            {badges.length > 0 && <BadgesCard badges={badges} />}

            {rows.some((r) => r.customCount > 0) && (
                <Alert severity="info">
                    Sopstvene porudžbine nemaju cenu u meniju, pa nisu uračunate u iznos. Njih dogovorite zasebno.
                </Alert>
            )}
        </Stack>
    )
}

function BadgesCard({ badges }: { badges: Badge[] }) {
    const earned = badges.filter((b) => b.earned).length
    return (
        <Card>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
                    <Typography variant="h6">Tvoje zasluge</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {earned} / {badges.length}
                    </Typography>
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                    {badges.map((b) => (
                        <Stack
                            key={b.id}
                            direction="row"
                            spacing={1.5}
                            sx={(t) => ({
                                p: 1.5,
                                borderRadius: 2.5,
                                border: '1.5px solid',
                                borderColor: b.earned ? 'primary.light' : t.vars.palette.divider,
                                opacity: b.earned ? 1 : 0.5,
                                filter: b.earned ? 'none' : 'grayscale(1)',
                                alignItems: 'center',
                            })}
                        >
                            <Typography sx={{ fontSize: 28, lineHeight: 1 }}>{b.emoji}</Typography>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 600, lineHeight: 1.3 }}>{b.title}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {b.description}
                                </Typography>
                            </Box>
                        </Stack>
                    ))}
                </Box>
            </CardContent>
        </Card>
    )
}
