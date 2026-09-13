'use client'

import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { Box, Card, CardContent, Chip, Divider, Skeleton, Stack, TextField, Typography } from '@mui/material'
import { type ReactNode, useCallback, useEffect, useState } from 'react'

interface LeaderboardRow {
    userId: number
    username: string
    portions: number
    days: number
    customCount: number
}

interface MonthlyStats {
    leaderboard: LeaderboardRow[]
    topMeal: { name: string; portions: number } | null
    improviser: { username: string; count: number } | null
}

const MEDALS = ['🥇', '🥈', '🥉']
const TITLES = ['Najgladniji', 'Zamenik Najgladnijeg', 'Bronzana viljuška']

function currentMonth(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function StatsAdmin() {
    const [month, setMonth] = useState(currentMonth())
    const [stats, setStats] = useState<MonthlyStats | null>(null)
    const [loading, setLoading] = useState(true)

    const load = useCallback(async (m: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/stats?month=${m}`)
            const data = await res.json()
            setStats(data.stats ?? null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load(month)
    }, [month, load])

    const board = stats?.leaderboard ?? []
    const max = board[0]?.portions ?? 0

    return (
        <Box>
            <Card sx={{ p: { xs: 2, sm: 2.5 }, mb: 2.5 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
                    <TextField
                        label="Mesec"
                        type="month"
                        value={month}
                        onChange={(e) => e.target.value && setMonth(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ minWidth: 190 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                        Ko je najviše jeo, šta se najviše jelo i ko najviše improvizuje.
                    </Typography>
                </Stack>
            </Card>

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
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 2.5 }}>
                        <Highlight
                            label="Najgladniji gospodin"
                            value={board[0].username}
                            detail={`${board[0].portions} porcija`}
                            emoji="🏆"
                        />
                        <Highlight
                            label="Jelo meseca"
                            value={stats?.topMeal?.name ?? '—'}
                            detail={stats?.topMeal ? `${stats.topMeal.portions} porcija` : 'nema'}
                            emoji="🍲"
                        />
                        <Highlight
                            label="Virtuoz"
                            value={stats?.improviser?.username ?? '—'}
                            detail={stats?.improviser ? `${stats.improviser.count} sopstvenih` : 'svi jedu iz menija'}
                            emoji="🎨"
                        />
                    </Box>

                    <Card>
                        <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                            <Typography variant="h6" sx={{ mb: 1.5 }}>
                                Tabela
                            </Typography>
                            <Stack spacing={1} divider={<Divider />}>
                                {board.map((row, i) => (
                                    <Stack key={row.userId} direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 0.5 }}>
                                        <Typography sx={{ width: 32, textAlign: 'center', fontSize: i < 3 ? 22 : 14, fontWeight: 700 }}>
                                            {MEDALS[i] ?? i + 1}
                                        </Typography>
                                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                                <Typography sx={{ fontWeight: 600 }} noWrap>
                                                    {row.username}
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
                                                {row.days} {row.days === 1 ? 'dan' : 'dana'}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </>
            )}
        </Box>
    )
}

function Highlight({ label, value, detail, emoji }: { label: string; value: ReactNode; detail: string; emoji: string }) {
    return (
        <Card sx={{ px: 2, py: 1.75 }}>
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
