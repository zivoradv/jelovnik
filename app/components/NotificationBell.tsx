'use client'

import DoneAllIcon from '@mui/icons-material/DoneAll'
import EventNoteIcon from '@mui/icons-material/EventNote'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import SportsBarIcon from '@mui/icons-material/SportsBar'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItemButton from '@mui/material/ListItemButton'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useRouter } from 'next/navigation'
import { type ReactNode, useCallback, useEffect, useState } from 'react'

export interface NotificationItem {
    id: number
    type: 'raspored' | 'jelo' | 'dug' | 'uplata' | 'info' | 'pivo'
    title: string
    body: string
    link: string | null
    readAt: string | null
    createdAt: string
}

const ICONS: Record<NotificationItem['type'], ReactNode> = {
    raspored: <EventNoteIcon fontSize="small" />,
    jelo: <RestaurantIcon fontSize="small" />,
    dug: <ReceiptLongIcon fontSize="small" />,
    uplata: <PaidOutlinedIcon fontSize="small" />,
    info: <InfoOutlinedIcon fontSize="small" />,
    pivo: <SportsBarIcon fontSize="small" />,
}

const POLL_MS = 60_000

function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.round(diff / 60_000)
    if (min < 1) return 'upravo sada'
    if (min < 60) return `pre ${min} min`
    const h = Math.round(min / 60)
    if (h < 24) return `pre ${h} h`
    const d = Math.round(h / 24)
    if (d === 1) return 'juče'
    return `pre ${d} dana`
}

export default function NotificationBell() {
    const router = useRouter()
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)
    const [items, setItems] = useState<NotificationItem[]>([])
    const [unread, setUnread] = useState(0)

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications')
            if (!res.ok) return
            const data = await res.json()
            setItems(data.notifications || [])
            setUnread(data.unread || 0)
        } catch {}
    }, [])

    useEffect(() => {
        load()
        const id = setInterval(load, POLL_MS)
        const onFocus = () => load()
        window.addEventListener('focus', onFocus)
        return () => {
            clearInterval(id)
            window.removeEventListener('focus', onFocus)
        }
    }, [load])

    async function markAll() {
        setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })))
        setUnread(0)
        try {
            await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        } catch {}
    }

    async function open(n: NotificationItem) {
        setAnchor(null)
        if (!n.readAt) {
            setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)))
            setUnread((u) => Math.max(0, u - 1))
            try {
                await fetch('/api/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: [n.id] }),
                })
            } catch {}
        }
        if (n.link) router.push(n.link)
    }

    return (
        <>
            <Tooltip title="Obaveštenja">
                <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Obaveštenja" sx={{ color: 'text.secondary' }}>
                    <Badge badgeContent={unread} color="primary" max={99}>
                        <NotificationsNoneIcon />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Popover
                open={Boolean(anchor)}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { sx: { width: 'min(380px, calc(100vw - 32px))', borderRadius: 1, mt: 1 } } }}
            >
                <Stack direction="row" sx={{ px: 2, py: 1.5, alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Obaveštenja
                    </Typography>
                    {unread > 0 && (
                        <Button size="small" startIcon={<DoneAllIcon />} onClick={markAll} sx={{ py: 0 }}>
                            Pročitano
                        </Button>
                    )}
                </Stack>
                <Divider />

                {items.length === 0 ? (
                    <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Nema obaveštenja. Tišina pre ručka.
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
                        {items.map((n) => {
                            const isUnread = !n.readAt
                            return (
                                <ListItemButton
                                    key={n.id}
                                    onClick={() => open(n)}
                                    sx={(t) => ({
                                        alignItems: 'flex-start',
                                        gap: 1.5,
                                        px: 2,
                                        py: 1.25,
                                        bgcolor: isUnread ? t.vars.palette.action.hover : 'transparent',
                                        borderBottom: `1px solid ${t.vars.palette.divider}`,
                                    })}
                                >
                                    <Box sx={{ mt: 0.25, color: isUnread ? 'primary.main' : 'text.disabled', display: 'flex' }}>
                                        {ICONS[n.type]}
                                    </Box>
                                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: isUnread ? 700 : 500, lineHeight: 1.35 }}>
                                            {n.title}
                                        </Typography>
                                        {n.body && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                                                {n.body}
                                            </Typography>
                                        )}
                                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                                            {relativeTime(n.createdAt)}
                                        </Typography>
                                    </Box>
                                    {isUnread && (
                                        <Box
                                            sx={{
                                                width: 8,
                                                height: 8,
                                                mt: 0.75,
                                                borderRadius: '50%',
                                                bgcolor: 'primary.main',
                                                flexShrink: 0,
                                            }}
                                        />
                                    )}
                                </ListItemButton>
                            )
                        })}
                    </Box>
                )}
            </Popover>
        </>
    )
}
