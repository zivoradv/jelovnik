'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box,
    Stack,
    Typography,
    Card,
    CardContent,
    Checkbox,
    FormControlLabel,
    Chip,
    CircularProgress,
    Alert,
    Divider,
} from '@mui/material';
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

    const { unpaidTotal, paidTotal } = useMemo(() => {
        let unpaid = 0;
        let paid = 0;
        for (const r of rows) {
            if (r.paid) paid += r.total;
            else unpaid += r.total;
        }
        return { unpaidTotal: unpaid, paidTotal: paid };
    }, [rows]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ py: 2 }}>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                Moj dug
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Zbirni pregled */}
            <Card sx={{ mb: 3, bgcolor: 'action.hover' }}>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography color="text.secondary">Za plaćanje</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }} color="error.main">
                            {rsd(unpaidTotal)}
                        </Typography>
                    </Stack>
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography color="text.secondary">Već plaćeno</Typography>
                        <Typography color="success.main">{rsd(paidTotal)}</Typography>
                    </Stack>
                </CardContent>
            </Card>

            {rows.length === 0 ? (
                <Typography color="text.secondary">Još nemate nijednu porudžbinu.</Typography>
            ) : (
                <Stack spacing={1}>
                    {rows.map((r) => (
                        <Card key={r.date} variant="outlined">
                            <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                                <Stack
                                    direction="row"
                                    spacing={2}
                                    alignItems="center"
                                    justifyContent="space-between"
                                >
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography sx={{ fontWeight: 600 }}>
                                            {formatDateLong(fromISODate(r.date))}
                                        </Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap">
                                            <Typography variant="body2" color="text.secondary">
                                                {rsd(r.total)}
                                            </Typography>
                                            {r.mealCount > 0 && (
                                                <Chip size="small" label={`${r.mealCount} jela`} variant="outlined" />
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
                                    <FormControlLabel
                                        sx={{ mr: 0 }}
                                        control={
                                            <Checkbox
                                                checked={r.paid}
                                                disabled={saving === r.date}
                                                onChange={(e) => togglePaid(r.date, e.target.checked)}
                                            />
                                        }
                                        label="Plaćeno"
                                    />
                                </Stack>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            )}

            {rows.some((r) => r.customCount > 0) && (
                <Alert severity="info" sx={{ mt: 3 }}>
                    Sopstvene porudžbine nemaju cenu u meniju, pa nisu uračunate u iznos. Njih dogovorite
                    zasebno.
                </Alert>
            )}
        </Box>
    );
}