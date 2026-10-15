import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Brezna Obrok',
        short_name: 'Obrok',
        description: 'Brezna Obrok – naručivanje dnevnih obroka.',
        start_url: '/',
        display: 'standalone',
        background_color: '#F8F4EF',
        theme_color: '#F8F4EF',
        lang: 'sr',
        icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
    }
}
