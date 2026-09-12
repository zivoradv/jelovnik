'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  Card,
  CardContent,
  Checkbox,
  Chip,
  TextField,
  Button,
  IconButton,
  Alert,
  Divider,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import { useAuth } from './auth-context';
import { WEEKDAYS } from '@/lib/constants';
import {
  addDays,
  formatDateLong,
  fromISODate,
  startOfWeek,
  toISODate,
  workdaysOfWeek,
} from '@/lib/date';

interface Meal {
  id: number;
  name: string;
  description: string | null;
  note: string | null;
  price: string;
  day: number | null;
  category: 'kuvano' | 'suvo';
  isPosno: boolean;
}

interface OrderRow {
  id: number;
  mealId: number | null;
  customText: string | null;
  note: string | null;
}

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();

  // Ako je danas vikend, kreni od sledećeg ponedeljka.
  const initialDate = useMemo(() => {
    const t = todayMidnight();
    const dow = t.getDay();
    if (dow === 0) return addDays(t, 1); // nedelja -> ponedeljak
    if (dow === 6) return addDays(t, 2); // subota -> ponedeljak
    return t;
  }, []);

  const [weekAnchor, setWeekAnchor] = useState<Date>(initialDate);
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(initialDate));

  const [menu, setMenu] = useState<Meal[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedOpen, setSavedOpen] = useState(false);

  // Uređivačko stanje porudžbine
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [customItems, setCustomItems] = useState<string[]>([]);

  const weekDays = useMemo(() => workdaysOfWeek(weekAnchor), [weekAnchor]);
  const selDateObj = fromISODate(selectedDate);
  const isPast = selDateObj < todayMidnight();
  const dayOfWeek = selDateObj.getDay();

  const loadDay = useCallback(async (dateStr: string) => {
    setLoading(true);
    setError('');
    try {
      const dow = fromISODate(dateStr).getDay();
      const [menuRes, ordersRes] = await Promise.all([
        fetch(`/api/meals?day=${dow}`),
        fetch(`/api/orders?date=${dateStr}`),
      ]);
      const menuData = await menuRes.json();
      const ordersData = await ordersRes.json();

      setMenu(menuData.meals || []);

      const countMap: Record<number, number> = {};
      (ordersData.counts || []).forEach((c: { mealId: number; count: number }) => {
        countMap[c.mealId] = c.count;
      });
      setCounts(countMap);

      // Popuni uređivačko stanje iz sačuvanih stavki korisnika
      const mine: OrderRow[] = ordersData.mine || [];
      const sel = new Set<number>();
      const noteMap: Record<number, string> = {};
      const customs: string[] = [];
      mine.forEach((o) => {
        if (o.mealId !== null) {
          sel.add(o.mealId);
          if (o.note) noteMap[o.mealId] = o.note;
        } else if (o.customText) {
          customs.push(o.customText);
        }
      });
      setSelected(sel);
      setNotes(noteMap);
      setCustomItems(customs);
    } catch {
      setError('Greška pri učitavanju menija.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadDay(selectedDate);
  }, [user, selectedDate, loadDay]);

  function toggleMeal(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function pickDay(d: Date) {
    setSelectedDate(toISODate(d));
  }

  function shiftWeek(deltaWeeks: number) {
    const newAnchor = addDays(startOfWeek(weekAnchor), deltaWeeks * 7);
    setWeekAnchor(newAnchor);
    // Zadrži isti dan u nedelji ako je moguće
    const targetDow = dayOfWeek >= 1 && dayOfWeek <= 5 ? dayOfWeek - 1 : 0;
    const days = workdaysOfWeek(newAnchor);
    setSelectedDate(toISODate(days[targetDow]));
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const items = [
        ...Array.from(selected).map((mealId) => ({
          mealId,
          note: notes[mealId] || null,
        })),
        ...customItems
          .map((t) => t.trim())
          .filter(Boolean)
          .map((customText) => ({ customText })),
      ];
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Greška pri čuvanju.');
      setSavedOpen(true);
      await loadDay(selectedDate);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri čuvanju.');
    } finally {
      setSaving(false);
    }
  }

  const kuvana = menu.filter((m) => m.category === 'kuvano');
  const suva = menu.filter((m) => m.category === 'suvo');

  const totalPrice = useMemo(() => {
    let sum = 0;
    menu.forEach((m) => {
      if (selected.has(m.id)) sum += Number(m.price) || 0;
    });
    return sum;
  }, [menu, selected]);

  if (authLoading || !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Šta jedemo?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Izaberi obrok za željeni dan. Možeš izabrati i dva jela, dodati napomenu
          ili upisati nešto svoje.
        </Typography>
      </Box>

      {/* Navigacija po nedeljama */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <IconButton onClick={() => shiftWeek(-1)} aria-label="Prethodna nedelja">
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="subtitle2" color="text.secondary">
          {formatDateLong(weekDays[0])} – {formatDateLong(weekDays[4])}
        </Typography>
        <IconButton onClick={() => shiftWeek(1)} aria-label="Sledeća nedelja">
          <ChevronRightIcon />
        </IconButton>
      </Stack>

      {/* Izbor dana */}
      <ToggleButtonGroup
        exclusive
        value={selectedDate}
        onChange={(_, val) => val && setSelectedDate(val)}
        fullWidth
        color="primary"
        size="small"
      >
        {weekDays.map((d, i) => {
          const iso = toISODate(d);
          const isToday = iso === toISODate(todayMidnight());
          return (
            <ToggleButton key={iso} value={iso} onClick={() => pickDay(d)}>
              <Stack alignItems="center" spacing={0}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {WEEKDAYS[i].short}
                </Typography>
                <Typography variant="caption">
                  {String(d.getDate()).padStart(2, '0')}.{String(d.getMonth() + 1).padStart(2, '0')}.
                </Typography>
                {isToday && (
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      bgcolor: 'secondary.main',
                      mt: 0.25,
                    }}
                  />
                )}
              </Stack>
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>

      {error && <Alert severity="error">{error}</Alert>}

      {isPast ? (
        <Alert severity="info">
          Ovaj dan je prošao — porudžbina se više ne može menjati.
        </Alert>
      ) : (
        <Alert severity="info" variant="outlined">
          Obavezno naručivanje obroka dan ranije!
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : menu.length === 0 ? (
        <Alert severity="warning">Za ovaj dan još nije unet meni.</Alert>
      ) : (
        <>
          {kuvana.length > 0 && (
            <Section title="Kuvana jela">
              {kuvana.map((m) => (
                <MealItem
                  key={m.id}
                  meal={m}
                  checked={selected.has(m.id)}
                  count={counts[m.id] || 0}
                  note={notes[m.id] || ''}
                  disabled={isPast}
                  onToggle={() => toggleMeal(m.id)}
                  onNote={(v) => setNotes((n) => ({ ...n, [m.id]: v }))}
                />
              ))}
            </Section>
          )}

          {suva.length > 0 && (
            <Section title="Suvi obrok">
              {suva.map((m) => (
                <MealItem
                  key={m.id}
                  meal={m}
                  checked={selected.has(m.id)}
                  count={counts[m.id] || 0}
                  note={notes[m.id] || ''}
                  disabled={isPast}
                  onToggle={() => toggleMeal(m.id)}
                  onNote={(v) => setNotes((n) => ({ ...n, [m.id]: v }))}
                />
              ))}
            </Section>
          )}

          {/* Sopstvene porudžbine */}
          <Section title="Nešto drugo?">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Ako ti ništa ne odgovara, upiši šta želiš.
            </Typography>
            <Stack spacing={1}>
              {customItems.map((val, idx) => (
                <Stack direction="row" spacing={1} key={idx}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="npr. Grčka salata bez luka"
                    value={val}
                    disabled={isPast}
                    onChange={(e) =>
                      setCustomItems((items) =>
                        items.map((v, i) => (i === idx ? e.target.value : v)),
                      )
                    }
                  />
                  <IconButton
                    aria-label="Ukloni"
                    disabled={isPast}
                    onClick={() =>
                      setCustomItems((items) => items.filter((_, i) => i !== idx))
                    }
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
              ))}
              {!isPast && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setCustomItems((items) => [...items, ''])}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Dodaj svoju stavku
                </Button>
              )}
            </Stack>
          </Section>

          {/* Snimanje */}
          {!isPast && (
            <Box
              sx={{
                position: 'sticky',
                bottom: 16,
                zIndex: 2,
              }}
            >
              <Card sx={{ boxShadow: 3 }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                  >
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Izabrano: {selected.size + customItems.filter((c) => c.trim()).length}
                      </Typography>
                      {totalPrice > 0 && (
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {totalPrice.toLocaleString('sr-RS')} RSD
                        </Typography>
                      )}
                    </Box>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={save}
                      disabled={saving}
                    >
                      {saving ? 'Čuvanje…' : 'Sačuvaj porudžbinu'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          )}
        </>
      )}

      <Snackbar
        open={savedOpen}
        autoHideDuration={2500}
        onClose={() => setSavedOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSavedOpen(false)}>
          Porudžbina je sačuvana.
        </Alert>
      </Snackbar>
    </Stack>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      <Stack spacing={1.5}>{children}</Stack>
    </Box>
  );
}

function MealItem({
  meal,
  checked,
  count,
  note,
  disabled,
  onToggle,
  onNote,
}: {
  meal: Meal;
  checked: boolean;
  count: number;
  note: string;
  disabled: boolean;
  onToggle: () => void;
  onNote: (v: string) => void;
}) {
  return (
    <Card
      sx={{
        borderColor: checked ? 'primary.main' : undefined,
        borderWidth: checked ? 2 : 1,
      }}
    >
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Checkbox
            checked={checked}
            onChange={onToggle}
            disabled={disabled}
            sx={{ mt: -1, ml: -1 }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography sx={{ fontWeight: 600 }}>{meal.name}</Typography>
              {meal.isPosno && <Chip label="posno" size="small" color="success" variant="outlined" />}
              {count > 0 && (
                <Chip
                  icon={<PeopleAltIcon />}
                  label={count}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>

            {meal.description && (
              <Typography variant="body2" color="text.secondary">
                {meal.description}
              </Typography>
            )}
            {meal.note && (
              <Typography variant="caption" color="secondary.main" sx={{ display: 'block', mt: 0.5 }}>
                ⓘ {meal.note}
              </Typography>
            )}

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {Number(meal.price) > 0 ? `${Number(meal.price).toLocaleString('sr-RS')} RSD` : ''}
              </Typography>
            </Stack>

            {checked && (
              <TextField
                fullWidth
                size="small"
                placeholder="Dodatak / napomena (npr. bez luka, duplo meso)"
                value={note}
                disabled={disabled}
                onChange={(e) => onNote(e.target.value)}
                sx={{ mt: 1 }}
              />
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
