// Bloqueo con código: al abrir la app (y al volver a ella tras un rato) se pide un código de 6 cifras.
// El código se guarda cifrado (SHA-256 con sal) en este dispositivo. Si se olvida, se quita con la contraseña de la cuenta de sincronización.
(() => {
  const LS = { hash: "bloqueo:hash", sal: "bloqueo:sal", minutos: "bloqueo:minutos", fallos: "bloqueo:fallos", espera: "bloqueo:esperaHasta" };
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
  const LARGO = 6;
  const activo = () => !!ls.get(LS.hash);
  const minutos = () => Number(ls.get(LS.minutos) ?? 1);
  let ocultaDesde = null;

  async function cifrar(codigo, sal) {
    const datos = new TextEncoder().encode(sal + ":" + codigo);
    const h = await crypto.subtle.digest("SHA-256", datos);
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async function guardarCodigo(codigo) {
    const sal = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
    ls.set(LS.sal, sal);
    ls.set(LS.hash, await cifrar(codigo, sal));
  }
  const correcto = async (codigo) => (await cifrar(codigo, ls.get(LS.sal))) === ls.get(LS.hash);

  // Pantalla con teclado numérico. modo: "abrir" (bloqueo), o una función que recibe el código tecleado.
  function pantalla({ titulo, texto, alTerminar, cancelable, olvidado }) {
    document.getElementById("bloqueo")?.remove();
    const capa = document.createElement("div");
    capa.id = "bloqueo";
    capa.innerHTML = `
      <div class="bloq-caja">
        <img src="icono.png" alt="" class="bloq-icono" />
        <h2>${titulo}</h2>
        <p class="bloq-texto">${texto || ""}</p>
        <div class="bloq-puntos">${"<span></span>".repeat(LARGO)}</div>
        <p class="bloq-error" id="bloq-error"></p>
        <div class="bloq-teclado">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}">${n}</button>`).join("")}
          <span></span><button data-n="0">0</button><button data-borrar aria-label="Borrar">⌫</button>
        </div>
        <div class="bloq-pie">
          ${cancelable ? `<button class="btn fant" id="bloq-cancelar">Cancelar</button>` : ""}
          ${olvidado ? `<button class="btn fant" id="bloq-olvido">¿Has olvidado el código?</button>` : ""}
        </div>
      </div>`;
    document.body.appendChild(capa);
    document.documentElement.classList.add("bloqueada");
    let codigo = "";
    const puntos = capa.querySelectorAll(".bloq-puntos span");
    const pintar = () => puntos.forEach((p, i) => p.classList.toggle("lleno", i < codigo.length));
    const error = (t) => {
      capa.querySelector("#bloq-error").textContent = t;
      capa.querySelector(".bloq-puntos").classList.add("mal");
      setTimeout(() => capa.querySelector(".bloq-puntos")?.classList.remove("mal"), 400);
    };
    const pulsar = async (n) => {
      if (n === "borrar") codigo = codigo.slice(0, -1);
      else if (codigo.length < LARGO) codigo += n;
      pintar();
      if (codigo.length === LARGO) {
        const c = codigo;
        codigo = "";
        const r = await alTerminar(c);
        if (typeof r === "string") (error(r), pintar());
      }
    };
    capa.querySelectorAll(".bloq-teclado button").forEach((b) => (b.onclick = () => pulsar(b.dataset.borrar !== undefined ? "borrar" : b.dataset.n)));
    capa.tecla = (e) => {
      if (e.target.tagName === "INPUT") return;
      e.stopPropagation();
      if (/^[0-9]$/.test(e.key)) pulsar(e.key);
      else if (e.key === "Backspace") pulsar("borrar");
      else if (e.key === "Escape" && cancelable) cerrar();
    };
    document.addEventListener("keydown", capa.tecla, true);
    capa.querySelector("#bloq-cancelar") && (capa.querySelector("#bloq-cancelar").onclick = () => cerrar());
    capa.querySelector("#bloq-olvido") && (capa.querySelector("#bloq-olvido").onclick = olvidado);
    return capa;
  }
  function cerrar() {
    const capa = document.getElementById("bloqueo");
    if (capa) document.removeEventListener("keydown", capa.tecla, true), capa.remove();
    document.documentElement.classList.remove("bloqueada");
  }

  function bloquear() {
    if (!activo() || document.getElementById("bloqueo")) return;
    pantalla({
      titulo: "Estudio Clipping",
      texto: "Escribe tu código para entrar",
      olvidado,
      alTerminar: async (c) => {
        const espera = Number(ls.get(LS.espera) || 0);
        if (Date.now() < espera) return `Demasiados intentos. Espera ${Math.ceil((espera - Date.now()) / 1000)} s`;
        if (await correcto(c)) {
          ls.set(LS.fallos, null);
          cerrar();
          return;
        }
        const fallos = Number(ls.get(LS.fallos) || 0) + 1;
        ls.set(LS.fallos, String(fallos));
        if (fallos >= 5) {
          ls.set(LS.espera, String(Date.now() + Math.min(30 * 2 ** (fallos - 5), 900) * 1000));
          return "Demasiados intentos. Espera un poco";
        }
        return "Código incorrecto";
      },
    });
  }

  async function olvidado() {
    const email = window.nube && nube.correo();
    if (!email) {
      alert("Este dispositivo no tiene la sincronización activada, así que el código no se puede recuperar.\n\nSi tus datos están en la nube, puedes borrar la app de este dispositivo, volver a instalarla y entrar con tu cuenta.");
      return;
    }
    const caja = document.querySelector("#bloqueo .bloq-caja");
    if (!caja) return;
    caja.innerHTML = `
      <img src="icono.png" alt="" class="bloq-icono" />
      <h2>Quitar el código</h2>
      <p class="bloq-texto">Escribe la contraseña de tu cuenta de sincronización (${esc(email)}). Necesitas internet.</p>
      <input type="password" id="bloq-clave" autocomplete="current-password" placeholder="Contraseña" />
      <p class="bloq-error" id="bloq-error"></p>
      <div class="bloq-pie"><button class="btn fant" id="bloq-volver">Volver</button><button class="btn prim" id="bloq-ok">Quitar código</button></div>`;
    const campo = caja.querySelector("#bloq-clave");
    campo.focus();
    caja.querySelector("#bloq-volver").onclick = () => (cerrar(), bloquear());
    const enviar = async () => {
      if (!campo.value) return;
      caja.querySelector("#bloq-error").textContent = "Comprobando…";
      if (!(await nube.comprobarClave(campo.value))) return (caja.querySelector("#bloq-error").textContent = "Contraseña incorrecta, o no hay conexión a internet");
      [LS.hash, LS.sal, LS.fallos, LS.espera].forEach((k) => ls.set(k, null));
      cerrar();
      aviso("Código quitado. Puedes poner uno nuevo en Ajustes");
    };
    caja.querySelector("#bloq-ok").onclick = enviar;
    campo.onkeydown = (e) => (e.stopPropagation(), e.key === "Enter" && enviar());
  }

  // Pide un código nuevo dos veces y lo guarda
  function elegirCodigo(alAcabar) {
    pantalla({
      titulo: "Elige un código",
      texto: `${LARGO} cifras que te acuerdes y que no sean obvias (nada de 123456 ni tu cumpleaños)`,
      cancelable: true,
      alTerminar: async (primero) => {
        if (/^(\d)\1+$/.test(primero) || "0123456789".includes(primero) || "9876543210".includes(primero)) return "Demasiado fácil: elige otro";
        pantalla({
          titulo: "Repite el código",
          cancelable: true,
          alTerminar: async (segundo) => {
            if (segundo !== primero) {
              cerrar();
              aviso("Los códigos no coinciden. Prueba otra vez");
              return;
            }
            await guardarCodigo(primero);
            cerrar();
            alAcabar && alAcabar();
          },
        });
      },
    });
  }

  // Pide el código actual antes de cambiarlo o quitarlo
  function confirmarActual(siguiente) {
    pantalla({
      titulo: "Código actual",
      texto: "Escribe tu código actual para continuar",
      cancelable: true,
      alTerminar: async (c) => {
        if (!(await correcto(c))) return "Código incorrecto";
        cerrar();
        siguiente();
      },
    });
  }

  window.bloqueo = {
    bloquear,
    tarjeta() {
      const opciones = [
        [0, "Siempre que salgas de la app"],
        [1, "Si sales más de 1 minuto"],
        [5, "Si sales más de 5 minutos"],
        [15, "Si sales más de 15 minutos"],
      ];
      return `<h2>Bloqueo con código</h2>
      <div class="tarjeta" style="max-width:720px">
        <p class="peq" style="margin-top:0">${
          activo()
            ? "La app pide tu código al abrirla. Si lo olvidas, puedes quitarlo con la contraseña de tu cuenta de sincronización."
            : "Pon un código de 6 cifras para que nadie pueda abrir la app en este dispositivo sin saberlo. Se configura en cada dispositivo (Mac, iPhone…)."
        }</p>
        ${
          activo()
            ? `<label style="max-width:340px">Pedir el código también al volver<select id="bloq-minutos">${opciones
                .map(([v, t]) => `<option value="${v}" ${v === minutos() ? "selected" : ""}>${t}</option>`)
                .join("")}</select></label>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
                <button class="btn prim" id="bloq-ahora">Bloquear ahora</button>
                <button class="btn" id="bloq-cambiar">Cambiar código</button>
                <button class="btn peligro" id="bloq-quitar">Quitar código</button>
              </div>`
            : `<button class="btn prim" id="bloq-activar">Poner código</button>`
        }
      </div>`;
    },
    montar() {
      const $$ = (id) => document.getElementById(id);
      if ($$("bloq-activar")) $$("bloq-activar").onclick = () => elegirCodigo(() => (vistaAjustes(), aviso("Código activado")));
      if ($$("bloq-ahora")) $$("bloq-ahora").onclick = bloquear;
      if ($$("bloq-cambiar")) $$("bloq-cambiar").onclick = () => confirmarActual(() => elegirCodigo(() => aviso("Código cambiado")));
      if ($$("bloq-quitar"))
        $$("bloq-quitar").onclick = () =>
          confirmarActual(() => {
            [LS.hash, LS.sal, LS.fallos, LS.espera].forEach((k) => ls.set(k, null));
            vistaAjustes();
            aviso("Código quitado");
          });
      if ($$("bloq-minutos")) $$("bloq-minutos").onchange = (e) => ls.set(LS.minutos, e.target.value);
    },
  };

  // Al abrir, bloqueado antes de que se vea nada
  bloquear();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") ocultaDesde = Date.now();
    else if (ocultaDesde && Date.now() - ocultaDesde >= minutos() * 60000) bloquear();
  });
})();
