'use client'

import AddToHomeScreenIcon from '@mui/icons-material/AddToHomeScreen'
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined'
import { Alert, Button, Card, CardContent, Divider, Stack, Switch, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

type InstallPrompt = Event & { prompt: () => Promise<void> }

function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
    const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function api(method: string, body: unknown) {
    const res = await fetch('/api/push', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Greška pri čuvanju.')
}

/** Push notifikacije na ovom uređaju, podsetnik za naručivanje i „dodaj na početni ekran”. */
export default function PhoneNotifications({ onSaved }: { onSaved: (msg: string) => void }) {
    const [supported, setSupported] = useState<boolean | null>(null)
    const [isIos, setIsIos] = useState(false)
    const [installed, setInstalled] = useState(false)
    const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null)
    const [subscribed, setSubscribed] = useState(false)
    const [reminderTime, setReminderTime] = useState<string | null>(null)
    const [time, setTime] = useState('10:00')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        setSupported('serviceWorker' in navigator && 'PushManager' in window && !!VAPID_KEY)
        setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent))
        setInstalled(window.matchMedia('(display-mode: standalone)').matches)
        navigator.serviceWorker
            ?.getRegistration()
            .then((reg) => reg?.pushManager.getSubscription())
            .then((sub) => setSubscribed(!!sub))
            .catch(() => {})
        fetch('/api/push')
            .then((r) => r.json())
            .then((d) => {
                setReminderTime(d.reminderTime ?? null)
                if (d.reminderTime) setTime(d.reminderTime)
            })
            .catch(() => {})
        const onPrompt = (e: Event) => {
            e.preventDefault()
            setInstallPrompt(e as InstallPrompt)
        }
        window.addEventListener('beforeinstallprompt', onPrompt)
        return () => window.removeEventListener('beforeinstallprompt', onPrompt)
    }, [])

    async function run(fn: () => Promise<void>) {
        setError('')
        setBusy(true)
        try {
            await fn()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Greška.')
        } finally {
            setBusy(false)
        }
    }

    const enable = () =>
        run(async () => {
            if ((await Notification.requestPermission()) !== 'granted') {
                throw new Error('Notifikacije su blokirane – dozvoli ih u podešavanjima browsera za ovaj sajt.')
            }
            const reg = await navigator.serviceWorker.register('/sw.js')
            await navigator.serviceWorker.ready
            const sub =
                (await reg.pushManager.getSubscription()) ??
                (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_KEY) }))
            await api('PUT', { subscription: sub.toJSON() })
            setSubscribed(true)
            onSaved('Notifikacije su uključene na ovom uređaju.')
        })

    const disable = () =>
        run(async () => {
            const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription()
            if (sub) {
                await api('DELETE', { endpoint: sub.endpoint })
                await sub.unsubscribe()
            }
            setSubscribed(false)
            onSaved('Notifikacije su isključene na ovom uređaju.')
        })

    const saveReminder = (value: string | null) =>
        run(async () => {
            await api('PUT', { reminderTime: value })
            setReminderTime(value)
            onSaved(value ? `Podsetnik je podešen na ${value}.` : 'Podsetnik je isključen.')
        })

    return (
        <Card>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
                    <NotificationsActiveOutlinedIcon color="primary" fontSize="small" />
                    <Typography variant="h6">Notifikacije na telefonu</Typography>
                </Stack>

                <Stack spacing={2}>
                    {error && <Alert severity="error">{error}</Alert>}

                    {supported === false ? (
                        <Alert severity="info">
                            {isIos && !installed
                                ? 'Na iPhone-u notifikacije rade samo kad je aplikacija na početnom ekranu: dodaj je (uputstvo ispod), pa je otvori sa ikonice i vrati se ovde.'
                                : 'Ovaj browser ne podržava notifikacije.'}
                        </Alert>
                    ) : (
                        <>
                            <Typography variant="body2" color="text.secondary">
                                Sva obaveštenja iz aplikacije (zvonce) stižu i kao notifikacija na ovaj uređaj. Uključi na svakom uređaju
                                posebno.
                            </Typography>
                            <Button
                                variant={subscribed ? 'outlined' : 'contained'}
                                onClick={subscribed ? disable : enable}
                                disabled={busy || supported === null}
                                sx={{ alignSelf: 'flex-start' }}
                            >
                                {subscribed ? 'Isključi na ovom uređaju' : 'Uključi notifikacije'}
                            </Button>
                        </>
                    )}

                    <Divider sx={{ borderStyle: 'dashed' }} />

                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 600 }}>Podsetnik za naručivanje</Typography>
                        <Switch
                            checked={reminderTime !== null}
                            onChange={(e) => saveReminder(e.target.checked ? time : null)}
                            disabled={busy}
                            slotProps={{ input: { 'aria-label': 'Podsetnik za naručivanje' } }}
                        />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                        Ako do izabranog vremena nemaš porudžbinu za sledeći radni dan, stići će ti podsetnik (rok je dan ranije do 17:00).
                    </Typography>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <TextField
                            label="Vreme"
                            type="time"
                            size="small"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } }}
                        />
                        <Button variant="outlined" onClick={() => saveReminder(time)} disabled={busy || !time || time === reminderTime}>
                            Sačuvaj
                        </Button>
                    </Stack>

                    {!installed && (
                        <>
                            <Divider sx={{ borderStyle: 'dashed' }} />
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <AddToHomeScreenIcon color="primary" fontSize="small" />
                                <Typography sx={{ fontWeight: 600 }}>Ikonica na početnom ekranu</Typography>
                            </Stack>
                            {installPrompt ? (
                                <Button
                                    variant="outlined"
                                    startIcon={<AddToHomeScreenIcon />}
                                    onClick={() => installPrompt.prompt().then(() => setInstallPrompt(null))}
                                    sx={{ alignSelf: 'flex-start' }}
                                >
                                    Dodaj na početni ekran
                                </Button>
                            ) : (
                                <Typography variant="body2" color="text.secondary">
                                    {isIos
                                        ? 'U Safariju dodirni „Podeli” (kvadrat sa strelicom), pa „Dodaj na početni ekran”.'
                                        : 'U meniju browsera (⋮) izaberi „Dodaj na početni ekran” ili „Instaliraj aplikaciju”.'}
                                </Typography>
                            )}
                        </>
                    )}
                </Stack>
            </CardContent>
        </Card>
    )
}
