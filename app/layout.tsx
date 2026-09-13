import type { Metadata, Viewport } from 'next';
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import Providers from './providers';
import './globals.css';

// Meki serif za naslove - topao, "domaći" karakter.
const display = Fraunces({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-display',
});

// Čitak, prijateljski sans za sav ostali tekst i kontrole.
const sans = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Jelovnik - naručivanje obroka',
  description: 'Aplikacija za naručivanje dnevnih obroka.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F4EF' },
    { media: '(prefers-color-scheme: dark)', color: '#14100E' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="sr"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable}`}
    >
      <body>
        <InitColorSchemeScript attribute="class" defaultMode="system" />
        <AppRouterCacheProvider options={{ key: 'mui' }}>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
