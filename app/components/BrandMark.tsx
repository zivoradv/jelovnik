'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

/** Logo aplikacije – ista slika kao favicon (app/favicon.ico, Next je servira na /favicon.ico). */
export default function BrandMark({ size = 'md', showText = true }: { size?: 'sm' | 'md' | 'lg'; showText?: boolean }) {
    const dims = { sm: 32, md: 38, lg: 64 }[size]
    const textVariant = { sm: 'subtitle1', md: 'h6', lg: 'h5' }[size] as 'subtitle1' | 'h6' | 'h5'

    return (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Box
                component="img"
                src="/favicon.ico"
                alt=""
                aria-hidden
                width={dims}
                height={dims}
                sx={(t) => ({
                    width: dims,
                    height: dims,
                    flexShrink: 0,
                    display: 'block',
                    objectFit: 'cover',
                    borderRadius: `${dims * 0.28}px`,
                    boxShadow: t.shadows[2],
                })}
            />

            {showText && (
                <Typography variant={textVariant} sx={{ fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                    Brezna Obrok
                </Typography>
            )}
        </Stack>
    )
}
