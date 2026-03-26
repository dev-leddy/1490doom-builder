// When this SW activates, force-navigate any tabs stuck at '/' (old quiz cache bug)
// to the same URL so the new SW can serve the correct index.html.
self.addEventListener('activate', event => {
  event.waitUntil(
    self.clients.claim()
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients =>
        Promise.all(
          clients.map(client =>
            new URL(client.url).pathname === '/' ? client.navigate(client.url) : undefined
          )
        )
      )
  )
})
