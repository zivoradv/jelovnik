'use client'

import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/Edit'
import TuneIcon from '@mui/icons-material/Tune'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    InputAdornment,
    MenuItem,
    Skeleton,
    Snackbar,
    Stack,
    Switch,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { CATEGORIES, DEFAULT_PRICES, type MealCategory } from '@/lib/constants'
import { DEFAULT_PRICING, type PricingSettings, rsd, type SubsidyMode, subsidyFor, subsidyLabel } from '@/lib/pricing'
import { useConfirm } from '../confirm-context'

interface Meal {
    id: number
    name: string
    description: string | null
    note: string | null
    price: string
    category: MealCategory
    isPosno: boolean
    active: boolean
}

type FormState = {
    name: string
    description: string
    note: string
    price: string
    category: MealCategory
    isPosno: boolean
    active: boolean
}

const emptyForm: FormState = {
    name: '',
    description: '',
    note: '',
    price: String(DEFAULT_PRICES.kuvano),
    category: 'kuvano',
    isPosno: false,
    active: true,
}

type PricingForm = { subsidyMode: SubsidyMode; subsidyPercent: string; subsidyAmount: string; soupPrice: string }

function toForm(p: PricingSettings): PricingForm {
    return {
        subsidyMode: p.subsidyMode,
        subsidyPercent: String(p.subsidyPercent),
        subsidyAmount: String(p.subsidyAmount),
        soupPrice: String(p.soupPrice),
    }
}

/** Podrazumevana cena za kombinaciju kategorije i posnog. */
function defaultPrice(category: MealCategory, isPosno: boolean): number {
    // dodatak ima svoju cenu bez obzira na posno – posna čorba ne postoji, ali dodatak može da bude i posan
    if (isPosno && category !== 'dodatak') return DEFAULT_PRICES.posno
    return DEFAULT_PRICES[category]
}

export default function MealsAdmin() {
    const confirm = useConfirm()
    const [meals, setMeals] = useState<Meal[]>([])
    const [pricing, setPricing] = useState<PricingSettings>(DEFAULT_PRICING)
    const [pricingForm, setPricingForm] = useState<PricingForm>(toForm(DEFAULT_PRICING))
    const [savingPricing, setSavingPricing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [toast, setToast] = useState('')
    const [open, setOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [form, setForm] = useState<FormState>(emptyForm)
    const [priceTouched, setPriceTouched] = useState(false)
    const [saving, setSaving] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [mRes, sRes] = await Promise.all([fetch('/api/meals'), fetch('/api/admin/settings')])
            const [m, s] = await Promise.all([mRes.json(), sRes.json()])
            setMeals(m.meals || [])
            const p: PricingSettings = s.pricing || DEFAULT_PRICING
            setPricing(p)
            setPricingForm(toForm(p))
        } catch {
            setError('Greška pri učitavanju jela.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    function openNew() {
        setEditingId(null)
        setForm(emptyForm)
        setPriceTouched(false)
        setOpen(true)
    }

    function openEdit(m: Meal) {
        setEditingId(m.id)
        setForm({
            name: m.name,
            description: m.description || '',
            note: m.note || '',
            price: String(Number(m.price)),
            category: m.category,
            isPosno: m.isPosno,
            active: m.active,
        })
        setPriceTouched(true)
        setOpen(true)
    }

    /** Dok admin ne dirne cenu, ona prati podrazumevanu za kategoriju/posno. */
    function setCategoryOrPosno(patch: Partial<Pick<FormState, 'category' | 'isPosno'>>) {
        setForm((f) => {
            const next = { ...f, ...patch }
            if (!priceTouched) next.price = String(defaultPrice(next.category, next.isPosno))
            return next
        })
    }

    async function save() {
        setSaving(true)
        setError('')
        try {
            const url = editingId ? `/api/meals/${editingId}` : '/api/meals'
            const method = editingId ? 'PATCH' : 'POST'
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Greška pri čuvanju.')
            setOpen(false)
            await load()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Greška pri čuvanju.')
        } finally {
            setSaving(false)
        }
    }

    async function remove(m: Meal) {
        const ok = await confirm({
            title: `Obrisati jelo „${m.name}”?`,
            message:
                'Brisanje je moguće samo ako jelo niko nikada nije naručio – inače ga deaktiviraj (ostaje u istoriji i dugovima, ali nestaje iz ponude).',
            confirmText: 'Obriši',
            danger: true,
        })
        if (!ok) return
        setError('')
        const res = await fetch(`/api/meals/${m.id}`, { method: 'DELETE' })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data.error || 'Greška pri brisanju jela.')
            return
        }
        setToast('Jelo je obrisano.')
        await load()
    }

    async function savePricing() {
        setSavingPricing(true)
        setError('')
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subsidyMode: pricingForm.subsidyMode,
                    subsidyPercent: Number(pricingForm.subsidyPercent),
                    subsidyAmount: Number(pricingForm.subsidyAmount),
                    soupPrice: Number(pricingForm.soupPrice),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Greška pri čuvanju podešavanja.')
            setPricing(data.pricing)
            setPricingForm(toForm(data.pricing))
            setToast('Podešavanja cena su sačuvana.')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Greška pri čuvanju podešavanja.')
        } finally {
            setSavingPricing(false)
        }
    }

    const kuvana = meals.filter((m) => m.category === 'kuvano')
    const dodaci = meals.filter((m) => m.category === 'dodatak')
    const suva = meals.filter((m) => m.category === 'suvo')
    const pricingDirty = JSON.stringify(pricingForm) !== JSON.stringify(toForm(pricing))

    if (loading) {
        return (
            <Stack spacing={1.5}>
                <Skeleton variant="text" width={180} height={36} />
                {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rounded" height={70} />
                ))}
            </Stack>
        )
    }

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
                        <TuneIcon color="primary" fontSize="small" />
                        <Typography variant="h6">Cene i popust</Typography>
                    </Stack>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'flex-start' } }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                            <ToggleButtonGroup
                                exclusive
                                size="small"
                                value={pricingForm.subsidyMode}
                                onChange={(_, v: SubsidyMode | null) => v && setPricingForm((p) => ({ ...p, subsidyMode: v }))}
                                aria-label="Način obračuna popusta"
                                sx={{ mt: 0.25 }}
                            >
                                <ToggleButton value="percent">%</ToggleButton>
                                <ToggleButton value="amount">RSD</ToggleButton>
                            </ToggleButtonGroup>
                            {pricingForm.subsidyMode === 'percent' ? (
                                <TextField
                                    label="Firma pokriva"
                                    type="number"
                                    size="small"
                                    value={pricingForm.subsidyPercent}
                                    onChange={(e) => setPricingForm((p) => ({ ...p, subsidyPercent: e.target.value }))}
                                    slotProps={{
                                        input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                                        htmlInput: { min: 0, max: 100 },
                                    }}
                                    helperText="Procenat cene jedne porcije dnevno."
                                    sx={{ minWidth: 180 }}
                                />
                            ) : (
                                <TextField
                                    label="Firma pokriva"
                                    type="number"
                                    size="small"
                                    value={pricingForm.subsidyAmount}
                                    onChange={(e) => setPricingForm((p) => ({ ...p, subsidyAmount: e.target.value }))}
                                    slotProps={{
                                        input: { endAdornment: <InputAdornment position="end">RSD</InputAdornment> },
                                        htmlInput: { min: 0 },
                                    }}
                                    helperText="Fiksan iznos po jednoj porciji dnevno."
                                    sx={{ minWidth: 180 }}
                                />
                            )}
                        </Stack>
                        <Button
                            variant="contained"
                            onClick={savePricing}
                            disabled={savingPricing || !pricingDirty}
                            sx={{ mt: { md: 0.25 } }}
                        >
                            {savingPricing ? 'Čuvanje…' : 'Sačuvaj'}
                        </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Primer sa trenutnim podešavanjem ({subsidyLabel(pricing)}): kuvano {rsd(DEFAULT_PRICES.kuvano)} → korisnik plaća{' '}
                        {rsd(DEFAULT_PRICES.kuvano - subsidyFor(DEFAULT_PRICES.kuvano, pricing))} (čorba je u ceni); suvo{' '}
                        {rsd(DEFAULT_PRICES.suvo)} → korisnik plaća {rsd(DEFAULT_PRICES.suvo - subsidyFor(DEFAULT_PRICES.suvo, pricing))}.
                        Svaka dodatna porcija u istom danu plaća se u celosti, a dodaci (čorbe) uvek u celosti – cenu čorbe postavljaš na
                        samoj stavci, u sekciji „Dodaci”.
                    </Typography>
                </CardContent>
            </Card>

            <Stack direction="row" spacing={2} sx={{ mb: 2.5, justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Jela ({meals.length})</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
                    Novo jelo
                </Button>
            </Stack>

            <Stack spacing={3}>
                <DaySection label="Kuvana jela (raspoređuju se po danima u tabu Raspored)" count={kuvana.length}>
                    {kuvana.length === 0 ? (
                        <EmptyHint text="Nema unetih kuvanih jela." />
                    ) : (
                        <Stack spacing={1}>
                            {kuvana.map((m) => (
                                <MealRow key={m.id} meal={m} onEdit={() => openEdit(m)} onDelete={() => remove(m)} />
                            ))}
                        </Stack>
                    )}
                </DaySection>

                <DaySection label="Dodaci – čorbe (dostupno svaki dan, bez popusta firme)" count={dodaci.length}>
                    {dodaci.length === 0 ? (
                        <EmptyHint text="Nema unetih dodataka. Dodaj „Čorba” po ceni od 100 RSD da bi se pojavila u meniju." />
                    ) : (
                        <Stack spacing={1}>
                            {dodaci.map((m) => (
                                <MealRow key={m.id} meal={m} onEdit={() => openEdit(m)} onDelete={() => remove(m)} />
                            ))}
                        </Stack>
                    )}
                </DaySection>

                <DaySection label="Suvi obrok (dostupno svaki dan)" count={suva.length}>
                    {suva.length === 0 ? (
                        <EmptyHint text="Nema unetih stavki." />
                    ) : (
                        <Stack spacing={1}>
                            {suva.map((m) => (
                                <MealRow key={m.id} meal={m} onEdit={() => openEdit(m)} onDelete={() => remove(m)} />
                            ))}
                        </Stack>
                    )}
                </DaySection>
            </Stack>

            <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>{editingId ? 'Izmena jela' : 'Novo jelo'}</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2.25} sx={{ mt: 1 }}>
                        <TextField
                            label="Naziv jela"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            fullWidth
                            autoFocus
                        />
                        <TextField
                            label="Opis / sastojci"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            fullWidth
                            multiline
                            minRows={2}
                        />
                        <TextField
                            label="Pomoćna napomena (dodatna info)"
                            value={form.note}
                            onChange={(e) => setForm({ ...form, note: e.target.value })}
                            fullWidth
                            helperText="Npr. ograničena količina, sadrži gluten, za poneti. Vidljivo i korisnicima."
                        />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                select
                                label="Kategorija"
                                value={form.category}
                                onChange={(e) => setCategoryOrPosno({ category: e.target.value as MealCategory })}
                                fullWidth
                            >
                                {CATEGORIES.map((c) => (
                                    <MenuItem key={c.value} value={c.value}>
                                        {c.label}
                                    </MenuItem>
                                ))}
                            </TextField>
                            <TextField
                                label="Puna cena (RSD)"
                                type="number"
                                value={form.price}
                                onChange={(e) => {
                                    setPriceTouched(true)
                                    setForm({ ...form, price: e.target.value })
                                }}
                                fullWidth
                                helperText={`Pre popusta firme (${subsidyLabel(pricing)}). Podrazumevano: kuvano ${DEFAULT_PRICES.kuvano}, suvo ${DEFAULT_PRICES.suvo}, posno ${DEFAULT_PRICES.posno}.`}
                            />
                        </Stack>
                        <Stack direction="row" spacing={3}>
                            <FormControlLabel
                                control={
                                    <Switch checked={form.isPosno} onChange={(e) => setCategoryOrPosno({ isPosno: e.target.checked })} />
                                }
                                label="Posno"
                            />
                            <FormControlLabel
                                control={<Switch checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />}
                                label="Aktivno (vidljivo korisnicima)"
                            />
                        </Stack>
                        {form.category === 'kuvano' && (
                            <Alert severity="info" variant="outlined">
                                Uz kuvano jelo čorba je uključena u cenu i korisnici to vide kao oznaku – ne moraš da je unosiš u opis. Ako
                                je jelo <b>posno</b>, čorba ne ide uz njega (posne čorbe nema) i to takođe piše korisniku.
                            </Alert>
                        )}
                        {form.category === 'dodatak' && (
                            <Alert severity="info" variant="outlined">
                                Dodatak se naručuje u bilo kojoj količini, dostupan je svaki radni dan (ne ide u nedeljnu šemu) i plaća se u
                                celosti – popust firme uvek ide na obrok.
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setOpen(false)} color="inherit">
                        Otkaži
                    </Button>
                    <Button variant="contained" onClick={save} disabled={saving || !form.name.trim()}>
                        {saving ? 'Čuvanje...' : 'Sačuvaj'}
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

function DaySection({ label, count, children }: { label: string; count: number; children: ReactNode }) {
    return (
        <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1.25, alignItems: 'center' }}>
                <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
                    {label}
                </Typography>
                {count > 0 && <Chip label={count} size="small" variant="outlined" sx={{ height: 20 }} />}
                <Divider sx={{ flexGrow: 1, ml: 1 }} />
            </Stack>
            {children}
        </Box>
    )
}

function EmptyHint({ text }: { text: string }) {
    return (
        <Typography
            variant="body2"
            color="text.disabled"
            sx={(t) => ({
                py: 1.75,
                px: 2,
                border: '1.5px dashed',
                borderColor: t.vars.palette.divider,
                borderRadius: 2.5,
            })}
        >
            {text}
        </Typography>
    )
}

function MealRow({ meal, onEdit, onDelete }: { meal: Meal; onEdit: () => void; onDelete: () => void }) {
    return (
        <Card
            sx={{
                opacity: meal.active ? 1 : 0.6,
                '&:hover': { borderColor: 'primary.light' },
            }}
        >
            <CardContent sx={{ '&:last-child': { pb: 1.75 }, py: 1.75 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography sx={{ fontWeight: 600 }}>{meal.name}</Typography>
                            <Chip
                                label={rsd(Number(meal.price))}
                                size="small"
                                variant="outlined"
                                sx={{ color: 'primary.main', borderColor: 'primary.main' }}
                            />
                            {meal.isPosno && <Chip label="posno" size="small" color="success" variant="outlined" />}
                            {!meal.active && <Chip icon={<VisibilityOffIcon />} label="skriveno" size="small" variant="outlined" />}
                        </Stack>

                        {meal.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                {meal.description}
                            </Typography>
                        )}
                        {meal.note && (
                            <Typography
                                variant="caption"
                                sx={(t) => ({
                                    display: 'inline-block',
                                    mt: 0.75,
                                    px: 1,
                                    py: 0.4,
                                    borderRadius: 1.5,
                                    color: 'secondary.dark',
                                    bgcolor: t.vars.palette.action.hover,
                                })}
                            >
                                {meal.note}
                            </Typography>
                        )}
                    </Box>

                    <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                        <Tooltip title="Izmeni">
                            <IconButton
                                onClick={onEdit}
                                aria-label="Izmeni"
                                size="small"
                                sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                            >
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Obriši">
                            <IconButton
                                onClick={onDelete}
                                aria-label="Obriši"
                                size="small"
                                sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                            >
                                <DeleteOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    )
}
