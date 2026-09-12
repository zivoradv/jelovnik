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
  List,
  ListItem,
  ListItemText,
  Snackbar,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
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
  const [copied, setCopied] = useState(false);

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

  // Grupisanje po jelu
  const grouped = useMemo(() => {
    const map = new Map<
      number,
      { name: string; price: string; people: { username: string; note: string | null }[] }
    >();
    rows
      .filter((r) => r.mealId !== null)
      .forEach((r) => {
        const key = r.mealId as number;
        if (!map.has(key)) {
          map.set(key, { name: r.mealName || '—', price: r.price || '0', people: [] });
        }
        map.get(key)!.people.push({ username: r.username, note: r.note });
      });
    return Array.from(map.values()).sort((a, b) => b.people.length - a.people.length);
  }, [rows]);

  const customs = useMemo(
    () => rows.filter((r) => r.mealId === null && r.customText),
    [rows],
  );

  const totalPortions = rows.length;
  const uniqueUsers = new Set(rows.map((r) => r.userId)).size;

  function buildSummary(): string {
    const lines: string[] = [];
    lines.push(`Porudžbine za ${formatDateLong(fromISODate(date))}`);
    lines.push('');
    grouped.forEach((g) => {
      lines.push(`${g.name} — ${g.people.length}`);
      g.people.forEach((p) => {
        lines.push(`   • ${p.username}${p.note ? ` (${p.note})` : ''}`);
      });
    });
    if (customs.length > 0) {
      lines.push('');
      lines.push('Sopstvene porudžbine:');
      customs.forEach((c) => {
        lines.push(`   • ${c.username}: ${c.customText}`);
      });
    }
    lines.push('');
    lines.push(`Ukupno porcija: ${totalPortions} • Korisnika: ${uniqueUsers}`);
    return lines.join('\n');
  }

  async function copySummary() {
    await navigator.clipboard.writeText(buildSummary());
    setCopied(true);
  }

  function downloadCsv() {
    const header = 'Jelo,Korisnik,Napomena\n';
    const body = rows
      .map((r) => {
        const jelo = r.mealName || `Sopstveno: ${r.customText || ''}`;
        const napomena = r.note || '';
        const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
        return [esc(jelo), esc(r.username), esc(napomena)].join(',');
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
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<ContentCopyIcon />}
            onClick={copySummary}
            disabled={rows.length === 0}
            variant="outlined"
          >
            Kopiraj rezime
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
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip label={`Porcija: ${totalPortions}`} />
            <Chip label={`Korisnika: ${uniqueUsers}`} />
          </Stack>

          <Stack spacing={1.5}>
            {grouped.map((g) => (
              <Card key={g.name}>
                <CardContent>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>{g.name}</Typography>
                    <Chip label={`${g.people.length}×`} color="primary" />
                  </Stack>
                  <List dense disablePadding>
                    {g.people.map((p, i) => (
                      <ListItem key={i} disableGutters>
                        <ListItemText
                          primary={p.username}
                          secondary={p.note || undefined}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            ))}

            {customs.length > 0 && (
              <Card>
                <CardContent>
                  <Typography sx={{ fontWeight: 700, mb: 1 }}>
                    Sopstvene porudžbine
                  </Typography>
                  <Divider sx={{ mb: 1 }} />
                  <List dense disablePadding>
                    {customs.map((c) => (
                      <ListItem key={c.orderId} disableGutters>
                        <ListItemText primary={c.customText} secondary={c.username} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}
          </Stack>
        </>
      )}

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Rezime je kopiran."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
