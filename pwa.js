// ---------- App instalable (PWA) ----------
(() => {
  const g = (id) => document.getElementById(id);
  const instalada = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

  // Aviso sin conexión
  const red = () => { g("avisoOffline").hidden = navigator.onLine; };
  addEventListener("online", red); addEventListener("offline", red); red();

  // Registro del service worker y aviso de versión nueva
  if ("serviceWorker" in navigator) {
    let recargando = false;
    const habiaControl = !!navigator.serviceWorker.controller; // en la primera visita no se recarga
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (recargando || !habiaControl) return; recargando = true; location.reload();
    });
    addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then((reg) => {
        const avisar = (w) => { if (w && navigator.serviceWorker.controller) { g("avisoUpdate").hidden = false; g("btnUpdate").onclick = () => w.postMessage("activar"); } };
        if (reg.waiting) avisar(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const w = reg.installing;
          w && w.addEventListener("statechange", () => { if (w.state === "installed") avisar(w); });
        });
        // Revisar actualizaciones al volver a la app
        document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
      }).catch(() => {});
    });
  }

  // Botón "Instalar"
  if (instalada || leer("pwa-no-instalar") === "1") return;
  g("btnNoInstalar").onclick = () => { g("avisoInstalar").hidden = true; guardar("pwa-no-instalar", "1"); };
  let prompt = null;
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); prompt = e;
    g("btnInstalar").hidden = false; g("avisoInstalar").hidden = false;
  });
  g("btnInstalar").onclick = async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice.catch(() => {});
    prompt = null; g("avisoInstalar").hidden = true;
  };
  addEventListener("appinstalled", () => { g("avisoInstalar").hidden = true; });

  // iPhone/iPad: Safari no tiene botón automático, se explica el paso manual
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) {
    g("avisoInstalarTxt").textContent = "Para instalarla como aplicación: toque Compartir (el cuadrado con flecha) y luego \"Agregar a inicio\".";
    g("avisoInstalar").hidden = false;
  }
})();
