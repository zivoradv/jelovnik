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
  CircularProgress,
  Alert,
  Divider,
  Skeleton,
  Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { fromISODate, formatDateLong } from '@/lib/date';

interface DebtRow {
  date: string;
  total: number;
  mealCount: number;
  customCount: number;
  paid: boolean;
}

function rsd(n: number) {
  return `${n.toLocaleString('sr-RS')} RSD`;
}

export default function DugPage() {
  const [rows, setRows] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments');
      const data = await res.json();
      setRows(data.rows || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePaid(date: string, paid: boolean) {
    setSaving(date);
    setError('');
    // optimistički update
    setRows((prev) => prev.map((r) => (r.date === date ? { ...r, paid } : r)));
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, paid }),
      });
      if (!res.ok) {
        // vrati staro stanje ako je greška
        setRows((prev) => prev.map((r) => (r.date === date ? { ...r, paid: !paid } : r)));
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Greška pri čuvanju.');
      }
    } finally {
      setSaving(null);
    }
  }

  const { unpaidTotal, paidTotal, unpaidCount } = useMemo(() => {
    let unpaid = 0;
    let paid = 0;
    let count = 0;
    for (const r of rows) {
      if (r.paid) paid += r.total;
      else {
        unpaid += r.total;
        count += 1;
      }
    }
    return { unpaidTotal: unpaid, paidTotal: paid, unpaidCount: count };
  }, [rows]);

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="text" width={160} height={40} />
        <Skeleton variant="rounded" height={132} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={76} />
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={{ xs: 2.5, sm: 3 }}>
      <Box>
        <Typography variant="h4" sx={{ mb: 0.5 }}>
          Moj dug
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Pregled porudžbina po danima. Označi dan kao plaćen kada izmiriš račun.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Zbirni pregled */}
      <Card
        sx={(t) => ({
          boxShadow: t.shadows[3],
          overflow: 'hidden',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 5,
            bgcolor: unpaidTotal > 0 ? 'primary.main' : 'success.main',
          },
        })}
      >
        <CardContent sx={{ p: { xs: 2.5, sm: 3 }, pl: { xs: 3, sm: 3.5 } }}>
          <Typography variant="overline" color="text.secondary">
            Za plaćanje
          </Typography>
          <Stack
            direction="row"
            alignItems="baseline"
            spacing={1.5}
            flexWrap="wrap"
            useFlexGap
          >
            {/* Glavni broj ide u sans pismu - serif na ovoj velicini deluje kao ukras. */}
            <Typography
              component="p"
              sx={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: unpaidTotal > 0 ? 'primary.main' : 'success.main',
                fontSize: 'clamp(2rem, 1.5rem + 2.4vw, 2.75rem)',
                lineHeight: 1.1,
              }}
            >
              {rsd(unpaidTotal)}
            </Typography>
            {unpaidCount > 0 && (
              <Chip
                size="small"
                variant="outlined"
                label={`${unpaidCount} ${unpaidCount === 1 ? 'dan' : 'dana'}`}
              />
            )}
          </Stack>

          <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <CheckCircleIcon fontSize="small" sx={{ color: 'success.main' }} />
              <Typography variant="body2" color="text.secondary">
                Već plaćeno
              </Typography>
            </Stack>
            <Typography sx={{ fontWeight: 600, color: 'success.main' }}>
              {rsd(paidTotal)}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Card sx={{ py: 6, px: 3, textAlign: 'center' }}>
          <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Još nema porudžbina
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Kada naručiš prvi obrok, račun će se pojaviti ovde.
          </Typography>
        </Card>
      ) : (
        <Stack spacing={1.25}>
          {rows.map((r) => (
            <Card
              key={r.date}
              sx={(t) => ({
                opacity: r.paid ? 0.72 : 1,
                bgcolor: r.paid ? t.vars.palette.action.hover : undefined,
                '&:hover': { borderColor: 'primary.light' },
              })}
            >
              <CardContent sx={{ '&:last-child': { pb: 2 }, py: 1.75 }}>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        textDecoration: r.paid ? 'line-through' : 'none',
                        textDecorationColor: 'rgba(130,116,102,0.5)',
                      }}
                    >
                      {formatDateLong(fromISODate(r.date))}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mt: 0.5 }}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: r.paid ? 'text.secondary' : 'primary.main' }}
                      >
                        {rsd(r.total)}
                      </Typography>
                      {r.mealCount > 0 && (
                        <Chip
                          size="small"
                          label={`${r.mealCount} jela`}
                          variant="outlined"
                          sx={{ color: 'text.secondary' }}
                        />
                      )}
                      {r.customCount > 0 && (
                        <Chip
                          size="small"
                          color="warning"
                          variant="outlined"
                          label={`${r.customCount} bez cene`}
                        />
                      )}
                    </Stack>
                  </Box>

                  <Tooltip title={r.paid ? 'Označi kao neplaćeno' : 'Označi kao plaćeno'}>
                    <Checkbox
                      checked={r.paid}
                      disabled={saving === r.date}
                      onChange={(e) => togglePaid(r.date, e.target.checked)}
                      icon={<RadioButtonUncheckedIcon />}
                      checkedIcon={<CheckCircleIcon />}
                      sx={{
                        color: 'text.disabled',
                        '&.Mui-checked': { color: 'success.main' },
                      }}
                      inputProps={{ 'aria-label': 'Plaćeno' }}
                    />
                  </Tooltip>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {rows.some((r) => r.customCount > 0) && (
        <Alert severity="info">
          Sopstvene porudžbine nemaju cenu u meniju, pa nisu uracunate u iznos. Njih
          dogovorite zasebno.
        </Alert>
      )}
    </Stack>
  );
}
