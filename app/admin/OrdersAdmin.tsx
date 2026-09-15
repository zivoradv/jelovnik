'use client'

import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'
import GroupIcon from '@mui/icons-material/Group'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    Skeleton,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { formatDateLong, fromISODate, toISODate } from '@/lib/date'
import { fullName } from '@/lib/users'

interface Row {
    orderId: number
    userId: number
    username: string
    firstName: string
    lastName: string
    mealId: number
    mealName: string | null
    category: string | null
    unitPrice: number
    note: string | null
    withSoup: boolean
    quantity: number
}

interface Person {
    username: string
    name: string
    note: string | null
    withSoup: boolean
    qty: number
}
interface Group {
    name: string
    portions: number
    soupPortions: number
    people: Person[]
}

function defaultDate(): string {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    const dow = d.getDay()
    if (dow === 0) d.setDate(d.getDate() + 1)
    if (dow === 6) d.setDate(d.getDate() + 2)
    return toISODate(d)
}

export default function OrdersAdmin() {
    const [date, setDate] = useState<string>(defaultDate())
    const [rows, setRows] = useState<Row[]>([])
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState('')

    const load = useCallback(async (d: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/admin/orders?date=${d}`)
            const data = await res.json()
            setRows(data.rows || [])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load(date)
    }, [date, load])

    const grouped: Group[] = useMemo(() => {
        const map = new Map<number, Group>()
        for (const r of rows) {
            let g = map.get(r.mealId)
            if (!g) {
                g = { name: r.mealName || '-', portions: 0, soupPortions: 0, people: [] }
                map.set(r.mealId, g)
            }
            g.portions += r.quantity
            if (r.withSoup) g.soupPortions += r.quantity
            g.people.push({ username: r.username, name: fullName(r), note: r.note, withSoup: r.withSoup, qty: r.quantity })
        }
        return Array.from(map.values()).sort((a, b) => b.portions - a.portions)
    }, [rows])

    const totalPortions = grouped.reduce((a, g) => a + g.portions, 0)
    const uniqueUsers = new Set(rows.map((r) => r.userId)).size
    const totalSoups = grouped.reduce((a, g) => a + g.soupPortions, 0)

    function soupSuffix(g: Group): string {
        return g.soupPortions > 0 ? ` (${g.soupPortions} sa čorbom)` : ''
    }

    function buildSummary(): string {
        const lines: string[] = []
        lines.push(`Porudžbine za ${formatDateLong(fromISODate(date))}`)
        lines.push('')
        for (const g of grouped) {
            lines.push(`${g.name} - ${g.portions}${soupSuffix(g)}`)
            for (const p of g.people) {
                const q = p.qty > 1 ? ` (x${p.qty})` : ''
                const s = p.withSoup ? ' + čorba' : ''
                const n = p.note ? ` - ${p.note}` : ''
                lines.push(`   - ${p.name}${q}${s}${n}`)
            }
        }
        lines.push('')
        lines.push(`Ukupno porcija: ${totalPortions} - Korisnika: ${uniqueUsers}${totalSoups > 0 ? ` - Čorbi uz suvo: ${totalSoups}` : ''}`)
        return lines.join('\n')
    }

    function buildDeliverySummary(): string {
        const lines: string[] = []
        lines.push(`Porudžbina za ${formatDateLong(fromISODate(date))}`)
        lines.push('')
        for (const g of grouped) {
            lines.push(`${g.name} - ${g.portions}${soupSuffix(g)}`)
        }
        lines.push('')
        lines.push(`Ukupno: ${totalPortions}${totalSoups > 0 ? ` (+ ${totalSoups} čorbi uz suvo)` : ''}`)
        return lines.join('\n')
    }

    async function copy(text: string, msg: string) {
        await navigator.clipboard.writeText(text)
        setToast(msg)
    }

    function downloadCsv() {
        const header = 'Jelo,Kolicina,Ime i prezime,Korisnicko ime,Napomena\n'
        const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`
        const body = rows
            .map((r) => {
                const jelo = r.mealName || '-'
                const nap = [r.withSoup ? 'čorba' : '', r.note || ''].filter(Boolean).join('; ')
                return [esc(jelo), r.quantity, esc(fullName(r)), esc(r.username), esc(nap)].join(',')
            })
            .join('\n')
        const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `porudzbine-${date}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <Box>
            <Card sx={{ p: { xs: 2, sm: 2.5 }, mb: 2.5 }}>
                <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
                >
                    <TextField
                        label="Datum"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ minWidth: 190 }}
                    />
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                        <Button
                            startIcon={<LocalShippingIcon />}
                            onClick={() => copy(buildDeliverySummary(), 'Rezime za dostavljača je kopiran.')}
                            disabled={rows.length === 0}
                            variant="contained"
                        >
                            Za dostavljača
                        </Button>
                        <Button
                            startIcon={<ContentCopyIcon />}
                            onClick={() => copy(buildSummary(), 'Detaljan rezime je kopiran.')}
                            disabled={rows.length === 0}
                            variant="outlined"
                        >
                            Detaljno
                        </Button>
                        <Button startIcon={<DownloadIcon />} onClick={downloadCsv} disabled={rows.length === 0} variant="outlined">
                            CSV
                        </Button>
                    </Stack>
                </Stack>
            </Card>

            {loading ? (
                <Stack spacing={1.5}>
                    <Skeleton variant="rounded" height={88} />
                    <Skeleton variant="rounded" height={150} />
                    <Skeleton variant="rounded" height={150} />
                </Stack>
            ) : rows.length === 0 ? (
                <Card sx={{ py: 6, px: 3, textAlign: 'center' }}>
                    <RestaurantIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="h6" sx={{ mb: 0.5 }}>
                        Nema porudžbina
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Za {formatDateLong(fromISODate(date))} niko još nije naručio.
                    </Typography>
                </Card>
            ) : (
                <>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                            gap: 1.5,
                            mb: 2.5,
                        }}
                    >
                        <StatTile label="Ukupno porcija" value={totalPortions} icon={<RestaurantIcon fontSize="small" />} />
                        <StatTile label="Korisnika" value={uniqueUsers} icon={<GroupIcon fontSize="small" />} />
                        <StatTile label="Različitih jela" value={grouped.length} icon={<MenuBookIcon fontSize="small" />} />
                    </Box>

                    <Box
                        sx={{
                            display: 'grid',
                            gap: 1.5,
                            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                            alignItems: 'start',
                        }}
                    >
                        {grouped.map((g) => {
                            const withNotes = g.people.filter((p) => p.note)
                            return (
                                <Card key={g.name}>
                                    <CardContent sx={{ '&:last-child': { pb: 2.25 } }}>
                                        <Stack
                                            direction="row"
                                            spacing={1.5}
                                            sx={{ mb: 1.25, justifyContent: 'space-between', alignItems: 'flex-start' }}
                                        >
                                            <Typography sx={{ fontWeight: 700 }}>{g.name}</Typography>
                                            <Chip
                                                label={`${g.portions} kom`}
                                                color="primary"
                                                size="small"
                                                sx={{ fontWeight: 700, flexShrink: 0 }}
                                            />
                                        </Stack>

                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                            {g.people.map((p) => {
                                                const label = `${p.name}${p.qty > 1 ? ` x${p.qty}` : ''}${p.withSoup ? ' + čorba' : ''}`
                                                return p.note ? (
                                                    <Tooltip key={p.username} title={p.note}>
                                                        <Chip
                                                            size="small"
                                                            label={label}
                                                            variant="outlined"
                                                            sx={{ borderStyle: 'dashed' }}
                                                        />
                                                    </Tooltip>
                                                ) : (
                                                    <Chip key={p.username} size="small" label={label} variant="outlined" />
                                                )
                                            })}
                                        </Box>

                                        {withNotes.length > 0 && (
                                            <Box sx={{ mt: 1.75 }}>
                                                <Divider sx={{ mb: 1 }} />
                                                <Stack spacing={0.4}>
                                                    {withNotes.map((p) => (
                                                        <Typography key={p.username} variant="caption" color="text.secondary">
                                                            <Box component="b" sx={{ color: 'text.primary' }}>
                                                                {p.name}:
                                                            </Box>{' '}
                                                            {p.note}
                                                        </Typography>
                                                    ))}
                                                </Stack>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </Box>
                </>
            )}

            <Snackbar
                open={!!toast}
                autoHideDuration={2000}
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

function StatTile({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
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
                    fontSize: '1.9rem',
                    lineHeight: 1.15,
                }}
            >
                {value.toLocaleString('sr-RS')}
            </Typography>
        </Card>
    )
}
