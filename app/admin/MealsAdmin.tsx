'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Stack,
  Button,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { WEEKDAYS, CATEGORIES } from '@/lib/constants';

interface Meal {
  id: number;
  name: string;
  description: string | null;
  note: string | null;
  price: string;
  day: number | null;
  category: 'kuvano' | 'suvo';
  isPosno: boolean;
  active: boolean;
}

type FormState = {
  name: string;
  description: string;
  note: string;
  price: string;
  day: string; // '' = svaki dan
  category: 'kuvano' | 'suvo';
  isPosno: boolean;
  active: boolean;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  note: '',
  price: '500',
  day: '1',
  category: 'kuvano',
  isPosno: false,
  active: true,
};

export default function MealsAdmin() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/meals');
      const data = await res.json();
      setMeals(data.meals || []);
    } catch {
      setError('Greška pri učitavanju jela.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(m: Meal) {
    setEditingId(m.id);
    setForm({
      name: m.name,
      description: m.description || '',
      note: m.note || '',
      price: String(Number(m.price)),
      day: m.day === null ? '' : String(m.day),
      category: m.category,
      isPosno: m.isPosno,
      active: m.active,
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        day: form.day === '' ? null : Number(form.day),
      };
      const url = editingId ? `/api/meals/${editingId}` : '/api/meals';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Greška pri čuvanju.');
      setOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri čuvanju.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Obrisati ovo jelo? Time se brišu i sve porudžbine tog jela.')) return;
    await fetch(`/api/meals/${id}`, { method: 'DELETE' });
    await load();
  }

  const grouped = WEEKDAYS.map((wd) => ({
    label: wd.label,
    meals: meals.filter((m) => m.category === 'kuvano' && m.day === wd.value),
  }));
  const suva = meals.filter((m) => m.category === 'suvo');
  const bezDana = meals.filter((m) => m.category === 'kuvano' && m.day === null);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Jela ({meals.length})</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Novo jelo
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {grouped.map((g) => (
          <Box key={g.label}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {g.label}
            </Typography>
            {g.meals.length === 0 ? (
              <Typography variant="body2" color="text.disabled">
                Nema jela za ovaj dan.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {g.meals.map((m) => (
                  <MealRow key={m.id} meal={m} onEdit={() => openEdit(m)} onDelete={() => remove(m.id)} />
                ))}
              </Stack>
            )}
          </Box>
        ))}

        {bezDana.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Kuvano — svaki dan
            </Typography>
            <Stack spacing={1}>
              {bezDana.map((m) => (
                <MealRow key={m.id} meal={m} onEdit={() => openEdit(m)} onDelete={() => remove(m.id)} />
              ))}
            </Stack>
          </Box>
        )}

        <Divider />

        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Suvi obrok (dostupno svaki dan)
          </Typography>
          {suva.length === 0 ? (
            <Typography variant="body2" color="text.disabled">
              Nema unetih stavki.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {suva.map((m) => (
                <MealRow key={m.id} meal={m} onEdit={() => openEdit(m)} onDelete={() => remove(m.id)} />
              ))}
            </Stack>
          )}
        </Box>
      </Stack>

      {/* Dijalog za dodavanje/izmenu */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Izmena jela' : 'Novo jelo'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Naziv jela"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              fullWidth
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
              label="Pomoćna napomena (interno / dodatna info)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              fullWidth
              helperText="Npr. „ograničena količina“, „sadrži gluten“, „za poneti“. Vidljivo i korisnicima."
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Cena (RSD)"
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                fullWidth
              />
              <TextField
                select
                label="Kategorija"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as 'kuvano' | 'suvo' })
                }
                fullWidth
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              select
              label="Dan"
              value={form.day}
              onChange={(e) => setForm({ ...form, day: e.target.value })}
              fullWidth
              helperText="Izaberi „Svaki dan“ za suvi obrok koji nije vezan za određeni dan."
            >
              <MenuItem value="">Svaki dan</MenuItem>
              {WEEKDAYS.map((wd) => (
                <MenuItem key={wd.value} value={String(wd.value)}>
                  {wd.label}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isPosno}
                    onChange={(e) => setForm({ ...form, isPosno: e.target.checked })}
                  />
                }
                label="Posno"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  />
                }
                label="Aktivno (vidljivo korisnicima)"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Otkaži</Button>
          <Button variant="contained" onClick={save} disabled={saving || !form.name.trim()}>
            {saving ? 'Čuvanje…' : 'Sačuvaj'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function MealRow({
  meal,
  onEdit,
  onDelete,
}: {
  meal: Meal;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card sx={{ opacity: meal.active ? 1 : 0.5 }}>
      <CardContent sx={{ '&:last-child': { pb: 1.5 }, py: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography sx={{ fontWeight: 600 }}>{meal.name}</Typography>
              {meal.isPosno && <Chip label="posno" size="small" color="success" variant="outlined" />}
              {!meal.active && <Chip label="skriveno" size="small" />}
              <Chip label={`${Number(meal.price).toLocaleString('sr-RS')} RSD`} size="small" variant="outlined" />
            </Stack>
            {meal.description && (
              <Typography variant="body2" color="text.secondary">
                {meal.description}
              </Typography>
            )}
            {meal.note && (
              <Typography variant="caption" color="secondary.main">
                ⓘ {meal.note}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onEdit} aria-label="Izmeni">
            <EditIcon />
          </IconButton>
          <IconButton onClick={onDelete} aria-label="Obriši" color="error">
            <DeleteOutlineIcon />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  );
}
