'use client'

import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { type ReactNode, Suspense } from 'react'
import { AuthProvider } from './auth-context'
import BeerPrompt from './components/BeerPrompt'
import NavBar from './components/NavBar'
import { FunProvider } from './fun-context'
import theme from './theme'

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider theme={theme} defaultMode="system">
            <CssBaseline />
            <AuthProvider>
                <FunProvider>
                    <Box
                        aria-hidden
                        sx={(t) => ({
                            position: 'fixed',
                            inset: 0,
                            zIndex: -1,
                            pointerEvents: 'none',
                            background: `
              radial-gradient(900px 500px at 8% -10%, rgba(168, 43, 36, 0.07), transparent 60%),
              radial-gradient(760px 460px at 100% 0%, rgba(199, 124, 34, 0.07), transparent 60%)
            `,
                            ...t.applyStyles('dark', {
                                background: `
                radial-gradient(900px 500px at 8% -10%, rgba(232, 155, 149, 0.08), transparent 60%),
                radial-gradient(760px 460px at 100% 0%, rgba(237, 191, 115, 0.06), transparent 60%)
              `,
                            }),
                        })}
                    />

                    <Suspense fallback={null}>
                        <NavBar />
                    </Suspense>
                    <BeerPrompt />

                    <Box component="main" sx={{ minHeight: '100dvh' }}>
                        <Container maxWidth="lg" sx={{ py: { xs: 2.5, sm: 4 } }}>
                            {children}
                        </Container>
                    </Box>
                </FunProvider>
            </AuthProvider>
        </ThemeProvider>
    )
}
