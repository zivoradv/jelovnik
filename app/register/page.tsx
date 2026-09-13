'use client'

import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Alert, Box, Button, Card, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { useAuth } from '../auth-context'
import BrandMark from '../components/BrandMark'
import ThemeToggle from '../components/ThemeToggle'

export default function RegisterPage() {
    const { register } = useAuth()
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [password2, setPassword2] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const mismatch = password2.length > 0 && password !== password2

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError('')
        if (password !== password2) {
            setError('Lozinke se ne poklapaju.')
            return
        }
        setBusy(true)
        try {
            await register(username, password)
            router.replace('/')
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Greška pri registraciji.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Box
            sx={{
                minHeight: '82dvh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
            }}
        >
            <Box sx={{ position: 'absolute', top: 0, right: 0 }}>
                <ThemeToggle />
            </Box>

            <Card
                sx={(t) => ({
                    p: { xs: 3, sm: 4 },
                    width: '100%',
                    maxWidth: 420,
                    boxShadow: t.shadows[5],
                })}
            >
                <Stack spacing={1} sx={{ mb: 3.5, alignItems: 'center' }}>
                    <BrandMark size="lg" showText={false} />
                    <Typography variant="h5" sx={{ mt: 1.5 }}>
                        Napravite nalog
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center">
                        First time for everything, ey?
                    </Typography>
                </Stack>

                <form onSubmit={handleSubmit}>
                    <Stack spacing={2}>
                        {error && <Alert severity="error">{error}</Alert>}

                        <TextField
                            label="Korisničko ime"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoFocus
                            required
                            fullWidth
                            autoComplete="username"
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonOutlinedIcon fontSize="small" color="disabled" />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />

                        <TextField
                            label="Lozinka"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            fullWidth
                            autoComplete="new-password"
                            helperText="Najmanje 4 karaktera"
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockOutlinedIcon fontSize="small" color="disabled" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={() => setShowPassword((v) => !v)}
                                                edge="end"
                                                size="small"
                                                aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                                            >
                                                {showPassword ? (
                                                    <VisibilityOffOutlinedIcon fontSize="small" />
                                                ) : (
                                                    <VisibilityOutlinedIcon fontSize="small" />
                                                )}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />

                        <TextField
                            label="Potvrda lozinke"
                            type={showPassword ? 'text' : 'password'}
                            value={password2}
                            onChange={(e) => setPassword2(e.target.value)}
                            required
                            fullWidth
                            autoComplete="new-password"
                            error={mismatch}
                            helperText={mismatch ? 'Lozinke se ne poklapaju.' : ' '}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LockOutlinedIcon fontSize="small" color="disabled" />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={busy || mismatch}
                            fullWidth
                            startIcon={busy ? undefined : <PersonAddAltIcon />}
                        >
                            {busy ? 'Kreiranje…' : 'Registruj se'}
                        </Button>

                        <Typography variant="body2" align="center" color="text.secondary">
                            Već imate nalog?{' '}
                            <Box
                                component={Link}
                                href="/login"
                                sx={{
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    textDecoration: 'none',
                                    '&:hover': { textDecoration: 'underline' },
                                }}
                            >
                                Prijavite se
                            </Box>
                        </Typography>
                    </Stack>
                </form>
            </Card>
        </Box>
    )
}
