'use client'

import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import ShieldIcon from '@mui/icons-material/Shield'
import {
    Alert,
    Avatar,
    Box,
    Card,
    CardContent,
    Chip,
    IconButton,
    MenuItem,
    Skeleton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth-context'

interface U {
    id: number
    username: string
    role: 'admin' | 'user'
    createdAt: string
}

export default function UsersAdmin() {
    const { user: me } = useAuth()
    const [users, setUsers] = useState<U[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/users')
            const data = await res.json()
            setUsers(data.users || [])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    async function changeRole(id: number, role: 'admin' | 'user') {
        setError('')
        const res = await fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, role }),
        })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data.error || 'Greška pri izmeni uloge.')
            return
        }
        await load()
    }

    async function remove(id: number) {
        if (!confirm('Obrisati ovog korisnika i sve njegove porudžbine?')) return
        const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
        if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            setError(data.error || 'Greška pri brisanju.')
            return
        }
        await load()
    }

    if (loading) {
        return (
            <Stack spacing={1.25}>
                <Skeleton variant="text" width={160} height={36} />
                {[0, 1, 2].map((i) => (
                    <Skeleton key={i} variant="rounded" height={76} />
                ))}
            </Stack>
        )
    }

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 2.5 }}>
                Korisnici ({users.length})
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Stack spacing={1.25}>
                {users.map((u) => {
                    const isMe = me?.id === u.id
                    return (
                        <Card key={u.id} sx={{ '&:hover': { borderColor: 'primary.light' } }}>
                            <CardContent sx={{ '&:last-child': { pb: 1.75 }, py: 1.75 }}>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={{ xs: 1.5, sm: 2 }}
                                    sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
                                >
                                    <Stack direction="row" spacing={1.5} sx={{ flexGrow: 1, minWidth: 0, alignItems: 'center' }}>
                                        <Avatar
                                            sx={(t) => ({
                                                width: 38,
                                                height: 38,
                                                fontWeight: 700,
                                                fontSize: '0.95rem',
                                                bgcolor: u.role === 'admin' ? t.vars.palette.primary.main : t.vars.palette.action.selected,
                                                color:
                                                    u.role === 'admin'
                                                        ? t.vars.palette.primary.contrastText
                                                        : t.vars.palette.text.secondary,
                                            })}
                                        >
                                            {u.username[0]?.toUpperCase() ?? '?'}
                                        </Avatar>

                                        <Box sx={{ minWidth: 0 }}>
                                            <Stack
                                                direction="row"
                                                spacing={0.75}
                                                useFlexGap
                                                sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                                            >
                                                <Typography sx={{ fontWeight: 600 }} noWrap>
                                                    {u.username}
                                                </Typography>
                                                {isMe && <Chip label="vi" size="small" variant="outlined" />}
                                                {u.role === 'admin' && (
                                                    <Chip
                                                        icon={<ShieldIcon />}
                                                        label="admin"
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                    </Stack>

                                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                        <TextField
                                            select
                                            size="small"
                                            label="Uloga"
                                            value={u.role}
                                            onChange={(e) => changeRole(u.id, e.target.value as 'admin' | 'user')}
                                            sx={{ minWidth: 150, flexGrow: { xs: 1, sm: 0 } }}
                                        >
                                            <MenuItem value="user">Korisnik</MenuItem>
                                            <MenuItem value="admin">Administrator</MenuItem>
                                        </TextField>

                                        <Tooltip title={isMe ? 'Ne možete obrisati sebe' : 'Obriši korisnika'}>
                                            <span>
                                                <IconButton
                                                    aria-label="Obriši"
                                                    disabled={isMe}
                                                    onClick={() => remove(u.id)}
                                                    sx={{
                                                        color: 'text.secondary',
                                                        '&:hover': { color: 'error.main' },
                                                    }}
                                                >
                                                    <DeleteOutlinedIcon />
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
        </Box>
    )
}
