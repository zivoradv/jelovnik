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

/** Emoji se iscrtava jednom u sličicu, pa se sličica crta (drawImage) – fillText emoji svaki frejm je skup. */
const SPRITE_SIZE = 48
/** Više od ovoga na 4K ekranu samo troši fill-rate, a razlika se ne vidi. */
const MAX_DPR = 1.5

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    rot: number
    vr: number
    size: number
    sprite: HTMLCanvasElement
}

let spriteCache: HTMLCanvasElement[] | null = null

function sprites(): HTMLCanvasElement[] {
    if (spriteCache) return spriteCache
    spriteCache = FOOD.map((glyph) => {
        const c = document.createElement('canvas')
        c.width = SPRITE_SIZE
        c.height = SPRITE_SIZE
        const ctx = c.getContext('2d')
        if (ctx) {
            ctx.font = `${Math.round(SPRITE_SIZE * 0.8)}px serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(glyph, SPRITE_SIZE / 2, SPRITE_SIZE / 2 + 2)
        }
        return c
    })
    return spriteCache
}

function spawn(count: number, w: number, h: number, kind: ConfettiKind): Particle[] {
    const list = sprites()
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
            sprite: list[Math.floor(Math.random() * list.length)],
        }
    })
}

export function FunProvider({ children }: { children: ReactNode }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const particles = useRef<Particle[]>([])
    const raf = useRef<number>(0)
    const dpr = useRef(1)
    const [message, setMessage] = useState<string | null>(null)
    const [kafana, setKafana] = useState(false)

    const tick = useCallback(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return
        const w = canvas.width / dpr.current
        const h = canvas.height / dpr.current
        ctx.setTransform(dpr.current, 0, 0, dpr.current, 0, 0)
        ctx.clearRect(0, 0, w, h)
        const alive: Particle[] = []
        for (const p of particles.current) {
            p.x += p.vx
            p.y += p.vy
            p.vy += 0.45
            p.vx *= 0.99
            p.rot += p.vr
            if (p.y > h + 60) continue
            ctx.setTransform(dpr.current, 0, 0, dpr.current, p.x * dpr.current, p.y * dpr.current)
            ctx.rotate(p.rot)
            ctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size)
            alive.push(p)
        }
        particles.current = alive
        if (alive.length > 0) {
            raf.current = requestAnimationFrame(tick)
        } else {
            ctx.setTransform(1, 0, 0, 1, 0, 0)
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            // van ekrana kad miruje – da ne bude stalni sloj preko cele stranice
            canvas.style.display = 'none'
        }
    }, [])

    const confetti = useCallback(
        (kind: ConfettiKind = 'burst') => {
            const canvas = canvasRef.current
            if (!canvas) return
            if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
            dpr.current = Math.min(MAX_DPR, window.devicePixelRatio || 1)
            const w = window.innerWidth
            const h = window.innerHeight
            if (canvas.width !== Math.round(w * dpr.current) || canvas.height !== Math.round(h * dpr.current)) {
                canvas.width = Math.round(w * dpr.current)
                canvas.height = Math.round(h * dpr.current)
            }
            canvas.style.display = 'block'
            particles.current.push(...spawn(kind === 'storm' ? 120 : 40, w, h, kind))
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
                style={{
                    display: 'none',
                    position: 'fixed',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 2000,
                }}
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
