'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  TextField,
  Card,
  CardContent,
  Chip,
  Alert,
  Button,
  Divider,
  Tooltip,
  Snackbar,
  Skeleton,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DownloadIcon from '@mui/icons-material/Download';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import GroupIcon from '@mui/icons-material/Group';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { toISODate, fromISODate, formatDateLong } from '@/lib/date';

interface Row {
  orderId: number;
  userId: number;
  username: string;
  mealId: number | null;
  mealName: string | null;
  category: string | null;
  price: string | null;
  customText: string | null;
  note: string | null;
  quantity: number;
}

interface Person {
  username: string;
  note: string | null;
  qty: number;
}
interface Group {
  name: string;
  price: string;
  portions: number;
  people: Person[];
}

function defaultDate(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  if (dow === 0) d.setDate(d.getDate() + 1);
  if (dow === 6) d.setDate(d.getDate() + 2);
  return toISODate(d);
}

export default function OrdersAdmin() {
  const [date, setDate] = useState<string>(defaultDate());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  const load = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders?date=${d}`);
      const data = await res.json();
      setRows(data.rows || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  // Grupisanje po jelu (sa količinama).
  const grouped: Group[] = useMemo(() => {
    const map = new Map<number, Group>();
    rows
      .filter((r) => r.mealId !== null)
      .forEach((r) => {
        const key = r.mealId as number;
        if (!map.has(key)) {
          map.set(key, {
            name: r.mealName || '-',
            price: r.price || '0',
            portions: 0,
            people: [],
          });
        }
        const g = map.get(key)!;
        g.portions += r.quantity;
        g.people.push({ username: r.username, note: r.note, qty: r.quantity });
      });
    return Array.from(map.values()).sort((a, b) => b.portions - a.portions);
  }, [rows]);

  // Sopstvene porudžbine (grupisane po tekstu za rezime dostavljaču).
  const customs = useMemo(
    () => rows.filter((r) => r.mealId === null && r.customText),
    [rows],
  );
  const customGrouped = useMemo(() => {
    const map = new Map<string, number>();
    customs.forEach((c) => {
      const t = (c.customText || '').trim();
      map.set(t, (map.get(t) || 0) + c.quantity);
    });
    return Array.from(map.entries()).map(([text, qty]) => ({ text, qty }));
  }, [customs]);

  const totalPortions =
    grouped.reduce((a, g) => a + g.portions, 0) +
    customs.reduce((a, c) => a + c.quantity, 0);
  const uniqueUsers = new Set(rows.map((r) => r.userId)).size;

  // Najveći broj porcija - koristi se za dužinu trake u kartici jela.
  const maxPortions = grouped.length > 0 ? grouped[0].portions : 0;

  // Detaljan rezime (sa imenima) - za internu evidenciju.
  function buildSummary(): string {
    const lines: string[] = [];
    lines.push(`Porudžbine za ${formatDateLong(fromISODate(date))}`);
    lines.push('');
    grouped.forEach((g) => {
      lines.push(`${g.name} - ${g.portions}`);
      g.people.forEach((p) => {
        const q = p.qty > 1 ? ` (x${p.qty})` : '';
        const n = p.note ? ` - ${p.note}` : '';
        lines.push(`   - ${p.username}${q}${n}`);
      });
    });
    if (customGrouped.length > 0) {
      lines.push('');
      lines.push('Sopstvene porudžbine:');
      customs.forEach((c) => {
        const q = c.quantity > 1 ? ` (x${c.quantity})` : '';
        lines.push(`   - ${c.username}: ${c.customText}${q}`);
      });
    }
    lines.push('');
    lines.push(`Ukupno porcija: ${totalPortions} - Korisnika: ${uniqueUsers}`);
    return lines.join('\n');
  }

  // Jednostavan rezime (bez imena) - za dostavljača.
  function buildDeliverySummary(): string {
    const lines: string[] = [];
    lines.push(`Porudžbina za ${formatDateLong(fromISODate(date))}`);
    lines.push('');
    grouped.forEach((g) => {
      lines.push(`${g.name} - ${g.portions}`);
    });
    if (customGrouped.length > 0) {
      customGrouped.forEach((c) => {
        lines.push(`${c.text} - ${c.qty}`);
      });
    }
    lines.push('');
    lines.push(`Ukupno: ${totalPortions}`);
    return lines.join('\n');
  }

  async function copy(text: string, msg: string) {
    await navigator.clipboard.writeText(text);
    setToast(msg);
  }

  function downloadCsv() {
    const header = 'Jelo,Kolicina,Korisnik,Napomena\n';
    const body = rows
      .map((r) => {
        const jelo = r.mealName || `Sopstveno: ${r.customText || ''}`;
        const napomena = r.note || '';
        const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
        return [esc(jelo), r.quantity, esc(r.username), esc(napomena)].join(',');
      })
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `porudzbine-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Box>
      <Card sx={{ p: { xs: 2, sm: 2.5 }, mb: 2.5 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ md: 'center' }}
          justifyContent="space-between"
        >
          <TextField
            label="Datum"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 190 }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              startIcon={<LocalShippingIcon />}
              onClick={() =>
                copy(buildDeliverySummary(), 'Rezime za dostavljača je kopiran.')
              }
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
            <Button
              startIcon={<DownloadIcon />}
              onClick={downloadCsv}
              disabled={rows.length === 0}
              variant="outlined"
            >
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
          {/* Zbirni brojevi */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 1.5,
              mb: 2.5,
            }}
          >
            <StatTile
              label="Ukupno porcija"
              value={totalPortions}
              icon={<RestaurantIcon fontSize="small" />}
            />
            <StatTile
              label="Korisnika"
              value={uniqueUsers}
              icon={<GroupIcon fontSize="small" />}
            />
            <StatTile
              label="Različitih jela"
              value={grouped.length}
              icon={<MenuBookIcon fontSize="small" />}
            />
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
              const withNotes = g.people.filter((p) => p.note);
              const share = maxPortions > 0 ? (g.portions / maxPortions) * 100 : 0;
              return (
                <Card key={g.name}>
                  <CardContent sx={{ '&:last-child': { pb: 2.25 } }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1.5}
                      sx={{ mb: 1.25 }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>{g.name}</Typography>
                      <Chip
                        label={`${g.portions} kom`}
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 700, flexShrink: 0 }}
                      />
                    </Stack>

                    {/* Ljudi kao čipovi (kompaktno, bez dugog skrolovanja) */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {g.people.map((p, i) => {
                        const label = p.qty > 1 ? `${p.username} x${p.qty}` : p.username;
                        return p.note ? (
                          <Tooltip key={i} title={p.note}>
                            <Chip
                              size="small"
                              label={label}
                              variant="outlined"
                              sx={{ borderStyle: 'dashed' }}
                            />
                          </Tooltip>
                        ) : (
                          <Chip key={i} size="small" label={label} variant="outlined" />
                        );
                      })}
                    </Box>

                    {/* Napomene ispisane (tooltip nije praktično na telefonu) */}
                    {withNotes.length > 0 && (
                      <Box sx={{ mt: 1.75 }}>
                        <Divider sx={{ mb: 1 }} />
                        <Stack spacing={0.4}>
                          {withNotes.map((p, i) => (
                            <Typography
                              key={i}
                              variant="caption"
                              color="text.secondary"
                            >
                              <Box component="b" sx={{ color: 'text.primary' }}>
                                {p.username}:
                              </Box>{' '}
                              {p.note}
                            </Typography>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {customGrouped.length > 0 && (
              <Card sx={{ gridColumn: { md: '1 / -1' } }}>
                <CardContent sx={{ '&:last-child': { pb: 2.25 } }}>
                  <Typography sx={{ fontWeight: 700, mb: 1.25 }}>
                    Sopstvene porudžbine
                  </Typography>
                  <Divider sx={{ mb: 1.25 }} />
                  <Stack spacing={0.75}>
                    {customs.map((c) => (
                      <Typography key={c.orderId} variant="body2">
                        <Box component="b" sx={{ color: 'primary.main' }}>
                          {c.username}
                        </Box>
                        {c.quantity > 1 ? ` (x${c.quantity})` : ''}: {c.customText}
                      </Typography>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}
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
  );
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card sx={{ px: 2, py: 1.75 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
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
  );
}
