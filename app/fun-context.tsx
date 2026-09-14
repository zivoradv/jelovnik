'use client'

import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CONSOLE_BANNER, CONSOLE_PS, KONAMI_MESSAGE } from '@/lib/fun'

type ConfettiKind = 'burst' | 'storm'

interface FunState {
    confetti: (kind?: ConfettiKind) => void
    toast: (message: string) => void
    kafana: boolean
    toggleKafana: () => void
}

const FunContext = createContext<FunState | null>(null)

const FOOD = ['🥟', '🍲', '🥪', '🍛', '🥗', '🍞', '🥚', '🧀', '🍅', '🥔', '🌶️', '🥖']
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const KAFANA_KEY = 'jelovnik:kafana'

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    rot: number
    vr: number
    size: number
    glyph: string
    life: number
}

function spawn(count: number, w: number, h: number, kind: ConfettiKind): Particle[] {
    return Array.from({ length: count }, () => {
        const storm = kind === 'storm'
        return {
            x: storm ? Math.random() * w : w / 2 + (Math.random() - 0.5) * 120,
            y: storm ? -40 - Math.random() * h * 0.5 : h * 0.6,
            vx: storm ? (Math.random() - 0.5) * 3 : (Math.random() - 0.5) * 18,
            vy: storm ? 2 + Math.random() * 4 : -14 - Math.random() * 10,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.3,
            size: 18 + Math.random() * 18,
            glyph: FOOD[Math.floor(Math.random() * FOOD.length)],
            life: 1,
        }
    })
}

export function FunProvider({ children }: { children: ReactNode }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const particles = useRef<Particle[]>([])
    const raf = useRef<number>(0)
    const [message, setMessage] = useState<string | null>(null)
    const [kafana, setKafana] = useState(false)

    const tick = useCallback(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const alive: Particle[] = []
        for (const p of particles.current) {
            p.x += p.vx
            p.y += p.vy
            p.vy += 0.45
            p.vx *= 0.99
            p.rot += p.vr
            if (p.y > canvas.height + 60) continue
            ctx.save()
            ctx.translate(p.x, p.y)
            ctx.rotate(p.rot)
            ctx.font = `${p.size}px serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(p.glyph, 0, 0)
            ctx.restore()
            alive.push(p)
        }
        particles.current = alive
        if (alive.length > 0) raf.current = requestAnimationFrame(tick)
        else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }, [])

    const confetti = useCallback(
        (kind: ConfettiKind = 'burst') => {
            const canvas = canvasRef.current
            if (!canvas) return
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            particles.current.push(...spawn(kind === 'storm' ? 140 : 45, canvas.width, canvas.height, kind))
            cancelAnimationFrame(raf.current)
            raf.current = requestAnimationFrame(tick)
        },
        [tick],
    )

    const toast = useCallback((m: string) => setMessage(m), [])

    const applyKafana = useCallback((on: boolean) => {
        setKafana(on)
        document.documentElement.classList.toggle('kafana', on)
        try {
            localStorage.setItem(KAFANA_KEY, on ? '1' : '0')
        } catch {}
    }, [])

    const toggleKafana = useCallback(() => {
        const next = !kafana
        applyKafana(next)
        toast(next ? 'Kafanski mod uključen. Konobar, jelovnik!' : 'Kafanski mod isključen. Nazad u kancelariju.')
        if (next) confetti('burst')
    }, [kafana, applyKafana, toast, confetti])

    useEffect(() => {
        console.log(...CONSOLE_BANNER)
        console.log(...CONSOLE_PS)
    }, [])

    useEffect(() => {
        try {
            if (localStorage.getItem(KAFANA_KEY) === '1') applyKafana(true)
        } catch {}
    }, [applyKafana])

    useEffect(() => {
        let index = 0
        function onKey(e: KeyboardEvent) {
            const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
            index = key === KONAMI[index] ? index + 1 : key === KONAMI[0] ? 1 : 0
            if (index === KONAMI.length) {
                index = 0
                confetti('storm')
                toast(KONAMI_MESSAGE)
            }
        }
        window.addEventListener('keydown', onKey)
        return () => {
            window.removeEventListener('keydown', onKey)
            cancelAnimationFrame(raf.current)
        }
    }, [confetti, toast])

    return (
        <FunContext.Provider value={{ confetti, toast, kafana, toggleKafana }}>
            {children}
            <canvas
                ref={canvasRef}
                aria-hidden
                style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2000 }}
            />
            <Snackbar
                open={message !== null}
                autoHideDuration={6000}
                onClose={() => setMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity="info" variant="filled" onClose={() => setMessage(null)}>
                    {message}
                </Alert>
            </Snackbar>
        </FunContext.Provider>
    )
}

export function useFun(): FunState {
    const ctx = useContext(FunContext)
    if (!ctx) throw new Error('useFun mora biti unutar FunProvider-a.')
    return ctx
}
