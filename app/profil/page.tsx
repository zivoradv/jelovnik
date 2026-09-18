'use client'

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import FavoriteIcon from '@mui/icons-material/Favorite'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import SaveIcon from '@mui/icons-material/Save'
import ShieldIcon from '@mui/icons-material/Shield'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
    Alert,
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    IconButton,
    InputAdornment,
    Skeleton,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { type Badge, computeBadges, type UserStats } from '@/lib/badges'
import { formatDateLong } from '@/lib/date'
import { fullName, initials } from '@/lib/users'
import { useAuth } from '../auth-context'
import PageLoader from '../components/PageLoader'
import { ThemeList } from '../components/ThemePicker'
import ThemeToggle from '../components/ThemeToggle'

const TAGLINES = ['Ime, prezime, lozinka. Klasika.', 'Ko si ti zapravo?']

export default function ProfilPage() {
    const { user, loading, refresh } = useAuth()

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [username, setUsername] = useState('')
    const [profileError, setProfileError] = useState('')
    const [savingProfile, setSavingProfile] = useState(false)

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [newPassword2, setNewPassword2] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [passwordError, setPasswordError] = useState('')
    const [savingPassword, setSavingPassword] = useState(false)

    const [stats, setStats] = useState<UserStats | null>(null)
    const [badges, setBadges] = useState<Badge[]>([])
    const [toast, setToast] = useState('')
    const [tagline] = useState(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)])

    useEffect(() => {
        if (!user) return
        setFirstName(user.firstName)
        setLastName(user.lastName)
        setUsername(user.username)
    }, [user])

    useEffect(() => {
        if (!user) return
        fetch('/api/stats/me')
            .then((r) => r.json())
            .then((d) => {
                if (d.stats) {
                    setStats(d.stats)
                    setBadges(computeBadges(d.stats))
                }
            })
            .catch(() => {})
    }, [user])

    if (loading || !user) {
        return <PageLoader />
    }

    const profileDirty = firstName !== user.firstName || lastName !== user.lastName || username !== user.username
    const mismatch = newPassword2.length > 0 && newPassword !== newPassword2

    async function saveProfile(e: FormEvent) {
        e.preventDefault()
        setProfileError('')
        setSavingProfile(true)
        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, username }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Greška pri čuvanju profila.')
            await refresh()
            setToast('Profil je sačuvan.')
        } catch (err) {
            setProfileError(err instanceof Error ? err.message : 'Greška pri čuvanju profila.')
        } finally {
            setSavingProfile(false)
        }
    }

    async function savePassword(e: FormEvent) {
        e.preventDefault()
        setPasswordError('')
        if (newPassword !== newPassword2) {
            setPasswordError('Nove lozinke se ne poklapaju.')
            return
        }
        setSavingPassword(true)
        try {
            const res = await fetch('/api/profile/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Greška pri promeni lozinke.')
            setCurrentPassword('')
            setNewPassword('')
            setNewPassword2('')
            setToast('Lozinka je promenjena.')
        } catch (err) {
            setPasswordError(err instanceof Error ? err.message : 'Greška pri promeni lozinke.')
        } finally {
            setSavingPassword(false)
        }
    }

    const eyeAdornment = (
        <InputAdornment position="end">
            <IconButton
                onClick={() => setShowPassword((v) => !v)}
                edge="end"
                size="small"
                aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
            >
                {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
            </IconButton>
        </InputAdornment>
    )

    return (
        <Stack spacing={{ xs: 2.5, sm: 3 }}>
            <Card sx={(t) => ({ overflow: 'hidden', boxShadow: t.shadows[4] })}>
                <Box
                    sx={{
                        height: { xs: 64, sm: 84 },
                    }}
                />
                <CardContent sx={{ position: 'relative', pt: 0, px: { xs: 2.5, sm: 3.5 }, pb: { xs: 2.5, sm: 3 } }}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={{ xs: 1.5, sm: 2.5 }}
                        sx={{ alignItems: 'flex-start', mt: { xs: -5, sm: -6 } }}
                    >
                        <Avatar
                            sx={(t) => ({
                                width: { xs: 88, sm: 112 },
                                height: { xs: 88, sm: 112 },
                                fontSize: { xs: '1.8rem', sm: '2.3rem' },
                                fontWeight: 800,
                                bgcolor: t.vars.palette.background.default,
                                color: t.vars.palette.primary.main,
                                border: `4px solid ${t.vars.palette.background.paper}`,
                                boxShadow: t.shadows[3],
                            })}
                        >
                            {initials(user)}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flexGrow: 1, pt: { sm: 2 } }}>
                            <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                                <Typography variant="h4" sx={{ lineHeight: 1.1 }}>
                                    {fullName(user)}
                                </Typography>
                                {user.role === 'admin' ? (
                                    <Chip size="small" color="primary" icon={<ShieldIcon />} label="Administrator" />
                                ) : (
                                    <Chip size="small" variant="outlined" label="Korisnik" />
                                )}
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                @{user.username}
                                {user.createdAt && ` · član od ${formatDateLong(new Date(user.createdAt))}`}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.75, fontStyle: 'italic', color: 'text.secondary' }}>
                                {tagline}
                            </Typography>
                        </Box>
                    </Stack>

                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.25, mt: 3 }}>
                        <StatTile
                            icon={<CalendarMonthIcon fontSize="small" />}
                            label="Dana naručeno"
                            value={stats ? String(stats.days) : null}
                        />
                        <StatTile
                            icon={<RestaurantIcon fontSize="small" />}
                            label="Porcija ukupno"
                            value={stats ? String(stats.portions) : null}
                        />
                        <StatTile
                            icon={<LocalFireDepartmentIcon fontSize="small" />}
                            label="Niz radnih dana"
                            value={stats ? String(stats.streak) : null}
                            hint={stats && stats.streak >= 5 ? 'Na vatri!' : undefined}
                        />
                        <StatTile
                            icon={<FavoriteIcon fontSize="small" />}
                            label="Omiljeno jelo"
                            value={stats ? (stats.favorite ? stats.favorite.name : '—') : null}
                            hint={stats?.favorite ? `${stats.favorite.count}× naručeno` : undefined}
                            small
                        />
                    </Box>
                </CardContent>
            </Card>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: { xs: 2.5, sm: 3 },
                    alignItems: 'stretch',
                }}
            >
                <Card>
                    <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                        <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                            <PersonOutlinedIcon color="primary" fontSize="small" />
                            <Typography variant="h6">Podaci o nalogu</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                            Ime i prezime vidi administrator uz porudžbine — unesi ih tačno. Korisničko ime je jedinstveno i koristi se za
                            prijavu.
                        </Typography>

                        <form onSubmit={saveProfile}>
                            <Stack spacing={2}>
                                {profileError && <Alert severity="error">{profileError}</Alert>}
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                    <TextField
                                        label="Ime"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        fullWidth
                                        autoComplete="given-name"
                                    />
                                    <TextField
                                        label="Prezime"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        fullWidth
                                        autoComplete="family-name"
                                    />
                                </Stack>
                                <TextField
                                    label="Korisničko ime"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    fullWidth
                                    autoComplete="username"
                                    slotProps={{ input: { startAdornment: <InputAdornment position="start">@</InputAdornment> } }}
                                    helperText="3–30 znakova: slova, brojevi, tačka, crtica, donja crta."
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    startIcon={<SaveIcon />}
                                    disabled={savingProfile || !profileDirty || !firstName.trim() || !lastName.trim() || !username.trim()}
                                    sx={{ alignSelf: 'flex-start' }}
                                >
                                    {savingProfile ? 'Čuvanje…' : 'Sačuvaj izmene'}
                                </Button>
                            </Stack>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                        <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                            <LockOutlinedIcon color="primary" fontSize="small" />
                            <Typography variant="h6">Promena lozinke</Typography>
                        </Stack>

                        <form onSubmit={savePassword}>
                            <Stack spacing={2}>
                                {passwordError && <Alert severity="error">{passwordError}</Alert>}
                                <TextField
                                    label="Trenutna lozinka"
                                    type={showPassword ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    fullWidth
                                    autoComplete="current-password"
                                    slotProps={{ input: { endAdornment: eyeAdornment } }}
                                />
                                <Divider sx={{ borderStyle: 'dashed' }} />
                                <TextField
                                    label="Nova lozinka"
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    fullWidth
                                    autoComplete="new-password"
                                    helperText="Najmanje 4 karaktera"
                                />
                                <TextField
                                    label="Potvrda nove lozinke"
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword2}
                                    onChange={(e) => setNewPassword2(e.target.value)}
                                    required
                                    fullWidth
                                    autoComplete="new-password"
                                    error={mismatch}
                                    helperText={mismatch ? 'Lozinke se ne poklapaju.' : ' '}
                                />
                                <Button
                                    type="submit"
                                    variant="outlined"
                                    startIcon={<LockOutlinedIcon />}
                                    disabled={savingPassword || mismatch || !currentPassword || newPassword.length < 4}
                                    sx={{ alignSelf: 'flex-start' }}
                                >
                                    {savingPassword ? 'Čuvanje…' : 'Promeni lozinku'}
                                </Button>
                            </Stack>
                        </form>
                    </CardContent>
                </Card>
            </Box>

            <Card>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                    <Stack direction="row" sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <PaletteOutlinedIcon color="primary" fontSize="small" />
                            <Typography variant="h6">Izgled aplikacije</Typography>
                        </Stack>
                        <ThemeToggle withLabel />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Izaberi temu koja ti prija – pamti se na ovom uređaju. Svetlo/tamno biraš posebno.
                    </Typography>
                    <ThemeList />
                </CardContent>
            </Card>

            {badges.length > 0 && <BadgesCard badges={badges} />}

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
        </Stack>
    )
}

function StatTile({
    icon,
    label,
    value,
    hint,
    small,
}: {
    icon: ReactNode
    label: string
    value: string | null
    hint?: string
    small?: boolean
}) {
    return (
        <Box
            sx={(t) => ({
                p: 1.25,
                borderRadius: 1,
                border: '1.5px solid',
                borderColor: t.vars.palette.divider,
                bgcolor: t.vars.palette.action.hover,
                minWidth: 0,
            })}
        >
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'primary.main', mb: 0.5 }}>
                {icon}
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: '0.02em' }}>
                    {label}
                </Typography>
            </Stack>
            <Divider sx={{ my: 1 }} />
            {value === null ? (
                <Skeleton variant="text" width={60} height={32} />
            ) : (
                <Typography
                    title={value}
                    sx={{
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 700,
                        fontSize: small ? '1.05rem' : '1.7rem',
                        lineHeight: 1.2,
                        overflowWrap: 'anywhere',
                    }}
                >
                    {value}
                </Typography>
            )}
            {hint && (
                <Typography variant="caption" color="text.secondary">
                    {hint}
                </Typography>
            )}
        </Box>
    )
}

function BadgesCard({ badges }: { badges: Badge[] }) {
    const earned = badges.filter((b) => b.earned).length
    return (
        <Card>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 2 }}>
                    <Typography variant="h6">Tvoje zasluge</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {earned} / {badges.length}
                    </Typography>
                </Stack>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                    {badges.map((b) => (
                        <Stack
                            key={b.id}
                            direction="row"
                            spacing={1.5}
                            sx={(t) => ({
                                p: 1.5,
                                borderRadius: 2.5,
                                border: '1.5px solid',
                                borderColor: b.earned ? 'primary.light' : t.vars.palette.divider,
                                opacity: b.earned ? 1 : 0.5,
                                filter: b.earned ? 'none' : 'grayscale(1)',
                                alignItems: 'center',
                            })}
                        >
                            <Typography sx={{ fontSize: 28, lineHeight: 1 }}>{b.emoji}</Typography>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 600, lineHeight: 1.3 }}>{b.title}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {b.description}
                                </Typography>
                            </Box>
                        </Stack>
                    ))}
                </Box>
            </CardContent>
        </Card>
    )
}
