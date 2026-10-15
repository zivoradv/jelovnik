// Service worker: prikazuje push notifikacije i otvara aplikaciju na klik.
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {}
    event.waitUntil(
        self.registration.showNotification(data.title || 'Brezna Obrok', {
            body: data.body || '',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: { link: data.link || '/' },
        }),
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const url = new URL(event.notification.data?.link || '/', self.location.origin).href
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
            const win = wins.find((w) => w.url.startsWith(self.location.origin))
            return win ? win.navigate(url).then((w) => w?.focus()) : self.clients.openWindow(url)
        }),
    )
})
