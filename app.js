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
const hoyISO = () => new Date().toISOString().slice(0, 10);
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
  ["empieza", "", "Primeros pasos", "Plan de 30 días, rutina diaria y revisión semanal"],
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
  ["estrategia", "Aprender", "Estrategia", "Las 4 cuentas, qué publicar, horas, cantidad y herramientas"],
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
            : `<div class="vacio-mini">${icono("radar")}<div>${D.radar?.items?.length ? "No hay joyas nuevas para tus cuentas ahora mismo." : "El radar aún no se ha leído (se lee desde la app del Mac)."}</div></div>`
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
  c = c || { id: uid(), estado: "idea", checks: {}, cuentaId: D.cuentas[0]?.id || "", campanaId: D.campanas.find((x) => x.estado === "activa")?.id || "", ...base };
  const camp = campana(c.campanaId);
  abrirModal(
    `<h3>${nuevo ? "Nuevo clip" : esc(c.titulo)}</h3>
    <div class="form">
      <label class="ancho">Título interno<input name="titulo" value="${esc(c.titulo)}" placeholder="Ej.: Reacción a la pregunta del millón" /></label>
      <label>Duración (segundos)<input name="duracion" type="number" min="0" value="${esc(c.duracion)}" placeholder="Ej.: 45" /></label>
      <label>Campaña<select name="campanaId">${opciones(D.campanas.map((x) => [x.id, x.nombre]), c.campanaId, "Sin campaña")}</select></label>
      <label>Cuenta de TikTok<select name="cuentaId">${opciones(D.cuentas.map((x) => [x.id, x.usuario]), c.cuentaId, "Sin cuenta")}</select></label>
      <label>Estado<select name="estado">${opciones(ESTADOS_CLIP.map((e) => [e.id, e.nombre]), c.estado)}</select></label>
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
                <td style="white-space:nowrap"><button class="btn peq" data-clip="${c.id}">Crear clip</button> <button class="btn peq peligro" data-borrar="${c.id}">✕</button></td></tr>`
              )
              .join("")}</tbody></table>
            <div style="margin-top:10px;display:flex;gap:8px"><button class="btn" id="b-copiar">Copiar lista de tiempos</button></div>`
            : `<div class="vacio">Marca la entrada y la salida de un momento bueno y pulsa «Guardar momento».</div>`
        }
        <p class="peq" style="margin-top:14px">La mesa de corte sirve para localizar y apuntar los momentos. El corte final, los subtítulos y el formato vertical se hacen en tu editor (CapCut, Premiere…), con la lista de tiempos copiada.</p>
      </div></div>`
    : `<div class="vacio">Abre el vídeo largo (directo, pódcast, entrevista) que vas a convertir en clips.<br>Lo verás aquí, marcarás los mejores momentos con el teclado y cada uno se puede convertir en un clip del tablero.<br><br><button class="btn prim" id="vacio-abrir">Abrir vídeo…</button></div>
       ${D.cortes.length ? `<p class="peq" style="margin-top:14px">Tienes ${D.cortes.length} momentos guardados de ${new Set(D.cortes.map((c) => c.ruta)).size} vídeo(s). Abre el mismo vídeo para verlos.</p>` : ""}`;
  $("#contenido").insertAdjacentHTML("beforeend", bloqueMomentosIA());
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
      <label class="ancho">Palabras clave del nicho (para el Radar)<input name="claves" value="${esc(a.claves)}" placeholder="Separadas por comas: podcast, emprendimiento, trading…" /></label>

      <label>Estado<select name="estado">${opciones([["calentando", "Calentando (cuenta nueva)"], ["activa", "Activa"], ["pausada", "Pausada"]], a.estado)}</select></label>
      <label>Enlace al perfil<input name="enlace" value="${esc(a.enlace)}" placeholder="https://www.tiktok.com/@…" /></label>
      <label class="ancho">Notas<textarea name="notas" placeholder="Qué funciona en esta cuenta, avisos de TikTok…">${esc(a.notas)}</textarea></label>
    </div>
    <div class="modal-pie">
      <div>${nuevo ? "" : `<button class="btn peligro" id="m-borrar">Borrar</button>`}</div>
      <div><button class="btn" id="m-cancelar">Cancelar</button> <button class="btn prim" id="m-guardar">Guardar</button></div>
    </div>`,
    (caja) => {
      caja.querySelector("#m-cancelar").onclick = cerrarModal;
      caja.querySelector("#m-guardar").onclick = () => {
        const f = leerForm(caja);
        if (!f.usuario) return aviso("Pon el usuario de la cuenta");
        const segAntes = a.seguidores;
        Object.assign(a, f);
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
    <li>Una cuenta por nicho o creador: TikTok entiende mejor a quién enseñar tus clips.</li>
    <li>Cuenta nueva = estado <b>«Calentando»</b>: úsala con normalidad unos días antes de publicar en serie.</li>
    <li>No compres seguidores ni vistas. Las campañas tienen revisiones antibots y te pueden retener o anular el pago.</li>
    <li>Respeta las normas de TikTok sobre cuentas y automatización: que te cierren una cuenta en mitad de una verificación te hace perder lo pendiente.</li>
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
    <p class="peq">Estudio Clipping 4.1 · Todo funciona sin internet, salvo los enlaces que abras, la sincronización y el radar.</p>`;
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
      D = { ...VACIO(), ...d };
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
  ir(progresoPlan().pct < 100 ? "empieza" : "panel");
  window.nube && nube.iniciar();
  // En el Mac, el radar se lee solo si la última lectura tiene más de 6 horas (y se revisa cada 30 minutos)
  if (window.estudio.radar) {
    const toca = () => !D.radar?.actualizado || Date.now() - Date.parse(D.radar.actualizado) > RADAR_HORAS * 36e5;
    setTimeout(() => toca() && actualizarRadar(true), 8000);
    setInterval(() => toca() && actualizarRadar(true), 30 * 60000);
  }
})();

// La sincronización trae datos de otro dispositivo: se cargan y se vuelve a pintar el apartado abierto
function aplicarDatos(d) {
  D = { ...VACIO(), ...d, ajustes: { ...VACIO().ajustes, ...(d.ajustes || {}) } };
  ir(seccion);
}
