'use client'

import AddIcon from '@mui/icons-material/Add'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditIcon from '@mui/icons-material/Edit'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    MenuItem,
    Skeleton,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { WEEKDAYS } from '@/lib/constants'
import { addDays, formatDateLong, fromISODate, startOfWeek, toISODate } from '@/lib/date'

interface Meal {
    id: number
    name: string
    price: string
    category: 'kuvano' | 'suvo'
    isPosno: boolean
    active: boolean
}

interface Template {
    id: number
    name: string
    days: Record<number, number[]>
}

interface WeekRow {
    weekStart: string
    templateId: number
    templateName: string
}

type Days = Record<number, number[]>

function emptyDays(): Days {
    return { 1: [], 2: [], 3: [], 4: [], 5: [] }
}

function weekLabel(weekStart: string): string {
    const mon = fromISODate(weekStart)
    return `${formatDateLong(mon)} – ${formatDateLong(addDays(mon, 4))}`
}

export default function RasporedAdmin() {
    const [templates, setTemplates] = useState<Template[]>([])
    const [meals, setMeals] = useState<Meal[]>([])
    const [weeks, setWeeks] = useState<WeekRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [toast, setToast] = useState('')

    const [weekStart, setWeekStart] = useState<string>(() => toISODate(startOfWeek(new Date())))
    const [assigning, setAssigning] = useState(false)

    const [editorOpen, setEditorOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)
    const [name, setName] = useState('')
    const [days, setDays] = useState<Days>(emptyDays())
    const [assignAfterSave, setAssignAfterSave] = useState(true)
    const [saving, setSaving] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const [tRes, mRes, wRes] = await Promise.all([
                fetch('/api/admin/templates'),
                fetch('/api/meals'),
                fetch('/api/admin/week-menu'),
            ])
            const [t, m, w] = await Promise.all([tRes.json(), mRes.json(), wRes.json()])
            setTemplates(t.templates || [])
            setMeals(m.meals || [])
            setWeeks(w.weeks || [])
        } catch {
            setError('Greška pri učitavanju rasporeda.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const kuvana = useMemo(() => meals.filter((m) => m.category === 'kuvano'), [meals])
    const mealById = useMemo(() => new Map(meals.map((m) => [m.id, m])), [meals])
    const currentWeekStart = toISODate(startOfWeek(new Date()))
    const assignedId = weeks.find((w) => w.weekStart === weekStart)?.templateId ?? null
    const assigned = templates.find((t) => t.id === assignedId) ?? null
    const usageByTemplate = useMemo(() => {
        const map = new Map<number, string[]>()
        for (const w of weeks) map.set(w.templateId, [...(map.get(w.templateId) ?? []), w.weekStart])
        return map
    }, [weeks])

    async function assign(templateId: number | null) {
        setAssigning(true)
        setError('')
        try {
            const res = await fetch('/api/admin/week-menu', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekStart, templateId }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Greška pri dodeli šeme.')
            setWeeks((prev) => {
                const rest = prev.filter((w) => w.weekStart !== weekStart)
                if (templateId === null) return rest
                const t = templates.find((x) => x.id === templateId)
                return [{ weekStart, templateId, templateName: t?.name ?? '' }, ...rest]
            })
            setToast(
                templateId === null
                    ? 'Šema je uklonjena sa nedelje. Korisnici su obavešteni.'
                    : 'Šema je dodeljena. Korisnici su obavešteni.',
            )
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Greška pri dodeli šeme.')
        } finally {
            setAssigning(false)
        }
    }

    function openNew(base?: Template) {
        setEditingId(null)
        setName(base ? `${base.name} (kopija)` : '')
        setDays(base ? { ...emptyDays(), ...base.days } : emptyDays())
        setAssignAfterSave(assignedId === null || Boolean(base))
        setEditorOpen(true)
    }

    function openEdit(t: Template) {
        setEditingId(t.id)
        setName(t.name)
        setDays({ ...emptyDays(), ...t.days })
        setAssignAfterSave(false)
        setEditorOpen(true)
    }

    async function saveTemplate() {
        setSaving(true)
        setError('')
        try {
            const url = editingId ? `/api/admin/templates/${editingId}` : '/api/admin/templates'
            const res = await fetch(url, {
                method: editingId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, days }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Greška pri čuvanju šeme.')
            const saved: Template = data.template
            setTemplates((prev) => {
                const rest = prev.filter((t) => t.id !== saved.id)
                return [...rest, saved].sort((a, b) => a.name.localeCompare(b.name, 'sr'))
            })
            setEditorOpen(false)
            if (!editingId && assignAfterSave) {
                await assign(saved.id)
            } else {
                setToast(editingId ? 'Šema je sačuvana.' : 'Nova šema je napravljena.')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Greška pri čuvanju šeme.')
        } finally {
            setSaving(false)
        }
    }

    async function removeTemplate(t: Template) {
        if (!confirm(`Obrisati šemu „${t.name}”?`)) return
        setError('')
        const res = await fetch(`/api/admin/templates/${t.id}`, { method: 'DELETE' })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data.error || 'Greška pri brisanju šeme.')
            return
        }
        setTemplates((prev) => prev.filter((x) => x.id !== t.id))
        setWeeks((prev) => prev.filter((w) => w.templateId !== t.id))
        setToast('Šema je obrisana.')
    }

    function shiftWeek(delta: number) {
        setWeekStart(toISODate(addDays(fromISODate(weekStart), delta * 7)))
    }

    if (loading) {
        return (
            <Stack spacing={1.5}>
                <Skeleton variant="rounded" height={120} />
                <Skeleton variant="rounded" height={220} />
                <Skeleton variant="rounded" height={160} />
            </Stack>
        )
    }

    const isCurrent = weekStart === currentWeekStart
    const isPastWeek = weekStart < currentWeekStart
    const totalInWeek = assigned ? Object.values(assigned.days).reduce((a, ids) => a + ids.length, 0) : 0

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {kuvana.length === 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Još nema unetih kuvanih jela. Dodaj ih u tabu „Jela”, pa se vrati ovde da napraviš šemu.
                </Alert>
            )}

            <Card sx={{ mb: 2.5 }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Tooltip title="Prethodna nedelja">
                            <IconButton onClick={() => shiftWeek(-1)} aria-label="Prethodna nedelja" size="small">
                                <ChevronLeftIcon />
                            </IconButton>
                        </Tooltip>
                        <Stack spacing={0.25} sx={{ alignItems: 'center' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {weekLabel(weekStart)}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                {isCurrent && <Chip size="small" color="primary" variant="outlined" label="tekuća nedelja" />}
                                {isPastWeek && <Chip size="small" variant="outlined" label="prošla nedelja" />}
                                {!isCurrent && (
                                    <Button size="small" onClick={() => setWeekStart(currentWeekStart)} sx={{ py: 0, minHeight: 0 }}>
                                        Na tekuću
                                    </Button>
                                )}
                            </Stack>
                        </Stack>
                        <Tooltip title="Sledeća nedelja">
                            <IconButton onClick={() => shiftWeek(1)} aria-label="Sledeća nedelja" size="small">
                                <ChevronRightIcon />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
                        <TextField
                            select
                            label="Šema za ovu nedelju"
                            value={assignedId ?? ''}
                            onChange={(e) => assign(e.target.value === '' ? null : Number(e.target.value))}
                            disabled={assigning}
                            fullWidth
                            size="small"
                        >
                            <MenuItem value="">
                                <em>Nije dodeljena</em>
                            </MenuItem>
                            {templates.map((t) => (
                                <MenuItem key={t.id} value={t.id}>
                                    {t.name}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => openNew()}
                            disabled={kuvana.length === 0}
                            sx={{ flexShrink: 0 }}
                        >
                            Nova šema
                        </Button>
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Kada dodeliš ili promeniš šemu, svi korisnici dobijaju obaveštenje. Suvi obroci su uvek u ponudi, bez obzira na
                        šemu.
                    </Typography>
                </CardContent>
            </Card>

            {assigned ? (
                <Card sx={{ mb: 2.5 }}>
                    <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                        <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }} useFlexGap>
                            <EventAvailableIcon color="primary" fontSize="small" />
                            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                {assigned.name}
                            </Typography>
                            <Chip size="small" variant="outlined" label={`${totalInWeek} jela u nedelji`} />
                            <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(assigned)}>
                                Izmeni šemu
                            </Button>
                            <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => openNew(assigned)}>
                                Nova na osnovu ove
                            </Button>
                        </Stack>
                        <WeekGrid days={assigned.days} mealById={mealById} weekStart={weekStart} />
                    </CardContent>
                </Card>
            ) : (
                <Alert severity="info" sx={{ mb: 2.5 }}>
                    Za nedelju {weekLabel(weekStart)} nije dodeljena šema – korisnici vide samo suve obroke. Izaberi postojeću šemu iz liste
                    ili napravi novu.
                </Alert>
            )}

            <Box>
                <Stack direction="row" spacing={1} sx={{ mb: 1.25, alignItems: 'center' }}>
                    <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
                        Sve šeme
                    </Typography>
                    <Chip label={templates.length} size="small" variant="outlined" sx={{ height: 20 }} />
                    <Divider sx={{ flexGrow: 1, ml: 1 }} />
                </Stack>

                {templates.length === 0 ? (
                    <Typography
                        variant="body2"
                        color="text.disabled"
                        sx={(t) => ({ py: 1.75, px: 2, border: '1.5px dashed', borderColor: t.vars.palette.divider, borderRadius: 2.5 })}
                    >
                        Još nema šema. Napravi prvu dugmetom „Nova šema”.
                    </Typography>
                ) : (
                    <Stack spacing={1}>
                        {templates.map((t) => {
                            const used = (usageByTemplate.get(t.id) ?? []).sort()
                            const upcoming = used.filter((w) => w >= currentWeekStart)
                            const perDay = WEEKDAYS.map((wd) => (t.days[wd.value] ?? []).length)
                            return (
                                <Card key={t.id} sx={{ '&:hover': { borderColor: 'primary.light' } }}>
                                    <CardContent sx={{ '&:last-child': { pb: 1.75 }, py: 1.75 }}>
                                        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                                <Stack
                                                    direction="row"
                                                    spacing={1}
                                                    useFlexGap
                                                    sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                                                >
                                                    <Typography sx={{ fontWeight: 600 }}>{t.name}</Typography>
                                                    {t.id === assignedId && (
                                                        <Chip size="small" color="primary" label="dodeljena ovoj nedelji" />
                                                    )}
                                                    {upcoming.length > 0 && t.id !== assignedId && (
                                                        <Chip
                                                            size="small"
                                                            variant="outlined"
                                                            label={`u upotrebi: ${upcoming.length} ned.`}
                                                        />
                                                    )}
                                                </Stack>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                    {WEEKDAYS.map((wd, i) => `${wd.short} ${perDay[i]}`).join(' · ')}
                                                    {used.length > 0 && ` · korišćena ${used.length}×`}
                                                </Typography>
                                            </Box>
                                            <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                                                {t.id !== assignedId && (
                                                    <Tooltip title="Dodeli ovoj nedelji">
                                                        <IconButton
                                                            size="small"
                                                            aria-label="Dodeli ovoj nedelji"
                                                            onClick={() => assign(t.id)}
                                                            disabled={assigning}
                                                            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                                        >
                                                            <EventAvailableIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Nova šema na osnovu ove">
                                                    <IconButton
                                                        size="small"
                                                        aria-label="Kopiraj"
                                                        onClick={() => openNew(t)}
                                                        sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                                    >
                                                        <ContentCopyIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Izmeni">
                                                    <IconButton
                                                        size="small"
                                                        aria-label="Izmeni"
                                                        onClick={() => openEdit(t)}
                                                        sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip
                                                    title={upcoming.length > 0 ? 'Dodeljena je tekućoj ili budućoj nedelji' : 'Obriši'}
                                                >
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            aria-label="Obriši"
                                                            disabled={upcoming.length > 0}
                                                            onClick={() => removeTemplate(t)}
                                                            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
                                                        >
                                                            <DeleteOutlinedIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </Stack>
                )}
            </Box>

            <Dialog open={editorOpen} onClose={() => setEditorOpen(false)} fullWidth maxWidth="md">
                <DialogTitle>{editingId ? 'Izmena šeme' : 'Nova šema'}</DialogTitle>
                <Divider />
                <DialogContent>
                    <Stack spacing={2.5} sx={{ mt: 1 }}>
                        <TextField
                            label="Naziv šeme"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            fullWidth
                            autoFocus
                            placeholder="npr. Šema A, Nedelja sa sarmom, Posna nedelja…"
                        />
                        {WEEKDAYS.map((wd) => {
                            const selected = (days[wd.value] ?? []).map((id) => mealById.get(id)).filter((m): m is Meal => Boolean(m))
                            return (
                                <Autocomplete
                                    key={wd.value}
                                    multiple
                                    options={kuvana}
                                    value={selected}
                                    isOptionEqualToValue={(a, b) => a.id === b.id}
                                    getOptionLabel={(m) => m.name}
                                    onChange={(_, value) => setDays((d) => ({ ...d, [wd.value]: value.map((m) => m.id) }))}
                                    renderValue={(value, getItemProps) =>
                                        value.map((m, index) => {
                                            const { key, ...props } = getItemProps({ index })
                                            return (
                                                <Chip
                                                    key={key}
                                                    {...props}
                                                    size="small"
                                                    label={m.name}
                                                    color={m.isPosno ? 'success' : 'default'}
                                                    variant={m.active ? 'filled' : 'outlined'}
                                                />
                                            )
                                        })
                                    }
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={wd.label}
                                            placeholder={selected.length === 0 ? 'Izaberi kuvana jela…' : ''}
                                            helperText={
                                                selected.length === 0
                                                    ? 'Bez kuvanih jela za ovaj dan'
                                                    : `${selected.length} ${selected.length === 1 ? 'jelo' : 'jela'}`
                                            }
                                        />
                                    )}
                                />
                            )
                        })}
                        {!editingId && (
                            <FormControlLabel
                                control={<Checkbox checked={assignAfterSave} onChange={(e) => setAssignAfterSave(e.target.checked)} />}
                                label={`Odmah dodeli nedelji ${weekLabel(weekStart)}`}
                            />
                        )}
                        {editingId && (usageByTemplate.get(editingId) ?? []).some((w) => w >= currentWeekStart) && (
                            <Alert severity="info">
                                Ova šema je dodeljena tekućoj ili budućoj nedelji – posle čuvanja svi korisnici dobijaju obaveštenje o
                                izmeni.
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setEditorOpen(false)} color="inherit">
                        Otkaži
                    </Button>
                    <Button variant="contained" onClick={saveTemplate} disabled={saving || !name.trim()}>
                        {saving ? 'Čuvanje...' : 'Sačuvaj šemu'}
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

function WeekGrid({ days, mealById, weekStart }: { days: Days; mealById: Map<number, Meal>; weekStart: string }) {
    const mon = fromISODate(weekStart)
    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(5, 1fr)' }, gap: 1.25 }}>
            {WEEKDAYS.map((wd, i) => {
                const list = (days[wd.value] ?? []).map((id) => mealById.get(id)).filter((m): m is Meal => Boolean(m))
                const d = addDays(mon, i)
                return (
                    <Box
                        key={wd.value}
                        sx={(t) => ({
                            p: 1.5,
                            borderRadius: 2.5,
                            border: '1.5px solid',
                            borderColor: t.vars.palette.divider,
                            minHeight: 96,
                        })}
                    >
                        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.04em', display: 'block' }}>
                            {wd.short.toUpperCase()} {String(d.getDate()).padStart(2, '0')}.{String(d.getMonth() + 1).padStart(2, '0')}.
                        </Typography>
                        {list.length === 0 ? (
                            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.75 }}>
                                Bez kuvanih jela
                            </Typography>
                        ) : (
                            <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                                {list.map((m) => (
                                    <Typography key={m.id} variant="body2" sx={{ lineHeight: 1.3, opacity: m.active ? 1 : 0.5 }}>
                                        {m.name}
                                        {m.isPosno && (
                                            <Typography component="span" variant="caption" sx={{ color: 'success.main' }}>
                                                {' '}
                                                (posno)
                                            </Typography>
                                        )}
                                        {!m.active && (
                                            <Typography component="span" variant="caption" color="text.secondary">
                                                {' '}
                                                (skriveno)
                                            </Typography>
                                        )}
                                    </Typography>
                                ))}
                            </Stack>
                        )}
                    </Box>
                )
            })}
        </Box>
    )
}
