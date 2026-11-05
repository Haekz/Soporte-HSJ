// Service worker de la app "Soporte HSJ".
// - Archivos propios (index.html, config.js, íconos): primero la red, y si no hay conexión, la copia guardada.
//   Así cada cambio subido a GitHub llega solo, sin tener que borrar nada en el celular.
// - Librerías (Supabase JS, lector de códigos) se sirven desde la carpeta vendor/ del mismo sitio.
// - Fuentes de Google: se guardan para abrir más rápido.
// - Las consultas a Supabase (datos, fotos, sesión) NUNCA se guardan: siempre van directo a la base.
const VERSION = "v2";
const CACHE = "soporte-hsj-" + VERSION;
const BASE = [
  "./", "./index.html", "./config.js", "./app.js", "./pwa.js", "./vendor/supabase-2.45.4.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-32.png"
];
const EXTERNOS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  // La primera instalación se activa de inmediato; una versión nueva espera a que el usuario toque "Actualizar".
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => { if (!self.registration.active) return self.skipWaiting(); }));
});

self.addEventListener("message", (e) => { if (e.data === "activar") self.skipWaiting(); });

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("soporte-hsj-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Archivos propios: red primero
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return res;
      }).catch(() =>
        caches.match(req, { ignoreSearch: true }).then((r) => r || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()))
      )
    );
    return;
  }

  // Librerías y fuentes: copia guardada primero, y se actualiza en segundo plano
  if (EXTERNOS.includes(url.hostname)) {
    e.respondWith(
      caches.open(CACHE).then((c) => c.match(req).then((guardado) => {
        const red = fetch(req).then((res) => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => guardado);
        return guardado || red;
      }))
    );
  }
  // Todo lo demás (Supabase) pasa directo a la red.
});
