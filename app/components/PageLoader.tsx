'use client'

import { Box, Stack, Typography } from '@mui/material'
import { keyframes } from '@mui/material/styles'
import { useEffect, useState } from 'react'
import { LOADER_INGREDIENTS, PAGE_LOADING_MESSAGES } from '@/lib/fun'

const orbit = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`

const wobble = keyframes`
    0%, 100% { transform: rotate(-6deg) scale(1); }
    50% { transform: rotate(6deg) scale(1.08); }
`

const fadeIn = keyframes`
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
`

const RING = 108
const MESSAGE_EVERY_MS = 1500

/**
 * Opšti loader stranice: šerpa u sredini, sastojci kruže oko nje, a ispod se smenjuju gluposti.
 * Prva poruka je uvek ista (da se SSR i klijent poklope), nasumična tek od druge.
 */
export default function PageLoader({ message }: { message?: string }) {
    const [idx, setIdx] = useState(0)

    useEffect(() => {
        if (message) return
        setIdx(Math.floor(Math.random() * PAGE_LOADING_MESSAGES.length))
        const t = setInterval(() => setIdx((i) => (i + 1) % PAGE_LOADING_MESSAGES.length), MESSAGE_EVERY_MS)
        return () => clearInterval(t)
    }, [message])

    const text = message ?? PAGE_LOADING_MESSAGES[idx]

    return (
        <Stack role="status" aria-live="polite" spacing={2.5} sx={{ alignItems: 'center', py: { xs: 8, sm: 12 } }}>
            <Box sx={{ position: 'relative', width: RING, height: RING }}>
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        animation: `${orbit} 7s linear infinite`,
                    }}
                >
                    {LOADER_INGREDIENTS.map((glyph, i) => {
                        const angle = (360 / LOADER_INGREDIENTS.length) * i
                        return (
                            <Box
                                key={glyph}
                                sx={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    fontSize: 20,
                                    lineHeight: 1,
                                    // na krug pa nazad u uspravno, da sastojci ne stoje naglavačke
                                    transform: `translate(-50%, -50%) rotate(${angle}deg) translate(${RING / 2}px) rotate(-${angle}deg)`,
                                }}
                            >
                                {glyph}
                            </Box>
                        )
                    })}
                </Box>
                <Box
                    aria-hidden
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 44,
                        lineHeight: 1,
                        animation: `${wobble} 1.6s ease-in-out infinite`,
                    }}
                >
                    🍲
                </Box>
            </Box>

            <Typography
                key={text}
                variant="body2"
                color="text.secondary"
                sx={{ fontStyle: 'italic', textAlign: 'center', px: 2, animation: `${fadeIn} 300ms ease-out` }}
            >
                {text}
            </Typography>
        </Stack>
    )
}
