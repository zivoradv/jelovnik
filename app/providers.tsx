'use client'

import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { type ReactNode, Suspense } from 'react'
import { AuthProvider } from './auth-context'
import BeerPrompt from './components/BeerPrompt'
import NavBar from './components/NavBar'
import { ConfirmProvider } from './confirm-context'
import { FunProvider } from './fun-context'
import theme from './theme'

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider theme={theme} defaultMode="system">
            <CssBaseline />
            <AuthProvider>
                <FunProvider>
                    <ConfirmProvider>
                        <Box
                            aria-hidden
                            sx={(t) => ({
                                position: 'fixed',
                                inset: 0,
                                zIndex: -1,
                                pointerEvents: 'none',
                                // boje prate izabranu temu (primarna / sekundarna) u oba moda
                                background: `
              radial-gradient(900px 500px at 8% -10%, rgba(${t.vars.palette.primary.mainChannel} / 0.07), transparent 60%),
              radial-gradient(760px 460px at 100% 0%, rgba(${t.vars.palette.secondary.mainChannel} / 0.07), transparent 60%)
            `,
                            })}
                        />

                        <Suspense fallback={null}>
                            <NavBar />
                        </Suspense>
                        <BeerPrompt />

                        <Box component="main" sx={{ minHeight: '100dvh' }}>
                            <Container sx={{ py: { xs: 2.5, sm: 4 } }}>{children}</Container>
                        </Box>
                    </ConfirmProvider>
                </FunProvider>
            </AuthProvider>
        </ThemeProvider>
    )
}
