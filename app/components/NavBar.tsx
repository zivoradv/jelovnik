'use client'

import CloseIcon from '@mui/icons-material/Close'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import ListAltIcon from '@mui/icons-material/ListAlt'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'
import SettingsIcon from '@mui/icons-material/Settings'
import SportsBarIcon from '@mui/icons-material/SportsBar'
import { Tooltip } from '@mui/material'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { type ReactNode, useRef, useState } from 'react'
import { fullName, initials } from '@/lib/users'
import { useAuth } from '../auth-context'
import { useFun } from '../fun-context'
import BrandMark from './BrandMark'
import NotificationBell from './NotificationBell'
import ThemePicker from './ThemePicker'
import ThemeToggle from './ThemeToggle'

type NavItem = {
    href: string
    label: string
    icon: ReactNode
    adminOnly?: boolean
    mobileOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
    { href: '/', label: 'Meni', icon: <RestaurantMenuIcon /> },
    { href: '/dug', label: 'Moj dug', icon: <ReceiptLongIcon /> },
    { href: '/pivo', label: 'Pivo', icon: <SportsBarIcon /> },
    { href: '/statistika', label: 'Statistika', icon: <EmojiEventsIcon /> },
    { href: '/profil', label: 'Profil', icon: <PersonOutlinedIcon />, mobileOnly: true },
    {
        href: '/admin?tab=porudzbine',
        label: 'Porudžbine',
        icon: <ListAltIcon />,
        adminOnly: true,
    },
    {
        href: '/admin?tab=raspored',
        label: 'Administracija',
        icon: <SettingsIcon />,
        adminOnly: true,
    },
]

export default function NavBar() {
    const { user, logout } = useAuth()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [drawerOpen, setDrawerOpen] = useState(false)
    const { toggleKafana } = useFun()
    const logoClicks = useRef<number[]>([])

    if (pathname === '/login' || pathname === '/register') {
        return null
    }

    function isActive(href: string): boolean {
        const [path, query] = href.split('?')
        if (pathname !== path) return false
        if (!query) return true
        const tab = new URLSearchParams(query).get('tab')
        const current = searchParams.get('tab') || 'raspored'
        return tab === current
    }

    const items = NAV_ITEMS.filter((i) => !i.adminOnly || user?.role === 'admin')
    const initial = user ? initials(user) : '?'
    const displayName = user ? fullName(user) : ''
    const desktopItems = items.filter((i) => !i.mobileOnly)

    function onLogoClick() {
        const now = Date.now()
        logoClicks.current = [...logoClicks.current.filter((t) => now - t < 3000), now]
        if (logoClicks.current.length >= 7) {
            logoClicks.current = []
            toggleKafana()
        }
    }

    return (
        <>
            <AppBar
                position="sticky"
                elevation={0}
                color="transparent"
                sx={(t) => ({
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    backgroundColor: `rgba(${t.vars.palette.background.defaultChannel} / 0.8)`,
                    borderBottom: `1px solid ${t.vars.palette.divider}`,
                })}
            >
                <Box>
                    <Toolbar sx={{ gap: 1, px: { xs: 2, sm: 3 }, minHeight: { xs: 62, sm: 70 } }}>
                        <Box
                            component={Link}
                            href="/"
                            sx={{
                                textDecoration: 'none',
                                color: 'inherit',
                                display: 'flex',
                                mr: 1,
                            }}
                            aria-label="Početna"
                            onClick={onLogoClick}
                        >
                            <BrandMark />
                        </Box>

                        <Box sx={{ flexGrow: 1 }} />

                        {user && (
                            <>
                                <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
                                    {desktopItems.map((item) => {
                                        const active = isActive(item.href)
                                        return (
                                            <Button
                                                key={item.href}
                                                component={Link}
                                                href={item.href}
                                                startIcon={item.icon}
                                                disableRipple
                                                sx={(t) => ({
                                                    px: 1.75,
                                                    py: 0.85,
                                                    color: active ? t.vars.palette.primary.main : t.vars.palette.text.secondary,
                                                    backgroundColor: active ? t.vars.palette.action.selected : 'transparent',
                                                    '&:hover': {
                                                        backgroundColor: active
                                                            ? t.vars.palette.action.selected
                                                            : t.vars.palette.action.hover,
                                                        color: active ? t.vars.palette.primary.main : t.vars.palette.text.primary,
                                                    },
                                                    '& .MuiButton-startIcon > *': { fontSize: 20 },
                                                })}
                                            >
                                                {item.label}
                                            </Button>
                                        )
                                    })}
                                </Stack>

                                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, mx: 1, my: 1.75 }} />
                            </>
                        )}

                        <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
                            <ThemePicker />
                            <ThemeToggle />
                        </Box>

                        {user && <NotificationBell />}

                        {user && (
                            <>
                                <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
                                    <Tooltip title="Idi do profila" placement="bottom">
                                        <Chip
                                            component={Link}
                                            href="/profil"
                                            clickable
                                            avatar={
                                                <Avatar
                                                    sx={(t) => ({
                                                        bgcolor: `${t.vars.palette.primary.main} !important`,
                                                        color: `${t.vars.palette.primary.contrastText} !important`,
                                                        fontWeight: 700,
                                                        fontSize: '0.8rem',
                                                    })}
                                                >
                                                    {initial}
                                                </Avatar>
                                            }
                                            label={displayName}
                                            variant="outlined"
                                            sx={{ pr: 0.5 }}
                                        />
                                    </Tooltip>
                                    <Tooltip title="Odjavi se" placement="bottom">
                                        <IconButton onClick={() => logout()} aria-label="Odjava" sx={{ color: 'text.secondary' }}>
                                            <LogoutIcon />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                                <IconButton
                                    edge="end"
                                    onClick={() => setDrawerOpen(true)}
                                    aria-label="Otvori meni"
                                    sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                                >
                                    <MenuIcon />
                                </IconButton>
                            </>
                        )}
                    </Toolbar>
                </Box>
            </AppBar>

            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                slotProps={{
                    paper: {
                        sx: {
                            width: 290,
                            borderTopLeftRadius: 20,
                            borderBottomLeftRadius: 20,
                            backgroundImage: 'none',
                        },
                    },
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Stack direction="row" sx={{ p: 2, pb: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
                        <BrandMark size="sm" />
                        <IconButton onClick={() => setDrawerOpen(false)} aria-label="Zatvori meni">
                            <CloseIcon />
                        </IconButton>
                    </Stack>

                    {user && (
                        <Stack
                            direction="row"
                            spacing={1.5}
                            sx={(t) => ({
                                mx: 2,
                                mb: 1,
                                p: 1.5,
                                alignItems: 'center',
                                borderRadius: 3,
                                bgcolor: t.vars.palette.action.hover,
                            })}
                        >
                            <Avatar
                                sx={(t) => ({
                                    bgcolor: t.vars.palette.primary.main,
                                    color: t.vars.palette.primary.contrastText,
                                    fontWeight: 700,
                                })}
                            >
                                {initial}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 600 }} noWrap>
                                    {displayName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    @{user.username} · {user.role === 'admin' ? 'Administrator' : 'Korisnik'}
                                </Typography>
                            </Box>
                        </Stack>
                    )}

                    <List sx={{ px: 1.5, py: 1, flexGrow: 1 }}>
                        {items.map((item) => {
                            const active = isActive(item.href)
                            return (
                                <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
                                    <ListItemButton
                                        component={Link}
                                        href={item.href}
                                        onClick={() => setDrawerOpen(false)}
                                        sx={(t) => ({
                                            borderRadius: 2.5,
                                            py: 1.25,
                                            color: active ? t.vars.palette.primary.main : 'inherit',
                                            bgcolor: active ? t.vars.palette.action.selected : 'transparent',
                                        })}
                                    >
                                        <ListItemIcon sx={{ minWidth: 40, color: active ? 'primary.main' : 'text.secondary' }}>
                                            {item.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={item.label}
                                            slotProps={{ primary: { sx: { fontWeight: active ? 700 : 500 } } }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            )
                        })}
                    </List>

                    <Divider />
                    <Stack
                        direction="row"
                        useFlexGap
                        sx={{ p: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
                    >
                        <ThemePicker withLabel />
                        <ThemeToggle withLabel />
                        <Button
                            onClick={() => {
                                setDrawerOpen(false)
                                logout()
                            }}
                            startIcon={<LogoutIcon />}
                            color="inherit"
                            sx={{ color: 'text.secondary' }}
                        >
                            Odjava
                        </Button>
                    </Stack>
                </Box>
            </Drawer>
        </>
    )
}
