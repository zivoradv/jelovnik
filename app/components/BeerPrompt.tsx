'use client'

import SportsBarIcon from '@mui/icons-material/SportsBar'
import { Box, Button, Dialog, DialogActions, DialogContent, Stack, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth-context'
import { useFun } from '../fun-context'

const QUESTIONS = ['Pivo?', 'Jedno pivo?', 'Pivce posle posla?', 'Pivo. Da ili da?', 'Konobar pita: pivo?', 'Idemo na pivo?']

const NO_LABELS = ['Ne', 'Ne?', 'Nećeš…', 'Ma daj', 'Hvataj me', 'Ne može ne', 'Klikni Da', '🍺 Da!']

/** Pitanje iskače na svakih 30 s, bez obzira na odgovor. */
const INTERVAL_MS = 30_000

/** Koliko dijalog sme da priđe ivici prozora kad beži. */
const EDGE = 12

export default function BeerPrompt() {
    const { user } = useAuth()
    const { kafana, toast, confetti } = useFun()
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [question, setQuestion] = useState(QUESTIONS[0])
    const [busy, setBusy] = useState(false)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [dodges, setDodges] = useState(0)
    const paperRef = useRef<HTMLDivElement>(null)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const schedule = useCallback(() => {
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => {
            if (document.visibilityState !== 'visible') {
                schedule()
                return
            }
            setQuestion(QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)])
            setOffset({ x: 0, y: 0 })
            setDodges(0)
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

    /**
     * Dijalog skoči na novo, nasumično mesto – što dalje od miša, ali uvek ceo unutar prozora,
     * pa dugme „Da!” ostaje dostupno.
     */
    function dodge(e?: ReactPointerEvent | { clientX: number; clientY: number }) {
        const paper = paperRef.current
        if (!paper) return
        const rect = paper.getBoundingClientRect()
        // položaj bez trenutnog pomeraja = mesto gde ga MUI centrira
        const baseLeft = rect.left - offset.x
        const baseTop = rect.top - offset.y
        const minX = -(baseLeft - EDGE)
        const maxX = window.innerWidth - (baseLeft + rect.width) - EDGE
        const minY = -(baseTop - EDGE)
        const maxY = window.innerHeight - (baseTop + rect.height) - EDGE
        if (maxX < minX || maxY < minY) return // dijalog veći od prozora – ne beži

        const mx = e?.clientX ?? rect.left + rect.width / 2
        const my = e?.clientY ?? rect.top + rect.height / 2
        let best = offset
        let bestDist = -1
        for (let i = 0; i < 12; i++) {
            const x = minX + Math.random() * (maxX - minX)
            const y = minY + Math.random() * (maxY - minY)
            const cx = baseLeft + x + rect.width / 2
            const cy = baseTop + y + rect.height / 2
            const d = Math.hypot(cx - mx, cy - my)
            if (d > bestDist) {
                bestDist = d
                best = { x, y }
            }
        }
        setOffset(best)
        setDodges((n) => n + 1)
    }

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
            } else {
                toast('Dobro, dobro. Pitaćemo opet.')
            }
            schedule()
        } catch (err) {
            toast(err instanceof Error ? err.message : 'Greška.')
            setOpen(false)
            schedule()
        } finally {
            setBusy(false)
        }
    }

    if (!user || !kafana) return null

    const noLabel = NO_LABELS[Math.min(dodges, NO_LABELS.length - 1)]

    return (
        <Dialog
            open={open}
            // u kafani nema izlaza: ni Escape ni klik pored – mora „Da!” (onClose ignoriše oba razloga)
            onClose={() => {}}
            maxWidth="xs"
            slotProps={{
                paper: {
                    ref: paperRef,
                    sx: {
                        borderRadius: 4,
                        textAlign: 'center',
                        px: 1,
                        transform: `translate(${offset.x}px, ${offset.y}px)`,
                        transition: 'transform 220ms cubic-bezier(.2,.9,.3,1.2)',
                    },
                },
            }}
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
                {dodges >= 3 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                        Kafana ne prima „ne” kao odgovor.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center' }}>
                <Stack direction="row" spacing={1.5}>
                    <Button
                        variant="outlined"
                        color="inherit"
                        size="large"
                        tabIndex={-1}
                        onPointerEnter={dodge}
                        onPointerDown={(e) => {
                            e.preventDefault()
                            dodge(e)
                        }}
                        onClick={(e) => {
                            e.preventDefault()
                            dodge(e)
                        }}
                        sx={{ minWidth: 110 }}
                    >
                        {noLabel}
                    </Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        size="large"
                        disabled={busy}
                        startIcon={<SportsBarIcon />}
                        onClick={() => answer('da')}
                        sx={{ minWidth: 130 }}
                        autoFocus
                    >
                        Da!
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    )
}
