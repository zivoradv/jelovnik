'use client'

import SportsBarIcon from '@mui/icons-material/SportsBar'
import { Box, Button, Dialog, DialogActions, DialogContent, Stack, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth-context'
import { useFun } from '../fun-context'

const QUESTIONS = ['Pivo?', 'Jedno pivo?', 'Pivce posle posla?', 'Pivo. Da ili da?', 'Konobar pita: pivo?', 'Idemo na pivo?']

/** Pitanje iskače na svakih 30 s, bez obzira na odgovor. */
const INTERVAL_MS = 30_000

export default function BeerPrompt() {
    const { user } = useAuth()
    const { kafana, toast, confetti } = useFun()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [question, setQuestion] = useState(QUESTIONS[0])
    const [busy, setBusy] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const schedule = useCallback(() => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => {
            if (document.visibilityState !== 'visible') {
                schedule()
                return
            }
            setQuestion(QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)])
            setOpen(true)
        }, INTERVAL_MS)
    }, [])

    useEffect(() => {
        if (!user || !kafana) {
            if (timer.current) clearTimeout(timer.current)
            setOpen(false)
            return
        }
        schedule()
        return () => {
            if (timer.current) clearTimeout(timer.current)
        }
    }, [user, kafana, schedule])

    async function answer(a: 'da' | 'ne') {
        setBusy(true)
        try {
            const res = await fetch('/api/pivo/quick', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answer: a }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Greška.')
            setOpen(false)
            if (a === 'da') {
                confetti('burst')
                toast(
                    data.created
                        ? 'Prijavljen si i predložio pivo danas u 17:00. Ekipa je obaveštena! 🍻'
                        : 'Prijavljen si! Ekipa je obaveštena. 🍻',
                )
                router.push('/pivo')
                schedule()
            } else {
                toast('Dobro, dobro. Pitaćemo opet.')
                schedule()
            }
        } catch (err) {
            toast(err instanceof Error ? err.message : 'Greška.')
            setOpen(false)
            schedule()
        } finally {
            setBusy(false)
        }
    }

    if (!user || !kafana) return null

    return (
        <Dialog
            open={open}
            onClose={() => {
                setOpen(false)
                schedule()
            }}
            maxWidth="xs"
            slotProps={{ paper: { sx: { borderRadius: 4, textAlign: 'center', px: 1 } } }}
        >
            <DialogContent sx={{ pt: 4 }}>
                <Box
                    sx={{
                        fontSize: 64,
                        lineHeight: 1,
                        mb: 1.5,
                        animation: 'jelovnik-cheers 900ms ease-in-out infinite alternate',
                        '@keyframes jelovnik-cheers': {
                            from: { transform: 'rotate(-8deg)' },
                            to: { transform: 'rotate(8deg)' },
                        },
                    }}
                >
                    🍺
                </Box>
                <Typography variant="h4" sx={{ mb: 0.5 }}>
                    {question}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Ako kažeš da, ekipa dobija obaveštenje i vidi te na stranici Pivo.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center' }}>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        size="large"
                        disabled={busy}
                        onClick={() => answer('ne')}
                        sx={{ minWidth: 110 }}
                    >
                        Ne
                    </Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        size="large"
                        disabled={busy}
                        startIcon={<SportsBarIcon />}
                        onClick={() => answer('da')}
                        sx={{ minWidth: 130 }}
                    >
                        Da!
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    )
}
