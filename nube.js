// Sincronización con la nube (Supabase): los mismos datos en el Mac, el iPhone y cualquier dispositivo nuevo.
// Cada dispositivo sigue guardando en local; con sesión iniciada, además sube cada cambio y baja los de los demás.
// Si dos dispositivos cambian a la vez sin conexión, gana el cambio más reciente y el otro se guarda como copia.
(() => {
  const CFG = window.NUBE_CONFIG || {};
  const LS = {
    sesion: "nube:sesion",
    cambiado: "nube:cambiadoEn", // último cambio hecho en este dispositivo (ms)
    sincro: "nube:sincronizadoEn", // fecha de la versión de la nube con la que coincide este dispositivo (ISO)
    descartado: "nube:descartado", // copia de lo que se perdió en un choque de cambios
  };
  const ls = {
    get: (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set: (k, v) => {
      try {
        v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
      } catch {}
    },
  };
  const configurada = !!(CFG.url && CFG.clave);
  let estado = "";
  let subiendo = null;
  let temporizador = null;

  const sesion = () => {
    try {
      return JSON.parse(ls.get(LS.sesion));
    } catch {
      return null;
    }
  };
  const guardarSesion = (r) =>
    ls.set(LS.sesion, JSON.stringify({ access: r.access_token, refresh: r.refresh_token, expira: Date.now() + r.expires_in * 1000, id: r.user.id, email: r.user.email }));
  const hora = () => new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const ponerEstado = (t) => {
    estado = t;
    const el = document.getElementById("nube-estado");
    if (el) el.textContent = t;
  };

  async function auth(ruta, cuerpo) {
    const r = await fetch(`${CFG.url}/auth/v1/${ruta}`, {
      method: "POST",
      headers: { apikey: CFG.clave, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(traducir(j.msg || j.error_description || j.message || j.error || `Error ${r.status}`));
    return j;
  }

  function traducir(m) {
    if (/invalid login credentials/i.test(m)) return "Correo o contraseña incorrectos";
    if (/already registered/i.test(m)) return "Ese correo ya tiene cuenta: pulsa Entrar";
    if (/signups not allowed|signup is disabled/i.test(m)) return "No se pueden crear cuentas nuevas: pulsa Entrar con la tuya";
    if (/password should be at least/i.test(m)) return "La contraseña es demasiado corta (mínimo 8 caracteres)";
    if (/email not confirmed/i.test(m)) return "Falta confirmar el correo";
    if (/failed to fetch|network/i.test(m)) return "Sin conexión";
    return m;
  }

  async function token() {
    const s = sesion();
    if (!s) throw new Error("Sin sesión");
    if (Date.now() < s.expira - 60000) return s;
    const r = await auth("token?grant_type=refresh_token", { refresh_token: s.refresh });
    guardarSesion(r);
    return sesion();
  }

  async function api(metodo, cuerpo) {
    return apiTabla("datos", metodo, cuerpo, metodo === "GET" ? "select=contenido,actualizado" : "");
  }

  async function apiTabla(tabla, metodo, cuerpo, consulta = "") {
    const s = await token();
    const r = await fetch(`${CFG.url}/rest/v1/${tabla}${consulta ? "?" + consulta : ""}`, {
      method: metodo,
      headers: {
        apikey: CFG.clave,
        Authorization: `Bearer ${s.access}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      const e = new Error(traducir(j.message || `Error ${r.status}`));
      e.codigo = j.code;
      throw e;
    }
    return metodo === "GET" ? r.json() : null;
  }

  // ---------- Copias en la nube: una al día, se guardan 30 días ----------
  const sinRadar = (d) => {
    const c = { ...d };
    delete c.radar;
    return c;
  };
  const tablaCopiasFalta = (e) => e.codigo === "PGRST205" || e.codigo === "42P01" || /copias/i.test(e.message || "");
  async function copiaDelDia(forzar = false) {
    const hoy = hoyISO();
    if (!forzar && ls.get("nube:copiaDia") === hoy) return true;
    try {
      await apiTabla("copias", "POST", { user_id: sesion().id, fecha: hoy, contenido: sinRadar(D) });
      const limite = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
      await apiTabla("copias", "DELETE", null, `fecha=lt.${limite}`);
      ls.set("nube:copiaDia", hoy);
      ls.set("nube:copiasActivas", "1");
      return true;
    } catch (e) {
      if (tablaCopiasFalta(e)) ls.set("nube:copiasActivas", "0");
      else ponerEstado(`No se ha podido hacer la copia del día: ${e.message}`);
      return e;
    }
  }

  function vacio(d) {
    if (!d) return true;
    const listas = ["campanas", "clips", "cuentas", "cobros", "cortes", "permisos"];
    if (listas.some((k) => (d[k] || []).length)) return false;
    if (Object.keys(d.plan || {}).length || d.rutina) return false;
    if (Object.values(d.ajustes || {}).some((v) => v !== "" && v != null)) return false;
    return !(d.ganchos || []).some((g) => g.favorito) && (d.ganchos || []).length === GANCHOS_BASE.length;
  }

  const pendiente = () => Number(ls.get(LS.cambiado) || 0) > Date.parse(ls.get(LS.sincro) || 0);

  async function subir() {
    if (subiendo) return subiendo;
    subiendo = (async () => {
      const cuando = new Date(Number(ls.get(LS.cambiado)) || Date.now()).toISOString();
      await api("POST", { user_id: sesion().id, contenido: D, actualizado: cuando });
      ls.set(LS.sincro, cuando);
      ponerEstado(`Sincronizado · ${hora()}`);
      copiaDelDia();
    })().finally(() => (subiendo = null));
    return subiendo;
  }

  function usarRemoto(fila) {
    aplicarDatos(fila.contenido);
    window.estudio.guardar(D);
    ls.set(LS.cambiado, String(Date.parse(fila.actualizado)));
    ls.set(LS.sincro, fila.actualizado);
  }

  // Compara este dispositivo con la nube y deja los dos iguales
  async function sincronizar({ primeraVez = false } = {}) {
    if (!configurada || !sesion() || !navigator.onLine) {
      if (sesion() && !navigator.onLine) ponerEstado("Sin conexión: se subirá al volver internet");
      return;
    }
    try {
      ponerEstado("Sincronizando…");
      const [fila] = await api("GET");
      const sincro = ls.get(LS.sincro);
      if (!fila) {
        ls.set(LS.cambiado, String(Date.now()));
        await subir();
      } else if (primeraVez || !sincro) {
        // Primera vez en este dispositivo
        if (vacio(D)) usarRemoto(fila);
        else if (confirm(`En la nube ya hay datos (guardados el ${new Date(fila.actualizado).toLocaleString("es-ES")}).\n\nAceptar: usar los de la nube en este dispositivo.\nCancelar: sustituir los de la nube por los de este dispositivo.`)) usarRemoto(fila);
        else {
          ls.set(LS.cambiado, String(Date.now()));
          await subir();
        }
      } else if (Date.parse(fila.actualizado) > Date.parse(sincro)) {
        // Otro dispositivo ha cambiado algo
        if (pendiente()) {
          if (Number(ls.get(LS.cambiado)) > Date.parse(fila.actualizado)) {
            ls.set(LS.descartado, JSON.stringify(fila.contenido));
            await subir();
          } else {
            ls.set(LS.descartado, JSON.stringify(D));
            usarRemoto(fila);
          }
          aviso("Había cambios en dos dispositivos a la vez: se ha quedado el más reciente");
        } else usarRemoto(fila);
      } else if (pendiente()) await subir();
      ponerEstado(`Sincronizado · ${hora()}`);
      copiaDelDia();
      // Con los datos ya al día, se recoge la última lectura del radar que haya hecho el servidor
      window.traerRadarServidor && traerRadarServidor();
    } catch (e) {
      ponerEstado(`No se ha podido sincronizar: ${e.message}`);
    }
  }

  // ---------- Servidor 24 h y avisos ----------
  async function funcion(nombre, cuerpo = {}) {
    const s = await token();
    const r = await fetch(`${CFG.url}/functions/v1/${nombre}`, {
      method: "POST",
      headers: { apikey: CFG.clave, Authorization: `Bearer ${s.access}`, "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(traducir(j.error || j.message || `Error ${r.status}`));
    return j;
  }
  // Los avisos al móvil solo funcionan en la web instalada (en el iPhone, abierta desde el icono de la pantalla de inicio)
  const avisosPosibles = () => location.protocol === "https:" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!CFG.avisos;
  const enIphoneSinInstalar = () => /iphone|ipad/i.test(navigator.userAgent) && !navigator.standalone;
  const claveAvisos = () => {
    const b = atob(CFG.avisos.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (CFG.avisos.length % 4)) % 4));
    return Uint8Array.from(b, (c) => c.charCodeAt(0));
  };
  async function suscripcionAvisos() {
    if (!avisosPosibles()) return null;
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }
  async function activarAvisos() {
    if ((await Notification.requestPermission()) !== "granted") throw new Error("No has dado permiso. Actívalo en Ajustes del iPhone → Notificaciones → Estudio Clipping");
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveAvisos() }));
    const j = sub.toJSON();
    await apiTabla("suscripciones_push", "POST", { endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, dispositivo: navigator.userAgent.slice(0, 160) });
    return funcion("radar", { prueba: true });
  }
  async function desactivarAvisos() {
    const sub = await suscripcionAvisos();
    if (!sub) return;
    await apiTabla("suscripciones_push", "DELETE", null, `endpoint=eq.${encodeURIComponent(sub.endpoint)}`).catch(() => {});
    await sub.unsubscribe();
  }

  window.nube = {
    funcion,
    async radarServidor() {
      const [f] = await apiTabla("radar_servidor", "GET", null, "select=contenido&id=eq.1");
      return f?.contenido || null;
    },
    informes: () => apiTabla("informes", "GET", null, "select=semana,contenido,modelo,coste_usd,creado&order=semana.desc&limit=12"),
    correo: () => (configurada && sesion() ? sesion().email : null),
    // Para el bloqueo con código: comprueba la contraseña de la cuenta sin tocar la sesión guardada
    async comprobarClave(password) {
      try {
        await auth("token?grant_type=password", { email: sesion().email, password });
        return true;
      } catch {
        return false;
      }
    },
    // Lo llama guardar() de app.js después de guardar en local
    cambio() {
      ls.set(LS.cambiado, String(Date.now()));
      if (!configurada || !sesion()) return;
      ponerEstado("Cambios sin subir…");
      clearTimeout(temporizador);
      temporizador = setTimeout(() => (navigator.onLine ? subir().catch((e) => ponerEstado(`No se ha podido subir: ${e.message}`)) : sincronizar()), 1500);
    },

    iniciar() {
      if (!configurada) return;
      // Registro de errores: lo que falle en este dispositivo queda apuntado en la nube para poder arreglarlo
      // (sin datos tuyos: solo el mensaje, el apartado, la versión y el tipo de dispositivo). Máximo 10 por sesión.
      const vistos = new Set();
      const apuntar = (mensaje, detalle) => {
        mensaje = String(mensaje || "Error desconocido").slice(0, 500);
        if (!sesion() || vistos.has(mensaje) || vistos.size >= 10 || /ResizeObserver loop/.test(mensaje)) return;
        vistos.add(mensaje);
        apiTabla("errores", "POST", {
          user_id: sesion().id,
          origen: window.estudio.radar ? "mac" : "web",
          version: typeof VERSION_APP === "string" ? VERSION_APP : "",
          dispositivo: navigator.userAgent.slice(0, 160),
          seccion: typeof seccion === "string" ? seccion : "",
          mensaje,
          detalle: String(detalle || "").slice(0, 3000),
        }).catch(() => {});
      };
      window.addEventListener("error", (e) => apuntar(e.message, `${e.filename || ""}:${e.lineno || ""}:${e.colno || ""}\n${e.error?.stack || ""}`));
      window.addEventListener("unhandledrejection", (e) => apuntar(e.reason?.message || e.reason, e.reason?.stack));
      sincronizar();
      const tranquilo = () => document.getElementById("modal").classList.contains("oculto");
      document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && tranquilo() && sincronizar());
      window.addEventListener("online", () => sincronizar());
      setInterval(() => document.visibilityState === "visible" && tranquilo() && sincronizar(), 60000);
    },

    tarjeta() {
      const s = sesion();
      if (!configurada)
        return `<h2>Sincronización</h2><div class="tarjeta" style="max-width:720px"><p class="peq" style="margin:0">La sincronización todavía no está configurada en esta versión.</p></div>`;
      if (s)
        return `<h2>Sincronización</h2>
        <div class="tarjeta" style="max-width:720px">
          <p style="margin-top:0">Sesión iniciada como <b>${esc(s.email)}</b>. Tus datos son los mismos en todos los dispositivos donde entres con esta cuenta.</p>
          <p class="peq" id="nube-estado">${esc(estado || "…")}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn prim" id="nube-ya">Sincronizar ahora</button>
            <button class="btn" id="nube-copias">Copias en la nube</button>
            <button class="btn" id="nube-salir">Cerrar sesión</button>
          </div>
          <div id="nube-copias-lista"></div>
          <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--borde)">
            <b>Avisos del piloto automático</b>
            <p class="peq" id="avisos-estado">${
              avisosPosibles()
                ? "Comprobando…"
                : window.estudio.radar
                  ? "En el Mac los avisos salen mientras la app está abierta. Para recibirlos siempre, actívalos en el iPhone (aquí mismo, en Ajustes)."
                  : enIphoneSinInstalar()
                    ? "Para recibir avisos, abre Estudio Clipping desde su icono en la pantalla de inicio (no desde Safari) y vuelve aquí."
                    : "Este navegador no admite avisos."
            }</p>
            <div style="display:flex;gap:8px;flex-wrap:wrap" id="avisos-botones"></div>
          </div>
        </div>`;
      return `<h2>Sincronización</h2>
        <div class="tarjeta" style="max-width:720px">
          <p class="peq" style="margin-top:0">Entra con tu cuenta para tener los mismos datos en el Mac, el iPhone y cualquier móvil nuevo. Sin cuenta, todo se queda solo en este dispositivo.</p>
          <div class="form">
            <label>Correo<input id="nube-email" type="email" autocomplete="username" /></label>
            <label>Contraseña<input id="nube-clave" type="password" autocomplete="current-password" placeholder="Mínimo 8 caracteres" /></label>
          </div>
          <p class="peq" id="nube-estado">${esc(estado)}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn prim" id="nube-entrar">Entrar</button>
            <button class="btn" id="nube-crear">Crear cuenta (solo la primera vez)</button>
          </div>
        </div>`;
    },

    montar() {
      const $$ = (id) => document.getElementById(id);
      const credenciales = () => ({ email: $$("nube-email").value.trim(), password: $$("nube-clave").value });
      const entrarCon = async (ruta) => {
        const c = credenciales();
        if (!c.email || !c.password) return ponerEstado("Escribe el correo y la contraseña");
        try {
          ponerEstado("Entrando…");
          const r = await auth(ruta, c);
          if (!r.access_token) return ponerEstado("Cuenta creada, pero falta confirmar el correo. Revisa tu bandeja de entrada.");
          guardarSesion(r);
          ls.set(LS.sincro, null);
          vistaAjustes();
          await sincronizar({ primeraVez: true });
          aviso("Sincronización activada");
        } catch (e) {
          ponerEstado(e.message);
        }
      };
      if ($$("nube-entrar")) $$("nube-entrar").onclick = () => entrarCon("token?grant_type=password");
      if ($$("nube-crear")) $$("nube-crear").onclick = () => entrarCon("signup");
      if ($$("nube-ya")) $$("nube-ya").onclick = () => sincronizar();
      // Avisos: el servidor escribe a este dispositivo cuando el piloto automático cambia algo
      if ($$("avisos-botones") && avisosPosibles()) {
        const pintar = async () => {
          const sub = await suscripcionAvisos().catch(() => null);
          $$("avisos-estado").textContent = sub
            ? "Activados en este dispositivo: te escribiré cuando el piloto termine, pause o te proponga campañas (el servidor mira Whop y Vyro cada 3 horas)."
            : "Recibe un aviso en este dispositivo cuando el piloto automático termine, pause o te proponga campañas, aunque no tengas la app abierta.";
          $$("avisos-botones").innerHTML = sub
            ? `<button class="btn" id="avisos-prueba">Enviar aviso de prueba</button><button class="btn" id="avisos-off">Desactivar</button>`
            : `<button class="btn prim" id="avisos-on">Activar avisos</button>`;
          const accion = (id, fn, ok) =>
            $$(id) &&
            ($$(id).onclick = async () => {
              $$(id).disabled = true;
              try {
                await fn();
                aviso(ok);
              } catch (e) {
                aviso("No se ha podido: " + e.message);
              }
              pintar();
            });
          accion("avisos-on", activarAvisos, "Avisos activados: te llegará uno de prueba");
          accion("avisos-prueba", () => funcion("radar", { prueba: true }), "Aviso de prueba enviado");
          accion("avisos-off", desactivarAvisos, "Avisos desactivados en este dispositivo");
        };
        pintar();
      }
      if ($$("nube-copias"))
        $$("nube-copias").onclick = async () => {
          const zona = $$("nube-copias-lista");
          zona.innerHTML = `<p class="peq">Cargando copias…</p>`;
          try {
            let copias = await apiTabla("copias", "GET", null, "select=fecha,creada&order=fecha.desc");
            if (!copias.some((c) => c.fecha === hoyISO())) {
              const r = await copiaDelDia(true);
              if (r !== true) throw r;
              copias = await apiTabla("copias", "GET", null, "select=fecha,creada&order=fecha.desc");
            }
            zona.innerHTML = copias.length
              ? `<p class="peq" style="margin-bottom:6px">Una copia al día de tus datos (sin el radar), de los últimos 30 días. Restaurar sustituye tus datos actuales por los de ese día en todos tus dispositivos.</p>${copias
                  .map((c) => `<div class="fila-num"><span>${new Date(c.fecha + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}</span><button class="btn peq" data-restaurar="${c.fecha}">Restaurar</button></div>`)
                  .join("")}`
              : `<p class="peq">Aún no hay copias. Se hace una al día al sincronizar.</p>`;
            zona.querySelectorAll("[data-restaurar]").forEach(
              (b) =>
                (b.onclick = async () => {
                  const f = b.dataset.restaurar;
                  if (!confirm(`¿Restaurar tus datos tal como estaban el ${f}? Lo que hayas cambiado después se perderá (antes se guarda una copia de lo actual en este dispositivo).`)) return;
                  const [c] = await apiTabla("copias", "GET", null, `select=contenido&fecha=eq.${f}`);
                  ls.set(LS.descartado, JSON.stringify(D));
                  aplicarDatos({ ...c.contenido, radar: D.radar });
                  guardar();
                  aviso(`Datos restaurados al ${f}`);
                })
            );
          } catch (e) {
            zona.innerHTML = tablaCopiasFalta(e)
              ? `<div class="tarjeta" style="border-color:var(--ambar)">Las copias en la nube aún no están activadas en tu proyecto de Supabase. Falta crear la tabla «copias» (te lo explico en el chat).</div>`
              : `<p class="peq">No se han podido cargar: ${esc(e.message)}</p>`;
          }
        };
      if ($$("nube-salir"))
        $$("nube-salir").onclick = () => {
          if (!confirm("¿Cerrar sesión? Los datos se quedan en este dispositivo, pero dejarán de sincronizarse.")) return;
          const s = sesion();
          fetch(`${CFG.url}/auth/v1/logout`, { method: "POST", headers: { apikey: CFG.clave, Authorization: `Bearer ${s.access}` } }).catch(() => {});
          ls.set(LS.sesion, null);
          ls.set(LS.sincro, null);
          ponerEstado("");
          vistaAjustes();
        };
    },
  };
})();
