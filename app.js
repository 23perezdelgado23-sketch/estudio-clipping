"use strict";
// Estudio Clipping · app de escritorio para organizar el clipping en TikTok.
// Todo se guarda en local (datos.json en la carpeta de datos de la app).

// ---------- Datos ----------
const ESTADOS_CLIP = [
  { id: "idea", nombre: "Idea", color: "" },
  { id: "editando", nombre: "Editando", color: "ambar" },
  { id: "listo", nombre: "Listo para subir", color: "cian" },
  { id: "publicado", nombre: "Publicado", color: "rosa" },
  { id: "enviado", nombre: "Enviado a campaña", color: "rosa" },
  { id: "aprobado", nombre: "Aprobado", color: "verde" },
];
const VERSION_APP = "4.13.5";
const CUENTAN_VISTAS = ["publicado", "enviado", "aprobado"];

const CHECKS_TIKTOK = [
  ["formato", "Vertical 9:16 (1080×1920)"],
  ["gancho", "Gancho en los primeros 1–3 s"],
  ["subtitulos", "Subtítulos quemados y legibles"],
  ["edicion", "Edición propia (cortes, zoom, texto): no es un resubido tal cual"],
  ["duracion", "Duración dentro de lo que pide la campaña"],
  ["reglas", "Cumple las reglas de la campaña (menciones, hashtags, enlace)"],
  ["sonido", "Audio original del creador o sonido permitido"],
  ["publicidad", "Etiqueta de publicidad que pide la campaña (#Sponsored, #[Marca]Ad…), visible sin pulsar «más», y ajuste de divulgación de TikTok activado si aparece"],
  ["unico", "Clip único: no subido antes ni en otra cuenta"],
  ["enviado", "Enlace enviado a la campaña tras publicar"],
];

const GANCHOS_BASE = [
  ["Nadie habla de esto, pero…", "Curiosidad"],
  ["Esto es lo más loco que ha dicho en directo", "Reacción"],
  ["Espera al final.", "Curiosidad"],
  ["Así reaccionó cuando le dijeron…", "Reacción"],
  ["¿Tú qué habrías hecho?", "Pregunta"],
  ["Lo dijo sin pensar y se lio", "Polémica"],
  ["En 30 segundos te explica…", "Dato"],
  ["Este dato me ha volado la cabeza", "Dato"],
  ["No me esperaba esta respuesta", "Reacción"],
  ["La historia que nadie conocía de…", "Historia"],
  ["Esto pasó de verdad en directo", "Historia"],
  ["Le pillaron y su cara lo dice todo", "Reacción"],
  ["La pregunta que lo cambió todo", "Pregunta"],
  ["Opinión impopular:", "Polémica"],
  ["Si te pasa esto, mira el vídeo", "Dato"],
];

const VACIO = () => ({
  version: 2,
  ajustes: { nombre: "", usdEur: "", comision: "", objetivoDia: "", objetivoMes: "" },
  campanas: [],
  clips: [],
  cuentas: [],
  ganchos: GANCHOS_BASE.map(([texto, tipo]) => ({ id: uid(), texto, tipo, favorito: false })),
  cobros: [],
  cortes: [],
  permisos: [],
  plan: {},
  rutina: null,
});

let D = null;
let seccion = "panel";
let filtroClips = { texto: "", campana: "", cuenta: "" };

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const n = (v) => (Number.isFinite(+v) ? +v : 0);
const fmtNum = (v) => Math.round(n(v)).toLocaleString("es-ES");
const fmtCorto = (v) => {
  v = n(v);
  if (v >= 1e6) return (v / 1e6).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " M";
  if (v >= 1e3) return (v / 1e3).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " K";
  return fmtNum(v);
};
const fmtEur = (v) => n(v).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const fmtMon = (v, m) => n(v).toLocaleString("es-ES", { style: "currency", currency: m || "EUR" });
// Fecha de hoy en la hora del dispositivo (antes salía la de Londres: de 00:00 a 02:00 en España daba el día anterior)
const fechaLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const hoyISO = () => fechaLocal(new Date());
const fechaCorta = (s) => (s ? new Date(s).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "—");

let temporizador;
function guardar() {
  clearTimeout(temporizador);
  $("#pie-guardado").textContent = "Guardando…";
  temporizador = setTimeout(async () => {
    await window.estudio.guardar(D);
    window.nube && nube.cambio();
    $("#pie-guardado").textContent = "Guardado " + (window.estudio.donde || "en este Mac") + " · " + new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }, 300);
}

function aviso(texto) {
  const a = $("#aviso");
  a.textContent = texto;
  a.classList.remove("oculto");
  clearTimeout(a._t);
  a._t = setTimeout(() => a.classList.add("oculto"), 2400);
}

// ---------- Texto para TikTok ----------
// Junta la etiqueta de publicidad (al principio, para que se vea sin pulsar «más»), la descripción, la mención y los hashtags
function textoParaTikTok(clip, camp) {
  const partes = [];
  if (camp?.divulgacion) partes.push(camp.divulgacion.trim());
  partes.push((clip.descripcion || clip.gancho || "").trim());
  if (camp?.mencion) partes.push(camp.mencion.trim());
  const tags = [...new Set(`${camp?.hashtagsObl || ""} ${clip.hashtags || ""}`.split(/\s+/).filter((t) => t.startsWith("#")))];
  if (tags.length) partes.push(tags.join(" "));
  return partes.filter(Boolean).join("\n\n");
}

// ---------- Cuenta de una campaña ----------
// La que propuso el piloto para esa campaña o, si no, la que más encaja por palabras clave. Con 5 cuentas, un clip
// nunca debe ir por defecto a la primera cuenta: si no se sabe, se deja sin cuenta para que la elijas tú.
function cuentaDeCampana(k, cuentas = D.cuentas) {
  if (!k) return "";
  if (k.cuentaSugerida && cuentas.some((a) => a.id === k.cuentaSugerida)) return k.cuentaSugerida;
  const texto = `${k.nombre} ${k.creador || ""} ${k.reglas || ""}`.toLowerCase();
  const mejor = cuentas.map((a) => [a, clavesCuenta(a).filter((w) => texto.includes(w)).length]).sort((x, y) => y[1] - x[1])[0];
  return mejor && mejor[1] > 0 ? mejor[0].id : "";
}

// ---------- Antiduplicados ----------
// Whop y Vyro no pagan el mismo clip subido en dos cuentas: se avisa si el mismo tramo del mismo vídeo está en otra cuenta
const segundosTramo = (t) => {
  const p = String(t || "").split(":").map(Number);
  return p.length > 1 && !p.some(Number.isNaN) ? p.reduce((s, x) => s * 60 + x, 0) : null;
};
function duplicadosDe(c, lista = D.clips) {
  if (!c.fuente || !c.cuentaId) return [];
  const a0 = segundosTramo(c.inicio), a1 = segundosTramo(c.fin);
  if (a0 == null || a1 == null || a1 <= a0) return [];
  return lista.filter((x) => {
    if (x.id === c.id || !x.cuentaId || x.cuentaId === c.cuentaId || x.fuente !== c.fuente) return false;
    const b0 = segundosTramo(x.inicio), b1 = segundosTramo(x.fin);
    if (b0 == null || b1 == null) return false;
    const solape = Math.min(a1, b1) - Math.max(a0, b0);
    return solape > 0.6 * Math.min(a1 - a0, b1 - b0);
  });
}

// ---------- Cálculos ----------
const campana = (id) => D.campanas.find((c) => c.id === id);
const cuenta = (id) => D.cuentas.find((c) => c.id === id);


// Ganancia estimada de un clip en euros, según las condiciones de su campaña
function gananciaClip(clip) {
  const c = campana(clip.campanaId);
  if (!c || !CUENTAN_VISTAS.includes(clip.estado)) return 0;
  const vistas = n(clip.vistas);
  if (n(c.minVistas) && vistas < n(c.minVistas)) return 0;
  let g = (vistas / 1000) * n(c.cpm);
  if (n(c.maxPorClip)) g = Math.min(g, n(c.maxPorClip));
  if (c.moneda === "USD") g *= n(D.ajustes.usdEur) || 1;
  return g * (1 - n(D.ajustes.comision) / 100);
}
const aEur = (importe, moneda) => (moneda === "USD" ? n(importe) * (n(D.ajustes.usdEur) || 1) : n(importe));

function totalesCampana(c) {
  const clips = D.clips.filter((x) => x.campanaId === c.id);
  const vistas = clips.filter((x) => CUENTAN_VISTAS.includes(x.estado)).reduce((s, x) => s + n(x.vistas), 0);
  const ganado = clips.reduce((s, x) => s + gananciaClip(x), 0);
  const cobrado = D.cobros.filter((p) => p.campanaId === c.id && p.estado === "cobrado").reduce((s, p) => s + aEur(p.importe, p.moneda), 0);
  return { clips: clips.length, vistas, ganado, cobrado };
}

function enMes(fecha, ref = new Date()) {
  if (!fecha) return false;
  const d = new Date(fecha);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

// ---------- Navegación ----------
// Secciones: [id, grupo, nombre, subtítulo]. El icono sale de ICONOS[id] (iconos.js).
const SECCIONES = [
  ["panel", "", "Inicio", "Cómo vas hoy y qué toca hacer"],
  ["empieza", "", "Primeros pasos", "Tu plan con 5 cuentas, que no te baneen y rutina diaria"],
  ["radar", "Campañas", "Radar", "Las campañas reales de Whop y Vyro, puntuadas para tus cuentas"],
  ["campanas", "Campañas", "Mis campañas", "Propuestas y campañas a las que te has unido"],
  ["clips", "Producción", "Clips", "Del corte al cobro"],
  ["mesa", "Producción", "Mesa de corte", "Marca los mejores momentos o deja que la IA los encuentre"],
  ["calendario", "Producción", "Calendario", "Qué publica cada cuenta cada día"],
  ["ganchos", "Producción", "Ganchos", "Frases de arranque y cuáles te funcionan"],
  ["numeros", "Resultados", "Números", "Vistas, euros, qué funciona y proyección"],
  ["cobros", "Resultados", "Cobros", "Lo que te han pagado y lo que falta"],
  ["calculadora", "Resultados", "Calculadora", "Cuántas vistas necesitas para tu objetivo"],
  ["asistente", "Inteligencia artificial", "Asistente IA", "Pregunta lo que quieras sobre tus cuentas, campañas y números"],
  ["estrategia", "Aprender", "Estrategia", "Las 5 cuentas, cómo crearlas sin problemas, qué publicar y horas"],
  ["tiktok", "Aprender", "TikTok a fondo", "Cómo recomienda TikTok y cómo publicar bien"],
  ["conseguir", "Aprender", "Conseguir vídeos", "Whop, Vyro y acuerdos con creadores"],
  ["guia", "Aprender", "Guía", "Lo esencial del clipping y cómo saber si una campaña renta"],
  ["cuentas", "Configuración", "Cuentas", "Tus cuentas de TikTok y cómo rinde cada una"],
  ["ajustes", "Configuración", "Ajustes", "Sincronización, seguridad, IA y copias"],
];
// En el iPhone: barra inferior con lo más usado y «Más» para el resto
const BARRA_MOVIL = ["panel", "radar", "clips", "numeros"];

function contadorMenu(id) {
  if (id === "clips") {
    const n = D.clips.filter((c) => c.estado === "listo").length;
    return n ? `<span class="contador" title="Listos para subir">${n}</span>` : "";
  }
  if (id === "radar" && D.radar?.items?.length) {
    const n = D.radar.items.filter((c) => evaluar(c).joya).length;
    return n ? `<span class="contador verde" title="Joyas en el radar">${n}</span>` : "";
  }
  if (id === "campanas") {
    const n = D.campanas.filter((c) => c.estado === "porunirte").length;
    return n ? `<span class="contador cian" title="Propuestas por revisar">${n}</span>` : "";
  }
  if (id === "empieza" && progresoPlan().pct < 100) return `<span class="contador cian" title="Progreso del plan">${progresoPlan().pct} %</span>`;
  return "";
}

function pintarUsuario() {
  const correo = (window.nube && nube.correo && nube.correo()) || "";
  const nombre = (D.ajustes.nombre || "").trim();
  const av = document.getElementById("avatar");
  if (av) av.textContent = (nombre || correo || "E").charAt(0).toUpperCase();
  const t = document.getElementById("usuario-nombre");
  if (t) t.textContent = nombre || "Mi estudio";
}

function pintarMenu() {
  pintarUsuario();
  const visibles = SECCIONES.filter(([id]) => id !== "empieza" || progresoPlan().pct < 100 || seccion === "empieza");
  let grupo = null;
  $("#menu").innerHTML = visibles
    .map(([id, g, nombre]) => {
      const cab = g !== grupo ? `${g ? `<div class="menu-grupo">${g}</div>` : ""}` : "";
      grupo = g;
      return `${cab}<button data-s="${id}" class="${id === seccion ? "activo" : ""}">${icono(id)}<span class="menu-t">${nombre}</span>${contadorMenu(id)}</button>`;
    })
    .join("");
  $("#menu").querySelectorAll("button").forEach((b) => (b.onclick = () => ir(b.dataset.s)));
  const barra = document.getElementById("barra-movil");
  if (barra) {
    const enBarra = BARRA_MOVIL.includes(seccion);
    barra.innerHTML =
      BARRA_MOVIL.map((id) => {
        const [, , nombre] = SECCIONES.find((x) => x[0] === id);
        return `<button data-s="${id}" class="${id === seccion ? "activo" : ""}">${icono(id)}<span>${id === "panel" ? "Inicio" : nombre}</span>${contadorMenu(id)}</button>`;
      }).join("") + `<button data-mas class="${enBarra ? "" : "activo"}">${icono("mas")}<span>Más</span></button>`;
    barra.querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => ir(b.dataset.s)));
    barra.querySelector("[data-mas]").onclick = abrirMenuMas;
  }
}

// Hoja «Más» del iPhone: todas las secciones por grupos
function abrirMenuMas() {
  let grupo = null;
  abrirModal(
    `<div class="mas-cab" data-sinfoco><b>Todas las secciones</b><button class="btn peq" id="mas-cerrar">Cerrar</button></div>
    <div class="mas-lista">${SECCIONES.map(([id, g, nombre, sub]) => {
      const cab = g !== grupo ? `<div class="menu-grupo">${g || "General"}</div>` : "";
      grupo = g;
      return `${cab}<button class="mas-item ${id === seccion ? "activo" : ""}" data-ir="${id}">${icono(id)}<span><b>${nombre}</b><small>${sub}</small></span>${contadorMenu(id)}</button>`;
    }).join("")}</div>`,
    (caja) => {
      caja.querySelector("#mas-cerrar").onclick = cerrarModal;
      caja.querySelectorAll("[data-ir]").forEach((b) => (b.onclick = () => (cerrarModal(), ir(b.dataset.ir))));
    }
  );
}

function ir(s) {
  seccion = s;
  const [, , nombre, sub] = SECCIONES.find((x) => x[0] === s);
  const ico = document.getElementById("icono-seccion");
  if (ico) ico.innerHTML = icono(s);
  $("#titulo-seccion").textContent = nombre;
  $("#sub-seccion").textContent = sub;
  $("#acciones-seccion").innerHTML = "";
  pintarMenu();
  VISTAS[s]();
  $("#contenido").scrollTop = 0;
}

function acciones(lista) {
  $("#acciones-seccion").innerHTML = lista.map(([id, txt, clase]) => `<button class="btn ${clase || ""}" id="${id}">${txt}</button>`).join("");
}

// ---------- Modal genérico ----------
function abrirModal(html, alMontar) {
  $("#modal-caja").innerHTML = html;
  $("#modal-caja").scrollTop = 0;
  $("#modal").classList.remove("oculto");
  alMontar && alMontar($("#modal-caja"));
  // En las fichas de consulta (informe) no se pone el cursor en una casilla: en el móvil abriría el teclado y movería la ventana
  const primero = $("#modal-caja").querySelector("[data-sinfoco]") ? null : $("#modal-caja").querySelector("input, select, textarea");
  primero && primero.focus({ preventScroll: true });
}
function cerrarModal() {
  $("#modal").classList.add("oculto");
}
$("#modal").addEventListener("mousedown", (e) => e.target.id === "modal" && cerrarModal());
document.addEventListener("keydown", (e) => e.key === "Escape" && cerrarModal());

function leerForm(caja) {
  const o = {};
  caja.querySelectorAll("[name]").forEach((el) => {
    if (el.disabled) return;
    if (el.type === "checkbox") {
      if (el.dataset.grupo) (o[el.dataset.grupo] ||= {})[el.name] = el.checked;
      else o[el.name] = el.checked;
    } else o[el.name] = el.value.trim();
  });
  return o;
}
const opciones = (lista, sel, vacio) =>
  (vacio !== undefined ? `<option value="">${vacio}</option>` : "") +
  lista.map(([v, t]) => `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${esc(t)}</option>`).join("");

// ======================================================
// PANEL
// ======================================================
// Minigráfica de línea para las cifras del inicio
function chispa(vals, color = "#b24bff") {
  const max = Math.max(...vals, 0);
  if (!max) return `<svg class="chispa" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0 28 H100" stroke="rgba(255,255,255,.12)" stroke-width="1.5" fill="none" stroke-dasharray="3 3"/></svg>`;
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * 100, 28 - (v / max) * 24]);
  const linea = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const id = "g" + Math.random().toString(36).slice(2, 7);
  return `<svg class="chispa" viewBox="0 0 100 30" preserveAspectRatio="none"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${linea} L100 30 L0 30 Z" fill="url(#${id})"/><path d="${linea}" stroke="${color}" stroke-width="1.8" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
}

// Lo que toca hacer hoy: cada tarea lleva a su sección
function tareasHoy() {
  const t = [];
  const hoy = hoyISO();
  const ahora = new Date();
  const add = (ico, texto, boton, ir, tono = "") => t.push({ ico, texto, boton, ir, tono });
  if (!D.cuentas.length) add("cuentas", "Crea tus cuentas de TikTok en la app para que el radar te busque campañas.", "Crear cuentas", "estrategia", "cian");
  const propuestas = D.campanas.filter((c) => c.estado === "porunirte").length;
  if (propuestas) add("campanas", `Tienes <b>${propuestas}</b> campaña(s) propuesta(s): revisa su informe y únete o descártalas.`, "Revisar", "campanas", "cian");
  const flojas = D.campanas.filter((k) => k.estado === "activa" && k.radarId && D.radar?.items?.some((x) => x.id === k.radarId && veredicto(x).tipo === "no"));
  if (flojas.length) add("aviso", `<b>${flojas.map((k) => esc(k.nombre)).join(", ")}</b> ya no renta según sus datos.`, "Ver", "campanas", "rosa");
  D.campanas
    .filter((c) => c.estado === "activa")
    .forEach((c) => {
      if (n(c.gastadoPct) >= 80) add("aviso", `<b>${esc(c.nombre)}</b> lleva el ${fmtNum(c.gastadoPct)} % del presupuesto gastado.`, "Ver", "campanas", "ambar");
      if (c.fechaFin && new Date(c.fechaFin) - ahora < 3 * 864e5 && new Date(c.fechaFin) >= new Date(hoy)) add("aviso", `<b>${esc(c.nombre)}</b> termina el ${fechaCorta(c.fechaFin)}.`, "Ver", "campanas", "ambar");
    });
  const sinEnviar = D.clips.filter((c) => c.estado === "publicado").length;
  if (sinEnviar) add("clips", `<b>${sinEnviar}</b> clip(s) publicados sin enviar a su campaña: si no envías el enlace, no cuentan.`, "Enviar", "clips", "rosa");
  const listos = D.clips.filter((c) => c.estado === "listo").length;
  if (listos) add("clips", `<b>${listos}</b> clip(s) listos para subir a TikTok.`, "Ver", "calendario");
  const hace30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const sinApuntar = D.clips.filter((c) => CUENTAN_VISTAS.includes(c.estado) && (c.fechaPub || "").slice(0, 10) >= hace30 && (c.historial || []).slice(-1)[0]?.f !== hoy).length;
  if (sinApuntar) add("numeros", `Apunta las vistas de hoy de <b>${sinApuntar}</b> clip(s).`, "Apuntar", "numeros");
  if (D.campanas.some((c) => c.moneda === "USD") && !n(D.ajustes.usdEur)) add("cobros", "Pon el cambio del dólar en Ajustes para pasar a euros lo que pagan las campañas.", "Ajustes", "ajustes");
  return t;
}

function vistaPanel() {
  acciones([["nuevo-clip", "+ Nuevo clip", "prim"]]);
  $("#nuevo-clip").onclick = () => editarClip();
  const ahora = new Date();
  const hoy = hoyISO();
  const publicados = D.clips.filter((c) => CUENTAN_VISTAS.includes(c.estado));
  const delMes = publicados.filter((c) => enMes(c.fechaPub));
  const dias = typeof ganadoPorDia === "function" ? ganadoPorDia() : {};
  const desdeMes = hoy.slice(0, 8) + "01";
  const ganadoMes = Object.entries(dias).filter(([f]) => f >= desdeMes).reduce((s, [, d]) => s + d.g, 0);
  const vistasMes = Object.entries(dias).filter(([f]) => f >= desdeMes).reduce((s, [, d]) => s + d.v, 0);
  const ganadoTotal = D.clips.reduce((s, c) => s + gananciaClip(c), 0);
  const cobrado = D.cobros.filter((p) => p.estado === "cobrado").reduce((s, p) => s + aEur(p.importe, p.moneda), 0);
  const hoyN = publicados.filter((c) => (c.fechaPub || "").slice(0, 10) === hoy).length;
  const objDia = n(D.ajustes.objetivoDia) || D.cuentas.reduce((s, a) => s + n(a.objetivoDia), 0);
  const objMes = n(D.ajustes.objetivoMes);
  const h = ahora.getHours();
  const saludo = h < 6 ? "Buenas noches" : h < 14 ? "Buenos días" : h < 21 ? "Buenas tardes" : "Buenas noches";

  // Vistas ganadas cada día (14 días)
  const ult = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(ahora);
    d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    ult.push({ k, et: d.getDate(), v: dias[k]?.v || 0 });
  }
  const maxD = Math.max(1, ...ult.map((d) => d.v));
  const top = [...publicados].sort((a, b) => n(b.vistas) - n(a.vistas)).slice(0, 5);
  const joyas = (D.radar?.items || [])
    .map(evaluar)
    .filter((c) => c.joya && !D.campanas.some((k) => k.radarId === c.id))
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 3);
  const tareas = tareasHoy();
  const plan = progresoPlan();
  const sig = plan.pct < 100 ? siguientePaso() : null;

  const nJoyas = (D.radar?.items || []).filter((c) => evaluar(c).joya).length;
  const nPropuestas = D.campanas.filter((c) => c.estado === "porunirte").length;
  const nListos = D.clips.filter((c) => c.estado === "listo").length;
  const gananciaDias = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(ahora);
    d.setDate(d.getDate() - i);
    gananciaDias.push(dias[d.toISOString().slice(0, 10)]?.g || 0);
  }
  $("#contenido").innerHTML = `
    <div class="hero">
      <div class="hero-t">${saludo}${D.ajustes.nombre ? `, ${esc(D.ajustes.nombre)}` : ""}</div>
      <div class="hero-sub">${ahora.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}${D.radar?.actualizado ? ` · radar leído ${new Date(D.radar.actualizado).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</div>
      <div class="hero-chips">
        <button class="hero-chip" data-ir="radar">${icono("joya")} ${nJoyas} joya${nJoyas === 1 ? "" : "s"} en el radar</button>
        <button class="hero-chip" data-ir="campanas">${icono("campanas")} ${nPropuestas} propuesta${nPropuestas === 1 ? "" : "s"}</button>
        <button class="hero-chip" data-ir="clips">${icono("clips")} ${nListos} clip${nListos === 1 ? "" : "s"} listo${nListos === 1 ? "" : "s"}</button>
        <button class="hero-chip" data-ir="asistente">${icono("asistente")} Preguntar a la IA</button>
      </div>
    </div>

    <div class="rejilla kpis">
      <div class="kpi kpi-acento"><div class="kpi-cab"><div class="et">Ganado este mes</div><span class="kpi-ico">${icono("cobros")}</span></div><div class="val">${fmtEur(ganadoMes)}</div>
        ${objMes ? `<div class="barra"><div style="width:${Math.min(100, (ganadoMes / objMes) * 100)}%"></div></div><div class="nota">Objetivo ${fmtEur(objMes)}</div>` : chispa(gananciaDias)}</div>
      <div class="kpi"><div class="kpi-cab"><div class="et">Vistas este mes</div><span class="kpi-ico cian">${icono("ojo")}</span></div><div class="val">${fmtCorto(vistasMes)}</div>${chispa(ult.map((d) => d.v), "#2ee6d6")}</div>
      <div class="kpi"><div class="kpi-cab"><div class="et">Publicados hoy</div><span class="kpi-ico ambar">${icono("clips")}</span></div><div class="val">${hoyN}${objDia ? `<span class="val-de"> / ${objDia}</span>` : ""}</div>
        ${objDia ? `<div class="barra"><div style="width:${Math.min(100, (hoyN / objDia) * 100)}%"></div></div><div class="nota">${delMes.length} clips este mes</div>` : `<div class="nota">Pon un objetivo en Cuentas</div>`}</div>
      <div class="kpi"><div class="kpi-cab"><div class="et">Cobrado</div><span class="kpi-ico verde">${icono("numeros")}</span></div><div class="val">${fmtEur(cobrado)}</div><div class="nota">Pendiente ~${fmtEur(Math.max(0, ganadoTotal - cobrado))}</div></div>
    </div>

    ${
      sig
        ? `<div class="tarjeta plan-mini" id="ir-plan"><div class="plan-mini-t">${icono("empieza")}<div><div class="peq">PRIMEROS PASOS · ${plan.pct} %</div><div><b>Siguiente:</b> ${esc(sig.texto)}</div></div></div>
        <div class="barra" style="margin-top:12px"><div style="width:${plan.pct}%"></div></div></div>`
        : ""
    }

    <div class="rejilla dos" style="margin-top:16px">
      <div class="tarjeta">
        <div class="tarjeta-cab"><h3>Qué hacer hoy</h3><span class="peq">${tareas.length ? tareas.length + " pendiente(s)" : ""}</span></div>
        ${
          tareas.length
            ? tareas.map((x) => `<div class="tarea ${x.tono}"><span class="tarea-ico">${icono(x.ico)}</span><div class="tarea-t">${x.texto}</div><button class="btn peq" data-ir="${x.ir}">${x.boton}</button></div>`).join("")
            : `<div class="vacio-mini">${icono("ojo")}<div>Todo al día. Buen momento para cortar clips.</div></div>`
        }
      </div>
      <div class="tarjeta">
        <div class="tarjeta-cab"><h3>Mejores campañas para ti</h3><button class="btn peq" data-ir="radar">Radar</button></div>
        ${
          joyas.length
            ? joyas
                .map((c) => {
                  const v = veredicto(c);
                  return `<div class="radar-mini"><span class="radar-p ${c.puntos >= 65 ? "alta" : ""}" style="--p:${c.puntos}">${c.puntos}</span><div style="flex:1;min-width:0"><div class="radar-mini-t">${esc(c.nombre)}</div><div class="peq">${c.plat} · ${c.tarifa.toFixed(2)} $/1.000 · <span class="txt-${COLOR_VEREDICTO[v.tipo]}">${v.etiqueta}</span>${c.cuentaSug ? ` · ${esc(c.cuentaSug.usuario)}` : ""}</div></div><button class="btn peq" data-informe="${c.id}">Informe</button></div>`;
                })
                .join("")
            : `<div class="vacio-mini">${icono("radar")}<div>${D.radar?.items?.length ? "No hay joyas nuevas para tus cuentas ahora mismo." : "El radar aún no se ha leído (lo lee el servidor cada 3 horas al entrar con tu cuenta)."}</div></div>`
        }
      </div>
    </div>

    <div class="rejilla dos" style="margin-top:16px">
      <div class="tarjeta">
        <div class="tarjeta-cab"><h3>Vistas ganadas · 14 días</h3><span class="peq">${fmtCorto(ult.reduce((s, d) => s + d.v, 0))}</span></div>
        <div class="barras">${ult.map((d) => `<div class="b" style="height:${(d.v / maxD) * 100}%" data-t="${fechaCorta(d.k)} · ${fmtNum(d.v)} vistas"></div>`).join("")}</div>
        <div class="ejes">${ult.map((d, i) => `<span>${i % 2 === 0 ? d.et : ""}</span>`).join("")}</div>
      </div>
      <div class="tarjeta">
        <div class="tarjeta-cab"><h3>Tus mejores clips</h3><button class="btn peq" data-ir="numeros">Números</button></div>
        ${
          top.length
            ? top.map((c) => `<div class="fila-clip" data-id="${c.id}"><div style="flex:1;min-width:0"><div class="radar-mini-t">${esc(c.titulo)}</div><div class="peq">${esc(cuenta(c.cuentaId)?.usuario || "—")} · ${esc(campana(c.campanaId)?.nombre || "sin campaña")}</div></div><div class="fila-clip-n"><b>${fmtCorto(c.vistas)}</b><span class="peq">${fmtEur(gananciaClip(c))}</span></div></div>`).join("")
            : `<div class="vacio-mini">${icono("clips")}<div>Cuando publiques clips y apuntes sus vistas, aquí verás los que mejor funcionan.</div></div>`
        }
      </div>
    </div>`;
  $("#contenido").querySelectorAll("[data-ir]").forEach((b) => (b.onclick = () => ir(b.dataset.ir)));
  $("#contenido").querySelectorAll("[data-informe]").forEach((b) => (b.onclick = () => abrirInforme(b.dataset.informe)));
  $("#contenido").querySelectorAll(".fila-clip").forEach((el) => (el.onclick = () => editarClip(D.clips.find((c) => c.id === el.dataset.id))));
  $("#ir-plan") && ($("#ir-plan").onclick = () => ((tabArranque = "plan"), ir("empieza")));
}

// ======================================================
// CAMPAÑAS
// ======================================================
function vistaCampanas() {
  acciones([["nueva-camp", "+ Nueva campaña", "prim"]]);
  $("#nueva-camp").onclick = () => editarCampana();
  const orden = { activa: 0, pausada: 1, terminada: 2 };
  // Las propuestas (piloto automático o IA) van aparte: no te has unido a ellas
  const propuestas = D.campanas.filter((c) => c.estado === "porunirte");
  const lista = D.campanas.filter((c) => c.estado !== "porunirte").sort((a, b) => (orden[a.estado] ?? 3) - (orden[b.estado] ?? 3));
  const bloquePropuestas = propuestas.length
    ? `<h2 style="margin-top:0">Propuestas: aún no te has unido (${propuestas.length})</h2>
      <p class="peq" style="margin-top:0">Las ha propuesto el piloto automático o la IA con los datos del Radar. Mira su informe y, si te convence, únete en su plataforma y pulsa «Ya me he unido». Si no, descártala y no volverá a aparecer.</p>
      ${propuestas
        .map((c) => {
          const r = c.radarId && D.radar?.items?.find((x) => x.id === c.radarId);
          const v = r ? veredicto(r) : null;
          return `<div class="tarjeta" style="margin-bottom:10px;border-style:dashed"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <div style="flex:1;min-width:220px"><b>${esc(c.nombre)}</b> <span class="chip cian">Propuesta</span>${v ? ` <span class="chip ${COLOR_VEREDICTO[v.tipo]}">${v.etiqueta}</span>` : ""}
            <div class="peq">${esc(c.plataforma || "")} · ${fmtMon(c.cpm, c.moneda)} por 1.000 vistas${c.minVistas ? ` · cobra desde ${fmtNum(c.minVistas)} vistas` : ""}${c.cuentaSugerida && cuenta(c.cuentaSugerida) ? ` · para ${esc(cuenta(c.cuentaSugerida).usuario)}` : ""}</div></div>
            ${r ? `<button class="btn peq" data-informe="${c.radarId}">Informe</button>` : ""}
            ${c.enlace ? `<a class="btn peq" href="${esc(c.enlace)}" target="_blank">Abrir ↗</a>` : ""}
            <button class="btn peq prim" data-unido="${c.id}">Ya me he unido</button>
            <button class="btn peq peligro" data-descartar="${c.id}">Descartar</button>
          </div></div>`;
        })
        .join("")}
      <h2>Campañas a las que te has unido</h2>`
    : "";
  $("#contenido").innerHTML = bloquePropuestas + (lista.length
    ? `<table><thead><tr><th>Campaña</th><th>Plataforma</th><th class="num">Tarifa / 1.000</th><th>Presupuesto gastado</th><th class="num">Clips</th><th class="num">Vistas</th><th class="num">Estimado</th><th>Estado</th></tr></thead><tbody>
      ${lista
        .map((c) => {
          const t = totalesCampana(c);
          const color = c.estado === "activa" ? "verde" : c.estado === "pausada" ? "ambar" : c.estado === "porunirte" ? "cian" : "";
          return `<tr data-id="${c.id}" style="cursor:pointer">
          <td><b>${esc(c.nombre)}</b><div class="peq">${esc(c.creador || "")}</div></td>
          <td>${esc(c.plataforma || "—")}</td>
          <td class="num">${fmtMon(c.cpm, c.moneda)}</td>
          <td style="min-width:140px"><div class="barra"><div style="width:${Math.min(100, n(c.gastadoPct))}%"></div></div><div class="peq">${fmtNum(c.gastadoPct)} %${c.presupuesto ? " de " + fmtMon(c.presupuesto, c.moneda) : ""}</div></td>
          <td class="num">${t.clips}</td><td class="num">${fmtCorto(t.vistas)}</td><td class="num">${fmtEur(t.ganado)}</td>
          <td><span class="chip ${color}">${esc({ porunirte: "Por unirte", activa: "Activa", pausada: "Pausada", terminada: "Terminada" }[c.estado] || c.estado)}</span>${c.radarId && D.radar?.items?.find((x) => x.id === c.radarId) ? ` <button class="btn peq" data-informe="${c.radarId}">Informe</button>` : ""}</td></tr>`;
        })
        .join("")}</tbody></table>
      <p class="peq">El presupuesto gastado lo ves en la página de la campaña (Whop, Vyro…). Actualízalo de vez en cuando: cuando se agota, los clips dejan de cobrar.</p>`
    : `<div class="vacio">Aún no te has unido a ninguna campaña. Cuando te unas a una en Whop o Vyro, pulsa «Ya me he unido» en su propuesta o apúntala con «+ Nueva campaña». Las mejores las tienes en el <b>Radar</b>.<br><br><button class="btn prim" id="vacio-camp">+ Nueva campaña</button></div>`);
  $("#contenido").querySelectorAll("[data-unido]").forEach(
    (b) =>
      (b.onclick = () => {
        const c = campana(b.dataset.unido);
        c.estado = "activa";
        guardar();
        aviso("Marcada como unida. Copia sus reglas en la ficha de la campaña.");
        editarCampana(c);
      })
  );
  $("#contenido").querySelectorAll("[data-descartar]").forEach(
    (b) =>
      (b.onclick = () => {
        const c = campana(b.dataset.descartar);
        if (c.radarId) (radar().descartadas ||= {})[c.radarId] = hoyISO();
        D.campanas = D.campanas.filter((x) => x.id !== c.id);
        guardar();
        aviso("Descartada: el piloto no volverá a proponerla");
        vistaCampanas();
      })
  );
  $("#vacio-camp") && ($("#vacio-camp").onclick = () => editarCampana());
  $("#contenido").querySelectorAll("tr[data-id]").forEach((tr) => (tr.onclick = () => editarCampana(campana(tr.dataset.id))));
  $("#contenido").querySelectorAll("[data-informe]").forEach((b) => (b.onclick = (e) => (e.stopPropagation(), abrirInforme(b.dataset.informe))));
}

function editarCampana(c) {
  const nuevo = !c;
  c = c || { id: uid(), estado: "activa", moneda: "USD", plataforma: "Whop", redes: "TikTok", gastadoPct: 0 };
  abrirModal(
    `<h3>${nuevo ? "Nueva campaña" : esc(c.nombre)}</h3>
    <div class="form">
      <label class="ancho">Nombre de la campaña<input name="nombre" value="${esc(c.nombre)}" placeholder="Ej.: Clips del pódcast X" /></label>
      <label>Plataforma<input name="plataforma" list="plataformas" value="${esc(c.plataforma)}" /></label>
      <label>Creador o marca<input name="creador" value="${esc(c.creador)}" /></label>
      <label>Tarifa por 1.000 vistas<input name="cpm" type="number" step="0.01" min="0" value="${esc(c.cpm)}" /></label>
      <label>Moneda<select name="moneda">${opciones([["USD", "Dólares (USD)"], ["EUR", "Euros (EUR)"]], c.moneda)}</select></label>
      <label>Presupuesto total<input name="presupuesto" type="number" step="1" min="0" value="${esc(c.presupuesto)}" /></label>
      <label>% del presupuesto ya gastado<input name="gastadoPct" type="number" min="0" max="100" value="${esc(c.gastadoPct)}" /></label>
      <label>Mínimo de vistas para cobrar<input name="minVistas" type="number" min="0" value="${esc(c.minVistas)}" /></label>
      <label>Máximo a cobrar por clip<input name="maxPorClip" type="number" min="0" step="0.01" value="${esc(c.maxPorClip)}" /></label>
      <label>Redes permitidas<input name="redes" value="${esc(c.redes)}" placeholder="TikTok, Reels, Shorts" /></label>
      <label>Termina el<input name="fechaFin" type="date" value="${esc(c.fechaFin)}" /></label>
      <label>Estado<select name="estado">${opciones([["porunirte", "Por unirte"], ["activa", "Activa"], ["pausada", "Pausada"], ["terminada", "Terminada"]], c.estado)}</select></label>
      <label>Enlace a la campaña<input name="enlace" value="${esc(c.enlace)}" placeholder="https://" /></label>
      <label>Material (carpeta de vídeos)<input name="material" value="${esc(c.material)}" placeholder="Enlace al Drive o carpeta del creador" /></label>
      <label class="ancho">Etiqueta de publicidad que exige<input name="divulgacion" value="${esc(c.divulgacion)}" placeholder="Ej.: #Sponsored o #MarcaAd al principio de la descripción" /></label>
      <label>Cuenta que hay que mencionar<input name="mencion" value="${esc(c.mencion)}" placeholder="@creador (si la campaña lo pide)" /></label>
      <label>Hashtags obligatorios<input name="hashtagsObl" value="${esc(c.hashtagsObl)}" placeholder="#marca #campaña" /></label>
      <label>Duración mínima del clip (s)<input name="durMin" type="number" min="0" value="${esc(c.durMin)}" /></label>
      <label>Duración máxima del clip (s)<input name="durMax" type="number" min="0" value="${esc(c.durMax)}" /></label>
      <label class="ancho">Reglas de la campaña<textarea name="reglas" placeholder="Duración, menciones, hashtags obligatorios, qué está prohibido…">${esc(c.reglas)}</textarea></label>
    </div>
    <datalist id="plataformas"><option>Whop</option><option>Vyro</option><option>Acuerdo directo con el creador</option><option>Otra</option></datalist>
    <div class="modal-pie">
      <div>${nuevo ? "" : `<button class="btn peligro" id="m-borrar">Borrar</button> `}${c.enlace ? `<a class="btn fant" href="${esc(c.enlace)}" target="_blank">Abrir campaña ↗</a>` : ""}</div>
      <div><button class="btn" id="m-cancelar">Cancelar</button> <button class="btn prim" id="m-guardar">Guardar</button></div>
    </div>`,
    (caja) => {
      caja.querySelector("#m-cancelar").onclick = cerrarModal;
      caja.querySelector("#m-guardar").onclick = () => {
        const f = leerForm(caja);
        if (!f.nombre) return aviso("Ponle un nombre a la campaña");
        Object.assign(c, f);
        if (nuevo) D.campanas.push(c);
        guardar();
        cerrarModal();
        ir(seccion);
      };
      const b = caja.querySelector("#m-borrar");
      b &&
        (b.onclick = () => {
          const usados = D.clips.filter((x) => x.campanaId === c.id).length;
          if (!confirm(`¿Borrar la campaña «${c.nombre}»?${usados ? ` Sus ${usados} clips se quedarán sin campaña.` : ""}`)) return;
          D.campanas = D.campanas.filter((x) => x.id !== c.id);
          D.clips.forEach((x) => x.campanaId === c.id && (x.campanaId = ""));
          guardar();
          cerrarModal();
          ir(seccion);
        });
    }
  );
}

// ======================================================
// CLIPS (tablero)
// ======================================================
function vistaClips() {
  acciones([["nuevo-clip", "+ Nuevo clip", "prim"]]);
  $("#nuevo-clip").onclick = () => editarClip();
  const f = filtroClips;
  const lista = D.clips.filter(
    (c) =>
      (!f.texto || (c.titulo + " " + (c.fuente || "") + " " + (c.gancho || "")).toLowerCase().includes(f.texto.toLowerCase())) &&
      (!f.campana || c.campanaId === f.campana) &&
      (!f.cuenta || c.cuentaId === f.cuenta)
  );
  $("#contenido").innerHTML = `
    <div class="filtros">
      <input id="f-texto" placeholder="Buscar clip…" value="${esc(f.texto)}" />
      <select id="f-camp">${opciones(D.campanas.map((c) => [c.id, c.nombre]), f.campana, "Todas las campañas")}</select>
      <select id="f-cuenta">${opciones(D.cuentas.map((c) => [c.id, c.usuario]), f.cuenta, "Todas las cuentas")}</select>
    </div>
    <div class="tablero">
      ${ESTADOS_CLIP.map((e) => {
        const cs = lista.filter((c) => c.estado === e.id);
        return `<div class="columna" data-estado="${e.id}"><h4><span>${e.nombre}</span><span>${cs.length}</span></h4>
          ${cs
            .map((c) => {
              const lista = CHECKS_TIKTOK;
              const hechos = lista.filter(([k]) => c.checks?.[k]).length;
              return `<div class="clip" draggable="true" data-id="${c.id}">
                <div class="t">${esc(c.titulo)}</div>
                <div class="m col"><span>${esc(campana(c.campanaId)?.nombre || "Sin campaña")}</span><span>${esc(cuenta(c.cuentaId)?.usuario || "Sin cuenta")}</span></div>
                ${CUENTAN_VISTAS.includes(c.estado) ? `<div class="m"><span>${fmtCorto(c.vistas)} vistas</span><span>${fmtEur(gananciaClip(c))}</span></div>` : ""}
                <div class="chk">Checklist TikTok ${hechos}/${lista.length}</div>
              </div>`;
            })
            .join("")}
        </div>`;
      }).join("")}
    </div>
    <p class="peq">${window.estudio.tactil ? "Toca un clip para editarlo y cambiar su estado. Desliza de lado para ver todas las columnas." : "Arrastra un clip a otra columna para cambiar su estado. Haz clic para editarlo."}</p>`;
  $("#f-texto").oninput = (e) => {
    f.texto = e.target.value;
    const pos = e.target.selectionStart;
    vistaClips();
    $("#f-texto").focus();
    $("#f-texto").setSelectionRange(pos, pos);
  };
  $("#f-camp").onchange = (e) => ((f.campana = e.target.value), vistaClips());
  $("#f-cuenta").onchange = (e) => ((f.cuenta = e.target.value), vistaClips());
  $("#contenido").querySelectorAll(".clip").forEach((el) => {
    el.onclick = () => editarClip(D.clips.find((c) => c.id === el.dataset.id));
    el.ondragstart = (e) => e.dataTransfer.setData("text/plain", el.dataset.id);
  });
  $("#contenido").querySelectorAll(".columna").forEach((col) => {
    col.ondragover = (e) => (e.preventDefault(), col.classList.add("sobre"));
    col.ondragleave = () => col.classList.remove("sobre");
    col.ondrop = (e) => {
      e.preventDefault();
      const c = D.clips.find((x) => x.id === e.dataTransfer.getData("text/plain"));
      if (!c) return;
      c.estado = col.dataset.estado;
      if (c.estado === "publicado" && !c.fechaPub) c.fechaPub = new Date().toISOString().slice(0, 16);
      if (["enviado", "aprobado"].includes(c.estado)) (c.checks ||= {}).enviado = true;
      guardar();
      pintarMenu();
      vistaClips();
    };
  });
}

function editarClip(c, base) {
  const nuevo = !c;
  // Si viene con campaña (por ejemplo, un momento de la IA), la cuenta es la de esa campaña
  const campInicial = (base?.campanaId && campana(base.campanaId)) || D.campanas.find((x) => x.estado === "activa");
  c = c || { id: uid(), estado: "idea", checks: {}, cuentaId: cuentaDeCampana(campInicial) || (D.cuentas.length === 1 ? D.cuentas[0].id : ""), campanaId: campInicial?.id || "", autorId: window.nube?.miId?.() || "", ...base };
  const personas = window.nube?.personas?.() || [];
  const camp = campana(c.campanaId);
  abrirModal(
    `<h3>${nuevo ? "Nuevo clip" : esc(c.titulo)}</h3>
    ${c.archivo && window.estudio.fabrica ? `<video src="${esc(window.estudio.fabrica.url(c.archivo))}" controls playsinline preload="metadata" style="display:block;width:auto;max-width:100%;max-height:420px;margin:0 auto 14px;border-radius:12px;background:#000"></video>` : ""}
    <div class="form">
      <label class="ancho">Título interno<input name="titulo" value="${esc(c.titulo)}" placeholder="Ej.: Reacción a la pregunta del millón" /></label>
      <label>Duración (segundos)<input name="duracion" type="number" min="0" value="${esc(c.duracion)}" placeholder="Ej.: 45" /></label>
      <label>Campaña<select name="campanaId">${opciones(D.campanas.map((x) => [x.id, x.nombre]), c.campanaId, "Sin campaña")}</select></label>
      <label>Cuenta de TikTok<select name="cuentaId">${opciones(D.cuentas.map((x) => [x.id, x.usuario]), c.cuentaId, "Sin cuenta")}</select></label>
      <label>Estado<select name="estado">${opciones(ESTADOS_CLIP.map((e) => [e.id, e.nombre]), c.estado)}</select></label>
      ${personas.length > 1 ? `<label>Hecho por<select name="autorId">${opciones(personas, c.autorId || "", "Sin asignar")}</select></label>` : ""}
      <label>Publicado el<input name="fechaPub" type="datetime-local" value="${esc(c.fechaPub)}" /></label>
      <label>Programado para (día)<input name="programadoDia" type="date" value="${esc(c.programadoDia)}" /></label>
      <label>Hora prevista (opcional)<input name="programadoHora" type="time" value="${esc(c.programadoHora)}" /></label>
      <label>Minutos de edición<input name="minutos" type="number" min="0" value="${esc(c.minutos)}" placeholder="Para saber cuánto ganas por hora" /></label>
      <label>Vídeo de origen<input name="fuente" value="${esc(c.fuente)}" placeholder="Directo, pódcast o vídeo del que sale" /></label>
      <label>Tramo (inicio – fin)<div style="display:flex;gap:6px"><input name="inicio" value="${esc(c.inicio)}" placeholder="12:30" /><input name="fin" value="${esc(c.fin)}" placeholder="13:05" /></div></label>
      <label class="ancho">Gancho (primeros segundos)<input name="gancho" list="lista-ganchos" value="${esc(c.gancho)}" placeholder="Escribe o elige uno de tu biblioteca" /></label>
      <label class="ancho">Descripción para TikTok<textarea name="descripcion" placeholder="Texto del post">${esc(c.descripcion)}</textarea></label>
      <div class="ancho"><button class="btn" id="m-ia" type="button">✨ Ganchos y texto con IA</button> <span class="peq">Te propone 5 ganchos, el título en pantalla, la descripción y los hashtags para este clip.</span><div id="m-ia-caja"></div></div>
      <div class="ancho"><button class="btn" id="m-texto" type="button">Preparar texto para pegar en TikTok</button> <span class="peq">Junta tu descripción con la mención, los hashtags y la etiqueta de publicidad que exige la campaña.</span><div id="m-texto-caja"></div></div>
      <label>Hashtags<input name="hashtags" value="${esc(c.hashtags)}" placeholder="#clip #podcast" /></label>
      <label>Sonido<input name="sonido" value="${esc(c.sonido)}" placeholder="Audio original / sonido de TikTok" /></label>
      <label class="ancho">Enlace del TikTok<input name="enlace" value="${esc(c.enlace)}" placeholder="https://www.tiktok.com/@…" /></label>
      <label>Vistas<input name="vistas" type="number" min="0" value="${esc(c.vistas)}" /></label>
      <label>Me gusta<input name="likes" type="number" min="0" value="${esc(c.likes)}" /></label>
      <label>Comentarios<input name="comentarios" type="number" min="0" value="${esc(c.comentarios)}" /></label>
      <label>Compartidos<input name="compartidos" type="number" min="0" value="${esc(c.compartidos)}" /></label>
      <div class="ancho"><h3>Checklist antes de publicar en TikTok</h3>
        <div class="checks">${CHECKS_TIKTOK.map(([k, t]) => `<label><input type="checkbox" data-grupo="checks" name="${k}" ${c.checks?.[k] ? "checked" : ""}/>${esc(t)}</label>`).join("")}</div>
        ${camp?.reglas ? `<div class="tarjeta" style="margin-top:10px"><b>Reglas de «${esc(camp.nombre)}»</b><div class="peq" style="white-space:pre-wrap">${esc(camp.reglas)}</div></div>` : ""}
      </div>
      <label class="ancho">Notas<textarea name="notas">${esc(c.notas)}</textarea></label>
      ${
        c.revision
          ? `<div class="ancho tarjeta" style="border-color:var(--${c.revision.cumple === "si" ? "verde" : c.revision.cumple === "no" ? "rosa" : "ambar"})"><b>${c.revision.cumple === "si" ? "✓ Cumple las reglas de la campaña" : c.revision.cumple === "no" ? "✗ No cumple las reglas de la campaña" : "⚠ Dudas con las reglas de la campaña"}</b>${c.revision.problemas.length ? `<ul class="peq">${c.revision.problemas.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${c.revision.comprobar_a_mano?.length ? `<div class="peq">Comprueba tú: ${esc(c.revision.comprobar_a_mano.join(" · "))}</div>` : ""}</div>`
          : ""
      }
      ${c.archivo && window.estudio.fabrica ? `<div class="ancho" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn prim" type="button" id="m-subir">📤 Subir a TikTok</button><button class="btn" type="button" id="m-ver-video">🎬 Ver el vídeo en Finder</button></div>` : ""}
      ${CUENTAN_VISTAS.includes(c.estado) ? `<div class="ancho peq">Estimado con las condiciones de la campaña: <b>${fmtEur(gananciaClip(c))}</b>${camp && n(camp.minVistas) && n(c.vistas) < n(camp.minVistas) ? ` · faltan <b>${fmtNum(n(camp.minVistas) - n(c.vistas))}</b> vistas para llegar al mínimo de cobro` : ""}</div>` : ""}
      <div class="ancho peq" id="m-aviso-dur"></div>
    </div>
    <datalist id="lista-ganchos">${D.ganchos.map((g) => `<option value="${esc(g.texto)}"></option>`).join("")}</datalist>
    <div class="modal-pie">
      <div>${nuevo ? "" : `<button class="btn peligro" id="m-borrar">Borrar</button> <button class="btn" id="m-duplicar" title="Otro corte del mismo momento, con otro arranque y otro gancho">Otra versión (corte distinto)</button> `}${c.enlace ? `<a class="btn fant" href="${esc(c.enlace)}" target="_blank">Ver en TikTok ↗</a>` : ""}</div>
      <div><button class="btn" id="m-cancelar">Cancelar</button> <button class="btn prim" id="m-guardar">Guardar</button></div>
    </div>`,
    (caja) => {
      caja.querySelector("#m-cancelar").onclick = cerrarModal;
      // Avisa si la duración no cumple lo que pide la campaña
      const revisarDuracion = () => {
        const f = leerForm(caja);
        const k = campana(f.campanaId);
        const d = n(f.duracion);
        const el = caja.querySelector("#m-aviso-dur");
        if (!k || !d) return (el.textContent = "");
        el.innerHTML =
          n(k.durMin) && d < n(k.durMin)
            ? `<span style="color:var(--ambar)">⚠ La campaña pide un mínimo de ${n(k.durMin)} s.</span>`
            : n(k.durMax) && d > n(k.durMax)
            ? `<span style="color:var(--ambar)">⚠ La campaña pide un máximo de ${n(k.durMax)} s.</span>`
            : n(k.durMin) || n(k.durMax)
            ? `<span style="color:var(--verde)">✓ Duración dentro de lo que pide la campaña.</span>`
            : "";
      };
      caja.querySelector("#m-ver-video") && (caja.querySelector("#m-ver-video").onclick = async () => (await window.estudio.fabrica.mostrar(c.archivo)) || aviso("Ese vídeo ya no está en su carpeta"));
      // Subida rápida: copia el texto, enseña el vídeo y abre la página de subida de TikTok (subir lo haces tú, como piden las normas)
      caja.querySelector("#m-subir") &&
        (caja.querySelector("#m-subir").onclick = async () => {
          const f = leerForm(caja);
          await navigator.clipboard.writeText(textoParaTikTok(f, campana(f.campanaId)));
          if (!(await window.estudio.fabrica.mostrar(c.archivo))) return aviso("Ese vídeo ya no está en su carpeta");
          window.open("https://www.tiktok.com/tiktokstudio/upload", "_blank");
          aviso("Texto copiado. Arrastra el vídeo a TikTok, pega el texto y, al publicar, pon aquí el enlace y el estado «Publicado».");
        });
      caja.querySelector('[name="duracion"]').oninput = revisarDuracion;
      caja.querySelector('[name="campanaId"]').onchange = revisarDuracion;
      revisarDuracion();
      caja.querySelector("#m-ia").onclick = () =>
        ia.ganchosClip(leerForm(caja), caja.querySelector("#m-ia-caja"), (valores) => {
          Object.entries(valores).forEach(([k, v]) => {
            const el = caja.querySelector(`[name="${k}"]`);
            if (el) el.value = v;
          });
          aviso("Aplicado en la ficha. Pulsa Guardar para quedártelo.");
        });
      caja.querySelector("#m-texto").onclick = () => {
        const f = leerForm(caja);
        const texto = textoParaTikTok(f, campana(f.campanaId));
        const zona = caja.querySelector("#m-texto-caja");
        zona.innerHTML = `<textarea id="m-texto-final" style="width:100%;min-height:110px;margin-top:8px">${esc(texto)}</textarea>
          <div style="display:flex;gap:8px;align-items:center;margin-top:6px"><button class="btn peq prim" type="button" id="m-copiar-texto">Copiar</button><span class="peq">${texto.length} caracteres</span></div>`;
        zona.querySelector("#m-copiar-texto").onclick = async () => {
          await navigator.clipboard.writeText(zona.querySelector("#m-texto-final").value);
          aviso("Texto copiado: pégalo en TikTok");
        };
      };
      caja.querySelector("#m-guardar").onclick = () => {
        const f = leerForm(caja);
        if (!f.titulo) return aviso("Ponle un título al clip");
        f.checks = f.checks || {};
        if (CUENTAN_VISTAS.includes(f.estado) && !f.fechaPub) f.fechaPub = new Date().toISOString().slice(0, 16);
        const vistasAntes = c.vistas;
        Object.assign(c, f);
        if (f.vistas !== "" && String(f.vistas) !== String(vistasAntes ?? "")) registrarVistas(c, f.vistas);
        if (nuevo) D.clips.push(c);
        guardar();
        cerrarModal();
        ir(seccion);
        const dup = duplicadosDe(c);
        if (dup.length) aviso(`⚠ Este tramo ya está en ${dup.map((x) => cuenta(x.cuentaId)?.usuario || "otra cuenta").join(", ")}: las campañas no pagan clips duplicados. Cambia el tramo o el montaje.`);
      };
      const b = caja.querySelector("#m-borrar");
      b &&
        (b.onclick = () => {
          if (!confirm(`¿Borrar el clip «${c.titulo}»?`)) return;
          D.clips = D.clips.filter((x) => x.id !== c.id);
          guardar();
          cerrarModal();
          ir(seccion);
        });
      const dup = caja.querySelector("#m-duplicar");
      dup &&
        (dup.onclick = () => {
          if (!confirm("Whop prohíbe entregar clips duplicados. La otra versión tiene que ser un corte distinto (otro arranque, otro tramo u otro montaje) y la campaña tiene que permitirlo. ¿Crear la ficha de la nueva versión?")) return;
          const copia = { ...c, id: uid(), titulo: c.titulo + " (versión B)", estado: "idea", gancho: "", enlace: "", vistas: "", likes: "", comentarios: "", compartidos: "", fechaPub: "", checks: {} };
          D.clips.push(copia);
          guardar();
          cerrarModal();
          editarClip(copia);
        });
    }
  );
}

// ======================================================
// MESA DE CORTE
// ======================================================
let mesa = { video: null, entrada: null, salida: null };
const aTiempo = (s) => {
  s = Math.max(0, n(s));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    ss = Math.floor(s % 60);
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(ss).padStart(2, "0");
};

function vistaMesa() {
  acciones([["abrir-video", "Abrir vídeo…", "prim"]]);
  $("#abrir-video").onclick = async () => {
    const v = await window.estudio.elegirVideo();
    if (!v) return;
    mesa = { video: v, entrada: null, salida: null };
    vistaMesa();
  };
  const cortes = mesa.video ? D.cortes.filter((c) => c.ruta === mesa.video.ruta) : [];
  const nombre = mesa.video ? mesa.video.ruta.split("/").pop() : "";
  $("#contenido").innerHTML = mesa.video
    ? `<div class="mesa">
      <div>
        <div class="visor" id="visor"><video id="vid" src="${esc(mesa.video.url)}" controls></video></div>
        <div class="peq" style="margin-top:6px">${esc(nombre)}</div>
      </div>
      <div>
        <div class="linea-tiempo" id="lt"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button class="btn" id="b-ent">Entrada <kbd>I</kbd></button>
          <button class="btn" id="b-sal">Salida <kbd>O</kbd></button>
          <span id="tramo" class="chip cian">Marca entrada y salida</span>
          <button class="btn prim" id="b-guardar">Guardar momento <kbd>M</kbd></button>
          <button class="btn fant" id="b-girar">Vista vertical/horizontal</button>
        </div>
        <p class="teclas" style="margin-top:12px"><kbd>Espacio</kbd> reproducir · <kbd>J</kbd>/<kbd>L</kbd> −5 s / +5 s · <kbd>←</kbd>/<kbd>→</kbd> −1 s / +1 s · <kbd>I</kbd> entrada · <kbd>O</kbd> salida · <kbd>M</kbd> guardar</p>
        <label style="margin-top:6px">Nota del momento (qué pasa, posible gancho)<input id="nota-corte" placeholder="Ej.: se ríe de la pregunta y suelta la frase" /></label>
        <h2>Momentos marcados en este vídeo</h2>
        ${
          cortes.length
            ? `<table><thead><tr><th>Tramo</th><th class="num">Duración</th><th>Nota</th><th></th></tr></thead><tbody>
            ${cortes
              .map(
                (c) => `<tr><td><a href="#" data-ir="${c.inicio}">${aTiempo(c.inicio)} – ${aTiempo(c.fin)}</a></td><td class="num">${Math.round(c.fin - c.inicio)} s</td><td>${esc(c.nota)}</td>
                <td style="white-space:nowrap">${window.estudio.fabrica ? `<button class="btn peq prim" data-cortar-corte="${c.id}">✂️ Cortar en vertical</button> ` : ""}<button class="btn peq" data-clip="${c.id}">Crear clip</button> <button class="btn peq peligro" data-borrar="${c.id}">✕</button></td></tr>`
              )
              .join("")}</tbody></table>
            <div style="margin-top:10px;display:flex;gap:8px"><button class="btn" id="b-copiar">Copiar lista de tiempos</button></div>`
            : `<div class="vacio">Marca la entrada y la salida de un momento bueno y pulsa «Guardar momento».</div>`
        }
        <p class="peq" style="margin-top:14px">${
          window.estudio.fabrica
            ? "Cada momento se puede sacar en vertical con subtítulos desde la <b>Fábrica de clips</b> (abajo), o copiar la lista de tiempos para tu editor."
            : "La mesa de corte sirve para localizar y apuntar los momentos. El corte vertical con subtítulos se hace en la app del Mac (Fábrica de clips) o en tu editor, con la lista de tiempos copiada."
        }</p>
      </div></div>`
    : `<div class="vacio">Abre el vídeo largo (directo, pódcast, entrevista) que vas a convertir en clips.<br>Lo verás aquí, marcarás los mejores momentos con el teclado y cada uno se puede convertir en un clip del tablero.<br><br><button class="btn prim" id="vacio-abrir">Abrir vídeo…</button></div>
       ${D.cortes.length ? `<p class="peq" style="margin-top:14px">Tienes ${D.cortes.length} momentos guardados de ${new Set(D.cortes.map((c) => c.ruta)).size} vídeo(s). Abre el mismo vídeo para verlos.</p>` : ""}`;
  $("#contenido").insertAdjacentHTML("beforeend", bloqueFabrica() + bloqueMomentosIA());
  montarFabrica();
  montarMomentosIA();
  if (!mesa.video) {
    $("#vacio-abrir").onclick = () => $("#abrir-video").click();
    return;
  }
  const vid = $("#vid");
  const lt = $("#lt");
  const pintarLinea = () => {
    const dur = vid.duration || 1;
    lt.innerHTML =
      cortes.map((c) => `<div class="marca-clip" style="left:${(c.inicio / dur) * 100}%;width:${((c.fin - c.inicio) / dur) * 100}%"></div>`).join("") +
      (mesa.entrada != null ? `<div class="marca-clip" style="left:${(mesa.entrada / dur) * 100}%;width:${(((mesa.salida ?? vid.currentTime) - mesa.entrada) / dur) * 100}%;background:rgba(37,244,238,.3);border-color:var(--cian)"></div>` : "") +
      `<div class="cabezal" style="left:${(vid.currentTime / dur) * 100}%"></div>`;
    const t = $("#tramo");
    if (mesa.entrada != null && mesa.salida != null) {
      const d = mesa.salida - mesa.entrada;
      t.textContent = `${aTiempo(mesa.entrada)} – ${aTiempo(mesa.salida)} · ${Math.round(d)} s${d > 90 ? " · largo para TikTok" : d < 7 ? " · muy corto" : ""}`;
    } else if (mesa.entrada != null) t.textContent = `Entrada ${aTiempo(mesa.entrada)}`;
  };
  vid.ontimeupdate = pintarLinea;
  vid.onloadedmetadata = () => {
    mesa.duracion = vid.duration;
    if (vid.videoWidth > vid.videoHeight) $("#visor").classList.add("horizontal");
    pintarLinea();
  };
  lt.onclick = (e) => {
    const r = lt.getBoundingClientRect();
    vid.currentTime = ((e.clientX - r.left) / r.width) * (vid.duration || 0);
  };
  const entrada = () => ((mesa.entrada = vid.currentTime), mesa.salida != null && mesa.salida <= mesa.entrada && (mesa.salida = null), pintarLinea());
  const salida = () => {
    if (mesa.entrada == null || vid.currentTime <= mesa.entrada) return aviso("Marca primero la entrada (I)");
    mesa.salida = vid.currentTime;
    pintarLinea();
  };
  const guardarCorte = () => {
    if (mesa.entrada == null || mesa.salida == null) return aviso("Marca entrada (I) y salida (O)");
    D.cortes.push({ id: uid(), ruta: mesa.video.ruta, inicio: mesa.entrada, fin: mesa.salida, nota: $("#nota-corte").value.trim() });
    mesa.entrada = mesa.salida = null;
    guardar();
    vistaMesa();
    aviso("Momento guardado");
  };
  $("#b-ent").onclick = entrada;
  $("#b-sal").onclick = salida;
  $("#b-guardar").onclick = guardarCorte;
  $("#b-girar").onclick = () => $("#visor").classList.toggle("horizontal");
  $("#contenido").querySelectorAll("[data-ir]").forEach((a) => (a.onclick = (e) => (e.preventDefault(), (vid.currentTime = +a.dataset.ir), vid.play())));
  $("#contenido").querySelectorAll("[data-borrar]").forEach(
    (b) =>
      (b.onclick = () => {
        D.cortes = D.cortes.filter((c) => c.id !== b.dataset.borrar);
        guardar();
        vistaMesa();
      })
  );
  $("#contenido").querySelectorAll("[data-clip]").forEach(
    (b) =>
      (b.onclick = () => {
        const c = D.cortes.find((x) => x.id === b.dataset.clip);
        editarClip(null, { titulo: c.nota || `Momento ${aTiempo(c.inicio)}`, fuente: nombre, inicio: aTiempo(c.inicio), fin: aTiempo(c.fin), notas: c.nota });
      })
  );
  $("#contenido").querySelectorAll("[data-cortar-corte]").forEach(
    (b) =>
      (b.onclick = () => {
        const c = D.cortes.find((x) => x.id === b.dataset.cortarCorte);
        cortarEnVertical({ inicio: c.inicio, fin: c.fin, titulo: c.nota || `Momento ${aTiempo(c.inicio)}`, notas: c.nota, exacto: true });
      })
  );
  $("#b-copiar") &&
    ($("#b-copiar").onclick = async () => {
      const txt = `${nombre}\n` + cortes.map((c, i) => `${i + 1}. ${aTiempo(c.inicio)} – ${aTiempo(c.fin)} (${Math.round(c.fin - c.inicio)} s)${c.nota ? " · " + c.nota : ""}`).join("\n");
      await navigator.clipboard.writeText(txt);
      aviso("Lista copiada");
    });
  document.onkeydown = (e) => {
    if (seccion !== "mesa" || !$("#vid") || ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === " ") (e.preventDefault(), vid.paused ? vid.play() : vid.pause());
    else if (k === "i") entrada();
    else if (k === "o") salida();
    else if (k === "m") guardarCorte();
    else if (k === "j") vid.currentTime -= 5;
    else if (k === "l") vid.currentTime += 5;
    else if (k === "arrowleft") (e.preventDefault(), (vid.currentTime -= 1));
    else if (k === "arrowright") (e.preventDefault(), (vid.currentTime += 1));
  };
}

// ---------- Fábrica de clips (solo en el Mac) ----------
// Transcribe el vídeo en el propio Mac, la IA elige los momentos y cada uno sale en vertical 9:16 con subtítulos.
const deTiempo = (t) => {
  if (typeof t === "number") return t;
  const p = String(t || "").trim().replace(",", ".").split(":").map(Number);
  return p.length && !p.some(Number.isNaN) ? p.reduce((s, x) => s * 60 + x, 0) : NaN;
};
let fabrica = { estado: null, trabajos: [], cola: Promise.resolve(), lotes: [], loteEnMarcha: false };
const limpiarError = (e) => (e?.message || String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
const opcFabrica = () => {
  const o = (D.ajustes.fabrica ||= {});
  o.modo ||= "inteligente";
  o.subtitulos ??= true;
  o.color ||= "#FFE500";
  o.titulo ||= "3";
  return o;
};
window.fabricaLista = () => !!(window.estudio.fabrica && mesa.video && fabrica.estado?.disponible);

// Texto con tiempos para la IA (una línea por frase: «m:ss texto»)
const textoConTiempos = (t) => t.segmentos.map((s) => `${aTiempo(s.i)} ${s.t}`).join("\n");

function bloqueFabrica() {
  if (!window.estudio.fabrica) return "";
  const o = opcFabrica();
  return `<div class="tarjeta" id="fabrica" style="margin-top:18px">
    <h3 style="margin-top:0">🏭 Fábrica de clips</h3>
    <p class="peq" style="margin-top:0"><b>1.</b> Transcribe el vídeo aquí, en tu Mac (gratis y sin subirlo a ningún sitio). <b>2.</b> La IA busca los mejores momentos (justo debajo). <b>3.</b> «Cortar en vertical» saca cada momento en 9:16 con subtítulos palabra a palabra, listo para TikTok, y lo apunta en Clips como «Listo para subir».</p>
    <div id="fab-paso" class="peq">Comprobando…</div>
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="fab-lotes">📚 Varios vídeos de golpe…</button><span class="peq">Transcribe, busca y corta varios vídeos seguidos (por ejemplo, por la noche), con las opciones de «Buscar momentos» de abajo.</span></div>
    <div id="fab-lista-lotes"></div>
    <div class="form" style="margin-top:12px">
      <label>Formato<select id="fab-modo">${opciones([["inteligente", "Seguir a quien habla (recomendado)"], ["difuminado", "Vídeo entero con fondo difuminado"], ["recorte", "Llenar la pantalla (recorte al centro)"]], o.modo)}</select></label>
      <label>Título gancho arriba<select id="fab-titulo">${opciones([["3", "Los 3 primeros segundos"], ["0", "Todo el clip"], ["no", "Sin título"]], o.titulo)}</select></label>
      <label>Subtítulos<select id="fab-subs">${opciones([["1", "Sí, palabra a palabra"], ["0", "Sin subtítulos"]], o.subtitulos ? "1" : "0")}</select></label>
      <label>Color de la palabra que suena<select id="fab-color">${opciones([["#FFE500", "Amarillo"], ["#25F4EE", "Cian"], ["#7CFF6B", "Verde"], ["#FFFFFF", "Blanco (sin resaltar)"]], o.color)}</select></label>
    </div>
    <div id="fab-trabajos"></div>
    <p class="peq">Los vídeos se guardan en <a href="#" id="fab-carpeta">Películas → Estudio Clipping</a>, en una carpeta por vídeo de origen.</p>
  </div>`;
}

function pintarTrabajos() {
  const z = document.getElementById("fab-trabajos");
  if (!z) return;
  z.innerHTML = fabrica.trabajos
    .filter((t) => !mesa.video || t.ruta === mesa.video.ruta)
    .map(
      (t) => `<div class="fila-num" style="gap:10px"><span style="flex:1;min-width:0">${t.estado === "hecho" ? "✅" : t.estado === "error" ? "⚠️" : "✂️"} <b>${esc(t.titulo)}</b> <span class="peq">${aTiempo(t.inicio)} – ${aTiempo(t.fin)} · ${Math.round(t.fin - t.inicio)} s</span>
        ${t.estado === "error" ? `<div class="peq" style="color:var(--rosa)">${esc(t.error)}</div>` : ""}${t.aviso ? `<div class="peq" style="color:var(--ambar)">${esc(t.aviso)}</div>` : ""}${t.revision ? `<div class="peq" style="color:var(--${t.revision.cumple === "si" ? "verde" : t.revision.cumple === "no" ? "rosa" : "ambar"})">${t.revision.cumple === "si" ? "✓ Cumple las reglas de la campaña" : (t.revision.cumple === "no" ? "✗ " : "⚠ ") + esc(t.revision.problemas.join(" · ") || "Comprueba a mano: " + (t.revision.comprobar_a_mano || []).join(" · "))}</div>` : ""}</span>
        ${t.estado === "hecho" ? `<button class="btn peq" data-fab-ver="${t.id}">Ver en Finder</button><button class="btn peq" data-fab-clip="${t.id}">Ficha</button>` : t.estado === "error" ? "" : `<span class="chip cian">${t.estado === "cola" ? "En cola" : t.pct + " %"}</span>`}</div>`
    )
    .join("");
  z.querySelectorAll("[data-fab-ver]").forEach((b) => (b.onclick = () => window.estudio.fabrica.mostrar(fabrica.trabajos.find((t) => t.id === b.dataset.fabVer).salida)));
  z.querySelectorAll("[data-fab-clip]").forEach((b) => (b.onclick = () => editarClip(D.clips.find((c) => c.id === fabrica.trabajos.find((t) => t.id === b.dataset.fabClip).clipId))));
}

async function montarFabrica() {
  const F = window.estudio.fabrica;
  const paso = document.getElementById("fab-paso");
  if (!F || !paso) return;
  const o = opcFabrica();
  $("#fab-modo").onchange = (e) => ((o.modo = e.target.value), guardar());
  $("#fab-subs").onchange = (e) => ((o.subtitulos = e.target.value === "1"), guardar());
  $("#fab-color").onchange = (e) => ((o.color = e.target.value), guardar());
  $("#fab-titulo").onchange = (e) => ((o.titulo = e.target.value), guardar());
  $("#fab-carpeta").onclick = (e) => (e.preventDefault(), F.abrirCarpeta());
  pintarTrabajos();
  F.alProgreso((d) => {
    if (d.fase === "corte") {
      const t = fabrica.trabajos.find((x) => x.id === d.id);
      if (t) (t.pct = d.pct), pintarTrabajos();
      return;
    }
    const el = document.getElementById("fab-progreso");
    if (el) el.textContent = d.fase === "modelo" ? (d.pct === "comprobando" ? "Comprobando el archivo…" : `Descargando el motor… ${d.pct} %`) : d.fase === "audio" ? "Preparando el audio…" : `Transcribiendo… ${d.pct} %`;
  });
  fabrica.estado = await F.estado();
  const ruta = mesa.video?.ruta;
  pintarLotes();
  $("#fab-lotes").onclick = async () => {
    if (!fabrica.estado.disponible || !fabrica.estado.modelo) return aviso("Primero hay que tener la fábrica lista (motor descargado)");
    if (!ia.configurada()) return aviso("Pon tu clave de la IA en Ajustes → Inteligencia artificial");
    const rutas = await F.elegirVarios();
    if (rutas?.length) procesarLotes(rutas);
  };
  const pintar = () => {
    const e = fabrica.estado;
    if (!e.disponible)
      return (paso.innerHTML = e.chipApple ? "⚠ Faltan componentes de la fábrica en esta instalación. Vuelve a instalar la app." : "⚠ La fábrica necesita un Mac con chip Apple (M1 o posterior). Puedes seguir marcando momentos y cortarlos en tu editor.");
    if (!e.modelo)
      return (paso.innerHTML = `<b>Primer uso:</b> hay que descargar el motor de transcripción (${e.modeloMB} MB, una sola vez; después funciona sin internet).<div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn prim" id="fab-bajar">Descargar el motor</button><span id="fab-progreso"></span></div>`);
    const todo = `<button class="btn prim" id="fab-todo" title="Transcribe, busca los mejores momentos con IA y los corta en vertical">🚀 Hacerlo todo</button>`;
    if (!ruta) return (paso.innerHTML = "Abre un vídeo para transcribirlo y cortarlo aquí, o usa «Varios vídeos de golpe».");
    if (mesa.transcripcion?.ruta !== ruta)
      return (paso.innerHTML = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${todo}<button class="btn" id="fab-transcribir">Solo transcribir</button><span id="fab-progreso" class="peq">${mesa.duracion ? (mesa.duracion / 14 < 60 ? "Tardará menos de un minuto" : `Tardará unos ${Math.round(mesa.duracion / 14 / 60)} minutos`) : ""}</span></div>`);
    const t = mesa.transcripcion;
    paso.innerHTML = `<div style="margin-bottom:8px">${todo}</div>✅ Transcrito: ${fmtNum(t.palabras.length)} palabras${t.segmentos.length ? ` hasta el ${aTiempo(t.duracion)}` : ""}. La transcripción ya está en «Buscar los mejores momentos con IA», aquí debajo.${t.palabras.length < 30 ? ` <span style="color:var(--ambar)">Casi no hay voz en este vídeo: los subtítulos y la IA necesitan que se hable.</span>` : ""}`;
  };
  pintar();
  const llenarIA = () => {
    const ta = document.getElementById("ia-trans");
    if (ta && ruta && mesa.transcripcion?.ruta === ruta && !ta.value.trim()) {
      ta.value = textoConTiempos(mesa.transcripcion);
      const f = document.getElementById("ia-trans-fuente");
      if (f && !f.value) f.value = ruta.split("/").pop();
    }
  };
  llenarIA();
  paso.onclick = async (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    b.disabled = true;
    try {
      if (b.id === "fab-bajar") {
        fabrica.estado = await F.descargarModelo();
        aviso("Motor de transcripción listo");
      } else if (b.id === "fab-todo") {
        // 1) transcribir (si hace falta), 2) la IA busca los momentos con las opciones de abajo, 3) cortar los buenos
        if (!ia.configurada()) throw new Error("Pon tu clave de la IA en Ajustes → Inteligencia artificial");
        if (mesa.transcripcion?.ruta !== ruta) {
          const t = await F.transcribir(ruta, D.ajustes.idiomaRadar || "es");
          mesa.transcripcion = { ...t, ruta };
        }
        if (seccion !== "mesa" || mesa.video?.ruta !== ruta) return;
        pintar();
        const ta = document.getElementById("ia-trans");
        ta.value = textoConTiempos(mesa.transcripcion);
        if (!document.getElementById("ia-trans-fuente").value) document.getElementById("ia-trans-fuente").value = ruta.split("/").pop();
        if (mesa.transcripcion.palabras.length < 30) throw new Error("En este vídeo casi no se habla: la IA no tiene qué leer");
        const zona = document.getElementById("ia-trans-res");
        zona.scrollIntoView({ behavior: "smooth", block: "start" });
        await ia.momentos(ta.value, opcionesMomentos(), zona, true);
      } else if (b.id === "fab-transcribir") {
        const t = await F.transcribir(ruta, D.ajustes.idiomaRadar || "es");
        mesa.transcripcion = { ...t, ruta };
        if (seccion === "mesa" && mesa.video?.ruta === ruta) llenarIA();
        aviso(t.palabras.length ? "Vídeo transcrito" : "No se ha encontrado voz en el vídeo");
      }
    } catch (e) {
      aviso("No se ha podido: " + (e.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
    }
    if (seccion === "mesa" && mesa.video?.ruta === ruta) pintar();
  };
}

// ---------- Fábrica por lotes: varios vídeos seguidos ----------
function pintarLotes() {
  const z = document.getElementById("fab-lista-lotes");
  if (!z) return;
  const txt = { cola: "En cola", transcribiendo: "Transcribiendo…", buscando: "La IA busca momentos…", cortando: "Cortando…", hecho: "Hecho", error: "Error" };
  z.innerHTML = fabrica.lotes.length
    ? `<div style="margin-top:8px">${fabrica.lotes.map((l) => `<div class="fila-num"><span style="flex:1;min-width:0">📼 ${esc(l.nombre)}${l.detalle ? ` <span class="peq" style="color:var(--${l.estado === "error" ? "rosa" : "suave"})">· ${esc(l.detalle)}</span>` : ""}</span><span class="chip ${l.estado === "hecho" ? "verde" : l.estado === "error" ? "rosa" : "cian"}">${txt[l.estado]}</span></div>`).join("")}</div>`
    : "";
}
async function procesarLotes(rutas) {
  const F = window.estudio.fabrica;
  const opc = opcionesMomentos();
  rutas.forEach((ruta) => fabrica.lotes.push({ ruta, nombre: ruta.split("/").pop(), estado: "cola" }));
  pintarLotes();
  if (fabrica.loteEnMarcha) return;
  fabrica.loteEnMarcha = true;
  const zona = document.createElement("div");
  for (let L; (L = fabrica.lotes.find((x) => x.estado === "cola")); ) {
    try {
      L.estado = "transcribiendo";
      pintarLotes();
      const t = await F.transcribir(L.ruta, D.ajustes.idiomaRadar || "es");
      if (t.palabras.length < 30) throw new Error("Casi no se habla en este vídeo");
      L.estado = "buscando";
      pintarLotes();
      const datos = await ia.momentos(textoConTiempos(t), { ...opc, fuente: L.nombre, ctx: { ruta: L.ruta, trans: { ...t, ruta: L.ruta } } }, zona, true);
      if (!datos) throw new Error(zona.textContent.replace(/\s+/g, " ").trim().slice(0, 160) || "La IA no ha podido leerlo");
      L.estado = "cortando";
      pintarLotes();
      await fabrica.cola;
      const buenos = datos.momentos.filter((m) => m.puntuacion >= 6).length;
      L.detalle = `${buenos >= 3 ? buenos : Math.min(3, datos.momentos.length)} clips cortados`;
      L.estado = "hecho";
    } catch (e) {
      L.estado = "error";
      L.detalle = limpiarError(e);
    }
    pintarLotes();
  }
  fabrica.loteEnMarcha = false;
  aviso("Fábrica por lotes terminada: tienes los clips en Clips, «Listos para subir»");
}

// Ajusta el tramo a palabras completas: empieza justo antes de una palabra y acaba justo después
function ajustarAPalabras(inicio, fin, palabras) {
  const dentro = palabras.filter((p) => p.f > inicio + 0.05 && p.i < fin - 0.05);
  if (!dentro.length) return { inicio, fin };
  return { inicio: Math.max(0, dentro[0].i - 0.15), fin: dentro[dentro.length - 1].f + 0.35 };
}

// ctx (opcional): {ruta, trans} para cortar un vídeo que no está abierto en la mesa (fábrica por lotes)
function cortarEnVertical(m, ctx) {
  const F = window.estudio.fabrica;
  const ruta = ctx?.ruta || mesa.video?.ruta;
  if (!F || !ruta) return aviso("La fábrica funciona en la app del Mac con el vídeo abierto");
  const o = opcFabrica();
  const trans = ctx ? ctx.trans : mesa.transcripcion?.ruta === ruta ? mesa.transcripcion : null;
  let { inicio, fin } = m;
  if (!(fin > inicio)) return aviso("Ese momento no tiene un tramo válido");
  if (trans && !m.exacto) ({ inicio, fin } = ajustarAPalabras(inicio, fin, trans.palabras));
  const camp = campana(m.campanaId);
  // Duración de la campaña: si se queda corto, se alarga hasta la siguiente palabra que llegue al mínimo; si se pasa, se recorta en la última palabra que quepa
  if (trans && camp && !m.exacto) {
    const min = n(camp.durMin), max = n(camp.durMax);
    if (min && fin - inicio < min) {
      const p = trans.palabras.find((x) => x.f - inicio >= min);
      if (p) fin = p.f + 0.35;
    }
    if (max && fin - inicio > max) {
      const ult = trans.palabras.filter((x) => x.i > inicio && x.f - inicio <= max - 0.4).pop();
      if (ult) fin = ult.f + 0.35;
    }
  }
  const dur = fin - inicio;
  const avisoDur = camp && n(camp.durMin) && dur < n(camp.durMin) ? `Dura ${Math.round(dur)} s y la campaña pide mínimo ${n(camp.durMin)} s` : camp && n(camp.durMax) && dur > n(camp.durMax) ? `Dura ${Math.round(dur)} s y la campaña pide máximo ${n(camp.durMax)} s` : "";
  const t = { id: uid(), ruta, inicio, fin, titulo: m.titulo || `Momento ${aTiempo(inicio)}`, estado: "cola", pct: 0, aviso: avisoDur || (o.subtitulos && !trans ? "Sin subtítulos: transcribe el vídeo primero para tenerlos" : "") };
  fabrica.trabajos.unshift(t);
  pintarTrabajos();
  // Uno detrás de otro, para no saturar el Mac
  fabrica.cola = fabrica.cola.then(async () => {
    t.estado = "cortando";
    pintarTrabajos();
    try {
      const r = await F.cortar({
        id: t.id,
        ruta,
        inicio,
        fin,
        titulo: t.titulo,
        fuente: ruta.split("/").pop().replace(/\.[^.]+$/, ""),
        modo: o.modo,
        subtitulos: o.subtitulos && !!trans,
        color: o.color,
        palabras: trans ? trans.palabras : [],
        textoArriba: o.titulo === "no" ? "" : m.textoArriba || m.titulo || "",
        tituloSegundos: o.titulo === "0" ? 0 : 3.5,
      });
      t.salida = r.salida;
      if (r.aviso) t.aviso = [t.aviso, r.aviso].filter(Boolean).join(" · ");
      const clip = { id: uid(), autorId: window.nube?.miId?.() || "", estado: "listo", checks: {}, cuentaId: cuentaDeCampana(camp) || (D.cuentas.length === 1 ? D.cuentas[0].id : ""), campanaId: m.campanaId || "", titulo: t.titulo, fuente: ruta.split("/").pop(), inicio: aTiempo(inicio), fin: aTiempo(fin), duracion: Math.round(dur), gancho: m.gancho || "", textoArriba: o.titulo === "no" ? "" : m.textoArriba || "", descripcion: m.descripcion || "", hashtags: m.hashtags || "", notas: [m.notas, `Vídeo: ${t.salida}`].filter(Boolean).join("\n"), archivo: t.salida };
      D.clips.push(clip);
      guardar();
      t.clipId = clip.id;
      t.estado = "hecho";
      aviso(`Clip listo: ${t.titulo}`);
      // Revisor de reglas (si la campaña tiene reglas apuntadas y hay clave de IA): no frena la cola
      if (camp && (camp.reglas || camp.mencion || n(camp.durMin) || n(camp.durMax)) && ia.configurada()) {
        const dicho = trans ? trans.palabras.filter((p) => p.f > inicio && p.i < fin).map((p) => p.w).join(" ") : "";
        ia.revisarClip(clip, camp, dicho)
          .then((r) => {
            if (!r) return;
            clip.revision = r;
            t.revision = r;
            guardar();
            pintarTrabajos();
          })
          .catch(() => {});
      }
    } catch (e) {
      t.estado = "error";
      t.error = (e.message || String(e)).replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
    }
    pintarTrabajos();
  });
}

// ======================================================
// VERSIÓN NUEVA DEL MAC: el Mac no se actualiza solo (no está firmado por Apple), así que avisa y da el enlace
// ======================================================
async function buscarVersionMac() {
  if (!window.estudio.version || !window.NUBE_CONFIG?.web) return;
  try {
    const actual = await window.estudio.version();
    const r = await fetch(window.NUBE_CONFIG.web + "version.json", { cache: "no-store" });
    if (!r.ok) return;
    const v = await r.json();
    const num = (x) => String(x).split(".").map((p) => +p || 0);
    const [a, b] = [num(v.mac), num(actual)];
    // ¿La publicada es mayor que la instalada? (4.10.0 > 4.9.2)
    const i = [0, 1, 2].find((k) => (a[k] || 0) !== (b[k] || 0));
    if (i === undefined || (a[i] || 0) < (b[i] || 0)) return;
    window.versionNueva = v;
    let avisada = "";
    try {
      avisada = localStorage.getItem("version:avisada");
    } catch {}
    if (avisada === v.mac || !$("#modal").classList.contains("oculto")) return;
    abrirModal(
      `<h3>Hay una versión nueva: ${esc(v.mac)}</h3>
      <p>Tienes la ${esc(actual)}. Para actualizar: descarga el instalador, ábrelo y arrastra Estudio Clipping a Aplicaciones (sustituye a la anterior). Tus datos no se tocan.</p>
      <div class="modal-pie"><button class="btn" id="ver-luego">Más tarde</button><button class="btn prim" id="ver-bajar">Descargar la ${esc(v.mac)}</button></div>`,
      (caja) => {
        const marcar = () => {
          try {
            localStorage.setItem("version:avisada", v.mac);
          } catch {}
          cerrarModal();
        };
        caja.querySelector("#ver-luego").onclick = marcar;
        caja.querySelector("#ver-bajar").onclick = () => (window.open(v.dmg, "_blank"), marcar());
      }
    );
  } catch {}
}

// ======================================================
// BIENVENIDA: la primera vez que se abre la app en un dispositivo
// ======================================================
function bienvenida(forzar = false) {
  let visto = false;
  try {
    visto = localStorage.getItem("bienvenida:vista") === "1";
  } catch {}
  // No se enseña encima de otra ventana, del bloqueo ni de la pantalla de «elige tu contraseña»
  if (!forzar && (visto || !$("#modal").classList.contains("oculto") || document.getElementById("bloqueo"))) return;
  const mac = !!window.estudio.radar;
  const conCuenta = !!window.nube?.correo?.();
  const pasos = [
    ["joya", "Bienvenido a Estudio Clipping", `Tu centro de mando para ganar dinero haciendo <b>clipping con permiso</b> en TikTok (campañas de Whop y Vyro). En 5 pantallas te enseño lo que hace por ti.`],
    ["radar", "Encuentra las campañas que rentan", `El <b>Radar</b> lee todas las campañas de Whop y Vyro cada 3 horas (aunque tengas el ordenador apagado) y te dice cuáles <b>rentan de verdad</b>, con sus datos reales. El <b>piloto automático</b> retira las que se acaban y te propone las mejores para tus cuentas, con un aviso al móvil.`],
    ["mesa", "Clips verticales en minutos", `En la <b>Mesa de corte</b> del Mac abres el vídeo largo y pulsas <b>🚀 Hacerlo todo</b>: lo transcribe, la IA elige los mejores momentos y salen cortados en vertical, siguiendo a quien habla, con subtítulos, título y el texto para TikTok. Antes de subirlos, el <b>revisor</b> comprueba las reglas de la campaña.${mac ? "" : " (La fábrica funciona en la app del Mac; aquí puedes ver y organizar todo.)"}`],
    ["calendario", "Publica cada día sin olvidos", `Programa cada clip en el <b>Calendario</b> y te avisaré al móvil cuando toque subirlo. Apunta las vistas en <b>Números</b> y cada lunes te llegará un <b>informe</b> con lo que funciona y qué hacer esa semana.`],
    ["cuentas", "Primeros pasos", `<ol style="margin:6px 0 0;padding-left:20px;line-height:1.7">
      <li>${conCuenta ? "✅ Ya has entrado con tu cuenta" : "Entra con tu cuenta en <b>Ajustes → Sincronización</b> (los mismos datos en todos tus dispositivos y en tu equipo)"}</li>
      <li>Activa los <b>avisos</b> en el iPhone (Ajustes → Sincronización, abriendo la app desde su icono)</li>
      <li>Añade tus <b>cuentas de TikTok</b> con su nicho en <b>Cuentas</b>: así el radar sabe qué te encaja</li>
      <li>Únete a una campaña que «Renta» en Whop o Vyro y pulsa «Ya me he unido» en <b>Mis campañas</b></li></ol>`],
  ];
  let i = 0;
  const pintar = () => {
    const [ico, titulo, texto] = pasos[i];
    abrirModal(
      `<div data-sinfoco style="text-align:center;padding:6px 4px 0">
        <div class="cab-icono" style="margin:0 auto 14px;width:56px;height:56px;border-radius:16px">${icono(ico)}</div>
        <h3 style="font-size:21px;margin:0 0 10px">${titulo}</h3>
        <div style="text-align:left;line-height:1.6">${texto}</div>
        <div style="display:flex;gap:6px;justify-content:center;margin:18px 0 4px">${pasos.map((_, k) => `<span style="width:${k === i ? 20 : 7}px;height:7px;border-radius:4px;background:${k === i ? "var(--primario)" : "var(--borde-fuerte)"};transition:width .2s"></span>`).join("")}</div>
      </div>
      <div class="modal-pie"><button class="btn fant" id="bv-saltar">${i === pasos.length - 1 ? "Cerrar" : "Saltar"}</button><div style="display:flex;gap:8px">${i ? `<button class="btn" id="bv-atras">Atrás</button>` : ""}<button class="btn prim" id="bv-sig">${i === pasos.length - 1 ? (conCuenta ? "Ir a Cuentas" : "Ir a Ajustes") : "Siguiente"}</button></div></div>`,
      (caja) => {
        const fin = () => {
          try {
            localStorage.setItem("bienvenida:vista", "1");
          } catch {}
          cerrarModal();
        };
        caja.querySelector("#bv-saltar").onclick = fin;
        caja.querySelector("#bv-atras") && (caja.querySelector("#bv-atras").onclick = () => (i--, pintar()));
        caja.querySelector("#bv-sig").onclick = () => {
          if (i < pasos.length - 1) return i++, pintar();
          fin();
          ir(conCuenta ? "cuentas" : "ajustes");
        };
      }
    );
  };
  pintar();
}

// ======================================================
// CUENTAS
// ======================================================
function vistaCuentas() {
  acciones([["nueva-cuenta", "+ Nueva cuenta", "prim"]]);
  $("#nueva-cuenta").onclick = () => editarCuenta();
  $("#contenido").innerHTML = D.cuentas.length
    ? `<table><thead><tr><th>Cuenta</th><th>Nicho</th><th class="num">Seguidores</th><th class="num">Clips publicados</th><th class="num">Vistas</th><th class="num">Media</th><th class="num">Estimado</th><th>Estado</th></tr></thead><tbody>
      ${D.cuentas
        .map((a) => {
          const cs = D.clips.filter((c) => c.cuentaId === a.id && CUENTAN_VISTAS.includes(c.estado));
          const v = cs.reduce((s, c) => s + n(c.vistas), 0);
          const color = a.estado === "activa" ? "verde" : a.estado === "calentando" ? "ambar" : "";
          return `<tr data-id="${a.id}" style="cursor:pointer"><td><b>${esc(a.usuario)}</b><div class="peq">${esc(a.red || "TikTok")}</div></td><td>${esc(a.nicho || "—")}</td>
          <td class="num">${fmtCorto(a.seguidores)}</td><td class="num">${cs.length}</td><td class="num">${fmtCorto(v)}</td><td class="num">${fmtCorto(cs.length ? v / cs.length : 0)}</td>
          <td class="num">${fmtEur(cs.reduce((s, c) => s + gananciaClip(c), 0))}</td><td><span class="chip ${color}">${esc(a.estado || "activa")}</span></td></tr>`;
        })
        .join("")}</tbody></table>
      <p class="peq">Consejo: una cuenta por nicho o creador funciona mejor que mezclarlo todo, porque TikTok entiende a quién enseñársela.</p>`
    : `<div class="vacio">Añade tus cuentas de TikTok para saber cuál rinde mejor.<br><br><button class="btn prim" id="vacio-cuenta">+ Nueva cuenta</button></div>`;
  $("#vacio-cuenta") && ($("#vacio-cuenta").onclick = () => editarCuenta());
  $("#contenido").querySelectorAll("tr[data-id]").forEach((tr) => (tr.onclick = () => editarCuenta(cuenta(tr.dataset.id))));
}

// Foto de perfil reducida a 640 px en JPEG (unos 40 KB) para guardarla dentro de los datos sincronizados
function fotoReducida(archivo) {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const lado = Math.min(640, img.width, img.height);
      const corte = Math.min(img.width, img.height);
      const lienzo = document.createElement("canvas");
      lienzo.width = lienzo.height = lado;
      lienzo.getContext("2d").drawImage(img, (img.width - corte) / 2, (img.height - corte) / 2, corte, corte, 0, 0, lado, lado);
      URL.revokeObjectURL(url);
      ok(lienzo.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => (URL.revokeObjectURL(url), mal(new Error("imagen")));
    img.src = url;
  });
}

// Foto a tamaño completo: en el iPhone, mantenerla pulsada → Guardar en Fotos
function verFotoPerfil(a) {
  if (!a?.foto) return;
  abrirModal(
    `<h3>Foto de ${esc(a.nombrePerfil || a.usuario)}</h3>
    <img src="${esc(a.foto)}" alt="Foto de perfil" style="width:100%;max-width:420px;display:block;margin:0 auto;border-radius:12px" />
    <p class="peq" style="text-align:center">En el iPhone: mantén pulsada la foto → Guardar en Fotos.</p>
    <div class="modal-pie"><div></div><div><a class="btn" href="${esc(a.foto)}" download="perfil-${esc((a.usuario || "cuenta").replace(/[^\w.-]/g, ""))}.jpg">Descargar</a> <button class="btn prim" id="m-cerrar">Cerrar</button></div></div>`,
    (caja) => (caja.querySelector("#m-cerrar").onclick = cerrarModal)
  );
}

function editarCuenta(a) {
  const nuevo = !a;
  a = a || { id: uid(), red: "TikTok", estado: "calentando" };
  abrirModal(
    `<h3>${nuevo ? "Nueva cuenta" : esc(a.usuario)}</h3>
    <div class="form">
      <label>Usuario<input name="usuario" value="${esc(a.usuario)}" placeholder="@micuenta" /></label>
      <label>Red<select name="red">${opciones([["TikTok", "TikTok"], ["Instagram Reels", "Instagram Reels"], ["YouTube Shorts", "YouTube Shorts"], ["X", "X"]], a.red)}</select></label>
      <label>Nicho<input name="nicho" value="${esc(a.nicho)}" placeholder="Negocios, dinero, creadores, tendencias…" /></label>
      <label>Seguidores<input name="seguidores" type="number" min="0" value="${esc(a.seguidores)}" /></label>
      <label>Clips al día (objetivo)<input name="objetivoDia" type="number" min="0" value="${esc(a.objetivoDia)}" placeholder="Para el Calendario" /></label>
      <label>Horas de publicación<input name="horas" value="${esc(a.horas)}" placeholder="13:00, 19:30, 21:30" /></label>
      <label class="ancho">Palabras clave del nicho (para el Radar)<input name="claves" value="${esc(a.claves)}" placeholder="Separadas por comas: podcast, emprendimiento, trading…" /></label>

      <label>Estado<select name="estado">${opciones([["calentando", "Calentando (cuenta nueva)"], ["activa", "Activa"], ["pausada", "Pausada"]], a.estado)}</select></label>
      <label>Enlace al perfil<input name="enlace" value="${esc(a.enlace)}" placeholder="https://www.tiktok.com/@…" /></label>
      <label>Correo de la cuenta<input name="correo" type="email" value="${esc(a.correo)}" placeholder="micuenta@gmail.com" /></label>
      <label>Nombre del perfil<input name="nombrePerfil" value="${esc(a.nombrePerfil)}" placeholder="Lo que se lee junto al usuario" /></label>
      <label>Usuario alternativo<input name="alternativa" value="${esc(a.alternativa)}" placeholder="Por si el usuario está cogido" /></label>
      <label class="ancho">Biografía<input name="bio" maxlength="80" value="${esc(a.bio)}" placeholder="Hasta 80 caracteres" /></label>
      <label class="ancho">Foto de perfil
        <div style="display:flex;gap:12px;align-items:center;margin-top:6px">
          <img id="m-foto-ver" alt="" style="width:64px;height:64px;border-radius:50%;flex:none;${a.foto ? "" : "display:none"}" ${a.foto ? `src="${esc(a.foto)}"` : ""}/>
          <input id="m-foto" type="file" accept="image/*" />
        </div>
      </label>
      <label class="ancho">Notas<textarea name="notas" placeholder="Qué funciona en esta cuenta, avisos de TikTok…">${esc(a.notas)}</textarea></label>
    </div>
    <p class="peq">El perfil (usuario, correo, biografía y foto) solo se guarda en tus datos privados, nunca en el código de la app.</p>
    <div class="modal-pie">
      <div>${nuevo ? "" : `<button class="btn peligro" id="m-borrar">Borrar</button>`}</div>
      <div><button class="btn" id="m-cancelar">Cancelar</button> <button class="btn prim" id="m-guardar">Guardar</button></div>
    </div>`,
    (caja) => {
      let foto = a.foto || "";
      caja.querySelector("#m-foto").onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          foto = await fotoReducida(f);
          const img = caja.querySelector("#m-foto-ver");
          img.src = foto;
          img.style.display = "";
        } catch {
          aviso("No se ha podido leer esa imagen");
        }
      };
      caja.querySelector("#m-cancelar").onclick = cerrarModal;
      caja.querySelector("#m-guardar").onclick = () => {
        const f = leerForm(caja);
        if (!f.usuario) return aviso("Pon el usuario de la cuenta");
        const segAntes = a.seguidores;
        Object.assign(a, f);
        if (foto) a.foto = foto;
        if (f.seguidores !== "" && String(f.seguidores) !== String(segAntes ?? "")) registrarSeguidores(a, f.seguidores);
        if (nuevo) D.cuentas.push(a);
        guardar();
        cerrarModal();
        ir(seccion);
      };
      const b = caja.querySelector("#m-borrar");
      b &&
        (b.onclick = () => {
          if (!confirm(`¿Borrar la cuenta «${a.usuario}»?`)) return;
          D.cuentas = D.cuentas.filter((x) => x.id !== a.id);
          D.clips.forEach((x) => x.cuentaId === a.id && (x.cuentaId = ""));
          guardar();
          cerrarModal();
          ir(seccion);
        });
    }
  );
}

// ======================================================
// GANCHOS
// ======================================================
let filtroGancho = "";
function vistaGanchos() {
  acciones([["nuevo-gancho", "+ Nuevo gancho", "prim"]]);
  $("#nuevo-gancho").onclick = () =>
    abrirModal(
      `<h3>Nuevo gancho</h3>
      <div class="form"><label class="ancho">Frase<input name="texto" placeholder="Ej.: Nadie te cuenta esto de…" /></label>
      <label>Tipo<input name="tipo" list="tipos-gancho" value="Propio" /></label></div>
      <datalist id="tipos-gancho">${[...new Set(D.ganchos.map((g) => g.tipo))].map((t) => `<option value="${esc(t)}"></option>`).join("")}</datalist>
      <div class="modal-pie"><div></div><div><button class="btn" id="m-cancelar">Cancelar</button> <button class="btn prim" id="m-guardar">Guardar</button></div></div>`,
      (caja) => {
        caja.querySelector("#m-cancelar").onclick = cerrarModal;
        caja.querySelector("#m-guardar").onclick = () => {
          const f = leerForm(caja);
          if (!f.texto.trim()) return aviso("Escribe el gancho");
          D.ganchos.unshift({ id: uid(), texto: f.texto.trim(), tipo: (f.tipo || "Propio").trim(), favorito: false });
          guardar();
          cerrarModal();
          vistaGanchos();
        };
      }
    );
  const datos = D.ganchos.map((g) => {
    const cs = D.clips.filter((c) => (c.gancho || "").trim() === g.texto.trim() && CUENTAN_VISTAS.includes(c.estado));
    const v = cs.reduce((s, c) => s + n(c.vistas), 0);
    return { g, usos: cs.length, media: cs.length ? v / cs.length : 0 };
  });
  const tipos = [...new Set(D.ganchos.map((g) => g.tipo))];
  const lista = datos
    .filter((d) => !filtroGancho || d.g.tipo === filtroGancho || (filtroGancho === "fav" && d.g.favorito))
    .sort((a, b) => b.g.favorito - a.g.favorito || b.media - a.media);
  $("#contenido").innerHTML = `
    <div class="caja tarjeta" style="margin-bottom:16px">En TikTok se decide en el primer segundo si alguien se queda. Abre el clip con la frase o el momento más fuerte; el gancho va en texto en pantalla y, si puede ser, también en lo que se oye. Cuando uses uno, escríbelo igual en el clip y aquí verás cuántas vistas te da de media.</div>
    <div class="filtros"><select id="f-tipo">${opciones([["fav", "★ Favoritos"], ...tipos.map((t) => [t, t])], filtroGancho, "Todos los tipos")}</select></div>
    ${lista
      .map(
        (d) => `<div class="gancho"><button class="estrella ${d.g.favorito ? "on" : ""}" data-fav="${d.g.id}">★</button>
        <div style="flex:1"><div class="txt">${esc(d.g.texto)}</div><div class="meta">${esc(d.g.tipo)} · ${d.usos ? `usado en ${d.usos} clip(s) · ${fmtCorto(d.media)} vistas de media` : "sin usar todavía"}</div></div>
        <button class="btn peq" data-copiar="${d.g.id}">Copiar</button> <button class="btn peq peligro" data-borrar="${d.g.id}">✕</button></div>`
      )
      .join("")}`;
  $("#f-tipo").onchange = (e) => ((filtroGancho = e.target.value), vistaGanchos());
  const g = (id) => D.ganchos.find((x) => x.id === id);
  $("#contenido").querySelectorAll("[data-fav]").forEach((b) => (b.onclick = () => ((g(b.dataset.fav).favorito = !g(b.dataset.fav).favorito), guardar(), vistaGanchos())));
  $("#contenido").querySelectorAll("[data-copiar]").forEach((b) => (b.onclick = async () => (await navigator.clipboard.writeText(g(b.dataset.copiar).texto), aviso("Gancho copiado"))));
  $("#contenido").querySelectorAll("[data-borrar]").forEach(
    (b) =>
      (b.onclick = () => {
        if (!confirm("¿Borrar este gancho?")) return;
        D.ganchos = D.ganchos.filter((x) => x.id !== b.dataset.borrar);
        guardar();
        vistaGanchos();
      })
  );
}

// ======================================================
// CALCULADORA
// ======================================================
function vistaCalculadora() {
  const c0 = D.campanas.find((c) => c.estado === "activa");
  const v = (x) => (x === undefined || x === null ? "" : esc(x));
  // Media real de vistas por clip publicado (si hay datos)
  const pub = D.clips.filter((c) => CUENTAN_VISTAS.includes(c.estado) && n(c.vistas));
  const mediaReal = pub.length ? Math.round(pub.reduce((s, c) => s + n(c.vistas), 0) / pub.length) : 0;
  $("#contenido").innerHTML = `
    <div class="caja cian" style="margin-bottom:16px">
      <b>Cómo funciona.</b> En clipping cobras así: <b>vistas válidas ÷ 1.000 × tarifa de la campaña</b>. Si el clip no llega al <b>mínimo de vistas</b> de la campaña, normalmente no cobras (Whop puede pagar una parte si al acabar la campaña sobra presupuesto); si pasa del <b>máximo por clip</b>, cobras solo el máximo.
      <br><b>Ejemplo:</b> tarifa de 1 $ por cada 1.000 vistas y un clip con 50.000 vistas → 50.000 ÷ 1.000 × 1 $ = <b>50 $</b>.
      <br><b>Cómo usarla:</b> rellena los pasos de arriba abajo. Si eliges una de tus campañas, los datos del paso 1 se rellenan solos. Las casillas empiezan vacías: los números los pones tú, con los datos reales de tu campaña.
    </div>

    <div class="rejilla dos">
      <div class="tarjeta">
        <h3 style="margin-top:0">Paso 1 · La campaña</h3>
        <div class="form">
          <label class="ancho">Rellenar con una de mis campañas<select id="k-camp">${opciones(D.campanas.map((c) => [c.id, c.nombre]), "", "No, lo pongo a mano")}</select></label>
          <label>Tarifa por cada 1.000 vistas<input id="k-cpm" type="number" step="0.01" min="0" placeholder="Ej.: 1" /></label>
          <label>Moneda de la tarifa<select id="k-mon">${opciones([["USD", "Dólares ($)"], ["EUR", "Euros (€)"]], "USD")}</select></label>
          <label class="ancho" id="k-cambio-l">Cuántos euros vale 1 dólar hoy<input id="k-cambio" type="number" step="0.001" min="0" value="${v(D.ajustes.usdEur)}" placeholder="Búscalo en Google: «1 dólar en euros»" /></label>
          <label>Mínimo de vistas por clip<input id="k-min" type="number" min="0" placeholder="Si la campaña no pone, déjalo vacío" /></label>
          <label>Máximo a cobrar por clip<input id="k-max" type="number" min="0" step="0.01" placeholder="Si la campaña no pone, déjalo vacío" /></label>
        </div>
      </div>
      <div class="tarjeta">
        <h3 style="margin-top:0">Paso 2 · Un clip</h3>
        <div class="form"><label class="ancho">Vistas del clip<input id="k-vistas" type="number" min="0" placeholder="Ej.: 50000" /></label></div>
        <div id="k-r-clip" style="margin-top:12px"></div>
      </div>
      <div class="tarjeta">
        <h3 style="margin-top:0">Paso 3 · Tu ritmo en un mes</h3>
        <div class="form">
          <label>Clips al día (todas las cuentas)<input id="k-dia" type="number" min="0" placeholder="Ej.: 8" /></label>
          <label>Vistas medias por clip<input id="k-media" type="number" min="0" placeholder="Pon tu media real" /></label>
        </div>
        ${mediaReal ? `<p class="peq">Tu media real con ${pub.length} clips apuntados: <b>${fmtNum(mediaReal)}</b> vistas. <button class="btn peq" id="k-usar-media">Usar mi media</button></p>` : `<p class="peq">Cuando apuntes vistas en tus clips, aquí te saldrá tu media real para usarla.</p>`}
        <div id="k-r-mes" style="margin-top:12px"></div>
      </div>
      <div class="tarjeta">
        <h3 style="margin-top:0">Paso 4 · Tu objetivo</h3>
        <div class="form"><label class="ancho">Quiero ganar al mes (€)<input id="k-obj" type="number" min="0" placeholder="Ej.: 300" /></label></div>
        <div id="k-r-obj" style="margin-top:12px"></div>
      </div>
    </div>
    <p class="peq">Es una estimación. Lo que cobres de verdad depende de las vistas que la campaña dé por válidas, del presupuesto que le quede y de sus reglas. Cuenta con que una parte de las vistas no llegue a validarse.</p>`;

  const falta = (txt) => `<span class="peq">${txt}</span>`;
  const calc = () => {
    const cpm = n($("#k-cpm").value);
    const usd = $("#k-mon").value === "USD";
    $("#k-cambio-l").style.display = usd ? "" : "none";
    const cambio = usd ? n($("#k-cambio").value) : 1;
    const min = n($("#k-min").value),
      max = n($("#k-max").value);
    const sinTarifa = !cpm;
    const sinCambio = usd && !cambio;
    // Cobro en euros de un clip con X vistas
    const cobro = (vistas) => {
      if (min && vistas < min) return 0;
      let g = (vistas / 1000) * cpm;
      if (max) g = Math.min(g, max);
      return g * cambio;
    };
    const aviso1 = sinTarifa ? "Pon la tarifa en el paso 1." : sinCambio ? "Pon cuántos euros vale 1 dólar en el paso 1." : "";

    const vistas = n($("#k-vistas").value);
    $("#k-r-clip").innerHTML = aviso1
      ? falta(aviso1)
      : !vistas
      ? falta("Pon las vistas del clip.")
      : min && vistas < min
      ? `<div class="kpi"><div class="et">Cobras por este clip</div><div class="val">0 €</div><div class="nota">No llega al mínimo de ${fmtNum(min)} vistas</div></div>`
      : `<div class="kpi"><div class="et">Cobras por este clip</div><div class="val">${fmtEur(cobro(vistas))}</div><div class="nota">${fmtNum(vistas)} ÷ 1.000 × ${cpm} ${usd ? "$" : "€"}${max && (vistas / 1000) * cpm > max ? ` · limitado al máximo de ${max}` : ""}</div></div>`;

    const dia = n($("#k-dia").value),
      media = n($("#k-media").value);
    $("#k-r-mes").innerHTML = aviso1
      ? falta(aviso1)
      : !dia || !media
      ? falta("Pon los clips al día y las vistas medias.")
      : `<div class="kpi"><div class="et">Al mes (30 días)</div><div class="val">${fmtEur(dia * 30 * cobro(media))}</div><div class="nota">${fmtNum(dia * 30)} clips · ${fmtCorto(dia * 30 * media)} vistas</div></div>`;

    const obj = n($("#k-obj").value);
    const porMil = cpm * cambio;
    $("#k-r-obj").innerHTML = aviso1
      ? falta(aviso1)
      : !obj
      ? falta("Pon cuánto quieres ganar al mes.")
      : `<div class="kpi"><div class="et">Necesitas al mes</div><div class="val">${fmtCorto((obj / porMil) * 1000)} vistas</div><div class="nota">${
          media ? `Con tu media de ${fmtNum(media)} vistas: unos ${fmtNum(Math.ceil(obj / Math.max(cobro(media), 0.0001)))} clips al mes (${fmtNum(Math.ceil(obj / Math.max(cobro(media), 0.0001) / 30))} al día)` : "Pon las vistas medias en el paso 3 para saber cuántos clips son"
        }</div></div>`;
  };
  $("#contenido").querySelectorAll("input, select").forEach((el) => (el.oninput = calc));
  $("#k-camp").onchange = (e) => {
    const c = campana(e.target.value);
    if (c) {
      $("#k-cpm").value = c.cpm || "";
      $("#k-mon").value = c.moneda || "USD";
      $("#k-min").value = c.minVistas || "";
      $("#k-max").value = c.maxPorClip || "";
    }
    calc();
  };
  $("#k-usar-media") && ($("#k-usar-media").onclick = () => (($("#k-media").value = mediaReal), calc()));
  calc();
}

// ======================================================
// COBROS
// ======================================================
function vistaCobros() {
  acciones([["nuevo-cobro", "+ Apuntar cobro", "prim"]]);
  $("#nuevo-cobro").onclick = () => editarCobro();
  const cobrado = D.cobros.filter((p) => p.estado === "cobrado").reduce((s, p) => s + aEur(p.importe, p.moneda), 0);
  const pendiente = D.cobros.filter((p) => p.estado === "pendiente").reduce((s, p) => s + aEur(p.importe, p.moneda), 0);
  const anio = new Date().getFullYear();
  const delAnio = D.cobros.filter((p) => p.estado === "cobrado" && (p.fecha || "").startsWith(String(anio))).reduce((s, p) => s + aEur(p.importe, p.moneda), 0);
  const lista = [...D.cobros].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  $("#contenido").innerHTML = `
    <div class="rejilla kpis">
      <div class="kpi"><div class="et">Cobrado en total</div><div class="val">${fmtEur(cobrado)}</div></div>
      <div class="kpi"><div class="et">Cobrado en ${anio}</div><div class="val">${fmtEur(delAnio)}</div><div class="nota">Para la declaración de la renta</div></div>
      <div class="kpi"><div class="et">Pendiente de cobro</div><div class="val">${fmtEur(pendiente)}</div></div>
    </div>
    <h2>Movimientos</h2>
    ${
      lista.length
        ? `<table><thead><tr><th>Fecha</th><th>Campaña</th><th>Plataforma</th><th class="num">Importe</th><th class="num">En euros</th><th>Estado</th></tr></thead><tbody>
        ${lista
          .map(
            (p) => `<tr data-id="${p.id}" style="cursor:pointer"><td>${fechaCorta(p.fecha)}</td><td>${esc(campana(p.campanaId)?.nombre || "—")}</td><td>${esc(p.plataforma || "—")}</td>
          <td class="num">${fmtMon(p.importe, p.moneda)}</td><td class="num">${fmtEur(aEur(p.importe, p.moneda))}</td><td><span class="chip ${p.estado === "cobrado" ? "verde" : "ambar"}">${esc(p.estado)}</span></td></tr>`
          )
          .join("")}</tbody></table>`
        : `<div class="vacio">Apunta aquí cada pago que te llegue (o que esté en revisión) para tenerlo todo controlado.</div>`
    }
    <div class="tarjeta" style="margin-top:18px"><b>Impuestos (España)</b><p class="peq" style="margin-bottom:0">Lo que ganas con el clipping son ingresos y hay que declararlos. Si lo haces de forma habitual puede que tengas que darte de alta como autónomo. Cada caso es distinto: consúltalo con una gestoría. Guarda los justificantes de pago: aquí puedes apuntar la referencia de cada uno en las notas.</p></div>`;
  $("#contenido").querySelectorAll("tr[data-id]").forEach((tr) => (tr.onclick = () => editarCobro(D.cobros.find((p) => p.id === tr.dataset.id))));
}

function editarCobro(p) {
  const nuevo = !p;
  p = p || { id: uid(), fecha: hoyISO(), moneda: "USD", estado: "pendiente", plataforma: "Whop" };
  abrirModal(
    `<h3>${nuevo ? "Apuntar cobro" : "Cobro"}</h3>
    <div class="form">
      <label>Fecha<input name="fecha" type="date" value="${esc(p.fecha)}" /></label>
      <label>Campaña<select name="campanaId">${opciones(D.campanas.map((c) => [c.id, c.nombre]), p.campanaId, "Varias / ninguna")}</select></label>
      <label>Plataforma<input name="plataforma" list="plataformas2" value="${esc(p.plataforma)}" /></label>
      <label>Estado<select name="estado">${opciones([["pendiente", "Pendiente"], ["cobrado", "Cobrado"]], p.estado)}</select></label>
      <label>Importe<input name="importe" type="number" step="0.01" value="${esc(p.importe)}" /></label>
      <label>Moneda<select name="moneda">${opciones([["USD", "USD"], ["EUR", "EUR"]], p.moneda)}</select></label>
      <label class="ancho">Notas<textarea name="notas" placeholder="Referencia del pago, método (PayPal, banco…)">${esc(p.notas)}</textarea></label>
    </div>
    <datalist id="plataformas2"><option>Whop</option><option>Vyro</option><option>Pago directo</option></datalist>
    <div class="modal-pie">
      <div>${nuevo ? "" : `<button class="btn peligro" id="m-borrar">Borrar</button>`}</div>
      <div><button class="btn" id="m-cancelar">Cancelar</button> <button class="btn prim" id="m-guardar">Guardar</button></div>
    </div>`,
    (caja) => {
      caja.querySelector("#m-cancelar").onclick = cerrarModal;
      caja.querySelector("#m-guardar").onclick = () => {
        const f = leerForm(caja);
        if (!n(f.importe)) return aviso("Pon el importe");
        Object.assign(p, f);
        if (nuevo) D.cobros.push(p);
        guardar();
        cerrarModal();
        ir(seccion);
      };
      const b = caja.querySelector("#m-borrar");
      b &&
        (b.onclick = () => {
          if (!confirm("¿Borrar este cobro?")) return;
          D.cobros = D.cobros.filter((x) => x.id !== p.id);
          guardar();
          cerrarModal();
          ir(seccion);
        });
    }
  );
}

// ======================================================
// GUÍA
// ======================================================
function vistaGuia() {
  $("#contenido").innerHTML = `<div class="guia">
  <div class="indice-guia">${["Qué es", "Cómo se cobra", "Flujo de trabajo", "Clips que funcionan en TikTok", "Originalidad y derechos", "Cuentas", "Riesgos", "Impuestos", "Fuentes"].map((t, i) => `<a class="chip" href="#g${i}">${t}</a>`).join("")}<a class="chip verde" href="#grenta">¿Me renta una campaña?</a></div>

  <h2 id="grenta">Cómo saber si una campaña te renta antes de unirte</h2>
  <p>La tarifa alta engaña. Lo que importa es <b>cuánto cobran de verdad los clips</b> de esa campaña. El <b>Radar</b> hace este análisis solo con cada campaña (botón «Informe: ¿me renta?»), con los datos que publica Whop:</p>
  <table><thead><tr><th>Mira esto</th><th>Por qué</th><th>Mala señal</th></tr></thead><tbody>
    <tr><td><b>Vistas medias por clip aprobado</b></td><td>Es lo que suele sacar un clip normal en esa campaña.</td><td>Por debajo del mínimo para cobrar: la mayoría de clips cobran 0.</td></tr>
    <tr><td><b>% de vistas pagadas</b></td><td>Presupuesto gastado ÷ tarifa, frente a las vistas totales.</td><td>Muy bajo: casi todas las vistas son de clips que no llegaron al mínimo.</td></tr>
    <tr><td><b>Lo que gana un clipper de media</b></td><td>Presupuesto gastado ÷ clippers.</td><td>Unos pocos dólares: hay mucha gente para muy poco.</td></tr>
    <tr><td><b>Tendencia de vistas</b></td><td>Vistas de toda la campaña en los últimos 7 días frente a su mejor semana.</td><td>Hundida: el público se ha cansado del contenido.</td></tr>
    <tr><td><b>Dinero que queda por clipper</b></td><td>Presupuesto restante ÷ clippers.</td><td>Menos de 3 $: aunque tus clips funcionen, no queda casi nada.</td></tr>
  </tbody></table>
  <div class="caja"><b>Ejemplo real (TDJ, 16/10/2026):</b> pagaba 3,50 $ por 1.000 vistas, de las tarifas más altas. Pero sus 784 clips aprobados sacaban <b>594 vistas de media</b> (cobra desde 1.000), solo se había pagado ~1 de cada 7 vistas, cada uno de sus 156 clippers había ganado <b>1,45 $</b> de media y sus vistas habían caído de ~300.000 a la semana a ~25.000. Conclusión: no rentaba. Una campaña que paga 1 $ con clips de 3.000 vistas de media te deja más dinero.</div>
  <p class="peq">En Vyro no se publican vistas ni clippers: allí solo se puede mirar el presupuesto, lo rápido que lo gasta y la fecha de fin.</p>


  <h2 id="g0">Qué es el clipping</h2>
  <p>Cortar contenido largo (directos, pódcast, entrevistas, vídeos de YouTube) en clips cortos y verticales, y publicarlos en TikTok y otras redes. Los creadores y las marcas pagan por ello porque cada clip que se hace viral les lleva gente a su contenido.</p>
  <p>Hay dos tipos de campaña:</p>
  <ul><li><b>Clipping:</b> cortas el contenido que ya existe del creador.</li><li><b>UGC:</b> haces contenido original en el que sale la marca. Suele pagar más y pide más trabajo.</li></ul>

  <div class="caja cian"><b>Solo se cobra con permiso.</b> El dinero lo paga la campaña (Whop, Vyro) o el creador con el que llegues a un acuerdo, no TikTok: su programa de pagos solo es para contenido original y los clips de otros no cuentan. Cortar contenido sin permiso no se puede monetizar por ninguna vía. Detalle en <b>Estrategia → Cómo se cobra</b> y en <b>Conseguir vídeos</b>.</div>
  <h2 id="g1">Cómo se cobra en las campañas de clipping</h2>
  <ul>
    <li>Te unes a una campaña en una plataforma (las más conocidas son <b>Whop Content Rewards</b> y <b>Vyro</b>) o tratas directamente con un creador.</li>
    <li>Publicas el clip en tu cuenta y <b>envías el enlace</b> a la campaña. Si no lo envías, no cuenta.</li>
    <li>La campaña verifica las vistas durante un tiempo y paga una <b>tarifa por cada 1.000 vistas</b>.</li>
    <li>Cada campaña tiene un <b>presupuesto</b>. Cuando se gasta, deja de pagar aunque tus clips sigan sumando vistas.</li>
  </ul>
  <div class="caja cian">Tarifas que se ven en 2026 en fuentes del sector: lo habitual es entre <b>0,50 y 3 $ por cada 1.000 vistas</b>. Las campañas que pagan más suelen tener reglas más estrictas o poco presupuesto. Ejemplo: a 1 $ por cada 1.000 vistas, un clip necesita <b>100.000 vistas para ganar 100 $</b>. Estas cifras salen de blogs de empresas del sector: compruébalas siempre en la campaña real.</div>

  <h2 id="g2">Flujo de trabajo con esta app</h2>
  <ol>
    <li><b>Conseguir vídeos:</b> únete a una campaña en Whop o Vyro, o consigue permiso por escrito de un creador.</li>
    <li><b>Campañas:</b> apunta la campaña con su tarifa, su presupuesto, sus reglas y la etiqueta de publicidad que exige.</li>
    <li><b>Mesa de corte:</b> abre el vídeo largo y marca los mejores momentos.</li>
    <li><b>Clips:</b> convierte cada momento en un clip. Edítalo en CapCut o en tu editor y pasa el <b>checklist de TikTok</b>.</li>
    <li>Publica con la etiqueta de publicidad, pásalo a <b>Publicado</b> y envía el enlace a la campaña (<b>Enviado a campaña</b>).</li>
    <li>Actualiza las vistas cada pocos días. El panel te dice qué cuentas, horas y ganchos funcionan.</li>
    <li><b>Cobros:</b> apunta cada pago.</li>
  </ol>

  <h2 id="g3">Clips que funcionan en TikTok</h2>
  <ul>
    <li><b>Gancho en el primer segundo.</b> Empieza por la frase o el momento más fuerte, no por el contexto. Lo que se explica, después.</li>
    <li><b>Subtítulos quemados</b>, grandes y legibles: mucha gente ve TikTok sin sonido. No los pongas en la parte de abajo, donde los tapa la interfaz.</li>
    <li><b>Una idea por clip.</b> Una historia, un chiste o una frase. Quita todo lo que no la empuje.</li>
    <li><b>Vertical 9:16</b> (1080×1920), con la cara reencuadrada en el centro. Lo habitual es entre 15 y 60 segundos, salvo que la campaña pida otra cosa.</li>
    <li><b>Prueba ganchos distintos</b> en clips distintos y deja que los datos decidan. Ojo: Whop prohíbe entregar clips duplicados; si haces otra versión de un momento, que sea un corte distinto y que la campaña lo permita.</li>
    <li><b>Constancia:</b> el clipping es un juego de volumen. Publicar todos los días a horas parecidas te da datos para encontrar tu mejor hora (lo ves en el Panel).</li>
    <li>Un final que invite a comentar o a ver la siguiente parte ayuda a la retención.</li>
  </ul>

  <h2 id="g4">Originalidad y derechos</h2>
  <div class="caja">TikTok penaliza el contenido <b>resubido sin edición propia</b>: lo saca del «Para ti» y, si se repite, puede bajar el alcance de toda la cuenta. Añade siempre tu edición: reencuadre, cortes, zoom, texto, subtítulos y tu propio gancho. <span class="peq">(Según guías de 2026; la página oficial de TikTok no se pudo leer.)</span></div>
  <ul>
    <li>Corta solo contenido de campañas que te den permiso o de creadores que lo autoricen. Cortar el contenido de otros sin permiso puede acabar en reclamaciones de copyright.</li>
    <li>Cuidado con la música: usa el audio original del vídeo o sonidos permitidos de TikTok.</li>
    <li>Lee las reglas de cada campaña: menciones, hashtags, lo que está prohibido. Si no las cumples, no te pagan ese clip.</li>
    <li><b>Indica que es publicidad.</b> Whop exige un hashtag como #Sponsored o #[Marca]Ad visible sin pulsar «más», y Vyro también obliga a indicarlo. Si no lo haces, pueden echarte y pedirte que devuelvas lo cobrado (condiciones oficiales).</li>
  </ul>

  <h2 id="g5">Cuentas</h2>
  <ul>
    <li><b>Tu plan:</b> tú solo, con 5 cuentas de un nicho cada una (Estrategia → Las 5 cuentas), cada una con su Gmail. Empiezas publicando en Dinero, Música y Textos, y sumas Negocios y Creadores en la segunda semana.</li>
    <li>Una cuenta por nicho: TikTok entiende mejor a quién enseñar tus clips. Una cuenta puede estar en varias campañas del mismo nicho a la vez, y cuando una se acaba pasas a otra del mismo tema.</li>
    <li>Cuenta nueva = estado <b>«Calentando»</b>: úsala con normalidad unos días antes de publicar en serie.</li>
    <li>No compres seguidores ni vistas, ni interactúes entre tus propias cuentas. Las campañas tienen revisiones antibots y te pueden retener o anular el pago.</li>
    <li>TikTok permite varias cuentas, pero ante una infracción grave puede bloquear todas las asociadas. Todas las normas, en <b>Primeros pasos → Que no te baneen</b>.</li>
  </ul>

  <h2 id="g6">Riesgos que hay que conocer</h2>
  <ul>
    <li>Los presupuestos se acaban rápido en las campañas populares: entra pronto y mira el % gastado.</li>
    <li>La revisión y el pago pueden tardar días. Guarda capturas de tus estadísticas: si hay una discusión sobre las vistas, manda el dato de la campaña.</li>
    <li>Cuenta con que una parte de lo que calculas no llegue a cobrarse (vistas no validadas, presupuesto agotado).</li>
    <li>Desconfía de quien te pida pagar para entrar en una campaña o te prometa ingresos fijos.</li>
  </ul>

  <h2 id="g7">Impuestos en España</h2>
  <p>Lo que se cobra por clipping son ingresos y se declaran en la renta. Si es una actividad habitual, puede tocar darse de alta como autónomo. Consúltalo con una gestoría antes de que las cantidades sean importantes, y apunta todos los cobros en el apartado <b>Cobros</b>.</p>

  <h2 id="g8">Fuentes (consultadas en octubre de 2026)</h2>
  <p class="peq">La mayoría son blogs de empresas del sector, que tienen interés en que el clipping parezca rentable. Úsalas como orientación.</p>
  <ul>
    <li><a href="https://whop.com/content-rewards-terms-of-service/" target="_blank">Whop · Condiciones de Content Rewards (oficial)</a></li>
    <li><a href="https://vyro.com/clipper-terms" target="_blank">Vyro · Condiciones para clippers (oficial)</a></li>
    <li><a href="https://www.opus.pro/blog/whop-content-rewards" target="_blank">Opus Clip · Qué es Whop Content Rewards</a></li>
    <li><a href="https://openclip.app/guides/whop-clipping-guide" target="_blank">OpenClip · Guía de clipping en Whop 2026</a></li>
    <li><a href="https://www.clipaffiliates.com/blog/clipping-cpm-rates-2026" target="_blank">ClipAffiliates · Tarifas de clipping 2026</a></li>
    <li><a href="https://openclip.app/guides/make-money-clipping-videos" target="_blank">OpenClip · Ganar dinero con clips: tarifas reales</a></li>
    <li><a href="https://wayin.ai/blog/make-money-clipping-videos-on-tiktok/" target="_blank">Wayin · Clipping en TikTok en 2026</a></li>
    <li><a href="https://www.ssemble.com/es/blog/best-clipping-platforms-2026" target="_blank">Ssemble · Mejores plataformas de clipping 2026</a></li>
    <li><a href="https://openclip.app/guides/tiktok-slideshow-unoriginal-content-flag" target="_blank">OpenClip · Contenido no original en TikTok</a></li>
    <li><a href="https://www.tiktok.com/community-guidelines/es" target="_blank">TikTok · Normas de la comunidad (oficial)</a></li>
    <li><a href="https://support.tiktok.com/es/business-and-creator/creator-and-business-accounts/branded-content-on-tiktok" target="_blank">TikTok · Divulgación de contenido comercial (oficial)</a></li>
  </ul>
  </div>`;
}

// ======================================================
// AJUSTES
// ======================================================
function vistaAjustes() {
  const a = D.ajustes;
  $("#contenido").innerHTML = `
    <h2 style="margin-top:0">General</h2>
    <div class="tarjeta" style="max-width:720px">
      <p class="peq" style="margin-top:0">Todo es opcional. Lo que dejes vacío, la app no lo usa.</p>
      <div class="form">
        <label>Tu nombre<input name="nombre" value="${esc(a.nombre)}" /></label>
        <label>Cuántos euros vale 1 dólar hoy<input name="usdEur" type="number" step="0.001" min="0" value="${esc(a.usdEur)}" placeholder="Búscalo en Google: «1 dólar en euros»" /></label>
        <label>Objetivo de clips al día (todas las cuentas)<input name="objetivoDia" type="number" min="0" value="${esc(a.objetivoDia)}" placeholder="Ej.: 8" /></label>
        <label>Idioma de tus cuentas (Radar)<select name="idiomaRadar">${opciones(Object.entries(IDIOMAS), a.idiomaRadar || "es")}</select></label>
        <label>Objetivo de ingresos al mes (€)<input name="objetivoMes" type="number" min="0" value="${esc(a.objetivoMes)}" placeholder="Ej.: 300" /></label>
        <label class="ancho">Comisión que te descuentan al retirar el dinero (%)<input name="comision" type="number" step="0.1" min="0" value="${esc(a.comision)}" placeholder="Solo si PayPal o Stripe te cobran algo. Whop cobra su 10 % a la marca, no a ti" /></label>
      </div>
      <p class="peq">El cambio del dólar sirve para pasar a euros lo que pagan las campañas en dólares. Actualízalo de vez en cuando.</p>
      <div style="margin-top:16px"><button class="btn prim" id="aj-guardar">Guardar ajustes</button></div>
    </div>
    ${window.nube ? nube.tarjeta() : ""}
    ${window.bloqueo ? bloqueo.tarjeta() : ""}
    ${window.ia ? ia.tarjetaAjustes() : ""}
    <h2>Copias de seguridad</h2>
    <div class="tarjeta" style="max-width:720px">
      <p class="peq" style="margin-top:0">Tus datos están solo ${esc(window.estudio.donde || "en este Mac")}. La app guarda sola una copia diaria (las 15 últimas). Para llevarlos a otro dispositivo, exporta e importa.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" id="aj-exportar">Exportar copia…</button>
        <button class="btn" id="aj-importar">Importar copia…</button>
        ${window.estudio.abrirCarpeta ? `<button class="btn" id="aj-carpeta">Abrir carpeta de datos</button>` : ""}
        <button class="btn peligro" id="aj-borrar">Borrar todo</button>
      </div>
    </div>
    ${window.versionNueva ? `<div class="tarjeta" style="border-color:var(--cian)">Hay una versión nueva del Mac (${esc(window.versionNueva.mac)}). <a href="${esc(window.versionNueva.dmg)}" target="_blank">Descargar el instalador</a></div>` : ""}
    <p class="peq">Estudio Clipping ${VERSION_APP} · Todo funciona sin internet, salvo los enlaces que abras, la sincronización y el radar. · <a href="#" id="aj-bienvenida">Ver la bienvenida otra vez</a></p>`;
  $("#aj-bienvenida").onclick = (e) => (e.preventDefault(), bienvenida(true));
  $("#aj-guardar").onclick = () => {
    const f = leerForm($("#contenido"));
    const num = (x) => (x === "" ? "" : n(x));
    Object.assign(D.ajustes, { nombre: f.nombre, usdEur: num(f.usdEur), comision: num(f.comision), objetivoDia: num(f.objetivoDia), objetivoMes: num(f.objetivoMes), idiomaRadar: f.idiomaRadar || "es" });
    guardar();
    aviso("Ajustes guardados");
  };
  $("#aj-exportar").onclick = async () => {
    const r = await window.estudio.exportar(D);
    r && aviso("Copia exportada");
  };
  $("#aj-importar").onclick = async () => {
    try {
      const d = await window.estudio.importar();
      if (!d) return;
      if (!d.clips || !d.campanas) return aviso("Ese archivo no es una copia de Estudio Clipping");
      if (!confirm("Esto sustituye todos tus datos actuales por los de la copia. ¿Seguir?")) return;
      // Igual que al sincronizar: los ajustes que falten en la copia toman su valor por defecto
      aplicarDatos(d);
      guardar();
      ir("panel");
      aviso("Copia importada");
    } catch {
      aviso("No se ha podido leer el archivo");
    }
  };
  window.nube && nube.montar();
  window.bloqueo && bloqueo.montar();
  window.ia && ia.montarAjustes();
  if ($("#aj-carpeta")) $("#aj-carpeta").onclick = () => window.estudio.abrirCarpeta();
  $("#aj-borrar").onclick = () => {
    if (!confirm("¿Borrar TODOS los datos? Las copias diarias se quedan en la carpeta de datos.")) return;
    D = VACIO();
    guardar();
    ir("panel");
  };
}

const VISTAS = {
  empieza: vistaArranque,
  panel: vistaPanel,
  radar: vistaRadar,
  asistente: vistaAsistente,
  calendario: vistaCalendario,
  numeros: vistaNumeros,
  campanas: vistaCampanas,
  conseguir: vistaConseguir,
  clips: vistaClips,
  mesa: vistaMesa,
  cuentas: vistaCuentas,
  ganchos: vistaGanchos,
  calculadora: vistaCalculadora,
  cobros: vistaCobros,
  estrategia: vistaEstrategia,
  tiktok: vistaTikTok,
  guia: vistaGuia,
  ajustes: vistaAjustes,
};

// ---------- Arranque ----------
(async () => {
  const guardados = await window.estudio.leer();
  D = guardados ? { ...VACIO(), ...guardados, ajustes: { ...VACIO().ajustes, ...(guardados.ajustes || {}) } } : VACIO();
  // Versiones anteriores traían valores de ejemplo (0,86 / 3 / 300 / 0) que nadie había puesto: se vacían
  if (n(D.version) < 2) {
    const a = D.ajustes;
    if (a.usdEur === 0.86) a.usdEur = "";
    if (a.objetivoDia === 3) a.objetivoDia = "";
    if (a.objetivoMes === 300) a.objetivoMes = "";
    if (a.comision === 0) a.comision = "";
    delete a.rpmTikTok;
    D.version = 2;
    D.permisos ||= [];
    if (guardados) guardar();
  }
  if (!guardados) guardar();
  window.revisarCuentasAntiguas && revisarCuentasAntiguas();
  // Un aviso puede abrir la app en un apartado concreto («#radar», o «#informe» para el informe semanal de Números)
  const irEnlace = (p) => {
    if (p === "informe") return (tabNumeros = "informe"), ir("numeros"), true;
    return SECCIONES.some(([id]) => id === p) && (ir(p), true);
  };
  if (!irEnlace(location.hash.slice(1))) ir(progresoPlan().pct < 100 ? "empieza" : "panel");
  setTimeout(() => bienvenida(), 600);
  setTimeout(() => buscarVersionMac(), 4000);
  window.addEventListener("hashchange", () => irEnlace(location.hash.slice(1)));
  window.nube && nube.iniciar();
  setTimeout(() => importarPerfilesPrivados(), 6000);
  // En el Mac, el radar se lee solo si la última lectura tiene más de 6 horas (y se revisa cada 30 minutos)
  if (window.estudio.radar) {
    const toca = () => !D.radar?.actualizado || Date.now() - Date.parse(D.radar.actualizado) > RADAR_HORAS * 36e5;
    setTimeout(() => toca() && actualizarRadar(true), 8000);
    setInterval(() => toca() && actualizarRadar(true), 30 * 60000);
  }
})();

// Solo en el Mac: mete en cada cuenta (por su nicho) el perfil que se haya dejado en importar-perfiles.json y borra el archivo
async function importarPerfilesPrivados() {
  const p = await window.estudio.perfilesPendientes?.().catch(() => null);
  if (!p?.cuentas) return;
  let n = 0;
  D.cuentas.forEach((c) => {
    const perfil = p.cuentas[c.nicho];
    if (!perfil) return;
    Object.assign(c, perfil);
    n++;
  });
  if (!n) return;
  guardar();
  await window.estudio.perfilesHecho();
  aviso(`Perfiles de ${n} cuenta(s) guardados en tus datos privados`);
  ir(seccion);
}

// La sincronización trae datos de otro dispositivo: se cargan y se vuelve a pintar el apartado abierto
function aplicarDatos(d) {
  D = { ...VACIO(), ...d, ajustes: { ...VACIO().ajustes, ...(d.ajustes || {}) } };
  window.revisarCuentasAntiguas && revisarCuentasAntiguas();
  ir(seccion);
}
