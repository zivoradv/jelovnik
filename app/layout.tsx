import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter'
import type { Metadata, Viewport } from 'next'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'
import type { ReactNode } from 'react'
import Providers from './providers'
import './globals.css'

const display = Fraunces({
    subsets: ['latin', 'latin-ext'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
    variable: '--font-display',
})

const sans = Plus_Jakarta_Sans({
    subsets: ['latin', 'latin-ext'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
    variable: '--font-sans',
})

export const metadata: Metadata = {
    title: 'Brezna Obrok',
    description: 'Brezna Obrok – naručivanje dnevnih obroka.',
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#F8F4EF' },
        { media: '(prefers-color-scheme: dark)', color: '#14100E' },
    ],
}

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="sr" suppressHydrationWarning className={`${display.variable} ${sans.variable}`}>
            <body>
                <InitColorSchemeScript attribute="class" defaultMode="system" />
                <AppRouterCacheProvider options={{ key: 'mui' }}>
                    <Providers>{children}</Providers>
                </AppRouterCacheProvider>
            </body>
        </html>
    )
}
