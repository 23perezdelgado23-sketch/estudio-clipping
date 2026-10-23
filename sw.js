// Estudio Clipping: con internet carga siempre la última versión publicada; sin internet, la última guardada.
const CACHE = "estudio-clipping-20261023-203117";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
);
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" })
      .then((r) => {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

// Avisos del servidor 24 h (piloto automático). Llegan aunque la app esté cerrada.
self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data.json();
  } catch {
    d = { cuerpo: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(d.titulo || "Estudio Clipping", { body: d.cuerpo || "", icon: "icono-192.png", badge: "icono-192.png", data: { url: d.url || "./" } })
  );
});
// Al tocar el aviso se abre la app en el apartado que indica (por ejemplo, el Radar)
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const v = ventanas[0];
      return v ? v.navigate(url).then((w) => (w || v).focus()) : self.clients.openWindow(url);
    })
  );
});
