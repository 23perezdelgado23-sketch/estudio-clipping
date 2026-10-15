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
    const s = await token();
    const r = await fetch(`${CFG.url}/rest/v1/datos${metodo === "GET" ? "?select=contenido,actualizado" : ""}`, {
      method: metodo,
      headers: {
        apikey: CFG.clave,
        Authorization: `Bearer ${s.access}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    if (!r.ok) throw new Error(traducir((await r.json().catch(() => ({}))).message || `Error ${r.status}`));
    return metodo === "GET" ? r.json() : null;
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
    } catch (e) {
      ponerEstado(`No se ha podido sincronizar: ${e.message}`);
    }
  }

  window.nube = {
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
            <button class="btn" id="nube-salir">Cerrar sesión</button>
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
