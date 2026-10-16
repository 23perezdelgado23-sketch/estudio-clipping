// Estudio Clipping en el móvil: sustituye lo que en el Mac hace Electron (electron/preload.cjs).
// Los datos se guardan en el propio dispositivo (localStorage), con una copia diaria (las 15 últimas).
(() => {
  const CLAVE = "estudio-clipping:datos";
  const COPIA = "estudio-clipping:copia:";
  const movil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // Copia diaria en el propio dispositivo (las 10 últimas). Sin el radar: pesa mucho y se vuelve a leer.
  // El espacio de una web en el iPhone es limitado (unos 5 MB); así nunca se llena.
  function copiaDiaria(texto) {
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      if (!localStorage.getItem(COPIA + hoy)) {
        const d = JSON.parse(texto);
        delete d.radar;
        localStorage.setItem(COPIA + hoy, JSON.stringify(d));
      }
      const todas = Object.keys(localStorage).filter((k) => k.startsWith(COPIA)).sort();
      todas.slice(0, Math.max(0, todas.length - 10)).forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  function elegirArchivo(accept) {
    return new Promise((resolver) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.onchange = () => resolver(input.files[0] || null);
      input.click();
    });
  }

  window.estudio = {
    donde: movil ? "en este móvil" : "en este navegador",
    tactil: matchMedia("(hover: none) and (pointer: coarse)").matches,
    leer: async () => {
      try {
        const texto = localStorage.getItem(CLAVE);
        if (texto) copiaDiaria(texto);
        return texto ? JSON.parse(texto) : null;
      } catch {
        return null;
      }
    },
    guardar: async (d) => {
      localStorage.setItem(CLAVE, JSON.stringify(d));
      return true;
    },
    exportar: async (d) => {
      const nombre = `estudio-clipping-${new Date().toISOString().slice(0, 10)}.json`;
      const archivo = new File([JSON.stringify(d, null, 2)], nombre, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: "Copia de Estudio Clipping" });
          return true;
        } catch (e) {
          if (e.name === "AbortError") return false;
        }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(archivo);
      a.download = nombre;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      return true;
    },
    guardarArchivo: async (nombre, texto) => {
      const archivo = new File([texto], nombre, { type: "text/csv" });
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: nombre });
          return true;
        } catch (e) {
          if (e.name === "AbortError") return false;
        }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(archivo);
      a.download = nombre;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      return true;
    },
    importar: async () => {
      const f = await elegirArchivo("application/json,.json");
      return f ? JSON.parse(await f.text()) : null;
    },
    elegirVideo: async () => {
      const f = await elegirArchivo("video/*");
      return f ? { ruta: f.name, url: URL.createObjectURL(f) } : null;
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    const pie = document.getElementById("pie-guardado");
    if (pie) pie.textContent = "Guardado " + window.estudio.donde;
    // En la barra de arriba, que se vea siempre el apartado abierto
    const menu = document.getElementById("menu");
    if (menu)
      new MutationObserver(() => {
        const activo = menu.querySelector(".activo");
        activo && activo.scrollIntoView({ block: "nearest", inline: "center" });
      }).observe(menu, { childList: true, subtree: true });
  });

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
