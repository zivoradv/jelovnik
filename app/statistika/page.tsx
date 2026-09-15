'use client'

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { Alert, Box, Card, CardContent, Chip, Divider, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { VIRTUOZ_MEALS } from '@/lib/badges'
import { fullName } from '@/lib/users'
import { useAuth } from '../auth-context'

interface LeaderboardRow {
    userId: number
    username: string
    firstName: string
    lastName: string
    portions: number
    days: number
    distinctMeals: number
}

interface MonthlyStats {
    leaderboard: LeaderboardRow[]
    topMeal: { name: string; portions: number } | null
    virtuoz: { userId: number; username: string; firstName: string; lastName: string; distinctMeals: number } | null
    totalPortions: number
    totalUsers: number
}

const MEDALS = ['🥇', '🥈', '🥉']
const TITLES = ['Najgladniji', 'Zamenik Najgladnijeg', 'Bronzana viljuška']
const MONTHS = ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar']

function currentMonth(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(ym: string, delta: number): string {
    const [y, m] = ym.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(ym: string): string {
    const [y, m] = ym.split('-').map(Number)
    return `${MONTHS[m - 1]} ${y}.`
}

export default function StatistikaPage() {
    const { user } = useAuth()
    const [month, setMonth] = useState(currentMonth())
    const [stats, setStats] = useState<MonthlyStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = useCallback(async (m: string) => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/stats/month?month=${m}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Greška pri učitavanju.')
            setStats(data.stats ?? null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Greška pri učitavanju.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load(month)
    }, [month, load])

    const board = stats?.leaderboard ?? []
    const max = board[0]?.portions ?? 0
    const isCurrent = month === currentMonth()

    return (
        <Stack spacing={{ xs: 2.5, sm: 3 }}>
            <Box>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                    Statistika
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Ko je najviše jeo, šta se najviše jelo i ko je virtuoz meseca.
                </Typography>
            </Box>

            <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Tooltip title="Prethodni mesec">
                        <IconButton onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Prethodni mesec" size="small">
                            <ChevronLeftIcon />
                        </IconButton>
                    </Tooltip>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                        {monthLabel(month)}
                    </Typography>
                    <Tooltip title="Sledeći mesec">
                        <span>
                            <IconButton
                                onClick={() => setMonth((m) => shiftMonth(m, 1))}
                                aria-label="Sledeći mesec"
                                size="small"
                                disabled={isCurrent}
                            >
                                <ChevronRightIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
            </Card>

            {error && <Alert severity="error">{error}</Alert>}

            {loading ? (
                <Stack spacing={1.5}>
                    <Skeleton variant="rounded" height={96} />
                    <Skeleton variant="rounded" height={260} />
                </Stack>
            ) : board.length === 0 ? (
                <Card sx={{ py: 6, px: 3, textAlign: 'center' }}>
                    <EmojiEventsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="h6" sx={{ mb: 0.5 }}>
                        Nema podataka za ovaj mesec
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Niko ništa nije naručio. Sumnjivo mirno.
                    </Typography>
                </Card>
            ) : (
                <>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                        <Highlight
                            label="Najgladniji gospodin"
                            value={fullName(board[0])}
                            detail={`${board[0].portions} porcija`}
                            emoji="🏆"
                            mine={board[0].userId === user?.id}
                        />
                        <Highlight
                            label="Jelo meseca"
                            value={stats?.topMeal?.name ?? '—'}
                            detail={stats?.topMeal ? `${stats.topMeal.portions} porcija` : 'nema'}
                            emoji="🍲"
                        />
                        <Highlight
                            label="Virtuoz"
                            value={stats?.virtuoz ? fullName(stats.virtuoz) : '—'}
                            detail={
                                stats?.virtuoz
                                    ? `${stats.virtuoz.distinctMeals} različitih jela`
                                    : `probaj ${VIRTUOZ_MEALS} različitih jela`
                            }
                            emoji="🎨"
                            mine={stats?.virtuoz?.userId === user?.id}
                        />
                    </Box>

                    <Card>
                        <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                            <Stack direction="row" sx={{ mb: 1.5, alignItems: 'baseline', justifyContent: 'space-between' }}>
                                <Typography variant="h6">Tabela</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {stats?.totalPortions ?? 0} porcija · {stats?.totalUsers ?? 0}{' '}
                                    {stats?.totalUsers === 1 ? 'korisnik' : 'korisnika'}
                                </Typography>
                            </Stack>
                            <Stack spacing={1} divider={<Divider />}>
                                {board.map((row, i) => {
                                    const mine = row.userId === user?.id
                                    return (
                                        <Stack
                                            key={row.userId}
                                            direction="row"
                                            spacing={1.5}
                                            sx={(t) => ({
                                                alignItems: 'center',
                                                py: 0.5,
                                                mx: -1,
                                                px: 1,
                                                borderRadius: 2,
                                                bgcolor: mine ? t.vars.palette.action.selected : 'transparent',
                                            })}
                                        >
                                            <Typography sx={{ width: 32, textAlign: 'center', fontSize: i < 3 ? 22 : 14, fontWeight: 700 }}>
                                                {MEDALS[i] ?? i + 1}
                                            </Typography>
                                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    useFlexGap
                                                    sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                                                >
                                                    <Typography sx={{ fontWeight: 600 }} noWrap>
                                                        {fullName(row)}
                                                        {mine && (
                                                            <Typography component="span" variant="caption" color="text.secondary">
                                                                {' '}
                                                                (ti)
                                                            </Typography>
                                                        )}
                                                    </Typography>
                                                    {i < 3 && <Chip size="small" variant="outlined" color="primary" label={TITLES[i]} />}
                                                </Stack>
                                                <Box
                                                    sx={(t) => ({
                                                        mt: 0.75,
                                                        height: 6,
                                                        borderRadius: 999,
                                                        bgcolor: t.vars.palette.action.hover,
                                                        overflow: 'hidden',
                                                    })}
                                                >
                                                    <Box
                                                        sx={{
                                                            height: '100%',
                                                            width: `${max ? (row.portions / max) * 100 : 0}%`,
                                                            bgcolor: 'primary.main',
                                                            borderRadius: 999,
                                                        }}
                                                    />
                                                </Box>
                                            </Box>
                                            <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                                <Typography sx={{ fontWeight: 700 }}>{row.portions}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {row.days} {row.days === 1 ? 'dan' : 'dana'} · {row.distinctMeals}{' '}
                                                    {row.distinctMeals === 1 ? 'jelo' : 'jela'}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    )
                                })}
                            </Stack>
                        </CardContent>
                    </Card>
                </>
            )}
        </Stack>
    )
}

function Highlight({
    label,
    value,
    detail,
    emoji,
    mine,
}: {
    label: string
    value: ReactNode
    detail: string
    emoji: string
    mine?: boolean
}) {
    return (
        <Card sx={{ px: 2, py: 1.75, borderColor: mine ? 'primary.main' : undefined }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontSize: 32, lineHeight: 1 }}>{emoji}</Typography>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                        {label}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap>
                        {value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {detail}
                    </Typography>
                </Box>
            </Stack>
        </Card>
    )
}
