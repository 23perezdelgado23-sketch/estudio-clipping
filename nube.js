// Sincronización con la nube (Supabase): los mismos datos en el Mac, el iPhone y cualquier dispositivo nuevo.
// Cada dispositivo sigue guardando en local; con sesión iniciada, además sube cada cambio y baja los de los demás.
// Si dos dispositivos cambian a la vez sin conexión, gana el cambio más reciente y el otro se guarda como copia.
(() => {
  const CFG = window.NUBE_CONFIG || {};
  const LS = {
    sesion: "nube:sesion",
    cambiado: "nube:cambiadoEn", // último cambio hecho en este dispositivo (ms)
    sincro: "nube:sincronizadoEn", // fecha de la versión de la nube con la que coincide este dispositivo (ISO)
    descartado: "nube:descartado", // copia de seguridad de este dispositivo antes de juntarlo con la nube
    base: "nube:base", // última versión común con la nube (para juntar cambios sin perder nada)
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
    if (/password should be at least/i.test(m)) return "La contraseña es demasiado corta (mínimo 12 caracteres)";
    if (/email not confirmed/i.test(m)) return "Falta confirmar el correo";
    if (/failed to fetch|network/i.test(m)) return "Sin conexión";
    if (/invalid jwt|jwt expired|token is (malformed|expired)|session.*(missing|not found)/i.test(m)) return "El enlace del correo no es válido o ha caducado. Pide otro.";
    if (/same.*password|different from the old/i.test(m)) return "La contraseña nueva tiene que ser distinta de la anterior";
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

  // ---------- Verificación en dos pasos (código de 6 cifras de una app de códigos, TOTP) ----------
  // Con ella activada, la base de datos solo deja ver los datos a sesiones que hayan puesto el código (nivel «aal2»).
  const nivel = (access) => {
    try {
      return JSON.parse(atob(access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).aal;
    } catch {
      return "";
    }
  };
  async function authCon(metodo, ruta, cuerpo) {
    const s = await token();
    const r = await fetch(`${CFG.url}/auth/v1/${ruta}`, {
      method: metodo,
      headers: { apikey: CFG.clave, Authorization: `Bearer ${s.access}`, "Content-Type": "application/json" },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(traducir(j.msg || j.message || j.error_description || `Error ${r.status}`));
    return j;
  }
  const factores = async () => ((await authCon("GET", "user")).factors || []).filter((f) => f.factor_type === "totp");
  async function verificarCodigo(factorId, code) {
    const ch = await authCon("POST", `factors/${factorId}/challenge`);
    const r = await authCon("POST", `factors/${factorId}/verify`, { challenge_id: ch.id, code });
    guardarSesion(r);
  }
  // Pide el código en una ventana; devuelve true si se ha verificado
  function pedirCodigo(factorId) {
    return new Promise((fin) => {
      abrirModal(
        `<h3>Código de verificación</h3>
        <p class="peq">Abre la app de códigos (en el iPhone, la app Contraseñas → Estudio Clipping) y escribe el código de 6 cifras.</p>
        <div class="form"><label class="ancho">Código<input id="mfa-codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" /></label></div>
        <p class="peq" id="mfa-estado"></p>
        <div class="modal-pie"><div></div><div><button class="btn" id="mfa-luego">Ahora no</button> <button class="btn prim" id="mfa-ok">Entrar</button></div></div>`,
        (caja) => {
          const campo = caja.querySelector("#mfa-codigo");
          const enviar = async () => {
            const code = campo.value.replace(/\D/g, "");
            if (code.length !== 6) return (caja.querySelector("#mfa-estado").textContent = "Son 6 cifras");
            try {
              await verificarCodigo(factorId, code);
              cerrarModal();
              fin(true);
            } catch (e) {
              caja.querySelector("#mfa-estado").textContent = /invalid|expired/i.test(e.message) ? "Código incorrecto o caducado: espera al siguiente" : e.message;
            }
          };
          caja.querySelector("#mfa-ok").onclick = enviar;
          campo.onkeydown = (e) => {
            if (e.key === "Enter") enviar();
          };
          caja.querySelector("#mfa-luego").onclick = () => {
            cerrarModal();
            fin(false);
          };
          setTimeout(() => campo.focus(), 50);
        }
      );
    });
  }
  // Antes de leer o guardar en la nube: si la cuenta tiene la verificación activada y esta sesión aún no ha puesto el código, se pide
  let pidiendo = null;
  let aplazado = false; // «Ahora no»: no se vuelve a pedir solo, hasta pulsar «Sincronizar ahora»
  // Si el servidor ha cerrado la sesión (por ejemplo, al activar la verificación en dos pasos en otro dispositivo,
  // que cierra las demás sesiones por seguridad), se sale y se pide entrar otra vez. Los datos se quedan en el dispositivo.
  function sesionCerrada(e) {
    if (!/session_id claim in jwt does not exist|session.*not found|refresh token not found|invalid refresh token/i.test(e?.message || "")) return false;
    ls.set(LS.sesion, null);
    ls.set(LS.sincro, null);
    estado = "Por seguridad se ha cerrado la sesión en este dispositivo. Vuelve a entrar con tu correo y tu contraseña (y el código, si tienes la verificación en dos pasos).";
    typeof seccion === "string" && seccion === "ajustes" ? vistaAjustes() : aviso("Vuelve a entrar en Ajustes → Sincronización");
    return true;
  }

  async function asegurarNivel(manual = false) {
    const s = await token();
    if (nivel(s.access) === "aal2") return true;
    const f = (await factores()).find((x) => x.status === "verified");
    if (!f) return true;
    if (nivel(sesion()?.access) === "aal2") return true; // otra sincronización ya puso el código mientras se consultaba
    if (aplazado && !manual) return false;
    pidiendo ||= pedirCodigo(f.id).then((ok) => ((aplazado = !ok), ok)).finally(() => (pidiendo = null));
    return pidiendo;
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
      await apiTabla("copias", "POST", { user_id: dueno(), fecha: hoy, contenido: sinRadar(D) });
      const limite = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
      await apiTabla("copias", "DELETE", null, `user_id=eq.${dueno()}&fecha=lt.${limite}`);
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
    if (Object.values(d.ajustes || {}).some((v) => v !== "" && v != null && typeof v !== "object")) return false;
    return !(d.ganchos || []).some((g) => g.favorito) && (d.ganchos || []).length === GANCHOS_BASE.length;
  }

  // ---------- Equipo: los datos son los del dueño del equipo (o los míos si no estoy en ninguno) ----------
  const dueno = () => ls.get("nube:dueno") || sesion()?.id;
  async function averiguarDueno() {
    const s = sesion();
    if (!s) return;
    try {
      const [m] = await apiTabla("miembros", "GET", null, `select=dueno_id&user_id=eq.${s.id}`);
      const nuevo = m?.dueno_id || s.id;
      if (nuevo !== dueno()) {
        // Ha entrado (o salido) de un equipo: la próxima sincronización es como la primera
        ls.set("nube:dueno", nuevo);
        ls.set(LS.sincro, null);
        ls.set(LS.base, null);
      }
    } catch {}
  }

  // ---------- Fusión de cambios ----------
  // Fusión a tres bandas con la última versión común (base): lo que cambió solo en un lado se queda;
  // si los dos cambiaron el mismo clip, se juntan campo a campo, y solo si cambiaron el mismo campo gana este dispositivo.
  const LISTAS = ["campanas", "clips", "cuentas", "cobros", "cortes", "permisos", "ganchos"];
  const igual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  function fusionarObjeto(b, l, r) {
    b = b || {};
    const o = {};
    for (const k of new Set([...Object.keys(l || {}), ...Object.keys(r || {})])) {
      const v = igual(l?.[k], r?.[k]) ? l?.[k] : igual(l?.[k], b[k]) ? r?.[k] : l?.[k];
      if (v !== undefined) o[k] = v;
    }
    return o;
  }
  function fusionarLista(B = [], L = [], R = []) {
    const clave = (x) => x?.id ?? JSON.stringify(x);
    const mapa = (xs) => new Map(xs.map((x) => [clave(x), x]));
    const mb = mapa(B), ml = mapa(L), mr = mapa(R);
    const res = [];
    for (const k of new Set([...mr.keys(), ...ml.keys()])) {
      const b = mb.get(k), l = ml.get(k), r = mr.get(k);
      if (l && r) res.push(igual(l, r) || igual(r, b) ? l : igual(l, b) ? r : fusionarObjeto(b, l, r));
      else if (l) (!b || !igual(l, b)) && res.push(l); // nuevo aquí, o borrado allí pero cambiado aquí
      else if (r) (!b || !igual(r, b)) && res.push(r);
    }
    return res;
  }
  function fusionar(base, local, remoto) {
    base = base || {};
    const o = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remoto)])) {
      const b = base[k], l = local[k], r = remoto[k];
      if (k === "radar") {
        const nuevo = (l?.actualizado || "") > (r?.actualizado || "") ? l : r;
        o.radar = nuevo && { ...nuevo, descartadas: { ...(r?.descartadas || {}), ...(l?.descartadas || {}) } };
      } else if (LISTAS.includes(k)) o[k] = fusionarLista(b, l, r);
      else if (l && r && typeof l === "object" && typeof r === "object" && !Array.isArray(l)) o[k] = fusionarObjeto(b, l, r);
      else o[k] = igual(l, r) || igual(r, b) ? l : igual(l, b) ? r : l;
    }
    return o;
  }

  const pendiente = () => Number(ls.get(LS.cambiado) || 0) > Date.parse(ls.get(LS.sincro) || 0);
  const leerBase = () => {
    try {
      return JSON.parse(ls.get(LS.base));
    } catch {
      return null;
    }
  };
  const marcarSincronizado = (contenido, cuando) => {
    ls.set(LS.sincro, cuando);
    ls.set(LS.base, JSON.stringify(sinRadar(contenido)));
  };
  const leerNube = async () => (await apiTabla("datos", "GET", null, `select=contenido,actualizado&user_id=eq.${dueno()}`))[0];

  // Subida segura: la nube solo la acepta si nadie ha subido nada desde nuestra última sincronización.
  // Si alguien se ha adelantado, se juntan sus cambios con los nuestros y se vuelve a intentar.
  async function subir() {
    if (subiendo) return subiendo;
    subiendo = (async () => {
      for (let intento = 0; intento < 3; intento++) {
        const nuevo = new Date().toISOString();
        const s = await token();
        const r = await fetch(`${CFG.url}/rest/v1/rpc/guardar_datos`, {
          method: "POST",
          headers: { apikey: CFG.clave, Authorization: `Bearer ${s.access}`, "Content-Type": "application/json" },
          body: JSON.stringify({ p_dueno: dueno(), p_contenido: D, p_base: ls.get(LS.sincro) || null, p_nuevo: nuevo }),
        });
        const ok = await r.json().catch(() => null);
        if (!r.ok) throw new Error(traducir(ok?.message || `Error ${r.status}`));
        if (ok === true) {
          marcarSincronizado(D, nuevo);
          ls.set(LS.cambiado, String(Date.parse(nuevo)));
          ponerEstado(`Sincronizado · ${hora()}`);
          copiaDelDia();
          return;
        }
        await juntarConNube();
      }
      throw new Error("Otro dispositivo está guardando a la vez. Se reintentará en un momento.");
    })().finally(() => (subiendo = null));
    return subiendo;
  }

  // Trae lo de la nube y lo junta con lo de este dispositivo (sin perder nada de ninguno de los dos)
  async function juntarConNube(base = leerBase()) {
    const fila = await leerNube();
    if (!fila) return;
    const junto = fusionar(base, D, fila.contenido);
    aplicarDatos(junto);
    window.estudio.guardar(D);
    marcarSincronizado(fila.contenido, fila.actualizado);
    ls.set(LS.cambiado, String(Date.now())); // queda pendiente de subir lo juntado
  }

  function usarRemoto(fila) {
    aplicarDatos(fila.contenido);
    window.estudio.guardar(D);
    ls.set(LS.cambiado, String(Date.parse(fila.actualizado)));
    marcarSincronizado(fila.contenido, fila.actualizado);
  }

  // Compara este dispositivo con la nube y deja los dos iguales
  async function sincronizar({ primeraVez = false, manual = false } = {}) {
    if (!configurada || !sesion() || !navigator.onLine) {
      if (sesion() && !navigator.onLine) ponerEstado("Sin conexión: se subirá al volver internet");
      return;
    }
    try {
      ponerEstado("Sincronizando…");
      if (!(await asegurarNivel(manual || primeraVez))) return ponerEstado("Falta el código de verificación: pulsa «Sincronizar ahora» para ponerlo");
      await averiguarDueno();
      const fila = await leerNube();
      const sincro = ls.get(LS.sincro);
      if (!fila) {
        if (dueno() !== sesion().id) throw new Error("Los datos del equipo aún no están en la nube: pide al dueño que abra la app");
        ls.set(LS.cambiado, String(Date.now()));
        await subir();
      } else if (primeraVez || !sincro) {
        // Primera vez en este dispositivo (o recién entrado en un equipo)
        if (vacio(D)) usarRemoto(fila);
        else if (confirm(`En la nube ya hay datos (guardados el ${new Date(fila.actualizado).toLocaleString("es-ES")}).\n\nAceptar: usar los de la nube en este dispositivo.\nCancelar: juntar los de este dispositivo con los de la nube (no se pierde nada).`)) usarRemoto(fila);
        else {
          ls.set(LS.descartado, JSON.stringify(D));
          await juntarConNube({});
          await subir();
        }
      } else if (fila.actualizado !== sincro && Date.parse(fila.actualizado) > Date.parse(sincro)) {
        // Otro dispositivo (o tu compañero) ha cambiado algo
        if (pendiente()) {
          await juntarConNube();
          await subir();
          aviso("Se han juntado tus cambios con los de otro dispositivo");
        } else usarRemoto(fila);
      } else if (pendiente()) await subir();
      ponerEstado(`Sincronizado · ${hora()}`);
      copiaDelDia();
      // Con los datos ya al día, se recoge la última lectura del radar que haya hecho el servidor
      window.traerRadarServidor && traerRadarServidor();
    } catch (e) {
      if (sesionCerrada(e)) return;
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

  // ---------- Enlaces de los correos: invitación al equipo y «he olvidado mi contraseña» ----------
  function procesarEnlaceCorreo() {
    const h = new URLSearchParams(location.hash.slice(1));
    const limpiar = () => history.replaceState(null, "", location.pathname + location.search);
    if (h.get("error_description")) {
      limpiar();
      return alert(/expired|invalid/i.test(h.get("error_description")) ? "El enlace del correo ha caducado o ya se usó. Pide otro (invitación nueva o «He olvidado mi contraseña»)." : "El enlace del correo no es válido: " + h.get("error_description"));
    }
    const access = h.get("access_token"), tipo = h.get("type");
    if (!access || !["invite", "recovery", "signup", "magiclink"].includes(tipo)) return;
    limpiar();
    const invitado = tipo === "invite" || tipo === "signup";
    abrirModal(
      `<h3>${invitado ? "Bienvenido a Estudio Clipping" : "Elige una contraseña nueva"}</h3>
      <p class="peq">${invitado ? "Te han invitado a un equipo de Estudio Clipping. Elige tu contraseña: con tu correo y esta contraseña entrarás en el Mac, en el iPhone o en cualquier ordenador." : "Escribe tu contraseña nueva. Después entrarás con ella en todos tus dispositivos."}</p>
      <div class="form"><label class="ancho">Contraseña nueva<input type="password" id="clave-nueva" autocomplete="new-password" placeholder="Mínimo 12 caracteres" /></label>
      <label class="ancho">Repítela<input type="password" id="clave-nueva2" autocomplete="new-password" /></label></div>
      <p class="peq" id="clave-error" style="color:var(--rosa)"></p>
      <div class="modal-pie"><span></span><button class="btn prim" id="clave-ok">Guardar contraseña</button></div>`,
      (caja) => {
        const error = (t) => (caja.querySelector("#clave-error").textContent = t);
        caja.querySelector("#clave-ok").onclick = async () => {
          const c1 = caja.querySelector("#clave-nueva").value, c2 = caja.querySelector("#clave-nueva2").value;
          if (c1.length < 12) return error("Mínimo 12 caracteres");
          if (c1 !== c2) return error("Las dos contraseñas no coinciden");
          try {
            error("Guardando…");
            const yo = JSON.parse(atob(access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
            guardarSesion({ access_token: access, refresh_token: h.get("refresh_token"), expires_in: +h.get("expires_in") || 3600, user: { id: yo.sub, email: yo.email } });
            // Con la verificación en dos pasos activada, Supabase pide el código también para cambiar la contraseña
            const cambiar = () => authCon("PUT", "user", { password: c1 });
            try {
              await cambiar();
            } catch (e) {
              if (!/aal2/i.test(e.message)) throw e;
              const f = (await factores()).find((x) => x.status === "verified");
              if (!f || !(await pedirCodigo(f.id))) throw new Error("Hace falta el código de verificación para cambiar la contraseña. Vuelve a abrir el enlace del correo.");
              await cambiar();
            }
            ls.set(LS.sincro, null);
            ls.set("nube:dueno", null);
            cerrarModal();
            aviso("Contraseña guardada. Ya estás dentro");
            await sincronizar({ primeraVez: true });
            if (seccion === "ajustes") vistaAjustes();
          } catch (e) {
            caja.isConnected ? error(e.message) : aviso(e.message);
          }
        };
      }
    );
  }

  // ---------- Equipo ----------
  const nombresGuardados = () => {
    try {
      return JSON.parse(ls.get("nube:equipo")) || {};
    } catch {
      return {};
    }
  };
  // Supabase da el QR como SVG sin codificar («data:image/svg+xml;utf-8,<svg…»): los «#» de sus colores lo cortan,
  // así que se vuelve a codificar en base64
  const qrComoImagen = (qr) => {
    const svg = qr.startsWith("data:") ? decodeURIComponent(qr.slice(qr.indexOf(",") + 1).replace(/%(?![0-9a-f]{2})/gi, "%25")) : qr;
    return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
  };
  // Ajustes → Sincronización: activar o quitar la verificación en dos pasos
  async function pintarMfa() {
    const zona = document.getElementById("mfa-zona");
    if (!zona) return;
    const titulo = "<b>Verificación en dos pasos</b>";
    let lista;
    try {
      lista = await factores();
    } catch (e) {
      if (sesionCerrada(e)) return;
      zona.innerHTML = `${titulo}<p class="peq">No se ha podido comprobar: ${esc(e.message)}</p>`;
      return;
    }
    const activa = lista.find((f) => f.status === "verified");
    if (activa) {
      zona.innerHTML = `${titulo}<p class="peq"><span class="chip verde">Activada</span> Para entrar en un dispositivo nuevo hacen falta tu contraseña <b>y</b> el código de 6 cifras de tu app de códigos. Sin el código, nadie ve tus datos aunque sepa la contraseña.</p>
        <button class="btn" id="mfa-quitar">Desactivar</button>`;
      zona.querySelector("#mfa-quitar").onclick = async () => {
        if (!confirm("¿Quitar la verificación en dos pasos? Tu cuenta quedará protegida solo con la contraseña.")) return;
        try {
          if (nivel((await token()).access) !== "aal2" && !(await pedirCodigo(activa.id))) return;
          await authCon("DELETE", `factors/${activa.id}`);
          aviso("Verificación en dos pasos desactivada");
        } catch (e) {
          aviso("No se ha podido: " + e.message);
        }
        pintarMfa();
      };
      return;
    }
    zona.innerHTML = `${titulo}<p class="peq"><span class="chip ambar">Desactivada</span> Actívala: así, aunque alguien averiguara tu contraseña, no podría entrar sin el código de 6 cifras que genera tu iPhone.</p>
      <button class="btn prim" id="mfa-activar">Activar</button>`;
    zona.querySelector("#mfa-activar").onclick = async () => {
      try {
        // Los intentos a medias (sin verificar) se borran antes de empezar otro
        for (const f of lista.filter((x) => x.status !== "verified")) await authCon("DELETE", `factors/${f.id}`).catch(() => {});
        const f = await authCon("POST", "factors", { factor_type: "totp", friendly_name: `Estudio Clipping ${Date.now()}`, issuer: "Estudio Clipping" });
        const enIphone = !window.estudio.radar;
        zona.innerHTML = `${titulo}
          <ol class="peq" style="padding-left:18px">
            ${
              enIphone
                ? `<li>Pulsa <b>«Añadir a Contraseñas»</b>: se abrirá la app Contraseñas del iPhone para guardar el código de Estudio Clipping.</li>`
                : `<li>Abre la <b>Cámara del iPhone</b>, apunta a este código QR y toca <b>«Añadir código de verificación en Contraseñas»</b>.</li>`
            }
            <li>En la app <b>Contraseñas</b> verás un código de 6 cifras que cambia cada 30 segundos. Escríbelo aquí abajo.</li>
          </ol>
          ${enIphone ? `<a class="btn prim" href="${esc(f.totp.uri)}">Añadir a Contraseñas</a>` : `<img src="${esc(qrComoImagen(f.totp.qr_code))}" alt="Código QR" style="width:200px;height:200px;background:#fff;padding:8px;border-radius:8px" />`}
          <p class="peq">${enIphone ? "Si el botón no funciona" : "Si no puedes escanearlo"}, en Contraseñas → Nuevo → «Configurar clave» escribe esta clave: <code style="user-select:all">${esc(f.totp.secret)}</code></p>
          <div class="form"><label>Código de 6 cifras<input id="mfa-nuevo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" /></label></div>
          <p class="peq" id="mfa-msg"></p>
          <button class="btn prim" id="mfa-confirmar">Confirmar y activar</button> <button class="btn" id="mfa-cancelar">Cancelar</button>`;
        zona.querySelector("#mfa-cancelar").onclick = () => authCon("DELETE", `factors/${f.id}`).catch(() => {}).finally(pintarMfa);
        zona.querySelector("#mfa-confirmar").onclick = async () => {
          const code = zona.querySelector("#mfa-nuevo").value.replace(/\D/g, "");
          if (code.length !== 6) return (zona.querySelector("#mfa-msg").textContent = "Son 6 cifras");
          try {
            await verificarCodigo(f.id, code);
            aviso("Verificación en dos pasos activada ✅");
            pintarMfa();
          } catch (e) {
            zona.querySelector("#mfa-msg").textContent = /invalid|expired/i.test(e.message) ? "Código incorrecto: espera al siguiente y vuelve a probar" : e.message;
          }
        };
      } catch (e) {
        aviso("No se ha podido: " + e.message);
      }
    };
  }

  async function pintarEquipo() {
    const zona = document.getElementById("equipo-zona");
    const s = sesion();
    if (!zona || !s) return;
    const soyDueno = dueno() === s.id;
    let miembros = [];
    try {
      miembros = await apiTabla("miembros", "GET", null, soyDueno ? `select=user_id,email,nombre,creado&dueno_id=eq.${s.id}&order=creado` : `select=user_id,email,nombre&user_id=eq.${s.id}`);
    } catch (e) {
      return (zona.innerHTML = `<b>Equipo</b><p class="peq">No se ha podido cargar: ${esc(e.message)}</p>`);
    }
    const nombres = { ...nombresGuardados(), [s.id]: D.ajustes.nombre || s.email.split("@")[0] };
    miembros.forEach((m) => (nombres[m.user_id] = m.nombre || m.email.split("@")[0]));
    ls.set("nube:equipo", JSON.stringify(nombres));
    // Reparto: lo que ha hecho cada uno (clips publicados, vistas y euros estimados)
    const pub = D.clips.filter((c) => CUENTAN_VISTAS.includes(c.estado));
    const personas = [...new Set([...Object.keys(nombres), ...pub.map((c) => c.autorId || "")])];
    const filas = personas
      .map((id) => {
        const suyos = pub.filter((c) => (c.autorId || "") === id);
        return { id, nombre: id ? nombres[id] || "Otra persona" : "Sin asignar", clips: suyos.length, vistas: suyos.reduce((a, c) => a + n(c.vistas), 0), euros: suyos.reduce((a, c) => a + gananciaClip(c), 0) };
      })
      .filter((f) => f.id || f.clips);
    zona.innerHTML = `<b>Equipo</b>
      <p class="peq">${soyDueno ? (miembros.length ? "Tu equipo ve y cambia los mismos datos que tú. Cada uno entra con su correo y su contraseña." : "Invita a tu compañero: verá y cambiará los mismos datos que tú (campañas, cuentas, clips), cada uno con su correo y su contraseña.") : "Trabajas en un equipo compartido: ves y cambias los mismos datos que el dueño del equipo."}</p>
      ${soyDueno && miembros.length ? miembros.map((m) => `<div class="fila-num"><span>${esc(m.nombre || "—")} <span class="peq">${esc(m.email)}</span></span><button class="btn peq peligro" data-quitar="${m.user_id}">Quitar</button></div>`).join("") : ""}
      ${
        soyDueno
          ? `<div class="form" style="margin-top:10px"><label>Correo de tu compañero<input id="eq-email" type="email" placeholder="nombre@gmail.com" /></label><label>Su nombre<input id="eq-nombre" placeholder="Para saber quién hizo cada clip" /></label></div>
        <button class="btn prim" id="eq-invitar" style="margin-top:8px">Invitar al equipo</button>
        <p class="peq">Le llegará un correo de Supabase (en inglés) con un botón para elegir su contraseña. Mira en spam si no lo ve.</p>`
          : ""
      }
      ${filas.some((f) => f.clips) ? `<table style="margin-top:10px"><thead><tr><th>Quién</th><th class="num">Clips publicados</th><th class="num">Vistas</th><th class="num">Estimado</th></tr></thead><tbody>${filas.map((f) => `<tr><td>${esc(f.nombre)}</td><td class="num">${f.clips}</td><td class="num">${fmtNum(f.vistas)}</td><td class="num">${fmtEur(f.euros)}</td></tr>`).join("")}</tbody></table>` : ""}`;
    const inv = document.getElementById("eq-invitar");
    inv &&
      (inv.onclick = async () => {
        const email = document.getElementById("eq-email").value.trim();
        if (!email) return aviso("Escribe su correo");
        inv.disabled = true;
        try {
          const r = await funcion("radar", { invitar: { email, nombre: document.getElementById("eq-nombre").value.trim() } });
          aviso(r.yaTenia ? "Añadido al equipo (ya tenía cuenta: que entre con su contraseña)" : "Invitación enviada: dile que mire su correo");
        } catch (e) {
          aviso("No se ha podido invitar: " + e.message);
        }
        pintarEquipo();
      });
    zona.querySelectorAll("[data-quitar]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (!confirm("¿Quitar a esta persona del equipo? Dejará de ver y cambiar tus datos (lo que ya hizo se queda).")) return;
          try {
            await apiTabla("miembros", "DELETE", null, `dueno_id=eq.${s.id}&user_id=eq.${b.dataset.quitar}`);
            aviso("Quitado del equipo");
          } catch (e) {
            aviso("No se ha podido: " + e.message);
          }
          pintarEquipo();
        })
    );
  }

  window.nube = {
    funcion,
    async radarServidor() {
      const [f] = await apiTabla("radar_servidor", "GET", null, "select=contenido&id=eq.1");
      return f?.contenido || null;
    },
    informes: () => apiTabla("informes", "GET", null, `select=semana,contenido,modelo,coste_usd,creado&user_id=eq.${dueno()}&order=semana.desc&limit=12`),
    miId: () => sesion()?.id || "",
    // Personas del equipo (para «Hecho por» en cada clip)
    personas: () => Object.entries(nombresGuardados()),
    // Para pruebas: la fusión de cambios
    _fusionar: fusionar,
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
      procesarEnlaceCorreo();
      window.addEventListener("hashchange", procesarEnlaceCorreo);
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
          <div id="mfa-zona" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--borde)"><b>Verificación en dos pasos</b><p class="peq">Comprobando…</p></div>
          <div id="equipo-zona" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--borde)"><b>Equipo</b><p class="peq">Cargando…</p></div>
        </div>`;
      return `<h2>Sincronización</h2>
        <div class="tarjeta" style="max-width:720px">
          <p class="peq" style="margin-top:0">Entra con tu cuenta para tener los mismos datos en el Mac, el iPhone y cualquier móvil nuevo. Sin cuenta, todo se queda solo en este dispositivo.</p>
          <div class="form">
            <label>Correo<input id="nube-email" type="email" autocomplete="username" /></label>
            <label>Contraseña<input id="nube-clave" type="password" autocomplete="current-password" /></label>
          </div>
          <p class="peq" id="nube-estado">${esc(estado)}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn prim" id="nube-entrar">Entrar</button>
            <button class="btn" id="nube-crear">Crear cuenta (solo la primera vez)</button>
            <button class="btn fant" id="nube-olvido">He olvidado mi contraseña</button>
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
      if ($$("nube-ya")) $$("nube-ya").onclick = () => sincronizar({ manual: true });
      pintarEquipo();
      pintarMfa();
      if ($$("nube-olvido"))
        $$("nube-olvido").onclick = async () => {
          const email = $$("nube-email").value.trim();
          if (!email) return ponerEstado("Escribe tu correo arriba y vuelve a pulsar");
          try {
            const r = await fetch(`${CFG.url}/auth/v1/recover?redirect_to=${encodeURIComponent(CFG.web || location.href)}`, { method: "POST", headers: { apikey: CFG.clave, "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
            if (!r.ok) throw new Error(traducir((await r.json().catch(() => ({}))).msg || `Error ${r.status}`));
            ponerEstado("Te hemos mandado un correo (en inglés) para elegir una contraseña nueva. Puede tardar unos minutos: mira también en spam.");
          } catch (e) {
            ponerEstado(/rate|limit/i.test(e.message) ? "Se han pedido demasiados correos seguidos. Prueba dentro de un rato." : e.message);
          }
        };
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
            let copias = await apiTabla("copias", "GET", null, `select=fecha,creada&user_id=eq.${dueno()}&order=fecha.desc`);
            if (!copias.some((c) => c.fecha === hoyISO())) {
              const r = await copiaDelDia(true);
              if (r !== true) throw r;
              copias = await apiTabla("copias", "GET", null, `select=fecha,creada&user_id=eq.${dueno()}&order=fecha.desc`);
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
                  const [c] = await apiTabla("copias", "GET", null, `select=contenido&user_id=eq.${dueno()}&fecha=eq.${f}`);
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
