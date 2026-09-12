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
  CircularProgress,
  Button,
  Divider,
  Tooltip,
  Snackbar,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DownloadIcon from '@mui/icons-material/Download';
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
          map.set(key, { name: r.mealName || '-', price: r.price || '0', portions: 0, people: [] });
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

  // Detaljan rezime (sa imenima) - za internu evidenciju.
  function buildSummary(): string {
    const lines: string[] = [];
    lines.push(`Porudžbine za ${formatDateLong(fromISODate(date))}`);
    lines.push('');
    grouped.forEach((g) => {
      lines.push(`${g.name} - ${g.portions}`);
      g.people.forEach((p) => {
        const q = p.qty > 1 ? ` (×${p.qty})` : '';
        const n = p.note ? ` - ${p.note}` : '';
        lines.push(`   • ${p.username}${q}${n}`);
      });
    });
    if (customGrouped.length > 0) {
      lines.push('');
      lines.push('Sopstvene porudžbine:');
      customs.forEach((c) => {
        const q = c.quantity > 1 ? ` (×${c.quantity})` : '';
        lines.push(`   • ${c.username}: ${c.customText}${q}`);
      });
    }
    lines.push('');
    lines.push(`Ukupno porcija: ${totalPortions} • Korisnika: ${uniqueUsers}`);
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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <TextField
          label="Datum"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
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
            Detaljno (sa imenima)
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

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : rows.length === 0 ? (
        <Alert severity="info">Za ovaj dan nema porudžbina.</Alert>
      ) : (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Chip color="primary" label={`Ukupno porcija: ${totalPortions}`} />
            <Chip variant="outlined" label={`Korisnika: ${uniqueUsers}`} />
            <Chip variant="outlined" label={`Različitih jela: ${grouped.length}`} />
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            }}
          >
            {grouped.map((g) => {
              const withNotes = g.people.filter((p) => p.note);
              return (
                <Card key={g.name} variant="outlined">
                  <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={1}
                      sx={{ mb: 1.5 }}
                    >
                      <Typography sx={{ fontWeight: 700 }}>{g.name}</Typography>
                      <Chip
                        label={`${g.portions} kom`}
                        color="primary"
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>

                    {/* Ljudi kao čipovi (kompaktno, bez dugog skrolovanja) */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {g.people.map((p, i) => {
                        const label = p.qty > 1 ? `${p.username} ×${p.qty}` : p.username;
                        return p.note ? (
                          <Tooltip key={i} title={p.note}>
                            <Chip size="small" label={`${label} ⓘ`} variant="outlined" />
                          </Tooltip>
                        ) : (
                          <Chip key={i} size="small" label={label} variant="outlined" />
                        );
                      })}
                    </Box>

                    {/* Napomene ispisane (za slučaj da tooltip nije praktičan na telefonu) */}
                    {withNotes.length > 0 && (
                      <Box sx={{ mt: 1.5 }}>
                        <Divider sx={{ mb: 1 }} />
                        <Stack spacing={0.25}>
                          {withNotes.map((p, i) => (
                            <Typography key={i} variant="caption" color="text.secondary">
                              <b>{p.username}:</b> {p.note}
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
              <Card variant="outlined" sx={{ gridColumn: { md: '1 / -1' } }}>
                <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                  <Typography sx={{ fontWeight: 700, mb: 1 }}>Sopstvene porudžbine</Typography>
                  <Divider sx={{ mb: 1 }} />
                  <Stack spacing={0.5}>
                    {customs.map((c) => (
                      <Typography key={c.orderId} variant="body2">
                        <b>{c.username}</b>
                        {c.quantity > 1 ? ` (×${c.quantity})` : ''}: {c.customText}
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
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}