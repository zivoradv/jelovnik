'use client'

import AddIcon from '@mui/icons-material/Add'
import BakeryDiningIcon from '@mui/icons-material/BakeryDining'
import CheckIcon from '@mui/icons-material/Check'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditNoteIcon from '@mui/icons-material/EditNote'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import RemoveIcon from '@mui/icons-material/Remove'
import SoupKitchenIcon from '@mui/icons-material/SoupKitchen'
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Skeleton,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { type Badge, computeBadges, type UserStats } from '@/lib/badges'
import { WEEKDAYS } from '@/lib/constants'
import { addDays, formatDateLong, fromISODate, startOfWeek, toISODate, workdaysOfWeek } from '@/lib/date'
import { customTextReaction, EMPTY_MENU_MESSAGES, greeting, LOADING_MESSAGES, quantityReaction, randomOf, SAVE_MESSAGES } from '@/lib/fun'
import { useAuth } from './auth-context'
import { useFun } from './fun-context'

interface Meal {
    id: number
    name: string
    description: string | null
    note: string | null
    price: string
    day: number | null
    category: 'kuvano' | 'suvo'
    isPosno: boolean
}

interface OrderRow {
    id: number
    mealId: number | null
    customText: string | null
    note: string | null
    quantity: number
}

function todayMidnight(): Date {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

function rsd(n: number) {
    return `${n.toLocaleString('sr-RS')} RSD`
}

export default function HomePage() {
    const { user, loading: authLoading } = useAuth()
    const { confetti } = useFun()

    const initialDate = useMemo(() => {
        const t = todayMidnight()
        const dow = t.getDay()
        if (dow === 0) return addDays(t, 1)
        if (dow === 6) return addDays(t, 2)
        return t
    }, [])

    const [weekAnchor, setWeekAnchor] = useState<Date>(initialDate)
    const [selectedDate, setSelectedDate] = useState<string>(toISODate(initialDate))

    const [menu, setMenu] = useState<Meal[]>([])
    const [counts, setCounts] = useState<Record<number, number>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [savedMessage, setSavedMessage] = useState<string | null>(null)
    const [badges, setBadges] = useState<Badge[]>([])

    const [quantities, setQuantities] = useState<Record<number, number>>({})
    const [notes, setNotes] = useState<Record<number, string>>({})
    const [customItems, setCustomItems] = useState<string[]>([])

    const weekDays = useMemo(() => workdaysOfWeek(weekAnchor), [weekAnchor])
    const selDateObj = fromISODate(selectedDate)
    const isPast = selDateObj < todayMidnight()

    const loadDay = useCallback(async (dateStr: string) => {
        setLoading(true)
        setError('')
        try {
            const dow = fromISODate(dateStr).getDay()
            const [menuRes, ordersRes] = await Promise.all([fetch(`/api/meals?day=${dow}`), fetch(`/api/orders?date=${dateStr}`)])
            const menuData = await menuRes.json()
            const ordersData = await ordersRes.json()

            setMenu(menuData.meals || [])

            const countMap: Record<number, number> = {}
            for (const c of (ordersData.counts || []) as { mealId: number; count: number }[]) {
                countMap[c.mealId] = c.count
            }
            setCounts(countMap)

            const mine: OrderRow[] = ordersData.mine || []
            const qty: Record<number, number> = {}
            const noteMap: Record<number, string> = {}
            const customs: string[] = []
            for (const o of mine) {
                if (o.mealId !== null) {
                    qty[o.mealId] = o.quantity ?? 1
                    if (o.note) noteMap[o.mealId] = o.note
                } else if (o.customText) {
                    customs.push(o.customText)
                }
            }
            setQuantities(qty)
            setNotes(noteMap)
            setCustomItems(customs)
        } catch {
            setError('Greška pri učitavanju menija.')
        } finally {
            setLoading(false)
        }
    }, [])

    const loadBadges = useCallback(async () => {
        try {
            const res = await fetch('/api/stats/me')
            const data = await res.json()
            if (data.stats) setBadges(computeBadges(data.stats as UserStats))
        } catch {}
    }, [])

    useEffect(() => {
        if (user) loadDay(selectedDate)
    }, [user, selectedDate, loadDay])

    useEffect(() => {
        if (user) loadBadges()
    }, [user, loadBadges])

    function toggleMeal(id: number) {
        setQuantities((prev) => {
            const next = { ...prev }
            if ((next[id] ?? 0) > 0) delete next[id]
            else next[id] = 1
            return next
        })
    }

    function setQty(id: number, q: number) {
        setQuantities((prev) => {
            const next = { ...prev }
            if (q <= 0) delete next[id]
            else next[id] = Math.min(99, q)
            return next
        })
    }

    function pickDay(d: Date) {
        setSelectedDate(toISODate(d))
    }

    function shiftWeek(deltaWeeks: number) {
        const newAnchor = addDays(startOfWeek(weekAnchor), deltaWeeks * 7)
        setWeekAnchor(newAnchor)
        const dow = fromISODate(selectedDate).getDay()
        const targetDow = dow >= 1 && dow <= 5 ? dow - 1 : 0
        const days = workdaysOfWeek(newAnchor)
        setSelectedDate(toISODate(days[targetDow]))
    }

    function goToday() {
        setWeekAnchor(initialDate)
        setSelectedDate(toISODate(initialDate))
    }

    async function save() {
        setSaving(true)
        setError('')
        try {
            const items = [
                ...Object.entries(quantities).map(([mealId, qty]) => ({
                    mealId: Number(mealId),
                    quantity: qty,
                    note: notes[Number(mealId)] || null,
                })),
                ...customItems
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((customText) => ({ customText })),
            ]
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: selectedDate, items }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Greška pri čuvanju.')
            setSavedMessage(randomOf(SAVE_MESSAGES))
            if (items.length > 0) confetti('burst')
            await Promise.all([loadDay(selectedDate), loadBadges()])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Greška pri čuvanju.')
        } finally {
            setSaving(false)
        }
    }

    const kuvana = menu.filter((m) => m.category === 'kuvano')
    const suva = menu.filter((m) => m.category === 'suvo')

    const receiptItems = useMemo(
        () =>
            menu
                .filter((m) => (quantities[m.id] ?? 0) > 0)
                .map((m) => ({
                    id: m.id,
                    name: m.name,
                    qty: quantities[m.id],
                    price: Number(m.price) || 0,
                })),
        [menu, quantities],
    )
    const receiptCustoms = useMemo(() => customItems.map((c) => c.trim()).filter(Boolean), [customItems])

    const totalPrice = useMemo(() => receiptItems.reduce((sum, it) => sum + it.price * it.qty, 0), [receiptItems])
    const portionCount = useMemo(
        () => receiptItems.reduce((a, it) => a + it.qty, 0) + receiptCustoms.length,
        [receiptItems, receiptCustoms],
    )

    if (authLoading || !user) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress />
            </Box>
        )
    }

    const todayIso = toISODate(todayMidnight())
    const onStartingDay = selectedDate === toISODate(initialDate)
    const selectedDayName = WEEKDAYS.find((w) => w.value === selDateObj.getDay())?.label ?? ''
    const hello = greeting(user.username)
    const earned = badges.filter((b) => b.earned)

    return (
        <Stack spacing={{ xs: 2.5, sm: 3.5 }}>
            <Box>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                    {hello.title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    {hello.tagline}
                </Typography>
                {earned.length > 0 && (
                    <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 1.5, flexWrap: 'wrap' }}>
                        {earned.map((b) => (
                            <Tooltip key={b.id} title={b.description}>
                                <Chip size="small" variant="outlined" label={`${b.emoji} ${b.title}`} />
                            </Tooltip>
                        ))}
                    </Stack>
                )}
            </Box>

            <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Stack direction="row" sx={{ mb: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
                    <Tooltip title="Prethodna nedelja">
                        <IconButton onClick={() => shiftWeek(-1)} aria-label="Prethodna nedelja" size="small">
                            <ChevronLeftIcon />
                        </IconButton>
                    </Tooltip>

                    <Stack spacing={0.25} sx={{ alignItems: 'center' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {formatDateLong(weekDays[0])} - {formatDateLong(weekDays[4])}
                        </Typography>
                        {!onStartingDay && (
                            <Button size="small" onClick={goToday} sx={{ py: 0, minHeight: 0 }}>
                                Nazad na danas
                            </Button>
                        )}
                    </Stack>

                    <Tooltip title="Sledeća nedelja">
                        <IconButton onClick={() => shiftWeek(1)} aria-label="Sledeća nedelja" size="small">
                            <ChevronRightIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: { xs: 0.75, sm: 1 },
                    }}
                >
                    {weekDays.map((d, i) => {
                        const iso = toISODate(d)
                        const isToday = iso === todayIso
                        const selected = iso === selectedDate
                        const past = d < todayMidnight()
                        return (
                            <ButtonBase
                                key={iso}
                                onClick={() => pickDay(d)}
                                sx={(t) => ({
                                    flexDirection: 'column',
                                    gap: 0.25,
                                    py: { xs: 1, sm: 1.25 },
                                    borderRadius: '14px',
                                    border: '1.5px solid',
                                    borderColor: selected ? 'primary.main' : t.vars.palette.divider,
                                    bgcolor: selected ? 'primary.main' : 'transparent',
                                    color: selected ? 'primary.contrastText' : 'text.primary',
                                    opacity: past && !selected ? 0.45 : 1,
                                    transition: t.transitions.create(['background-color', 'border-color', 'color', 'transform'], {
                                        duration: 160,
                                    }),
                                    '&:hover': {
                                        bgcolor: selected ? 'primary.dark' : t.vars.palette.action.hover,
                                        borderColor: selected ? 'primary.dark' : 'primary.light',
                                    },
                                })}
                            >
                                <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.04em' }}>
                                    {WEEKDAYS[i].short.toUpperCase()}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: selected ? 700 : 500, lineHeight: 1.2 }}>
                                    {String(d.getDate()).padStart(2, '0')}.{String(d.getMonth() + 1).padStart(2, '0')}.
                                </Typography>
                                <Box
                                    sx={{
                                        width: 5,
                                        height: 5,
                                        mt: 0.25,
                                        borderRadius: '50%',
                                        bgcolor: isToday ? (selected ? 'primary.contrastText' : 'secondary.main') : 'transparent',
                                    }}
                                />
                            </ButtonBase>
                        )
                    })}
                </Box>
            </Card>

            {error && <Alert severity="error">{error}</Alert>}

            {isPast ? (
                <Alert severity="info">Ovaj dan je prošao - porudžbina se više ne može menjati.</Alert>
            ) : (
                <Alert severity="warning">Obavezno naručivanje obroka dan ranije!</Alert>
            )}

            {loading ? (
                <MenuSkeleton />
            ) : menu.length === 0 ? (
                <EmptyMenu dayName={selectedDayName} />
            ) : (
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                    <Stack spacing={{ xs: 2.5, sm: 3.5 }} sx={{ flexGrow: 1, minWidth: 0 }}>
                        {kuvana.length > 0 && (
                            <Section title="Kuvana jela" count={kuvana.length} icon={<SoupKitchenIcon fontSize="small" />}>
                                {kuvana.map((m) => (
                                    <MealItem
                                        key={m.id}
                                        meal={m}
                                        qty={quantities[m.id] || 0}
                                        count={counts[m.id] || 0}
                                        note={notes[m.id] || ''}
                                        disabled={isPast}
                                        onToggle={() => toggleMeal(m.id)}
                                        onQty={(q) => setQty(m.id, q)}
                                        onNote={(v) => setNotes((n) => ({ ...n, [m.id]: v }))}
                                    />
                                ))}
                            </Section>
                        )}

                        {suva.length > 0 && (
                            <Section title="Suvi obrok" count={suva.length} icon={<BakeryDiningIcon fontSize="small" />}>
                                {suva.map((m) => (
                                    <MealItem
                                        key={m.id}
                                        meal={m}
                                        qty={quantities[m.id] || 0}
                                        count={counts[m.id] || 0}
                                        note={notes[m.id] || ''}
                                        disabled={isPast}
                                        onToggle={() => toggleMeal(m.id)}
                                        onQty={(q) => setQty(m.id, q)}
                                        onNote={(v) => setNotes((n) => ({ ...n, [m.id]: v }))}
                                    />
                                ))}
                            </Section>
                        )}

                        <Section title="Nešto drugo?" icon={<EditNoteIcon fontSize="small" />}>
                            <Card sx={{ p: 2 }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                                    Ako ti ništa ne odgovara, upiši šta želiš.
                                </Typography>
                                <Stack spacing={1.25}>
                                    {customItems.map((val, idx) => (
                                        <Stack direction="row" spacing={1} key={idx} sx={{ alignItems: 'flex-start' }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                placeholder="npr. Grčka salata bez luka"
                                                value={val}
                                                disabled={isPast}
                                                helperText={customTextReaction(val)}
                                                onChange={(e) =>
                                                    setCustomItems((items) => items.map((v, i) => (i === idx ? e.target.value : v)))
                                                }
                                            />
                                            <IconButton
                                                aria-label="Ukloni"
                                                disabled={isPast}
                                                onClick={() => setCustomItems((items) => items.filter((_, i) => i !== idx))}
                                                sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                                            >
                                                <DeleteOutlinedIcon />
                                            </IconButton>
                                        </Stack>
                                    ))}
                                    {!isPast && (
                                        <Button
                                            startIcon={<AddIcon />}
                                            onClick={() => setCustomItems((items) => [...items, ''])}
                                            sx={{ alignSelf: 'flex-start' }}
                                            variant="outlined"
                                            size="small"
                                        >
                                            Dodaj svoju stavku
                                        </Button>
                                    )}
                                </Stack>
                            </Card>
                        </Section>
                    </Stack>

                    {!isPast && (
                        <Box
                            sx={{
                                width: 310,
                                flexShrink: 0,
                                display: { xs: 'none', md: 'block' },
                                position: 'sticky',
                                top: 90,
                            }}
                        >
                            <ReceiptCard
                                items={receiptItems}
                                customs={receiptCustoms}
                                total={totalPrice}
                                portionCount={portionCount}
                                saving={saving}
                                onSave={save}
                            />
                        </Box>
                    )}
                </Box>
            )}

            {!isPast && menu.length > 0 && !loading && (
                <Box
                    sx={{
                        position: 'sticky',
                        bottom: 12,
                        zIndex: 2,
                        display: { xs: 'block', md: 'none' },
                    }}
                >
                    <Card
                        sx={(t) => ({
                            boxShadow: t.shadows[8],
                            borderRadius: 999,
                            px: 2,
                            py: 1.25,
                            backdropFilter: 'blur(12px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                            backgroundColor: 'rgba(255, 255, 255, 0.86)',
                            ...t.applyStyles('dark', {
                                backgroundColor: 'rgba(30, 24, 21, 0.88)',
                            }),
                        })}
                    >
                        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {portionCount} porcija
                                </Typography>
                                <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{totalPrice > 0 ? rsd(totalPrice) : '-'}</Typography>
                            </Box>
                            <Button variant="contained" onClick={save} disabled={saving} startIcon={saving ? undefined : <CheckIcon />}>
                                {saving ? 'Čuvanje...' : 'Sačuvaj'}
                            </Button>
                        </Stack>
                    </Card>
                </Box>
            )}

            <Snackbar
                open={savedMessage !== null}
                autoHideDuration={3000}
                onClose={() => setSavedMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="success" variant="filled" onClose={() => setSavedMessage(null)}>
                    {savedMessage}
                </Alert>
            </Snackbar>
        </Stack>
    )
}

function Section({ title, count, icon, children }: { title: string; count?: number; icon?: ReactNode; children: ReactNode }) {
    return (
        <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', color: 'primary.main' }}>{icon}</Box>
                <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1 }}>
                    {title}
                </Typography>
                {count !== undefined && <Chip label={count} size="small" variant="outlined" sx={{ height: 20 }} />}
                <Divider sx={{ flexGrow: 1, ml: 1 }} />
            </Stack>
            <Stack spacing={1.5}>{children}</Stack>
        </Box>
    )
}

function MenuSkeleton() {
    const message = useMemo(() => randomOf(LOADING_MESSAGES), [])
    return (
        <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {message}
            </Typography>
            {[0, 1, 2].map((i) => (
                <Skeleton key={i} variant="rounded" height={92} />
            ))}
        </Stack>
    )
}

function EmptyMenu({ dayName }: { dayName: string }) {
    const message = useMemo(() => randomOf(EMPTY_MENU_MESSAGES), [])
    return (
        <Card sx={{ py: 6, px: 3, textAlign: 'center' }}>
            <SoupKitchenIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="h6" sx={{ mb: 0.5 }}>
                Meni za {dayName ? dayName.toLowerCase() : 'ovaj dan'} još nije unet
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {message}
            </Typography>
        </Card>
    )
}

function ReceiptCard({
    items,
    customs,
    total,
    portionCount,
    saving,
    onSave,
}: {
    items: { id: number; name: string; qty: number; price: number }[]
    customs: string[]
    total: number
    portionCount: number
    saving: boolean
    onSave: () => void
}) {
    const empty = items.length === 0 && customs.length === 0
    return (
        <Card sx={(t) => ({ boxShadow: t.shadows[4] })}>
            <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
                    <ReceiptLongIcon color="primary" fontSize="small" />
                    <Typography variant="h6">Tvoja porudžbina</Typography>
                </Stack>

                <Divider sx={{ mb: 1.75, borderStyle: 'dashed' }} />

                {empty ? (
                    <Box sx={{ py: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Još ništa nije izabrano.
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={1}>
                        {items.map((it) => (
                            <Stack key={it.id} direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
                                <Typography variant="body2">
                                    {it.name}
                                    {it.qty > 1 && (
                                        <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                            {' '}
                                            x{it.qty}
                                        </Typography>
                                    )}
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                                    {rsd(it.price * it.qty)}
                                </Typography>
                            </Stack>
                        ))}
                        {customs.map((c, i) => (
                            <Stack key={`${i}-${c}`} direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
                                <Typography variant="body2" color="text.secondary">
                                    {c}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    -
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                )}

                <Divider sx={{ my: 1.75, borderStyle: 'dashed' }} />

                <Stack direction="row" sx={{ mb: 0.75, justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                        Porcija
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {portionCount}
                    </Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography sx={{ fontWeight: 700 }}>Ukupno</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {rsd(total)}
                    </Typography>
                </Stack>

                <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    sx={{ mt: 2.5 }}
                    onClick={onSave}
                    disabled={saving}
                    startIcon={saving ? undefined : <CheckIcon />}
                >
                    {saving ? 'Čuvanje...' : 'Sačuvaj porudžbinu'}
                </Button>
            </CardContent>
        </Card>
    )
}

function MealItem({
    meal,
    qty,
    count,
    note,
    disabled,
    onToggle,
    onQty,
    onNote,
}: {
    meal: Meal
    qty: number
    count: number
    note: string
    disabled: boolean
    onToggle: () => void
    onQty: (q: number) => void
    onNote: (v: string) => void
}) {
    const checked = qty > 0
    const price = Number(meal.price) || 0
    const reaction = quantityReaction(qty)

    return (
        <Card
            sx={(t) => ({
                position: 'relative',
                overflow: 'hidden',
                borderColor: checked ? 'primary.main' : t.vars.palette.divider,
                boxShadow: checked ? t.shadows[3] : 'none',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    bgcolor: 'primary.main',
                    opacity: checked ? 1 : 0,
                    transition: t.transitions.create('opacity', { duration: 180 }),
                },
                '&:hover': disabled
                    ? undefined
                    : {
                          borderColor: checked ? 'primary.main' : 'primary.light',
                          boxShadow: t.shadows[2],
                      },
            })}
        >
            <ButtonBase
                onClick={disabled ? undefined : onToggle}
                disabled={disabled}
                component="div"
                sx={{
                    width: '100%',
                    textAlign: 'left',
                    display: 'block',
                    cursor: disabled ? 'default' : 'pointer',
                    p: 2,
                    pl: 2.25,
                }}
            >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                    <Box
                        aria-hidden
                        sx={(t) => ({
                            mt: 0.25,
                            width: 24,
                            height: 24,
                            flexShrink: 0,
                            borderRadius: '50%',
                            border: '2px solid',
                            borderColor: checked ? 'primary.main' : t.vars.palette.grey[400],
                            bgcolor: checked ? 'primary.main' : 'transparent',
                            color: 'primary.contrastText',
                            display: 'grid',
                            placeItems: 'center',
                            transition: t.transitions.create(['background-color', 'border-color'], {
                                duration: 160,
                            }),
                        })}
                    >
                        {checked && <CheckIcon sx={{ fontSize: 16 }} />}
                    </Box>

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                            <Typography sx={{ fontWeight: 600, lineHeight: 1.35 }}>{meal.name}</Typography>
                            {price > 0 && (
                                <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap', color: 'primary.main' }}>{rsd(price)}</Typography>
                            )}
                        </Stack>

                        {meal.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                {meal.description}
                            </Typography>
                        )}

                        <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            {meal.isPosno && <Chip label="posno" size="small" color="success" variant="outlined" />}
                            {count > 0 && (
                                <Chip
                                    icon={<PeopleAltIcon />}
                                    label={count}
                                    size="small"
                                    variant="outlined"
                                    sx={{ color: 'text.secondary' }}
                                />
                            )}
                        </Stack>

                        {meal.note && (
                            <Typography
                                variant="caption"
                                sx={(t) => ({
                                    display: 'block',
                                    mt: 1,
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1.5,
                                    color: 'secondary.dark',
                                    bgcolor: t.vars.palette.action.hover,
                                    ...t.applyStyles('dark', { color: t.vars.palette.secondary.light }),
                                })}
                            >
                                {meal.note}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            </ButtonBase>

            {checked && (
                <Box sx={{ px: 2, pb: 2, pl: 2.25 }}>
                    <Divider sx={{ mb: 1.75 }} />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                Količina
                            </Typography>
                            <Stack
                                direction="row"
                                sx={(t) => ({
                                    alignItems: 'center',
                                    border: '1.5px solid',
                                    borderColor: t.vars.palette.divider,
                                    borderRadius: 999,
                                })}
                            >
                                <IconButton size="small" aria-label="Smanji" disabled={disabled} onClick={() => onQty(qty - 1)}>
                                    <RemoveIcon fontSize="small" />
                                </IconButton>
                                <Typography sx={{ minWidth: 26, textAlign: 'center', fontWeight: 700 }}>{qty}</Typography>
                                <IconButton size="small" aria-label="Povećaj" disabled={disabled} onClick={() => onQty(qty + 1)}>
                                    <AddIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                        </Stack>

                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Dodatak / napomena (npr. bez luka)"
                            value={note}
                            disabled={disabled}
                            onChange={(e) => onNote(e.target.value)}
                        />
                    </Stack>
                    {reaction && (
                        <Typography variant="caption" color="secondary.dark" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                            {reaction}
                        </Typography>
                    )}
                </Box>
            )}
        </Card>
    )
}
