'use client'

import AddIcon from '@mui/icons-material/Add'
import BakeryDiningIcon from '@mui/icons-material/BakeryDining'
import CheckIcon from '@mui/icons-material/Check'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EditIcon from '@mui/icons-material/Edit'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import RamenDiningIcon from '@mui/icons-material/RamenDining'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import RefreshIcon from '@mui/icons-material/Refresh'
import RemoveIcon from '@mui/icons-material/Remove'
import SoupKitchenIcon from '@mui/icons-material/SoupKitchen'
import {
    Alert,
    Box,
    Button,
    ButtonBase,
    Card,
    CardContent,
    Checkbox,
    Chip,
    Divider,
    FormControlLabel,
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
import { addDays, formatDateLong, formatDateShort, fromISODate, startOfWeek, toISODate, workdaysOfWeek } from '@/lib/date'
import { deadlineLabel, firstOrderableWorkday, isOrderingOpen } from '@/lib/deadline'
import { EMPTY_MENU_MESSAGES, greeting, LOADING_MESSAGES, quantityReaction, randomOf, SAVE_MESSAGES } from '@/lib/fun'
import { computeDayCost, type DayCost, DEFAULT_PRICING, type PricingSettings, rsd, subsidyFor, unitPrice } from '@/lib/pricing'
import { useAuth } from './auth-context'
import PageLoader from './components/PageLoader'
import { useFun } from './fun-context'

interface Meal {
    id: number
    name: string
    description: string | null
    note: string | null
    price: string
    category: 'kuvano' | 'suvo'
    isPosno: boolean
}

interface OrderRow {
    id: number
    mealId: number
    note: string | null
    withSoup: boolean
    quantity: number
}

interface OrderItem {
    mealId: number
    quantity: number
    note: string | null
    withSoup: boolean
}

interface WeekOrderDay {
    date: string
    items: { mealId: number; name: string; quantity: number; withSoup: boolean; note: string | null }[]
    toPay: number
}

function todayMidnight(): Date {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

/** Stabilan otisak porudžbine – poredi se sačuvano sa trenutnim da bi dugme znalo da li ima izmena. */
function orderKey(items: OrderItem[]): string {
    return JSON.stringify(
        [...items].sort((a, b) => a.mealId - b.mealId).map((it) => [it.mealId, it.quantity, it.note ?? '', it.withSoup ? 1 : 0]),
    )
}

export default function HomePage() {
    const { user, loading: authLoading } = useAuth()
    const { confetti } = useFun()

    // podrazumevano: prvi radni dan za koji rok (dan ranije do 17h) još nije istekao
    const initialDate = useMemo(() => firstOrderableWorkday(), [])

    const [weekAnchor, setWeekAnchor] = useState<Date>(initialDate)
    const [selectedDate, setSelectedDate] = useState<string>(toISODate(initialDate))

    const [menu, setMenu] = useState<Meal[]>([])
    const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING)
    const [templateName, setTemplateName] = useState<string | null>(null)
    const [counts, setCounts] = useState<Record<number, number>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [savedMessage, setSavedMessage] = useState<string | null>(null)
    const [badges, setBadges] = useState<Badge[]>([])
    const [helloShift, setHelloShift] = useState(0)

    const [quantities, setQuantities] = useState<Record<number, number>>({})
    const [notes, setNotes] = useState<Record<number, string>>({})
    const [soups, setSoups] = useState<Record<number, boolean>>({})
    /** Otisak porudžbine kakva je u bazi za izabrani dan; null = ništa nije sačuvano. */
    const [savedKey, setSavedKey] = useState<string | null>(null)
    const [weekOrders, setWeekOrders] = useState<WeekOrderDay[]>([])

    const weekDays = useMemo(() => workdaysOfWeek(weekAnchor), [weekAnchor])
    const weekStart = toISODate(weekDays[0])
    const selDateObj = fromISODate(selectedDate)
    const isPast = !isOrderingOpen(selectedDate)

    const loadDay = useCallback(async (dateStr: string) => {
        setLoading(true)
        setError('')
        try {
            const [menuRes, ordersRes] = await Promise.all([fetch(`/api/menu?date=${dateStr}`), fetch(`/api/orders?date=${dateStr}`)])
            const menuData = await menuRes.json()
            const ordersData = await ordersRes.json()

            setMenu(menuData.meals || [])
            setPricing(menuData.pricing || DEFAULT_PRICING)
            setTemplateName(menuData.templateName ?? null)

            const countMap: Record<number, number> = {}
            for (const c of (ordersData.counts || []) as { mealId: number; count: number }[]) {
                countMap[c.mealId] = c.count
            }
            setCounts(countMap)

            const mine: OrderRow[] = ordersData.mine || []
            const qty: Record<number, number> = {}
            const noteMap: Record<number, string> = {}
            const soupMap: Record<number, boolean> = {}
            for (const o of mine) {
                qty[o.mealId] = o.quantity ?? 1
                if (o.note) noteMap[o.mealId] = o.note
                if (o.withSoup) soupMap[o.mealId] = true
            }
            setQuantities(qty)
            setNotes(noteMap)
            setSoups(soupMap)
            setSavedKey(
                mine.length > 0
                    ? orderKey(
                          mine.map((o) => ({
                              mealId: o.mealId,
                              quantity: o.quantity ?? 1,
                              note: o.note || null,
                              withSoup: Boolean(o.withSoup),
                          })),
                      )
                    : null,
            )
        } catch {
            setError('Greška pri učitavanju menija.')
        } finally {
            setLoading(false)
        }
    }, [])

    const loadWeek = useCallback(async (anyDayIso: string) => {
        try {
            const res = await fetch(`/api/orders/week?date=${anyDayIso}`)
            const data = await res.json()
            setWeekOrders(data.days || [])
        } catch {}
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
        if (user) loadWeek(weekStart)
    }, [user, weekStart, loadWeek])

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

    // ono što bi otišlo na server – isto normalizovano kao što server vraća, da bi poređenje sa sačuvanim bilo pošteno
    const items = useMemo<OrderItem[]>(
        () =>
            Object.entries(quantities).map(([mealId, qty]) => ({
                mealId: Number(mealId),
                quantity: qty,
                note: (notes[Number(mealId)] || '').trim() || null,
                withSoup: Boolean(soups[Number(mealId)]),
            })),
        [quantities, notes, soups],
    )
    const hasSaved = savedKey !== null
    const dirty = orderKey(items) !== (savedKey ?? orderKey([]))

    async function save() {
        setSaving(true)
        setError('')
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: selectedDate, items }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Greška pri čuvanju.')
            setSavedMessage(randomOf(SAVE_MESSAGES))
            if (items.length > 0) confetti('burst')
            await Promise.all([loadDay(selectedDate), loadWeek(weekStart), loadBadges()])
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
                .map((m) => {
                    const withSoup = m.category === 'suvo' && Boolean(soups[m.id])
                    return {
                        id: m.id,
                        name: m.name,
                        qty: quantities[m.id],
                        withSoup,
                        price: unitPrice({ price: Number(m.price) || 0, withSoup }, pricing),
                    }
                }),
        [menu, quantities, soups, pricing],
    )

    const cost = useMemo(
        () =>
            computeDayCost(
                receiptItems.map((it) => ({ price: it.price, quantity: it.qty, withSoup: false })),
                pricing,
            ),
        [receiptItems, pricing],
    )
    const portionCount = useMemo(() => receiptItems.reduce((a, it) => a + it.qty, 0), [receiptItems])

    if (authLoading || !user) {
        return <PageLoader />
    }

    const todayIso = toISODate(todayMidnight())
    const onStartingDay = selectedDate === toISODate(initialDate)
    const selectedDayName = WEEKDAYS.find((w) => w.value === selDateObj.getDay())?.label ?? ''
    const hello = greeting(user.firstName || user.username, new Date(), helloShift)
    const earned = badges.filter((b) => b.earned)
    const orderedDates = new Set(weekOrders.filter((d) => d.items.length > 0).map((d) => d.date))

    return (
        <Stack spacing={{ xs: 2.5, sm: 3.5 }}>
            <Box>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="h4">{hello.title}</Typography>
                    <Tooltip title="Promešaj pozdrav">
                        <IconButton
                            size="small"
                            aria-label="Promešaj pozdrav"
                            onClick={() => setHelloShift((s) => s + 1)}
                            sx={{ opacity: 0.2, transition: 'opacity 150ms', '&:hover, &:focus-visible': { opacity: 1 } }}
                        >
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Stack>
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

            <WeekSummary days={weekOrders} selectedDate={selectedDate} onPick={setSelectedDate} />

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
                                Na prvi otvoren dan
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
                        const past = !isOrderingOpen(iso)
                        const ordered = orderedDates.has(iso)
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
                                <Stack direction="row" spacing={0.5} sx={{ mt: 0.25, height: 12, alignItems: 'center' }}>
                                    {isToday && (
                                        <Box
                                            sx={{
                                                width: 5,
                                                height: 5,
                                                borderRadius: '50%',
                                                bgcolor: selected ? 'primary.contrastText' : 'secondary.main',
                                            }}
                                        />
                                    )}
                                    {ordered && (
                                        <CheckCircleIcon
                                            titleAccess="Poručeno"
                                            sx={{ fontSize: 12, color: selected ? 'primary.contrastText' : 'success.main' }}
                                        />
                                    )}
                                </Stack>
                            </ButtonBase>
                        )
                    })}
                </Box>
            </Card>

            {error && <Alert severity="error">{error}</Alert>}

            {isPast ? (
                <Alert severity="info">
                    Rok za {selectedDayName.toLowerCase()} je istekao ({deadlineLabel(selectedDate)}) – porudžbina se više ne može menjati.
                </Alert>
            ) : (
                <Alert severity="warning">
                    Naručuje se najkasnije dan ranije do 17:00. Rok za {selectedDayName.toLowerCase()}: {deadlineLabel(selectedDate)}.
                </Alert>
            )}

            {loading ? (
                <MenuSkeleton />
            ) : menu.length === 0 ? (
                <EmptyMenu dayName={selectedDayName} />
            ) : (
                <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                    <Stack spacing={{ xs: 2.5, sm: 3.5 }} sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Section
                            title="Kuvana jela"
                            count={kuvana.length}
                            icon={<SoupKitchenIcon fontSize="small" />}
                            hint={kuvana.length > 0 ? 'Uz svako kuvano jelo dobija se čorba' : undefined}
                        >
                            {kuvana.length === 0 ? (
                                <Alert severity="info" variant="outlined" icon={<SoupKitchenIcon fontSize="inherit" />}>
                                    {templateName
                                        ? `Za ${selectedDayName.toLowerCase()} u šemi „${templateName}” nema kuvanih jela.`
                                        : 'Raspored kuvanih jela za ovu nedelju još nije objavljen. Dobićeš obaveštenje čim admin postavi šemu.'}
                                </Alert>
                            ) : (
                                kuvana.map((m) => (
                                    <MealItem
                                        key={m.id}
                                        meal={m}
                                        qty={quantities[m.id] || 0}
                                        count={counts[m.id] || 0}
                                        note={notes[m.id] || ''}
                                        withSoup={false}
                                        pricing={pricing}
                                        disabled={isPast}
                                        onToggle={() => toggleMeal(m.id)}
                                        onQty={(q) => setQty(m.id, q)}
                                        onNote={(v) => setNotes((n) => ({ ...n, [m.id]: v }))}
                                        onSoup={() => {}}
                                    />
                                ))
                            )}
                        </Section>

                        {suva.length > 0 && (
                            <Section
                                title="Suvi obrok"
                                count={suva.length}
                                icon={<BakeryDiningIcon fontSize="small" />}
                                hint={`Uz suvi obrok možeš da dodaš čorbu za ${rsd(pricing.soupPrice)}.`}
                            >
                                {suva.map((m) => (
                                    <MealItem
                                        key={m.id}
                                        meal={m}
                                        qty={quantities[m.id] || 0}
                                        count={counts[m.id] || 0}
                                        note=""
                                        withSoup={Boolean(soups[m.id])}
                                        pricing={pricing}
                                        disabled={isPast}
                                        onToggle={() => toggleMeal(m.id)}
                                        onQty={(q) => setQty(m.id, q)}
                                        onNote={() => {}}
                                        onSoup={(v) => setSoups((s) => ({ ...s, [m.id]: v }))}
                                    />
                                ))}
                            </Section>
                        )}
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
                                cost={cost}
                                portionCount={portionCount}
                                saving={saving}
                                hasSaved={hasSaved}
                                dirty={dirty}
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
                            backgroundColor: `rgba(${t.vars.palette.background.paperChannel} / 0.88)`,
                        })}
                    >
                        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {portionCount} porcija
                                    {hasSaved && !dirty && ' · poručeno'}
                                    {hasSaved && dirty && ' · izmenjeno'}
                                </Typography>
                                <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{cost.toPay > 0 ? rsd(cost.toPay) : '-'}</Typography>
                            </Box>
                            <SaveButton saving={saving} hasSaved={hasSaved} dirty={dirty} onSave={save} compact />
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

function Section({
    title,
    count,
    icon,
    hint,
    children,
}: {
    title: string
    count?: number
    icon?: ReactNode
    hint?: string
    children: ReactNode
}) {
    return (
        <Box>
            <Stack direction="row" spacing={1} sx={{ mb: hint ? 0.5 : 1.5, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', color: 'primary.main' }}>{icon}</Box>
                <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1 }}>
                    {title}
                </Typography>
                {count !== undefined && count > 0 && <Chip label={count} size="small" variant="outlined" sx={{ height: 20 }} />}
                <Divider sx={{ flexGrow: 1, ml: 1 }} />
            </Stack>
            {hint && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontStyle: 'italic' }}>
                    {hint}
                </Typography>
            )}
            <Stack spacing={1.5}>{children}</Stack>
        </Box>
    )
}

/** „Poručeno ove nedelje” – na jedan pogled šta je uzeto koji dan, bez otvaranja svakog dana posebno. */
function WeekSummary({ days, selectedDate, onPick }: { days: WeekOrderDay[]; selectedDate: string; onPick: (iso: string) => void }) {
    const ordered = days.filter((d) => d.items.length > 0)
    return (
        <Card sx={{ p: 1 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5, px: 0.5, my: 1 }}>
                <ReceiptLongIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1 }}>
                    Poručeno ove nedelje
                </Typography>
            </Stack>
            {ordered.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 0.5, fontStyle: 'italic' }}>
                    Ove nedelje još ništa nije poručeno.
                </Typography>
            ) : (
                <Stack spacing={0.25}>
                    {ordered.map((d) => {
                        const date = fromISODate(d.date)
                        const selected = d.date === selectedDate
                        const label = d.items
                            .map((it) => `${it.name}${it.withSoup ? ' + čorba' : ''}${it.quantity > 1 ? ` ×${it.quantity}` : ''}`)
                            .join(', ')
                        const notes = d.items
                            .filter((it) => it.note)
                            .map((it) => `${it.name}: ${it.note}`)
                            .join(' · ')
                        return (
                            <ButtonBase
                                key={d.date}
                                onClick={() => onPick(d.date)}
                                title={notes || undefined}
                                sx={(t) => ({
                                    width: '100%',
                                    justifyContent: 'flex-start',
                                    gap: 1,
                                    px: 0.75,
                                    py: 0.5,
                                    borderRadius: 2,
                                    textAlign: 'left',
                                    bgcolor: selected ? t.vars.palette.action.selected : 'transparent',
                                    '&:hover': { bgcolor: t.vars.palette.action.hover },
                                })}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 700, color: 'primary.main', whiteSpace: 'nowrap', minWidth: 64 }}
                                >
                                    {formatDateShort(date)}
                                </Typography>
                                <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }}>
                                    {label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                                    {rsd(d.toPay)}
                                </Typography>
                            </ButtonBase>
                        )
                    })}
                </Stack>
            )}
            <Divider sx={{ mt: 1.5 }} />
        </Card>
    )
}

/** Sačuvaj → Ažuriraj (ima izmena) → Poručeno (sve je već u bazi). */
function SaveButton({
    saving,
    hasSaved,
    dirty,
    onSave,
    compact,
}: {
    saving: boolean
    hasSaved: boolean
    dirty: boolean
    onSave: () => void
    compact?: boolean
}) {
    const size = compact ? undefined : 'large'
    const layout = compact ? {} : { fullWidth: true, sx: { mt: 2.5 } }

    if (saving) {
        return (
            <Button variant="contained" size={size} disabled {...layout}>
                Čuvanje...
            </Button>
        )
    }
    if (hasSaved && !dirty) {
        return (
            <Button
                variant="outlined"
                color="success"
                size={size}
                disabled
                startIcon={<CheckCircleIcon />}
                {...layout}
                sx={{
                    ...layout.sx,
                    '&.Mui-disabled': { color: 'success.main', borderColor: 'success.main', opacity: 0.85 },
                }}
            >
                Poručeno
            </Button>
        )
    }
    if (hasSaved) {
        return (
            <Button variant="contained" size={size} onClick={onSave} startIcon={<EditIcon />} {...layout}>
                {compact ? 'Ažuriraj' : 'Ažuriraj porudžbinu'}
            </Button>
        )
    }
    return (
        <Button variant="contained" size={size} onClick={onSave} startIcon={<CheckIcon />} {...layout}>
            {compact ? 'Sačuvaj' : 'Sačuvaj porudžbinu'}
        </Button>
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
    cost,
    portionCount,
    saving,
    hasSaved,
    dirty,
    onSave,
}: {
    items: { id: number; name: string; qty: number; price: number; withSoup: boolean }[]
    cost: DayCost
    portionCount: number
    saving: boolean
    hasSaved: boolean
    dirty: boolean
    onSave: () => void
}) {
    const empty = items.length === 0
    return (
        <Card sx={(t) => ({ boxShadow: t.shadows[4] })}>
            <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
                    <ReceiptLongIcon color="primary" fontSize="small" />
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Porudžbina
                    </Typography>
                    {hasSaved &&
                        (dirty ? (
                            <Tooltip title="Ima izmena koje još nisu sačuvane">
                                <Chip size="small" color="warning" variant="outlined" icon={<EditIcon />} label="Izmenjeno" />
                            </Tooltip>
                        ) : (
                            <Tooltip title="Ova porudžbina je sačuvana. Promeni nešto pa klikni „Ažuriraj”.">
                                <Chip size="small" color="success" variant="outlined" icon={<CheckCircleIcon />} label="Poručeno" />
                            </Tooltip>
                        ))}
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
                                    {it.withSoup && (
                                        <Typography component="span" variant="body2" color="text.secondary">
                                            {' '}
                                            + čorba
                                        </Typography>
                                    )}
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
                    </Stack>
                )}

                <Divider sx={{ my: 1.75, borderStyle: 'dashed' }} />

                <Stack spacing={0.5}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                            Porcija
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {portionCount}
                        </Typography>
                    </Stack>
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                            Puna cena
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {rsd(cost.full)}
                        </Typography>
                    </Stack>
                    {cost.subsidy > 0 && (
                        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ color: 'success.main' }}>
                                Pokriva firma
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                                −{rsd(cost.subsidy)}
                            </Typography>
                        </Stack>
                    )}
                </Stack>
                <Stack direction="row" sx={{ mt: 1, justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Typography sx={{ fontWeight: 700 }}>Za plaćanje</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                        {rsd(cost.toPay)}
                    </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                    Firma pokriva deo cene jedne porcije dnevno; svaka dodatna porcija plaća se u celosti.
                </Typography>

                <SaveButton saving={saving} hasSaved={hasSaved} dirty={dirty} onSave={onSave} />
            </CardContent>
        </Card>
    )
}

function MealItem({
    meal,
    qty,
    count,
    note,
    withSoup,
    pricing,
    disabled,
    onToggle,
    onQty,
    onNote,
    onSoup,
}: {
    meal: Meal
    qty: number
    count: number
    note: string
    withSoup: boolean
    pricing: PricingSettings
    disabled: boolean
    onToggle: () => void
    onQty: (q: number) => void
    onNote: (v: string) => void
    onSoup: (v: boolean) => void
}) {
    const checked = qty > 0
    const price = Number(meal.price) || 0
    const reaction = quantityReaction(qty)
    const isSuvo = meal.category === 'suvo'
    const soupPrice = pricing.soupPrice
    // realna cena: firma pokriva deo JEDNE porcije dnevno (najskuplje), svaka dodatna je puna cena
    const unit = unitPrice({ price, withSoup: isSuvo && withSoup }, pricing)
    const subsidy = subsidyFor(unit, pricing)

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
                                <Tooltip
                                    arrow
                                    placement="top"
                                    title={
                                        <Box sx={{ lineHeight: 1.5 }}>
                                            <b>Ti plaćaš {rsd(unit - subsidy)}</b>
                                            {subsidy > 0 && ` (−${rsd(subsidy)} pokriva firma)`}
                                            {isSuvo && withSoup && ` · sa čorbom ${rsd(unit)}`}
                                            <br />
                                            Popust važi za jednu porciju dnevno; svaka dodatna porcija je punih {rsd(unit)}.
                                        </Box>
                                    }
                                >
                                    <Typography
                                        sx={{
                                            fontWeight: 700,
                                            whiteSpace: 'nowrap',
                                            color: 'primary.main',
                                            cursor: 'help',
                                            textDecoration: 'underline dotted',
                                            textUnderlineOffset: 3,
                                        }}
                                    >
                                        {rsd(price)}
                                    </Typography>
                                </Tooltip>
                            )}
                        </Stack>

                        {meal.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                {meal.description}
                            </Typography>
                        )}

                        <Stack direction="row" spacing={0.75} useFlexGap sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                            {meal.isPosno && <Chip label="posno" size="small" color="success" variant="outlined" />}
                            {!isSuvo && (
                                <Chip
                                    icon={<RamenDiningIcon />}
                                    label="čorba uključena"
                                    size="small"
                                    variant="outlined"
                                    sx={{ color: 'text.secondary' }}
                                />
                            )}
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

                        {isSuvo ? (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={withSoup}
                                        disabled={disabled}
                                        onChange={(e) => onSoup(e.target.checked)}
                                        icon={<RamenDiningIcon />}
                                        checkedIcon={<RamenDiningIcon />}
                                    />
                                }
                                label={
                                    <Typography variant="body2">
                                        Dodaj čorbu{' '}
                                        <Typography
                                            component="span"
                                            variant="body2"
                                            sx={{ ml: 0.5, fontWeight: 700, color: 'primary.main' }}
                                        >
                                            +{rsd(soupPrice)}
                                        </Typography>
                                    </Typography>
                                }
                                sx={{ ml: 0 }}
                            />
                        ) : (
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Dodatak / napomena (npr. bez luka)"
                                value={note}
                                disabled={disabled}
                                onChange={(e) => onNote(e.target.value)}
                            />
                        )}
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
